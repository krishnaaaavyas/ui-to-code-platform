import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { Circle, Layer, Line, Rect, RegularPolygon, Stage, Text, Transformer, Image as KonvaImage } from "react-konva";
import { useStore } from "../store/useStore";
import { initSocket, getSocket, disconnectSocket } from "../lib/socket";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useAutosave } from "../hooks/useAutosave";

interface CanvasImageProps {
  item: any;
  onSelect: () => void;
  onDragMove: (e: any) => void;
  onDragEnd: (e: any) => void;
  onTransform: (e: any) => void;
  onTransformEnd: (e: any) => void;
  isLocked: boolean;
  refCallback: (node: any) => void;
}

function CanvasImage({
  item,
  onSelect,
  onDragMove,
  onDragEnd,
  onTransform,
  onTransformEnd,
  isLocked,
  refCallback,
}: CanvasImageProps) {
  const [imgNode, setImgNode] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const image = new window.Image();
    image.src = item.url;
    image.onload = () => {
      setImgNode(image);
    };
  }, [item.url]);

  return (
    <KonvaImage
      ref={refCallback}
      image={imgNode || undefined}
      x={item.x}
      y={item.y}
      width={item.width || 200}
      height={item.height || 200}
      rotation={item.rotation || 0}
      draggable={!isLocked}
      onClick={onSelect}
      onTap={onSelect}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onTransform={onTransform}
      onTransformEnd={onTransformEnd}
    />
  );
}

const MIN_SCALE = 0.4;
const MAX_SCALE = 3;
const SCALE_STEP = 1.12;
const MIN_BOARD_WIDTH = 600;
const MIN_BOARD_HEIGHT = 400;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getDistance(touch1: Touch, touch2: Touch) {
  return Math.hypot(
    touch2.clientX - touch1.clientX,
    touch2.clientY - touch1.clientY
  );
}

function getCenter(touch1: Touch, touch2: Touch) {
  return {
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2,
  };
}

const strokeConfig: Record<string, { strokeWidth: number; lineCap: "round" | "butt" | "square"; stroke: string }> = {
  Pen: { strokeWidth: 2, lineCap: "round", stroke: "#0f172a" },
  Pencil: { strokeWidth: 1.5, lineCap: "round", stroke: "#334155" },
  Brush: { strokeWidth: 6, lineCap: "round", stroke: "#1d4ed8" },
  Line: { strokeWidth: 3, lineCap: "round", stroke: "#2563eb" },
};

