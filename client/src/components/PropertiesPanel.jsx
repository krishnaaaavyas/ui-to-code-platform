import { useMemo } from "react";
import { useStore } from "../store/useStore";

export default function PropertiesPanel() {
  const elements = useStore((state) => state.elements);
  const selectedIds = useStore((state) => state.selectedIds);
  const updateElement = useStore((state) => state.updateElement);
  const deleteSelected = useStore((state) => state.deleteSelected);
  const duplicateSelected = useStore((state) => state.duplicateSelected);
  const groupSelected = useStore((state) => state.groupSelected);
  const ungroupSelected = useStore((state) => state.ungroupSelected);

  const selectedElement = useMemo(() => {
    const lastId = selectedIds[selectedIds.length - 1];
    return elements.find((el) => el.id === lastId);
  }, [elements, selectedIds]);

  if (!selectedIds.length) {
    return (
      <aside className="properties-panel empty">
        <div className="panel-header">
          <h3>Inspector</h3>
        </div>
        <p>Select a layer to edit properties.</p>
      </aside>
    );
  }

  if (selectedIds.length > 1) {
    return (
      <aside className="properties-panel">
        <div className="panel-header">
          <h3>Inspector</h3>
        </div>

        <div className="multi-select-box">
          <h4>{selectedIds.length} layers selected</h4>
          <p>Use grouping, ordering, and duplicate actions together.</p>
        </div>

        <div className="inspector-actions stacked">
          <button className="secondary-btn" onClick={groupSelected}>
            Group selected
          </button>
          <button className="secondary-btn" onClick={ungroupSelected}>
            Ungroup
          </button>
          <button className="secondary-btn" onClick={duplicateSelected}>
            Duplicate
          </button>
          <button className="delete-btn" onClick={deleteSelected}>
            Delete
          </button>
        </div>
      </aside>
    );
  }

  if (!selectedElement) return null;

  const onChange = (key, value) => {
    updateElement(selectedElement.id, { [key]: value });
  };

  return (
    <aside className="properties-panel">
      <div className="panel-header">
        <h3>Inspector</h3>
      </div>

      <div className="field">
        <label>Type</label>
        <input value={selectedElement.type} disabled />
      </div>

      {"x" in selectedElement && (
        <>
          <div className="field">
            <label>X</label>
            <input
              type="number"
              value={Math.round(selectedElement.x || 0)}
              onChange={(e) => onChange("x", Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Y</label>
            <input
              type="number"
              value={Math.round(selectedElement.y || 0)}
              onChange={(e) => onChange("y", Number(e.target.value))}
            />
          </div>
        </>
      )}

      {"rotation" in selectedElement && (
        <div className="field">
          <label>Rotation</label>
          <input
            type="number"
            value={Math.round(selectedElement.rotation || 0)}
            onChange={(e) => onChange("rotation", Number(e.target.value))}
          />
        </div>
      )}

      {"width" in selectedElement && (
        <div className="field">
          <label>Width</label>
          <input
            type="number"
            value={Math.round(selectedElement.width || 0)}
            onChange={(e) => onChange("width", Number(e.target.value))}
          />
        </div>
      )}

      {"height" in selectedElement && (
        <div className="field">
          <label>Height</label>
          <input
            type="number"
            value={Math.round(selectedElement.height || 0)}
            onChange={(e) => onChange("height", Number(e.target.value))}
          />
        </div>
      )}

      {"radius" in selectedElement && (
        <div className="field">
          <label>Radius</label>
          <input
            type="number"
            value={Math.round(selectedElement.radius || 0)}
            onChange={(e) => onChange("radius", Number(e.target.value))}
          />
        </div>
      )}

      {"text" in selectedElement && (
        <>
          <div className="field">
            <label>Text</label>
            <input
              value={selectedElement.text}
              onChange={(e) => onChange("text", e.target.value)}
            />
          </div>

          <div className="field">
            <label>Font size</label>
            <input
              type="range"
              min="12"
              max="120"
              value={selectedElement.fontSize || 24}
              onChange={(e) => onChange("fontSize", Number(e.target.value))}
            />
          </div>
        </>
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
            max="20"
            value={selectedElement.strokeWidth || 1}
            onChange={(e) => onChange("strokeWidth", Number(e.target.value))}
          />
        </div>
      )}

      <div className="field">
        <label>Opacity</label>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.1"
          value={selectedElement.opacity || 1}
          onChange={(e) => onChange("opacity", Number(e.target.value))}
        />
      </div>

      <div className="inspector-actions">
        <button className="secondary-btn" onClick={duplicateSelected}>
          Duplicate
        </button>
        <button className="delete-btn" onClick={deleteSelected}>
          Delete
        </button>
      </div>
    </aside>
  );
}