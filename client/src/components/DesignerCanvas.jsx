import { useEffect, useMemo, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Rect,
  Circle,
  Text,
  Line,
  Transformer,
} from "react-konva";
import Konva from "konva";
import { useStore } from "../store/useStore";
import InlineTextEditor from "./InlineTextEditor";
import TopBar from "./TopBar";
import RulerOverlay from "./RulerOverlay";

const MIN_SIZE = 20;
const SCALE_BY = 1.04;
const GUIDELINE_OFFSET = 6;

const getBoxForElement = (element) => {
  if (element.type === "rect") {
    return {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    };
  }

  if (element.type === "circle") {
    return {
      x: element.x - element.radius,
      y: element.y - element.radius,
      width: element.radius * 2,
      height: element.radius * 2,
    };
  }

  if (element.type === "text") {
    return {
      x: element.x,
      y: element.y,
      width: element.width || 200,
      height: (element.fontSize || 24) * 1.4,
    };
  }

  if (element.type === "line") {
    const xs = element.points.filter((_, index) => index % 2 === 0);
    const ys = element.points.filter((_, index) => index % 2 === 1);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      x: minX,
      y: minY,
      width: maxX - minX || 1,
      height: maxY - minY || 1,
    };
  }

  return null;
};

const getAggregateBounds = (elements) => {
  const boxes = elements.map(getBoxForElement).filter(Boolean);
  if (!boxes.length) return null;

  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.width));
  const maxY = Math.max(...boxes.map((b) => b.y + b.height));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

const shiftElementBy = (element, dx, dy) => {
  if (element.type === "line") {
    return {
      ...element,
      points: element.points.map((value, index) =>
        index % 2 === 0 ? value + dx : value + dy
      ),
    };
  }

  return {
    ...element,
    x: (element.x || 0) + dx,
    y: (element.y || 0) + dy,
  };
};

const snapValue = (value, gridSize) => Math.round(value / gridSize) * gridSize;

