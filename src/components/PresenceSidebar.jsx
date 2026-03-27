import { useState } from 'react';
import { getUserColor } from '../utils/colorUtils';
import styles from './PresenceSidebar.module.css';

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
          className={styles['presence-minimized-tab']}
          onMouseEnter={() => setIsExpanded(true)}
          onClick={() => setIsExpanded(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsExpanded(true);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className={styles['minimized-icon']}>
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8 9c-3.5 0-6 2-6 4v1h12v-1c0-2-2.5-4-6-4Z" />
            </svg>
          </div>
          <div className={styles['minimized-count']}>{onlineUsers.length}</div>
        </div>
      )}

      {/* Expanded sidebar */}
      <aside
        className={`${styles['presence-sidebar']} ${isExpanded ? styles.expanded : styles.collapsed}`}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <div className={styles['presence-header']}>
          <h3>Online Users</h3>
          <span className={styles['user-count']}>{onlineUsers.length}</span>
        </div>

        <div className={styles['presence-list']}>
          {onlineUsers.length === 0 ? (
            <div className={styles['presence-empty']}>
              <p>No users online</p>
            </div>
          ) : (
            onlineUsers.map((user) => {
              const isCurrentUser = user.sessionId === currentSessionId;
              const userColor = getUserColor(user.userId);

              return (
                <div
                  key={user.sessionId}
                  className={`${styles['presence-user']} ${isCurrentUser ? styles['current-user'] : ''}`}
                >
                  {/* User avatar/indicator */}
                  <div
                    className={styles['user-indicator']}
                    style={{ backgroundColor: userColor }}
                    title={user.userName || 'Anonymous'}
                  >
                    {(user.userName || 'A').charAt(0).toUpperCase()}
                  </div>

                  {/* User info */}
                  <div className={styles['user-info']}>
                    <div className={styles['user-name']}>
                      {user.userName || 'Anonymous'}
                      {isCurrentUser && <span className={styles['you-label']}>(you)</span>}
                    </div>
                    <div className={styles['user-status']}>
                      <span
                        className={`${styles['status-indicator']} ${user.isActive ? styles.active : styles.away}`}
                      ></span>
                      <span className={styles['status-text']}>
                        {user.isActive ? 'Active' : 'Away'}
                      </span>
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
