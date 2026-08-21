import React, { useState, useRef } from "react";
import { useStore } from "../store/useStore";
import {
  MousePointer2,
  Square,
  Circle,
  Triangle,
  Minus,
  Type,
  Image as ImageIcon,
  PenTool,
  Layers,
  FolderOpen,
  Shapes,
} from "lucide-react";
import { getPresignedUrl, uploadFileDirectly, registerAsset } from "../api/uploads";

interface VerticalToolRailProps {
  activeLeftTab: string | null;
  setActiveLeftTab: (tab: string | null) => void;
}

export default function VerticalToolRail({ activeLeftTab, setActiveLeftTab }: VerticalToolRailProps) {
  const activeTool = useStore((state: any) => state.activeTool);
  const setActiveTool = useStore((state: any) => state.setActiveTool);
  const selectedStroke = useStore((state: any) => state.selectedStroke);
  const setSelectedStroke = useStore((state: any) => state.setSelectedStroke);
  const addShape = useStore((state: any) => state.addShape);
  const addText = useStore((state: any) => state.addText);
  const selectElement = useStore((state: any) => state.selectElement);
  const userRole = useStore((state: any) => state.userRole);
  const showToast = useStore((state: any) => state.showToast);

  const [shapeMenuOpen, setShapeMenuOpen] = useState(false);
  const [brushMenuOpen, setBrushMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleShapeSelect = (shape: string) => {
    addShape(shape);
    setShapeMenuOpen(false);
  };

  const handleBrushSelect = (stroke: string) => {
    setSelectedStroke(stroke);
    setActiveTool("Stroke");
    setBrushMenuOpen(false);
  };

  const handleImageClick = () => {
    if (userRole === "viewer") return;
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const documentId = useStore.getState().documentId;
    if (!documentId) {
      showToast("Please save your design first before uploading images.", "error");
      return;
    }

    try {
      setUploading(true);
      const presignResponse = await getPresignedUrl({
        filename: file.name,
        mimeType: file.type,
        documentId,
      });
      await uploadFileDirectly(presignResponse.uploadUrl, file, file.type);
      await registerAsset({
        documentId,
        key: presignResponse.key,
        url: presignResponse.assetUrl,
        mimeType: file.type,
        sizeBytes: file.size,
      });
      const newImageElement = {
        id: `element-${Date.now()}`,
        type: "image",
        name: file.name,
        x: 200,
        y: 200,
        width: 200,
        height: 200,
        url: presignResponse.assetUrl,
        visible: true,
        locked: false,
        rotation: 0,
      };
      useStore.getState().addElement(newImageElement);
      showToast("Image uploaded successfully.", "success");
    } catch (err: any) {
      showToast("Failed to upload image: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleTabClick = (tab: string) => {
    if (activeLeftTab === tab) {
      setActiveLeftTab(null);
    } else {
      setActiveLeftTab(tab);
    }
  };

  return (
    <div className="vertical-tool-rail" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 56px)" }}>
      {/* ── DESIGN TOOLS (Top Group) ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
        {/* Selection Mode */}
        <button
          type="button"
          className={`vertical-tool-rail__btn ${activeTool === "Shapes" ? "vertical-tool-rail__btn--active" : ""}`}
          onClick={() => {
            setActiveTool("Shapes");
            selectElement(null);
          }}
          title="Select Tool (V)"
        >
          <MousePointer2 size={20} />
        </button>

        {/* Shape Insertion popover */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            disabled={userRole === "viewer"}
            className={`vertical-tool-rail__btn ${shapeMenuOpen ? "vertical-tool-rail__btn--active" : ""}`}
            onClick={() => {
              setShapeMenuOpen(!shapeMenuOpen);
              setBrushMenuOpen(false);
            }}
            title="Insert Shape"
          >
            <Square size={20} />
          </button>

          {shapeMenuOpen && (
            <div className="vertical-tool-rail__popover">
              <button type="button" className="vertical-tool-rail__popover-item" onClick={() => handleShapeSelect("Square")}>
                <Square size={16} /> <span>Square</span>
              </button>
              <button type="button" className="vertical-tool-rail__popover-item" onClick={() => handleShapeSelect("Rectangle")}>
                <div style={{ width: 16, height: 10, border: "2px solid currentColor", borderRadius: 2 }} /> <span>Rectangle</span>
              </button>
              <button type="button" className="vertical-tool-rail__popover-item" onClick={() => handleShapeSelect("Circle")}>
                <Circle size={16} /> <span>Circle</span>
              </button>
              <button type="button" className="vertical-tool-rail__popover-item" onClick={() => handleShapeSelect("Triangle")}>
                <Triangle size={16} /> <span>Triangle</span>
              </button>
              <button type="button" className="vertical-tool-rail__popover-item" onClick={() => handleShapeSelect("Diamond")}>
                <div style={{ width: 12, height: 12, border: "2px solid currentColor", transform: "rotate(45deg)", margin: "2px" }} /> <span>Diamond</span>
              </button>
              <button type="button" className="vertical-tool-rail__popover-item" onClick={() => handleShapeSelect("Line")}>
                <Minus size={16} /> <span>Line</span>
              </button>
            </div>
          )}
        </div>

        {/* Text Tool */}
        <button
          type="button"
          disabled={userRole === "viewer"}
          className={`vertical-tool-rail__btn ${activeTool === "Text" ? "vertical-tool-rail__btn--active" : ""}`}
          onClick={() => addText("Double click to edit")}
          title="Add Text Block (T)"
        >
          <Type size={20} />
        </button>

        {/* Drawing Brush tool */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            disabled={userRole === "viewer"}
            className={`vertical-tool-rail__btn ${activeTool === "Stroke" ? "vertical-tool-rail__btn--active" : ""}`}
            onClick={() => {
              setBrushMenuOpen(!brushMenuOpen);
              setShapeMenuOpen(false);
            }}
            title="Drawing Brush"
          >
            <PenTool size={20} />
          </button>

          {brushMenuOpen && (
            <div className="vertical-tool-rail__popover">
              <button type="button" className="vertical-tool-rail__popover-item" onClick={() => handleBrushSelect("Pen")}>
                <span>Pen Brush</span>
              </button>
              <button type="button" className="vertical-tool-rail__popover-item" onClick={() => handleBrushSelect("Pencil")}>
                <span>Pencil</span>
              </button>
              <button type="button" className="vertical-tool-rail__popover-item" onClick={() => handleBrushSelect("Brush")}>
                <span>Brush Strong</span>
              </button>
              <button type="button" className="vertical-tool-rail__popover-item" onClick={() => handleBrushSelect("Line")}>
                <span>Straight Line</span>
              </button>
            </div>
          )}
        </div>

        {/* Image Uploader */}
        <button
          type="button"
          disabled={userRole === "viewer" || uploading}
          className={`vertical-tool-rail__btn ${uploading ? "vertical-tool-rail__btn--active" : ""}`}
          onClick={handleImageClick}
          title="Upload Image"
        >
          <ImageIcon size={20} />
        </button>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImageUpload}
          style={{ display: "none" }}
        />
      </div>

      {/* Spacer pushing navigation tabs to bottom */}
      <div style={{ flex: 1 }} />

      {/* ── CONTEXTUAL NAVIGATION TABS (Bottom Group) ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: "12px", width: "100%" }}>
        {/* Layers Tab */}
        <button
          type="button"
          className={`vertical-tool-rail__btn ${activeLeftTab === "Layers" ? "vertical-tool-rail__btn--active" : ""}`}
          onClick={() => handleTabClick("Layers")}
          title="Layers (Toggle panel)"
        >
          <Layers size={18} />
        </button>

        {/* Assets Tab */}
        <button
          type="button"
          className={`vertical-tool-rail__btn ${activeLeftTab === "Assets" ? "vertical-tool-rail__btn--active" : ""}`}
          onClick={() => handleTabClick("Assets")}
          title="Assets / Designs (Toggle panel)"
        >
          <FolderOpen size={18} />
        </button>

        {/* Settings/Components Tab */}
        <button
          type="button"
          className={`vertical-tool-rail__btn ${activeLeftTab === "Components" ? "vertical-tool-rail__btn--active" : ""}`}
          onClick={() => handleTabClick("Components")}
          title="Canvas & Selection Settings"
        >
          <Shapes size={18} />
        </button>
      </div>
    </div>
  );
}
