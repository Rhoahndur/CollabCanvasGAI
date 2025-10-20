/**
 * Canvas Tools for Canny AI Assistant
 * 
 * This module defines tools that Canny can use to manipulate the canvas,
 * including creating shapes, aligning objects, distributing elements, etc.
 */

import { SHAPE_TYPES, CANVAS_WIDTH, CANVAS_HEIGHT } from './constants';
import { constrainRectangle, constrainCircle, clamp } from './canvasUtils';

// Safety limits to prevent accidental mass creation
const MAX_SHAPES_PER_CALL = 50; // Maximum shapes to create in one tool call
const MAX_TOTAL_SHAPES = 1000;   // Maximum total shapes on canvas

// Canvas boundary enforcement
const CANVAS_MIN_X = 0;
const CANVAS_MAX_X = CANVAS_WIDTH;
const CANVAS_MIN_Y = 0;
const CANVAS_MAX_Y = CANVAS_HEIGHT;

/**
 * OpenAI Function Calling Tool Definitions
 * These define what Canny can do with the canvas
 */
export const canvasToolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'createShape',
      description: 'Create a new shape on the canvas (rectangle, circle, polygon, text, or custom polygon)',
      parameters: {
        type: 'object',
        properties: {
          shapeType: {
            type: 'string',
            enum: ['rectangle', 'circle', 'polygon', 'text', 'customPolygon'],
            description: 'Type of shape to create'
          },
          x: {
            type: 'number',
            description: 'X coordinate (canvas coordinates, default viewport center)'
          },
          y: {
            type: 'number',
            description: 'Y coordinate (canvas coordinates, default viewport center)'
          },
          width: {
            type: 'number',
            description: 'Width (for rectangles and text, default 100)'
          },
          height: {
            type: 'number',
            description: 'Height (for rectangles and text, default 100)'
          },
          radius: {
            type: 'number',
            description: 'Radius (for circles and polygons, default 50)'
          },
          color: {
            type: 'string',
            description: 'Fill color (hex code, e.g., "#FF5733")'
          },
          text: {
            type: 'string',
            description: 'Text content (for text shapes)'
          },
          count: {
            type: 'number',
            description: 'Number of shapes to create (default 1)'
          }
        },
        required: ['shapeType']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'createShapesBatch',
      description: 'Create multiple shapes at specific positions in a single call. Perfect for patterns, drawings, and arrangements. Example: To draw a circle outline using 12 small circles, calculate their positions around a center point using trigonometry (x = centerX + radius * cos(angle), y = centerY + radius * sin(angle)). You can see the canvas and calculate exact positions.',
      parameters: {
        type: 'object',
        properties: {
          shapes: {
            type: 'array',
            description: 'Array of shape definitions with specific positions',
            items: {
              type: 'object',
              properties: {
                shapeType: {
                  type: 'string',
                  enum: ['rectangle', 'circle', 'polygon', 'text', 'customPolygon'],
                  description: 'Type of shape'
                },
                x: {
                  type: 'number',
                  description: 'X coordinate (required for each shape)'
                },
                y: {
                  type: 'number',
                  description: 'Y coordinate (required for each shape)'
                },
                width: {
                  type: 'number',
                  description: 'Width (for rectangles and text)'
                },
                height: {
                  type: 'number',
                  description: 'Height (for rectangles and text)'
                },
                radius: {
                  type: 'number',
                  description: 'Radius (for circles and polygons)'
                },
                color: {
                  type: 'string',
                  description: 'Fill color (hex code)'
                },
                text: {
                  type: 'string',
                  description: 'Text content (for text shapes)'
                }
              },
              required: ['shapeType', 'x', 'y']
            }
          }
        },
        required: ['shapes']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'alignShapes',
      description: 'Align selected shapes or all shapes along a specified edge or center',
      parameters: {
        type: 'object',
        properties: {
          alignment: {
            type: 'string',
            enum: ['left', 'right', 'top', 'bottom', 'center-horizontal', 'center-vertical'],
            description: 'How to align the shapes'
          },
          useSelected: {
            type: 'boolean',
            description: 'If true, align only selected shapes. If false, align all shapes. Default true.'
          }
        },
        required: ['alignment']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'distributeShapes',
      description: 'Evenly distribute selected shapes or all shapes with equal spacing',
      parameters: {
        type: 'object',
        properties: {
          direction: {
            type: 'string',
            enum: ['horizontal', 'vertical'],
            description: 'Direction to distribute shapes'
          },
          spacing: {
            type: 'number',
            description: 'Space between shapes in pixels (optional, will auto-calculate if not provided)'
          },
          useSelected: {
            type: 'boolean',
            description: 'If true, distribute only selected shapes. If false, distribute all shapes. Default true.'
          }
        },
        required: ['direction']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'arrangeInGrid',
      description: 'Arrange shapes in a grid pattern',
      parameters: {
        type: 'object',
        properties: {
          rows: {
            type: 'number',
            description: 'Number of rows in the grid'
          },
          columns: {
            type: 'number',
            description: 'Number of columns in the grid'
          },
          spacing: {
            type: 'number',
            description: 'Space between shapes in pixels (default 20)'
          },
          useSelected: {
            type: 'boolean',
            description: 'If true, arrange only selected shapes. If false, arrange all shapes. Default true.'
          }
        },
        required: ['rows', 'columns']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'updateShapeProperties',
      description: 'Update properties (color, size, etc.) of selected shapes or all shapes',
      parameters: {
        type: 'object',
        properties: {
          color: {
            type: 'string',
            description: 'New fill color (hex code)'
          },
          width: {
            type: 'number',
            description: 'New width (for rectangles and text)'
          },
          height: {
            type: 'number',
            description: 'New height (for rectangles and text)'
          },
          radius: {
            type: 'number',
            description: 'New radius (for circles and polygons)'
          },
          rotation: {
            type: 'number',
            description: 'Rotation angle in degrees'
          },
          useSelected: {
            type: 'boolean',
            description: 'If true, update only selected shapes. If false, update all shapes. Default true.'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'deleteShapes',
      description: 'Delete selected shapes or all shapes from the canvas',
      parameters: {
        type: 'object',
        properties: {
          useSelected: {
            type: 'boolean',
            description: 'If true, delete only selected shapes. If false, delete all shapes. Default true.'
          },
          confirmation: {
            type: 'boolean',
            description: 'Set to true to confirm deletion. Required to prevent accidental deletions.'
          }
        },
        required: ['confirmation']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getCanvasInfo',
      description: 'Get information about the current canvas state (shape count, selected shapes, viewport, etc.)',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'selectShapes',
      description: 'Select shapes by type, color, or other criteria',
      parameters: {
        type: 'object',
        properties: {
          shapeType: {
            type: 'string',
            enum: ['rectangle', 'circle', 'polygon', 'text', 'customPolygon', 'image', 'all'],
            description: 'Type of shapes to select'
          },
          color: {
            type: 'string',
            description: 'Select shapes with this color (hex code)'
          }
        }
      }
    }
  }
];

/**
 * Execute a canvas tool function
 * 
 * @param {string} toolName - Name of the tool to execute
 * @param {object} args - Arguments for the tool
 * @param {object} context - Canvas context with operations and state
 * @returns {object} Result of the tool execution
 */
export function executeCanvasTool(toolName, args, context) {
  const {
    shapes,
    selectedShapeIds,
    createShape,
    updateShape,
    deleteShape,
    selectShape,
    deselectShape,
    viewport,
    canvasId,
    userId
  } = context;

  switch (toolName) {
    case 'createShape':
      return handleCreateShape(args, context);
    
    case 'createShapesBatch':
      return handleCreateShapesBatch(args, context);
    
    case 'alignShapes':
      return handleAlignShapes(args, context);
    
    case 'distributeShapes':
      return handleDistributeShapes(args, context);
    
    case 'arrangeInGrid':
      return handleArrangeInGrid(args, context);
    
    case 'updateShapeProperties':
      return handleUpdateShapeProperties(args, context);
    
    case 'deleteShapes':
      return handleDeleteShapes(args, context);
    
    case 'getCanvasInfo':
      return handleGetCanvasInfo(args, context);
    
    case 'selectShapes':
      return handleSelectShapes(args, context);
    
    default:
      return {
        success: false,
        message: `Unknown tool: ${toolName}`
      };
  }
}

/**
 * Create one or more shapes
 */
function handleCreateShape(args, context) {
  console.log('🛠️ handleCreateShape called with args:', args);
  console.log('📍 Context viewport:', context.viewport);
  console.log('👤 Context userId:', context.userId);
  
  const { createShape, viewport, userId, shapes } = context;
  const {
    shapeType,
    x = viewport.centerX,
    y = viewport.centerY,
    width = 100,
    height = 100,
    radius = 50,
    color = '#646cff',
    text = 'Text',
    count = 1
  } = args;
  
  console.log('📝 Shape params - type:', shapeType, 'text:', text, 'position:', {x, y});

  // Safety check: Limit shapes per call
  if (count > MAX_SHAPES_PER_CALL) {
    return {
      success: false,
      message: `Cannot create ${count} shapes. Maximum is ${MAX_SHAPES_PER_CALL} per request for safety. Try smaller batches!`
    };
  }

  // Safety check: Don't exceed total canvas limit
  const currentShapeCount = shapes?.length || 0;
  if (currentShapeCount + count > MAX_TOTAL_SHAPES) {
    return {
      success: false,
      message: `Cannot create ${count} shapes. Canvas has ${currentShapeCount} shapes and limit is ${MAX_TOTAL_SHAPES}. Please delete some shapes first.`
    };
  }

  const createdShapes = [];
  const spacing = 120; // Space between multiple shapes

  try {
    for (let i = 0; i < count; i++) {
      const offsetX = i * spacing;
      let finalX = x + offsetX;
      let finalY = y;

      // Apply canvas boundary constraints based on shape type
      if (shapeType === SHAPE_TYPES.RECTANGLE || shapeType === SHAPE_TYPES.TEXT) {
        const constrained = constrainRectangle(finalX, finalY, width, height, CANVAS_WIDTH, CANVAS_HEIGHT);
        finalX = constrained.x;
        finalY = constrained.y;
      } else if (shapeType === SHAPE_TYPES.CIRCLE || shapeType === SHAPE_TYPES.POLYGON) {
        const constrained = constrainCircle(finalX, finalY, radius, CANVAS_WIDTH, CANVAS_HEIGHT);
        finalX = constrained.x;
        finalY = constrained.y;
      } else if (shapeType === SHAPE_TYPES.CUSTOM_POLYGON) {
        // For custom polygons, just ensure the center point is within bounds
        finalX = clamp(finalX, 100, CANVAS_WIDTH - 100); // Leave margin for vertices
        finalY = clamp(finalY, 100, CANVAS_HEIGHT - 100);
      }

      const shapeData = {
        type: shapeType,
        x: finalX,
        y: finalY,
        color: color,
        createdBy: userId,
        timestamp: Date.now()
      };

      // Add type-specific properties
      if (shapeType === SHAPE_TYPES.RECTANGLE) {
        shapeData.width = width;
        shapeData.height = height;
      } else if (shapeType === SHAPE_TYPES.CIRCLE || shapeType === SHAPE_TYPES.POLYGON) {
        shapeData.radius = radius;
      } else if (shapeType === SHAPE_TYPES.TEXT) {
        shapeData.width = width;
        shapeData.height = height;
        shapeData.text = text;
        shapeData.fontSize = 16;
        shapeData.textColor = '#000000';
        // Don't set color property at all for text (no border by default)
        // Firebase doesn't allow undefined values
        console.log('📝 Creating text shape:', shapeData);
      }

      console.log('🎯 About to call createShape function with:', shapeData);
      console.log('🎯 createShape function is:', typeof createShape, createShape);
      const newShape = createShape(shapeData);
      console.log('✅ createShape returned:', newShape);
      if (newShape) {
        createdShapes.push(newShape);
      }
    }

    const result = {
      success: true,
      message: `Created ${createdShapes.length} ${shapeType}${createdShapes.length > 1 ? 's' : ''}`,
      data: { count: createdShapes.length, shapes: createdShapes }
    };
    
    console.log('🎉 handleCreateShape returning result:', result);
    return result;
  } catch (error) {
    return {
      success: false,
      message: `Failed to create shape: ${error.message}`
    };
  }
}

/**
 * Create multiple shapes with specific positions in batch
 */
function handleCreateShapesBatch(args, context) {
  const { createShape, userId, shapes: existingShapes } = context;
  const { shapes: shapesToCreate } = args;

  if (!shapesToCreate || shapesToCreate.length === 0) {
    return {
      success: false,
      message: 'No shapes provided in batch'
    };
  }

  // Safety check: Limit shapes per call
  if (shapesToCreate.length > MAX_SHAPES_PER_CALL) {
    return {
      success: false,
      message: `Cannot create ${shapesToCreate.length} shapes. Maximum is ${MAX_SHAPES_PER_CALL} per request for safety.`
    };
  }

  // Safety check: Don't exceed total canvas limit
  const currentShapeCount = existingShapes?.length || 0;
  if (currentShapeCount + shapesToCreate.length > MAX_TOTAL_SHAPES) {
    return {
      success: false,
      message: `Cannot create ${shapesToCreate.length} shapes. Canvas has ${currentShapeCount} shapes and limit is ${MAX_TOTAL_SHAPES}.`
    };
  }

  const createdShapes = [];
  const errors = [];

  try {
    shapesToCreate.forEach((shapeSpec, index) => {
      const {
        shapeType,
        x,
        y,
        width = 100,
        height = 100,
        radius = 50,
        color = '#646cff',
        text = 'Text'
      } = shapeSpec;

      let finalX = x;
      let finalY = y;

      // Apply canvas boundary constraints based on shape type
      if (shapeType === SHAPE_TYPES.RECTANGLE || shapeType === SHAPE_TYPES.TEXT) {
        const constrained = constrainRectangle(finalX, finalY, width, height, CANVAS_WIDTH, CANVAS_HEIGHT);
        finalX = constrained.x;
        finalY = constrained.y;
      } else if (shapeType === SHAPE_TYPES.CIRCLE || shapeType === SHAPE_TYPES.POLYGON) {
        const constrained = constrainCircle(finalX, finalY, radius, CANVAS_WIDTH, CANVAS_HEIGHT);
        finalX = constrained.x;
        finalY = constrained.y;
      } else if (shapeType === SHAPE_TYPES.CUSTOM_POLYGON) {
        finalX = clamp(finalX, 100, CANVAS_WIDTH - 100);
        finalY = clamp(finalY, 100, CANVAS_HEIGHT - 100);
      }

      const shapeData = {
        type: shapeType,
        x: finalX,
        y: finalY,
        color: color,
        createdBy: userId,
        timestamp: Date.now() + index // Unique timestamps
      };

      // Add type-specific properties
      if (shapeType === SHAPE_TYPES.RECTANGLE) {
        shapeData.width = width;
        shapeData.height = height;
      } else if (shapeType === SHAPE_TYPES.CIRCLE || shapeType === SHAPE_TYPES.POLYGON) {
        shapeData.radius = radius;
      } else if (shapeType === SHAPE_TYPES.TEXT) {
        shapeData.width = width;
        shapeData.height = height;
        shapeData.text = text;
        shapeData.fontSize = 16;
        shapeData.textColor = '#000000';
        // Don't set color property at all for text (no border by default)
        // Firebase doesn't allow undefined values
        console.log('📝 Creating text shape in batch:', shapeData);
      }

      try {
        const newShape = createShape(shapeData);
        console.log('✅ Created batch shape:', newShape?.id, 'at', finalX, finalY);
        if (newShape) {
          createdShapes.push(newShape);
        }
      } catch (error) {
        console.error('❌ Failed to create batch shape:', error);
        errors.push(`Shape ${index + 1}: ${error.message}`);
      }
    });

    const successCount = createdShapes.length;
    const failCount = errors.length;
    
    let message = `Created ${successCount} shape${successCount !== 1 ? 's' : ''}`;
    if (failCount > 0) {
      message += ` (${failCount} failed: ${errors.join(', ')})`;
    }

    return {
      success: successCount > 0,
      message,
      data: { 
        created: successCount,
        failed: failCount,
        shapes: createdShapes 
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to create shapes batch: ${error.message}`
    };
  }
}

/**
 * Align shapes
 */
function handleAlignShapes(args, context) {
  const { shapes, selectedShapeIds, updateShape } = context;
  const { alignment, useSelected = true } = args;

  const shapesToAlign = useSelected && selectedShapeIds.length > 0
    ? shapes.filter(s => selectedShapeIds.includes(s.id))
    : shapes;

  if (shapesToAlign.length === 0) {
    return {
      success: false,
      message: 'No shapes to align'
    };
  }

  try {
    // Calculate bounds of all shapes
    const bounds = calculateShapesBounds(shapesToAlign);

    shapesToAlign.forEach(shape => {
      const updates = {};
      const shapeBounds = getShapeBounds(shape);

      switch (alignment) {
        case 'left':
          updates.x = bounds.minX + (shapeBounds.width / 2);
          break;
        case 'right':
          updates.x = bounds.maxX - (shapeBounds.width / 2);
          break;
        case 'top':
          updates.y = bounds.minY + (shapeBounds.height / 2);
          break;
        case 'bottom':
          updates.y = bounds.maxY - (shapeBounds.height / 2);
          break;
        case 'center-horizontal':
          updates.x = bounds.centerX;
          break;
        case 'center-vertical':
          updates.y = bounds.centerY;
          break;
      }

      if (Object.keys(updates).length > 0) {
        // Apply boundary constraints
        const newX = updates.x !== undefined ? updates.x : shape.x;
        const newY = updates.y !== undefined ? updates.y : shape.y;
        
        if (shape.type === SHAPE_TYPES.RECTANGLE || shape.type === SHAPE_TYPES.TEXT) {
          const constrained = constrainRectangle(
            newX, newY, 
            shape.width || 100, 
            shape.height || 100, 
            CANVAS_WIDTH, 
            CANVAS_HEIGHT
          );
          updates.x = constrained.x;
          updates.y = constrained.y;
        } else if (shape.type === SHAPE_TYPES.CIRCLE || shape.type === SHAPE_TYPES.POLYGON) {
          const constrained = constrainCircle(
            newX, newY, 
            shape.radius || 50, 
            CANVAS_WIDTH, 
            CANVAS_HEIGHT
          );
          updates.x = constrained.x;
          updates.y = constrained.y;
        } else {
          if (updates.x !== undefined) updates.x = clamp(updates.x, 0, CANVAS_WIDTH);
          if (updates.y !== undefined) updates.y = clamp(updates.y, 0, CANVAS_HEIGHT);
        }
        
        updateShape(shape.id, updates);
      }
    });

    return {
      success: true,
      message: `Aligned ${shapesToAlign.length} shape${shapesToAlign.length > 1 ? 's' : ''} to ${alignment}`,
      data: { count: shapesToAlign.length }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to align shapes: ${error.message}`
    };
  }
}

/**
 * Distribute shapes evenly
 */
function handleDistributeShapes(args, context) {
  const { shapes, selectedShapeIds, updateShape } = context;
  const { direction, spacing, useSelected = true } = args;

  const shapesToDistribute = useSelected && selectedShapeIds.length > 0
    ? shapes.filter(s => selectedShapeIds.includes(s.id))
    : shapes;

  if (shapesToDistribute.length < 2) {
    return {
      success: false,
      message: 'Need at least 2 shapes to distribute'
    };
  }

  try {
    // Sort shapes by position
    const sorted = [...shapesToDistribute].sort((a, b) => {
      return direction === 'horizontal' ? a.x - b.x : a.y - b.y;
    });

    const bounds = calculateShapesBounds(sorted);
    const totalSpace = direction === 'horizontal'
      ? bounds.maxX - bounds.minX
      : bounds.maxY - bounds.minY;

    const gapSize = spacing || (totalSpace / (sorted.length - 1));

    sorted.forEach((shape, index) => {
      if (index === 0) return; // Keep first shape in place

      const updates = {};
      if (direction === 'horizontal') {
        const firstShapeBounds = getShapeBounds(sorted[0]);
        updates.x = firstShapeBounds.centerX + (gapSize * index);
      } else {
        const firstShapeBounds = getShapeBounds(sorted[0]);
        updates.y = firstShapeBounds.centerY + (gapSize * index);
      }

      // Apply boundary constraints
      const newX = updates.x !== undefined ? updates.x : shape.x;
      const newY = updates.y !== undefined ? updates.y : shape.y;
      
      if (shape.type === SHAPE_TYPES.RECTANGLE || shape.type === SHAPE_TYPES.TEXT) {
        const constrained = constrainRectangle(
          newX, newY, 
          shape.width || 100, 
          shape.height || 100, 
          CANVAS_WIDTH, 
          CANVAS_HEIGHT
        );
        updates.x = constrained.x;
        updates.y = constrained.y;
      } else if (shape.type === SHAPE_TYPES.CIRCLE || shape.type === SHAPE_TYPES.POLYGON) {
        const constrained = constrainCircle(
          newX, newY, 
          shape.radius || 50, 
          CANVAS_WIDTH, 
          CANVAS_HEIGHT
        );
        updates.x = constrained.x;
        updates.y = constrained.y;
      } else {
        if (updates.x !== undefined) updates.x = clamp(updates.x, 0, CANVAS_WIDTH);
        if (updates.y !== undefined) updates.y = clamp(updates.y, 0, CANVAS_HEIGHT);
      }

      updateShape(shape.id, updates);
    });

    return {
      success: true,
      message: `Distributed ${sorted.length} shapes ${direction}ly`,
      data: { count: sorted.length, direction }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to distribute shapes: ${error.message}`
    };
  }
}

/**
 * Arrange shapes in a grid
 */
function handleArrangeInGrid(args, context) {
  const { shapes, selectedShapeIds, updateShape, viewport } = context;
  const { rows, columns, spacing = 20, useSelected = true } = args;

  const shapesToArrange = useSelected && selectedShapeIds.length > 0
    ? shapes.filter(s => selectedShapeIds.includes(s.id))
    : shapes;

  if (shapesToArrange.length === 0) {
    return {
      success: false,
      message: 'No shapes to arrange'
    };
  }

  try {
    let startX = viewport.centerX - ((columns - 1) * spacing / 2);
    let startY = viewport.centerY - ((rows - 1) * spacing / 2);

    // Ensure the grid stays within canvas boundaries
    const gridWidth = (columns - 1) * spacing + 100; // +100 for shape size estimate
    const gridHeight = (rows - 1) * spacing + 100;
    
    // Adjust start position if grid would extend beyond canvas
    if (startX < 100) startX = 100;
    if (startY < 100) startY = 100;
    if (startX + gridWidth > CANVAS_WIDTH - 100) startX = CANVAS_WIDTH - gridWidth - 100;
    if (startY + gridHeight > CANVAS_HEIGHT - 100) startY = CANVAS_HEIGHT - gridHeight - 100;

    shapesToArrange.forEach((shape, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;

      if (row >= rows) return; // Skip extra shapes

      let posX = startX + (col * spacing);
      let posY = startY + (row * spacing);
      
      // Apply per-shape boundary constraints
      if (shape.type === SHAPE_TYPES.RECTANGLE || shape.type === SHAPE_TYPES.TEXT) {
        const constrained = constrainRectangle(
          posX, posY, 
          shape.width || 100, 
          shape.height || 100, 
          CANVAS_WIDTH, 
          CANVAS_HEIGHT
        );
        posX = constrained.x;
        posY = constrained.y;
      } else if (shape.type === SHAPE_TYPES.CIRCLE || shape.type === SHAPE_TYPES.POLYGON) {
        const constrained = constrainCircle(
          posX, posY, 
          shape.radius || 50, 
          CANVAS_WIDTH, 
          CANVAS_HEIGHT
        );
        posX = constrained.x;
        posY = constrained.y;
      } else {
        posX = clamp(posX, 0, CANVAS_WIDTH);
        posY = clamp(posY, 0, CANVAS_HEIGHT);
      }

      updateShape(shape.id, { x: posX, y: posY });
    });

    const arranged = Math.min(shapesToArrange.length, rows * columns);

    return {
      success: true,
      message: `Arranged ${arranged} shapes in a ${rows}x${columns} grid`,
      data: { count: arranged, rows, columns }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to arrange in grid: ${error.message}`
    };
  }
}

/**
 * Update shape properties
 */
function handleUpdateShapeProperties(args, context) {
  const { shapes, selectedShapeIds, updateShape } = context;
  const { useSelected = true, ...properties } = args;

  const shapesToUpdate = useSelected && selectedShapeIds.length > 0
    ? shapes.filter(s => selectedShapeIds.includes(s.id))
    : shapes;

  if (shapesToUpdate.length === 0) {
    return {
      success: false,
      message: 'No shapes to update'
    };
  }

  try {
    shapesToUpdate.forEach(shape => {
      // Apply boundary constraints if updating position
      const constrainedProperties = { ...properties };
      
      if ('x' in properties || 'y' in properties) {
        const newX = properties.x !== undefined ? properties.x : shape.x;
        const newY = properties.y !== undefined ? properties.y : shape.y;
        
        // Apply constraints based on shape type
        if (shape.type === SHAPE_TYPES.RECTANGLE || shape.type === SHAPE_TYPES.TEXT) {
          const constrained = constrainRectangle(
            newX, newY, 
            shape.width || 100, 
            shape.height || 100, 
            CANVAS_WIDTH, 
            CANVAS_HEIGHT
          );
          constrainedProperties.x = constrained.x;
          constrainedProperties.y = constrained.y;
        } else if (shape.type === SHAPE_TYPES.CIRCLE || shape.type === SHAPE_TYPES.POLYGON) {
          const constrained = constrainCircle(
            newX, newY, 
            shape.radius || 50, 
            CANVAS_WIDTH, 
            CANVAS_HEIGHT
          );
          constrainedProperties.x = constrained.x;
          constrainedProperties.y = constrained.y;
        } else {
          // For other types, just clamp to canvas bounds
          constrainedProperties.x = clamp(newX, 0, CANVAS_WIDTH);
          constrainedProperties.y = clamp(newY, 0, CANVAS_HEIGHT);
        }
      }
      
      updateShape(shape.id, constrainedProperties);
    });

    return {
      success: true,
      message: `Updated ${shapesToUpdate.length} shape${shapesToUpdate.length > 1 ? 's' : ''}`,
      data: { count: shapesToUpdate.length, properties }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to update shapes: ${error.message}`
    };
  }
}

/**
 * Delete shapes
 */
function handleDeleteShapes(args, context) {
  const { shapes, selectedShapeIds, deleteShape } = context;
  const { useSelected = true, confirmation } = args;

  if (!confirmation) {
    return {
      success: false,
      message: 'Deletion requires confirmation. Please confirm you want to delete shapes.'
    };
  }

  const shapesToDelete = useSelected && selectedShapeIds.length > 0
    ? shapes.filter(s => selectedShapeIds.includes(s.id))
    : shapes;

  if (shapesToDelete.length === 0) {
    return {
      success: false,
      message: 'No shapes to delete'
    };
  }

  try {
    shapesToDelete.forEach(shape => {
      deleteShape(shape.id);
    });

    return {
      success: true,
      message: `Deleted ${shapesToDelete.length} shape${shapesToDelete.length > 1 ? 's' : ''}`,
      data: { count: shapesToDelete.length }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to delete shapes: ${error.message}`
    };
  }
}

/**
 * Get canvas information
 */
function handleGetCanvasInfo(args, context) {
  const { shapes, selectedShapeIds, viewport } = context;

  const shapesByType = shapes.reduce((acc, shape) => {
    acc[shape.type] = (acc[shape.type] || 0) + 1;
    return acc;
  }, {});

  return {
    success: true,
    message: 'Canvas information retrieved',
    data: {
      totalShapes: shapes.length,
      selectedShapes: selectedShapeIds.length,
      shapesByType,
      viewport: {
        zoom: viewport.zoom,
        offsetX: viewport.offsetX,
        offsetY: viewport.offsetY
      }
    }
  };
}

/**
 * Select shapes by criteria
 */
function handleSelectShapes(args, context) {
  const { shapes, selectShape, deselectShape } = context;
  const { shapeType, color } = args;

  // First deselect all
  shapes.forEach(shape => deselectShape(shape.id));

  // Select matching shapes
  const matchingShapes = shapes.filter(shape => {
    if (shapeType && shapeType !== 'all' && shape.type !== shapeType) return false;
    if (color && shape.color !== color) return false;
    return true;
  });

  matchingShapes.forEach(shape => selectShape(shape.id));

  return {
    success: true,
    message: `Selected ${matchingShapes.length} shape${matchingShapes.length !== 1 ? 's' : ''}`,
    data: { count: matchingShapes.length }
  };
}

/**
 * Helper: Calculate bounds of multiple shapes
 */
function calculateShapesBounds(shapes) {
  if (shapes.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0, centerX: 0, centerY: 0 };

  const bounds = shapes.reduce((acc, shape) => {
    const shapeBounds = getShapeBounds(shape);
    return {
      minX: Math.min(acc.minX, shapeBounds.minX),
      maxX: Math.max(acc.maxX, shapeBounds.maxX),
      minY: Math.min(acc.minY, shapeBounds.minY),
      maxY: Math.max(acc.maxY, shapeBounds.maxY)
    };
  }, {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity
  });

  bounds.centerX = (bounds.minX + bounds.maxX) / 2;
  bounds.centerY = (bounds.minY + bounds.maxY) / 2;

  return bounds;
}

/**
 * Helper: Get bounds of a single shape
 */
function getShapeBounds(shape) {
  let minX, maxX, minY, maxY, centerX, centerY, width, height;

  if (shape.type === SHAPE_TYPES.RECTANGLE || shape.type === SHAPE_TYPES.TEXT) {
    centerX = shape.x;
    centerY = shape.y;
    width = shape.width || 100;
    height = shape.height || 100;
    minX = centerX - width / 2;
    maxX = centerX + width / 2;
    minY = centerY - height / 2;
    maxY = centerY + height / 2;
  } else if (shape.type === SHAPE_TYPES.CIRCLE || shape.type === SHAPE_TYPES.POLYGON) {
    centerX = shape.x;
    centerY = shape.y;
    const r = shape.radius || 50;
    width = r * 2;
    height = r * 2;
    minX = centerX - r;
    maxX = centerX + r;
    minY = centerY - r;
    maxY = centerY + r;
  } else if (shape.type === SHAPE_TYPES.CUSTOM_POLYGON && shape.vertices) {
    const xCoords = shape.vertices.map(v => v.x);
    const yCoords = shape.vertices.map(v => v.y);
    minX = Math.min(...xCoords);
    maxX = Math.max(...xCoords);
    minY = Math.min(...yCoords);
    maxY = Math.max(...yCoords);
    centerX = (minX + maxX) / 2;
    centerY = (minY + maxY) / 2;
    width = maxX - minX;
    height = maxY - minY;
  } else if (shape.type === SHAPE_TYPES.IMAGE) {
    centerX = shape.x;
    centerY = shape.y;
    width = shape.width || 100;
    height = shape.height || 100;
    minX = centerX - width / 2;
    maxX = centerX + width / 2;
    minY = centerY - height / 2;
    maxY = centerY + height / 2;
  } else {
    // Default/fallback
    centerX = shape.x || 0;
    centerY = shape.y || 0;
    width = 100;
    height = 100;
    minX = centerX - 50;
    maxX = centerX + 50;
    minY = centerY - 50;
    maxY = centerY + 50;
  }

  return { minX, maxX, minY, maxY, centerX, centerY, width, height };
}

