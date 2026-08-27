import React, { useState, useEffect } from "react";
import { Folder, ArrowLeft, Code, Eye, Sparkles, Plus, Minus, Maximize2, Share2, LogOut, LogIn, Save } from "lucide-react";
import { useStore } from "../store/useStore";

export default function AppBar() {
  const user = useStore((state: any) => state.user);
  const documentName = useStore((state: any) => state.documentName);
  const setDocumentName = useStore((state: any) => state.setDocumentName);
  const saveStatus = useStore((state: any) => state.saveStatus);
  const zoomScale = useStore((state: any) => state.zoomScale);
  
  const rightPanelOpen = useStore((state: any) => state.rightPanelOpen);
  const setRightPanelOpen = useStore((state: any) => state.setRightPanelOpen);
  const inspectorTab = useStore((state: any) => state.inspectorTab);
  const setInspectorTab = useStore((state: any) => state.setInspectorTab);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(documentName);

  useEffect(() => {
    setTitleInput(documentName);
  }, [documentName]);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim()) {
      setDocumentName(titleInput.trim());
    } else {
      setTitleInput(documentName);
    }
  };

  const handleZoomIn = () => {
    window.dispatchEvent(new CustomEvent("trigger-zoom-in"));
  };

  const handleZoomOut = () => {
    window.dispatchEvent(new CustomEvent("trigger-zoom-out"));
  };

  const handleZoomFit = () => {
    window.dispatchEvent(new CustomEvent("trigger-zoom-fit"));
  };

  const handleGenerateCodeClick = () => {
    window.dispatchEvent(new CustomEvent("trigger-generate-code"));
    setInspectorTab("Code");
    setRightPanelOpen(true);
  };

  const handleToggleCodeDrawer = () => {
    if (rightPanelOpen && inspectorTab === "Code") {
      setRightPanelOpen(false);
    } else {
      setInspectorTab("Code");
      setRightPanelOpen(true);
    }
  };

  const handleExportPNG = () => {
    window.dispatchEvent(new CustomEvent("trigger-export-png"));
  };

  const handleExportJSON = () => {
    window.dispatchEvent(new CustomEvent("trigger-export-json"));
  };

  const renderSaveStatus = () => {
    switch (saveStatus) {
      case "saving":
        return <span className="app-bar__status text-zinc-400 text-xs">Saving...</span>;
      case "saved":
        return <span className="app-bar__status text-emerald-450 text-xs">Saved</span>;
      case "error":
        return <span className="app-bar__status text-rose-400 text-xs">Save Error</span>;
      case "conflict":
        return <span className="app-bar__status text-amber-400 text-xs">Conflict</span>;
      default:
        return null;
    }
  };

  return (
    <header className="app-bar flex items-center justify-between w-full px-4 h-full bg-[#121215]">
      {/* Left Section */}
      <div className="app-bar__left flex items-center gap-3 whitespace-nowrap">
        <div className="app-bar__logo flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20">
            A
          </div>
          <span className="font-bold text-sm tracking-tight text-white hidden md:inline">Antigravity Design</span>
        </div>

        <div className="flex items-center gap-2">
          {isEditingTitle ? (
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleSubmit();
                if (e.key === "Escape") {
                  setIsEditingTitle(false);
                  setTitleInput(documentName);
                }
              }}
              className="app-bar__title-input px-3 py-1 bg-zinc-800 border border-indigo-500 text-white text-xs rounded-full outline-none focus:ring-1 focus:ring-indigo-500"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setIsEditingTitle(true)}
              className="app-bar__title-pill px-3 py-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-xs rounded-full font-medium transition-all"
              title="Click to rename design"
            >
              {documentName || "Untitled Design"}
            </button>
          )}
          {renderSaveStatus()}
        </div>
      </div>

      {/* Center Section: Zoom Controls */}
      <div className="flex-1 flex justify-center">
        <div className="bg-zinc-800/80 border border-zinc-700 rounded-lg px-2 py-1 flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Zoom Out"
          >
            <Minus size={14} />
          </button>
          <span className="text-zinc-300 text-[11px] font-mono font-medium min-w-[32px] text-center">
            {Math.round(zoomScale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Zoom In"
          >
            <Plus size={14} />
          </button>
          <div className="w-[1px] h-3 bg-zinc-650 mx-1" />
          <button
            onClick={handleZoomFit}
            className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Fit to Screen"
          >
            <Maximize2 size={12} />
          </button>
        </div>
      </div>

      {/* Right Section */}
      <div className="app-bar__right flex items-center gap-2">
        <div className="dropdown relative group">
          <button
            type="button"
            className="app-bar__action-btn app-bar__action-btn--secondary py-1.5 px-3 rounded-lg text-xs"
          >
            <span>Export</span>
          </button>
          <div className="absolute right-0 top-full mt-1.5 w-36 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl py-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 z-[1000]">
            <button
              onClick={handleExportPNG}
              className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition-colors"
            >
              Export as PNG
            </button>
            <button
              onClick={handleExportJSON}
              className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition-colors"
            >
              Export as JSON
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleCodeDrawer}
          className={`app-bar__action-btn app-bar__action-btn--secondary py-1.5 px-3 rounded-lg text-xs flex items-center gap-1.5 ${
            rightPanelOpen && inspectorTab === "Code" ? "bg-zinc-800 border-zinc-700 text-white" : ""
          }`}
          title="Toggle code preview panel"
        >
          <Code size={13} />
          <span>Code Panel</span>
        </button>

        {user && (
          <button
            id="app-bar-generate-code-btn"
            type="button"
            className="app-bar__action-btn app-bar__action-btn--primary py-1.5 px-3 rounded-lg text-xs flex items-center gap-1.5"
            onClick={handleGenerateCodeClick}
            title="Convert canvas to live React code"
          >
            <Sparkles size={13} className="text-amber-300 animate-pulse" />
            <span>Generate Code</span>
          </button>
        )}
      </div>
    </header>
  );
}
