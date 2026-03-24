import { useState, useEffect } from 'react';
import { removeCanvasPermission, getCanvasMetadata } from '../services/canvasService';
import { CANVAS_ROLE } from '../utils/constants';
import { reportError } from '../utils/errorHandler';
import styles from './ShareCanvasModal.module.css';

/**
 * ShareCanvasModal component - Share canvas with other users
 * Allows owners to:
 * - Generate shareable links with role permissions (Editor/Viewer)
 * - Manage collaborators
 */
function ShareCanvasModal({ canvasId, canvasName, currentUserId, isOpen, onClose }) {
  const [shareLink, setShareLink] = useState('');
  const [shareLinkRole, setShareLinkRole] = useState(CANVAS_ROLE.VIEWER); // Role for share link
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Generate shareable link on mount
  useEffect(() => {
    if (isOpen && canvasId) {
      const link = `${window.location.origin}/canvas/${canvasId}`;
      setShareLink(link);
      loadCollaborators();
    }
  }, [isOpen, canvasId]);

  // Load list of collaborators
  const loadCollaborators = async () => {
    try {
      const metadata = await getCanvasMetadata(canvasId);
      if (metadata?.permissions) {
        const collabList = Object.entries(metadata.permissions).map(([userId, data]) => ({
          userId,
          role: data.role || data, // Handle both string and object format
          userName: data.userName || userId,
        }));
        setCollaborators(collabList);
      }
    } catch (err) {
      reportError(err, { component: 'ShareCanvasModal', action: 'loadCollaborators' });
    }
  };

  // Copy shareable link to clipboard with role parameter
  const handleCopyLink = () => {
    const linkWithRole = `${shareLink}?role=${shareLinkRole}`;
    navigator.clipboard
      .writeText(linkWithRole)
      .then(() => {
        setCopySuccess(true);
        setSuccessMessage(`${shareLinkRole === 'editor' ? 'Editor' : 'Viewer'} link copied!`);
        setTimeout(() => {
          setCopySuccess(false);
          setSuccessMessage('');
        }, 2000);
      })
      .catch((err) => {
        reportError(err, { component: 'ShareCanvasModal', action: 'handleCopyLink' });
        setError('Failed to copy link to clipboard');
      });
  };

  // Remove collaborator
  const handleRemoveCollaborator = async (userId) => {
    if (userId === currentUserId) {
      setError("You can't remove yourself");
      return;
    }

    const confirmed = window.confirm('Are you sure you want to remove this collaborator?');
    if (!confirmed) return;

    setLoading(true);
    setError('');

    try {
      await removeCanvasPermission(canvasId, userId);
      setSuccessMessage('Collaborator removed');
      loadCollaborators();

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      reportError(err, { component: 'ShareCanvasModal', action: 'handleRemoveCollaborator' });
      setError('Failed to remove collaborator. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    setError('');
    setSuccessMessage('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className={styles['share-modal-overlay']}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') handleClose();
      }}
    >
      <div className={styles['share-modal']}>
        {/* Header */}
        <div className={styles['share-modal-header']}>
          <h2>Share "{canvasName}"</h2>
          <button className={styles['share-modal-close']} onClick={handleClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className={styles['share-modal-content']}>
          {/* Error/Success Messages */}
          {error && <div className={styles['share-modal-error']}>{error}</div>}
          {successMessage && <div className={styles['share-modal-success']}>{successMessage}</div>}

          {/* Shareable Link Section */}
          <div className={styles['share-section']}>
            <h3>Shareable Link</h3>
            <p className={styles['share-section-description']}>
              Choose the access level for people who use this link
            </p>

            {/* Role selector for share link */}
            <div className={styles['share-link-role-selector']}>
              <button
                type="button"
                className={`${styles['share-link-role-btn']} ${shareLinkRole === CANVAS_ROLE.VIEWER ? styles['active'] : ''}`}
                onClick={() => setShareLinkRole(CANVAS_ROLE.VIEWER)}
              >
                <span className={styles['role-icon']}>👁️</span>
                <span className={styles['role-label']}>Viewer</span>
                <span className={styles['role-desc']}>Can view only</span>
              </button>
              <button
                type="button"
                className={`${styles['share-link-role-btn']} ${shareLinkRole === CANVAS_ROLE.EDITOR ? styles['active'] : ''}`}
                onClick={() => setShareLinkRole(CANVAS_ROLE.EDITOR)}
              >
                <span className={styles['role-icon']}>✏️</span>
                <span className={styles['role-label']}>Editor</span>
                <span className={styles['role-desc']}>Can view & edit</span>
              </button>
            </div>

            <div className={styles['share-link-container']}>
              <input
                type="text"
                value={`${shareLink}?role=${shareLinkRole}`}
                readOnly
                className={styles['share-link-input']}
              />
              <button
                className={`${styles['share-link-copy-btn']} ${copySuccess ? styles['copied'] : ''}`}
                onClick={handleCopyLink}
              >
                {copySuccess ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
          </div>

          {/* Collaborators List */}
          <div className={styles['share-section']}>
            <h3>Collaborators ({collaborators.length})</h3>
            {collaborators.length === 0 ? (
              <p className={styles['share-empty-state']}>
                No collaborators yet. Share the link above to invite people!
              </p>
            ) : (
              <div className={styles['share-collaborators-list']}>
                {collaborators.map((collab) => (
                  <div key={collab.userId} className={styles['share-collaborator-item']}>
                    <div className={styles['share-collaborator-info']}>
                      <span className={styles['share-collaborator-name']}>
                        {collab.userName}
                        {collab.userId === currentUserId && ' (You)'}
                      </span>
                      <span
                        className={`${styles['share-role-badge']} ${styles['role-' + collab.role] || ''}`}
                      >
                        {collab.role}
                      </span>
                    </div>
                    {collab.userId !== currentUserId && collab.role !== CANVAS_ROLE.OWNER && (
                      <button
                        className={styles['share-remove-btn']}
                        onClick={() => handleRemoveCollaborator(collab.userId)}
                        disabled={loading}
                        title="Remove collaborator"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={styles['share-modal-footer']}>
          <button className={styles['share-modal-done-btn']} onClick={handleClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default ShareCanvasModal;
