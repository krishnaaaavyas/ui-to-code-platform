import { useRef } from "react";
import { useStore } from "../store/useStore";

export default function TopBar({ onFitAll, onCenterSelection }) {
  const exportProject = useStore((state) => state.exportProject);
  const importProject = useStore((state) => state.importProject);
  const gridEnabled = useStore((state) => state.gridEnabled);
  const snapToGrid = useStore((state) => state.snapToGrid);
  const gridSize = useStore((state) => state.gridSize);
  const setGridEnabled = useStore((state) => state.setGridEnabled);
  const setSnapToGrid = useStore((state) => state.setSnapToGrid);
  const setGridSize = useStore((state) => state.setGridSize);

  const fileInputRef = useRef(null);

  const handleExport = () => {
    const project = exportProject();
    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "canvas-project.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const project = JSON.parse(text);
    importProject(project);
    e.target.value = "";
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-title">
          <strong>Phase 3 Studio</strong>
          <span>Grid, rulers, clipboard, JSON</span>
        </div>
      </div>

      <div className="topbar-controls">
        <label className="toggle-chip">
          <input
            type="checkbox"
            checked={gridEnabled}
            onChange={(e) => setGridEnabled(e.target.checked)}
          />
          <span>Grid</span>
        </label>

        <label className="toggle-chip">
          <input
            type="checkbox"
            checked={snapToGrid}
            onChange={(e) => setSnapToGrid(e.target.checked)}
          />
          <span>Snap</span>
        </label>

        <label className="grid-size-control">
          <span>Grid</span>
          <input
            type="range"
            min="8"
            max="64"
            step="4"
            value={gridSize}
            onChange={(e) => setGridSize(Number(e.target.value))}
          />
          <strong>{gridSize}px</strong>
        </label>

        <button className="top-action" onClick={onFitAll}>
          Fit all
        </button>
        <button className="top-action" onClick={onCenterSelection}>
          Center selection
        </button>
        <button className="top-action" onClick={handleExport}>
          Export JSON
        </button>
        <button className="top-action" onClick={handleImportClick}>
          Import JSON
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          hidden
          onChange={handleImportFile}
        />
      </div>
    </header>
  );
}