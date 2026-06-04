import { useState, useEffect } from "react";
import { useStore } from "../store/useStore";
import { createDocument, updateDocument, listDocuments, deleteDocument, getDocument } from "../api/documents";

const toolOptions = [
  "Shapes",
  "Text",
  "Background",
  "Stroke",
  "Layers",
  "Designs",
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

function ShapesPanel({ onAddShape, activeShape, onChangeActiveShape, selectedItem, onDeleteSelected, onChangeSelectedColor }) {
  return (
    <div className="side-menu__panel">
      <p className="side-menu__panel-title">Shapes</p>
      <div className="shapes-grid">
        {shapeOptions.map((shape) => (
          <button
            key={shape.name}
            className={`shape-item ${activeShape === shape.name ? "shape-item--active" : ""}`}
            onClick={() => {
              onChangeActiveShape(shape.name);
              onAddShape(shape.name);
            }}
            title={shape.name}
          >
            <span className="shape-item__symbol">{shape.symbol}</span>
            <span className="shape-item__name">{shape.name}</span>
          </button>
        ))}
      </div>
      {selectedItem && ["rect", "rectangle", "circle", "triangle", "diamond", "line"].includes(selectedItem.type) && (
        <div className="shape-settings">
          <div className="shape-settings__field">
            <label>Shape color</label>
            <input
              type="color"
              value={selectedItem.fill || "#2563eb"}
              onChange={(e) => onChangeSelectedColor(e.target.value)}
            />
          </div>
          <button className="shape-settings__delete" onClick={onDeleteSelected}>
            Delete selected shape
          </button>
        </div>
      )}
      <p className="side-menu__panel-hint">Click a shape to add it, or select an existing shape to edit.</p>
    </div>
  );
}

function TextPanel({ onAddText }) {
  const [textInput, setTextInput] = useState("");

  const handleAdd = () => {
    const trimmed = textInput.trim();
    if (trimmed) {
      onAddText(trimmed);
      setTextInput("");
    }
  };

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
        <button className="text-btn" onClick={handleAdd}>
          Add to Canvas
        </button>
      </div>
      <p className="side-menu__panel-hint">Text boxes are movable and resizeable.</p>
    </div>
  );
}

function parseRgb(rgb) {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return { r: 255, g: 255, b: 255 };
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) };
}

