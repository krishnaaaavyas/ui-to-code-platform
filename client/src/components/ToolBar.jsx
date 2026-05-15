import { useStore } from "../store/useStore";

const tools = [
  { key: "select", label: "Select", shortcut: "V" },
  { key: "pan", label: "Hand", shortcut: "H" },
  { key: "rect", label: "Rect", shortcut: "R" },
  { key: "circle", label: "Circle", shortcut: "C" },
  { key: "text", label: "Text", shortcut: "T" },
  { key: "pen", label: "Pen", shortcut: "P" },
];

export default function ToolBar() {
  const tool = useStore((state) => state.tool);
  const fill = useStore((state) => state.fill);
  const stroke = useStore((state) => state.stroke);
  const strokeWidth = useStore((state) => state.strokeWidth);
  const setTool = useStore((state) => state.setTool);
  const setFill = useStore((state) => state.setFill);
  const setStroke = useStore((state) => state.setStroke);
  const setStrokeWidth = useStore((state) => state.setStrokeWidth);

  return (
    <aside className="toolbar">
      <div className="toolbar-brand">
        <div className="brand-badge">K</div>
        <div>
          <h1>Konva Studio</h1>
          <p>Phase 3 editor</p>
        </div>
      </div>

      <div className="toolbar-section">
        <span className="toolbar-label">Tools</span>
        <div className="tool-list">
          {tools.map((item) => (
            <button
              key={item.key}
              className={tool === item.key ? "tool-btn active" : "tool-btn"}
              onClick={() => setTool(item.key)}
            >
              <span>{item.label}</span>
              <kbd>{item.shortcut}</kbd>
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-section">
        <span className="toolbar-label">Style</span>

        <label className="input-row">
          <span>Fill</span>
          <input type="color" value={fill} onChange={(e) => setFill(e.target.value)} />
        </label>

        <label className="input-row">
          <span>Stroke</span>
          <input
            type="color"
            value={stroke}
            onChange={(e) => setStroke(e.target.value)}
          />
        </label>

        <label className="input-row">
          <span>Width</span>
          <input
            type="range"
            min="1"
            max="20"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="toolbar-section">
        <span className="toolbar-label">Shortcuts</span>
        <div className="shortcut-list">
          <span>Ctrl/Cmd+C copy</span>
          <span>Ctrl/Cmd+V paste</span>
          <span>Ctrl/Cmd+A select all</span>
          <span>Ctrl/Cmd+S export JSON</span>
        </div>
      </div>
    </aside>
  );
}