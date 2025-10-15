/**
 * Test Data Generator
 * Utility functions for generating test data for performance testing
 */

import { createRectangle } from '../services/canvasService';
import { DEFAULT_CANVAS_ID, CANVAS_WIDTH, CANVAS_HEIGHT } from './constants';

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
 * Generate random rectangle properties
 */
function generateRandomRectangle(userId, padding = 100) {
  const minSize = 30;
  const maxSize = 200;
  
  const width = randomInt(minSize, maxSize);
  const height = randomInt(minSize, maxSize);
  
  const x = randomInt(padding, CANVAS_WIDTH - width - padding);
  const y = randomInt(padding, CANVAS_HEIGHT - height - padding);
  
  return {
    x,
    y,
    width,
    height,
    color: randomColor(),
    createdBy: userId,
  };
}

/**
 * Generate and create N rectangles on the canvas
 * @param {number} count - Number of rectangles to create
 * @param {string} userId - User ID for created rectangles
 * @param {string} canvasId - Canvas ID (optional)
 * @param {boolean} batch - Whether to batch the operations (default: true)
 * @returns {Promise<void>}
 */
export async function generateTestRectangles(count, userId, canvasId = DEFAULT_CANVAS_ID, batch = true) {
  console.log(`🔧 Generating ${count} test rectangles...`);
  const startTime = performance.now();
  
  try {
    if (batch) {
      // Create rectangles in batches of 10 to avoid overwhelming Firestore
      const batchSize = 10;
      const batches = Math.ceil(count / batchSize);
      
      for (let i = 0; i < batches; i++) {
        const batchPromises = [];
        const currentBatchSize = Math.min(batchSize, count - (i * batchSize));
        
        for (let j = 0; j < currentBatchSize; j++) {
          const rectData = generateRandomRectangle(userId);
          batchPromises.push(createRectangle(canvasId, rectData));
        }
        
        await Promise.all(batchPromises);
        console.log(`  ✓ Created batch ${i + 1}/${batches} (${(i + 1) * batchSize} rectangles)`);
        
        // Small delay between batches to avoid rate limiting
        if (i < batches - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } else {
      // Create rectangles sequentially
      for (let i = 0; i < count; i++) {
        const rectData = generateRandomRectangle(userId);
        await createRectangle(canvasId, rectData);
        
        if ((i + 1) % 50 === 0) {
          console.log(`  ✓ Created ${i + 1}/${count} rectangles`);
        }
      }
    }
    
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    console.log(`✅ Successfully created ${count} rectangles in ${duration}ms`);
    console.log(`   Average: ${(duration / count).toFixed(2)}ms per rectangle`);
  } catch (error) {
    console.error('❌ Error generating test rectangles:', error);
    throw error;
  }
}

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
 * Quick test function to generate 500 rectangles
 * Can be called from browser console: window.testCanvas.generate500()
 */
export function setup500Test(userId) {
  window.testCanvas = {
    generate500: () => generateTestRectangles(500, userId),
    generate1000: () => generateTestRectangles(1000, userId),
    generateGrid: (rows, cols) => generateGridRectangles(rows, cols, userId),
  };
  
  console.log('🧪 Test functions available:');
  console.log('  - window.testCanvas.generate500() - Generate 500 random rectangles');
  console.log('  - window.testCanvas.generate1000() - Generate 1000 random rectangles');
  console.log('  - window.testCanvas.generateGrid(rows, cols) - Generate grid of rectangles');
}

