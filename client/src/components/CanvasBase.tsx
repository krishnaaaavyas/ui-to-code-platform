import React, { useEffect, useRef, useState, useCallback } from "react";
import { Circle, Layer, Line, Rect, RegularPolygon, Stage, Text, Transformer, Image as KonvaImage } from "react-konva";
import SideMenu from "./SideMenu";
import CodePreviewPanel from "./CodePreviewPanel";
import Modal from "./Modal";
import { useStore } from "../store/useStore";
import { updateDocument } from "../api/documents";
import { generateCodeFromCanvas, refineGeneratedCode } from "../api/ai";
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
      width={item.width}
      height={item.height}
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

const MIN_SCALE = 0.1;
const MAX_SCALE = 10;
const SCALE_STEP = 1.1;

export default function CanvasBase() {
  const boardRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const objectRefs = useRef<Record<string, any>>({});
  const lastPinchDistanceRef = useRef(0);

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
  }, [codeGenResult, setCodeGenError, setCodeGenLoading, setProposedRefinedResult]);

  const handleAcceptRefinement = useCallback(() => {
    if (proposedRefinedResult) {
      setCodeGenResult((prev: any) => ({
        ...prev,
        generated: proposedRefinedResult,
      }));
      setProposedRefinedResult(null);
      showToast("Refinement changes applied successfully.", "success");
    }
  }, [proposedRefinedResult, setCodeGenResult, setProposedRefinedResult, showToast]);

  const handleRejectRefinement = useCallback(() => {
    setProposedRefinedResult(null);
    showToast("Refinement changes discarded.", "info");
  }, [setProposedRefinedResult, showToast]);

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
  }, [elements, boardWidth, boardHeight, boardColor, setCodeGenError, setCodeGenResult, setProposedRefinedResult, setCodeGenLoading, setCodePreviewOpen]);

  useEffect(() => {
    const parent = boardRef.current;
    if (!parent) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setStageSize({
          width: parent.clientWidth,
          height: parent.clientHeight,
        });
      }
    });

    observer.observe(parent);
    setStageSize({
      width: parent.clientWidth,
      height: parent.clientHeight,
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Realtime collaboration socket flow
    if (!documentId || !accessToken) return;

    const socket = initSocket(accessToken);

    socket.on("collaborator-list", (list: any[]) => {
      setCollaborators(list.filter((c) => c.userId !== user?.id));
    });

    socket.on("collaborator-cursor", (data: any) => {
      setCollaborators((prev) =>
        prev.map((c) => (c.userId === data.userId ? { ...c, cursor: data.cursor } : c))
      );
    });

    socket.on("collaborator-action", (data: any) => {
      if (data.userId === user?.id) return;
      if (data.type === "element-update") {
        useStore.getState().updateElement(data.elementId, data.patch, false);
      } else if (data.type === "element-add") {
        useStore.getState().addElement(data.element);
      } else if (data.type === "element-delete") {
        useStore.getState().deleteElement(data.elementId);
      } else if (data.type === "document-update") {
        if (data.patch.boardWidth) useStore.getState().setBoardWidth(data.patch.boardWidth);
        if (data.patch.boardHeight) useStore.getState().setBoardHeight(data.patch.boardHeight);
        if (data.patch.backgroundColor) useStore.getState().setBackgroundColor(data.patch.backgroundColor);
      }
    });

    return () => {
      disconnectSocket();
    };
  }, [documentId, accessToken, user]);

  const handleStageMouseMove = (e: any) => {
    const stage = stageRef.current;
    if (!stage) return;
    const socket = getSocket();
    if (!socket) return;

    const now = Date.now();
    if (now - lastCursorEmitRef.current < 80) return; // limit rate
    lastCursorEmitRef.current = now;

    const pointer = stage.getPointerPosition();
    if (pointer) {
      const x = (pointer.x - position.x) / scale;
      const y = (pointer.y - position.y) / scale;
      socket.emit("cursor-move", { x, y });
    }
  };

  const handleShapeClick = (id: string) => {
    selectElement(id);
  };

  const handleStageClick = (e: any) => {
    if (e.target === e.target.getStage()) {
      selectElement(null);
    }
  };

  const updateBoardWidth = (width: number) => {
    setBoardWidth(width);
  };

  const updateBoardHeight = (height: number) => {
    setBoardHeight(height);
  };

  const changeBackground = (color: string) => {
    setBackgroundColor(color);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const doc = JSON.parse(event.target?.result as string);
        useStore.getState().loadDocument(doc);
        showToast("Design imported successfully.", "success");
      } catch (err) {
        showToast("Failed to parse JSON file.", "error");
      }
    };
    reader.readAsText(file);
  };

  const exportToJSON = () => {
    const doc = serializeDocument();
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(doc, null, 2)
    )}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `${documentName || "whiteboard"}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("Design exported as JSON.", "success");
  };

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
      link.remove();
      selectElement(originalSelected);
      showToast("Design exported as PNG.", "success");
    }, 50);
  };

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

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
      x: boardWidth / 2 - 60,
      y: boardHeight / 2 - 20,
      width: 120,
      height: 40,
      text,
      fontSize: 14,
      fontFamily: "system-ui",
      fill: "#000000",
      visible: true,
      locked: false,
      rotation: 0,
    };
    addElement(newElement);
    setActiveTool("Text");
    selectElement(newElement.id);
  };



  const getDistance = (p1: any, p2: any) =>
    Math.sqrt(Math.pow(p2.clientX - p1.clientX, 2) + Math.pow(p2.clientY - p1.clientY, 2));

  const getCenter = (p1: any, p2: any) => ({
    x: (p1.clientX + p2.clientX) / 2,
    y: (p1.clientY + p2.clientY) / 2,
  });

  const renderRect = (item: any) => {
    const commonProps = {
      x: item.x,
      y: item.y,
      width: Math.max(10, item.width),
      height: Math.max(10, item.height),
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
          width: Math.round(Math.max(10, item.width * scaleX)),
          height: Math.round(Math.max(10, item.height * scaleY)),
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
          height: Math.round(Math.max(10, item.height * scaleY)),
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

  const renderLine = (item: any) => {
    const commonProps = {
      x: item.x,
      y: item.y,
      points: item.points || [0, 0, item.width, 0],
      rotation: item.rotation || 0,
      stroke: item.stroke || "#000000",
      strokeWidth: item.strokeWidth || 5,
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
          width: Math.round(Math.max(10, item.width * scaleX)),
          rotation: Math.round(node.rotation()),
        }, false);
      },
      onTransformEnd: (e: any) => {
        const node = e.target;
        const scaleX = node.scaleX();
        updateElement(item.id, {
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          width: Math.round(Math.max(10, item.width * scaleX)),
          rotation: Math.round(node.rotation()),
        }, true);
        node.scaleX(1);
      },
    };
    return <Line key={item.id} {...commonProps} />;
  };

  const renderTextItem = (item: any) => {
    const commonProps = {
      x: item.x,
      y: item.y,
      text: item.text,
      fontSize: item.fontSize,
      fontFamily: item.fontFamily,
      fill: item.fill || "#000000",
      draggable: !item.locked && userRole !== "viewer",
      onDragMove: (e: any) => updateElement(item.id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) }, false),
      onDragEnd: (e: any) => updateElement(item.id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) }, true),
      onClick: () => handleShapeClick(item.id),
      onTap: () => handleShapeClick(item.id),
      onDblClick: () => {
        const newText = window.prompt("Edit text", item.text);
        if (newText !== null) {
          updateElement(item.id, { text: newText }, true);
        }
      },
      ref: (node: any) => {
        if (node) objectRefs.current[item.id] = node;
      },
      onTransform: (e: any) => {
        const node = e.target;
        const scaleX = node.scaleX();
        updateElement(item.id, {
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          fontSize: Math.round(Math.max(8, item.fontSize * scaleX)),
        }, false);
      },
      onTransformEnd: (e: any) => {
        const node = e.target;
        const scaleX = node.scaleX();
        updateElement(item.id, {
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          fontSize: Math.round(Math.max(8, item.fontSize * scaleX)),
        }, true);
        node.scaleX(1);
        node.scaleY(1);
      },
    };
    return <Text key={item.id} {...commonProps} />;
  };

  const renderPathItem = (item: any) => {
    const commonProps = {
      x: item.x,
      y: item.y,
      points: item.points,
      stroke: item.stroke || "#000000",
      strokeWidth: item.strokeWidth || 3,
      lineCap: "round" as const,
      lineJoin: "round" as const,
      draggable: !item.locked && userRole !== "viewer",
      onDragMove: (e: any) => updateElement(item.id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) }, false),
      onDragEnd: (e: any) => updateElement(item.id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) }, true),
      onClick: () => handleShapeClick(item.id),
      onTap: () => handleShapeClick(item.id),
      ref: (node: any) => {
        if (node) objectRefs.current[item.id] = node;
      },
    };
    return <Line key={item.id} {...commonProps} />;
  };

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
          width: Math.round(Math.max(10, item.width * scaleX)),
          height: Math.round(Math.max(10, item.height * scaleY)),
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
          height: Math.round(Math.max(10, item.height * scaleY)),
          rotation: Math.round(node.rotation()),
        }, true);
        node.scaleX(1);
        node.scaleY(1);
      },
    };
    return <CanvasImage key={item.id} {...commonProps} />;
  };

  const renderElement = (item: any) => {
    if (!item.visible) return null;
    switch (item.type) {
      case "rect":
        return renderRect(item);
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

  useEffect(() => {
    const stage = stageRef.current;
    const transformer = transformerRef.current;
    if (!stage || !transformer) return;

    if (selectedElementId) {
      const selectedNode = objectRefs.current[selectedElementId];
      if (selectedNode) {
        transformer.nodes([selectedNode]);
        transformer.getLayer().batchDraw();
      } else {
        transformer.nodes([]);
      }
    } else {
      transformer.nodes([]);
    }
  }, [selectedElementId, elements]);

  useEffect(() => {
    // Event listeners mapped to window custom actions
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

      if (e.code === "Space") {
        setSpacePressed(true);
        if (stageRef.current) {
          stageRef.current.container().style.cursor = "grab";
        }
      }
    };

    const handleKeyUpGlobal = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpacePressed(false);
        if (stageRef.current) {
          stageRef.current.container().style.cursor = "default";
        }
      }
    };

    window.addEventListener("keydown", handleKeyDownGlobal);
    window.addEventListener("keyup", handleKeyUpGlobal);
    return () => {
      window.removeEventListener("keydown", handleKeyDownGlobal);
      window.removeEventListener("keyup", handleKeyUpGlobal);
    };
  }, []);

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
                background: "rgba(15,23,42,0.6)",
                padding: "6px 12px",
                borderRadius: "99px",
                backdropFilter: "blur(8px)",
                border: "1px solid var(--border)",
                zIndex: 10,
              }}
            >
              {collaborators.map((c) => (
                <div
                  key={c.userId}
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: c.color || "#a855f7",
                    color: "#fff",
                    fontSize: "10px",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid #0f172a",
                  }}
                  title={c.name}
                >
                  {c.name ? c.name[0].toUpperCase() : "U"}
                </div>
              ))}
            </div>
          )}

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
              onTouchEnd={handleTouchEnd}
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
                  shadowColor="black"
                  shadowBlur={20}
                  shadowOpacity={0.3}
                  shadowOffset={{ x: 0, y: 4 }}
                />
                {elements.map((item: any) => renderElement(item))}
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

          {/* Conflict Indicator badge overlay (bottom left canvas corner) */}
          {(() => {
            if (saveStatus !== "conflict" && saveStatus !== "saving" && saveStatus !== "saved") return null;
            let badgeColor = "rgba(15,23,42,0.6)";
            let badgeText = "";
            if (saveStatus === "conflict") {
              badgeColor = "rgba(239, 68, 68, 0.85)";
              badgeText = "⚠️ VERSION CONFLICT DETECTED - PLEASE RELOAD";
            } else if (saveStatus === "saving") {
              badgeText = "⏳ Syncing design updates...";
            } else if (saveStatus === "saved") {
              badgeText = "✅ Document state synced with cloud";
            }
            return (
              <div
                style={{
                  position: "absolute",
                  bottom: "18px",
                  left: "18px",
                  background: badgeColor,
                  padding: "6px 14px",
                  borderRadius: "99px",
                  backdropFilter: "blur(8px)",
                  boxShadow: "var(--shadow-sm)",
                  color: "#fff",
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

        {/* Schema Inspector Modal */}
        {isSchemaInspectorOpen && (
          <Modal
            title={
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
                <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>
                  UI Schema Inspector
                </span>
              </div>
            }
            onClose={() => setIsSchemaInspectorOpen(false)}
            footer={
              <button
                type="button"
                className="side-menu__btn-secondary"
                onClick={() => setIsSchemaInspectorOpen(false)}
              >
                Close
              </button>
            }
          >
            <p style={{ margin: "0 0 12px", fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.5" }}>
              This is the raw, frontend-extracted semantic AST generated by the canvas transformer. It is normalized and enriched downstream by the AI generation pipeline.
            </p>
            <pre
              style={{
                margin: 0,
                padding: "14px",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                fontSize: "11px",
                color: "var(--text-primary)",
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                overflowX: "auto",
                maxHeight: "380px",
              }}
            >
              {JSON.stringify(localSchema, null, 2)}
            </pre>
          </Modal>
        )}
      </div>
    </section>
  );
}
