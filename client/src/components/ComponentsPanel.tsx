import React from "react";
import { useStore } from "../store/useStore";

export default function ComponentsPanel() {
  const elements = useStore((state: any) => state.elements);
  const selectedElementId = useStore((state: any) => state.selectedElementId);
  const updateElement = useStore((state: any) => state.updateElement);
  const userRole = useStore((state: any) => state.userRole);

  const boardWidth = useStore((state: any) => state.boardWidth);
  const boardHeight = useStore((state: any) => state.boardHeight);
  const setBoardWidth = useStore((state: any) => state.setBoardWidth);
  const setBoardHeight = useStore((state: any) => state.setBoardHeight);
  const backgroundColor = useStore((state: any) => state.backgroundColor);
  const setBackgroundColor = useStore((state: any) => state.setBackgroundColor);

  const selectedItem = elements.find((item: any) => item.id === selectedElementId) || null;

  return (
    <div className="side-menu__panel" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
