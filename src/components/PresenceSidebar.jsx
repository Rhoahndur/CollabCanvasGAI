import { getUserColor } from '../utils/colorUtils';
import './PresenceSidebar.css';

/**
 * PresenceSidebar component - displays online users in a sidebar
 */
function PresenceSidebar({ onlineUsers, currentSessionId }) {
  return (
    <aside className="presence-sidebar">
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
  );
}

export default PresenceSidebar;

