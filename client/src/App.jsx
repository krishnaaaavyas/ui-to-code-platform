import { useEffect } from "react";
import ToolBar from "./components/ToolBar";
import LayersPanel from "./components/LayersPanel";
import DesignerCanvas from "./components/DesignerCanvas";
import PropertiesPanel from "./components/PropertiesPanel";
import ContextMenu from "./components/ContextMenu";
import { useStore } from "./store/useStore";
import "./App.css";

export default function App() {
  const deleteSelected = useStore((state) => state.deleteSelected);
  const clearSelection = useStore((state) => state.clearSelection);
  const undo = useStore((state) => state.undo);
  const redo = useStore((state) => state.redo);
  const duplicateSelected = useStore((state) => state.duplicateSelected);
  const nudgeSelected = useStore((state) => state.nudgeSelected);
  const bringToFront = useStore((state) => state.bringToFront);
  const sendToBack = useStore((state) => state.sendToBack);
  const groupSelected = useStore((state) => state.groupSelected);
  const ungroupSelected = useStore((state) => state.ungroupSelected);
  const copySelected = useStore((state) => state.copySelected);
  const cutSelected = useStore((state) => state.cutSelected);
  const pasteClipboard = useStore((state) => state.pasteClipboard);
  const selectAll = useStore((state) => state.selectAll);
  const exportProject = useStore((state) => state.exportProject);
  const setTool = useStore((state) => state.setTool);
  const hideContextMenu = useStore((state) => state.hideContextMenu);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      const step = e.shiftKey ? 10 : 1;

      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      if (
        (mod && e.shiftKey && e.key.toLowerCase() === "z") ||
        (e.ctrlKey && e.key.toLowerCase() === "y")
      ) {
        e.preventDefault();
        redo();
        return;
      }

      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
        return;
      }

      if (mod && e.key.toLowerCase() === "c") {
        e.preventDefault();
        copySelected();
        return;
      }

      if (mod && e.key.toLowerCase() === "x") {
        e.preventDefault();
        cutSelected();
        return;
      }

      if (mod && e.key.toLowerCase() === "v") {
        e.preventDefault();
        pasteClipboard();
        return;
      }

      if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        selectAll();
        return;
      }

      if (mod && e.key.toLowerCase() === "g" && !e.shiftKey) {
        e.preventDefault();
        groupSelected();
        return;
      }

      if (mod && e.shiftKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        ungroupSelected();
        return;
      }

      if (mod && e.key === "]") {
        e.preventDefault();
        bringToFront();
        return;
      }

      if (mod && e.key === "[") {
        e.preventDefault();
        sendToBack();
        return;
      }

      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
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
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        deleteSelected();
        return;
      }

      if (e.key === "Escape") {
        clearSelection();
        hideContextMenu();
        setTool("select");
        return;
      }

      if (!mod) {
        if (e.key.toLowerCase() === "v") setTool("select");
        if (e.key.toLowerCase() === "h") setTool("pan");
        if (e.key.toLowerCase() === "r") setTool("rect");
        if (e.key.toLowerCase() === "c") setTool("circle");
        if (e.key.toLowerCase() === "t") setTool("text");
        if (e.key.toLowerCase() === "p") setTool("pen");
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        nudgeSelected(0, -step);
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        nudgeSelected(0, step);
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        nudgeSelected(-step, 0);
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        nudgeSelected(step, 0);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    deleteSelected,
    clearSelection,
    undo,
    redo,
    duplicateSelected,
    nudgeSelected,
    bringToFront,
    sendToBack,
    groupSelected,
    ungroupSelected,
    copySelected,
    cutSelected,
    pasteClipboard,
    selectAll,
    exportProject,
    setTool,
    hideContextMenu,
  ]);

  return (
    <div className="app-layout">
      <ToolBar />
      <main className="editor-shell">
        <LayersPanel />
        <DesignerCanvas />
        <PropertiesPanel />
      </main>
      <ContextMenu />
    </div>
  );
}