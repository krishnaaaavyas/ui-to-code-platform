import React from "react";
import { useStore } from "../store/useStore";

export default function InspectorPanel() {
  const elements = useStore((state: any) => state.elements);
  const selectedElementId = useStore((state: any) => state.selectedElementId);
  const updateElement = useStore((state: any) => state.updateElement);
  const userRole = useStore((state: any) => state.userRole);

  const selectedElement = elements.find((element: any) => element.id === selectedElementId);

  if (!selectedElement) {
    return (
      <aside className="inspector-panel" aria-label="Inspector">
        <div className="inspector-panel__header">
          <span className="inspector-panel__label">Inspector</span>
        </div>
        <div className="inspector-panel__empty-state">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 17L15 17" />
            <path d="M12 7L12 13" />
          </svg>
          <p className="inspector-panel__empty">Select an element to inspect its properties</p>
        </div>
      </aside>
    );
  }

  const isViewer = userRole === "viewer";
  const isCircle = selectedElement.type === "circle";
  const isText = selectedElement.type === "text";
  const isImage = selectedElement.type === "image";
  const isPath = selectedElement.type === "path" || selectedElement.type === "pen";

  const handleNumChange = (field: string, val: string) => {
    const num = Number(val);
    if (!isNaN(num)) {
      updateElement(selectedElement.id, { [field]: num }, true);
    }
  };

  const handleStrChange = (field: string, val: string) => {
    updateElement(selectedElement.id, { [field]: val }, true);
  };

  return (
    <aside className="inspector-panel" aria-label="Inspector">
      <div className="inspector-panel__header">
        <div className="inspector-panel__title-bar">
          <span className="inspector-panel__label">Properties</span>
          <span className="inspector-panel__type-badge">{selectedElement.type}</span>
        </div>
      </div>

      <div className="inspector-panel__content">
        {/* Toggle Lock / Visibility */}
        <div className="inspector-section row-layout">
          <button
            type="button"
            className={`inspector-btn-toggle ${selectedElement.visible ? "" : "inactive"}`}
            disabled={isViewer}
            onClick={() => updateElement(selectedElement.id, { visible: !selectedElement.visible }, true)}
            title={selectedElement.visible ? "Hide Element" : "Show Element"}
          >
            {selectedElement.visible ? "👁 Visible" : "🚫 Hidden"}
          </button>
          <button
            type="button"
            className={`inspector-btn-toggle ${selectedElement.locked ? "active" : ""}`}
            disabled={isViewer}
            onClick={() => updateElement(selectedElement.id, { locked: !selectedElement.locked }, true)}
            title={selectedElement.locked ? "Unlock Element" : "Lock Element"}
          >
            {selectedElement.locked ? "🔒 Locked" : "🔓 Unlocked"}
          </button>
        </div>

        {/* Geometry (Position & Dimensions) */}
        <div className="inspector-section">
          <h3 className="inspector-section__title">Geometry</h3>
          <div className="inspector-grid grid-2x2">
            <div className="inspector-field">
              <span className="inspector-field__label">X</span>
              <input
                type="number"
                disabled={isViewer || selectedElement.locked}
                value={Math.round(selectedElement.x) || 0}
                onChange={(e) => handleNumChange("x", e.target.value)}
              />
            </div>
            <div className="inspector-field">
              <span className="inspector-field__label">Y</span>
              <input
                type="number"
                disabled={isViewer || selectedElement.locked}
                value={Math.round(selectedElement.y) || 0}
                onChange={(e) => handleNumChange("y", e.target.value)}
              />
            </div>

            {isCircle ? (
              <div className="inspector-field span-2">
                <span className="inspector-field__label">Radius</span>
                <input
                  type="number"
                  disabled={isViewer || selectedElement.locked}
                  value={Math.round(selectedElement.radius) || 0}
                  onChange={(e) => handleNumChange("radius", e.target.value)}
                />
              </div>
            ) : (
              <>
                <div className="inspector-field">
                  <span className="inspector-field__label">W</span>
                  <input
                    type="number"
                    disabled={isViewer || selectedElement.locked}
                    value={Math.round(selectedElement.width) || 0}
                    onChange={(e) => handleNumChange("width", e.target.value)}
                  />
                </div>
                <div className="inspector-field">
                  <span className="inspector-field__label">H</span>
                  <input
                    type="number"
                    disabled={isViewer || selectedElement.locked}
                    value={Math.round(selectedElement.height) || 0}
                    onChange={(e) => handleNumChange("height", e.target.value)}
                  />
                </div>
              </>
            )}

            {!isCircle && selectedElement.rotation !== undefined && (
              <div className="inspector-field span-2">
                <span className="inspector-field__label">Rotation</span>
                <input
                  type="number"
                  disabled={isViewer || selectedElement.locked}
                  value={Math.round(selectedElement.rotation) || 0}
                  onChange={(e) => handleNumChange("rotation", e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Text Settings Section */}
        {isText && (
          <div className="inspector-section">
            <h3 className="inspector-section__title">Text Style</h3>
            <div className="inspector-field-block">
              <span className="inspector-field__label">Content</span>
              <textarea
                rows={3}
                disabled={isViewer || selectedElement.locked}
                value={selectedElement.text || ""}
                onChange={(e) => handleStrChange("text", e.target.value)}
                className="inspector-textarea"
              />
            </div>

            <div className="inspector-grid grid-1x2" style={{ marginTop: "12px" }}>
              <div className="inspector-field">
                <span className="inspector-field__label">Size</span>
                <input
                  type="number"
                  disabled={isViewer || selectedElement.locked}
                  value={selectedElement.fontSize || 14}
                  onChange={(e) => handleNumChange("fontSize", e.target.value)}
                />
              </div>
              <div className="inspector-field">
                <span className="inspector-field__label">Weight</span>
                <select
                  disabled={isViewer || selectedElement.locked}
                  value={selectedElement.fontWeight || "normal"}
                  onChange={(e) => handleStrChange("fontWeight", e.target.value)}
                  className="inspector-select"
                >
                  <option value="normal">Normal</option>
                  <option value="bold">Bold</option>
                  <option value="italic">Italic</option>
                  <option value="bold italic">Bold Italic</option>
                </select>
              </div>
            </div>

            <div className="inspector-field-block" style={{ marginTop: "12px" }}>
              <span className="inspector-field__label">Font Family</span>
              <select
                disabled={isViewer || selectedElement.locked}
                value={selectedElement.fontFamily || "system-ui"}
                onChange={(e) => handleStrChange("fontFamily", e.target.value)}
                className="inspector-select"
              >
                <option value="system-ui">System Default</option>
                <option value="'Plus Jakarta Sans'">Plus Jakarta Sans</option>
                <option value="'Inter'">Inter</option>
                <option value="'JetBrains Mono'">JetBrains Mono</option>
                <option value="Arial">Arial</option>
                <option value="Georgia">Georgia</option>
                <option value="Courier New">Courier New</option>
              </select>
            </div>
          </div>
        )}

        {/* Appearance (Fills & Backgrounds) */}
        {!isImage && !isPath && (
          <div className="inspector-section">
            <h3 className="inspector-section__title">Fill</h3>
            <div className="color-picker-row">
              <input
                type="color"
                disabled={isViewer || selectedElement.locked}
                value={selectedElement.fill || "#000000"}
                onChange={(e) => handleStrChange("fill", e.target.value)}
                className="inspector-color-input"
              />
              <input
                type="text"
                disabled={isViewer || selectedElement.locked}
                value={selectedElement.fill || ""}
                onChange={(e) => handleStrChange("fill", e.target.value)}
                placeholder="None"
                className="inspector-hex-input"
              />
            </div>
          </div>
        )}

        {/* Stroke / Borders */}
        {!isText && !isImage && (
          <div className="inspector-section">
            <h3 className="inspector-section__title">Stroke</h3>
            <div className="color-picker-row" style={{ marginBottom: "8px" }}>
              <input
                type="color"
                disabled={isViewer || selectedElement.locked}
                value={selectedElement.stroke || "#000000"}
                onChange={(e) => handleStrChange("stroke", e.target.value)}
                className="inspector-color-input"
              />
              <input
                type="text"
                disabled={isViewer || selectedElement.locked}
                value={selectedElement.stroke || ""}
                onChange={(e) => handleStrChange("stroke", e.target.value)}
                placeholder="None"
                className="inspector-hex-input"
              />
            </div>
            <div className="inspector-field">
              <span className="inspector-field__label">Width</span>
              <input
                type="number"
                disabled={isViewer || selectedElement.locked}
                min="0"
                max="50"
                value={selectedElement.strokeWidth || 0}
                onChange={(e) => handleNumChange("strokeWidth", e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Image Source (only for image type) */}
        {isImage && (
          <div className="inspector-section">
            <h3 className="inspector-section__title">Image</h3>
            <div className="inspector-field-block">
              <span className="inspector-field__label">URL</span>
              <input
                type="text"
                disabled={isViewer || selectedElement.locked}
                value={selectedElement.url || selectedElement.src || ""}
                onChange={(e) => handleStrChange("url", e.target.value)}
                className="inspector-text-input"
              />
            </div>
            {selectedElement.url && (
              <div className="inspector-panel__image-preview" style={{ marginTop: "12px" }}>
                <img
                  src={selectedElement.url}
                  alt="Preview"
                  style={{
                    width: "100%",
                    maxHeight: "120px",
                    objectFit: "contain",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)"
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