export default function DesignerCanvas() {
  const wrapperRef = useRef(null);
  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const shapeRefs = useRef({});
  const isDrawing = useRef(false);
  const activeLineId = useRef(null);
  const selectionStart = useRef(null);
  const dragSnapshotRef = useRef(null);

  const [stageSize, setStageSize] = useState({ width: 960, height: 640 });
  const [selectionBox, setSelectionBox] = useState(null);
  const [guides, setGuides] = useState([]);

  const tool = useStore((state) => state.tool);
  const fill = useStore((state) => state.fill);
  const stroke = useStore((state) => state.stroke);
  const strokeWidth = useStore((state) => state.strokeWidth);
  const elements = useStore((state) => state.elements);
  const selectedIds = useStore((state) => state.selectedIds);

  const stageScale = useStore((state) => state.stageScale);
  const stageX = useStore((state) => state.stageX);
  const stageY = useStore((state) => state.stageY);
  const setStageTransform = useStore((state) => state.setStageTransform);

  const gridEnabled = useStore((state) => state.gridEnabled);
  const snapToGrid = useStore((state) => state.snapToGrid);
  const gridSize = useStore((state) => state.gridSize);

  const addElement = useStore((state) => state.addElement);
  const updateElement = useStore((state) => state.updateElement);
  const setElements = useStore((state) => state.setElements);
  const commitElements = useStore((state) => state.commitElements);
  const setSelectedIds = useStore((state) => state.setSelectedIds);
  const selectSingle = useStore((state) => state.selectSingle);
  const toggleSelectedId = useStore((state) => state.toggleSelectedId);
  const clearSelection = useStore((state) => state.clearSelection);
  const addLineStart = useStore((state) => state.addLineStart);
  const appendToLine = useStore((state) => state.appendToLine);
  const beginTextEdit = useStore((state) => state.beginTextEdit);
  const showContextMenu = useStore((state) => state.showContextMenu);
  const hideContextMenu = useStore((state) => state.hideContextMenu);

  const visibleElements = useMemo(
    () => elements.filter((element) => !element.hidden),
    [elements]
  );

  useEffect(() => {
    const handleResize = () => {
      const availableWidth = Math.max(720, window.innerWidth - 640);
      const availableHeight = Math.max(520, window.innerHeight - 210);

      setStageSize({
        width: availableWidth,
        height: availableHeight,
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;

    const nodes = selectedIds
      .map((id) => shapeRefs.current[id])
      .filter(Boolean);

    transformer.nodes(tool === "pan" ? [] : nodes);
    transformer.getLayer()?.batchDraw();
  }, [selectedIds, elements, tool]);

  const getCanvasCoordinates = () => {
    const stage = stageRef.current;
    const pointer = stage?.getPointerPosition();
    if (!stage || !pointer) return null;

    return {
      x: (pointer.x - stage.x()) / stage.scaleX(),
      y: (pointer.y - stage.y()) / stage.scaleY(),
    };
  };

  const getSelectionClientRect = (box) => ({
    x: Math.min(box.x1, box.x2),
    y: Math.min(box.y1, box.y2),
    width: Math.abs(box.x2 - box.x1),
    height: Math.abs(box.y2 - box.y1),
  });

  const getLineGuideStops = (skipIds = []) => {
    const vertical = [0, stageSize.width / 2, stageSize.width];
    const horizontal = [0, stageSize.height / 2, stageSize.height];

    visibleElements.forEach((element) => {
      if (skipIds.includes(element.id)) return;
      const box = getBoxForElement(element);
      if (!box) return;

      vertical.push(box.x, box.x + box.width / 2, box.x + box.width);
      horizontal.push(box.y, box.y + box.height / 2, box.y + box.height);
    });

    return {
      vertical,
      horizontal,
    };
  };

  const getObjectSnappingEdges = (box, absPos) => ({
    vertical: [
      {
        guide: Math.round(box.x),
        offset: Math.round(absPos.x - box.x),
      },
      {
        guide: Math.round(box.x + box.width / 2),
        offset: Math.round(absPos.x - box.x - box.width / 2),
      },
      {
        guide: Math.round(box.x + box.width),
        offset: Math.round(absPos.x - box.x - box.width),
      },
    ],
    horizontal: [
      {
        guide: Math.round(box.y),
        offset: Math.round(absPos.y - box.y),
      },
      {
        guide: Math.round(box.y + box.height / 2),
        offset: Math.round(absPos.y - box.y - box.height / 2),
      },
      {
        guide: Math.round(box.y + box.height),
        offset: Math.round(absPos.y - box.y - box.height),
      },
    ],
  });

  const getGuides = (lineGuideStops, itemBounds) => {
    const resultV = [];
    const resultH = [];

    lineGuideStops.vertical.forEach((lineGuide) => {
      itemBounds.vertical.forEach((itemBound) => {
        const diff = Math.abs(lineGuide - itemBound.guide);
        if (diff < GUIDELINE_OFFSET) {
          resultV.push({
            lineGuide,
            diff,
            offset: itemBound.offset,
          });
        }
      });
    });

    lineGuideStops.horizontal.forEach((lineGuide) => {
      itemBounds.horizontal.forEach((itemBound) => {
        const diff = Math.abs(lineGuide - itemBound.guide);
        if (diff < GUIDELINE_OFFSET) {
          resultH.push({
            lineGuide,
            diff,
            offset: itemBound.offset,
          });
        }
      });
    });

    const guides = [];
    const minV = resultV.sort((a, b) => a.diff - b.diff)[0];
    const minH = resultH.sort((a, b) => a.diff - b.diff)[0];

    if (minV) {
      guides.push({
        lineGuide: minV.lineGuide,
        offset: minV.offset,
        orientation: "V",
      });
    }

    if (minH) {
      guides.push({
        lineGuide: minH.lineGuide,
        offset: minH.offset,
        orientation: "H",
      });
    }

    return guides;
  };

  const applySnapping = (selectedElements) => {
    const groupBounds = getAggregateBounds(selectedElements);
    if (!groupBounds) {
      setGuides([]);
      return { dx: 0, dy: 0 };
    }

    const absPos = { x: groupBounds.x, y: groupBounds.y };
    const lineGuideStops = getLineGuideStops(selectedElements.map((el) => el.id));
    const itemBounds = getObjectSnappingEdges(groupBounds, absPos);
    const nextGuides = getGuides(lineGuideStops, itemBounds);

    let dx = 0;
    let dy = 0;

    if (nextGuides.length) {
      setGuides(nextGuides);

      nextGuides.forEach((guide) => {
        if (guide.orientation === "V") {
          dx = guide.lineGuide + guide.offset - groupBounds.x;
        }
        if (guide.orientation === "H") {
          dy = guide.lineGuide + guide.offset - groupBounds.y;
        }
      });
    } else {
      setGuides([]);
    }

    if (snapToGrid) {
      const snappedX = snapValue(groupBounds.x + dx, gridSize);
      const snappedY = snapValue(groupBounds.y + dy, gridSize);
      dx += snappedX - (groupBounds.x + dx);
      dy += snappedY - (groupBounds.y + dy);
    }

    return { dx, dy };
  };

  const fitToScreen = () => {
    const bounds = getAggregateBounds(visibleElements);
    if (!bounds) return;

    const padding = 80;
    const scaleX = (stageSize.width - padding * 2) / bounds.width;
    const scaleY = (stageSize.height - padding * 2) / bounds.height;
    const nextScale = Math.max(0.15, Math.min(2.5, Math.min(scaleX, scaleY)));

    const nextX = stageSize.width / 2 - (bounds.x + bounds.width / 2) * nextScale;
    const nextY = stageSize.height / 2 - (bounds.y + bounds.height / 2) * nextScale;

    setStageTransform({
      stageScale: nextScale,
      stageX: nextX,
      stageY: nextY,
    });
  };

  const centerSelection = () => {
    const selected = elements.filter((el) => selectedIds.includes(el.id));
    const bounds = getAggregateBounds(selected);
    if (!bounds) return;

    const nextX = stageSize.width / 2 - (bounds.x + bounds.width / 2) * stageScale;
    const nextY = stageSize.height / 2 - (bounds.y + bounds.height / 2) * stageScale;

    setStageTransform({
      stageScale,
      stageX: nextX,
      stageY: nextY,
    });
  };

  const renderGrid = () => {
    if (!gridEnabled) return null;

    const lines = [];
    const worldLeft = (-stageX) / stageScale;
    const worldTop = (-stageY) / stageScale;
    const worldRight = worldLeft + stageSize.width / stageScale;
    const worldBottom = worldTop + stageSize.height / stageScale;

    const startX = Math.floor(worldLeft / gridSize) * gridSize;
    const endX = Math.ceil(worldRight / gridSize) * gridSize;
    const startY = Math.floor(worldTop / gridSize) * gridSize;
    const endY = Math.ceil(worldBottom / gridSize) * gridSize;

    for (let x = startX; x <= endX; x += gridSize) {
      lines.push(
        <Line
          key={`grid-v-${x}`}
          points={[x, startY, x, endY]}
          stroke="rgba(148,163,184,0.12)"
          strokeWidth={1 / stageScale}
          listening={false}
        />
      );
    }

    for (let y = startY; y <= endY; y += gridSize) {
      lines.push(
        <Line
          key={`grid-h-${y}`}
          points={[startX, y, endX, y]}
          stroke="rgba(148,163,184,0.12)"
          strokeWidth={1 / stageScale}
          listening={false}
        />
      );
    }

    return lines;
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key === "1") {
        e.preventDefault();
        fitToScreen();
      }

      if (mod && e.key === "2") {
        e.preventDefault();
        centerSelection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [elements, selectedIds, stageScale, stageSize.width, stageSize.height]);

  const handleStageMouseDown = (e) => {
    hideContextMenu();
    const clickedOnEmpty = e.target === e.target.getStage();

    if (tool === "pan") return;

    const pos = getCanvasCoordinates();
    if (!pos) return;

    const placeX = snapToGrid ? snapValue(pos.x, gridSize) : pos.x;
    const placeY = snapToGrid ? snapValue(pos.y, gridSize) : pos.y;

    if (tool === "select" && clickedOnEmpty) {
      selectionStart.current = pos;
      setSelectionBox({
        x1: pos.x,
        y1: pos.y,
        x2: pos.x,
        y2: pos.y,
      });

      if (!(e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey)) {
        clearSelection();
      }
      return;
    }

    if (!clickedOnEmpty) return;

    if (tool === "rect") {
      addElement({
        type: "rect",
        x: placeX,
        y: placeY,
        width: 160,
        height: 100,
        fill,
        stroke,
        strokeWidth,
        opacity: 1,
        rotation: 0,
      });
      return;
    }

    if (tool === "circle") {
      addElement({
        type: "circle",
        x: placeX,
        y: placeY,
        radius: 56,
        fill,
        stroke,
        strokeWidth,
        opacity: 1,
        rotation: 0,
      });
      return;
    }

    if (tool === "text") {
      addElement({
        type: "text",
        x: placeX,
        y: placeY,
        text: "Double click to edit",
        fontSize: 26,
        width: 260,
        fill,
        strokeWidth: 0,
        opacity: 1,
        rotation: 0,
      });
      return;
    }

    if (tool === "pen") {
      isDrawing.current = true;
      addLineStart({ x: placeX, y: placeY });
      const latest = useStore.getState().elements.at(-1);
      activeLineId.current = latest?.id || null;
    }
  };

  const handleStageMouseMove = () => {
    if (tool === "pen" && isDrawing.current && activeLineId.current) {
      const pos = getCanvasCoordinates();
      if (!pos) return;

      const nextPoint = snapToGrid
        ? { x: snapValue(pos.x, gridSize), y: snapValue(pos.y, gridSize) }
        : pos;

      appendToLine(activeLineId.current, nextPoint);
      return;
    }

    if (tool === "select" && selectionStart.current) {
      const pos = getCanvasCoordinates();
      if (!pos) return;

      setSelectionBox((prev) =>
        prev
          ? {
              ...prev,
              x2: pos.x,
              y2: pos.y,
            }
          : null
      );
    }
  };

  const handleStageMouseUp = (e) => {
    if (tool === "pen") {
      isDrawing.current = false;
      activeLineId.current = null;
    }

    if (tool === "select" && selectionBox) {
      const selectionRect = getSelectionClientRect(selectionBox);
      const selected = visibleElements.filter((element) => {
        const node = shapeRefs.current[element.id];
        if (!node || element.locked) return false;
        return Konva.Util.haveIntersection(selectionRect, node.getClientRect());
      });

      if (selected.length) {
        if (e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey) {
          const merged = Array.from(
            new Set([...selectedIds, ...selected.map((el) => el.id)])
          );
          setSelectedIds(merged);
        } else {
          setSelectedIds(selected.map((el) => el.id));
        }
      }

      selectionStart.current = null;
      setSelectionBox(null);
    }

    setGuides([]);
  };

  const handleWheel = (e) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    let direction = e.evt.deltaY > 0 ? 1 : -1;
    if (e.evt.ctrlKey) direction = -direction;

    const newScale =
      direction > 0
        ? Math.max(0.2, oldScale / SCALE_BY)
        : Math.min(4, oldScale * SCALE_BY);

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    setStageTransform({
      stageScale: newScale,
      stageX: newPos.x,
      stageY: newPos.y,
    });
  };

  const openTextEditor = (element) => {
    const node = shapeRefs.current[element.id];
    const wrapper = wrapperRef.current;
    const stage = stageRef.current;
    if (!node || !wrapper || !stage) return;

    const position = node.getAbsolutePosition();
    const rect = wrapper.getBoundingClientRect();

    beginTextEdit(element.id, {
      top: rect.top + position.y * stage.scaleX(),
      left: rect.left + position.x * stage.scaleX(),
      width: (element.width || 200) * stage.scaleX(),
      height: (element.fontSize || 24) * 1.6 * stage.scaleX(),
      fontSize: (element.fontSize || 24) * stage.scaleX(),
    });
  };

  const handleSelect = (element, e) => {
    hideContextMenu();
    if (element.locked) return;

    if (e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey) {
      toggleSelectedId(element.id);
      return;
    }

    if (!selectedIds.includes(element.id)) {
      selectSingle(element.id);
    }
  };

  const handleContextMenu = (element, e) => {
    e.evt.preventDefault();
    if (!selectedIds.includes(element.id)) {
      selectSingle(element.id);
    }
    showContextMenu(e.evt.clientX, e.evt.clientY);
  };

  const handleDragStart = (element) => {
    const activeIds = selectedIds.includes(element.id) ? selectedIds : [element.id];
    const selectedElements = elements.filter((el) => activeIds.includes(el.id));

    dragSnapshotRef.current = {
      activeIds,
      originalElements: elements.map((el) => ({ ...el })),
      baseBounds: getAggregateBounds(selectedElements),
    };

    if (!selectedIds.includes(element.id)) {
      selectSingle(element.id);
    }
  };

  const handleDragMove = (element, e) => {
    const snapshot = dragSnapshotRef.current;
    if (!snapshot) return;

    const draggedOriginal = snapshot.originalElements.find((el) => el.id === element.id);
    if (!draggedOriginal) return;

    const dx = e.target.x() - (draggedOriginal.x || 0);
    const dy = e.target.y() - (draggedOriginal.y || 0);

    let moved = snapshot.originalElements.map((el) => {
      if (!snapshot.activeIds.includes(el.id) || el.locked) return el;
      return shiftElementBy(el, dx, dy);
    });

    const movedSelected = moved.filter((el) => snapshot.activeIds.includes(el.id));
    const snap = applySnapping(movedSelected);

    if (snap.dx || snap.dy) {
      moved = moved.map((el) => {
        if (!snapshot.activeIds.includes(el.id) || el.locked) return el;
        return shiftElementBy(el, snap.dx, snap.dy);
      });
    }

    setElements(moved);
  };

  const handleDragEnd = () => {
    commitElements(useStore.getState().elements);
    dragSnapshotRef.current = null;
    setGuides([]);
  };

  const commonShapeProps = (element) => ({
    key: element.id,
    id: element.id,
    ref: (node) => {
      if (node) shapeRefs.current[element.id] = node;
    },
    draggable: tool === "select" && !element.locked,
    rotation: element.rotation || 0,
    onClick: (e) => handleSelect(element, e),
    onTap: (e) => handleSelect(element, e),
    onContextMenu: (e) => handleContextMenu(element, e),
    onDragStart: () => handleDragStart(element),
    onDragMove: (e) => handleDragMove(element, e),
    onDragEnd: handleDragEnd,
    onTransformEnd: (e) => {
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      if (element.type === "rect") {
        node.scaleX(1);
        node.scaleY(1);
        updateElement(element.id, {
          x: snapToGrid ? snapValue(node.x(), gridSize) : node.x(),
          y: snapToGrid ? snapValue(node.y(), gridSize) : node.y(),
          width: Math.max(MIN_SIZE, node.width() * scaleX),
          height: Math.max(MIN_SIZE, node.height() * scaleY),
          rotation: node.rotation(),
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
          x: snapToGrid ? snapValue(node.x(), gridSize) : node.x(),
          y: snapToGrid ? snapValue(node.y(), gridSize) : node.y(),
          radius: nextRadius,
          rotation: node.rotation(),
        });
      }

      if (element.type === "text") {
        const newWidth = Math.max(80, node.width() * scaleX);
        const newFontSize = Math.max(12, (element.fontSize || 24) * scaleY);
        node.scaleX(1);
        node.scaleY(1);
        updateElement(element.id, {
          x: snapToGrid ? snapValue(node.x(), gridSize) : node.x(),
          y: snapToGrid ? snapValue(node.y(), gridSize) : node.y(),
          width: newWidth,
          fontSize: newFontSize,
          rotation: node.rotation(),
        });
      }
    },
  });

  return (
    <div className="canvas-workspace">
      <TopBar onFitAll={fitToScreen} onCenterSelection={centerSelection} />

      <div className="canvas-board-shell">
        <div className="canvas-board-header">
          <div className="board-title">Untitled design</div>
          <div className="board-header-actions">
            <button className="top-action" onClick={fitToScreen}>
              Fit all
            </button>
            <button className="top-action" onClick={centerSelection}>
              Center selection
            </button>
          </div>
        </div>

        <div className="canvas-shell with-rulers" ref={wrapperRef}>
          <RulerOverlay
            width={stageSize.width}
            height={stageSize.height}
            stageScale={stageScale}
            stageX={stageX}
            stageY={stageY}
            gridSize={gridSize}
          />

          <Stage
            ref={stageRef}
            width={stageSize.width}
            height={stageSize.height}
            x={stageX}
            y={stageY}
            scaleX={stageScale}
            scaleY={stageScale}
            draggable={tool === "pan"}
            onDragEnd={(e) =>
              setStageTransform({
                stageScale,
                stageX: e.target.x(),
                stageY: e.target.y(),
              })
            }
            onMouseDown={handleStageMouseDown}
            onMousemove={handleStageMouseMove}
            onMouseup={handleStageMouseUp}
            onTouchStart={handleStageMouseDown}
            onTouchMove={handleStageMouseMove}
            onTouchEnd={handleStageMouseUp}
            onWheel={handleWheel}
            onContextMenu={(e) => {
              e.evt.preventDefault();
              if (!selectedIds.length) return;
              showContextMenu(e.evt.clientX, e.evt.clientY);
            }}
          >
            <Layer listening={false}>{renderGrid()}</Layer>

            <Layer>
              {visibleElements.map((element) => {
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
                      opacity={element.opacity ?? 1}
                      cornerRadius={14}
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
                      opacity={element.opacity ?? 1}
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
                      opacity={element.opacity ?? 1}
                      onDblClick={() => openTextEditor(element)}
                      onDblTap={() => openTextEditor(element)}
                    />
                  );
                }

                if (element.type === "line") {
                  return (
                    <Line
                      key={element.id}
                      id={element.id}
                      points={element.points}
                      stroke={element.stroke}
                      strokeWidth={element.strokeWidth}
                      lineCap={element.lineCap}
                      lineJoin={element.lineJoin}
                      tension={element.tension}
                      opacity={element.opacity ?? 1}
                      ref={(node) => {
                        if (node) shapeRefs.current[element.id] = node;
                      }}
                      draggable={tool === "select" && !element.locked}
                      onClick={(e) => handleSelect(element, e)}
                      onTap={(e) => handleSelect(element, e)}
                      onContextMenu={(e) => handleContextMenu(element, e)}
                      onDragStart={() => handleDragStart(element)}
                      onDragMove={(e) => handleDragMove(element, e)}
                      onDragEnd={handleDragEnd}
                    />
                  );
                }

                return null;
              })}

              {selectionBox && (
                <Rect
                  x={Math.min(selectionBox.x1, selectionBox.x2)}
                  y={Math.min(selectionBox.y1, selectionBox.y2)}
                  width={Math.abs(selectionBox.x2 - selectionBox.x1)}
                  height={Math.abs(selectionBox.y2 - selectionBox.y1)}
                  fill="rgba(124, 58, 237, 0.12)"
                  stroke="#7c3aed"
                  dash={[6, 4]}
                />
              )}

              {guides.map((guide, index) =>
                guide.orientation === "V" ? (
                  <Line
                    key={`guide-${index}`}
                    points={[guide.lineGuide, -5000, guide.lineGuide, 5000]}
                    stroke="#38bdf8"
                    strokeWidth={1}
                    dash={[4, 6]}
                    listening={false}
                  />
                ) : (
                  <Line
                    key={`guide-${index}`}
                    points={[-5000, guide.lineGuide, 5000, guide.lineGuide]}
                    stroke="#38bdf8"
                    strokeWidth={1}
                    dash={[4, 6]}
                    listening={false}
                  />
                )
              )}

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

          <InlineTextEditor />
        </div>

        <div className="canvas-statusbar">
          <span>Tool: {tool}</span>
          <span>Zoom: {Math.round(stageScale * 100)}%</span>
          <span>Selected: {selectedIds.length}</span>
          <span>Grid: {gridEnabled ? `${gridSize}px` : "off"}</span>
        </div>
      </div>
    </div>
  );
}