import { SHAPE_TYPES } from '../utils/constants';
import Rectangle from './Rectangle';
import Circle from './Circle';
import Polygon from './Polygon';
import CustomPolygon from './CustomPolygon';
import TextBox from './TextBox';
import Image from './Image';

/**
 * ShapeRenderer — Maps each visible shape to its component.
 */
export default function ShapeRenderer({
  visibleShapes,
  selectedShapeId,
  selectedShapeIds,
  user,
  userRole,
  onShapeClick,
  onShapeMouseDown,
  onSelectShape,
  onSetEditingTextId,
  onSetEditingText,
  onSetContextMenu,
}) {
  return visibleShapes.map((shape) => {
    const handleDoubleClick = (e) => {
      e.stopPropagation();
      if (userRole === 'viewer') return;
      if (!shape.lockedBy || shape.lockedBy === user?.uid) {
        onSelectShape(shape.id);
        onSetEditingTextId(shape.id);
        onSetEditingText(shape.text || '');
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (userRole === 'viewer') return;
      if (shape.lockedBy && shape.lockedBy !== user?.uid) return;

      if (!selectedShapeIds.includes(shape.id) && shape.id !== selectedShapeId) {
        onSelectShape(shape.id);
      }

      onSetContextMenu({
        x: e.clientX,
        y: e.clientY,
        shapeIds: selectedShapeIds.length > 0 ? selectedShapeIds : [shape.id],
      });
    };

    const shapeProps = {
      ...shape,
      isSelected: shape.id === selectedShapeId || selectedShapeIds.includes(shape.id),
      isLocked: !!shape.lockedBy && shape.lockedBy !== user?.uid,
      lockedByUserName: shape.lockedByUserName,
      onClick: onShapeClick,
      onMouseDown: onShapeMouseDown,
      onDoubleClick: handleDoubleClick,
      onContextMenu: handleContextMenu,
    };

    if (shape.type === SHAPE_TYPES.CIRCLE) {
      return <Circle key={shape.id} {...shapeProps} />;
    } else if (shape.type === SHAPE_TYPES.POLYGON) {
      return <Polygon key={shape.id} {...shapeProps} />;
    } else if (shape.type === SHAPE_TYPES.CUSTOM_POLYGON) {
      return <CustomPolygon key={shape.id} {...shapeProps} />;
    } else if (shape.type === SHAPE_TYPES.TEXT) {
      return (
        <TextBox
          key={shape.id}
          {...shapeProps}
          text={shape.text || 'Double-click to edit'}
          fontSize={shape.fontSize || 16}
          fontWeight={shape.fontWeight || 'normal'}
          fontStyle={shape.fontStyle || 'normal'}
          textColor={shape.textColor}
          backgroundColor={shape.backgroundColor || 'transparent'}
          width={shape.width || 200}
          height={shape.height || 60}
        />
      );
    } else if (shape.type === SHAPE_TYPES.IMAGE) {
      return (
        <Image
          key={shape.id}
          {...shapeProps}
          imageUrl={shape.imageUrl}
          width={shape.width || 200}
          height={shape.height || 200}
        />
      );
    } else {
      return <Rectangle key={shape.id} {...shapeProps} />;
    }
  });
}
