import { useStore } from "../../store/useStore";

const tools = [
  { key: "select", label: "Select" },
  { key: "rect", label: "Rect" },
  { key: "circle", label: "Circle" },
  { key: "text", label: "Text" },
  { key: "pen", label: "Pen" },
];

export default function ToolBar() {
  const tool = useStore((state) => state.tool);
  const setTool = useStore((state) => state.setTool);
  const fill = useStore((state) => state.fill);
  const stroke = useStore((state) => state.stroke);
  const strokeWidth = useStore((state) => state.strokeWidth);
  const setFill = useStore((state) => state.setFill);
  const setStroke = useStore((state) => state.setStroke);
  const setStrokeWidth = useStore((state) => state.setStrokeWidth);

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        {tools.map((item) => (
          <button
            key={item.key}
            className={tool === item.key ? "tool-btn active" : "tool-btn"}
            onClick={() => setTool(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="toolbar-group colors">
        <label>
          Fill
          <input
            type="color"
            value={fill}
            onChange={(e) => setFill(e.target.value)}
          />
        </label>

        <label>
          Stroke
          <input
            type="color"
            value={stroke}
            onChange={(e) => setStroke(e.target.value)}
          />
        </label>

        <label>
          Width
          <input
            type="range"
            min="1"
            max="12"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
          />
        </label>
      </div>
    </div>
  );
}