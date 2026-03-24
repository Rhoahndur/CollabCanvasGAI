import {
  SHAPE_TYPES,
  MIN_RECTANGLE_SIZE,
  MIN_CIRCLE_RADIUS,
  MIN_POLYGON_RADIUS,
  DEFAULT_POLYGON_SIDES,
} from '../utils/constants';
import { getRandomColor } from '../utils/colorUtils';

/**
 * ShapePreview — Ghost shape shown while drawing a new shape.
 */
export default function ShapePreview({
  isDrawing,
  previewRect,
  selectedTool,
  drawStart,
  drawCurrent,
  zoom,
}) {
  if (!isDrawing || !previewRect) return null;

  const dx = Math.abs(drawCurrent.x - drawStart.x);
  const dy = Math.abs(drawCurrent.y - drawStart.y);
  const dashStyle = `${10 / zoom} ${5 / zoom}`;

  if (
    selectedTool === SHAPE_TYPES.RECTANGLE &&
    previewRect.width >= MIN_RECTANGLE_SIZE &&
    previewRect.height >= MIN_RECTANGLE_SIZE
  ) {
    return (
      <rect
        x={previewRect.x}
        y={previewRect.y}
        width={previewRect.width}
        height={previewRect.height}
        fill={getRandomColor()}
        opacity={0.5}
        stroke="#fff"
        strokeWidth={2 / zoom}
        strokeDasharray={dashStyle}
        className="preview-shape"
        style={{ pointerEvents: 'none' }}
      />
    );
  }

  if (selectedTool === SHAPE_TYPES.CIRCLE) {
    const radius = Math.sqrt(dx * dx + dy * dy) / 2;
    const centerX = (drawStart.x + drawCurrent.x) / 2;
    const centerY = (drawStart.y + drawCurrent.y) / 2;

    if (radius >= MIN_CIRCLE_RADIUS) {
      return (
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill={getRandomColor()}
          opacity={0.5}
          stroke="#fff"
          strokeWidth={2 / zoom}
          strokeDasharray={dashStyle}
          className="preview-shape"
          style={{ pointerEvents: 'none' }}
        />
      );
    }
  }

  if (selectedTool === SHAPE_TYPES.POLYGON) {
    const radius = Math.sqrt(dx * dx + dy * dy) / 2;
    const centerX = (drawStart.x + drawCurrent.x) / 2;
    const centerY = (drawStart.y + drawCurrent.y) / 2;

    if (radius >= MIN_POLYGON_RADIUS) {
      const points = [];
      const angleStep = (Math.PI * 2) / DEFAULT_POLYGON_SIDES;
      const startAngle = -Math.PI / 2;

      for (let i = 0; i < DEFAULT_POLYGON_SIDES; i++) {
        const angle = startAngle + angleStep * i;
        const px = centerX + radius * Math.cos(angle);
        const py = centerY + radius * Math.sin(angle);
        points.push(`${px},${py}`);
      }

      return (
        <polygon
          points={points.join(' ')}
          fill={getRandomColor()}
          opacity={0.5}
          stroke="#fff"
          strokeWidth={2 / zoom}
          strokeDasharray={dashStyle}
          className="preview-shape"
          style={{ pointerEvents: 'none' }}
        />
      );
    }
  }

  if (selectedTool === SHAPE_TYPES.TEXT) {
    const width = Math.max(dx, 200);
    const height = Math.max(dy, 60);

    return (
      <g>
        <rect
          x={previewRect.x}
          y={previewRect.y}
          width={width}
          height={height}
          fill="rgba(30, 30, 30, 0.7)"
          stroke={getRandomColor()}
          strokeWidth={2 / zoom}
          strokeDasharray={dashStyle}
          rx={4}
          className="preview-shape"
          style={{ pointerEvents: 'none' }}
        />
        <text
          x={previewRect.x + width / 2}
          y={previewRect.y + height / 2}
          fill="#888"
          fontSize={16}
          fontFamily="Arial, sans-serif"
          textAnchor="middle"
          dominantBaseline="middle"
          opacity={0.7}
          style={{ pointerEvents: 'none' }}
        >
          Text Box
        </text>
      </g>
    );
  }

  return null;
}
