import React from "react";
import LayersPanel from "./LayersPanel";
import DesignsPanel from "./DesignsPanel";
import { useStore } from "../store/useStore";

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
  const [activeLeftTab, setActiveLeftTab] = React.useState<"Layers" | "Designs">("Layers");
  const menuCollapsed = useStore((state: any) => state.menuCollapsed);
  const setMenuCollapsed = useStore((state: any) => state.setMenuCollapsed);

  const renderToolPanel = () => {
    switch (activeLeftTab) {
      case "Layers":
        return <LayersPanel />;
      case "Designs":
        return (
          <DesignsPanel
            onExportPNG={onExportPNG}
            onExportJSON={onExportJSON}
            onImportJSON={onImportJSON}
          />
        );
      default:
        return null;
    }
  };

  return (
    <aside className={`side-menu ${menuCollapsed ? "side-menu--collapsed" : ""}`}>
      {/* Sticky Tab Header */}
      {!menuCollapsed && (
        <div className="side-menu__tab-header flex border-b border-zinc-800 bg-zinc-950 flex-shrink-0" style={{ height: "36px" }}>
          <button
            onClick={() => setActiveLeftTab("Layers")}
            className={`flex-1 text-center text-xs font-semibold border-b-2 transition-colors ${
              activeLeftTab === "Layers"
                ? "border-indigo-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Layers
          </button>
          <button
            onClick={() => setActiveLeftTab("Designs")}
            className={`flex-1 text-center text-xs font-semibold border-b-2 transition-colors ${
              activeLeftTab === "Designs"
                ? "border-indigo-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Pages
          </button>
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
            onClick={() => setMenuCollapsed(true)}
            title="Collapse Sidebar"
          >
            ✕
          </button>
        </div>
      )}

      {menuCollapsed && (
        <div className="side-menu__collapsed-trigger p-2 text-center">
          <button
            type="button"
            onClick={() => setMenuCollapsed(false)}
            className="w-8 h-8 rounded bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all font-bold"
            title="Expand Sidebar"
          >
            +
          </button>
        </div>
      )}

      {!menuCollapsed && (
        <div className="side-menu__content flex-1 overflow-y-auto">
          {renderToolPanel()}
        </div>
      )}
    </aside>
  );
}
