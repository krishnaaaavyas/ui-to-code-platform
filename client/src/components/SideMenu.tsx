import React from "react";
import LayersPanel from "./LayersPanel";
import DesignsPanel from "./DesignsPanel";
import ComponentsPanel from "./ComponentsPanel";

interface SideMenuProps {
  activeTab: string;
  onClose: () => void;
  onExportPNG: () => void;
  onExportJSON: () => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function SideMenu({
  activeTab,
  onClose,
  onExportPNG,
  onExportJSON,
  onImportJSON,
}: SideMenuProps) {
  const renderToolPanel = () => {
    switch (activeTab) {
      case "Layers":
        return <LayersPanel />;
      case "Assets":
        return (
          <DesignsPanel
            onExportPNG={onExportPNG}
            onExportJSON={onExportJSON}
            onImportJSON={onImportJSON}
          />
        );
      case "Components":
      default:
        return <ComponentsPanel />;
    }
  };

  return (
    <aside className="side-menu">
      <div className="side-menu__top" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <div className="side-menu__header">
          <span className="side-menu__label">{activeTab}</span>
          <button
            type="button"
            className="side-menu__toggle"
            onClick={onClose}
            aria-label="Close panel"
            style={{ fontSize: "12px", padding: "4px 8px", cursor: "pointer" }}
          >
            ←
          </button>
        </div>

        <div className="side-menu__body" style={{ flex: 1, display: "flex", minHeight: 0, flexDirection: "column" }}>
          <div className="side-menu__content" style={{ flex: 1, overflowY: "auto" }}>
            {renderToolPanel()}
          </div>
        </div>
      </div>
    </aside>
  );
}
