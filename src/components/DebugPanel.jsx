import { useState, useEffect, useRef } from 'react';
import styles from './DebugPanel.module.css';

/**
 * DebugPanel - Shows OpenAI API calls and responses for debugging Canny
 * Only visible in development mode
 */
function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const logsEndRef = useRef(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Listen for debug events
  useEffect(() => {
    const handleDebugEvent = (event) => {
      const { type, data, timestamp } = event.detail;
      setLogs((prev) => [...prev, { type, data, timestamp: timestamp || Date.now() }]);
    };

    window.addEventListener('canny-debug', handleDebugEvent);
    return () => window.removeEventListener('canny-debug', handleDebugEvent);
  }, []);

  const clearLogs = () => {
    setLogs([]);
  };

  const formatJson = (obj) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  const getLogStyle = (type) => {
    switch (type) {
      case 'request':
        return 'log-request';
      case 'response':
        return 'log-response';
      case 'tool-call':
        return 'log-tool-call';
      case 'tool-result':
        return 'log-tool-result';
      case 'error':
        return 'log-error';
      default:
        return '';
    }
  };

  const getLogIcon = (type) => {
    switch (type) {
      case 'request':
        return '➡️';
      case 'response':
        return '⬅️';
      case 'tool-call':
        return '🔧';
      case 'tool-result':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '📝';
    }
  };

  const getLogTitle = (type) => {
    switch (type) {
      case 'request':
        return 'Request to OpenAI';
      case 'response':
        return 'Response from OpenAI';
      case 'tool-call':
        return 'Tool Call';
      case 'tool-result':
        return 'Tool Result';
      case 'error':
        return 'Error';
      default:
        return 'Log';
    }
  };

  if (!import.meta.env.DEV) {
    return null; // Only show in development
  }

  return (
    <div className={`${styles['debug-panel']} ${isOpen ? styles['open'] : styles['closed']}`}>
      <button className={styles['debug-toggle']} onClick={() => setIsOpen(!isOpen)}>
        🐛 Debug {isOpen ? '▼' : '▲'}
      </button>

      {isOpen && (
        <div className={styles['debug-content']}>
          <div className={styles['debug-header']}>
            <h3>Canny Debug Console</h3>
            <button className={styles['debug-clear']} onClick={clearLogs}>
              Clear
            </button>
          </div>

          <div className={styles['debug-logs']}>
            {logs.length === 0 ? (
              <div className={styles['debug-empty']}>
                No logs yet. Send a message to Canny to see debug info.
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.timestamp}
                  className={`${styles['debug-log']} ${styles[getLogStyle(log.type)] || ''}`}
                >
                  <div className={styles['log-header']}>
                    <span className={styles['log-icon']}>{getLogIcon(log.type)}</span>
                    <span className={styles['log-title']}>{getLogTitle(log.type)}</span>
                    <span className={styles['log-time']}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <pre className={styles['log-content']}>{formatJson(log.data)}</pre>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}

export default DebugPanel;
