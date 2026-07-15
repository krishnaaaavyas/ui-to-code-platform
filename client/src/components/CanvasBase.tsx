import React, { useEffect, useRef, useState, useCallback } from "react";
import { Circle, Layer, Line, Rect, RegularPolygon, Stage, Text, Transformer, Image as KonvaImage } from "react-konva";
import SideMenu from "./SideMenu";
import CodePreviewPanel from "./CodePreviewPanel";
import { useStore } from "../store/useStore";
import { updateDocument } from "../api/documents";
import { generateCodeFromCanvas, refineGeneratedCode } from "../api/ai";
import { initSocket, getSocket, disconnectSocket } from "../lib/socket";

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

export default function CanvasBase() {
  const boardRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const objectRefs = useRef<Record<string, any>>({});
  const lastPinchDistanceRef = useRef(0);

  const [menuCollapsed, setMenuCollapsed] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

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

  // ── Design-to-Code state ──────────────────────────────────────────────
  const [codePreviewOpen, setCodePreviewOpen] = useState(false);
  const [codeGenLoading, setCodeGenLoading] = useState(false);
  const [codeGenResult, setCodeGenResult] = useState<any>(null);
  const [proposedRefinedResult, setProposedRefinedResult] = useState<any>(null);
  const [codeGenError, setCodeGenError] = useState<string | null>(null);
  const [isSchemaInspectorOpen, setIsSchemaInspectorOpen] = useState(false);
  const [localSchema, setLocalSchema] = useState<any>(null);

  const handleGenerateCode = useCallback(async () => {
    if (elements.length === 0) {
      setCodeGenError("Your canvas is empty. Add some shapes, text, or images first.");
      setCodePreviewOpen(true);
      return;
    }
    setCodeGenError(null);
    setCodeGenResult(null);
    setProposedRefinedResult(null);
    setCodeGenLoading(true);
    setCodePreviewOpen(true);
    try {
      const payload = {
        elements,
        boardConfig: {
          boardWidth,
          boardHeight,
          backgroundColor: boardColor,
        },
      };
      const result = await generateCodeFromCanvas(payload);
      setCodeGenResult(result);
    } catch (err: any) {
      setCodeGenError(err.message || "Code generation failed. Please try again.");
    } finally {
      setCodeGenLoading(false);
    }
  }, [elements, boardWidth, boardHeight, boardColor]);

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
          manual: false,
        };
        const updatedDoc = await updateDocument(documentId, payload);
        useStore.setState({
          isDirty: false,
          saveStatus: "saved",
          documentVersion: updatedDoc.version,
          saveError: null,
        });
      } catch (e: any) {
        console.error("Autosave failed:", e);
        if (e.status === 409 || e.message === "conflict") {
          useStore.setState({
            saveStatus: "conflict",
            saveError: "Version conflict: This design has been updated elsewhere. Please reload or duplicate.",
          });
          showToast("Autosave Conflict: This file was edited elsewhere. Save failed.", "error");
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
    showToast,
  ]);

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

  // Keyboard shortcuts for Undo/Redo and Delete Selected
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === "INPUT" || 
        activeEl.tagName === "TEXTAREA" || 
        (activeEl as HTMLElement).isContentEditable
      );

      if (isInput) return;

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (userRole === "viewer") return;
        if (e.shiftKey) {
          useStore.getState().redo();
          const socket = getSocket();
          if (socket && socket.connected) {
            socket.emit("element.op", {
              documentId,
              op: { type: "canvas.update", payload: { elements: useStore.getState().elements } }
            });
          }
        } else {
          useStore.getState().undo();
          const socket = getSocket();
          if (socket && socket.connected) {
            socket.emit("element.op", {
              documentId,
              op: { type: "canvas.update", payload: { elements: useStore.getState().elements } }
            });
          }
        }
      } else if (cmdOrCtrl && e.key.toLowerCase() === "y") {
        e.preventDefault();
        if (userRole === "viewer") return;
        useStore.getState().redo();
        const socket = getSocket();
        if (socket && socket.connected) {
          socket.emit("element.op", {
            documentId,
            op: { type: "canvas.update", payload: { elements: useStore.getState().elements } }
          });
        }
      } else if (cmdOrCtrl && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (userRole === "viewer") return;
        if (selectedElementId) {
          useStore.getState().duplicateElement(selectedElementId);
        }
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (userRole === "viewer") return;
        if (selectedElementId) {
          e.preventDefault();
          deleteElement(selectedElementId);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        selectElement(null);
        setDraftElement(null);
        setIsDrawing(false);
      } else if (!cmdOrCtrl) {
        if (e.key.toLowerCase() === "v") {
          e.preventDefault();
          useStore.getState().setActiveTool("Shapes");
        } else if (e.key.toLowerCase() === "t") {
          e.preventDefault();
          useStore.getState().setActiveTool("Text");
        } else if (e.key.toLowerCase() === "p") {
          e.preventDefault();
          useStore.getState().setActiveTool("Stroke");
        } else if (e.key.toLowerCase() === "b") {
          e.preventDefault();
          useStore.getState().setActiveTool("Background");
        } else if (e.key.toLowerCase() === "d") {
          e.preventDefault();
          useStore.getState().setActiveTool("Designs");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedElementId, deleteElement, selectElement, setDraftElement, setIsDrawing, userRole, documentId]);

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
            updateElement(selectedElementId, { fill: color, stroke: color }, true);
          }}
          onExportPNG={exportToPNG}
          onExportJSON={exportToJSON}
          onImportJSON={handleImportJSON}
        />

        {/* ── Code Preview Panel (slide-over drawer) ── */}
        <CodePreviewPanel
          isOpen={codePreviewOpen}
          onClose={() => setCodePreviewOpen(false)}
          result={codeGenResult}
          proposedRefinedResult={proposedRefinedResult}
          isLoading={codeGenLoading}
          error={codeGenError}
          onRefine={handleRefineCode}
          onRegenerate={handleGenerateCode}
          onAcceptRefinement={handleAcceptRefinement}
          onRejectRefinement={handleRejectRefinement}
        />

        <div ref={boardRef} className="canvas-base__board">
          {/* Live Collaborators + Generate Code Header */}
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
              background: "rgba(15, 23, 42, 0.45)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25)",
              zIndex: 100,
            }}
          >
            {/* Generate Code button */}
            {user && (
              <button
                id="generate-code-btn"
                type="button"
                onClick={handleGenerateCode}
                title="Convert this design to React + Tailwind code"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "7px 14px",
                  borderRadius: "10px",
                  background: codeGenLoading
                    ? "rgba(99,102,241,0.25)"
                    : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  border: "1px solid rgba(99,102,241,0.4)",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: codeGenLoading ? "not-allowed" : "pointer",
                  letterSpacing: "0.03em",
                  boxShadow: codeGenLoading ? "none" : "0 4px 16px rgba(99,102,241,0.35)",
                  transition: "all 0.2s ease",
                  opacity: codeGenLoading ? 0.7 : 1,
                }}
                disabled={codeGenLoading}
                onMouseEnter={(e) => {
                  if (!codeGenLoading) {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(99,102,241,0.45)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow = codeGenLoading ? "none" : "0 4px 16px rgba(99,102,241,0.35)";
                }}
              >
                {codeGenLoading ? (
                  <>
                    <div
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "#fff",
                        animation: "spin 0.7s linear infinite",
                        flexShrink: 0,
                      }}
                    />
                    Generating...
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                      <polyline points="16,18 22,12 16,6" />
                      <polyline points="8,6 2,12 8,18" />
                    </svg>
                    Generate Code
                  </>
                )}
              </button>
            )}
            {/* Inspect UI Schema button */}
            {user && (
              <button
                id="inspect-schema-btn"
                type="button"
                onClick={handleInspectSchema}
                title="Inspect raw frontend-transformed UI Schema"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "7px 14px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#cbd5e1",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  letterSpacing: "0.03em",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
                Inspect Schema
              </button>
            )}
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

        {/* Schema Inspector Modal */}
        {isSchemaInspectorOpen && (
          <>
            <div
              onClick={() => setIsSchemaInspectorOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(6px)",
                zIndex: 1000,
              }}
            />
            <div
              style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "min(640px, 90vw)",
                maxHeight: "80vh",
                background: "linear-gradient(160deg, #0f172a 0%, #0b1120 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "16px",
                boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
                zIndex: 1001,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "rgba(255,255,255,0.01)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "8px",
                      background: "rgba(99,102,241,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    </svg>
                  </div>
                  <span style={{ fontSize: "14px", fontWeight: "700", color: "#f1f5f9" }}>
                    UI Schema Inspector
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSchemaInspectorOpen(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#64748b",
                    cursor: "pointer",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div style={{ flex: 1, overflow: "auto", padding: "20px" }}>
                <p style={{ margin: "0 0 12px", fontSize: "12px", color: "#64748b", lineHeight: "1.5" }}>
                  This is the raw, frontend-extracted semantic AST generated by the canvas transformer. It is normalized and enriched downstream by the AI generation pipeline.
                </p>
                <pre
                  style={{
                    margin: 0,
                    padding: "14px",
                    background: "rgba(8,12,22,0.7)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "10px",
                    fontSize: "11px",
                    color: "#cbd5e1",
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    overflowX: "auto",
                    maxHeight: "380px",
                  }}
                >
                  {JSON.stringify(localSchema, null, 2)}
                </pre>
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: "14px 20px",
                  borderTop: "1px solid rgba(255,255,255,0.07)",
                  background: "rgba(255,255,255,0.01)",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsSchemaInspectorOpen(false)}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "8px",
                    color: "#cbd5e1",
                    padding: "6px 16px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
