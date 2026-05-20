import { useEffect, useRef, useState } from "react";
import { Layer, Rect, Stage, Text } from "react-konva";
import SideMenu from "./SideMenu";

const MIN_SCALE = 0.4;
const MAX_SCALE = 3;
const SCALE_STEP = 1.12;
const BOARD_WIDTH = 2200;
const BOARD_HEIGHT = 1400;

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

  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!boardRef.current) return;

    const centerBoard = (width, height, nextScale = scale) => {
      const x = (width - BOARD_WIDTH * nextScale) / 2;
      const y = (height - BOARD_HEIGHT * nextScale) / 2;
      return { x, y };
    };

    const updateSize = () => {
      const { clientWidth, clientHeight } = boardRef.current;
      setStageSize({
        width: clientWidth,
        height: clientHeight,
      });
      setPosition(centerBoard(clientWidth, clientHeight, scale));
    };

    updateSize();

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });

    resizeObserver.observe(boardRef.current);

    return () => resizeObserver.disconnect();
  }, [scale]);

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
    const pointer = {
      x: stageSize.width / 2,
      y: stageSize.height / 2,
    };

    const nextScale = clamp(scale * SCALE_STEP, MIN_SCALE, MAX_SCALE);
    zoomAtPoint(pointer, nextScale);
  };

  const handleZoomOut = () => {
    const pointer = {
      x: stageSize.width / 2,
      y: stageSize.height / 2,
    };

    const nextScale = clamp(scale / SCALE_STEP, MIN_SCALE, MAX_SCALE);
    zoomAtPoint(pointer, nextScale);
  };

  return (
    <section className="canvas-base">
      <div className="canvas-base__header">
        <div className="canvas-base__title">
          <h1>Canvas</h1>
          <p>Zoomable whiteboard base</p>
        </div>

        <div className="canvas-base__controls">
          <button type="button" className="canvas-btn">
            Minimise
          </button>
          <button type="button" className="canvas-btn canvas-btn--primary">
            Maximise
          </button>
        </div>
      </div>

      <div className="canvas-workspace">
        <SideMenu />

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
              onWheel={handleWheel}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <Layer>
                <Rect
                  x={0}
                  y={0}
                  width={BOARD_WIDTH}
                  height={BOARD_HEIGHT}
                  fill="#ffffff"
                  cornerRadius={24}
                  shadowColor="rgba(15, 23, 42, 0.08)"
                  shadowBlur={28}
                  shadowOffset={{ x: 0, y: 10 }}
                />
                <Text
                  x={60}
                  y={60}
                  text="Whiteboard"
                  fontSize={28}
                  fontStyle="bold"
                  fill="#0f172a"
                />
                <Text
                  x={60}
                  y={100}
                  text="Zoom with mouse wheel, trackpad pinch, or the +/- controls."
                  fontSize={16}
                  fill="#64748b"
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