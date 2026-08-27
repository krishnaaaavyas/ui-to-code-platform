import React, { useState } from "react";
import { useStore } from "../store/useStore";
import CodePreviewPanel from "./CodePreviewPanel";

export default function InspectorPanel() {
  const elements = useStore((state: any) => state.elements);
  const selectedElementId = useStore((state: any) => state.selectedElementId);
  const updateElement = useStore((state: any) => state.updateElement);

  // Board settings
  const boardWidth = useStore((state: any) => state.boardWidth);
  const boardHeight = useStore((state: any) => state.boardHeight);
  const setBoardWidth = useStore((state: any) => state.setBoardWidth);
  const setBoardHeight = useStore((state: any) => state.setBoardHeight);
  const boardColor = useStore((state: any) => state.backgroundColor);
  const setBoardColor = useStore((state: any) => state.setBackgroundColor);

  const rightPanelOpen = useStore((state: any) => state.rightPanelOpen);
  const inspectorTab = useStore((state: any) => state.inspectorTab);
  const setInspectorTab = useStore((state: any) => state.setInspectorTab);

  // Code generation state binding
  const codeGenResult = useStore((state: any) => state.codeGenResult);
  const setCodeGenResult = useStore((state: any) => state.setCodeGenResult);
  const codeGenLoading = useStore((state: any) => state.codeGenLoading);
  const setCodeGenLoading = useStore((state: any) => state.setCodeGenLoading);
  const codeGenError = useStore((state: any) => state.codeGenError);
  const setCodeGenError = useStore((state: any) => state.setCodeGenError);
  const proposedRefinedResult = useStore((state: any) => state.proposedRefinedResult);
  const setProposedRefinedResult = useStore((state: any) => state.setProposedRefinedResult);

  const userRole = useStore((state: any) => state.userRole);
  const isViewer = userRole === "viewer";

  const selectedElement = elements.find((element: any) => element.id === selectedElementId);

  const handleNumChange = (field: string, val: string) => {
    if (isViewer || !selectedElement) return;
    const num = Number(val);
    if (isNaN(num)) return;
    
    // Numeric validation to reject negative width/height/radius/strokeWidth values
    if ((field === "width" || field === "height" || field === "radius" || field === "strokeWidth") && num < 0) {
      return;
    }
    
    updateElement(selectedElement.id, { [field]: num }, true);
  };

  const handleStrChange = (field: string, val: string) => {
    if (isViewer || !selectedElement) return;
    updateElement(selectedElement.id, { [field]: val }, true);
  };

  // Alignments
  const handleAlign = (type: "left" | "center" | "right" | "top" | "middle" | "bottom") => {
    if (isViewer || !selectedElement) return;
    const patch: any = {};
    const elWidth = selectedElement.width || (selectedElement.radius ? selectedElement.radius * 2 : 120);
    const elHeight = selectedElement.height || (selectedElement.radius ? selectedElement.radius * 2 : 120);

    switch (type) {
      case "left":
        patch.x = 0;
        break;
      case "center":
        patch.x = Math.round((boardWidth - elWidth) / 2);
        break;
      case "right":
        patch.x = boardWidth - elWidth;
        break;
      case "top":
        patch.y = 0;
        break;
      case "middle":
        patch.y = Math.round((boardHeight - elHeight) / 2);
        break;
      case "bottom":
        patch.y = boardHeight - elHeight;
        break;
      default:
        break;
    }
    updateElement(selectedElement.id, patch, true);
  };

  if (!selectedElement) {
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

        {inspectorTab === "Design" ? (
          <div className="p-3 flex flex-col gap-6 overflow-y-auto flex-1">
            <div className="space-y-1">
              <span className="text-xs font-bold text-zinc-300">Canvas Configuration</span>
              <p className="text-[10px] text-zinc-500">Edit values below to adjust document workspace dimensions</p>
            </div>

            <div className="grid grid-2x2 gap-3">
              <div className="inspector-field">
                <span className="inspector-field__label">Width</span>
                <input
                  type="number"
                  min="400"
                  max="5000"
                  step="50"
                  disabled={isViewer}
                  value={boardWidth}
                  onChange={(e) => setBoardWidth(Number(e.target.value))}
                  className="inspector-field__input"
                />
              </div>
              <div className="inspector-field">
                <span className="inspector-field__label">Height</span>
                <input
                  type="number"
                  min="400"
                  max="5000"
                  step="50"
                  disabled={isViewer}
                  value={boardHeight}
                  onChange={(e) => setBoardHeight(Number(e.target.value))}
                  className="inspector-field__input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Background</span>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  disabled={isViewer}
                  value={boardColor || "#ffffff"}
                  onChange={(e) => setBoardColor(e.target.value)}
                  className="w-8 h-8 rounded border border-zinc-800 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  disabled={isViewer}
                  value={boardColor || ""}
                  onChange={(e) => setBoardColor(e.target.value)}
                  className="inspector-field__input"
                />
              </div>
            </div>

            <div className="pt-8 text-center">
              <p className="text-xs text-zinc-550 italic">No shape or text element selected</p>
            </div>
          </div>
        ) : (
          <CodePreviewPanel
            isOpen={rightPanelOpen}
            onClose={() => useStore.getState().setRightPanelOpen(false)}
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
      </aside>
    );
  }

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

      {inspectorTab === "Design" ? (
        <div className="p-3 flex flex-col gap-5 overflow-y-auto flex-1 text-zinc-200">
          {/* Element Type Header Badge */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-850">
            <span className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest">Alignment</span>
            <span className="px-2 py-0.5 rounded bg-indigo-950/40 text-[9px] font-bold border border-indigo-900/35 text-indigo-400 uppercase">
              {selectedElement.type}
            </span>
          </div>

          {/* Alignment Tools grid */}
          <div className="grid grid-cols-6 gap-1 bg-zinc-900/60 p-1.5 rounded-lg border border-zinc-850">
            <button
              onClick={() => handleAlign("left")}
              className="py-1 hover:bg-zinc-800 text-[10px] rounded text-center text-zinc-400 hover:text-zinc-200"
              title="Align Left"
            >
              Align L
            </button>
            <button
              onClick={() => handleAlign("center")}
              className="py-1 hover:bg-zinc-800 text-[10px] rounded text-center text-zinc-400 hover:text-zinc-200"
              title="Align Horizontal Center"
            >
              Align C
            </button>
            <button
              onClick={() => handleAlign("right")}
              className="py-1 hover:bg-zinc-800 text-[10px] rounded text-center text-zinc-400 hover:text-zinc-200"
              title="Align Right"
            >
              Align R
            </button>
            <button
              onClick={() => handleAlign("top")}
              className="py-1 hover:bg-zinc-800 text-[10px] rounded text-center text-zinc-400 hover:text-zinc-200"
              title="Align Top"
            >
              Align T
            </button>
            <button
              onClick={() => handleAlign("middle")}
              className="py-1 hover:bg-zinc-800 text-[10px] rounded text-center text-zinc-400 hover:text-zinc-200"
              title="Align Vertical Center"
            >
              Align M
            </button>
            <button
              onClick={() => handleAlign("bottom")}
              className="py-1 hover:bg-zinc-800 text-[10px] rounded text-center text-zinc-400 hover:text-zinc-200"
              title="Align Bottom"
            >
              Align B
            </button>
          </div>

          {/* Geometry inputs */}
          <div className="space-y-3 pt-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Geometry</span>
            <div className="grid grid-cols-2 gap-3">
              <div className="inspector-field">
                <span className="inspector-field__label">X</span>
                <input
                  type="number"
                  disabled={isViewer || selectedElement.locked}
                  value={Math.round(selectedElement.x) || 0}
                  onChange={(e) => handleNumChange("x", e.target.value)}
                  className="inspector-field__input"
                />
              </div>
              <div className="inspector-field">
                <span className="inspector-field__label">Y</span>
                <input
                  type="number"
                  disabled={isViewer || selectedElement.locked}
                  value={Math.round(selectedElement.y) || 0}
                  onChange={(e) => handleNumChange("y", e.target.value)}
                  className="inspector-field__input"
                />
              </div>

              {selectedElement.type === "circle" || selectedElement.type === "triangle" || selectedElement.type === "diamond" ? (
                <div className="inspector-field col-span-2">
                  <span className="inspector-field__label">Radius</span>
                  <input
                    type="number"
                    disabled={isViewer || selectedElement.locked}
                    value={Math.round(selectedElement.radius) || 0}
                    onChange={(e) => handleNumChange("radius", e.target.value)}
                    className="inspector-field__input"
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
                      className="inspector-field__input"
                    />
                  </div>
                  <div className="inspector-field">
                    <span className="inspector-field__label">H</span>
                    <input
                      type="number"
                      disabled={isViewer || selectedElement.locked}
                      value={Math.round(selectedElement.height) || 0}
                      onChange={(e) => handleNumChange("height", e.target.value)}
                      className="inspector-field__input"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Typography options (specifically for texts) */}
          {selectedElement.type === "text" && (
            <div className="space-y-3 pt-2 border-t border-zinc-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Typography</span>

              <div className="space-y-1">
                <span className="text-[10px] text-zinc-400">Content</span>
                <textarea
                  rows={2}
                  disabled={isViewer || selectedElement.locked}
                  value={selectedElement.text || ""}
                  onChange={(e) => handleStrChange("text", e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 p-2 rounded text-xs outline-none focus:border-indigo-500 font-mono text-zinc-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="inspector-field">
                  <span className="inspector-field__label">Font Size</span>
                  <input
                    type="number"
                    disabled={isViewer || selectedElement.locked}
                    value={selectedElement.fontSize || 14}
                    onChange={(e) => handleNumChange("fontSize", e.target.value)}
                    className="inspector-field__input"
                  />
                </div>
                <div className="inspector-field">
                  <span className="inspector-field__label">Weight</span>
                  <select
                    disabled={isViewer || selectedElement.locked}
                    value={selectedElement.fontWeight || "normal"}
                    onChange={(e) => handleStrChange("fontWeight", e.target.value)}
                    className="inspector-field__input"
                  >
                    <option value="normal">Normal</option>
                    <option value="bold">Bold</option>
                    <option value="italic">Italic</option>
                    <option value="bold italic">Bold Italic</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-zinc-400 font-medium">Font Family</span>
                <select
                  disabled={isViewer || selectedElement.locked}
                  value={selectedElement.fontFamily || "system-ui"}
                  onChange={(e) => handleStrChange("fontFamily", e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 p-1.5 rounded text-xs outline-none focus:border-indigo-500 text-zinc-200"
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

          {/* Fill/Appearance fields */}
          {selectedElement.type !== "image" && selectedElement.type !== "path" && (
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Fill</span>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  disabled={isViewer || selectedElement.locked}
                  value={selectedElement.fill || "#000000"}
                  onChange={(e) => handleStrChange("fill", e.target.value)}
                  className="w-8 h-8 rounded border border-zinc-800 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  disabled={isViewer || selectedElement.locked}
                  value={selectedElement.fill || ""}
                  onChange={(e) => handleStrChange("fill", e.target.value)}
                  placeholder="#000000"
                  className="inspector-field__input"
                />
              </div>
            </div>
          )}

          {/* Stroke / Borders details */}
          {selectedElement.type !== "text" && selectedElement.type !== "image" && (
            <div className="space-y-3 pt-2 border-t border-zinc-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Stroke</span>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  disabled={isViewer || selectedElement.locked}
                  value={selectedElement.stroke || "#000000"}
                  onChange={(e) => handleStrChange("stroke", e.target.value)}
                  className="w-8 h-8 rounded border border-zinc-800 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  disabled={isViewer || selectedElement.locked}
                  value={selectedElement.stroke || ""}
                  onChange={(e) => handleStrChange("stroke", e.target.value)}
                  placeholder="None"
                  className="inspector-field__input"
                />
              </div>
              <div className="inspector-field">
                <span className="inspector-field__label">Stroke Width</span>
                <input
                  type="number"
                  disabled={isViewer || selectedElement.locked}
                  min="0"
                  max="50"
                  value={selectedElement.strokeWidth || 0}
                  onChange={(e) => handleNumChange("strokeWidth", e.target.value)}
                  className="inspector-field__input"
                />
              </div>
            </div>
          )}

          {/* Image source properties */}
          {selectedElement.type === "image" && (
            <div className="space-y-3 pt-2 border-t border-zinc-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Image Details</span>
              <div className="inspector-field">
                <span className="inspector-field__label">Source URL</span>
                <input
                  type="text"
                  disabled={isViewer || selectedElement.locked}
                  value={selectedElement.url || selectedElement.src || ""}
                  onChange={(e) => handleStrChange("url", e.target.value)}
                  className="inspector-field__input"
                />
              </div>
              {selectedElement.url && (
                <div className="rounded-lg overflow-hidden border border-zinc-850 bg-zinc-900/60 p-2 flex items-center justify-center">
                  <img
                    src={selectedElement.url}
                    alt="Asset preview"
                    className="max-h-28 object-contain"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <CodePreviewPanel
          isOpen={rightPanelOpen}
          onClose={() => useStore.getState().setRightPanelOpen(false)}
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
    </aside>
  );
}
