import { getRandomColor } from '../utils/colorUtils';

/**
 * CustomPolygonPreview — Vertex dots, connecting lines, and closing guide
 * shown while the user draws a custom polygon.
 */
export default function CustomPolygonPreview({ vertices, zoom }) {
  if (!vertices || vertices.length === 0) return null;

  const points = vertices.map((v) => `${v.x},${v.y}`).join(' ');
  const firstVertex = vertices[0];

  return (
    <g className="custom-polygon-preview">
      {/* Preview lines connecting vertices */}
      {vertices.length > 1 && (
        <polyline
          points={points}
          fill="none"
          stroke={getRandomColor()}
          strokeWidth={3 / zoom}
          strokeDasharray={`${10 / zoom} ${5 / zoom}`}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Closing line if enough vertices */}
      {vertices.length >= 3 && (
        <line
          x1={vertices[vertices.length - 1].x}
          y1={vertices[vertices.length - 1].y}
          x2={firstVertex.x}
          y2={firstVertex.y}
          stroke="rgba(100, 108, 255, 0.5)"
          strokeWidth={2 / zoom}
          strokeDasharray={`${5 / zoom} ${5 / zoom}`}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Vertex dots */}
      {vertices.map((vertex, i) => (
        <g key={i}>
          <circle
            cx={vertex.x}
            cy={vertex.y}
            r={6 / zoom}
            fill={i === 0 ? '#646cff' : '#fff'}
            stroke={i === 0 ? '#fff' : '#646cff'}
            strokeWidth={2 / zoom}
            style={{ pointerEvents: 'none' }}
          />
          {/* First vertex halo when polygon can close */}
          {i === 0 && vertices.length >= 3 && (
            <circle
              cx={vertex.x}
              cy={vertex.y}
              r={12 / zoom}
              fill="none"
              stroke="#646cff"
              strokeWidth={2 / zoom}
              opacity={0.5}
              style={{ pointerEvents: 'none' }}
            />
          )}
        </g>
      ))}

      {/* Instruction text */}
      <text
        x={firstVertex.x}
        y={firstVertex.y - 20 / zoom}
        fill="#646cff"
        fontSize={14 / zoom}
        fontWeight="600"
        fontFamily="system-ui, -apple-system, sans-serif"
        textAnchor="middle"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {vertices.length < 3
          ? 'Click to add vertices'
          : 'Click first vertex or press Enter to finish'}
      </text>
    </g>
  );
}
