import React, { useState } from "react";
import { useStore } from "../store/useStore";
import {
  Circle as CircleIcon,
  Square as SquareIcon,
  Triangle as TriangleIcon,
  RectangleHorizontal as RectIcon,
  Minus as LineIcon,
  Diamond as DiamondIcon,
  Pen,
  Pencil,
  Brush,
} from "lucide-react";
import { getPresignedUrl, uploadFileDirectly, registerAsset } from "../api/uploads";

const shapeOptions = [
  { name: "Circle", icon: CircleIcon },
  { name: "Square", icon: SquareIcon },
  { name: "Triangle", icon: TriangleIcon },
  { name: "Rectangle", icon: RectIcon },
  { name: "Line", icon: LineIcon },
  { name: "Diamond", icon: DiamondIcon },
];

const strokeOptions = [
  { name: "Pen", icon: Pen },
  { name: "Pencil", icon: Pencil },
  { name: "Brush", icon: Brush },
  { name: "Line", icon: LineIcon },
];

export default function ComponentsPanel() {
  const activeTool = useStore((state: any) => state.activeTool);
  const setActiveTool = useStore((state: any) => state.setActiveTool);
  const selectedStroke = useStore((state: any) => state.selectedStroke);
  const setSelectedStroke = useStore((state: any) => state.setSelectedStroke);
  const elements = useStore((state: any) => state.elements);
  const selectedElementId = useStore((state: any) => state.selectedElementId);
  const addShape = useStore((state: any) => state.addShape);
  const addText = useStore((state: any) => state.addText);
  const updateElement = useStore((state: any) => state.updateElement);
  const userRole = useStore((state: any) => state.userRole);
  const showToast = useStore((state: any) => state.showToast);

  const boardWidth = useStore((state: any) => state.boardWidth);
  const boardHeight = useStore((state: any) => state.boardHeight);
  const setBoardWidth = useStore((state: any) => state.setBoardWidth);
  const setBoardHeight = useStore((state: any) => state.setBoardHeight);
  const backgroundColor = useStore((state: any) => state.backgroundColor);
  const setBackgroundColor = useStore((state: any) => state.setBackgroundColor);

  const [activeShape, setActiveShape] = useState<string | null>(null);
  const [textVal, setTextVal] = useState("New Text");
  const [uploadingImage, setUploadingImage] = useState(false);

  const selectedItem = elements.find((item: any) => item.id === selectedElementId) || null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const documentId = useStore.getState().documentId;
    if (userRole === "viewer") {
      showToast("Access denied: Viewers cannot upload images.", "error");
      return;
    }
    if (!documentId) {
      showToast("Please save your design first before uploading images.", "error");
      return;
    }

    try {
      setUploadingImage(true);
      const presignResponse = await getPresignedUrl({
        filename: file.name,
        mimeType: file.type,
        documentId
      });
      await uploadFileDirectly(presignResponse.uploadUrl, file, file.type);
      await registerAsset({
        documentId,
        key: presignResponse.key,
        url: presignResponse.assetUrl,
        mimeType: file.type,
        sizeBytes: file.size
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
        rotation: 0
      };
      useStore.getState().addElement(newImageElement);
      showToast("Image uploaded successfully.", "success");
    } catch (err: any) {
      showToast("Failed to upload image: " + err.message, "error");
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="side-menu__panel" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Insertion Section */}
      <div>
        <p className="side-menu__panel-title">Add Elements</p>
        <div className="shapes-grid">
          {shapeOptions.map((shape) => {
            const Icon = shape.icon;
            return (
              <button
                key={shape.name}
                type="button"
                disabled={userRole === "viewer"}
                className={`shape-item ${activeShape === shape.name ? "shape-item--active" : ""}`}
                onClick={() => {
                  setActiveShape(shape.name);
                  addShape(shape.name);
                }}
                title={shape.name}
              >
                <span className="shape-item__symbol">
                  <Icon size={18} />
                </span>
                <span className="shape-item__name">{shape.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Text block adder */}
      <div className="side-menu__section-card">
        <p className="side-menu__panel-title" style={{ margin: "0 0 8px 0" }}>Add Text</p>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            className="design-name-input"
            value={textVal}
            onChange={(e) => setTextVal(e.target.value)}
            disabled={userRole === "viewer"}
            style={{ flex: 1, padding: "6px" }}
          />
          <button
            type="button"
            className="side-menu__btn-primary"
            onClick={() => addText(textVal)}
            disabled={userRole === "viewer"}
            style={{ padding: "6px 12px" }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Drawing Stroke Selectors */}
      <div className="side-menu__section-card">
        <p className="side-menu__panel-title" style={{ margin: "0 0 8px 0" }}>Drawing Brush</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
          {strokeOptions.map((stroke) => {
            const Icon = stroke.icon;
            const isSelected = selectedStroke === stroke.name && activeTool === "Stroke";
            return (
              <button
                key={stroke.name}
                type="button"
                className={`side-menu__btn-secondary ${isSelected ? "side-menu__btn-primary" : ""}`}
                style={{ padding: "8px", display: "flex", justifyContent: "center", alignItems: "center" }}
                onClick={() => {
                  setSelectedStroke(stroke.name);
                  setActiveTool("Stroke");
                }}
                title={`Select ${stroke.name} Brush`}
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>
      </div>

      {/* S3 Image Uploader */}
      <div className="image-upload-field side-menu__section-dashed">
        <label className="side-menu__panel-title" style={{ margin: 0 }}>
          Upload Image
        </label>
        <input
          type="file"
          accept="image/*"
          disabled={userRole === "viewer" || uploadingImage}
          onChange={handleImageUpload}
          style={{ display: "none" }}
          id="image-file-input"
        />
        <label
          htmlFor="image-file-input"
          className="side-menu__btn-primary"
          style={{
            display: "block",
            textAlign: "center",
            marginTop: "8px",
            cursor: userRole === "viewer" || uploadingImage ? "not-allowed" : "pointer",
            background: userRole === "viewer" ? "rgba(255,255,255,0.03)" : undefined,
            color: userRole === "viewer" ? "var(--muted)" : undefined
          }}
        >
          {uploadingImage ? "Uploading..." : "Choose Image"}
        </label>
      </div>

      {/* Canvas Viewport Options */}
      <div className="side-menu__section-card">
        <p className="side-menu__panel-title" style={{ margin: "0 0 8px 0" }}>Canvas Settings</p>
        <div className="shape-settings__field" style={{ marginBottom: "8px" }}>
          <label>Background Color</label>
          <input
            type="color"
            value={backgroundColor}
            disabled={userRole === "viewer"}
            onChange={(e) => setBackgroundColor(e.target.value)}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <div className="side-menu__field" style={{ margin: 0 }}>
            <span>Width</span>
            <input
              type="number"
              value={boardWidth}
              disabled={userRole === "viewer"}
              onChange={(e) => setBoardWidth(Number(e.target.value))}
            />
          </div>
          <div className="side-menu__field" style={{ margin: 0 }}>
            <span>Height</span>
            <input
              type="number"
              value={boardHeight}
              disabled={userRole === "viewer"}
              onChange={(e) => setBoardHeight(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Selected Element Alignment / Fill Config */}
      {selectedItem && (
        <div className="shape-settings side-menu__section-card">
          <p className="side-menu__panel-title" style={{ margin: "0 0 8px 0" }}>Selection Settings</p>
          
          {["rect", "rectangle", "circle", "triangle", "diamond", "line"].includes(selectedItem.type) && (
            <div className="shape-settings__field" style={{ marginBottom: "8px" }}>
              <label>Fill color</label>
              <input
                type="color"
                disabled={userRole === "viewer"}
                value={selectedItem.fill || "#2563eb"}
                onChange={(e) => updateElement(selectedItem.id, { fill: e.target.value, stroke: e.target.value }, true)}
              />
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <button
              type="button"
              disabled={userRole === "viewer"}
              onClick={() => useStore.getState().bringToFront(selectedItem.id)}
              className="side-menu__btn-secondary"
              style={{ padding: "6px", fontSize: "11px" }}
            >
              Bring Front
            </button>
            <button
              type="button"
              disabled={userRole === "viewer"}
              onClick={() => useStore.getState().sendToBack(selectedItem.id)}
              className="side-menu__btn-secondary"
              style={{ padding: "6px", fontSize: "11px" }}
            >
              Send Back
            </button>
            <button
              type="button"
              disabled={userRole === "viewer"}
              onClick={() => useStore.getState().centerElement(selectedItem.id, "horizontal")}
              className="side-menu__btn-secondary"
              style={{ padding: "6px", fontSize: "11px" }}
            >
              Center X
            </button>
            <button
              type="button"
              disabled={userRole === "viewer"}
              onClick={() => useStore.getState().centerElement(selectedItem.id, "vertical")}
              className="side-menu__btn-secondary"
              style={{ padding: "6px", fontSize: "11px" }}
            >
              Center Y
            </button>
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button
              type="button"
              disabled={userRole === "viewer"}
              onClick={() => useStore.getState().duplicateElement(selectedItem.id)}
              className="side-menu__btn-primary"
              style={{ flex: 1, padding: "6px 12px", fontSize: "11px" }}
            >
              Duplicate
            </button>
            <button
              type="button"
              className="side-menu__btn-danger"
              disabled={userRole === "viewer"}
              onClick={() => useStore.getState().deleteElement(selectedItem.id)}
              style={{ flex: 1, padding: "6px 12px", fontSize: "11px" }}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
