import { useState } from "react";

const toolOptions = [
  "Shapes",
  "Text",
  "Background",
  "Stroke",
  "Layers",
];

const shapeOptions = [
  { name: "Circle", symbol: "●" },
  { name: "Square", symbol: "■" },
  { name: "Triangle", symbol: "▲" },
  { name: "Rectangle", symbol: "▬" },
  { name: "Line", symbol: "—" },
  { name: "Diamond", symbol: "◆" },
];

const strokeOptions = [
  { name: "Pen", symbol: "✎" },
  { name: "Pencil", symbol: "✏" },
  { name: "Brush", symbol: "🖌" },
  { name: "Line", symbol: "—" },
];

function ShapesPanel() {
  const [selectedShape, setSelectedShape] = useState(null);

  return (
    <div className="side-menu__panel">
      <p className="side-menu__panel-title">Shapes</p>
      <div className="shapes-grid">
        {shapeOptions.map((shape) => (
          <button
            key={shape.name}
            className={`shape-item ${selectedShape === shape.name ? "shape-item--active" : ""}`}
            onClick={() => setSelectedShape(shape.name)}
            title={shape.name}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "copy";
              e.dataTransfer.setData("shapeType", shape.name);
            }}
          >
            <span className="shape-item__symbol">{shape.symbol}</span>
            <span className="shape-item__name">{shape.name}</span>
          </button>
        ))}
      </div>
      <p className="side-menu__panel-hint">Drag shapes onto the canvas</p>
    </div>
  );
}

function TextPanel() {
  const [textInput, setTextInput] = useState("");

  return (
    <div className="side-menu__panel">
      <p className="side-menu__panel-title">Text Tool</p>
      <div className="text-input-group">
        <textarea
          className="text-input"
          placeholder="Enter text here..."
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          rows="4"
        />
        <button className="text-btn" onClick={() => {
          if (textInput.trim()) {
            console.log("Add text to canvas:", textInput);
            setTextInput("");
          }
        }}>
          Add to Canvas
        </button>
      </div>
      <p className="side-menu__panel-hint">Type text and click to add</p>
    </div>
  );
}

function BackgroundPanel({ onBackgroundChange }) {
  const [color, setColor] = useState({ r: 255, g: 255, b: 255 });

  const handleColorChange = (channel, value) => {
    const newColor = { ...color, [channel]: Math.max(0, Math.min(255, value)) };
    setColor(newColor);
    const rgbString = `rgb(${newColor.r}, ${newColor.g}, ${newColor.b})`;
    onBackgroundChange?.(rgbString);
  };

  const rgbString = `rgb(${color.r}, ${color.g}, ${color.b})`;

  return (
    <div className="side-menu__panel">
      <p className="side-menu__panel-title">Background Color</p>
      <div className="color-preview" style={{ backgroundColor: rgbString }} />
      
      <div className="color-input-group">
        <label className="color-input-label">
          <span>Red</span>
          <input
            type="range"
            min="0"
            max="255"
            value={color.r}
            onChange={(e) => handleColorChange("r", Number(e.target.value))}
            className="color-slider"
          />
          <span className="color-value">{color.r}</span>
        </label>

        <label className="color-input-label">
          <span>Green</span>
          <input
            type="range"
            min="0"
            max="255"
            value={color.g}
            onChange={(e) => handleColorChange("g", Number(e.target.value))}
            className="color-slider"
          />
          <span className="color-value">{color.g}</span>
        </label>

        <label className="color-input-label">
          <span>Blue</span>
          <input
            type="range"
            min="0"
            max="255"
            value={color.b}
            onChange={(e) => handleColorChange("b", Number(e.target.value))}
            className="color-slider"
          />
          <span className="color-value">{color.b}</span>
        </label>
      </div>
      
      <div className="color-display">
        <p className="color-code">{rgbString}</p>
      </div>
    </div>
  );
}

function StrokePanel() {
  const [selectedStroke, setSelectedStroke] = useState(null);

  return (
    <div className="side-menu__panel">
      <p className="side-menu__panel-title">Drawing Tools</p>
      <div className="stroke-grid">
        {strokeOptions.map((stroke) => (
          <button
            key={stroke.name}
            className={`stroke-item ${selectedStroke === stroke.name ? "stroke-item--active" : ""}`}
            onClick={() => setSelectedStroke(stroke.name)}
            title={stroke.name}
          >
            <span className="stroke-item__symbol">{stroke.symbol}</span>
            <span className="stroke-item__name">{stroke.name}</span>
          </button>
        ))}
      </div>
      <p className="side-menu__panel-hint">Select a drawing tool</p>
    </div>
  );
}

