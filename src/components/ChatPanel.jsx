import { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import { ref, push, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { realtimeDb } from '../services/firebase';
import { executeCanvasTool } from '../utils/canvasTools';
import { captureCanvasImage, shouldUseVision, getVisionReason } from '../utils/canvasCapture';
import './ChatPanel.css';

// Track executed tool calls to prevent infinite loops
const executedToolCalls = new Set();

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
      'Create a text box that says "Hello"'
    ]
  },
  {
    category: '📐 Arrange',
    prompts: [
      'Align these shapes to the left',
      'Distribute them horizontally',
      'Arrange in a 2x3 grid',
      'Center everything on the canvas'
    ]
  },
  {
    category: '👁️ Vision',
    prompts: [
      'What colors am I using?',
      'Create rectangles around the blue circle',
      'Fill the empty space on the right',
      'Match the pattern on the left'
    ]
  },
  {
    category: '✨ Transform',
    prompts: [
      'Make them all green',
      'Rotate selected shapes 45 degrees',
      'Make all circles bigger',
      'Change the layout to be symmetric'
    ]
  },
  {
    category: '❓ Ask',
    prompts: [
      'How many shapes are there?',
      'Describe the current layout',
      'What would make this balanced?',
      'Suggest improvements'
    ]
  }
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
  deleteShape,
  selectShape,
  deselectShape,
  viewport = { offsetX: 0, offsetY: 0, zoom: 1, centerX: 0, centerY: 0 },
  svgRef // SVG element reference for canvas capture
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
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);
  
  // Use AI SDK's useChat hook for streaming with tool support
  // In production (Vercel), uses /api/chat
  // In development, uses localhost:3001/api/chat
  const apiEndpoint = import.meta.env.PROD 
    ? '/api/chat' 
    : 'http://localhost:3001/api/chat';
  
  const { messages, input, handleInputChange, handleSubmit, isLoading, error, append } = useChat({
    api: apiEndpoint,
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: '👋 Hi! I\'m Canny, your CollabCanvas assistant! I can manipulate the canvas for you and even SEE what\'s on it! Try "create rectangles around the blue circle" or "what colors am I using?" 🎨👁️✨',
      }
    ],
    // Handle tool calls from Canny
    experimental_onToolCall: async (toolCall) => {
      console.log('🔧 Canny is calling tool:', toolCall.toolName, 'with args:', toolCall.args);
      
      // Execute the tool
      const context = {
        shapes,
        selectedShapeIds,
        createShape,
        updateShape,
        deleteShape,
        selectShape,
        deselectShape,
        viewport,
        canvasId,
        userId: user?.uid
      };
      
      const result = executeCanvasTool(toolCall.toolName, toolCall.args, context);
      
      console.log('✅ Tool execution result:', result);
      
      // Return result to Canny
      return result;
    }
  });

  // Stop current request
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      console.log('🛑 Request stopped by user');
    }
    setIsCapturingCanvas(false);
    setVisionReason(null);
  };

  // Custom submit handler with guardrails
  const handleCannySubmit = async (e) => {
    e.preventDefault();
    
    const trimmedInput = input.trim();
    if (!trimmedInput) return;
    
    // Guardrail 1: Message length limit
    if (trimmedInput.length > MAX_MESSAGE_LENGTH) {
      alert(`Message too long! Please keep it under ${MAX_MESSAGE_LENGTH} characters (currently ${trimmedInput.length}).`);
      return;
    }
    
    // Guardrail 2: Rate limiting (cooldown between requests)
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < REQUEST_COOLDOWN && lastRequestTime > 0) {
      const waitTime = Math.ceil((REQUEST_COOLDOWN - timeSinceLastRequest) / 1000);
      alert(`Please wait ${waitTime} second${waitTime > 1 ? 's' : ''} before sending another message.`);
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
        
        console.log('👁️ Vision detected! Capturing canvas...');
        
        // Capture canvas as image
        const canvasImage = await captureCanvasImage(svgRef.current);
        
        console.log('✅ Canvas captured, sending with vision...');
        
        // Send message with image using append()
        await append({
          role: 'user',
          content: [
            {
              type: 'text',
              text: trimmedInput
            },
            {
              type: 'image_url',
              image_url: {
                url: canvasImage
              }
            }
          ]
        });
        
        setIsCapturingCanvas(false);
        setVisionReason(null);
      } catch (error) {
        console.error('Failed to capture canvas:', error);
        setIsCapturingCanvas(false);
        setVisionReason(null);
        
        // Fallback: send without vision
        if (error.name !== 'AbortError') {
          handleSubmit(e);
        }
      }
    } else {
      // No vision needed, use regular submit
      try {
        await handleSubmit(e);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Failed to send message:', error);
        }
      }
    }
  };

  // Handle example prompt click
  const handleExampleClick = (prompt) => {
    handleInputChange({ target: { value: prompt } });
    // Auto-submit after short delay so user can see what was filled in
    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} };
      handleCannySubmit(fakeEvent);
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
          ...childSnapshot.val()
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
      console.log('🔧 Detected tool calls in message (standard format):', lastMessage.tool_calls);
      toolCallsToExecute = lastMessage.tool_calls;
    }
    
    // Method 2: Check if message content contains our special marker
    if (lastMessage?.content && typeof lastMessage.content === 'string') {
      const markerMatch = lastMessage.content.match(/__TOOL_CALLS__(.+?)__END_TOOL_CALLS__/);
      if (markerMatch) {
        try {
          const parsedToolCalls = JSON.parse(markerMatch[1]);
          console.log('🔧 Detected tool calls in message (marker format):', parsedToolCalls);
          toolCallsToExecute = parsedToolCalls;
        } catch (e) {
          console.error('Failed to parse tool calls from marker:', e);
        }
      }
    }
    
    // Execute any detected tool calls (but only once per message!)
    if (toolCallsToExecute.length > 0) {
      for (const toolCall of toolCallsToExecute) {
        // Create unique ID for this tool call
        const toolCallId = `${messageId}_${toolCall.id || toolCall.function?.name}`;
        
        // Skip if already executed
        if (executedToolCalls.has(toolCallId)) {
          console.log(`⏭️ Skipping already executed tool call: ${toolCallId}`);
          continue;
        }
        
        // Mark as executed BEFORE running to prevent race conditions
        executedToolCalls.add(toolCallId);
        
        if (toolCall.type === 'function' && toolCall.function) {
          const toolName = toolCall.function.name;
          let args;
          
          try {
            args = JSON.parse(toolCall.function.arguments);
          } catch (e) {
            console.error('Failed to parse tool arguments:', e);
            continue;
          }
          
          console.log(`🛠️ Executing tool (${toolCallId}): ${toolName}`, args);
          
          // Build context (use latest values from closure)
          const context = {
            shapes,
            selectedShapeIds,
            createShape,
            updateShape,
            deleteShape,
            selectShape,
            deselectShape,
            viewport,
            canvasId,
            userId: user?.uid
          };
          
          // Execute the tool
          const result = executeCanvasTool(toolName, args, context);
          console.log('✅ Tool result:', result);
        }
      }
    }
  }, [messages]); // CRITICAL: Only depend on messages, NOT shapes!

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
        timestamp: Date.now()
      });

      setCanvasInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
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
      minute: '2-digit' 
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
      className={`chat-panel ${isOpen ? 'open' : 'closed'} ${isResizing ? 'resizing' : ''}`}
      style={{ width: isOpen ? `${panelWidth}px` : undefined }}
    >
      {/* Resize handle */}
      {isOpen && (
        <div 
          className="chat-resize-handle"
          onMouseDown={handleResizeStart}
          title="Drag to resize"
        />
      )}
      
      {/* Toggle button */}
      <button 
        className="chat-toggle"
        onClick={handleToggle}
        title={isOpen ? 'Close Chat' : 'Open Chat'}
        aria-label={isOpen ? 'Close Chat' : 'Open Chat'}
      >
        {isOpen ? (
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
            </svg>
            <span className="chat-badge">Chat</span>
          </>
        )}
      </button>

      {/* Chat content */}
      <div className="chat-content">
        {/* Header with tabs */}
        <div className="chat-header">
          <div className="chat-tabs">
            <button
              className={`chat-tab ${activeTab === 'canvas' ? 'active' : ''}`}
              onClick={() => setActiveTab('canvas')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Users
            </button>
            <button
              className={`chat-tab ${activeTab === 'canny' ? 'active' : ''}`}
              onClick={() => setActiveTab('canny')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
              </svg>
              Canny
            </button>
          </div>
          <div className="chat-header-actions">
            {activeTab === 'canny' && (
              <button 
                className="chat-action-btn"
                onClick={handleClear}
                title="Clear chat"
                aria-label="Clear chat"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                </svg>
              </button>
            )}
            <button 
              className="chat-action-btn"
              onClick={handleToggle}
              title="Minimize"
              aria-label="Minimize"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Canvas Chat Tab */}
        {activeTab === 'canvas' && (
          <>
            <div className="chat-messages">
              {canvasMessages.length === 0 ? (
                <div className="chat-empty-state">
                  <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <p>No messages yet</p>
                  <p className="chat-empty-hint">Start a conversation with your collaborators!</p>
                </div>
              ) : (
                <>
                  {canvasMessages.map((msg) => {
                    const isOwnMessage = user && msg.userId === user.uid;
                    const userColor = getUserColor(msg.userId);
                    
                    return (
                      <div key={msg.id} className={`chat-message ${isOwnMessage ? 'user' : 'other'}`}>
                        <div 
                          className="message-avatar"
                          style={{ 
                            backgroundColor: `${userColor}20`,
                            color: userColor,
                            border: `2px solid ${userColor}40`
                          }}
                        >
                          {msg.userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="message-content">
                          <div className="message-header">
                            <span 
                              className="message-sender"
                              style={{ color: userColor }}
                            >
                              {msg.userName}
                            </span>
                            {isOwnMessage && (
                              <span className="message-you-badge">You</span>
                            )}
                            <span className="message-time">{formatTime(msg.timestamp)}</span>
                          </div>
                          <div className="message-text">{msg.text}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <form className="chat-input-form" onSubmit={handleCanvasChatSubmit}>
              <input
                type="text"
                className="chat-input"
                placeholder="Message your team..."
                value={canvasInput}
                onChange={(e) => setCanvasInput(e.target.value)}
                disabled={!user || !canvasId}
                aria-label="Canvas chat message input"
              />
              <button 
                type="submit" 
                className="chat-send-btn"
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
            <div className="chat-messages">
          {/* Example Prompts - Toggle with button */}
          {showExamples && (
            <div className="example-prompts">
              <div className="example-header">
                <span className="example-icon">💡</span>
                <h4>Try asking Canny...</h4>
              </div>
              {EXAMPLE_PROMPTS.map((category, catIndex) => (
                <div key={catIndex} className="example-category">
                  <div className="category-title">{category.category}</div>
                  <div className="category-prompts">
                    {category.prompts.map((prompt, promptIndex) => (
                      <button
                        key={promptIndex}
                        className="example-prompt-btn"
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
          )}
          
          {messages.map((message, index) => {
            // Skip rendering messages that only contain tool calls (no text content)
            if (message.tool_calls && !message.content) {
              return null;
            }
            
            // Extract text content from message (handle both string and multimodal array formats)
            let cleanContent = '';
            
            if (typeof message.content === 'string') {
              // Simple string content
              cleanContent = message.content.replace(/__TOOL_CALLS__.+?__END_TOOL_CALLS__/g, '').trim();
            } else if (Array.isArray(message.content)) {
              // Multimodal content (text + image) - extract text parts only
              cleanContent = message.content
                .filter(part => part.type === 'text')
                .map(part => part.text)
                .join(' ')
                .replace(/__TOOL_CALLS__.+?__END_TOOL_CALLS__/g, '')
                .trim();
            }
            
            // Skip if message is now empty after removing marker
            if (!cleanContent && !message.tool_calls) {
              return null;
            }
            
            const messageType = getMessageType(message.role);
            return (
              <div key={message.id || index} className={`chat-message ${messageType}`}>
                <div className="message-avatar">
                  {messageType === 'user' ? '👤' : messageType === 'assistant' ? '🤖' : 'ℹ️'}
                </div>
                <div className="message-content">
                  <div className="message-text">{cleanContent}</div>
                  {message.createdAt && (
                    <div className="message-time">
                      {new Date(message.createdAt).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="chat-message assistant loading">
              <div className="message-avatar">🤖</div>
              <div className="message-content">
                <div className="message-text typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="chat-message system error">
              <div className="message-avatar">⚠️</div>
              <div className="message-content">
                <div className="message-text" style={{ color: '#ff6b6b' }}>
                  <strong>Error:</strong> {error.message || 'Failed to connect to Canny. Make sure the backend server is running and your OpenAI API key is configured.'}
                </div>
              </div>
            </div>
          )}
          <div ref={cannyMessagesEndRef} />
            </div>

            {/* Vision indicator */}
            {(isCapturingCanvas || visionReason) && (
              <div className="vision-indicator">
                <span className="vision-icon">👁️</span>
                <span className="vision-text">{visionReason || 'Capturing canvas...'}</span>
              </div>
            )}

            <form className="chat-input-form" onSubmit={handleCannySubmit}>
              <input
                type="text"
                className="chat-input"
                placeholder="Ask Canny... (I can see the canvas! 👁️)"
                value={input}
                onChange={handleInputChange}
                disabled={isLoading || isCapturingCanvas}
                aria-label="Chat message input"
              />
              
              {/* Template/Examples button - always visible */}
              <button
                type="button"
                className={`chat-templates-btn ${showExamples ? 'active' : ''}`}
                onClick={() => setShowExamples(!showExamples)}
                aria-label="Toggle example prompts"
                title={showExamples ? "Hide example prompts" : "Show example prompts"}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </button>
              
              {/* Stop button - visible during loading */}
              {(isLoading || isCapturingCanvas) && (
                <button
                  type="button"
                  className="chat-stop-btn"
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
                  className="chat-send-btn"
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

