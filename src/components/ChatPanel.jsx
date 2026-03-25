import { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import { ref, push, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { realtimeDb } from '../services/firebase';
import { executeCanvasTool } from '../utils/canvasTools';
import { captureCanvasImage, shouldUseVision, getVisionReason } from '../utils/canvasCapture';
import { reportError } from '../utils/errorHandler';
import styles from './ChatPanel.module.css';

// Guardrails
const MAX_MESSAGE_LENGTH = 2000; // ~500 tokens
const REQUEST_COOLDOWN = 2000; // 2 seconds between requests
const MAX_CONTEXT_MESSAGES = 15; // Only send last 15 messages for context

// Example prompts for users
const EXAMPLE_PROMPTS = [
  {
    category: '🎨 Create',
    prompts: [
      'Create 5 blue rectangles',
      'Add 3 red circles in a row',
      'Make a grid of 3x3 squares',
      'Create a text box that says "Hello"',
    ],
  },
  {
    category: '📐 Arrange',
    prompts: [
      'Align these shapes to the left',
      'Distribute them horizontally',
      'Arrange in a 2x3 grid',
      'Center everything on the canvas',
    ],
  },
  {
    category: '👁️ Vision',
    prompts: [
      'What colors am I using?',
      'Create rectangles around the blue circle',
      'Fill the empty space on the right',
      'Match the pattern on the left',
    ],
  },
  {
    category: '✨ Transform',
    prompts: [
      'Make them all green',
      'Rotate selected shapes 45 degrees',
      'Make all circles bigger',
      'Change the layout to be symmetric',
    ],
  },
  {
    category: '❓ Ask',
    prompts: [
      'How many shapes are there?',
      'Describe the current layout',
      'What would make this balanced?',
      'Suggest improvements',
    ],
  },
];

/**
 * ChatPanel component - Tabbed chat interface with Canvas Chat and Canny AI
 * - Canvas Chat: Real-time chat for users on the same canvas
 * - Canny: AI assistant for help and suggestions with canvas manipulation tools
 */
function ChatPanel({
  canvasId,
  user,
  // Canvas operations for Canny
  shapes = [],
  selectedShapeIds = [],
  createShape,
  updateShape,
  batchUpdateShapes,
  deleteShape,
  selectShape,
  deselectShape,
  viewport = { offsetX: 0, offsetY: 0, zoom: 1, centerX: 0, centerY: 0 },
  svgRef, // SVG element reference for canvas capture
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('canvas'); // 'canvas' or 'canny'
  const [canvasMessages, setCanvasMessages] = useState([]);
  const [canvasInput, setCanvasInput] = useState('');
  const [isCapturingCanvas, setIsCapturingCanvas] = useState(false);
  const [visionReason, setVisionReason] = useState(null);
  const [lastRequestTime, setLastRequestTime] = useState(0);
  const [showExamples, setShowExamples] = useState(false); // Start hidden, toggle with button
  const [panelWidth, setPanelWidth] = useState(400); // Default width
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef(null);
  const cannyMessagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const examplesDropdownRef = useRef(null);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);
  const exampleSubmitTimeoutRef = useRef(null);
  const executedToolCallsRef = useRef(new Set());

  // Ref that always holds the latest canvas context, so async callbacks
  // (experimental_onToolCall, manual tool-call effect) never read stale props.
  const canvasContextRef = useRef(null);
  canvasContextRef.current = {
    shapes,
    selectedShapeIds,
    createShape,
    updateShape,
    batchUpdateShapes,
    deleteShape,
    selectShape,
    deselectShape,
    viewport,
    canvasId,
    userId: user?.uid,
  };

  // Use AI SDK's useChat hook for streaming with tool support
  // In production (Vercel), uses /api/chat
  // In development, uses localhost:3001/api/chat
  const apiEndpoint = import.meta.env.PROD ? '/api/chat' : 'http://localhost:3001/api/chat';

  const { messages, input, setInput, handleInputChange, isLoading, error, append } = useChat({
    api: apiEndpoint,
    maxToolRoundtrips: 5, // Allow automatic tool execution
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content:
          '👋 Hi! I\'m Canny, your CollabCanvas assistant! I can manipulate the canvas for you and even SEE what\'s on it! Try "create rectangles around the blue circle" or "what colors am I using?" 🎨👁️✨',
      },
    ],
    // Handle tool calls from Canny
    experimental_onToolCall: async (toolCall) => {
      // Emit debug event for tool call
      window.dispatchEvent(
        new CustomEvent('canny-debug', {
          detail: {
            type: 'tool-call',
            data: {
              toolName: toolCall.toolName,
              arguments: toolCall.args,
            },
            timestamp: Date.now(),
          },
        })
      );

      // Execute the tool using the ref so we always get the latest canvas state
      const result = executeCanvasTool(toolCall.toolName, toolCall.args, canvasContextRef.current);

      // Emit debug event for tool result
      window.dispatchEvent(
        new CustomEvent('canny-debug', {
          detail: {
            type: 'tool-result',
            data: {
              toolName: toolCall.toolName,
              result: result,
            },
            timestamp: Date.now(),
          },
        })
      );

      // Return result to Canny
      return result;
    },
    // Log errors
    onError: (error) => {
      reportError(error, { component: 'ChatPanel', action: 'onError' });
      window.dispatchEvent(
        new CustomEvent('canny-debug', {
          detail: {
            type: 'error',
            data: {
              message: error.message,
              stack: error.stack,
            },
            timestamp: Date.now(),
          },
        })
      );
    },
    // Log when response is received
    onFinish: (message) => {
      window.dispatchEvent(
        new CustomEvent('canny-debug', {
          detail: {
            type: 'response',
            data: {
              role: message.role,
              content: message.content,
              toolCalls: message.tool_calls,
            },
            timestamp: Date.now(),
          },
        })
      );
    },
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear any pending auto-submit timeout
      if (exampleSubmitTimeoutRef.current) {
        clearTimeout(exampleSubmitTimeoutRef.current);
      }
    };
  }, []);

  // Stop current request
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsCapturingCanvas(false);
    setVisionReason(null);
  };

  // Custom submit handler with guardrails
  const handleCannySubmit = async (e, overrideInput = null) => {
    e.preventDefault();

    // Clear any pending auto-submit from example prompts
    if (exampleSubmitTimeoutRef.current) {
      clearTimeout(exampleSubmitTimeoutRef.current);
      exampleSubmitTimeoutRef.current = null;
    }

    // Use override input if provided (for example prompts), otherwise use current input state
    const inputToSubmit = overrideInput !== null ? overrideInput : input;
    const trimmedInput = inputToSubmit.trim();
    if (!trimmedInput) return;

    // Guardrail 1: Message length limit
    if (trimmedInput.length > MAX_MESSAGE_LENGTH) {
      alert(
        `Message too long! Please keep it under ${MAX_MESSAGE_LENGTH} characters (currently ${trimmedInput.length}).`
      );
      return;
    }

    // Guardrail 2: Rate limiting (cooldown between requests)
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < REQUEST_COOLDOWN && lastRequestTime > 0) {
      const waitTime = Math.ceil((REQUEST_COOLDOWN - timeSinceLastRequest) / 1000);
      alert(
        `Please wait ${waitTime} second${waitTime > 1 ? 's' : ''} before sending another message.`
      );
      return;
    }

    setLastRequestTime(now);
    setShowExamples(false); // Hide examples after first message

    // Check if vision should be used
    const useVision = shouldUseVision(trimmedInput);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    if (useVision && svgRef?.current) {
      try {
        setIsCapturingCanvas(true);
        setVisionReason(getVisionReason(trimmedInput));

        // Capture canvas as image
        const canvasImage = await captureCanvasImage(svgRef.current);

        // Emit debug event for request with vision
        window.dispatchEvent(
          new CustomEvent('canny-debug', {
            detail: {
              type: 'request',
              data: {
                message: trimmedInput,
                withVision: true,
                imageSize: `${canvasImage.length} bytes`,
              },
              timestamp: Date.now(),
            },
          })
        );

        // Clear input before awaiting so it's responsive during streaming
        setInput('');
        await append({
          role: 'user',
          content: [
            {
              type: 'text',
              text: trimmedInput,
            },
            {
              type: 'image_url',
              image_url: {
                url: canvasImage,
              },
            },
          ],
        });

        setIsCapturingCanvas(false);
        setVisionReason(null);
      } catch (error) {
        reportError(error, { component: 'ChatPanel', action: 'captureCanvas' });
        setIsCapturingCanvas(false);
        setVisionReason(null);

        // Fallback: send without vision
        if (error.name !== 'AbortError') {
          setInput('');
          append({ role: 'user', content: trimmedInput });
        }
      }
    } else {
      try {
        window.dispatchEvent(
          new CustomEvent('canny-debug', {
            detail: {
              type: 'request',
              data: {
                message: trimmedInput,
                withVision: false,
              },
              timestamp: Date.now(),
            },
          })
        );

        // Use append() directly — handleSubmit() from useChat was unreliable at clearing input
        setInput('');
        await append({
          role: 'user',
          content: trimmedInput,
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          reportError(error, { component: 'ChatPanel', action: 'sendMessage' });
        }
      }
    }
  };

  // Handle example prompt click
  const handleExampleClick = (prompt) => {
    // Clear any pending auto-submit from previous prompt click
    if (exampleSubmitTimeoutRef.current) {
      clearTimeout(exampleSubmitTimeoutRef.current);
      exampleSubmitTimeoutRef.current = null;
    }

    setShowExamples(false); // Close dropdown
    handleInputChange({ target: { value: prompt } });

    // Auto-submit after short delay so user can see what was filled in
    // Pass the prompt directly to avoid race conditions with state updates
    exampleSubmitTimeoutRef.current = setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} };
      handleCannySubmit(fakeEvent, prompt);
      exampleSubmitTimeoutRef.current = null;
    }, 500);
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  // Resize handlers
  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = panelWidth;
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleResizeMove = (e) => {
      const delta = resizeStartX.current - e.clientX; // Drag left = bigger
      const newWidth = Math.max(320, Math.min(1000, resizeStartWidth.current + delta));
      setPanelWidth(newWidth);
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing]);

  // Click outside to close examples dropdown
  useEffect(() => {
    if (!showExamples) return;

    const handleClickOutside = (e) => {
      if (examplesDropdownRef.current && !examplesDropdownRef.current.contains(e.target)) {
        setShowExamples(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExamples]);

  const handleClear = () => {
    // Reload page to clear chat (simpler than managing SDK state)
    if (window.confirm('Clear chat history? This will refresh the page.')) {
      window.location.reload();
    }
  };

  // Subscribe to canvas chat messages
  useEffect(() => {
    if (!canvasId) return;

    const messagesRef = ref(realtimeDb, `canvases/${canvasId}/chat`);
    const messagesQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(100));

    const unsubscribe = onValue(messagesQuery, (snapshot) => {
      const msgs = [];
      snapshot.forEach((childSnapshot) => {
        msgs.push({
          id: childSnapshot.key,
          ...childSnapshot.val(),
        });
      });
      setCanvasMessages(msgs);
    });

    return () => unsubscribe();
  }, [canvasId]);

  // Handle tool calls manually (detects both standard format and our custom marker format)
  // IMPORTANT: Only depends on `messages` to avoid infinite loops!
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage) return;

    // Create a unique ID for this message to track if we've processed it
    const messageId = lastMessage.id || `msg_${messages.length - 1}`;

    let toolCallsToExecute = [];

    // Method 1: Check if message has tool_calls property (standard format)
    if (lastMessage?.tool_calls && Array.isArray(lastMessage.tool_calls)) {
      toolCallsToExecute = lastMessage.tool_calls;
    }

    // Method 2: Check if message content contains our special marker
    // Short-circuit with includes() — avoids regex cost on every streamed chunk
    if (
      lastMessage?.content &&
      typeof lastMessage.content === 'string' &&
      lastMessage.content.includes('__TOOL_CALLS__')
    ) {
      const markerMatch = lastMessage.content.match(/__TOOL_CALLS__(.+?)__END_TOOL_CALLS__/);
      if (markerMatch) {
        try {
          const parsedToolCalls = JSON.parse(markerMatch[1]);
          toolCallsToExecute = parsedToolCalls;
        } catch (e) {
          reportError(e, { component: 'ChatPanel', action: 'parseToolCallsMarker' });
        }
      }
    }

    // Execute any detected tool calls (but only once per message!)
    if (toolCallsToExecute.length > 0) {
      for (const toolCall of toolCallsToExecute) {
        // Create unique ID for this tool call
        const toolCallId = `${messageId}_${toolCall.id || toolCall.function?.name}`;

        // Skip if already executed
        if (executedToolCallsRef.current.has(toolCallId)) {
          continue;
        }

        // Mark as executed BEFORE running to prevent race conditions
        executedToolCallsRef.current.add(toolCallId);

        if (toolCall.type === 'function' && toolCall.function) {
          const toolName = toolCall.function.name;
          let args;

          try {
            args = JSON.parse(toolCall.function.arguments);
          } catch (e) {
            reportError(e, { component: 'ChatPanel', action: 'parseToolArguments' });
            continue;
          }

          // Execute the tool using the ref so we always get the latest canvas state
          executeCanvasTool(toolName, args, canvasContextRef.current);
        }
      }
    }
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (activeTab === 'canvas') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      cannyMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, canvasMessages, activeTab]);

  // Send canvas chat message
  const handleCanvasChatSubmit = async (e) => {
    e.preventDefault();

    if (!canvasInput.trim() || !user || !canvasId) return;

    try {
      const messagesRef = ref(realtimeDb, `canvases/${canvasId}/chat`);
      await push(messagesRef, {
        text: canvasInput.trim(),
        userId: user.uid,
        userName: user.displayName || user.email,
        timestamp: Date.now(),
      });

      setCanvasInput('');
    } catch (error) {
      reportError(error, { component: 'ChatPanel', action: 'handleCanvasChatSubmit' });
    }
  };

  // Format message role to display type
  const getMessageType = (role) => {
    if (role === 'user') return 'user';
    if (role === 'assistant') return 'assistant';
    return 'system';
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Generate consistent color for each user based on their userId
  const getUserColor = (userId) => {
    const colors = [
      '#FF6B6B', // Red
      '#4ECDC4', // Teal
      '#45B7D1', // Blue
      '#FFA07A', // Light Salmon
      '#98D8C8', // Mint
      '#F7DC6F', // Yellow
      '#BB8FCE', // Purple
      '#85C1E2', // Sky Blue
      '#F8B88B', // Peach
      '#AAB7B8', // Gray Blue
      '#52BE80', // Green
      '#EC7063', // Coral
      '#AF7AC5', // Lavender
      '#5DADE2', // Light Blue
      '#F39C12', // Orange
    ];

    // Use userId to generate consistent color index
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  return (
    <div
      className={`${styles['chat-panel']} ${isOpen ? styles['open'] : styles['closed']} ${isResizing ? styles['resizing'] : ''}`}
      style={{ width: isOpen ? `${panelWidth}px` : undefined }}
    >
      {/* Resize handle */}
      {isOpen && (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions
        <div
          className={styles['chat-resize-handle']}
          onMouseDown={handleResizeStart}
          title="Drag to resize"
        />
      )}

      {/* Toggle button */}
      <button
        className={styles['chat-toggle']}
        onClick={handleToggle}
        title={isOpen ? 'Close Chat' : 'Open Chat'}
        aria-label={isOpen ? 'Close Chat' : 'Open Chat'}
      >
        {isOpen ? (
          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <>
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
            </svg>
            <span className={styles['chat-badge']}>Chat</span>
          </>
        )}
      </button>

      {/* Chat content */}
      <div className={styles['chat-content']}>
        {/* Header with tabs */}
        <div className={styles['chat-header']}>
          <div className={styles['chat-tabs']}>
            <button
              className={`${styles['chat-tab']} ${activeTab === 'canvas' ? styles['active'] : ''}`}
              onClick={() => setActiveTab('canvas')}
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Users
            </button>
            <button
              className={`${styles['chat-tab']} ${activeTab === 'canny' ? styles['active'] : ''}`}
              onClick={() => setActiveTab('canny')}
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
              </svg>
              Canny
            </button>
          </div>
          <div className={styles['chat-header-actions']}>
            {activeTab === 'canny' && (
              <button
                className={styles['chat-action-btn']}
                onClick={handleClear}
                title="Clear chat"
                aria-label="Clear chat"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                </svg>
              </button>
            )}
            <button
              className={styles['chat-action-btn']}
              onClick={handleToggle}
              title="Minimize"
              aria-label="Minimize"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Canvas Chat Tab */}
        {activeTab === 'canvas' && (
          <>
            <div className={styles['chat-messages']}>
              {canvasMessages.length === 0 ? (
                <div className={styles['chat-empty-state']}>
                  <svg
                    viewBox="0 0 24 24"
                    width="48"
                    height="48"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <p>No messages yet</p>
                  <p className={styles['chat-empty-hint']}>
                    Start a conversation with your collaborators!
                  </p>
                </div>
              ) : (
                <>
                  {canvasMessages.map((msg) => {
                    const isOwnMessage = user && msg.userId === user.uid;
                    const userColor = getUserColor(msg.userId);

                    return (
                      <div
                        key={msg.id}
                        className={`${styles['chat-message']} ${isOwnMessage ? styles['user'] : styles['other']}`}
                      >
                        <div
                          className={styles['message-avatar']}
                          style={{
                            backgroundColor: `${userColor}20`,
                            color: userColor,
                            border: `2px solid ${userColor}40`,
                          }}
                        >
                          {msg.userName.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles['message-content']}>
                          <div className={styles['message-header']}>
                            <span className={styles['message-sender']} style={{ color: userColor }}>
                              {msg.userName}
                            </span>
                            {isOwnMessage && (
                              <span className={styles['message-you-badge']}>You</span>
                            )}
                            <span className={styles['message-time']}>
                              {formatTime(msg.timestamp)}
                            </span>
                          </div>
                          <div className={styles['message-text']}>{msg.text}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <form className={styles['chat-input-form']} onSubmit={handleCanvasChatSubmit}>
              <input
                type="text"
                className={styles['chat-input']}
                placeholder="Message your team..."
                value={canvasInput}
                onChange={(e) => setCanvasInput(e.target.value)}
                disabled={!user || !canvasId}
                aria-label="Canvas chat message input"
              />
              <button
                type="submit"
                className={styles['chat-send-btn']}
                disabled={!canvasInput.trim() || !user || !canvasId}
                aria-label="Send message"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </form>
          </>
        )}

        {/* Canny AI Tab */}
        {activeTab === 'canny' && (
          <>
            <div className={styles['chat-messages']}>
              {messages.map((message) => {
                // Skip rendering messages that only contain tool calls (no text content)
                if (message.tool_calls && !message.content) {
                  return null;
                }

                // Extract text content from message (handle both string and multimodal array formats)
                let cleanContent = '';

                if (typeof message.content === 'string') {
                  // Simple string content — strip both marker formats
                  cleanContent = message.content
                    .replace(/__TOOL_CALLS__.+?__END_TOOL_CALLS__/g, '')
                    .replace(/TOOLCALL>[\s\S]*/g, '')
                    .trim();
                } else if (Array.isArray(message.content)) {
                  // Multimodal content (text + image) - extract text parts only
                  cleanContent = message.content
                    .filter((part) => part.type === 'text')
                    .map((part) => part.text)
                    .join(' ')
                    .replace(/__TOOL_CALLS__.+?__END_TOOL_CALLS__/g, '')
                    .replace(/TOOLCALL>[\s\S]*/g, '')
                    .trim();
                }

                // Skip if message is now empty after removing marker
                if (!cleanContent && !message.tool_calls) {
                  return null;
                }

                const messageType = getMessageType(message.role);
                return (
                  <div
                    key={message.id}
                    className={`${styles['chat-message']} ${styles[messageType] || ''}`}
                  >
                    <div className={styles['message-avatar']}>
                      {messageType === 'user' ? '👤' : messageType === 'assistant' ? '🤖' : 'ℹ️'}
                    </div>
                    <div className={styles['message-content']}>
                      <div className={styles['message-text']}>{cleanContent}</div>
                      {message.createdAt && (
                        <div className={styles['message-time']}>
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {isLoading && (
                <div
                  className={`${styles['chat-message']} ${styles['assistant']} ${styles['loading']}`}
                >
                  <div className={styles['message-avatar']}>🤖</div>
                  <div className={styles['message-content']}>
                    <div className={`${styles['message-text']} ${styles['typing-indicator']}`}>
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              {error && (
                <div className={`${styles['chat-message']} ${styles['system']} ${styles['error']}`}>
                  <div className={styles['message-avatar']}>⚠️</div>
                  <div className={styles['message-content']}>
                    <div className={styles['message-text']} style={{ color: '#ff6b6b' }}>
                      <strong>Oops — Canny couldn't respond.</strong>
                      <br />
                      {(() => {
                        let msg = error.message || '';
                        try {
                          const parsed = JSON.parse(msg);
                          msg = parsed.error || msg;
                        } catch {
                          // not JSON, use as-is
                        }
                        return msg && !/internal server error/i.test(msg)
                          ? msg
                          : 'The AI model failed to process this request. This can happen when the backend is unreachable or the model is temporarily unavailable.';
                      })()}
                      <br />
                      <span style={{ opacity: 0.7, fontSize: '0.85em' }}>
                        Try again in a moment, or simplify your message. If this keeps happening,
                        the model provider may be experiencing issues.
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={cannyMessagesEndRef} />
            </div>

            {/* Vision indicator */}
            {(isCapturingCanvas || visionReason) && (
              <div className={styles['vision-indicator']}>
                <span className={styles['vision-icon']}>👁️</span>
                <span className={styles['vision-text']}>
                  {visionReason || 'Capturing canvas...'}
                </span>
              </div>
            )}

            {/* Example Prompts Dropdown */}
            <div className={styles['example-prompts-container']} ref={examplesDropdownRef}>
              <button
                type="button"
                className={`${styles['example-prompts-trigger']} ${showExamples ? styles['open'] : ''}`}
                onClick={() => setShowExamples(!showExamples)}
                aria-label="Toggle example prompts"
              >
                💡 Example Prompts
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {showExamples && (
                <div className={styles['example-prompts-dropdown']}>
                  <div className={styles['example-prompts']}>
                    <div className={styles['example-header']}>
                      <span className={styles['example-icon']}>💡</span>
                      <h4>Try asking Canny...</h4>
                    </div>
                    {EXAMPLE_PROMPTS.map((category) => (
                      <div key={category.category} className={styles['example-category']}>
                        <div className={styles['category-title']}>{category.category}</div>
                        <div className={styles['category-prompts']}>
                          {category.prompts.map((prompt) => (
                            <button
                              key={prompt}
                              className={styles['example-prompt-btn']}
                              onClick={() => handleExampleClick(prompt)}
                              disabled={isLoading || isCapturingCanvas}
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <form className={styles['chat-input-form']} onSubmit={handleCannySubmit}>
              <input
                type="text"
                className={styles['chat-input']}
                placeholder="Ask Canny... (I can see the canvas! 👁️)"
                value={input}
                onChange={handleInputChange}
                disabled={isLoading || isCapturingCanvas}
                aria-label="Chat message input"
              />

              {/* Stop button - visible during loading */}
              {(isLoading || isCapturingCanvas) && (
                <button
                  type="button"
                  className={styles['chat-stop-btn']}
                  onClick={handleStop}
                  aria-label="Stop generation"
                  title="Stop current request"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
              )}

              {/* Send button - visible when not loading */}
              {!(isLoading || isCapturingCanvas) && (
                <button
                  type="submit"
                  className={styles['chat-send-btn']}
                  disabled={!input.trim()}
                  aria-label="Send message"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default ChatPanel;
