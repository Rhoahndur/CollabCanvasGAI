/**
 * Image Service - Image processing for canvas uploads
 * Converts images to base64 data URLs and stores directly in Realtime Database
 * No Firebase Storage needed - completely free!
 */

/**
 * Convert image file to base64 data URL with optional resizing
 * @param {File|Blob} file - Image file or blob to convert
 * @param {number} maxWidth - Maximum width (default: 800)
 * @param {number} maxHeight - Maximum height (default: 800)
 * @returns {Promise<{dataUrl: string, width: number, height: number}>} Base64 data URL and dimensions
 */
export async function convertImageToDataUrl(file, maxWidth = 800, maxHeight = 800) {
  try {
    // Validate file is an image
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Limit file size to 2MB (before compression)
    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_SIZE) {
      throw new Error('Image must be smaller than 2MB');
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
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8); // 80% quality JPEG
          
          console.log(`✅ Image converted: ${img.width}x${img.height} → ${width}x${height}`);
          console.log(`   Data URL size: ${(dataUrl.length / 1024).toFixed(1)}KB`);
          
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
    console.error('❌ Error converting image:', error);
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
    console.log('📤 Converting image to base64:', file.name);
    
    // Convert to base64 with resizing
    const { dataUrl, width, height } = await convertImageToDataUrl(file);
    
    console.log('✅ Image converted to base64');
    
    return {
      url: dataUrl, // Return data URL directly
      width,
      height,
      size: dataUrl.length,
      type: file.type,
    };
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    throw error;
  }
}

/**
 * Delete an image (no-op since images are stored as data URLs in DB)
 * Kept for compatibility with existing delete logic
 * @param {string} path - Unused
 * @returns {Promise<void>}
 */
export async function deleteImage(path) {
  // No-op: images are stored as base64 data URLs directly in the database
  // They're deleted automatically when the shape is deleted
  console.log('ℹ️ Image cleanup not needed (stored as data URL)');
}

/**
 * Convert a clipboard item to a file
 * @param {ClipboardItem} item - Clipboard item
 * @returns {Promise<File|null>} File or null if not an image
 */
export async function clipboardItemToFile(item) {
  try {
    // Get image types from clipboard item
    const imageTypes = item.types.filter(type => type.startsWith('image/'));
    
    if (imageTypes.length === 0) {
      return null;
    }
    
    // Get the first image type
    const imageType = imageTypes[0];
    const blob = await item.getType(imageType);
    
    // Convert blob to File
    const filename = `pasted-image-${Date.now()}.${imageType.split('/')[1]}`;
    const file = new File([blob], filename, { type: imageType });
    
    return file;
  } catch (error) {
    console.error('Error converting clipboard item to file:', error);
    return null;
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
    console.error('Error handling paste event:', error);
    return null;
  }
}

