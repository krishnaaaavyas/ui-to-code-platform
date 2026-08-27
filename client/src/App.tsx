import React, { useState, useRef } from "react";
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

=======
import SideMenu from "./components/SideMenu";
import CodePreviewPanel from "./components/CodePreviewPanel";
import Modal from "./components/Modal";
import VerticalToolRail from "./components/VerticalToolRail";
import {useStore} from "./store/useStore";

        function App() {
  const canvasRef = useRef<any>(null);
          const [activeLeftTab, setActiveLeftTab] = useState<string | null>(null);

  // Bind Zustand layout states
  const codePreviewOpen = useStore((state: any) => state.codePreviewOpen);
  const setCodePreviewOpen = useStore((state: any) => state.setCodePreviewOpen);
  const codeGenResult = useStore((state: any) => state.codeGenResult);
  const proposedRefinedResult = useStore((state: any) => state.proposedRefinedResult);
  const codeGenLoading = useStore((state: any) => state.codeGenLoading);
  const codeGenError = useStore((state: any) => state.codeGenError);
  const refineCode = useStore((state: any) => state.refineCode);
  const generateCode = useStore((state: any) => state.generateCode);
  const acceptRefinement = useStore((state: any) => state.acceptRefinement);
  const rejectRefinement = useStore((state: any) => state.rejectRefinement);

  const isSchemaInspectorOpen = useStore((state: any) => state.isSchemaInspectorOpen);
  const setIsSchemaInspectorOpen = useStore((state: any) => state.setIsSchemaInspectorOpen);
  const localSchema = useStore((state: any) => state.localSchema);

          return (
          <ErrorBoundary>
            <AppBar />
            <div className="app">
              {/* Left Side: compact tool rail + contextual side panel drawer */}
              <VerticalToolRail
                activeLeftTab={activeLeftTab}
                setActiveLeftTab={setActiveLeftTab}
              />
              {activeLeftTab && (
                <SideMenu
                  activeTab={activeLeftTab}
                  onClose={() => setActiveLeftTab(null)}
                  onExportPNG={() => canvasRef.current?.exportToPNG()}
                  onExportJSON={() => canvasRef.current?.exportToJSON()}
                  onImportJSON={(e) => canvasRef.current?.importJSON(e)}
                />
              )}

              {/* Center Side: large dominant canvas split-screen side-by-side with non-blocking code preview */}
              <div className="center-workspace">
                <CanvasBase ref={canvasRef} />
                {codePreviewOpen && (
                  <CodePreviewPanel
                    isOpen={codePreviewOpen}
                    onClose={() => setCodePreviewOpen(false)}
                    result={codeGenResult}
                    proposedRefinedResult={proposedRefinedResult}
                    isLoading={codeGenLoading}
                    error={codeGenError}
                    onRefine={refineCode}
                    onRegenerate={generateCode}
                    onAcceptRefinement={acceptRefinement}
                    onRejectRefinement={rejectRefinement}
                  />
                )}
              </div>

              {/* Right Side: Contextual properties inspector */}
              <InspectorPanel />
>>>>>>> fe697756c3262537b90bc1394232aac727083dd2
              <Toast />

              {/* Schema Inspector Modal overlay */}
              {isSchemaInspectorOpen && (
                <Modal
                  title={
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "8px",
                          background: "rgba(99,102,241,0.15)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        </svg>
                      </div>
                      <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>
                        UI Schema Inspector
                      </span>
                    </div>
                  }
                  onClose={() => setIsSchemaInspectorOpen(false)}
                  footer={
                    <button
                      type="button"
                      className="side-menu__btn-secondary"
                      onClick={() => setIsSchemaInspectorOpen(false)}
                    >
                      Close
                    </button>
                  }
                >
                  <p style={{ margin: "0 0 12px", fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                    This is the raw, frontend-extracted semantic AST generated by the canvas transformer. It is normalized and enriched downstream by the AI generation pipeline.
                  </p>
                  <pre
                    style={{
                      margin: 0,
                      padding: "14px",
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "11px",
                      color: "var(--text-primary)",
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      overflowX: "auto",
                      maxHeight: "380px",
                    }}
                  >
                    {JSON.stringify(localSchema, null, 2)}
                  </pre>
                </Modal>
              )}
            </div>
          </ErrorBoundary>
          );
}

          export default App;
