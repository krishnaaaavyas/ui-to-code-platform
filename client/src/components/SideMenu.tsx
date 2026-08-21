import React, { useState } from "react";
import { Layers as LayersIcon, FolderOpen, Shapes } from "lucide-react";
import { useStore } from "../store/useStore";
import LayersPanel from "./LayersPanel";
import DesignsPanel from "./DesignsPanel";
import ComponentsPanel from "./ComponentsPanel";

const toolOptions = [
  { name: "Layers", icon: LayersIcon },
  { name: "Assets", icon: FolderOpen },
  { name: "Components", icon: Shapes },
];

interface SideMenuProps {
  collapsed: boolean;
  onToggle: () => void;
  onExportPNG: () => void;
  onExportJSON: () => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function SideMenu({
  collapsed,
  onToggle,
  onExportPNG,
  onExportJSON,
  onImportJSON,
}: SideMenuProps) {
  const [activeTab, setActiveTab] = useState<string>("Components");

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
    <aside className={`side-menu ${collapsed ? "side-menu--collapsed" : ""}`}>
      <div className="side-menu__top" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <div className="side-menu__header">
          {!collapsed && <span className="side-menu__label">{activeTab}</span>}

          <button
            type="button"
            className="side-menu__toggle"
            onClick={onToggle}
            aria-label={collapsed ? "Open side menu" : "Collapse side menu"}
          >
            {collapsed ? "→" : "←"}
          </button>
        </div>

        {!collapsed && (
          <div className="side-menu__body" style={{ flex: 1, display: "flex", minHeight: 0 }}>
            <div className="tool-rail" style={{ flexShrink: 0 }}>
              {toolOptions.map((tool) => {
                const Icon = tool.icon;
                const isActive = activeTab === tool.name;
                return (
                  <button
                    key={tool.name}
                    type="button"
                    className={`tool-rail__item ${isActive ? "tool-rail__item--active" : ""}`}
                    onClick={() => setActiveTab(tool.name)}
                    title={tool.name}
                    aria-label={tool.name}
                  >
                    <Icon size={18} />
                  </button>
                );
              })}
            </div>

            <div className="side-menu__content" style={{ flex: 1, overflowY: "auto" }}>
              {renderToolPanel()}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
