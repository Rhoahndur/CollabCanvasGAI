import { useState } from 'react';
import './ChatPanel.css';

/**
 * ChatPanel component - Slide-up chat interface for LLM helper agent
 * Currently UI only, logic to be added later
 */
function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'system',
      text: 'Canny ready! (UI only - logic coming soon)',
      timestamp: Date.now(),
    }
  ]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;

    // For now, just add the message to the UI (no actual AI processing)
    const newMessage = {
      id: Date.now(),
      type: 'user',
      text: inputValue,
      timestamp: Date.now(),
    };

    setMessages([...messages, newMessage]);
    setInputValue('');

    // Placeholder for Canny response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'assistant',
        text: 'Canny\'s response will appear here once logic is implemented.',
        timestamp: Date.now(),
      }]);
    }, 500);
  };

  const handleClear = () => {
    setMessages([{
      id: Date.now(),
      type: 'system',
      text: 'Chat cleared',
      timestamp: Date.now(),
    }]);
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
            <span className="chat-status">Ready</span>
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
          {messages.map((message) => (
            <div key={message.id} className={`chat-message ${message.type}`}>
              <div className="message-avatar">
                {message.type === 'user' ? '👤' : message.type === 'assistant' ? '🤖' : 'ℹ️'}
              </div>
              <div className="message-content">
                <div className="message-text">{message.text}</div>
                <div className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <form className="chat-input-form" onSubmit={handleSubmit}>
          <input
            type="text"
            className="chat-input"
            placeholder="Ask Canny..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            aria-label="Chat message input"
          />
          <button 
            type="submit" 
            className="chat-send-btn"
            disabled={!inputValue.trim()}
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

