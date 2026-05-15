import { useMemo } from "react";
import { useStore } from "../../store/useStore.js";

export default function PropertiesPanel() {
  const elements = useStore((state) => state.elements);
  const selectedId = useStore((state) => state.selectedId);
  const updateElement = useStore((state) => state.updateElement);
  const deleteSelected = useStore((state) => state.deleteSelected);

  const selectedElement = useMemo(
    () => elements.find((el) => el.id === selectedId),
    [elements, selectedId]
  );

  if (!selectedElement) {
    return (
      <aside className="properties-panel empty">
        <h3>Properties</h3>
        <p>Select an item to edit its properties.</p>
      </aside>
    );
  }

  const onChange = (key, value) => {
    updateElement(selectedId, { [key]: value });
  };

  return (
    <aside className="properties-panel">
      <h3>Properties</h3>

      <div className="field">
        <label>Type</label>
        <input value={selectedElement.type} disabled />
      </div>

      {"text" in selectedElement && (
        <div className="field">
          <label>Text</label>
          <input
            value={selectedElement.text}
            onChange={(e) => onChange("text", e.target.value)}
          />
        </div>
      )}

      {"fill" in selectedElement && (
        <div className="field">
          <label>Fill</label>
          <input
            type="color"
            value={selectedElement.fill || "#000000"}
            onChange={(e) => onChange("fill", e.target.value)}
          />
        </div>
      )}

      {"stroke" in selectedElement && (
        <div className="field">
          <label>Stroke</label>
          <input
            type="color"
            value={selectedElement.stroke || "#000000"}
            onChange={(e) => onChange("stroke", e.target.value)}
          />
        </div>
      )}

      {"strokeWidth" in selectedElement && (
        <div className="field">
          <label>Stroke width</label>
          <input
            type="range"
            min="1"
            max="12"
            value={selectedElement.strokeWidth || 1}
            onChange={(e) => onChange("strokeWidth", Number(e.target.value))}
          />
        </div>
      )}

      <button className="delete-btn" onClick={deleteSelected}>
        Delete element
      </button>
    </aside>
  );
}