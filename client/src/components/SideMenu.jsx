import { useState, useEffect } from "react";
import { useStore } from "../store/useStore";
import {
  createDocument,
  updateDocument,
  listDocuments,
  deleteDocument,
  getDocument,
  listVersions,
  restoreVersion,
} from "../api/documents";
import { registerUser, loginUser, logoutUser as apiLogout } from "../api/auth";
import { listPermissions, shareDocument, removePermission } from "../api/permissions";
import { getPresignedUrl, uploadFileDirectly, registerAsset } from "../api/uploads";

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
  const userRole = useStore((state) => state.userRole);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const currentRole = useStore.getState().userRole;
    const documentId = useStore.getState().documentId;
    if (currentRole === "viewer") {
      alert("Access denied: Viewers cannot upload images.");
      return;
    }
    if (!documentId) {
      alert("Please save your design first before uploading images.");
      return;
    }

    try {
      setUploadingImage(true);
      const presignResponse = await getPresignedUrl({
        filename: file.name,
        mimeType: file.type,
        documentId
      });
      await uploadFileDirectly(presignResponse.uploadUrl, file, file.type);
      await registerAsset({
        documentId,
        key: presignResponse.key,
        url: presignResponse.assetUrl,
        mimeType: file.type,
        sizeBytes: file.size
      });
      const newImageElement = {
        id: `element-${Date.now()}`,
        type: "image",
        name: file.name,
        x: 200,
        y: 200,
        width: 200,
        height: 200,
        url: presignResponse.assetUrl,
        visible: true,
        locked: false,
        rotation: 0
      };
      useStore.getState().addElement(newImageElement);
    } catch (err) {
      alert("Failed to upload image: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="side-menu__panel">
      <p className="side-menu__panel-title">Shapes</p>
      <div className="shapes-grid">
        {shapeOptions.map((shape) => (
          <button
            key={shape.name}
            disabled={userRole === "viewer"}
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

      <div className="image-upload-field" style={{ marginTop: "16px", padding: "12px", border: "1px dashed rgba(255,255,255,0.15)", borderRadius: "8px", background: "rgba(15,23,42,0.1)" }}>
        <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#94a3b8", marginBottom: "6px", textTransform: "uppercase" }}>
          Upload Image
        </label>
        <input
          type="file"
          accept="image/*"
          disabled={userRole === "viewer" || uploadingImage}
          onChange={handleImageUpload}
          style={{ display: "none" }}
          id="image-file-input"
        />
        <label
          htmlFor="image-file-input"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "8px 12px",
            borderRadius: "6px",
            background: userRole === "viewer" ? "rgba(255,255,255,0.03)" : "#3b82f6",
            color: userRole === "viewer" ? "#94a3b8" : "#fff",
            fontWeight: "600",
            fontSize: "12px",
            cursor: userRole === "viewer" || uploadingImage ? "not-allowed" : "pointer",
            textAlign: "center",
            border: "none",
            transition: "background 0.2s"
          }}
        >
          {uploadingImage ? "Uploading..." : "Choose Image"}
        </label>
      </div>

      {selectedItem && (
        <div className="shape-settings" style={{ marginTop: "16px", padding: "12px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", background: "rgba(15,23,42,0.2)" }}>
          <p style={{ margin: "0 0 8px 0", fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>Selection Settings</p>
          
          {["rect", "rectangle", "circle", "triangle", "diamond", "line"].includes(selectedItem.type) && (
            <div className="shape-settings__field" style={{ marginBottom: "10px" }}>
              <label>Fill color</label>
              <input
                type="color"
                disabled={userRole === "viewer"}
                value={selectedItem.fill || "#2563eb"}
                onChange={(e) => onChangeSelectedColor(e.target.value)}
              />
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
            <button
              type="button"
              disabled={userRole === "viewer"}
              onClick={() => useStore.getState().bringToFront(selectedItem.id)}
              style={{ padding: "6px", fontSize: "11px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "#fff", cursor: "pointer" }}
            >
              Bring Front
            </button>
            <button
              type="button"
              disabled={userRole === "viewer"}
              onClick={() => useStore.getState().sendToBack(selectedItem.id)}
              style={{ padding: "6px", fontSize: "11px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "#fff", cursor: "pointer" }}
            >
              Send Back
            </button>
            <button
              type="button"
              disabled={userRole === "viewer"}
              onClick={() => useStore.getState().centerElement(selectedItem.id, "horizontal")}
              style={{ padding: "6px", fontSize: "11px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "#fff", cursor: "pointer" }}
            >
              Center X
            </button>
            <button
              type="button"
              disabled={userRole === "viewer"}
              onClick={() => useStore.getState().centerElement(selectedItem.id, "vertical")}
              style={{ padding: "6px", fontSize: "11px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "#fff", cursor: "pointer" }}
            >
              Center Y
            </button>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              disabled={userRole === "viewer"}
              onClick={() => useStore.getState().duplicateElement(selectedItem.id)}
              style={{ flex: 1, padding: "6px 12px", fontSize: "11px", background: "#3b82f6", border: "none", borderRadius: "6px", color: "#fff", fontWeight: "600", cursor: "pointer" }}
            >
              Duplicate
            </button>
            <button
              type="button"
              className="shape-settings__delete"
              disabled={userRole === "viewer"}
              onClick={onDeleteSelected}
              style={{ flex: 1, padding: "6px 12px", fontSize: "11px", background: "#ef4444", border: "none", borderRadius: "6px", color: "#fff", fontWeight: "600", cursor: "pointer" }}
            >
              Delete
            </button>
          </div>
        </div>
      )}
      <p className="side-menu__panel-hint">Click a shape/upload an image to add it, or select an existing element to edit.</p>
    </div>
  );
}

function TextPanel({ onAddText }) {
  const userRole = useStore((state) => state.userRole);
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
          disabled={userRole === "viewer"}
          onChange={(e) => setTextInput(e.target.value)}
          rows="4"
        />
        <button className="text-btn" disabled={userRole === "viewer" || !textInput.trim()} onClick={handleAdd}>
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
  const userRole = useStore((state) => state.userRole);
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
            disabled={userRole === "viewer"}
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
            disabled={userRole === "viewer"}
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
            disabled={userRole === "viewer"}
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
  const userRole = useStore((state) => state.userRole);
  return (
    <div className="side-menu__panel">
      <p className="side-menu__panel-title">Drawing Tools</p>
      <div className="stroke-grid">
        {strokeOptions.map((stroke) => (
          <button
            key={stroke.name}
            disabled={userRole === "viewer"}
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
  const userRole = useStore((state) => state.userRole);

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
                disabled={userRole === "viewer"}
                onClick={() => toggleElementVisibility(item.id)}
                title={item.visible ? "Hide" : "Show"}
              >
                {item.visible ? "👁" : "🚫"}
              </button>
              <button
                className="layer-lock"
                disabled={userRole === "viewer"}
                onClick={() => toggleElementLocked(item.id)}
                title={item.locked ? "Unlock" : "Lock"}
              >
                {item.locked ? "🔒" : "🔓"}
              </button>
              {editingId === item.id && userRole !== "viewer" ? (
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
                    if (userRole === "viewer") return;
                    setEditingId(item.id);
                    setEditName(item.name || item.type);
                  }}
                  title={userRole === "viewer" ? "" : "Double click to rename"}
                >
                  {item.name || item.type}
                </button>
              )}
              <div className="layer-actions">
                <button
                  type="button"
                  disabled={realIndex >= elements.length - 1 || userRole === "viewer"}
                  onClick={() => moveLayer(realIndex, 1)}
                  title="Move layer up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={realIndex <= 0 || userRole === "viewer"}
                  onClick={() => moveLayer(realIndex, -1)}
                  title="Move layer down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="layer-remove"
                  disabled={userRole === "viewer"}
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
        <button type="button" onClick={undo} disabled={!canUndo || userRole === "viewer"} className="layer-history-btn">
          Undo
        </button>
        <button type="button" onClick={redo} disabled={!canRedo || userRole === "viewer"} className="layer-history-btn">
          Redo
        </button>
      </div>
    </div>
  );
}

function DesignsPanel({ onExportPNG, onExportJSON, onImportJSON }) {
  const documentId = useStore((state) => state.documentId);
  const documentName = useStore((state) => state.documentName);
  const documentVersion = useStore((state) => state.documentVersion);
  const setDocumentName = useStore((state) => state.setDocumentName);
  const saveStatus = useStore((state) => state.saveStatus);
  const setSaveStatus = useStore((state) => state.setSaveStatus);
  const saveError = useStore((state) => state.saveError);
  const setSaveError = useStore((state) => state.setSaveError);
  const serializeDocument = useStore((state) => state.serializeDocument);
  const loadDocument = useStore((state) => state.loadDocument);
  const resetDocument = useStore((state) => state.resetDocument);
  const userRole = useStore((state) => state.userRole);

  // Auth states & actions
  const user = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);
  const setAccessToken = useStore((state) => state.setAccessToken);
  const logoutUserStore = useStore((state) => state.logoutUser);

  const [designs, setDesigns] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  // Version history state
  const [versions, setVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Collaboration permissions state
  const [permissions, setPermissions] = useState([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState("viewer");
  const [sharing, setSharing] = useState(false);

  // Form tab: 'login' | 'register'
  const [authTab, setAuthTab] = useState("login");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  const isSaving = saveStatus === "saving";

  const fetchDesigns = async () => {
    if (!user) return;
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

  const fetchVersions = async () => {
    if (!user || !documentId) {
      setVersions([]);
      return;
    }
    try {
      setLoadingVersions(true);
      const list = await listVersions(documentId);
      setVersions(list);
    } catch (e) {
      console.error("Error loading versions:", e);
    } finally {
      setLoadingVersions(false);
    }
  };

  const fetchPermissions = async () => {
    if (!user || !documentId) {
      setPermissions([]);
      return;
    }
    try {
      setLoadingPermissions(true);
      const list = await listPermissions(documentId);
      setPermissions(list);
    } catch (e) {
      console.error("Error loading permissions:", e);
    } finally {
      setLoadingPermissions(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (user) {
        fetchDesigns();
        fetchVersions();
        fetchPermissions();
      } else {
        setDesigns([]);
        setVersions([]);
        setPermissions([]);
      }
    }, 0);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, user]);

  const handleSave = async () => {
    try {
      setSaveStatus("saving");
      setSaveError(null);
      const payload = {
        name: documentName.trim() || "Untitled Design",
        data: serializeDocument(),
        version: documentId ? documentVersion : undefined,
        manual: true, // Manual save creates a snapshot
      };

      if (documentId) {
        const doc = await updateDocument(documentId, payload);
        loadDocument(doc);
      } else {
        const doc = await createDocument(payload);
        loadDocument(doc);
      }
      setSaveStatus("saved");
      fetchVersions();
      fetchDesigns();
      fetchPermissions();
      setTimeout(() => setSaveStatus(""), 3000);
    } catch (e) {
      if (e.message === "conflict") {
        setSaveStatus("conflict");
        setSaveError("Version conflict: This design has been updated elsewhere.");
      } else {
        setSaveError(e.message);
        setSaveStatus("error");
      }
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

  const handleShare = async (e) => {
    e.preventDefault();
    const email = shareEmail.trim();
    if (!email) return;
    try {
      setSharing(true);
      await shareDocument(documentId, { email, role: shareRole });
      setShareEmail("");
      fetchPermissions();
    } catch (err) {
      alert("Failed to share design: " + err.message);
    } finally {
      setSharing(false);
    }
  };

  const handleRevokePermission = async (permId) => {
    if (!window.confirm("Are you sure you want to revoke access for this user?")) return;
    try {
      await removePermission(documentId, permId);
      fetchPermissions();
    } catch (err) {
      alert("Failed to revoke access: " + err.message);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    const email = emailInput.trim();
    const password = passwordInput;

    if (!email || !password) {
      setAuthError("Email and password are required");
      return;
    }

    try {
      if (authTab === "login") {
        const data = await loginUser(email, password);
        setUser(data.user);
        setAccessToken(data.accessToken);
      } else {
        const data = await registerUser(email, password);
        setUser(data.user);
        setAccessToken(data.accessToken);
      }
      setEmailInput("");
      setPasswordInput("");
    } catch (err) {
      setAuthError(err.message || "Authentication failed");
    }
  };

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch (err) {
      console.error("Logout API call failed:", err);
    } finally {
      logoutUserStore();
      setDesigns([]);
      setVersions([]);
      setPermissions([]);
    }
  };

  const handleRestore = async (versionId) => {
    try {
      const doc = await restoreVersion(documentId, versionId);
      loadDocument(doc);
      fetchVersions();
      fetchPermissions();
    } catch (err) {
      alert("Failed to restore version: " + err.message);
    }
  };

  if (!user) {
    return (
      <div className="side-menu__panel auth-form-container">
        <p className="side-menu__panel-title">Sign In / Register</p>
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${authTab === "login" ? "auth-tab-btn--active" : ""}`}
            onClick={() => {
              setAuthTab("login");
              setAuthError("");
            }}
          >
            Login
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${authTab === "register" ? "auth-tab-btn--active" : ""}`}
            onClick={() => {
              setAuthTab("register");
              setAuthError("");
            }}
          >
            Register
          </button>
        </div>

        <form className="auth-form" onSubmit={handleAuthSubmit}>
          <div className="side-menu__field">
            <span>Email</span>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="name@example.com"
              required
            />
          </div>
          <div className="side-menu__field">
            <span>Password</span>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {authError && <p className="design-error-text">{authError}</p>}

          <button type="submit" className="auth-submit-btn">
            {authTab === "login" ? "Login" : "Register"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="side-menu__panel">
      <div className="user-profile-badge">
        <span className="user-email-text" title={user.email}>{user.email}</span>
        <button type="button" className="logout-btn" onClick={handleLogout}>
          Log Out
        </button>
      </div>

      <p className="side-menu__panel-title">My Designs</p>

      <div className="design-meta-form">
        <div className="side-menu__field">
          <span>Design Name</span>
          <input
            type="text"
            className="design-name-input"
            value={documentName}
            disabled={userRole === "viewer"}
            onChange={(e) => setDocumentName(e.target.value)}
            placeholder="Untitled Design"
          />
        </div>

        <div className="design-action-buttons">
          <button
            type="button"
            className="design-btn design-btn--save"
            onClick={handleSave}
            disabled={isSaving || userRole === "viewer"}
          >
            {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "✓ Saved" : "Save Design"}
          </button>
          <button type="button" className="design-btn design-btn--new" onClick={handleNew} disabled={userRole === "viewer"}>
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
          {designs.map((design) => {
            const isOwnerOrEditor = design.user_role !== "viewer";
            return (
              <div
                key={design.id}
                className={`design-list-item ${documentId === design.id ? "design-list-item--active" : ""}`}
                onClick={() => handleLoad(design.id)}
              >
                <div className="design-info">
                  <span className="design-title">{design.name}</span>
                  <span className="design-date">
                    {new Date(design.updated_at).toLocaleDateString()} (v{design.version}) {design.user_role && `[${design.user_role}]`}
                  </span>
                </div>
                <button
                  type="button"
                  className="design-remove-btn"
                  disabled={!isOwnerOrEditor}
                  onClick={(e) => handleDelete(design.id, e)}
                  title="Delete design"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {documentId && (
        <div className="share-section" style={{ marginTop: "16px", padding: "12px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", background: "rgba(15,23,42,0.2)" }}>
          <p className="side-menu__panel-title" style={{ marginTop: 0 }}>Share Design</p>
          
          {userRole !== "viewer" && (
            <form onSubmit={handleShare} className="share-form" style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <input
                type="email"
                placeholder="collaborator@example.com"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                required
                style={{ flex: 1, minWidth: 0, padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(15,23,42,0.4)", color: "#fff", fontSize: "12px" }}
              />
              <select
                value={shareRole}
                onChange={(e) => setShareRole(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(15,23,42,0.4)", color: "#fff", fontSize: "12px" }}
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
              <button
                type="submit"
                disabled={sharing}
                style={{ padding: "6px 12px", borderRadius: "6px", border: "none", background: "#3b82f6", color: "#fff", fontWeight: "600", cursor: "pointer", fontSize: "12px" }}
              >
                {sharing ? "..." : "Share"}
              </button>
            </form>
          )}

          {loadingPermissions ? (
            <p className="side-menu__panel-hint">Loading shared users...</p>
          ) : permissions.length === 0 ? (
            <p className="side-menu__panel-hint">Not shared with anyone yet.</p>
          ) : (
            <div className="shared-users-list" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {permissions.map((p) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", background: "rgba(255,255,255,0.03)", borderRadius: "6px", fontSize: "12px" }}>
                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <span style={{ color: "#f8fafc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.user_email}>
                      {p.user_email}
                    </span>
                    <span style={{ color: "#94a3b8", fontSize: "10px", textTransform: "capitalize" }}>
                      {p.role}
                    </span>
                  </div>
                  {userRole !== "viewer" && (
                    <button
                      type="button"
                      onClick={() => handleRevokePermission(p.id)}
                      style={{ border: "none", background: "none", color: "#ef4444", fontSize: "12px", cursor: "pointer", padding: "4px" }}
                      title="Revoke access"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {documentId && (
        <div className="versions-section">
          <p className="side-menu__panel-title">Version History</p>
          {loadingVersions ? (
            <p className="side-menu__panel-hint">Loading versions...</p>
          ) : versions.length === 0 ? (
            <p className="side-menu__panel-hint">No versions recorded.</p>
          ) : (
            <div className="versions-list">
              {versions.map((v) => (
                <div key={v.id} className="version-item">
                  <div>
                    <span className="version-num">v{v.version_number}</span>
                    <div className="version-time">
                      {new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="version-restore-btn"
                    disabled={userRole === "viewer"}
                    onClick={() => handleRestore(v.id)}
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Export & Import Section */}
      <div className="export-import-section" style={{ marginTop: "16px", padding: "12px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", background: "rgba(15,23,42,0.2)" }}>
        <p className="side-menu__panel-title" style={{ marginTop: 0 }}>Export & Import</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={onExportPNG}
              style={{ flex: 1, padding: "8px 12px", fontSize: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "#fff", fontWeight: "600", cursor: "pointer" }}
            >
              📷 Export PNG
            </button>
            <button
              type="button"
              onClick={onExportJSON}
              style={{ flex: 1, padding: "8px 12px", fontSize: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "#fff", fontWeight: "600", cursor: "pointer" }}
            >
              📥 Export JSON
            </button>
          </div>
          
          <label
            style={{
              display: "block",
              padding: "8px 12px",
              fontSize: "12px",
              background: "#3b82f6",
              borderRadius: "6px",
              color: "#fff",
              fontWeight: "600",
              cursor: "pointer",
              textAlign: "center"
            }}
          >
            📤 Import JSON File
            <input
              type="file"
              accept=".json"
              onChange={onImportJSON}
              style={{ display: "none" }}
            />
          </label>
        </div>
      </div>
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
  onExportPNG,
  onExportJSON,
  onImportJSON,
}) {
  const [activeShape, setActiveShape] = useState(null);
  const userRole = useStore((state) => state.userRole);

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
        return (
          <DesignsPanel
            onExportPNG={onExportPNG}
            onExportJSON={onExportJSON}
            onImportJSON={onImportJSON}
          />
        );
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
                disabled={userRole === "viewer"}
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
                disabled={userRole === "viewer"}
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
