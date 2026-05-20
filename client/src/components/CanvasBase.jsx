import { useEffect, useRef, useState } from "react";
import { Circle, Layer, Line, Rect, RegularPolygon, Stage, Text, Transformer } from "react-konva";
import SideMenu from "./SideMenu";

const MIN_SCALE = 0.4;
const MAX_SCALE = 3;
const SCALE_STEP = 1.12;
const MIN_BOARD_WIDTH = 600;
const MIN_BOARD_HEIGHT = 400;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getDistance(touch1, touch2) {
  return Math.hypot(
    touch2.clientX - touch1.clientX,
    touch2.clientY - touch1.clientY
  );
}

function getCenter(touch1, touch2) {
  return {
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2,
  };
}

const strokeConfig = {
  Pen: { strokeWidth: 2, lineCap: "round", stroke: "#0f172a" },
  Pencil: { strokeWidth: 1.5, lineCap: "round", stroke: "#334155" },
  Brush: { strokeWidth: 6, lineCap: "round", stroke: "#1d4ed8" },
  Line: { strokeWidth: 3, lineCap: "round", stroke: "#2563eb" },
};

function CanvasBase() {
  const boardRef = useRef(null);
  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const objectRefs = useRef({});
  const lastPinchDistanceRef = useRef(0);

  const [menuCollapsed, setMenuCollapsed] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [boardSize, setBoardSize] = useState({ width: 2200, height: 1400 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [activeTool, setActiveTool] = useState("Shapes");
  const [selectedStroke, setSelectedStroke] = useState("Pen");
  const [boardColor, setBoardColor] = useState("#ffffff");
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [lines, setLines] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (!boardRef.current) return;

    const updateSize = () => {
      const { clientWidth, clientHeight } = boardRef.current;
      setStageSize({
        width: clientWidth,
        height: clientHeight,
      });
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(boardRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!stageSize.width || !stageSize.height) return;

    const centeredX = (stageSize.width - boardSize.width * scale) / 2;
    const centeredY = (stageSize.height - boardSize.height * scale) / 2;

    setPosition({ x: centeredX, y: centeredY });
  }, [stageSize.width, stageSize.height, boardSize.width, boardSize.height]);

  useEffect(() => {
    if (!transformerRef.current) return;
    const node = selectedId ? objectRefs.current[selectedId] : null;
    if (node) {
      transformerRef.current.nodes([node]);
      transformerRef.current.getLayer()?.batchDraw();
    } else {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedId, items]);

  const zoomAtPoint = (pointer, nextScale) => {
    const oldScale = scale;
    const pointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    };

    const newPosition = {
      x: pointer.x - pointTo.x * nextScale,
      y: pointer.y - pointTo.y * nextScale,
    };

    setScale(nextScale);
    setPosition(newPosition);
  };

  const handleWheel = (e) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    const pointer = stage?.getPointerPosition();
    if (!pointer) return;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const nextScale = clamp(
      direction > 0 ? scale * SCALE_STEP : scale / SCALE_STEP,
      MIN_SCALE,
      MAX_SCALE
    );
    zoomAtPoint(pointer, nextScale);
  };

  const handleTouchMove = (e) => {
    const touch1 = e.evt.touches[0];
    const touch2 = e.evt.touches[1];
    if (!touch1 || !touch2) return;
    e.evt.preventDefault();
    const dist = getDistance(touch1, touch2);
    const center = getCenter(touch1, touch2);
    if (!lastPinchDistanceRef.current) {
      lastPinchDistanceRef.current = dist;
      return;
    }
    const scaleFactor = dist / lastPinchDistanceRef.current;
    const nextScale = clamp(scale * scaleFactor, MIN_SCALE, MAX_SCALE);
    zoomAtPoint(center, nextScale);
    lastPinchDistanceRef.current = dist;
  };

  const handleTouchEnd = () => {
    lastPinchDistanceRef.current = 0;
    setIsDrawing(false);
  };

  const handleZoomIn = () => {
    const centerPoint = {
      x: stageSize.width / 2,
      y: stageSize.height / 2,
    };
    const nextScale = clamp(scale * SCALE_STEP, MIN_SCALE, MAX_SCALE);
    zoomAtPoint(centerPoint, nextScale);
  };

  const handleZoomOut = () => {
    const centerPoint = {
      x: stageSize.width / 2,
      y: stageSize.height / 2,
    };
    const nextScale = clamp(scale / SCALE_STEP, MIN_SCALE, MAX_SCALE);
    zoomAtPoint(centerPoint, nextScale);
  };

  const handleDragEnd = (e) => {
    setPosition({
      x: e.target.x(),
      y: e.target.y(),
    });
  };

  const addShape = (shapeType) => {
    const newItem = {
      id: `item-${Date.now()}`,
      type: "shape",
      shapeType,
      x: boardSize.width / 2 - 80,
      y: boardSize.height / 2 - 80,
      width: 120,
      height: 120,
      fill: "#2563eb",
      stroke: "#1d4ed8",
      strokeWidth: 3,
      rotation: 0,
    };
    setItems((prev) => [...prev, newItem]);
    setActiveTool("Shapes");
    setSelectedId(newItem.id);
  };

  const addText = (text) => {
    const newItem = {
      id: `item-${Date.now()}`,
      type: "text",
      x: boardSize.width / 2 - 160,
      y: boardSize.height / 2 - 40,
      width: 320,
      height: 48,
      text,
      fontSize: 20,
      fill: "#0f172a",
    };
    setItems((prev) => [...prev, newItem]);
    setActiveTool("Text");
    setSelectedId(newItem.id);
  };

  const changeBackground = (color) => {
    setBoardColor(color);
  };

  const updateBoardWidth = (value) => {
    const nextWidth = clamp(value || MIN_BOARD_WIDTH, MIN_BOARD_WIDTH, 5000);
    setBoardSize((prev) => ({
      ...prev,
      width: nextWidth,
    }));
  };

  const updateBoardHeight = (value) => {
    const nextHeight = clamp(value || MIN_BOARD_HEIGHT, MIN_BOARD_HEIGHT, 5000);
    setBoardSize((prev) => ({
      ...prev,
      height: nextHeight,
    }));
  };

  const updateItem = (id, patch) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const handleShapeClick = (id) => {
    setSelectedId(id);
  };

  const handleStageMouseDown = (e) => {
    const stage = e.target.getStage();
    if (activeTool === "Stroke") {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      setIsDrawing(true);
      setLines((prev) => [
        ...prev,
        {
          id: `line-${Date.now()}`,
          points: [pointer.x, pointer.y],
          ...strokeConfig[selectedStroke],
        },
      ]);
      setSelectedId(null);
      return;
    }
    if (e.target === stage || e.target.name() === "background") {
      setSelectedId(null);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    setLines((prev) => {
      const last = prev[prev.length - 1];
      if (!last) return prev;
      const updated = { ...last, points: [...last.points, pointer.x, pointer.y] };
      return [...prev.slice(0, -1), updated];
    });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleStageTouchEnd = (e) => {
    handleTouchEnd();
    handleMouseUp();
  };

  const renderShape = (item) => {
    const commonProps = {
      x: item.x,
      y: item.y,
      rotation: item.rotation || 0,
      fill: item.fill,
      stroke: item.stroke,
      strokeWidth: item.strokeWidth,
      draggable: true,
      onDragEnd: (e) => updateItem(item.id, { x: e.target.x(), y: e.target.y() }),
      onClick: () => handleShapeClick(item.id),
      onTap: () => handleShapeClick(item.id),
      ref: (node) => {
        if (node) objectRefs.current[item.id] = node;
      },
      onTransformEnd: (e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        updateItem(item.id, {
          x: node.x(),
          y: node.y(),
          width: Math.max(30, item.width * scaleX),
          height: Math.max(30, item.height * scaleY),
          rotation: node.rotation(),
        });
        node.scaleX(1);
        node.scaleY(1);
      },
    };

    switch (item.shapeType) {
      case "Circle":
        return (
          <Circle
            key={item.id}
            {...commonProps}
            x={item.x + item.width / 2}
            y={item.y + item.height / 2}
            radius={Math.max(20, item.width / 2)}
          />
        );
      case "Triangle":
        return (
          <RegularPolygon
            key={item.id}
            {...commonProps}
            x={item.x + item.width / 2}
            y={item.y + item.height / 2}
            sides={3}
            radius={Math.max(20, Math.min(item.width, item.height) / 2)}
          />
        );
      case "Diamond":
        return (
          <RegularPolygon
            key={item.id}
            {...commonProps}
            x={item.x + item.width / 2}
            y={item.y + item.height / 2}
            sides={4}
            radius={Math.max(20, Math.min(item.width, item.height) / 2)}
            rotation={45}
          />
        );
      case "Line":
        return (
          <Rect
            key={item.id}
            {...commonProps}
            width={Math.max(40, item.width)}
            height={Math.max(6, item.height || 10)}
            y={item.y + (item.height ? item.height / 2 - 4 : 0)}
            fill={item.stroke}
            stroke={item.stroke}
            strokeWidth={0}
          />
        );
      default:
        return <Rect key={item.id} {...commonProps} width={Math.max(30, item.width)} height={Math.max(30, item.height)} />;
    }
  };

  const renderTextItem = (item) => (
    <Text
      key={item.id}
      x={item.x}
      y={item.y}
      text={item.text}
      width={item.width}
      fontSize={item.fontSize}
      fill={item.fill}
      draggable
      onDragEnd={(e) => updateItem(item.id, { x: e.target.x(), y: e.target.y() })}
      onClick={() => handleShapeClick(item.id)}
      onTap={() => handleShapeClick(item.id)}
      onDblClick={(e) => {
        const newText = window.prompt("Edit text", item.text);
        if (newText !== null) {
          updateItem(item.id, { text: newText });
        }
      }}
      ref={(node) => {
        if (node) objectRefs.current[item.id] = node;
      }}
      onTransformEnd={(e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        updateItem(item.id, {
          x: node.x(),
          y: node.y(),
          width: Math.max(50, item.width * scaleX),
          fontSize: Math.max(12, item.fontSize * scaleY),
        });
        node.scaleX(1);
        node.scaleY(1);
      }}
    />
  );

  const renderItem = (item) => {
    if (item.type === "shape") {
      return renderShape(item);
    }
    if (item.type === "text") {
      return renderTextItem(item);
    }
    return null;
  };

  return (
    <section className="canvas-base">
      <div className="canvas-workspace">
        <SideMenu
          collapsed={menuCollapsed}
          onToggle={() => setMenuCollapsed((prev) => !prev)}
          boardSize={boardSize}
          onBoardWidthChange={updateBoardWidth}
          onBoardHeightChange={updateBoardHeight}
          activeTool={activeTool}
          onToolChange={setActiveTool}
          onAddShape={addShape}
          onAddText={addText}
          backgroundColor={boardColor}
          onBackgroundChange={changeBackground}
          selectedStroke={selectedStroke}
          onStrokeChange={(shape) => {
            setSelectedStroke(shape);
            setActiveTool("Stroke");
          }}
          selectedItem={items.find((item) => item.id === selectedId) || null}
          onDeleteSelected={() => {
            if (!selectedId) return;
            setItems((prev) => prev.filter((item) => item.id !== selectedId));
            setSelectedId(null);
          }}
          onChangeSelectedColor={(color) => {
            if (!selectedId) return;
            updateItem(selectedId, { fill: color, stroke: color });
          }}
        />

        <div ref={boardRef} className="canvas-base__board">
          {stageSize.width > 0 && stageSize.height > 0 && (
            <Stage
              ref={stageRef}
              width={stageSize.width}
              height={stageSize.height}
              x={position.x}
              y={position.y}
              scaleX={scale}
              scaleY={scale}
              draggable={false}
              onWheel={handleWheel}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleStageTouchEnd}
              onMouseDown={handleStageMouseDown}
              onTouchStart={handleStageMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <Layer>
                <Rect
                  name="background"
                  x={0}
                  y={0}
                  width={boardSize.width}
                  height={boardSize.height}
                  fill={boardColor}
                  cornerRadius={24}
                  shadowColor="rgba(15, 23, 42, 0.15)"
                  shadowBlur={42}
                  shadowOffset={{ x: 0, y: 16 }}
                  shadowOpacity={0.8}
                />
                {items.map((item) => renderItem(item))}
                {lines.map((line) => (
                  <Line
                    key={line.id}
                    points={line.points}
                    stroke={line.stroke}
                    strokeWidth={line.strokeWidth}
                    lineCap={line.lineCap}
                    lineJoin="round"
                    tension={0.5}
                    globalCompositeOperation="source-over"
                  />
                ))}
                <Transformer
                  ref={transformerRef}
                  rotateEnabled={true}
                  enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right", "top-center", "bottom-center"]}
                />
              </Layer>
            </Stage>
          )}

          <div className="canvas-base__zoom-panel">
            <button type="button" className="zoom-btn" onClick={handleZoomOut}>
              -
            </button>
            <span className="canvas-base__zoom-badge">{Math.round(scale * 100)}%</span>
            <button type="button" className="zoom-btn" onClick={handleZoomIn}>
              +
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CanvasBase;