function BackgroundPanel({ backgroundColor, onBackgroundChange }) {
  const color = parseRgb(backgroundColor);

  const handleColorChange = (channel, value) => {
    const newColor = { ...color, [channel]: Math.max(0, Math.min(255, value)) };
    const rgbString = `rgb(${newColor.r}, ${newColor.g}, ${newColor.b})`;
    onBackgroundChange(rgbString);
  };

  const rgbString = `rgb(${color.r}, ${color.g}, ${color.b})`;

  return (
    <div className="side-menu__panel">
      <p className="side-menu__panel-title">Background</p>
      <div className="color-preview" style={{ backgroundColor: rgbString }} />

      <div className="color-input-group">
        <label className="color-input-label">
          <span>R</span>
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
          <span>G</span>
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
          <span>B</span>
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

function StrokePanel({ selectedStroke, onStrokeChange }) {
  return (
    <div className="side-menu__panel">
      <p className="side-menu__panel-title">Drawing Tools</p>
      <div className="stroke-grid">
        {strokeOptions.map((stroke) => (
          <button
            key={stroke.name}
            className={`stroke-item ${selectedStroke === stroke.name ? "stroke-item--active" : ""}`}
            onClick={() => onStrokeChange(stroke.name)}
            title={stroke.name}
          >
            <span className="stroke-item__symbol">{stroke.symbol}</span>
            <span className="stroke-item__name">{stroke.name}</span>
          </button>
        ))}
      </div>
      <p className="side-menu__panel-hint">Select a drawing tool, then draw directly on the whiteboard.</p>
    </div>
  );
}

function LayersPanel() {
  const elements = useStore((state) => state.elements);
  const selectedElementId = useStore((state) => state.selectedElementId);
  const selectElement = useStore((state) => state.selectElement);
  const deleteElement = useStore((state) => state.deleteElement);
  const toggleElementVisibility = useStore((state) => state.toggleElementVisibility);
  const toggleElementLocked = useStore((state) => state.toggleElementLocked);
  const reorderElements = useStore((state) => state.reorderElements);
  const renameElement = useStore((state) => state.renameElement);
  const canUndo = useStore((state) => state.historyIndex > 0);
  const canRedo = useStore((state) => state.historyIndex < state.history.length - 1);
  const undo = useStore((state) => state.undo);
  const redo = useStore((state) => state.redo);

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  const orderedElements = [...elements].slice().reverse();

  const moveLayer = (realIndex, offset) => {
    reorderElements(realIndex, realIndex + offset);
  };

  return (
    <div className="side-menu__panel">
      <p className="side-menu__panel-title">Layers</p>

      <div className="layers-list">
        {orderedElements.map((item, index) => {
          const realIndex = elements.length - 1 - index;
          return (
            <div key={item.id} className={`layer-item ${selectedElementId === item.id ? "layer-item--selected" : ""}`}>
              <button
                className="layer-visibility"
                onClick={() => toggleElementVisibility(item.id)}
                title={item.visible ? "Hide" : "Show"}
              >
                {item.visible ? "👁" : "🚫"}
              </button>
              <button
                className="layer-lock"
                onClick={() => toggleElementLocked(item.id)}
                title={item.locked ? "Unlock" : "Lock"}
              >
                {item.locked ? "🔒" : "🔓"}
              </button>
              {editingId === item.id ? (
                <input
                  type="text"
                  className="layer-name-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => {
                    if (editName.trim()) {
                      renameElement(item.id, editName.trim());
                    }
                    setEditingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (editName.trim()) {
                        renameElement(item.id, editName.trim());
                      }
                      setEditingId(null);
                    } else if (e.key === "Escape") {
                      setEditingId(null);
                    }
                  }}
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  className="layer-name"
                  onClick={() => selectElement(item.id)}
                  onDoubleClick={() => {
                    setEditingId(item.id);
                    setEditName(item.name || item.type);
                  }}
                  title="Double click to rename"
                >
                  {item.name || item.type}
                </button>
              )}
              <div className="layer-actions">
                <button
                  type="button"
                  disabled={realIndex >= elements.length - 1}
                  onClick={() => moveLayer(realIndex, 1)}
                  title="Move layer up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={realIndex <= 0}
                  onClick={() => moveLayer(realIndex, -1)}
                  title="Move layer down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="layer-remove"
                  onClick={() => deleteElement(item.id)}
                  title="Delete layer"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="layer-history-controls">
        <button type="button" onClick={undo} disabled={!canUndo} className="layer-history-btn">
          Undo
        </button>
        <button type="button" onClick={redo} disabled={!canRedo} className="layer-history-btn">
          Redo
        </button>
      </div>
    </div>
  );
}

function DesignsPanel() {
  const documentId = useStore((state) => state.documentId);
  const documentName = useStore((state) => state.documentName);
  const setDocumentName = useStore((state) => state.setDocumentName);
  const isSaving = useStore((state) => state.isSaving);
  const setIsSaving = useStore((state) => state.setIsSaving);
  const saveError = useStore((state) => state.saveError);
  const setSaveError = useStore((state) => state.setSaveError);
  const serializeDocument = useStore((state) => state.serializeDocument);
  const loadDocument = useStore((state) => state.loadDocument);
  const resetDocument = useStore((state) => state.resetDocument);

  const [designs, setDesigns] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  const fetchDesigns = async () => {
    try {
      setLoadingList(true);
      const list = await listDocuments();
      setDesigns(list);
    } catch (e) {
      console.error("Error loading designs:", e);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    requestAnimationFrame(() => {
      fetchDesigns();
    });
  }, [documentId]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveStatus("saving");
      setSaveError(null);
      const payload = {
        name: documentName.trim() || "Untitled Design",
        data: serializeDocument(),
      };

      if (documentId) {
        await updateDocument(documentId, payload);
        setSaveStatus("saved");
      } else {
        const doc = await createDocument(payload);
        loadDocument(doc);
        setSaveStatus("saved");
      }
      setTimeout(() => setSaveStatus(""), 3000);
    } catch (e) {
      setSaveError(e.message);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleNew = () => {
    resetDocument();
    setSaveStatus("");
  };

  const handleLoad = async (id) => {
    try {
      setSaveStatus("loading");
      const doc = await getDocument(id);
      loadDocument(doc);
      setSaveStatus("");
    } catch (e) {
      alert("Failed to load design: " + e.message);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this design?")) return;
    try {
      await deleteDocument(id);
      if (documentId === id) {
        resetDocument();
      }
      fetchDesigns();
    } catch (e) {
      alert("Failed to delete design: " + e.message);
    }
  };

  return (
    <div className="side-menu__panel">
      <p className="side-menu__panel-title">My Designs</p>

      <div className="design-meta-form">
        <div className="side-menu__field">
          <span>Design Name</span>
          <input
            type="text"
            className="design-name-input"
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
            placeholder="Untitled Design"
          />
        </div>

        <div className="design-action-buttons">
          <button className="design-btn design-btn--save" onClick={handleSave} disabled={isSaving}>
            {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "✓ Saved" : "Save Design"}
          </button>
          <button className="design-btn design-btn--new" onClick={handleNew}>
            New Blank
          </button>
        </div>

        {saveError && <p className="design-error-text">Error: {saveError}</p>}
      </div>

      <p className="side-menu__panel-title" style={{ marginTop: "16px" }}>Saved Designs</p>
      {loadingList ? (
        <p className="side-menu__panel-hint">Loading designs list...</p>
      ) : designs.length === 0 ? (
        <p className="side-menu__panel-hint">No saved designs found.</p>
      ) : (
        <div className="designs-list">
          {designs.map((design) => (
            <div
              key={design.id}
              className={`design-list-item ${documentId === design.id ? "design-list-item--active" : ""}`}
              onClick={() => handleLoad(design.id)}
            >
              <div className="design-info">
                <span className="design-title">{design.name}</span>
                <span className="design-date">
                  {new Date(design.updated_at).toLocaleDateString()}
                </span>
              </div>
              <button
                type="button"
                className="design-remove-btn"
                onClick={(e) => handleDelete(design.id, e)}
                title="Delete design"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SideMenu({
  collapsed,
  onToggle,
  boardWidth,
  boardHeight,
  onBoardWidthChange,
  onBoardHeightChange,
  activeTool,
  onToolChange,
  onAddShape,
  onAddText,
  backgroundColor,
  onBackgroundChange,
  selectedStroke,
  onStrokeChange,
  selectedItem,
  onDeleteSelected,
  onChangeSelectedColor,
}) {
  const [activeShape, setActiveShape] = useState(null);

  const renderToolPanel = () => {
    switch (activeTool) {
      case "Shapes":
        return (
          <ShapesPanel
            activeShape={activeShape}
            onAddShape={onAddShape}
            onChangeActiveShape={setActiveShape}
            selectedItem={selectedItem}
            onDeleteSelected={onDeleteSelected}
            onChangeSelectedColor={onChangeSelectedColor}
          />
        );
      case "Text":
        return <TextPanel onAddText={onAddText} />;
      case "Background":
        return <BackgroundPanel backgroundColor={backgroundColor} onBackgroundChange={onBackgroundChange} />;
      case "Stroke":
        return <StrokePanel selectedStroke={selectedStroke} onStrokeChange={onStrokeChange} />;
      case "Layers":
        return <LayersPanel />;
      case "Designs":
        return <DesignsPanel />;
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
                  className={`side-menu__item ${activeTool === tool ? "side-menu__item--active" : ""}`}
                  onClick={() => {
                    onToolChange(tool);
                    if (tool !== "Shapes") {
                      setActiveShape(null);
                    }
                  }}
                >
                  {tool}
                </button>
              ))}
            </div>

            <div className="side-menu__content">{renderToolPanel()}</div>
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
                value={boardWidth}
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
                value={boardHeight}
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
