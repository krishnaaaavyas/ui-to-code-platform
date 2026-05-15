import { useEffect } from "react";
import ToolBar from "./components/canvas/ToolBar.jsx";
import DesignerCanvas from "./components/canvas/DesignerCanvas.jsx";
import PropertiesPanel from "./components/canvas/PropertiesPanel.jsx";
import { useStore } from "./store/useStore.js";
import "./App.css";

export default function App() {
  const deleteSelected = useStore((state) => state.deleteSelected);
  const clearSelection = useStore((state) => state.clearSelection);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        deleteSelected();
      }
      if (e.key === "Escape") {
        clearSelection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelected, clearSelection]);

  return (
    <div className="app-layout">
      <ToolBar />
      <div className="workspace">
        <DesignerCanvas />
        <PropertiesPanel />
      </div>
    </div>
  );
}