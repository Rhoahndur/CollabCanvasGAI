import { getShapeBounds } from '../utils/canvasUtils';

/**
 * MultiSelectionBox — Renders the orange bounding box and corner handles
 * for multi-selected shapes.
 */
export default function MultiSelectionBox({ selectedShapeIds, shapes, zoom }) {
  // Calculate bounding box that encompasses all selected shapes
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  selectedShapeIds.forEach((id) => {
    const shape = shapes.find((s) => s.id === id);
    if (!shape) return;

    const b = getShapeBounds(shape);
    minX = Math.min(minX, b.minX);
    maxX = Math.max(maxX, b.maxX);
    minY = Math.min(minY, b.minY);
    maxY = Math.max(maxY, b.maxY);
  });

  const boundingBoxWidth = maxX - minX;
  const boundingBoxHeight = maxY - minY;
  const padding = 10 / zoom;

  const text = `${selectedShapeIds.length} selected`;
  const textWidth = (text.length * 7) / zoom;
  const paddingX = 12 / zoom;
  const bgWidth = textWidth + paddingX;

  return (
    <g className="multi-selection-box">
      {/* Outer bounding box */}
      <rect
        x={minX - padding}
        y={minY - padding}
        width={boundingBoxWidth + padding * 2}
        height={boundingBoxHeight + padding * 2}
        fill="none"
        stroke="#ffa500"
        strokeWidth={2.5 / zoom}
        strokeDasharray={`${8 / zoom} ${4 / zoom}`}
        style={{ pointerEvents: 'none' }}
      />

      {/* Corner indicators */}
      {[
        { x: minX - padding, y: minY - padding },
        { x: maxX + padding, y: minY - padding },
        { x: minX - padding, y: maxY + padding },
        { x: maxX + padding, y: maxY + padding },
      ].map((corner, i) => (
        <rect
          key={i}
          x={corner.x - 6 / zoom / 2}
          y={corner.y - 6 / zoom / 2}
          width={6 / zoom}
          height={6 / zoom}
          fill="#ffa500"
          stroke="#fff"
          strokeWidth={1 / zoom}
          style={{ pointerEvents: 'none' }}
        />
      ))}

      {/* Selection count label */}
      <g transform={`translate(${minX - padding}, ${minY - padding - 25 / zoom})`}>
        <rect
          x="0"
          y="0"
          width={bgWidth}
          height={20 / zoom}
          fill="rgba(255, 165, 0, 0.95)"
          rx={4 / zoom}
          stroke="#fff"
          strokeWidth={0.5 / zoom}
          style={{ pointerEvents: 'none' }}
        />
        <text
          x={bgWidth / 2}
          y={14 / zoom}
          fill="#fff"
          fontSize={11 / zoom}
          fontWeight="600"
          fontFamily="system-ui, -apple-system, sans-serif"
          textAnchor="middle"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {text}
        </text>
      </g>
    </g>
  );
}
