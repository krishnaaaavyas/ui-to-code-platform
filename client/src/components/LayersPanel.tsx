import React, { useState } from "react";
import { useStore } from "../store/useStore";

export default function LayersPanel() {
  const elements = useStore((state: any) => state.elements);
  const selectedElementId = useStore((state: any) => state.selectedElementId);
  const selectElement = useStore((state: any) => state.selectElement);
  const deleteElement = useStore((state: any) => state.deleteElement);
  const toggleElementVisibility = useStore((state: any) => state.toggleElementVisibility);
  const toggleElementLocked = useStore((state: any) => state.toggleElementLocked);
  const reorderElements = useStore((state: any) => state.reorderElements);
  const renameElement = useStore((state: any) => state.renameElement);
  const canUndo = useStore((state: any) => state.historyIndex > 0);
  const canRedo = useStore((state: any) => state.historyIndex < state.history.length - 1);
  const undo = useStore((state: any) => state.undo);
  const redo = useStore((state: any) => state.redo);
  const userRole = useStore((state: any) => state.userRole);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const orderedElements = [...elements].slice().reverse();

  const moveLayer = (realIndex: number, offset: number) => {
    reorderElements(realIndex, realIndex + offset);
  };

  return (
    <div className="side-menu__panel">
      <p className="side-menu__panel-title">Layers</p>

      <div className="layers-list">
        {orderedElements.map((item: any, index: number) => {
          const realIndex = elements.length - 1 - index;
          return (
            <div key={item.id} className={`layer-item ${selectedElementId === item.id ? "layer-item--selected" : ""}`}>
              <button
                className="layer-visibility"
                disabled={userRole === "viewer"}
                onClick={() => toggleElementVisibility(item.id)}
                title={item.visible ? "Hide" : "Show"}
              >
                {item.visible ? "👁" : "🚫"}
              </button>
              <button
                className="layer-lock"
                disabled={userRole === "viewer"}
                onClick={() => toggleElementLocked(item.id)}
                title={item.locked ? "Unlock" : "Lock"}
              >
                {item.locked ? "🔒" : "🔓"}
              </button>
              {editingId === item.id && userRole !== "viewer" ? (
                <input
                  type="text"
                  className="layer-name-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => {
                    if (editName.trim()) {
                      renameElement(item.id, editName.trim());
                    }
                    setEditingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (editName.trim()) {
                        renameElement(item.id, editName.trim());
                      }
                      setEditingId(null);
                    } else if (e.key === "Escape") {
                      setEditingId(null);
                    }
                  }}
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  className="layer-name"
                  onClick={() => selectElement(item.id)}
                  onDoubleClick={() => {
                    if (userRole === "viewer") return;
                    setEditingId(item.id);
                    setEditName(item.name || item.type);
                  }}
                  title={userRole === "viewer" ? "" : "Double click to rename"}
                >
                  {item.name || item.type}
                </button>
              )}
              <div className="layer-actions">
                <button
                  type="button"
                  disabled={realIndex >= elements.length - 1 || userRole === "viewer"}
                  onClick={() => moveLayer(realIndex, 1)}
                  title="Move layer up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={realIndex <= 0 || userRole === "viewer"}
                  onClick={() => moveLayer(realIndex, -1)}
                  title="Move layer down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="layer-remove"
                  disabled={userRole === "viewer"}
                  onClick={() => deleteElement(item.id)}
                  title="Delete layer"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="layer-history-controls">
        <button type="button" onClick={undo} disabled={!canUndo || userRole === "viewer"} className="layer-history-btn">
          Undo
        </button>
        <button type="button" onClick={redo} disabled={!canRedo || userRole === "viewer"} className="layer-history-btn">
          Redo
        </button>
      </div>
    </div>
  );
}
