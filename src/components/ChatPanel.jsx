import { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import './ChatPanel.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * ChatPanel component - Slide-up chat interface for Canny AI assistant
 * Uses Vercel AI SDK for streaming responses
 */
function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Use AI SDK's useChat hook for streaming
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: `${API_URL}/api/chat`,
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: '👋 Hi! I\'m Canny, your CollabCanvas assistant! Ask me anything about using the canvas, collaboration features, or get creative suggestions! 🎨',
      }
    ],
  });

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleClear = () => {
    // Reload page to clear chat (simpler than managing SDK state)
    if (window.confirm('Clear chat history? This will refresh the page.')) {
      window.location.reload();
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Format message role to display type
  const getMessageType = (role) => {
    if (role === 'user') return 'user';
    if (role === 'assistant') return 'assistant';
    return 'system';
  };

  return (
    <div className={`chat-panel ${isOpen ? 'open' : 'closed'}`}>
      {/* Toggle button */}
      <button 
        className="chat-toggle"
        onClick={handleToggle}
        title={isOpen ? 'Close Canny' : 'Open Canny'}
        aria-label={isOpen ? 'Close Canny' : 'Open Canny'}
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
            <span className="chat-badge">Canny</span>
          </>
        )}
      </button>

      {/* Chat content */}
      <div className="chat-content">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-title">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
            </svg>
            <h3>Canny</h3>
            <span className="chat-status">{isLoading ? 'Thinking...' : 'Ready'}</span>
            {error && <span className="chat-error" title={error.message}>⚠️</span>}
          </div>
          <div className="chat-header-actions">
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

        {/* Messages */}
        <div className="chat-messages">
          {messages.map((message, index) => {
            const messageType = getMessageType(message.role);
            return (
              <div key={message.id || index} className={`chat-message ${messageType}`}>
                <div className="message-avatar">
                  {messageType === 'user' ? '👤' : messageType === 'assistant' ? '🤖' : 'ℹ️'}
                </div>
                <div className="message-content">
                  <div className="message-text">{message.content}</div>
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
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form className="chat-input-form" onSubmit={handleSubmit}>
          <input
            type="text"
            className="chat-input"
            placeholder="Ask Canny..."
            value={input}
            onChange={handleInputChange}
            disabled={isLoading}
            aria-label="Chat message input"
          />
          <button 
            type="submit" 
            className="chat-send-btn"
            disabled={!input.trim() || isLoading}
            aria-label="Send message"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatPanel;

