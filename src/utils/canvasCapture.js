/**
 * Canvas Capture Utility
 * 
 * Converts the SVG canvas to a PNG image for sending to GPT-4 Vision
 */

/**
 * Capture the current viewport of the canvas as a base64 PNG image
 * 
 * @param {SVGElement} svgElement - The SVG element to capture
 * @param {Object} options - Capture options
 * @param {number} options.maxWidth - Maximum width of captured image (default 1024)
 * @param {number} options.maxHeight - Maximum height of captured image (default 768)
 * @returns {Promise<string>} Base64 encoded PNG image
 */
export async function captureCanvasImage(svgElement, options = {}) {
  const {
    maxWidth = 1024,
    maxHeight = 768
  } = options;

  if (!svgElement) {
    throw new Error('SVG element is required for canvas capture');
  }

  try {
    // Get SVG dimensions
    const svgRect = svgElement.getBoundingClientRect();
    
    // Calculate scaled dimensions (maintain aspect ratio)
    let width = svgRect.width;
    let height = svgRect.height;
    
    if (width > maxWidth || height > maxHeight) {
      const scale = Math.min(maxWidth / width, maxHeight / height);
      width = Math.floor(width * scale);
      height = Math.floor(height * scale);
    }

    // Clone the SVG to avoid modifying the original
    const svgClone = svgElement.cloneNode(true);
    
    // Get the SVG as XML string
    const svgData = new XMLSerializer().serializeToString(svgClone);
    
    // Create a blob from SVG data
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    // Create an image element
    const img = new Image();
    
    // Wait for image to load
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });

    // Create canvas element
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    
    // Fill with white background (so transparent areas are visible)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    
    // Draw the image onto canvas
    ctx.drawImage(img, 0, 0, width, height);
    
    // Clean up
    URL.revokeObjectURL(url);
    
    // Convert canvas to base64 PNG
    const base64Image = canvas.toDataURL('image/png');
    
    return base64Image;
  } catch (error) {
    console.error('Failed to capture canvas:', error);
    throw error;
  }
}

/**
 * Keywords that suggest the user wants Canny to see the canvas
 * Used to auto-detect when vision would be helpful
 */
const VISION_KEYWORDS = [
  // Demonstrative pronouns (referring to existing things)
  'this', 'that', 'these', 'those',
  
  // Spatial relationships
  'around', 'near', 'next to', 'beside', 'between', 'above', 'below',
  'left of', 'right of', 'top of', 'bottom of', 'inside', 'outside',
  
  // Reference to existing state
  'existing', 'current', 'already', 'there',
  
  // Visual relationships
  'match', 'complement', 'similar to', 'like the', 'same as',
  'opposite', 'mirror', 'symmetric',
  
  // Spatial analysis
  'empty space', 'gap', 'fill', 'between the',
  
  // Visual queries
  'what color', 'how many', 'where is', 'where are',
  'what\'s', 'which', 'show me',
  
  // Layout references
  'pattern', 'design', 'layout', 'arrangement',
  
  // Color references
  'blue', 'red', 'green', 'yellow', 'purple', 'orange',
  'pink', 'brown', 'gray', 'black', 'white',
  
  // Shape references that might refer to existing shapes
  'circle', 'rectangle', 'square', 'shape',
];

/**
 * Detect if a user message suggests they want Canny to see the canvas
 * 
 * @param {string} message - The user's message
 * @returns {boolean} True if vision should be used
 */
export function shouldUseVision(message) {
  if (!message || typeof message !== 'string') {
    return false;
  }

  const lowerMessage = message.toLowerCase();
  
  // Check for vision keywords
  const hasVisionKeyword = VISION_KEYWORDS.some(keyword => 
    lowerMessage.includes(keyword.toLowerCase())
  );
  
  // Additional heuristics:
  
  // 1. Questions about the canvas state
  const isQuestion = lowerMessage.includes('?') && (
    lowerMessage.includes('what') ||
    lowerMessage.includes('where') ||
    lowerMessage.includes('how') ||
    lowerMessage.includes('which')
  );
  
  // 2. Commands with spatial context
  const hasSpatialCommand = (
    (lowerMessage.includes('create') || lowerMessage.includes('add') || lowerMessage.includes('draw')) &&
    (lowerMessage.includes('around') || lowerMessage.includes('near') || lowerMessage.includes('next to'))
  );
  
  // 3. Reference to visual arrangement
  const hasVisualArrangement = (
    lowerMessage.includes('arrange') || 
    lowerMessage.includes('organize') ||
    lowerMessage.includes('layout')
  ) && hasVisionKeyword;
  
  return hasVisionKeyword || isQuestion || hasSpatialCommand || hasVisualArrangement;
}

/**
 * Get a description of why vision is being used (for UI feedback)
 * 
 * @param {string} message - The user's message
 * @returns {string} Reason for using vision
 */
export function getVisionReason(message) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('what') || lowerMessage.includes('how many')) {
    return 'Analyzing canvas to answer your question';
  }
  
  if (lowerMessage.includes('around') || lowerMessage.includes('near')) {
    return 'Understanding spatial relationships';
  }
  
  if (lowerMessage.includes('match') || lowerMessage.includes('complement')) {
    return 'Analyzing visual design';
  }
  
  if (lowerMessage.includes('existing') || lowerMessage.includes('current')) {
    return 'Examining current canvas state';
  }
  
  return 'Looking at the canvas';
}

