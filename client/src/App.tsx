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
  const inspectorTab = useStore((state: any) => state.inspectorTab);

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
      <div className="h-screen w-screen flex flex-col bg-[#09090b] text-zinc-100 overflow-hidden select-none">
        {/* Top-Bar */}
        <div className="h-12 border-b border-zinc-800 shrink-0 z-30">
          <AppBar />
        </div>

        {/* Main Workspace Area */}
        <div className="flex flex-1 w-full h-[calc(100vh-48px)] relative overflow-hidden">
          {/* Left Sidebar */}
          <div className="w-60 border-r border-zinc-800 bg-[#121215] flex flex-col shrink-0 z-20 overflow-y-auto">
            <SideMenu
              collapsed={menuCollapsed}
              onToggle={() => setMenuCollapsed(!menuCollapsed)}
              onExportPNG={handleExportPNG}
              onExportJSON={handleExportJSON}
              onImportJSON={handleImportJSON}
            />
          </div>

          {/* Center Canvas Area */}
          <main className="flex-1 h-full relative overflow-hidden bg-[#09090b] bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:20px_20px]">
            {/* The Konva Canvas */}
            <div className="w-full h-full">
              <CanvasBase />
            </div>

            {/* Floating Tool Dock */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
              <ToolDock />
            </div>
          </main>

          {/* Right Sidebar */}
          {rightPanelOpen && (
            <div className={`border-l border-zinc-800 bg-[#121215] flex flex-col shrink-0 z-20 overflow-y-auto transition-all duration-200 ${
              inspectorTab === "Code" ? "w-[450px]" : "w-72"
            }`}>
              <InspectorPanel />
            </div>
          )}
        </div>

        <Toast />
      </div>
    </ErrorBoundary>
  );
}

export default App;
