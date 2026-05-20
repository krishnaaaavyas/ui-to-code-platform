import { useEffect, useRef, useState } from "react";
import { Layer, Rect, Stage, Text } from "react-konva";
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

function CanvasBase() {
  const boardRef = useRef(null);
  const stageRef = useRef(null);
  const lastPinchDistanceRef = useRef(0);

  const [menuCollapsed, setMenuCollapsed] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [boardSize, setBoardSize] = useState({ width: 2200, height: 1400 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

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

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });

    resizeObserver.observe(boardRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!stageSize.width || !stageSize.height) return;

    const centeredX = (stageSize.width - boardSize.width * scale) / 2;
    const centeredY = (stageSize.height - boardSize.height * scale) / 2;

    setPosition({ x: centeredX, y: centeredY });
  }, [stageSize.width, stageSize.height, boardSize.width, boardSize.height]);

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

  return (
    <section className="canvas-base">
      <div className="canvas-workspace">
        <SideMenu
          collapsed={menuCollapsed}
          onToggle={() => setMenuCollapsed((prev) => !prev)}
          boardSize={boardSize}
          onBoardWidthChange={updateBoardWidth}
          onBoardHeightChange={updateBoardHeight}
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
              draggable
              onDragEnd={handleDragEnd}
              onWheel={handleWheel}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <Layer>
                <Rect
                  x={0}
                  y={0}
                  width={boardSize.width}
                  height={boardSize.height}
                  fill="#ffffff"
                  cornerRadius={24}
                  shadowColor="rgba(15, 23, 42, 0.15)"
                  shadowBlur={42}
                  shadowOffset={{ x: 0, y: 16 }}
                  shadowOpacity={0.8}
                />
                <Text
                  x={60}
                  y={60}
                  text="Whiteboard"
                  fontSize={32}
                  fontStyle="bold"
                  fill="#0f172a"
                />
                <Text
                  x={60}
                  y={110}
                  text="Drag shapes • Add text • Change colors • Draw strokes • Manage layers"
                  fontSize={13}
                  fill="#475569"
                />
              </Layer>
            </Stage>
          )}

          <div className="canvas-base__zoom-panel">
            <button
              type="button"
              className="zoom-btn"
              onClick={handleZoomOut}
            >
              −
            </button>
            <span className="canvas-base__zoom-badge">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              className="zoom-btn"
              onClick={handleZoomIn}
            >
              +
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CanvasBase;