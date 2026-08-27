import React from "react";
import { useStore } from "../store/useStore";
import CodePreviewPanel from "./CodePreviewPanel";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalSpaceAround,
  AlignVerticalSpaceBetween,
  ChevronDown,
} from "lucide-react";

export default function InspectorPanel() {
  const elements = useStore((state: any) => state.elements);
  const selectedElementId = useStore((state: any) => state.selectedElementId);
  const updateElement = useStore((state: any) => state.updateElement);

  // Board settings
  const boardWidth = useStore((state: any) => state.boardWidth);
  const boardHeight = useStore((state: any) => state.boardHeight);
  const backgroundColor = useStore((state: any) => state.backgroundColor);
  const setBoardWidth = useStore((state: any) => state.setBoardWidth);
  const setBoardHeight = useStore((state: any) => state.setBoardHeight);
  const setBackgroundColor = useStore((state: any) => state.setBackgroundColor);

  // Right panel tabs
  const rightPanelOpen = useStore((state: any) => state.rightPanelOpen);
  const setRightPanelOpen = useStore((state: any) => state.setRightPanelOpen);
  const inspectorTab = useStore((state: any) => state.inspectorTab);
  const setInspectorTab = useStore((state: any) => state.setInspectorTab);

  // Code Gen state
  const codeGenResult = useStore((state: any) => state.codeGenResult);
  const codeGenLoading = useStore((state: any) => state.codeGenLoading);
  const codeGenError = useStore((state: any) => state.codeGenError);
  const proposedRefinedResult = useStore((state: any) => state.proposedRefinedResult);

  const selectedElement = elements.find((el: any) => el.id === selectedElementId);

  if (!rightPanelOpen) return null;

  const handleNumChange = (field: string, valStr: string) => {
    if (!selectedElement) return;
    const value = Math.round(Number(valStr));
    if (isNaN(value)) return;

    // Validation rules to reject negative values for specific attributes
    if (
      ["width", "height", "radius", "strokeWidth", "fontSize"].includes(field) &&
      value < 0
    ) {
      return;
    }

    updateElement(selectedElement.id, { [field]: value }, true);
  };

  const handleStrChange = (field: string, value: string) => {
    if (!selectedElement) return;
    updateElement(selectedElement.id, { [field]: value }, true);
  };

  const alignElement = (type: string) => {
    if (!selectedElement) return;
    const elWidth = selectedElement.width || (selectedElement.radius ? selectedElement.radius * 2 : 100);
    const elHeight = selectedElement.height || (selectedElement.radius ? selectedElement.radius * 2 : 100);

    let patch = {};
    switch (type) {
      case "left":
        patch = { x: 0 };
        break;
      case "center":
        patch = { x: Math.round((boardWidth - elWidth) / 2) };
        break;
      case "right":
        patch = { x: Math.round(boardWidth - elWidth) };
        break;
      case "top":
        patch = { y: 0 };
        break;
      case "middle":
        patch = { y: Math.round((boardHeight - elHeight) / 2) };
        break;
      case "bottom":
        patch = { y: Math.round(boardHeight - elHeight) };
        break;
      default:
        return;
    }
    updateElement(selectedElement.id, patch, true);
  };

  const userRole = useStore((state: any) => state.userRole);

  const selectedElement = elements.find((element: any) => element.id === selectedElementId);

  if (!selectedElement) {
    return (
      <aside className="inspector-panel" aria-label="Inspector">
        <div className="inspector-panel__header">
          <span className="inspector-panel__label">Inspector</span>
        </div>
        <div style={{ padding: "0 14px", marginTop: "8px", color: "var(--text-muted)", fontSize: "12px", lineHeight: "1.6" }}>
          <p style={{ fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px 0" }}>No selection</p>
          <p style={{ margin: 0 }}>Select an element on the canvas to edit its properties.</p>
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
    <aside className={`inspector-panel ${inspectorTab === "Code" ? "inspector-panel--code-active" : ""}`} aria-label="Inspector">
      {/* Sticky Tab Header */}
      <div className="inspector-panel__tabs flex border-b border-zinc-800 bg-zinc-950 flex-shrink-0" style={{ height: "36px" }}>
        <button
          onClick={() => setInspectorTab("Design")}
          className={`flex-1 text-center text-xs font-semibold border-b-2 transition-colors ${inspectorTab === "Design"
              ? "border-indigo-500 text-white"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
        >
          Design
        </button>
        <button
          onClick={() => setInspectorTab("Code")}
          className={`flex-1 text-center text-xs font-semibold border-b-2 transition-colors ${inspectorTab === "Code"
              ? "border-indigo-500 text-white"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
        >
          Code
        </button>
      </div>

      {/* Tab Contents */}
      {inspectorTab === "Design" ? (
        <div className="inspector-panel__content flex-1 overflow-y-auto p-4 space-y-4">
          {selectedElement ? (
            <>
              {/* Element Type Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  {selectedElement.type} element
                </span>
                <span className="text-xs font-medium text-zinc-300">
                  {selectedElement.name || selectedElement.type}
                </span>
              </div>

              {/* Group: Alignment */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Align</span>
                <div className="flex items-center gap-1 bg-zinc-900/40 border border-zinc-800/80 p-1.5 rounded-lg">
                  <button
                    onClick={() => alignElement("left")}
                    className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
                    title="Align Left"
                  >
                    <AlignLeft size={14} />
                  </button>
                  <button
                    onClick={() => alignElement("center")}
                    className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
                    title="Align Horizontal Center"
                  >
                    <AlignCenter size={14} />
                  </button>
                  <button
                    onClick={() => alignElement("right")}
                    className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
                    title="Align Right"
                  >
                    <AlignLeft size={14} className="rotate-180" />
                  </button>
                  <div className="w-[1px] h-3 bg-zinc-800 mx-1" />
                  <button
                    onClick={() => alignElement("top")}
                    className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
                    title="Align Top"
                  >
                    <AlignLeft size={14} className="rotate-90" />
                  </button>
                  <button
                    onClick={() => alignElement("middle")}
                    className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
                    title="Align Vertical Center"
                  >
                    <AlignCenter size={14} className="rotate-90" />
                  </button>
                  <button
                    onClick={() => alignElement("bottom")}
                    className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
                    title="Align Bottom"
                  >
                    <AlignLeft size={14} className="-rotate-90" />
                  </button>
                </div>
              </div>

              {/* Group: Position & Bounds */}
              <div className="grid grid-cols-2 gap-2">
                <label className="inspector-field">
                  <span className="inspector-field__label">X</span>
                  <input
                    type="number"
                    value={Math.round(selectedElement.x)}
                    onChange={(e) => handleNumChange("x", e.target.value)}
                    className="inspector-field__input"
                  />
                </label>
                <label className="inspector-field">
                  <span className="inspector-field__label">Y</span>
                  <input
                    type="number"
                    value={Math.round(selectedElement.y)}
                    onChange={(e) => handleNumChange("y", e.target.value)}
                    className="inspector-field__input"
                  />
                </label>

                {selectedElement.width !== undefined && (
                  <label className="inspector-field">
                    <span className="inspector-field__label">W</span>
                    <input
                      type="number"
                      min="0"
                      value={Math.round(selectedElement.width)}
                      onChange={(e) => handleNumChange("width", e.target.value)}
                      className="inspector-field__input"
                    />
                  </label>
                )}

                {selectedElement.height !== undefined && (
                  <label className="inspector-field">
                    <span className="inspector-field__label">H</span>
                    <input
                      type="number"
                      min="0"
                      value={Math.round(selectedElement.height)}
                      onChange={(e) => handleNumChange("height", e.target.value)}
                      className="inspector-field__input"
                    />
                  </label>
                )}

                {selectedElement.radius !== undefined && (
                  <label className="inspector-field col-span-2">
                    <span className="inspector-field__label">Radius</span>
                    <input
                      type="number"
                      min="0"
                      value={Math.round(selectedElement.radius)}
                      onChange={(e) => handleNumChange("radius", e.target.value)}
                      className="inspector-field__input"
                    />
                  </label>
                )}

                <label className="inspector-field col-span-2">
                  <span className="inspector-field__label">Angle</span>
                  <input
                    type="number"
                    value={Math.round(selectedElement.rotation || 0)}
                    onChange={(e) => handleNumChange("rotation", e.target.value)}
                    className="inspector-field__input"
                  />
                </label>
              </div>

              {/* Group: Color Fill */}
              {selectedElement.fill !== undefined && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Fill Color</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedElement.fill || "#000000"}
                      onChange={(e) => handleStrChange("fill", e.target.value)}
                      className="w-8 h-8 rounded border border-zinc-800 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={selectedElement.fill || "transparent"}
                      onChange={(e) => handleStrChange("fill", e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white uppercase outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Group: Stroke */}
              {selectedElement.stroke !== undefined && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Stroke</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedElement.stroke || "#000000"}
                      onChange={(e) => handleStrChange("stroke", e.target.value)}
                      className="w-8 h-8 rounded border border-zinc-800 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={selectedElement.stroke || "transparent"}
                      onChange={(e) => handleStrChange("stroke", e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white uppercase outline-none focus:border-indigo-500"
                    />
                  </div>
                  <label className="inspector-field">
                    <span className="inspector-field__label">Thickness</span>
                    <input
                      type="number"
                      min="0"
                      value={selectedElement.strokeWidth || 0}
                      onChange={(e) => handleNumChange("strokeWidth", e.target.value)}
                      className="inspector-field__input"
                    />
                  </label>
                </div>
              )}

              {/* Group: Opacity */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Opacity</span>
                  <span className="text-xs text-zinc-400">{Math.round((selectedElement.opacity ?? 1) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={selectedElement.opacity ?? 1}
                  onChange={(e) => handleNumChange("opacity", e.target.value)}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Group: Typography (Text element specific) */}
              {selectedElement.type === "text" && (
                <div className="space-y-3 pt-2 border-t border-zinc-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Typography</span>

                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-400">Content</span>
                    <textarea
                      value={selectedElement.text || ""}
                      onChange={(e) => handleStrChange("text", e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="inspector-field">
                      <span className="inspector-field__label">Size</span>
                      <input
                        type="number"
                        min="0"
                        value={selectedElement.fontSize || 14}
                        onChange={(e) => handleNumChange("fontSize", e.target.value)}
                        className="inspector-field__input"
                      />
                    </label>

                    <label className="inspector-field">
                      <span className="inspector-field__label">Weight</span>
                      <select
                        value={selectedElement.fontWeight || "normal"}
                        onChange={(e) => handleStrChange("fontWeight", e.target.value)}
                        className="inspector-field__input bg-zinc-900 border-none outline-none"
                      >
                        <option value="normal">Normal</option>
                        <option value="bold">Bold</option>
                      </select>
                    </label>
                  </div>
                </div>
              )}
            </>
          ) : (
            // Canvas/Board Settings (No selection)
            <>
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Document Settings
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="inspector-field">
                  <span className="inspector-field__label">Width</span>
                  <input
                    type="number"
                    min="100"
                    max="5000"
                    value={boardWidth}
                    onChange={(e) => setBoardWidth(Number(e.target.value))}
                    className="inspector-field__input"
                  />
                </label>
                <label className="inspector-field">
                  <span className="inspector-field__label">Height</span>
                  <input
                    type="number"
                    min="100"
                    max="5000"
                    value={boardHeight}
                    onChange={(e) => setBoardHeight(Number(e.target.value))}
                    className="inspector-field__input"
                  />
                </label>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Canvas Color</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={backgroundColor || "#ffffff"}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-8 h-8 rounded border border-zinc-800 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={backgroundColor || "#ffffff"}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white uppercase outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        // Code Preview Tab
        <CodePreviewPanel
          isOpen={rightPanelOpen}
          onClose={() => setRightPanelOpen(false)}
          result={codeGenResult}
          proposedRefinedResult={proposedRefinedResult}
          isLoading={codeGenLoading}
          error={codeGenError}
          onRefine={(prompt) => window.dispatchEvent(new CustomEvent("trigger-refine-code", { detail: { prompt } }))}
          onRegenerate={() => window.dispatchEvent(new CustomEvent("trigger-generate-code"))}
          onAcceptRefinement={() => window.dispatchEvent(new CustomEvent("trigger-accept-refinement"))}
          onRejectRefinement={() => window.dispatchEvent(new CustomEvent("trigger-reject-refinement"))}
        />
      )}

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