function LayersPanel() {
  const [layers, setLayers] = useState([
    { id: 1, name: "Layer 1", visible: true },
  ]);
  const [newLayerName, setNewLayerName] = useState("");

  const addLayer = () => {
    if (newLayerName.trim()) {
      const newLayer = {
        id: Math.max(...layers.map(l => l.id), 0) + 1,
        name: newLayerName,
        visible: true,
      };
      setLayers([newLayer, ...layers]);
      setNewLayerName("");
    }
  };

  const removeLayer = (id) => {
    if (layers.length > 1) {
      setLayers(layers.filter(l => l.id !== id));
    }
  };

  const toggleLayerVisibility = (id) => {
    setLayers(layers.map(l =>
      l.id === id ? { ...l, visible: !l.visible } : l
    ));
  };

  return (
    <div className="side-menu__panel">
      <p className="side-menu__panel-title">Layers</p>
      
      <div className="layer-input-group">
        <input
          type="text"
          className="layer-input"
          placeholder="Layer name..."
          value={newLayerName}
          onChange={(e) => setNewLayerName(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter") addLayer();
          }}
        />
        <button className="layer-btn" onClick={addLayer}>+ Add</button>
      </div>

      <div className="layers-list">
        {layers.map((layer) => (
          <div key={layer.id} className="layer-item">
            <button
              className="layer-visibility"
              onClick={() => toggleLayerVisibility(layer.id)}
              title={layer.visible ? "Hide" : "Show"}
            >
              {layer.visible ? "👁" : "🚫"}
            </button>
            <span className="layer-name">{layer.name}</span>
            <button
              className="layer-remove"
              onClick={() => removeLayer(layer.id)}
              title="Remove layer"
              disabled={layers.length === 1}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}


function SideMenu({
  collapsed,
  onToggle,
  boardSize,
  onBoardWidthChange,
  onBoardHeightChange,
}) {
  const [activeTool, setActiveTool] = useState(toolOptions[0]);

  const renderToolPanel = () => {
    switch (activeTool) {
      case "Shapes":
        return <ShapesPanel />;
      case "Text":
        return <TextPanel />;
      case "Background":
        return <BackgroundPanel />;
      case "Stroke":
        return <StrokePanel />;
      case "Layers":
        return <LayersPanel />;
      default:
        return null;
    }
  };

  return (
    <aside className={`side-menu ${collapsed ? "side-menu--collapsed" : ""}`}>
      <div className="side-menu__top">
        <div className="side-menu__header">
          {!collapsed && <span className="side-menu__label">Tools</span>}

          <button
            type="button"
            className="side-menu__toggle"
            onClick={onToggle}
            aria-label={collapsed ? "Open side menu" : "Collapse side menu"}
          >
            {collapsed ? "+" : "✕"}
          </button>
        </div>

        {!collapsed && (
          <>
            <div className="side-menu__group">
              {toolOptions.map((tool) => (
                <button
                  key={tool}
                  type="button"
                  className={`side-menu__item ${
                    activeTool === tool ? "side-menu__item--active" : ""
                  }`}
                  onClick={() => setActiveTool(tool)}
                >
                  {tool}
                </button>
              ))}
            </div>

            <div className="side-menu__content">
              {renderToolPanel()}
            </div>
          </>
        )}
      </div>

      {!collapsed && (
        <div className="side-menu__footer">
          <div className="side-menu__panel side-menu__board-size">
            <p className="side-menu__panel-title">Board Size</p>

            <label className="side-menu__field">
              <span>Width</span>
              <input
                type="number"
                min="600"
                max="5000"
                step="50"
                value={boardSize.width}
                onChange={(e) => onBoardWidthChange(Number(e.target.value))}
              />
            </label>

            <label className="side-menu__field">
              <span>Height</span>
              <input
                type="number"
                min="400"
                max="5000"
                step="50"
                value={boardSize.height}
                onChange={(e) => onBoardHeightChange(Number(e.target.value))}
              />
            </label>
          </div>
        </div>
      )}
    </aside>
  );
}

export default SideMenu;
