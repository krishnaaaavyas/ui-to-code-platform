import { useEffect } from "react";
import { useStore } from "../store/useStore";
import { getSocket } from "../lib/socket";

export function useKeyboardShortcuts() {
  const selectedElementId = useStore((state: any) => state.selectedElementId);
  const userRole = useStore((state: any) => state.userRole);
  const documentId = useStore((state: any) => state.documentId);
  const deleteElement = useStore((state: any) => state.deleteElement);
  const selectElement = useStore((state: any) => state.selectElement);
  const setDraftElement = useStore((state: any) => state.setDraftElement);
  const setIsDrawing = useStore((state: any) => state.setIsDrawing);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === "INPUT" || 
        activeEl.tagName === "TEXTAREA" || 
        (activeEl as HTMLElement).isContentEditable
      );

      if (isInput) return;

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (userRole === "viewer") return;
        if (e.shiftKey) {
          useStore.getState().redo();
          const socket = getSocket();
          if (socket && socket.connected) {
            socket.emit("element.op", {
              documentId,
              op: { type: "canvas.update", payload: { elements: useStore.getState().elements } }
            });
          }
        } else {
          useStore.getState().undo();
          const socket = getSocket();
          if (socket && socket.connected) {
            socket.emit("element.op", {
              documentId,
              op: { type: "canvas.update", payload: { elements: useStore.getState().elements } }
            });
          }
        }
      } else if (cmdOrCtrl && e.key.toLowerCase() === "y") {
        e.preventDefault();
        if (userRole === "viewer") return;
        useStore.getState().redo();
        const socket = getSocket();
        if (socket && socket.connected) {
          socket.emit("element.op", {
            documentId,
            op: { type: "canvas.update", payload: { elements: useStore.getState().elements } }
          });
        }
      } else if (cmdOrCtrl && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (userRole === "viewer") return;
        if (selectedElementId) {
          useStore.getState().duplicateElement(selectedElementId);
        }
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (userRole === "viewer") return;
        if (selectedElementId) {
          e.preventDefault();
          deleteElement(selectedElementId);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        selectElement(null);
        setDraftElement(null);
        setIsDrawing(false);
      } else if (!cmdOrCtrl) {
        if (e.key.toLowerCase() === "v") {
          e.preventDefault();
          useStore.getState().setActiveTool("Shapes");
        } else if (e.key.toLowerCase() === "t") {
          e.preventDefault();
          useStore.getState().setActiveTool("Text");
        } else if (e.key.toLowerCase() === "p") {
          e.preventDefault();
          useStore.getState().setActiveTool("Stroke");
        } else if (e.key.toLowerCase() === "b") {
          e.preventDefault();
          useStore.getState().setActiveTool("Background");
        } else if (e.key.toLowerCase() === "d") {
          e.preventDefault();
          useStore.getState().setActiveTool("Designs");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedElementId, deleteElement, selectElement, setDraftElement, setIsDrawing, userRole, documentId]);
}
