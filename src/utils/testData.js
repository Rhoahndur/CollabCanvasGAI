/**
 * Test Data Generator
 * Utility functions for generating test data for performance testing
 */

import { createShape } from '../services/canvasService';
import { DEFAULT_CANVAS_ID, CANVAS_WIDTH, CANVAS_HEIGHT, SHAPE_TYPES, DEFAULT_POLYGON_SIDES } from './constants';

/**
 * Color palette for test rectangles
 */
const TEST_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#FFA07A',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E2',
];

/**
 * Generate a random integer between min and max (inclusive)
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a random color from the test palette
 */
function randomColor() {
  return TEST_COLORS[randomInt(0, TEST_COLORS.length - 1)];
}

/**
 * Generate random shape properties (rectangle, circle, or polygon)
 */
function generateRandomShape(userId, padding = 100) {
  const shapeTypes = [SHAPE_TYPES.RECTANGLE, SHAPE_TYPES.CIRCLE, SHAPE_TYPES.POLYGON];
  const shapeType = shapeTypes[randomInt(0, shapeTypes.length - 1)];
  
  const minSize = 30;
  const maxSize = 150;
  
  const baseShape = {
    type: shapeType,
    color: randomColor(),
    createdBy: userId,
    rotation: randomInt(0, 359),
  };
  
  if (shapeType === SHAPE_TYPES.RECTANGLE) {
    const width = randomInt(minSize, maxSize);
    const height = randomInt(minSize, maxSize);
    const x = randomInt(padding, CANVAS_WIDTH - width - padding);
    const y = randomInt(padding, CANVAS_HEIGHT - height - padding);
    
    return {
      ...baseShape,
      x,
      y,
      width,
      height,
    };
  } else if (shapeType === SHAPE_TYPES.CIRCLE) {
    const radius = randomInt(minSize / 2, maxSize / 2);
    const x = randomInt(padding + radius, CANVAS_WIDTH - radius - padding);
    const y = randomInt(padding + radius, CANVAS_HEIGHT - radius - padding);
    
    return {
      ...baseShape,
      x,
      y,
      radius,
    };
  } else if (shapeType === SHAPE_TYPES.POLYGON) {
    const radius = randomInt(minSize / 2, maxSize / 2);
    const sides = [3, 4, 5, 6, 8][randomInt(0, 4)]; // Triangle, square, pentagon, hexagon, or octagon
    const x = randomInt(padding + radius, CANVAS_WIDTH - radius - padding);
    const y = randomInt(padding + radius, CANVAS_HEIGHT - radius - padding);
    
    return {
      ...baseShape,
      x,
      y,
      radius,
      sides,
    };
  }
}

/**
 * Generate random rectangle properties (legacy function for backward compatibility)
 */
function generateRandomRectangle(userId, padding = 100) {
  const minSize = 30;
  const maxSize = 200;
  
  const width = randomInt(minSize, maxSize);
  const height = randomInt(minSize, maxSize);
  
  const x = randomInt(padding, CANVAS_WIDTH - width - padding);
  const y = randomInt(padding, CANVAS_HEIGHT - height - padding);
  
  return {
    type: SHAPE_TYPES.RECTANGLE,
    x,
    y,
    width,
    height,
    color: randomColor(),
    createdBy: userId,
    rotation: 0,
  };
}

/**
 * Generate and create N random shapes on the canvas
 * @param {number} count - Number of shapes to create
 * @param {string} userId - User ID for created shapes
 * @param {string} canvasId - Canvas ID (optional)
 * @param {boolean} batch - Whether to batch the operations (default: true)
 * @returns {Promise<void>}
 */
export async function generateTestShapes(count, userId, canvasId = DEFAULT_CANVAS_ID, batch = true) {
  console.log(`🔧 Generating ${count} test shapes...`);
  const startTime = performance.now();
  
  try {
    if (batch) {
      // Create shapes in batches of 10 to avoid overwhelming Firestore
      const batchSize = 10;
      const batches = Math.ceil(count / batchSize);
      
      for (let i = 0; i < batches; i++) {
        const batchPromises = [];
        const currentBatchSize = Math.min(batchSize, count - (i * batchSize));
        
        for (let j = 0; j < currentBatchSize; j++) {
          const shapeData = generateRandomShape(userId);
          batchPromises.push(createShape(canvasId, shapeData));
        }
        
        await Promise.all(batchPromises);
        console.log(`  ✓ Created batch ${i + 1}/${batches} (${(i + 1) * batchSize} shapes)`);
        
        // Small delay between batches to avoid rate limiting
        if (i < batches - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } else {
      // Create shapes sequentially
      for (let i = 0; i < count; i++) {
        const shapeData = generateRandomShape(userId);
        await createShape(canvasId, shapeData);
        
        if ((i + 1) % 50 === 0) {
          console.log(`  ✓ Created ${i + 1}/${count} shapes`);
        }
      }
    }
    
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    console.log(`✅ Successfully created ${count} shapes in ${duration}ms`);
    console.log(`   Average: ${(duration / count).toFixed(2)}ms per shape`);
  } catch (error) {
    console.error('❌ Error generating test shapes:', error);
    throw error;
  }
}

/**
 * Legacy function name for backward compatibility
 */
export const generateTestRectangles = generateTestShapes;

/**
 * Generate test rectangles in a grid pattern
 * Useful for testing rendering performance with organized layouts
 */
export async function generateGridRectangles(rows, cols, userId, canvasId = DEFAULT_CANVAS_ID) {
  console.log(`🔧 Generating ${rows}x${cols} grid of rectangles...`);
  const startTime = performance.now();
  
  const rectWidth = 80;
  const rectHeight = 60;
  const spacing = 20;
  const startX = 100;
  const startY = 100;
  
  try {
    const promises = [];
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const rectData = {
          x: startX + col * (rectWidth + spacing),
          y: startY + row * (rectHeight + spacing),
          width: rectWidth,
          height: rectHeight,
          color: randomColor(),
          createdBy: userId,
        };
        
        promises.push(createRectangle(canvasId, rectData));
        
        // Process in batches of 10
        if (promises.length === 10) {
          await Promise.all(promises);
          promises.length = 0;
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
    
    // Process remaining
    if (promises.length > 0) {
      await Promise.all(promises);
    }
    
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    const total = rows * cols;
    
    console.log(`✅ Successfully created ${total} rectangles in grid pattern in ${duration}ms`);
  } catch (error) {
    console.error('❌ Error generating grid rectangles:', error);
    throw error;
  }
}

/**
 * Quick test function to generate shapes
 * Can be called from browser console: window.testCanvas.generate500()
 */
export function setup500Test(userId) {
  window.testCanvas = {
    generate500: () => generateTestShapes(500, userId),
    generate1000: () => generateTestShapes(1000, userId),
    generateGrid: (rows, cols) => generateGridRectangles(rows, cols, userId),
  };
  
  console.log('🧪 Test functions available:');
  console.log('  - window.testCanvas.generate500() - Generate 500 random shapes');
  console.log('  - window.testCanvas.generate1000() - Generate 1000 random shapes');
  console.log('  - window.testCanvas.generateGrid(rows, cols) - Generate grid of rectangles');
}

