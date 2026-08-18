import { useStore } from "../store/useStore";

export default function InspectorPanel() {
  const elements = useStore((state: any) => state.elements);
  const selectedElementId = useStore((state: any) => state.selectedElementId);
  const selectedElement = elements.find((element: any) => element.id === selectedElementId);

  return (
    <aside className="inspector-panel" aria-label="Inspector">
      <div className="inspector-panel__header">
        <span className="inspector-panel__label">Inspector</span>
      </div>

      {selectedElement ? (
        <dl className="inspector-panel__properties">
          <div className="inspector-panel__property">
            <dt>Fill</dt>
            <dd>{selectedElement.fill ?? "None"}</dd>
          </div>
          <div className="inspector-panel__property">
            <dt>Position</dt>
            <dd>x: {selectedElement.x}, y: {selectedElement.y}</dd>
          </div>
        </dl>
      ) : (
        <p className="inspector-panel__empty">No selection</p>
      )}
    </aside>
  );
}
