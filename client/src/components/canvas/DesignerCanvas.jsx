import React, { useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Circle, Text, Line, Transformer } from 'react-konva';
import { useStore } from '../../store/useStore';

const DesignerCanvas = () => {
  const { elements, selectedId, setSelectedId, updateElement, tool, addElement } = useStore();
  const trRef = useRef();
  const selectionRef = useRef();

  // Attach transformer to selected node
  useEffect(() => {
    if (selectedId) {
      const node = selectionRef.current;
      if (node) {
        trRef.current.nodes([node]);
        trRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedId]);

  const handleMouseDown = (e) => {
    const pos = e.target.getStage().getPointerPosition();
    
    // If clicking empty space, deselect
    if (e.target === e.target.getStage()) {
      setSelectedId(null);
      if (tool !== 'select') addElement(tool, pos);
      return;
    }
  };

  return (
    <div className="bg-white shadow-inner flex-1 relative">
      <Stage
        width={window.innerWidth - 300}
        height={window.innerHeight - 100}
        onMouseDown={handleMouseDown}
      >
        <Layer>
          {elements.map((el) => {
            const isSelected = el.id === selectedId;
            const commonProps = {
              key: el.id,
              ...el,
              draggable: tool === 'select',
              onClick: () => setSelectedId(el.id),
              ref: isSelected ? selectionRef : null,
              onDragEnd: (e) => updateElement(el.id, { x: e.target.x(), y: e.target.y() }),
              onTransformEnd: (e) => {
                const node = selectionRef.current;
                updateElement(el.id, {
                  x: node.x(),
                  y: node.y(),
                  scaleX: node.scaleX(),
                  scaleY: node.scaleY(),
                });
              }
            };

            if (el.type === 'rectangle') return <Rect {...commonProps} />;
            if (el.type === 'circle') return <Circle {...commonProps} />;
            if (el.type === 'text') return <Text {...commonProps} fontSize={20} />;
            if (el.type === 'pen') return <Line {...commonProps} stroke={el.fill} strokeWidth={5} tension={0.5} lineCap="round" />;
            return null;
          })}
          
          {selectedId && (
            <Transformer
              ref={trRef}
              boundBoxFunc={(oldBox, newBox) => (newBox.width < 5 || newBox.height < 5 ? oldBox : newBox)}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
};

export default DesignerCanvas;