import { useEffect, useRef, useState } from "react";
import { Circle, Layer, Line, Rect, RegularPolygon, Stage, Text, Transformer } from "react-konva";
import SideMenu from "./SideMenu";
import { useStore } from "../store/useStore";
import { updateDocument } from "../api/documents";
import { refreshSession } from "../api/auth";

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
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const boardWidth = useStore((state) => state.boardWidth);
  const boardHeight = useStore((state) => state.boardHeight);
  const boardColor = useStore((state) => state.backgroundColor);
  const elements = useStore((state) => state.elements);
  const selectedElementId = useStore((state) => state.selectedElementId);

  const activeTool = useStore((state) => state.activeTool);
  const selectedStroke = useStore((state) => state.selectedStroke);
  const isDrawing = useStore((state) => state.isDrawing);
  const draftElement = useStore((state) => state.draftElement);

  const addElement = useStore((state) => state.addElement);
  const updateElement = useStore((state) => state.updateElement);
  const deleteElement = useStore((state) => state.deleteElement);
  const selectElement = useStore((state) => state.selectElement);
  const setActiveTool = useStore((state) => state.setActiveTool);
  const setSelectedStroke = useStore((state) => state.setSelectedStroke);
  const setIsDrawing = useStore((state) => state.setIsDrawing);
  const setDraftElement = useStore((state) => state.setDraftElement);
  const setBackgroundColor = useStore((state) => state.setBackgroundColor);
  const setBoardWidth = useStore((state) => state.setBoardWidth);
  const setBoardHeight = useStore((state) => state.setBoardHeight);

  const documentId = useStore((state) => state.documentId);
  const documentName = useStore((state) => state.documentName);
  const serializeDocument = useStore((state) => state.serializeDocument);
  const documentVersion = useStore((state) => state.documentVersion);
  const isDirty = useStore((state) => state.isDirty);
  const saveStatus = useStore((state) => state.saveStatus);
  const setSaveStatus = useStore((state) => state.setSaveStatus);
  const user = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);
  const setAccessToken = useStore((state) => state.setAccessToken);
  const setAuthReady = useStore((state) => state.setAuthReady);

  // Restore active session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const data = await refreshSession();
        setUser(data.user);
        setAccessToken(data.accessToken);
      } catch (err) {
        console.log("No active session to restore.", err);
      } finally {
        setAuthReady(true);
      }
    };
    restoreSession();
  }, [setUser, setAccessToken, setAuthReady]);

  // Debounced autosave effect
  useEffect(() => {
    if (!user || !documentId || !isDirty) return;

    const timeoutId = setTimeout(async () => {
      try {
        setSaveStatus("saving");
        const payload = {
          name: documentName,
          data: serializeDocument(),
          version: documentVersion,
          manual: false, // autosave
        };
        const updatedDoc = await updateDocument(documentId, payload);
        useStore.setState({
          isDirty: false,
          saveStatus: "saved",
          documentVersion: updatedDoc.version,
          saveError: null,
        });
      } catch (e) {
        console.error("Autosave failed:", e);
        if (e.message === "conflict") {
          useStore.setState({
            saveStatus: "conflict",
            saveError: "Version conflict: This design has been updated elsewhere. Please reload or duplicate.",
          });
        } else {
          useStore.setState({
            saveStatus: "error",
            saveError: e.message || "Autosave failed",
          });
        }
      }
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [
    user,
    documentId,
    isDirty,
    elements,
    boardWidth,
    boardHeight,
    boardColor,
    documentName,
    documentVersion,
    serializeDocument,
    setSaveStatus,
  ]);

  // Set up resize observer to keep canvas responsive
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

  // Center the drawing board initially on load/resize
  useEffect(() => {
    if (!stageSize.width || !stageSize.height) return;

    const centeredX = (stageSize.width - boardWidth * scale) / 2;
    const centeredY = (stageSize.height - boardHeight * scale) / 2;

    requestAnimationFrame(() => {
      setPosition({ x: centeredX, y: centeredY });
    });
  }, [stageSize.width, stageSize.height, boardWidth, boardHeight, scale]);

  // Keep the transformer synced with selected node
  useEffect(() => {
    if (!transformerRef.current) return;
    const node = selectedElementId ? objectRefs.current[selectedElementId] : null;
    if (node) {
      transformerRef.current.nodes([node]);
      transformerRef.current.getLayer()?.batchDraw();
    } else {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedElementId, elements]);

  // Keyboard shortcuts for Undo/Redo and Delete Selected
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === "INPUT" || 
        activeEl.tagName === "TEXTAREA" || 
        activeEl.isContentEditable
      );

      if (isInput) return;

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          useStore.getState().redo();
        } else {
          useStore.getState().undo();
        }
      } else if (cmdOrCtrl && e.key.toLowerCase() === "y") {
        e.preventDefault();
        useStore.getState().redo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedElementId) {
          e.preventDefault();
          deleteElement(selectedElementId);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        selectElement(null);
        setDraftElement(null);
        setIsDrawing(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedElementId, deleteElement, selectElement, setDraftElement, setIsDrawing]);

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

  const addShape = (shapeType) => {
    let newElement = {
      id: `element-${Date.now()}`,
      visible: true,
      locked: false,
      rotation: 0,
      fill: "#2563eb",
      stroke: "#1d4ed8",
      strokeWidth: 3,
    };

    if (shapeType === "Circle") {
      newElement = {
        ...newElement,
        type: "circle",
        name: "Circle",
        x: boardWidth / 2,
        y: boardHeight / 2,
        radius: 60,
      };
    } else if (shapeType === "Square") {
      newElement = {
        ...newElement,
        type: "rect",
        name: "Square",
        x: boardWidth / 2 - 60,
        y: boardHeight / 2 - 60,
        width: 120,
        height: 120,
      };
    } else if (shapeType === "Rectangle") {
      newElement = {
        ...newElement,
        type: "rect",
        name: "Rectangle",
        x: boardWidth / 2 - 80,
        y: boardHeight / 2 - 50,
        width: 160,
        height: 100,
      };
    } else if (shapeType === "Triangle") {
      newElement = {
        ...newElement,
        type: "triangle",
        name: "Triangle",
        x: boardWidth / 2,
        y: boardHeight / 2,
        radius: 60,
      };
    } else if (shapeType === "Diamond") {
      newElement = {
        ...newElement,
        type: "diamond",
        name: "Diamond",
        x: boardWidth / 2,
        y: boardHeight / 2,
        radius: 60,
      };
    } else if (shapeType === "Line") {
      newElement = {
        ...newElement,
        type: "line",
        name: "Line",
        x: boardWidth / 2 - 80,
        y: boardHeight / 2 - 5,
        width: 160,
        height: 10,
        fill: "#2563eb",
        stroke: "#2563eb",
        strokeWidth: 0,
      };
    }

    addElement(newElement);
    setActiveTool("Shapes");
    selectElement(newElement.id);
  };

  const addText = (text) => {
    const newElement = {
      id: `element-${Date.now()}`,
      type: "text",
      name: "Text",
      x: boardWidth / 2 - 160,
      y: boardHeight / 2 - 20,
      width: 320,
      text,
      fontSize: 20,
      fill: "#0f172a",
      visible: true,
      locked: false,
    };
    addElement(newElement);
    setActiveTool("Text");
    selectElement(newElement.id);
  };

  const changeBackground = (color) => {
    setBackgroundColor(color);
  };

  const updateBoardWidth = (value) => {
    const nextWidth = clamp(value || MIN_BOARD_WIDTH, MIN_BOARD_WIDTH, 5000);
    setBoardWidth(nextWidth);
  };

  const updateBoardHeight = (value) => {
    const nextHeight = clamp(value || MIN_BOARD_HEIGHT, MIN_BOARD_HEIGHT, 5000);
    setBoardHeight(nextHeight);
  };

  const updateItem = (id, patch) => {
    updateElement(id, patch);
  };

  const handleShapeClick = (id) => {
    selectElement(id);
  };

  const handleStageMouseDown = (e) => {
    const stage = e.target.getStage();
    if (activeTool === "Stroke") {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      setIsDrawing(true);
      setDraftElement({
        id: `path-${Date.now()}`,
        type: "path",
        name: "Path",
        points: [pointer.x, pointer.y],
        stroke: strokeConfig[selectedStroke].stroke,
        strokeWidth: strokeConfig[selectedStroke].strokeWidth,
        lineCap: strokeConfig[selectedStroke].lineCap,
        visible: true,
        locked: false,
      });
      selectElement(null);
      return;
    }
    if (e.target === stage || e.target.name() === "background") {
      selectElement(null);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !draftElement) return;
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    setDraftElement({
      ...draftElement,
      points: [...draftElement.points, pointer.x, pointer.y],
    });
  };

  const handleMouseUp = () => {
    if (draftElement) {
      addElement(draftElement);
      setDraftElement(null);
    }
    setIsDrawing(false);
  };

  const handleStageTouchEnd = () => {
    handleTouchEnd();
    handleMouseUp();
  };

  const renderRectangle = (item) => {
    const commonProps = {
      x: item.x,
      y: item.y,
      width: Math.max(30, item.width),
      height: Math.max(30, item.height),
      rotation: item.rotation || 0,
      fill: item.fill,
      stroke: item.stroke,
      strokeWidth: item.strokeWidth,
      draggable: !item.locked,
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
    return <Rect key={item.id} {...commonProps} />;
  };

  const renderCircle = (item) => {
    const commonProps = {
      x: item.x,
      y: item.y,
      radius: Math.max(10, item.radius),
      rotation: item.rotation || 0,
      fill: item.fill,
      stroke: item.stroke,
      strokeWidth: item.strokeWidth,
      draggable: !item.locked,
      onDragEnd: (e) => updateItem(item.id, { x: e.target.x(), y: e.target.y() }),
      onClick: () => handleShapeClick(item.id),
      onTap: () => handleShapeClick(item.id),
      ref: (node) => {
        if (node) objectRefs.current[item.id] = node;
      },
      onTransformEnd: (e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        updateItem(item.id, {
          x: node.x(),
          y: node.y(),
          radius: Math.max(10, item.radius * scaleX),
          rotation: node.rotation(),
        });
        node.scaleX(1);
        node.scaleY(1);
      },
    };
    return <Circle key={item.id} {...commonProps} />;
  };

  const renderTriangle = (item) => {
    const commonProps = {
      x: item.x,
      y: item.y,
      sides: 3,
      radius: Math.max(10, item.radius),
      rotation: item.rotation || 0,
      fill: item.fill,
      stroke: item.stroke,
      strokeWidth: item.strokeWidth,
      draggable: !item.locked,
      onDragEnd: (e) => updateItem(item.id, { x: e.target.x(), y: e.target.y() }),
      onClick: () => handleShapeClick(item.id),
      onTap: () => handleShapeClick(item.id),
      ref: (node) => {
        if (node) objectRefs.current[item.id] = node;
      },
      onTransformEnd: (e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        updateItem(item.id, {
          x: node.x(),
          y: node.y(),
          radius: Math.max(10, item.radius * scaleX),
          rotation: node.rotation(),
        });
        node.scaleX(1);
        node.scaleY(1);
      },
    };
    return <RegularPolygon key={item.id} {...commonProps} />;
  };

  const renderDiamond = (item) => {
    const commonProps = {
      x: item.x,
      y: item.y,
      sides: 4,
      radius: Math.max(10, item.radius),
      rotation: item.rotation || 45,
      fill: item.fill,
      stroke: item.stroke,
      strokeWidth: item.strokeWidth,
      draggable: !item.locked,
      onDragEnd: (e) => updateItem(item.id, { x: e.target.x(), y: e.target.y() }),
      onClick: () => handleShapeClick(item.id),
      onTap: () => handleShapeClick(item.id),
      ref: (node) => {
        if (node) objectRefs.current[item.id] = node;
      },
      onTransformEnd: (e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        updateItem(item.id, {
          x: node.x(),
          y: node.y(),
          radius: Math.max(10, item.radius * scaleX),
          rotation: node.rotation(),
        });
        node.scaleX(1);
        node.scaleY(1);
      },
    };
    return <RegularPolygon key={item.id} {...commonProps} />;
  };

  const renderLine = (item) => {
    const commonProps = {
      x: item.x,
      y: item.y,
      width: Math.max(10, item.width),
      height: Math.max(2, item.height),
      rotation: item.rotation || 0,
      fill: item.stroke,
      stroke: item.stroke,
      strokeWidth: 0,
      draggable: !item.locked,
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
          width: Math.max(10, item.width * scaleX),
          height: Math.max(2, item.height * scaleY),
          rotation: node.rotation(),
        });
        node.scaleX(1);
        node.scaleY(1);
      },
    };
    return <Rect key={item.id} {...commonProps} />;
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
      draggable={!item.locked}
      onDragEnd={(e) => updateItem(item.id, { x: e.target.x(), y: e.target.y() })}
      onClick={() => handleShapeClick(item.id)}
      onTap={() => handleShapeClick(item.id)}
      onDblClick={() => {
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
        const newWidth = Math.max(40, node.width() * scaleX);
        node.scaleX(1);
        node.scaleY(1);
        transformerRef.current?.forceUpdate();
        updateItem(item.id, {
          x: node.x(),
          y: node.y(),
          width: newWidth,
          rotation: node.rotation(),
        });
      }}
    />
  );

  const renderPathItem = (item) => (
    <Line
      key={item.id}
      points={item.points}
      stroke={item.stroke}
      strokeWidth={item.strokeWidth}
      lineCap={item.lineCap}
      lineJoin="round"
      tension={0.5}
      globalCompositeOperation="source-over"
      onClick={() => handleShapeClick(item.id)}
      onTap={() => handleShapeClick(item.id)}
      ref={(node) => {
        if (node) objectRefs.current[item.id] = node;
      }}
    />
  );

  const renderItem = (item) => {
    if (!item.visible) return null;
    switch (item.type) {
      case "rect":
      case "rectangle":
        return renderRectangle(item);
      case "circle":
        return renderCircle(item);
      case "triangle":
        return renderTriangle(item);
      case "diamond":
        return renderDiamond(item);
      case "line":
        return renderLine(item);
      case "text":
        return renderTextItem(item);
      case "path":
        return renderPathItem(item);
      default:
        return null;
    }
  };

  const selectedItem = elements.find((item) => item.id === selectedElementId) || null;

  return (
    <section className="canvas-base">
      <div className="canvas-workspace">
        <SideMenu
          collapsed={menuCollapsed}
          onToggle={() => setMenuCollapsed((prev) => !prev)}
          boardWidth={boardWidth}
          boardHeight={boardHeight}
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
          selectedItem={selectedItem}
          onDeleteSelected={() => {
            if (!selectedElementId) return;
            deleteElement(selectedElementId);
          }}
          onChangeSelectedColor={(color) => {
            if (!selectedElementId) return;
            updateItem(selectedElementId, { fill: color, stroke: color });
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
                  width={boardWidth}
                  height={boardHeight}
                  fill={boardColor}
                  cornerRadius={24}
                  shadowColor="rgba(15, 23, 42, 0.15)"
                  shadowBlur={42}
                  shadowOffset={{ x: 0, y: 16 }}
                  shadowOpacity={0.8}
                />
                {elements.map((item) => renderItem(item))}
                {draftElement && renderPathItem(draftElement)}
                {selectedElementId && (
                  <Transformer
                    key={elements.find((el) => el.id === selectedElementId)?.type === "text" ? "text-transformer" : "shape-transformer"}
                    ref={transformerRef}
                    rotateEnabled={true}
                    enabledAnchors={elements.find((el) => el.id === selectedElementId)?.type === "text"
                      ? ["middle-left", "middle-right"]
                      : ["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right", "top-center", "bottom-center"]
                    }
                    boundBoxFunc={(oldBox, newBox) => {
                      if (elements.find((el) => el.id === selectedElementId)?.type === "text") {
                        newBox.width = Math.max(30, newBox.width);
                      }
                      return newBox;
                    }}
                  />
                )}
              </Layer>
            </Stage>
          )}

          {user && documentId && (() => {
            let badgeText;
            let badgeColor;
            let badgeBg = "rgba(15, 23, 42, 0.82)";

            if (saveStatus === "saving") {
              badgeText = "Saving...";
              badgeColor = "#3b82f6";
            } else if (saveStatus === "conflict") {
              badgeText = "⚠ Version Conflict";
              badgeColor = "#ef4444";
              badgeBg = "rgba(239, 68, 68, 0.15)";
            } else if (saveStatus === "error") {
              badgeText = "⚠ Save Failed";
              badgeColor = "#ef4444";
            } else if (saveStatus === "saved" && !isDirty) {
              badgeText = "✓ Saved";
              badgeColor = "#10b981";
            } else if (isDirty) {
              badgeText = "Unsaved Changes";
              badgeColor = "#f59e0b";
            } else {
              badgeText = "✓ Saved";
              badgeColor = "#10b981";
            }

            return (
              <div
                style={{
                  position: "absolute",
                  left: "18px",
                  bottom: "18px",
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 14px",
                  borderRadius: "999px",
                  background: badgeBg,
                  backdropFilter: "blur(8px)",
                  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.2)",
                  color: badgeColor,
                  fontSize: "12px",
                  fontWeight: "700",
                  pointerEvents: "none",
                  border: saveStatus === "conflict" ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.08)",
                  transition: "all 0.3s ease",
                  zIndex: 10,
                }}
              >
                {badgeText}
              </div>
            );
          })()}

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
