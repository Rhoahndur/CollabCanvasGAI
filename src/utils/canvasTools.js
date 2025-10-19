/**
 * Canvas Tools for Canny AI Assistant
 * 
 * This module defines tools that Canny can use to manipulate the canvas,
 * including creating shapes, aligning objects, distributing elements, etc.
 */

import { SHAPE_TYPES } from './constants';

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
  const { createShape, viewport, userId } = context;
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

  const createdShapes = [];
  const spacing = 120; // Space between multiple shapes

  try {
    for (let i = 0; i < count; i++) {
      const offsetX = i * spacing;
      const shapeData = {
        type: shapeType,
        x: x + offsetX,
        y: y,
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
      }

      const newShape = createShape(shapeData);
      if (newShape) {
        createdShapes.push(newShape);
      }
    }

    return {
      success: true,
      message: `Created ${count} ${shapeType}${count > 1 ? 's' : ''}`,
      data: { count: createdShapes.length, shapes: createdShapes }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to create shape: ${error.message}`
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
    const startX = viewport.centerX - ((columns - 1) * spacing / 2);
    const startY = viewport.centerY - ((rows - 1) * spacing / 2);

    shapesToArrange.forEach((shape, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;

      if (row >= rows) return; // Skip extra shapes

      updateShape(shape.id, {
        x: startX + (col * spacing),
        y: startY + (row * spacing)
      });
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
      updateShape(shape.id, properties);
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

