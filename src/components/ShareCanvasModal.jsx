import { useState, useEffect } from 'react';
import { addCanvasPermission, removeCanvasPermission, getCanvasMetadata } from '../services/canvasService';
import { CANVAS_ROLE } from '../utils/constants';
import './ShareCanvasModal.css';

/**
 * ShareCanvasModal component - Share canvas with other users
 * Allows owners to:
 * - Generate shareable links
 * - Invite users by email/user ID
 * - Manage collaborators
 * - Set role permissions (Editor/Viewer)
 */
function ShareCanvasModal({ canvasId, canvasName, currentUserId, isOpen, onClose }) {
  const [shareLink, setShareLink] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState(CANVAS_ROLE.EDITOR);
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
      console.error('Failed to load collaborators:', err);
    }
  };

  // Copy shareable link to clipboard
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy link:', err);
        setError('Failed to copy link to clipboard');
      });
  };

  // Invite user by email/ID
  const handleInvite = async (e) => {
    e.preventDefault();
    
    if (!inviteEmail.trim()) {
      setError('Please enter an email or user ID');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // For MVP: Use email as userId (in production, would look up user in database)
      // In a real app, this would:
      // 1. Check if user exists by email
      // 2. Send email invitation
      // 3. Add permission once user accepts
      
      // For now, we'll add the email as a pending invitation
      await addCanvasPermission(canvasId, inviteEmail, selectedRole, inviteEmail);
      
      setSuccessMessage(`Invited ${inviteEmail} as ${selectedRole}`);
      setInviteEmail('');
      loadCollaborators();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Failed to invite user:', err);
      setError('Failed to send invitation. Please try again.');
    } finally {
      setLoading(false);
    }
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
      console.error('Failed to remove collaborator:', err);
      setError('Failed to remove collaborator. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    setError('');
    setSuccessMessage('');
    setInviteEmail('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="share-modal-overlay" onClick={handleClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="share-modal-header">
          <h2>Share "{canvasName}"</h2>
          <button className="share-modal-close" onClick={handleClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="share-modal-content">
          {/* Error/Success Messages */}
          {error && <div className="share-modal-error">{error}</div>}
          {successMessage && <div className="share-modal-success">{successMessage}</div>}

          {/* Shareable Link Section */}
          <div className="share-section">
            <h3>Shareable Link</h3>
            <p className="share-section-description">
              Anyone with this link can view the canvas
            </p>
            <div className="share-link-container">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="share-link-input"
              />
              <button
                className={`share-link-copy-btn ${copySuccess ? 'copied' : ''}`}
                onClick={handleCopyLink}
              >
                {copySuccess ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
          </div>

          {/* Invite User Section */}
          <div className="share-section">
            <h3>Invite Collaborator</h3>
            <form onSubmit={handleInvite} className="share-invite-form">
              <div className="share-invite-inputs">
                <input
                  type="text"
                  placeholder="Enter email or user ID"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="share-invite-input"
                  disabled={loading}
                />
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="share-role-select"
                  disabled={loading}
                >
                  <option value={CANVAS_ROLE.EDITOR}>Editor</option>
                  <option value={CANVAS_ROLE.VIEWER}>Viewer</option>
                </select>
              </div>
              <button
                type="submit"
                className="share-invite-btn"
                disabled={loading || !inviteEmail.trim()}
              >
                {loading ? 'Inviting...' : 'Send Invite'}
              </button>
            </form>
          </div>

          {/* Collaborators List */}
          <div className="share-section">
            <h3>Collaborators ({collaborators.length})</h3>
            {collaborators.length === 0 ? (
              <p className="share-empty-state">No collaborators yet. Invite someone to get started!</p>
            ) : (
              <div className="share-collaborators-list">
                {collaborators.map((collab) => (
                  <div key={collab.userId} className="share-collaborator-item">
                    <div className="share-collaborator-info">
                      <span className="share-collaborator-name">
                        {collab.userName}
                        {collab.userId === currentUserId && ' (You)'}
                      </span>
                      <span className={`share-role-badge role-${collab.role}`}>
                        {collab.role}
                      </span>
                    </div>
                    {collab.userId !== currentUserId && collab.role !== CANVAS_ROLE.OWNER && (
                      <button
                        className="share-remove-btn"
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
        <div className="share-modal-footer">
          <button className="share-modal-done-btn" onClick={handleClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default ShareCanvasModal;

