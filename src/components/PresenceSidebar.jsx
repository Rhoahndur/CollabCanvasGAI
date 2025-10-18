import { useState } from 'react';
import { getUserColor } from '../utils/colorUtils';
import './PresenceSidebar.css';

/**
 * PresenceSidebar component - displays online users in a sidebar
 * Auto-hides and shows on hover
 */
function PresenceSidebar({ onlineUsers, currentSessionId }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      {/* Minimized tab - always visible */}
      {!isExpanded && (
        <div 
          className="presence-minimized-tab"
          onMouseEnter={() => setIsExpanded(true)}
          onClick={() => setIsExpanded(true)}
        >
          <div className="minimized-icon">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8 9c-3.5 0-6 2-6 4v1h12v-1c0-2-2.5-4-6-4Z"/>
            </svg>
          </div>
          <div className="minimized-count">{onlineUsers.length}</div>
        </div>
      )}
      
      {/* Expanded sidebar */}
      <aside 
        className={`presence-sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <div className="presence-header">
          <h3>Online Users</h3>
          <span className="user-count">{onlineUsers.length}</span>
        </div>
      
      <div className="presence-list">
        {onlineUsers.length === 0 ? (
          <div className="presence-empty">
            <p>No users online</p>
          </div>
        ) : (
          onlineUsers.map((user) => {
            const isCurrentUser = user.sessionId === currentSessionId;
            const userColor = getUserColor(user.userId);
            
            return (
              <div 
                key={user.sessionId} 
                className={`presence-user ${isCurrentUser ? 'current-user' : ''}`}
              >
                {/* User avatar/indicator */}
                <div 
                  className="user-indicator"
                  style={{ backgroundColor: userColor }}
                >
                  {user.userName.charAt(0).toUpperCase()}
                </div>
                
                {/* User info */}
                <div className="user-info">
                  <div className="user-name">
                    {user.userName}
                    {isCurrentUser && <span className="you-label">(you)</span>}
                  </div>
                  <div className="user-status">
                    <span className={`status-indicator ${user.isActive ? 'active' : 'away'}`}></span>
                    <span className="status-text">{user.isActive ? 'Active' : 'Away'}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
    </>
  );
}

export default PresenceSidebar;

