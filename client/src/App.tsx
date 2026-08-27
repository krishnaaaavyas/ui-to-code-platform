import React from "react";
import "./App.css";
import AppBar from "./components/AppBar";
import CanvasBase from "./components/CanvasBase";
import InspectorPanel from "./components/InspectorPanel";
import SideMenu from "./components/SideMenu";
import ToolDock from "./components/ToolDock";
import Toast from "./components/Toast";
import ErrorBoundary from "./components/ErrorBoundary";
import { useStore } from "./store/useStore";

function App() {
  const menuCollapsed = useStore((state: any) => state.menuCollapsed);
  const setMenuCollapsed = useStore((state: any) => state.setMenuCollapsed);
  const rightPanelOpen = useStore((state: any) => state.rightPanelOpen);

  const handleExportPNG = () => {
    window.dispatchEvent(new CustomEvent("trigger-export-png"));
  };

  const handleExportJSON = () => {
    window.dispatchEvent(new CustomEvent("trigger-export-json"));
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    window.dispatchEvent(new CustomEvent("trigger-import-json", { detail: e }));
  };

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen overflow-hidden bg-[#09090b]">
        {/* Top-Bar */}
        <AppBar />

        {/* 3-Column Layout */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* Left Sidebar (Layers & Pages) */}
          <SideMenu
            collapsed={menuCollapsed}
            onToggle={() => setMenuCollapsed(!menuCollapsed)}
            onExportPNG={handleExportPNG}
            onExportJSON={handleExportJSON}
            onImportJSON={handleImportJSON}
          />

          {/* Center Canvas Viewport */}
          <main className="flex-1 relative overflow-hidden bg-[#09090b]">
            {/* Dark Dot Grid */}
            <div 
              className="absolute inset-0 pointer-events-none" 
              style={{
                backgroundImage: "radial-gradient(#27272a 1.2px, transparent 1.2px)",
                backgroundSize: "20px 20px"
              }}
            />
            
            {/* The Konva Canvas */}
            <CanvasBase />

            {/* Floating Tool Dock */}
            <ToolDock />
          </main>

          {/* Right Sidebar (Design & Code Inspector) */}
          {rightPanelOpen && <InspectorPanel />}
        </div>

        <Toast />
      </div>
    </ErrorBoundary>
  );
}

export default App;
