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
      {/* Invisible hover trigger zone (wider area on the right) */}
      <div 
        className="sidebar-hover-zone"
        onMouseEnter={() => setIsExpanded(true)}
        style={{
          position: 'fixed',
          right: 0,
          top: '64px',
          width: '80px',
          height: 'calc(100% - 64px)',
          zIndex: 99,
          pointerEvents: isExpanded ? 'none' : 'auto',
        }}
      />
      
      <aside 
        className={`presence-sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Tab indicator (always visible when collapsed) */}
        <div className="sidebar-tab">
          <div className="tab-icon">
            <span className="user-count-badge">{onlineUsers.length}</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8 9c-3.5 0-6 2-6 4v1h12v-1c0-2-2.5-4-6-4Z"/>
            </svg>
          </div>
        </div>

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
                    <span className="status-indicator online"></span>
                    <span className="status-text">Online</span>
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

