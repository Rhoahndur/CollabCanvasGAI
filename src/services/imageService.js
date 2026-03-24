/**
 * Image Service - Image processing for canvas uploads
 * Converts images to base64 data URLs and stores directly in Realtime Database
 * No Firebase Storage needed - completely free!
 */

import { reportError } from '../utils/errorHandler';

/**
 * Convert image file to base64 data URL with optional resizing
 * @param {File|Blob} file - Image file or blob to convert
 * @param {number} maxWidth - Maximum width (default: 400)
 * @param {number} maxHeight - Maximum height (default: 400)
 * @returns {Promise<{dataUrl: string, width: number, height: number}>} Base64 data URL and dimensions
 */
async function convertImageToDataUrl(file, maxWidth = 400, maxHeight = 400) {
  try {
    // Validate file is an image
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Limit file size to 1MB (before compression)
    const MAX_SIZE = 1 * 1024 * 1024; // 1MB
    if (file.size > MAX_SIZE) {
      throw new Error('Image must be smaller than 1MB');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new window.Image();

        img.onload = () => {
          // Calculate new dimensions while maintaining aspect ratio
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            const aspectRatio = width / height;

            if (width > height) {
              width = maxWidth;
              height = width / aspectRatio;
            } else {
              height = maxHeight;
              width = height * aspectRatio;
            }
          }

          // Create canvas to resize image
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64 data URL with compression
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6); // 60% quality JPEG for smaller size

          resolve({
            dataUrl,
            width: Math.round(width),
            height: Math.round(height),
          });
        };

        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };

        img.src = e.target.result;
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsDataURL(file);
    });
  } catch (error) {
    reportError(error, { component: 'imageService', action: 'convertImageToDataUrl' });
    throw error;
  }
}

/**
 * Upload an image (convert to base64 for storage in Realtime DB)
 * @param {File|Blob} file - Image file or blob to upload
 * @param {string} userId - User ID (for logging)
 * @param {string} canvasId - Canvas ID (unused, kept for compatibility)
 * @returns {Promise<{url: string, width: number, height: number}>} Base64 data URL and dimensions
 */
export async function uploadImage(file, userId, canvasId = 'default') {
  try {
    // Convert to base64 with resizing
    const { dataUrl, width, height } = await convertImageToDataUrl(file);

    return {
      url: dataUrl, // Return data URL directly
      width,
      height,
      size: dataUrl.length,
      type: file.type,
    };
  } catch (error) {
    reportError(error, { component: 'imageService', action: 'uploadImage' });
    throw error;
  }
}

/**
 * Handle paste event and extract image if present
 * @param {ClipboardEvent} event - Paste event
 * @returns {Promise<File|null>} Image file or null if no image
 */
export async function handlePasteEvent(event) {
  try {
    const items = event.clipboardData?.items;

    if (!items) {
      return null;
    }

    // Look for image in clipboard items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) {
          return blob;
        }
      }
    }

    return null;
  } catch (error) {
    reportError(error, { component: 'imageService', action: 'handlePasteEvent' });
    return null;
  }
}
