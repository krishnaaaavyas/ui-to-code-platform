import { useMemo, useState } from "react";
import { useStore } from "../store/useStore";

export default function LayersPanel() {
  const elements = useStore((state) => state.elements);
  const selectedIds = useStore((state) => state.selectedIds);
  const selectSingle = useStore((state) => state.selectSingle);
  const toggleSelectedId = useStore((state) => state.toggleSelectedId);
  const toggleHidden = useStore((state) => state.toggleHidden);
  const toggleLocked = useStore((state) => state.toggleLocked);
  const reorderElements = useStore((state) => state.reorderElements);

  const [draggingId, setDraggingId] = useState(null);
  const reversed = useMemo(() => [...elements].reverse(), [elements]);

  return (
    <aside className="layers-panel">
      <div className="panel-header">
        <h3>Layers</h3>
        <span>{elements.length}</span>
      </div>

      <div className="layer-list">
        {reversed.length === 0 ? (
          <div className="layer-empty">No layers yet</div>
        ) : (
          reversed.map((element) => (
            <div
              key={element.id}
              draggable
              onDragStart={() => setDraggingId(element.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (draggingId && draggingId !== element.id) {
                  reorderElements(draggingId, element.id);
                }
                setDraggingId(null);
              }}
              className={
                selectedIds.includes(element.id)
                  ? "layer-item active"
                  : "layer-item"
              }
            >
              <button
                className="layer-main"
                onClick={(e) => {
                  if (e.shiftKey || e.ctrlKey || e.metaKey) {
                    toggleSelectedId(element.id);
                  } else {
                    selectSingle(element.id);
                  }
                }}
              >
                <span className="layer-type">{element.type}</span>
                <span className="layer-name">
                  {element.type === "text"
                    ? element.text?.slice(0, 18) || "Text"
                    : `${element.type}-${element.id.slice(0, 4)}`}
                </span>
              </button>

              <div className="layer-controls">
                <button
                  className={element.hidden ? "mini-btn active" : "mini-btn"}
                  onClick={() => toggleHidden(element.id)}
                  title="Hide / show"
                >
                  {element.hidden ? "H" : "S"}
                </button>
                <button
                  className={element.locked ? "mini-btn active" : "mini-btn"}
                  onClick={() => toggleLocked(element.id)}
                  title="Lock / unlock"
                >
                  {element.locked ? "L" : "U"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}