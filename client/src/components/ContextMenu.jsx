import { useEffect } from "react";
import { useStore } from "../store/useStore";

export default function ContextMenu() {
  const contextMenu = useStore((state) => state.contextMenu);
  const hideContextMenu = useStore((state) => state.hideContextMenu);
  const duplicateSelected = useStore((state) => state.duplicateSelected);
  const deleteSelected = useStore((state) => state.deleteSelected);
  const groupSelected = useStore((state) => state.groupSelected);
  const ungroupSelected = useStore((state) => state.ungroupSelected);
  const bringToFront = useStore((state) => state.bringToFront);
  const sendToBack = useStore((state) => state.sendToBack);
  const copySelected = useStore((state) => state.copySelected);
  const pasteClipboard = useStore((state) => state.pasteClipboard);
  const cutSelected = useStore((state) => state.cutSelected);

  useEffect(() => {
    const close = () => hideContextMenu();
    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
    };
  }, [hideContextMenu]);

  if (!contextMenu.visible) return null;

  return (
    <div
      className="context-menu"
      style={{ left: contextMenu.x, top: contextMenu.y }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button onClick={copySelected}>Copy</button>
      <button onClick={pasteClipboard}>Paste</button>
      <button onClick={cutSelected}>Cut</button>
      <div className="context-divider" />
      <button onClick={duplicateSelected}>Duplicate</button>
      <button onClick={groupSelected}>Group</button>
      <button onClick={ungroupSelected}>Ungroup</button>
      <button onClick={bringToFront}>Bring to front</button>
      <button onClick={sendToBack}>Send to back</button>
      <div className="context-divider" />
      <button className="danger" onClick={deleteSelected}>
        Delete
      </button>
    </div>
  );
}