const CanvasBase = forwardRef((props: any, ref: any) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const objectRefs = useRef<Record<string, any>>({});
  const lastPinchDistanceRef = useRef(0);

  useImperativeHandle(ref, () => ({
    exportToPNG,
    exportToJSON,
    importJSON: handleImportJSON,
  }));

  const [menuCollapsed, setMenuCollapsed] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [scale, setScaleState] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const setZoomScale = useStore((state: any) => state.setZoomScale);
  const setScale = useCallback((s: number) => {
    setScaleState(s);
    setZoomScale(s);
  }, [setZoomScale]);

  const boardWidth = useStore((state: any) => state.boardWidth);
  const boardHeight = useStore((state: any) => state.boardHeight);
  const boardColor = useStore((state: any) => state.backgroundColor);
  const elements = useStore((state: any) => state.elements);
  const selectedElementId = useStore((state: any) => state.selectedElementId);

  const activeTool = useStore((state: any) => state.activeTool);
  const selectedStroke = useStore((state: any) => state.selectedStroke);
  const isDrawing = useStore((state: any) => state.isDrawing);
  const draftElement = useStore((state: any) => state.draftElement);

  const addElement = useStore((state: any) => state.addElement);
  const updateElement = useStore((state: any) => state.updateElement);
  const deleteElement = useStore((state: any) => state.deleteElement);
  const selectElement = useStore((state: any) => state.selectElement);
  const setActiveTool = useStore((state: any) => state.setActiveTool);
  const setSelectedStroke = useStore((state: any) => state.setSelectedStroke);
  const setIsDrawing = useStore((state: any) => state.setIsDrawing);
  const setDraftElement = useStore((state: any) => state.setDraftElement);
  const setBackgroundColor = useStore((state: any) => state.setBackgroundColor);
  const setBoardWidth = useStore((state: any) => state.setBoardWidth);
  const setBoardHeight = useStore((state: any) => state.setBoardHeight);
  const showToast = useStore((state: any) => state.showToast);

  const documentId = useStore((state: any) => state.documentId);
  const documentName = useStore((state: any) => state.documentName);
  const serializeDocument = useStore((state: any) => state.serializeDocument);
  const documentVersion = useStore((state: any) => state.documentVersion);
  const isDirty = useStore((state: any) => state.isDirty);
  const saveStatus = useStore((state: any) => state.saveStatus);
  const setSaveStatus = useStore((state: any) => state.setSaveStatus);
  const user = useStore((state: any) => state.user);
  const setUser = useStore((state: any) => state.setUser);
  const setAccessToken = useStore((state: any) => state.setAccessToken);
  const setAuthReady = useStore((state: any) => state.setAuthReady);
  const accessToken = useStore((state: any) => state.accessToken);
  const userRole = useStore((state: any) => state.userRole);

  const [collaborators, setCollaborators] = useState<any[]>([]);
  const lastCursorEmitRef = useRef(0);

  // ── Design-to-Code state (linked to Zustand store) ────────────────────────────────
  const codePreviewOpen = useStore((state: any) => state.rightPanelOpen && state.inspectorTab === "Code");
  const setCodePreviewOpen = (open: boolean) => {
    useStore.getState().setRightPanelOpen(open);
    if (open) useStore.getState().setInspectorTab("Code");
  };
  const codeGenResult = useStore((state: any) => state.codeGenResult);
  const setCodeGenResult = useStore((state: any) => state.setCodeGenResult);
  const codeGenLoading = useStore((state: any) => state.codeGenLoading);
  const setCodeGenLoading = useStore((state: any) => state.setCodeGenLoading);
  const codeGenError = useStore((state: any) => state.codeGenError);
  const setCodeGenError = useStore((state: any) => state.setCodeGenError);
  const proposedRefinedResult = useStore((state: any) => state.proposedRefinedResult);
  const setProposedRefinedResult = useStore((state: any) => state.setProposedRefinedResult);
  const [isSchemaInspectorOpen, setIsSchemaInspectorOpen] = useState(false);
  const [localSchema, setLocalSchema] = useState<any>(null);

  // Custom hooks for keydown shortcuts and autosaving
  useKeyboardShortcuts();
  useAutosave(serializeDocument);




  const handleRefineCode = useCallback(async (instruction: string) => {
    if (!codeGenResult || !codeGenResult.pipeline?.normalizedSchema) {
      setCodeGenError("No active UI schema to refine. Generate code first.");
      return;
    }
    setCodeGenError(null);
    setCodeGenLoading(true);
    try {
      const payload = {
        normalizedSchema: codeGenResult.pipeline.normalizedSchema,
        files: codeGenResult.generated?.files || [],
        instruction,
        stack: "react-tailwind",
      };
      const response = await refineGeneratedCode(payload);
      if (response.success && response.generated) {
        setProposedRefinedResult(response.generated);
      } else {
        throw new Error("Invalid response received from code refinement.");
      }
    } catch (err: any) {
      setCodeGenError(err.message || "Code refinement failed. Please try again.");
    } finally {
      setCodeGenLoading(false);
    }
  }, [codeGenResult]);

  const handleAcceptRefinement = useCallback(() => {
    if (proposedRefinedResult) {
      setCodeGenResult((prev: any) => ({
        ...prev,
        generated: proposedRefinedResult,
      }));
      setProposedRefinedResult(null);
      showToast("Refinement changes applied successfully.", "success");
    }
  }, [proposedRefinedResult, showToast]);

  const handleRejectRefinement = useCallback(() => {
    setProposedRefinedResult(null);
    showToast("Refinement changes discarded.", "info");
  }, [showToast]);

  const handleInspectSchema = useCallback(() => {
    const doc = serializeDocument();

    // Spawn Web Worker dynamically to keep main-thread responsive
    const worker = new Worker(
      new URL("../workers/schema.worker.ts", import.meta.url),
      { type: "module" }
    );

    worker.postMessage({ doc });

    worker.onmessage = (e) => {
      const { success, schema, error } = e.data;
      if (success) {
        setLocalSchema(schema);
        setIsSchemaInspectorOpen(true);
      } else {
        showToast("Schema extraction failed: " + error, "error");
      }
      worker.terminate();
    };

    worker.onerror = (err) => {
      showToast("Worker calculation error", "error");
      worker.terminate();
    };
  }, [serializeDocument, showToast]);

  useEffect(() => {
    const onGenerate = () => handleGenerateCode();
    const onInspect = () => handleInspectSchema();
    const onAddShape = (e: Event) => {
      const shape = (e as CustomEvent<{ shape: string }>).detail?.shape;
      if (shape) addShape(shape);
    };
    const onAddText = (e: Event) => {
      const text = (e as CustomEvent<{ text: string }>).detail?.text;
      addText(text || "Double click to edit");
    };
    const onRefine = (e: Event) => {
      const prompt = (e as CustomEvent<{ prompt: string }>).detail?.prompt;
      if (prompt) handleRefineCode(prompt);
    };
    const onAcceptRefinement = () => handleAcceptRefinement();
    const onRejectRefinement = () => handleRejectRefinement();

    const onZoomIn = () => handleZoomIn();
    const onZoomOut = () => handleZoomOut();
    const onZoomFit = () => handleZoomFit();

    const onExportPNG = () => exportToPNG();
    const onExportJSON = () => exportToJSON();
    const onImportJSON = (e: Event) => {
      const changeEvent = (e as CustomEvent).detail;
      if (changeEvent) handleImportJSON(changeEvent);
    };

    window.addEventListener("trigger-generate-code", onGenerate);
    window.addEventListener("trigger-inspect-schema", onInspect);
    window.addEventListener("trigger-add-shape", onAddShape);
    window.addEventListener("trigger-add-text", onAddText);
    window.addEventListener("trigger-refine-code", onRefine);
    window.addEventListener("trigger-accept-refinement", onAcceptRefinement);
    window.addEventListener("trigger-reject-refinement", onRejectRefinement);
    window.addEventListener("trigger-zoom-in", onZoomIn);
    window.addEventListener("trigger-zoom-out", onZoomOut);
    window.addEventListener("trigger-zoom-fit", onZoomFit);
    window.addEventListener("trigger-export-png", onExportPNG);
    window.addEventListener("trigger-export-json", onExportJSON);
    window.addEventListener("trigger-import-json", onImportJSON);

    return () => {
      window.removeEventListener("trigger-generate-code", onGenerate);
      window.removeEventListener("trigger-inspect-schema", onInspect);
      window.removeEventListener("trigger-add-shape", onAddShape);
      window.removeEventListener("trigger-add-text", onAddText);
      window.removeEventListener("trigger-refine-code", onRefine);
      window.removeEventListener("trigger-accept-refinement", onAcceptRefinement);
      window.removeEventListener("trigger-reject-refinement", onRejectRefinement);
      window.removeEventListener("trigger-zoom-in", onZoomIn);
      window.removeEventListener("trigger-zoom-out", onZoomOut);
      window.removeEventListener("trigger-zoom-fit", onZoomFit);
      window.removeEventListener("trigger-export-png", onExportPNG);
      window.removeEventListener("trigger-export-json", onExportJSON);
      window.removeEventListener("trigger-import-json", onImportJSON);
    };
  }, [
    handleGenerateCode,
    handleInspectSchema,
    addShape,
    addText,
    handleRefineCode,
    handleAcceptRefinement,
    handleRejectRefinement,
    exportToPNG,
    exportToJSON,
    handleImportJSON,
  ]);


  // Canvas panning state
  const [spacePressed, setSpacePressed] = useState(false);
  const [middleMouseDown, setMiddleMouseDown] = useState(false);

  // Track spacebar keypresses globally for canvas panning
  useEffect(() => {
    const handleKeyDownGlobal = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === "INPUT" ||
        activeEl.tagName === "TEXTAREA" ||
        (activeEl as HTMLElement).isContentEditable
      );
      if (isInput) return;

      if (e.key === " ") {
        e.preventDefault();
        setSpacePressed(true);
      }
    };

    const handleKeyUpGlobal = (e: KeyboardEvent) => {
      if (e.key === " ") {
        setSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDownGlobal);
    window.addEventListener("keyup", handleKeyUpGlobal);
    return () => {
      window.removeEventListener("keydown", handleKeyDownGlobal);
      window.removeEventListener("keyup", handleKeyUpGlobal);
    };
  }, []);

  // Socket.IO Room Connection and Events synchronization
  useEffect(() => {
    if (!documentId || !accessToken) {
      setCollaborators([]);
      disconnectSocket();
      return;
    }

    const socket = initSocket(accessToken);

    socket.on("connect", () => {
      socket.emit("join-room", { documentId });
    });

    socket.on("error-msg", (data: any) => {
      showToast(data.message, "error");
    });

    socket.on("room.users", (users: any[]) => {
      const others = users.filter((u) => u.socketId !== socket.id);
      setCollaborators(others);
    });

    socket.on("user.joined", ({ socketId, user: joinedUser }: any) => {
      setCollaborators((prev) => {
        const exists = prev.some((u) => u.socketId === socketId);
        if (exists) return prev;
        return [...prev, { socketId, user: joinedUser, cursor: null, selectedElementId: null }];
      });
    });

    socket.on("user.left", ({ socketId }: any) => {
      setCollaborators((prev) => prev.filter((u) => u.socketId !== socketId));
    });

    socket.on("cursor.move", ({ socketId, x, y }: any) => {
      setCollaborators((prev) =>
        prev.map((u) => (u.socketId === socketId ? { ...u, cursor: { x, y } } : u))
      );
    });

    socket.on("selection.set", ({ socketId, elementId }: any) => {
      setCollaborators((prev) =>
        prev.map((u) => (u.socketId === socketId ? { ...u, selectedElementId: elementId } : u))
      );
    });

    socket.on("element.op", (op: any) => {
      const { type, payload } = op;
      if (type === "element.add") {
        useStore.getState().remoteAddElement(payload);
      } else if (type === "element.update") {
        useStore.getState().remoteUpdateElement(payload.id, payload.patch);
      } else if (type === "element.delete") {
        useStore.getState().remoteDeleteElement(payload.id);
      } else if (type === "element.reorder") {
        useStore.getState().remoteReorderElements(payload.from, payload.to);
      } else if (type === "canvas.update") {
        if (payload.elements !== undefined) {
          useStore.setState({ elements: payload.elements });
        }
        useStore.getState().remoteUpdateBoard(payload);
      }
    });

    return () => {
      disconnectSocket();
    };
  }, [documentId, accessToken, showToast]);

  // Emit selection set on active element changes
  useEffect(() => {
    const socket = getSocket();
    if (socket && socket.connected && documentId) {
      socket.emit("selection.set", { documentId, elementId: selectedElementId });
    }
  }, [selectedElementId, documentId]);

  // Throttled cursor emission
  const emitCursorMove = (x: number, y: number) => {
    const now = Date.now();
    if (now - lastCursorEmitRef.current > 50) {
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit("cursor.move", { documentId, x, y });
      }
      lastCursorEmitRef.current = now;
    }
  };



  // Set up resize observer to keep canvas responsive
  useEffect(() => {
    if (!boardRef.current) return;

    const updateSize = () => {
      if (boardRef.current) {
        const { clientWidth, clientHeight } = boardRef.current;
        setStageSize({
          width: clientWidth,
          height: clientHeight,
        });
      }
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



  const exportToPNG = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const originalSelected = selectedElementId;
    selectElement(null);

    setTimeout(() => {
      const dataUrl = stage.toDataURL({ pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `${documentName || "whiteboard"}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (originalSelected) selectElement(originalSelected);
      showToast("Design exported as PNG.", "success");
    }, 100);
  };

  const exportToJSON = () => {
    const docData = serializeDocument();
    const payload = {
      name: documentName,
      data: docData,
      version: documentVersion,
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(payload, null, 2)
    )}`;
    const link = document.createElement("a");
    link.download = `${documentName || "whiteboard"}.json`;
    link.href = jsonString;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Design exported as JSON.", "success");
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed || !parsed.data || !Array.isArray(parsed.data.elements)) {
          showToast("Invalid JSON format. Make sure it is a valid whiteboard design file.", "error");
          return;
        }

        if (documentId) {
          useStore.setState({
            documentName: parsed.name || documentName,
            boardWidth: parsed.data.board?.width || parsed.data.boardWidth || boardWidth,
            boardHeight: parsed.data.board?.height || parsed.data.boardHeight || boardHeight,
            backgroundColor: parsed.data.board?.background || parsed.data.backgroundColor || boardColor,
            elements: parsed.data.elements,
            isDirty: true,
            saveStatus: "idle",
          });
          const socket = getSocket();
          if (socket && socket.connected) {
            socket.emit("element.op", {
              documentId,
              op: {
                type: "canvas.update",
                payload: {
                  boardWidth: parsed.data.board?.width || parsed.data.boardWidth || boardWidth,
                  boardHeight: parsed.data.board?.height || parsed.data.boardHeight || boardHeight,
                  backgroundColor: parsed.data.board?.background || parsed.data.backgroundColor || boardColor,
                  elements: parsed.data.elements,
                },
              },
            });
          }
        } else {
          useStore.setState({
            documentName: parsed.name || "Imported Design",
            boardWidth: parsed.data.board?.width || parsed.data.boardWidth || boardWidth,
            boardHeight: parsed.data.board?.height || parsed.data.boardHeight || boardHeight,
            backgroundColor: parsed.data.board?.background || parsed.data.backgroundColor || boardColor,
            elements: parsed.data.elements,
            isDirty: false,
          });
        }
        showToast("Design imported successfully.", "success");
      } catch (err: any) {
        showToast("Failed to parse JSON file: " + err.message, "error");
      }
    };
    reader.readAsText(file);
  };

  const zoomAtPoint = (pointer: { x: number; y: number }, nextScale: number) => {
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

  const handleWheel = (e: any) => {
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

  const handleTouchMove = (e: any) => {
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


  const handleZoomFit = () => {
    setScale(1);
    const parent = boardRef.current?.parentElement;
    if (parent) {
      const containerWidth = parent.clientWidth;
      const containerHeight = parent.clientHeight;
      setPosition({
        x: Math.round((containerWidth - boardWidth) / 2),
        y: Math.round((containerHeight - boardHeight) / 2)
      });
    } else {
      setPosition({ x: 0, y: 0 });
    }
  };

  const addShape = (shapeType: string) => {
    let newElement: any = {
      id: `element-${Date.now()}`,
      visible: true,
      locked: false,
      rotation: 0,
      fill: "#2563eb",
      stroke: "#1d4ed8",
      strokeWidth: 3,
      name: shapeType,
    };

    if (shapeType === "Circle") {
      newElement = {
        ...newElement,
        type: "circle",
        x: boardWidth / 2,
        y: boardHeight / 2,
        radius: 60,
      };
    } else if (shapeType === "Square") {
      newElement = {
        ...newElement,
        type: "rect",
        x: boardWidth / 2 - 60,
        y: boardHeight / 2 - 60,
        width: 120,
        height: 120,
      };
    } else if (shapeType === "Rectangle") {
      newElement = {
        ...newElement,
        type: "rect",
        x: boardWidth / 2 - 80,
        y: boardHeight / 2 - 50,
        width: 160,
        height: 100,
      };
    } else if (shapeType === "Triangle") {
      newElement = {
        ...newElement,
        type: "triangle",
        x: boardWidth / 2,
        y: boardHeight / 2,
        radius: 60,
      };
    } else if (shapeType === "Diamond") {
      newElement = {
        ...newElement,
        type: "diamond",
        x: boardWidth / 2,
        y: boardHeight / 2,
        radius: 60,
      };
    } else if (shapeType === "Line") {
      newElement = {
        ...newElement,
        type: "line",
        x: boardWidth / 2 - 80,
        y: boardHeight / 2 - 5,
        width: 160,
        height: 10,
        fill: "#2563eb",
        stroke: "#2563eb",
        strokeWidth: 0,
      };
    } else if (shapeType === "Frame") {
      newElement = {
        ...newElement,
        type: "rect",
        x: boardWidth / 2 - 150,
        y: boardHeight / 2 - 100,
        width: 300,
        height: 200,
        fill: "transparent",
        stroke: "#a1a1aa",
        strokeWidth: 2,
        name: "Frame",
      };
    }

    addElement(newElement);
    setActiveTool("Shapes");
    selectElement(newElement.id);
  };

  const addText = (text: string) => {
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


  const changeBackground = (color: string) => {
    setBackgroundColor(color);
  };

  const updateBoardWidth = (value: number) => {
    const nextWidth = clamp(value || MIN_BOARD_WIDTH, MIN_BOARD_WIDTH, 5000);
    setBoardWidth(nextWidth);
  };

  const updateBoardHeight = (value: number) => {
    const nextHeight = clamp(value || MIN_BOARD_HEIGHT, MIN_BOARD_HEIGHT, 5000);
    setBoardHeight(nextHeight);
  };

  const handleShapeClick = (id: string) => {
    selectElement(id);
  };

  const handleStageMouseDown = (e: any) => {
    if (userRole === "viewer") return;
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

  const handleMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const pointer = stage?.getPointerPosition();
    if (pointer) {
      const boardX = (pointer.x - position.x) / scale;
      const boardY = (pointer.y - position.y) / scale;
      emitCursorMove(boardX, boardY);
    }

    if (!isDrawing || !draftElement) return;
    if (!pointer) return;
    setDraftElement({
      ...draftElement,
      points: [...draftElement.points, pointer.x, pointer.y],
    });
  };

  const handleMouseUp = () => {
    setMiddleMouseDown(false);
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

  const renderRectangle = (item: any) => {
    const commonProps = {
      x: item.x,
      y: item.y,
      width: Math.max(30, item.width),
      height: Math.max(30, item.height),
      rotation: item.rotation || 0,
      fill: item.fill,
      stroke: item.stroke,
      strokeWidth: item.strokeWidth,
      draggable: !item.locked && userRole !== "viewer",
      onDragMove: (e: any) => updateElement(item.id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) }, false),
      onDragEnd: (e: any) => updateElement(item.id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) }, true),
      onClick: () => handleShapeClick(item.id),
      onTap: () => handleShapeClick(item.id),
      ref: (node: any) => {
        if (node) objectRefs.current[item.id] = node;
      },
      onTransform: (e: any) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        updateElement(item.id, {
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          width: Math.round(Math.max(30, item.width * scaleX)),
          height: Math.round(Math.max(30, item.height * scaleY)),
          rotation: Math.round(node.rotation()),
        }, false);
      },
      onTransformEnd: (e: any) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        updateElement(item.id, {
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          width: Math.round(Math.max(30, item.width * scaleX)),
          height: Math.round(Math.max(30, item.height * scaleY)),
          rotation: Math.round(node.rotation()),
        }, true);
        node.scaleX(1);
        node.scaleY(1);
      },
    };
    return <Rect key={item.id} {...commonProps} />;
  };

  const renderCircle = (item: any) => {
    const commonProps = {
      x: item.x,
      y: item.y,
      radius: Math.max(10, item.radius),
      rotation: item.rotation || 0,
      fill: item.fill,
      stroke: item.stroke,
      strokeWidth: item.strokeWidth,
      draggable: !item.locked && userRole !== "viewer",
      onDragMove: (e: any) => updateElement(item.id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) }, false),
      onDragEnd: (e: any) => updateElement(item.id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) }, true),
      onClick: () => handleShapeClick(item.id),
      onTap: () => handleShapeClick(item.id),
      ref: (node: any) => {
        if (node) objectRefs.current[item.id] = node;
      },
      onTransform: (e: any) => {
        const node = e.target;
        const scaleX = node.scaleX();
        updateElement(item.id, {
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          radius: Math.round(Math.max(10, item.radius * scaleX)),
          rotation: Math.round(node.rotation()),
        }, false);
      },
      onTransformEnd: (e: any) => {
        const node = e.target;
        const scaleX = node.scaleX();
        updateElement(item.id, {
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          radius: Math.round(Math.max(10, item.radius * scaleX)),
          rotation: Math.round(node.rotation()),
        }, true);
        node.scaleX(1);
        node.scaleY(1);
      },
    };
    return <Circle key={item.id} {...commonProps} />;
  };

  const renderTriangle = (item: any) => {
    const commonProps = {
      x: item.x,
      y: item.y,
      sides: 3,
      radius: Math.max(10, item.radius),
      rotation: item.rotation || 0,
      fill: item.fill,
      stroke: item.stroke,
      strokeWidth: item.strokeWidth,
      draggable: !item.locked && userRole !== "viewer",
      onDragMove: (e: any) => updateElement(item.id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) }, false),
      onDragEnd: (e: any) => updateElement(item.id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) }, true),
      onClick: () => handleShapeClick(item.id),
      onTap: () => handleShapeClick(item.id),
      ref: (node: any) => {
        if (node) objectRefs.current[item.id] = node;
      },
      onTransform: (e: any) => {
        const node = e.target;
        const scaleX = node.scaleX();
        updateElement(item.id, {
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          radius: Math.round(Math.max(10, item.radius * scaleX)),
          rotation: Math.round(node.rotation()),
        }, false);
      },
      onTransformEnd: (e: any) => {
        const node = e.target;
        const scaleX = node.scaleX();
        updateElement(item.id, {
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          radius: Math.round(Math.max(10, item.radius * scaleX)),
          rotation: Math.round(node.rotation()),
        }, true);
        node.scaleX(1);
        node.scaleY(1);
      },
    };
    return <RegularPolygon key={item.id} {...commonProps} />;
  };

  const renderDiamond = (item: any) => {
    const commonProps = {
      x: item.x,
      y: item.y,
      sides: 4,
      radius: Math.max(10, item.radius),
      rotation: item.rotation || 45,
      fill: item.fill,
      stroke: item.stroke,
      strokeWidth: item.strokeWidth,
      draggable: !item.locked && userRole !== "viewer",
      onDragMove: (e: any) => updateElement(item.id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) }, false),
      onDragEnd: (e: any) => updateElement(item.id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) }, true),
      onClick: () => handleShapeClick(item.id),
      onTap: () => handleShapeClick(item.id),
      ref: (node: any) => {
        if (node) objectRefs.current[item.id] = node;
      },
      onTransform: (e: any) => {
        const node = e.target;
        const scaleX = node.scaleX();
        updateElement(item.id, {
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          radius: Math.round(Math.max(10, item.radius * scaleX)),
          rotation: Math.round(node.rotation()),
        }, false);
      },
      onTransformEnd: (e: any) => {
        const node = e.target;
        const scaleX = node.scaleX();
        updateElement(item.id, {
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          radius: Math.round(Math.max(10, item.radius * scaleX)),
          rotation: Math.round(node.rotation()),
        }, true);
        node.scaleX(1);
        node.scaleY(1);
      },
    };
    return <RegularPolygon key={item.id} {...commonProps} />;
  };

  const renderLine = (item: any) => {
    const commonProps = {
      x: item.x,
      y: item.y,
      width: Math.max(10, item.width),
      height: Math.max(2, item.height),
      rotation: item.rotation || 0,
      fill: item.stroke,
      stroke: item.stroke,
      strokeWidth: 0,
      draggable: !item.locked && userRole !== "viewer",
      onDragMove: (e: any) => updateElement(item.id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) }, false),
      onDragEnd: (e: any) => updateElement(item.id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) }, true),
      onClick: () => handleShapeClick(item.id),
      onTap: () => handleShapeClick(item.id),
      ref: (node: any) => {
        if (node) objectRefs.current[item.id] = node;
      },
      onTransform: (e: any) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        updateElement(item.id, {
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          width: Math.round(Math.max(10, item.width * scaleX)),
          height: Math.round(Math.max(2, item.height * scaleY)),
          rotation: Math.round(node.rotation()),
        }, false);
      },
      onTransformEnd: (e: any) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        updateElement(item.id, {
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          width: Math.round(Math.max(10, item.width * scaleX)),
          height: Math.round(Math.max(2, item.height * scaleY)),
          rotation: Math.round(node.rotation()),
        }, true);
        node.scaleX(1);
        node.scaleY(1);
      },
    };
    return <Rect key={item.id} {...commonProps} />;
  };

  const renderTextItem = (item: any) => (
    <Text
      key={item.id}
      x={item.x}
      y={item.y}
      text={item.text}
      width={item.width}
      fontSize={item.fontSize}
      fontFamily={item.fontFamily}
      fontStyle={item.fontWeight}
      fill={item.fill || "#000"}
      draggable={!item.locked && userRole !== "viewer"}
      onDragMove={(e: any) => updateElement(item.id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) }, false)}
      onDragEnd={(e: any) => updateElement(item.id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) }, true)}
      onClick={() => handleShapeClick(item.id)}
      onTap={() => handleShapeClick(item.id)}
      onDblClick={() => {
        const newText = window.prompt("Edit text", item.text);
        if (newText !== null) {
          updateElement(item.id, { text: newText }, true);
        }
      }}
      ref={(node: any) => {
        if (node) objectRefs.current[item.id] = node;
      }}
      onTransform={(e: any) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const newWidth = Math.max(40, node.width() * scaleX);
        updateElement(item.id, {
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          width: Math.round(newWidth),
          rotation: Math.round(node.rotation()),
        }, false);
      }}
      onTransformEnd={(e: any) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const newWidth = Math.max(40, node.width() * scaleX);
        node.scaleX(1);
        node.scaleY(1);
        transformerRef.current?.forceUpdate();
        updateElement(item.id, {
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          width: Math.round(newWidth),
          rotation: Math.round(node.rotation()),
        }, true);
      }}
    />
  );

  const renderPathItem = (item: any) => (
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
      ref={(node: any) => {
        if (node) objectRefs.current[item.id] = node;
      }}
    />
  );

  const renderImageElement = (item: any) => {
    const commonProps = {
      item,
      isLocked: item.locked || userRole === "viewer",
      onSelect: () => handleShapeClick(item.id),
      onDragMove: (e: any) => updateElement(item.id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) }, false),
      onDragEnd: (e: any) => updateElement(item.id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) }, true),
      refCallback: (node: any) => {
        if (node) objectRefs.current[item.id] = node;
      },
      onTransform: (e: any) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        updateElement(item.id, {
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          width: Math.round(Math.max(30, (item.width || 200) * scaleX)),
          height: Math.round(Math.max(30, (item.height || 200) * scaleY)),
          rotation: Math.round(node.rotation()),
        }, false);
      },
      onTransformEnd: (e: any) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        updateElement(item.id, {
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          width: Math.round(Math.max(30, (item.width || 200) * scaleX)),
          height: Math.round(Math.max(30, (item.height || 200) * scaleY)),
          rotation: Math.round(node.rotation()),
        }, true);
        node.scaleX(1);
        node.scaleY(1);
      },
    };
    return <CanvasImage key={item.id} {...commonProps} />;
  };

  const renderItem = (item: any) => {
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
      case "image":
        return renderImageElement(item);
      default:
        return null;
    }
  };

  const selectedItem = elements.find((item: any) => item.id === selectedElementId) || null;

  return (
    <section className="canvas-base">
      <div className="canvas-workspace">
        <div ref={boardRef} className="canvas-base__board">
          {/* Live Collaborators Avatars (Top Right Canvas Overlay) */}
          {collaborators.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "18px",
                right: "18px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 12px",
                borderRadius: "14px",
                background: "var(--surface-elevated)",
                backdropFilter: "blur(12px)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-sm)",
                zIndex: 100,
              }}
            >
              {collaborators.map((u) => {
                const initial = u.user?.email ? u.user.email.charAt(0).toUpperCase() : "?";
                const color = u.user?.color || "#3b82f6";
                return (
                  <div
                    key={u.socketId}
                    title={`${u.user?.email || "Anonymous"} (${u.user?.role || "collaborator"})`}
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: color,
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: "700",
                      border: "2px solid #ffffff",
                      boxShadow: "0 4px 10px rgba(15, 23, 42, 0.15)",
                      cursor: "default",
                    }}
                  >
                    {initial}
                  </div>
                );
              })}
            </div>
          )}

          {/* Collaborator Cursor Overlays */}
          {collaborators.map((u) => {
            if (!u.cursor) return null;
            const left = position.x + u.cursor.x * scale;
            const top = position.y + u.cursor.y * scale;
            const cursorColor = u.user?.color || "#3b82f6";
            return (
              <div
                key={u.socketId}
                style={{
                  position: "absolute",
                  left: `${left}px`,
                  top: `${top}px`,
                  pointerEvents: "none",
                  transform: "translate(-2px, -2px)",
                  zIndex: 99,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  transition: "left 0.08s ease-out, top 0.08s ease-out",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{
                    color: cursorColor,
                    filter: "drop-shadow(0 2px 4px rgba(15, 23, 42, 0.3))",
                  }}
                >
                  <path
                    d="M5.65376 12.3963L15.9327 2.11732C16.485 1.56503 17.4116 1.87977 17.5222 2.65342L18.9959 12.9691C19.0968 13.6756 18.3244 14.1953 17.6975 13.8291L13.784 11.5413L10.3705 14.9548C9.98 15.3453 9.34683 15.3453 8.95631 14.9548L5.65376 13.6523C5.07476 13.4243 5.07476 12.6243 5.65376 12.3963Z"
                    fill="currentColor"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                </svg>
                <div
                  style={{
                    marginLeft: "12px",
                    marginTop: "12px",
                    backgroundColor: cursorColor,
                    color: "#ffffff",
                    fontSize: "10px",
                    fontWeight: "700",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    whiteSpace: "nowrap",
                    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.25)",
                  }}
                >
                  {u.user?.email || "Anonymous"}
                </div>
              </div>
            );
          })}

          {stageSize.width > 0 && stageSize.height > 0 && (
            <Stage
              ref={stageRef}
              width={stageSize.width}
              height={stageSize.height}
              x={position.x}
              y={position.y}
              scaleX={scale}
              scaleY={scale}
              draggable={spacePressed || middleMouseDown}
              style={{ cursor: spacePressed ? (middleMouseDown ? "grabbing" : "grab") : "default" }}
              onWheel={handleWheel}
              onWheelZ={handleWheel}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleStageTouchEnd}
              onMouseDown={(e: any) => {
                if (e.evt.button === 1) {
                  e.evt.preventDefault();
                  setMiddleMouseDown(true);
                } else {
                  handleStageMouseDown(e);
                }
              }}
              onTouchStart={handleStageMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onDragMove={(e: any) => {
                if (e.target === stageRef.current) {
                  setPosition({ x: e.target.x(), y: e.target.y() });
                }
              }}
              onDragEnd={(e: any) => {
                if (e.target === stageRef.current) {
                  setPosition({ x: e.target.x(), y: e.target.y() });
                }
                setMiddleMouseDown(false);
              }}
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
                {elements.map((item: any) => renderItem(item))}
                {draftElement && renderPathItem(draftElement)}
                {selectedElementId && userRole !== "viewer" && (
                  <Transformer
                    key={elements.find((el: any) => el.id === selectedElementId)?.type === "text" ? "text-transformer" : "shape-transformer"}
                    ref={transformerRef}
                    rotateEnabled={true}
                    enabledAnchors={elements.find((el: any) => el.id === selectedElementId)?.type === "text"
                      ? ["middle-left", "middle-right"]
                      : ["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right", "top-center", "bottom-center"]
                    }
                    boundBoxFunc={(oldBox, newBox) => {
                      if (elements.find((el: any) => el.id === selectedElementId)?.type === "text") {
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
            let badgeBg = "var(--surface-elevated)";

            if (saveStatus === "saving") {
              badgeText = "Saving...";
              badgeColor = "var(--accent)";
            } else if (saveStatus === "conflict") {
              badgeText = "⚠ Version Conflict";
              badgeColor = "var(--danger)";
              badgeBg = "rgba(239, 68, 68, 0.15)";
            } else if (saveStatus === "error") {
              badgeText = "⚠ Save Failed";
              badgeColor = "var(--danger)";
            } else if (saveStatus === "saved" && !isDirty) {
              badgeText = "✓ Saved";
              badgeColor = "var(--success)";
            } else if (isDirty) {
              badgeText = "Unsaved Changes";
              badgeColor = "var(--warning)";
            } else {
              badgeText = "✓ Saved";
              badgeColor = "var(--success)";
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
                  boxShadow: "var(--shadow-sm)",
                  color: badgeColor,
                  fontSize: "12px",
                  fontWeight: "700",
                  pointerEvents: "none",
                  border: saveStatus === "conflict" ? "1px solid var(--danger)" : "1px solid var(--border)",
                  transition: "all 0.3s ease",
                  zIndex: 10,
                }}
              >
                {badgeText}
              </div>
            );
          })()}


        </div>
      </div>
    </section>
  );
});

export default CanvasBase;
