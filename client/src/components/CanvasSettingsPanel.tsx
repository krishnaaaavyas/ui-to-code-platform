import React from "react";
import { useStore } from "../store/useStore";

export default function CanvasSettingsPanel() {
  const userRole = useStore((state: any) => state.userRole);
  const boardWidth = useStore((state: any) => state.boardWidth);
  const boardHeight = useStore((state: any) => state.boardHeight);
  const setBoardWidth = useStore((state: any) => state.setBoardWidth);
  const setBoardHeight = useStore((state: any) => state.setBoardHeight);
  const backgroundColor = useStore((state: any) => state.backgroundColor);
  const setBackgroundColor = useStore((state: any) => state.setBackgroundColor);

  return (
    <div className="side-menu__panel" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div className="side-menu__section-card">
        <p className="side-menu__panel-title" style={{ margin: "0 0 12px 0" }}>Canvas Settings</p>
        
        <div className="shape-settings__field" style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Background Color</label>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="color"
              value={backgroundColor}
              disabled={userRole === "viewer"}
              onChange={(e) => setBackgroundColor(e.target.value)}
              style={{
                WebkitAppearance: "none",
                border: "none",
                width: "32px",
                height: "32px",
                borderRadius: "6px",
                cursor: "pointer",
                background: "none",
                padding: 0
              }}
            />
            <input
              type="text"
              value={backgroundColor}
              disabled={userRole === "viewer"}
              onChange={(e) => setBackgroundColor(e.target.value)}
              style={{
                background: "var(--panel-soft)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-primary)",
                fontSize: "12px",
                padding: "6px 10px",
                fontFamily: "monospace",
                flex: 1
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div className="side-menu__field" style={{ display: "flex", flexDirection: "column", gap: "4px", margin: 0 }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Board Width (px)</span>
            <input
              type="number"
              value={boardWidth}
              disabled={userRole === "viewer"}
              onChange={(e) => setBoardWidth(Number(e.target.value))}
              style={{
                background: "var(--panel-soft)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-primary)",
                fontSize: "12px",
                padding: "8px",
                width: "100%"
              }}
            />
          </div>
          <div className="side-menu__field" style={{ display: "flex", flexDirection: "column", gap: "4px", margin: 0 }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Board Height (px)</span>
            <input
              type="number"
              value={boardHeight}
              disabled={userRole === "viewer"}
              onChange={(e) => setBoardHeight(Number(e.target.value))}
              style={{
                background: "var(--panel-soft)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-primary)",
                fontSize: "12px",
                padding: "8px",
                width: "100%"
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
