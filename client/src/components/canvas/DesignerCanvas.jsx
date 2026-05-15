import { useEffect, useRef } from "react";
import { Stage, Layer, Rect, Circle, Text, Line, Transformer } from "react-konva";
import { useStore } from "../../store/useStore.js";

const MIN_SIZE = 20;

export default function DesignerCanvas() {
  const stageRef = useRef(null);
  const shapeRefs = useRef({});
  const transformerRef = useRef(null);
  const isDrawing = useRef(false);
  const activeLineId = useRef(null);

  const tool = useStore((state) => state.tool);
  const fill = useStore((state) => state.fill);
  const stroke = useStore((state) => state.stroke);
  const strokeWidth = useStore((state) => state.strokeWidth);
  const elements = useStore((state) => state.elements);
  const selectedId = useStore((state) => state.selectedId);

  const addElement = useStore((state) => state.addElement);
  const updateElement = useStore((state) => state.updateElement);
  const setSelectedId = useStore((state) => state.setSelectedId);
  const clearSelection = useStore((state) => state.clearSelection);
  const addLineStart = useStore((state) => state.addLineStart);
  const appendToLine = useStore((state) => state.appendToLine);

  useEffect(() => {
    const transformer = transformerRef.current;
    const selectedNode = shapeRefs.current[selectedId];

    if (transformer && selectedNode) {
      transformer.nodes([selectedNode]);
      transformer.getLayer()?.batchDraw();
    } else if (transformer) {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
    }
  }, [selectedId, elements]);

  const getPointerPosition = () => {
    const stage = stageRef.current;
    return stage?.getPointerPosition();
  };

  const handleStageMouseDown = (e) => {
    const clickedOnEmpty = e.target === e.target.getStage();

    if (clickedOnEmpty && tool === "select") {
      clearSelection();
      return;
    }

    if (!clickedOnEmpty) return;

    const pos = getPointerPosition();
    if (!pos) return;

    if (tool === "rect") {
      addElement({
        type: "rect",
        x: pos.x,
        y: pos.y,
        width: 140,
        height: 90,
        fill,
        stroke,
        strokeWidth,
      });
      return;
    }

    if (tool === "circle") {
      addElement({
        type: "circle",
        x: pos.x,
        y: pos.y,
        radius: 50,
        fill,
        stroke,
        strokeWidth,
      });
      return;
    }

    if (tool === "text") {
      addElement({
        type: "text",
        x: pos.x,
        y: pos.y,
        text: "Double click to edit",
        fontSize: 24,
        width: 220,
        fill,
        stroke,
        strokeWidth: 0,
      });
      return;
    }

    if (tool === "pen") {
      isDrawing.current = true;
      addLineStart(pos);
      const latest = useStore.getState().elements.at(-1);
      activeLineId.current = latest?.id || null;
    }
  };

  const handleStageMouseMove = () => {
    if (tool !== "pen" || !isDrawing.current || !activeLineId.current) return;
    const pos = getPointerPosition();
    if (!pos) return;
    appendToLine(activeLineId.current, pos);
  };

  const handleStageMouseUp = () => {
    isDrawing.current = false;
    activeLineId.current = null;
  };

  const commonShapeProps = (element) => ({
    key: element.id,
    ref: (node) => {
      if (node) shapeRefs.current[element.id] = node;
    },
    draggable: tool === "select",
    onClick: () => setSelectedId(element.id),
    onTap: () => setSelectedId(element.id),
    onDragEnd: (e) => {
      updateElement(element.id, {
        x: e.target.x(),
        y: e.target.y(),
      });
    },
    onTransformEnd: (e) => {
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      if (element.type === "rect") {
        node.scaleX(1);
        node.scaleY(1);
        updateElement(element.id, {
          x: node.x(),
          y: node.y(),
          width: Math.max(MIN_SIZE, node.width() * scaleX),
          height: Math.max(MIN_SIZE, node.height() * scaleY),
        });
      }

      if (element.type === "circle") {
        const nextRadius = Math.max(
          MIN_SIZE / 2,
          element.radius * Math.max(scaleX, scaleY)
        );
        node.scaleX(1);
        node.scaleY(1);
        updateElement(element.id, {
          x: node.x(),
          y: node.y(),
          radius: nextRadius,
        });
      }

      if (element.type === "text") {
        const newWidth = Math.max(80, node.width() * scaleX);
        node.scaleX(1);
        node.scaleY(1);
        updateElement(element.id, {
          x: node.x(),
          y: node.y(),
          width: newWidth,
        });
      }
    },
  });

  return (
    <div className="canvas-shell">
      <Stage
        ref={stageRef}
        width={window.innerWidth - 340}
        height={window.innerHeight}
        className="design-stage"
        onMouseDown={handleStageMouseDown}
        onMousemove={handleStageMouseMove}
        onMouseup={handleStageMouseUp}
        onTouchStart={handleStageMouseDown}
        onTouchMove={handleStageMouseMove}
        onTouchEnd={handleStageMouseUp}
      >
        <Layer>
          {elements.map((element) => {
            if (element.type === "rect") {
              return (
                <Rect
                  {...commonShapeProps(element)}
                  x={element.x}
                  y={element.y}
                  width={element.width}
                  height={element.height}
                  fill={element.fill}
                  stroke={element.stroke}
                  strokeWidth={element.strokeWidth}
                  cornerRadius={8}
                />
              );
            }

            if (element.type === "circle") {
              return (
                <Circle
                  {...commonShapeProps(element)}
                  x={element.x}
                  y={element.y}
                  radius={element.radius}
                  fill={element.fill}
                  stroke={element.stroke}
                  strokeWidth={element.strokeWidth}
                />
              );
            }

            if (element.type === "text") {
              return (
                <Text
                  {...commonShapeProps(element)}
                  x={element.x}
                  y={element.y}
                  text={element.text}
                  width={element.width}
                  fontSize={element.fontSize}
                  fill={element.fill}
                  draggable={tool === "select"}
                />
              );
            }

            if (element.type === "line") {
              return (
                <Line
                  key={element.id}
                  points={element.points}
                  stroke={element.stroke}
                  strokeWidth={element.strokeWidth}
                  lineCap={element.lineCap}
                  lineJoin={element.lineJoin}
                  tension={element.tension}
                  onClick={() => setSelectedId(element.id)}
                  onTap={() => setSelectedId(element.id)}
                />
              );
            }

            return null;
          })}

          <Transformer
            ref={transformerRef}
            rotateEnabled
            flipEnabled={false}
            boundBoxFunc={(oldBox, newBox) => {
              if (
                Math.abs(newBox.width) < MIN_SIZE ||
                Math.abs(newBox.height) < MIN_SIZE
              ) {
                return oldBox;
              }
              return newBox;
            }}
          />
        </Layer>
      </Stage>
    </div>
  );
}