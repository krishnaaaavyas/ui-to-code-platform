import React, { useState, useEffect } from "react";
import {
  Circle,
  Square,
  Triangle,
  RectangleHorizontal,
  Minus,
  Diamond,
  Pen,
  Pencil,
  Brush,
  Shapes,
  Type,
  Palette,
  PenTool,
  Layers,
  FolderOpen,
} from "lucide-react";
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
  { name: "Shapes", icon: Shapes },
  { name: "Text", icon: Type },
  { name: "Background", icon: Palette },
  { name: "Stroke", icon: PenTool },
  { name: "Layers", icon: Layers },
  { name: "Designs", icon: FolderOpen },
];

const shapeOptions = [
  { name: "Circle", icon: Circle },
  { name: "Square", icon: Square },
  { name: "Triangle", icon: Triangle },
  { name: "Rectangle", icon: RectangleHorizontal },
  { name: "Line", icon: Minus },
  { name: "Diamond", icon: Diamond },
];

const strokeOptions = [
  { name: "Pen", icon: Pen },
  { name: "Pencil", icon: Pencil },
  { name: "Brush", icon: Brush },
  { name: "Line", icon: Minus },
];

interface ShapesPanelProps {
  onAddShape: (name: string) => void;
  activeShape: string | null;
  onChangeActiveShape: (name: string | null) => void;
  selectedItem: any;
  onDeleteSelected: () => void;
  onChangeSelectedColor: (color: string) => void;
}

function ShapesPanel({
  onAddShape,
  activeShape,
  onChangeActiveShape,
  selectedItem,
  onDeleteSelected,
  onChangeSelectedColor
}: ShapesPanelProps) {
  const userRole = useStore((state) => state.userRole);
  const showToast = useStore((state) => state.showToast);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const currentRole = useStore.getState().userRole;
    const documentId = useStore.getState().documentId;
    if (currentRole === "viewer") {
      showToast("Access denied: Viewers cannot upload images.", "error");
      return;
    }
    if (!documentId) {
      showToast("Please save your design first before uploading images.", "error");
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
      showToast("Image uploaded successfully.", "success");
    } catch (err: any) {
      showToast("Failed to upload image: " + err.message, "error");
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="side-menu__panel">
      <p className="side-menu__panel-title">Shapes</p>
      <div className="shapes-grid">
        {shapeOptions.map((shape) => {
          const Icon = shape.icon;
          return (
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
              <span className="shape-item__symbol">
                <Icon size={18} />
              </span>
              <span className="shape-item__name">{shape.name}</span>
            </button>
          );
        })}
      </div>

      <div className="image-upload-field side-menu__section-dashed">
        <label className="side-menu__panel-title" style={{ margin: 0 }}>
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
          className="side-menu__btn-primary"
          style={{
            cursor: userRole === "viewer" || uploadingImage ? "not-allowed" : "pointer",
            background: userRole === "viewer" ? "rgba(255,255,255,0.03)" : undefined,
            color: userRole === "viewer" ? "var(--muted)" : undefined
          }}
        >
          {uploadingImage ? "Uploading..." : "Choose Image"}
        </label>
      </div>

      {selectedItem && (
        <div className="shape-settings side-menu__section-card">
          <p className="side-menu__panel-title" style={{ margin: 0 }}>Selection Settings</p>
          
          {["rect", "rectangle", "circle", "triangle", "diamond", "line"].includes(selectedItem.type) && (
            <div className="shape-settings__field">
              <label>Fill color</label>
              <input
                type="color"
                disabled={userRole === "viewer"}
                value={selectedItem.fill || "#2563eb"}
                onChange={(e) => onChangeSelectedColor(e.target.value)}
              />
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <button
              type="button"
              disabled={userRole === "viewer"}
              onClick={() => useStore.getState().bringToFront(selectedItem.id)}
              className="side-menu__btn-secondary"
              style={{ padding: "6px" }}
            >
              Bring Front
            </button>
            <button
              type="button"
              disabled={userRole === "viewer"}
              onClick={() => useStore.getState().sendToBack(selectedItem.id)}
              className="side-menu__btn-secondary"
              style={{ padding: "6px" }}
            >
              Send Back
            </button>
            <button
              type="button"
              disabled={userRole === "viewer"}
              onClick={() => useStore.getState().centerElement(selectedItem.id, "horizontal")}
              className="side-menu__btn-secondary"
              style={{ padding: "6px" }}
            >
              Center X
            </button>
            <button
              type="button"
              disabled={userRole === "viewer"}
              onClick={() => useStore.getState().centerElement(selectedItem.id, "vertical")}
              className="side-menu__btn-secondary"
              style={{ padding: "6px" }}
            >
              Center Y
            </button>
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button
              type="button"
              disabled={userRole === "viewer"}
              onClick={() => useStore.getState().duplicateElement(selectedItem.id)}
              className="side-menu__btn-primary"
              style={{ flex: 1, padding: "6px 12px" }}
            >
              Duplicate
            </button>
            <button
              type="button"
              className="shape-settings__delete side-menu__btn-danger"
              disabled={userRole === "viewer"}
              onClick={onDeleteSelected}
              style={{ padding: "6px 12px" }}
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

interface TextPanelProps {
  onAddText: (text: string) => void;
}

function TextPanel({ onAddText }: TextPanelProps) {
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
          rows={4}
        />
        <button className="text-btn" disabled={userRole === "viewer" || !textInput.trim()} onClick={handleAdd}>
          Add to Canvas
        </button>
      </div>
      <p className="side-menu__panel-hint">Text boxes are movable and resizeable.</p>
    </div>
  );
}

function parseRgb(rgb: string) {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return { r: 255, g: 255, b: 255 };
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) };
}

interface BackgroundPanelProps {
  backgroundColor: string;
  onBackgroundChange: (color: string) => void;
}

function BackgroundPanel({ backgroundColor, onBackgroundChange }: BackgroundPanelProps) {
  const userRole = useStore((state) => state.userRole);
  const color = parseRgb(backgroundColor);

  const handleColorChange = (channel: "r" | "g" | "b", value: number) => {
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

interface StrokePanelProps {
  selectedStroke: string;
  onStrokeChange: (stroke: string) => void;
}

function StrokePanel({ selectedStroke, onStrokeChange }: StrokePanelProps) {
  const userRole = useStore((state) => state.userRole);
  return (
    <div className="side-menu__panel">
      <p className="side-menu__panel-title">Drawing Tools</p>
      <div className="stroke-grid">
        {strokeOptions.map((stroke) => {
          const Icon = stroke.icon;
          return (
            <button
              key={stroke.name}
              disabled={userRole === "viewer"}
              className={`stroke-item ${selectedStroke === stroke.name ? "stroke-item--active" : ""}`}
              onClick={() => onStrokeChange(stroke.name)}
              title={stroke.name}
            >
              <span className="stroke-item__symbol">
                <Icon size={18} />
              </span>
              <span className="stroke-item__name">{stroke.name}</span>
            </button>
          );
        })}
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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const orderedElements = [...elements].slice().reverse();

  const moveLayer = (realIndex: number, offset: number) => {
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

interface DesignsPanelProps {
  onExportPNG: () => void;
  onExportJSON: () => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function DesignsPanel({ onExportPNG, onExportJSON, onImportJSON }: DesignsPanelProps) {
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
  const showToast = useStore((state) => state.showToast);

  const user = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);
  const setAccessToken = useStore((state) => state.setAccessToken);
  const logoutUserStore = useStore((state) => state.logoutUser);

  const [designs, setDesigns] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const [versions, setVersions] = useState<any[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  const [permissions, setPermissions] = useState<any[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState("viewer");
  const [sharing, setSharing] = useState(false);

  const [authTab, setAuthTab] = useState<"login" | "register">("login");
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
    } catch (e: any) {
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
    } catch (e: any) {
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
    } catch (e: any) {
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
  }, [documentId, user]);

  const handleSave = async () => {
    try {
      setSaveStatus("saving");
      setSaveError(null);
      const payload = {
        name: documentName.trim() || "Untitled Design",
        data: serializeDocument(),
        version: documentId ? documentVersion : undefined,
        manual: true,
      };

      if (documentId) {
        const doc = await updateDocument(documentId, payload);
        loadDocument(doc);
      } else {
        const doc = await createDocument(payload);
        loadDocument(doc);
      }
      setSaveStatus("saved");
      showToast("Design saved successfully.", "success");
      fetchVersions();
      fetchDesigns();
      fetchPermissions();
      setTimeout(() => setSaveStatus(""), 3000);
    } catch (e: any) {
      if (e.status === 409 || e.message === "conflict") {
        setSaveStatus("conflict");
        setSaveError("Version conflict: This design has been updated elsewhere.");
        showToast("Version conflict: Please refresh or duplicate your work.", "error");
      } else {
        setSaveError(e.message);
        setSaveStatus("error");
        showToast("Save failed: " + e.message, "error");
      }
    }
  };

  const handleNew = () => {
    resetDocument();
    setSaveStatus("");
  };

  const handleLoad = async (id: string) => {
    try {
      setSaveStatus("loading");
      const doc = await getDocument(id);
      loadDocument(doc);
      setSaveStatus("");
      showToast("Design loaded.", "success");
    } catch (e: any) {
      showToast("Failed to load design: " + e.message, "error");
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this design?")) return;
    try {
      await deleteDocument(id);
      if (documentId === id) {
        resetDocument();
      }
      fetchDesigns();
      showToast("Design deleted.", "success");
    } catch (e: any) {
      showToast("Failed to delete design: " + e.message, "error");
    }
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = shareEmail.trim();
    if (!email) return;
    try {
      setSharing(true);
      await shareDocument(documentId, { email, role: shareRole });
      setShareEmail("");
      fetchPermissions();
      showToast("Design shared successfully.", "success");
    } catch (err: any) {
      showToast("Failed to share design: " + err.message, "error");
    } finally {
      setSharing(false);
    }
  };

  const handleRevokePermission = async (permId: string) => {
    if (!window.confirm("Are you sure you want to revoke access for this user?")) return;
    try {
      await removePermission(documentId, permId);
      fetchPermissions();
      showToast("Access revoked.", "success");
    } catch (err: any) {
      showToast("Failed to revoke access: " + err.message, "error");
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
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
        showToast("Welcome back!", "success");
      } else {
        const data = await registerUser(email, password);
        setUser(data.user);
        setAccessToken(data.accessToken);
        showToast("Account created successfully.", "success");
      }
      setEmailInput("");
      setPasswordInput("");
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed");
      showToast(err.message || "Authentication failed", "error");
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
      showToast("Logged out successfully.", "info");
    }
  };

  const handleRestore = async (versionId: string) => {
    try {
      const doc = await restoreVersion(documentId, versionId);
      loadDocument(doc);
      fetchVersions();
      fetchPermissions();
      showToast(`Restored design to version ${doc.version}`, "success");
    } catch (err: any) {
      showToast("Failed to restore version: " + err.message, "error");
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
        <div className="share-section side-menu__section-card">
          <p className="side-menu__panel-title">Share Design</p>
          
          {userRole !== "viewer" && (
            <form onSubmit={handleShare} className="share-form">
              <input
                type="email"
                placeholder="collaborator@example.com"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                required
              />
              <select
                value={shareRole}
                onChange={(e) => setShareRole(e.target.value)}
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
              <button
                type="submit"
                disabled={sharing}
                className="side-menu__btn-primary"
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
            <div className="shared-users-list side-menu__list-vertical">
              {permissions.map((p) => (
                <div key={p.id} className="side-menu__shared-item">
                  <div className="side-menu__shared-info">
                    <span className="side-menu__shared-name" title={p.user_email}>
                      {p.user_email}
                    </span>
                    <span className="side-menu__shared-role">
                      {p.role}
                    </span>
                  </div>
                  {userRole !== "viewer" && (
                    <button
                      type="button"
                      onClick={() => handleRevokePermission(p.id)}
                      className="side-menu__btn-danger-text"
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

      <div className="export-import-section side-menu__section-card">
        <p className="side-menu__panel-title">Export & Import</p>
        <div className="side-menu__list-vertical">
          <div className="side-menu__flex-row-center">
            <button
              type="button"
              onClick={onExportPNG}
              className="side-menu__btn-secondary"
            >
              📷 Export PNG
            </button>
            <button
              type="button"
              onClick={onExportJSON}
              className="side-menu__btn-secondary"
            >
              📥 Export JSON
            </button>
          </div>
          
          <label className="side-menu__btn-primary side-menu__btn-primary--block">
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

interface SideMenuProps {
  collapsed: boolean;
  onToggle: () => void;
  boardWidth: number;
  boardHeight: number;
  onBoardWidthChange: (width: number) => void;
  onBoardHeightChange: (height: number) => void;
  activeTool: string;
  onToolChange: (tool: string) => void;
  onAddShape: (shapeType: string) => void;
  onAddText: (text: string) => void;
  backgroundColor: string;
  onBackgroundChange: (color: string) => void;
  selectedStroke: string;
  onStrokeChange: (stroke: string) => void;
  selectedItem: any;
  onDeleteSelected: () => void;
  onChangeSelectedColor: (color: string) => void;
  onExportPNG: () => void;
  onExportJSON: () => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function SideMenu({
  collapsed,
  onToggle,
  onExportPNG,
  onExportJSON,
  onImportJSON,
}: SideMenuProps) {
  const [activeLeftTab, setActiveLeftTab] = React.useState<"Layers" | "Designs">("Layers");
  const menuCollapsed = useStore((state: any) => state.menuCollapsed);
  const setMenuCollapsed = useStore((state: any) => state.setMenuCollapsed);

  const renderToolPanel = () => {
    switch (activeLeftTab) {
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
    <aside className={`side-menu ${menuCollapsed ? "side-menu--collapsed" : ""}`}>
      {/* Sticky Tab Header */}
      {!menuCollapsed && (
        <div className="side-menu__tab-header flex border-b border-zinc-800 bg-zinc-950 flex-shrink-0" style={{ height: "36px" }}>
          <button
            onClick={() => setActiveLeftTab("Layers")}
            className={`flex-1 text-center text-xs font-semibold border-b-2 transition-colors ${
              activeLeftTab === "Layers"
                ? "border-indigo-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Layers
          </button>
          <button
            onClick={() => setActiveLeftTab("Designs")}
            className={`flex-1 text-center text-xs font-semibold border-b-2 transition-colors ${
              activeLeftTab === "Designs"
                ? "border-indigo-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Pages
          </button>
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
            onClick={() => setMenuCollapsed(true)}
            title="Collapse Sidebar"
          >
            ✕
          </button>
        </div>
      )}

      {menuCollapsed && (
        <div className="side-menu__collapsed-trigger p-2 text-center">
          <button
            type="button"
            onClick={() => setMenuCollapsed(false)}
            className="w-8 h-8 rounded bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all font-bold"
            title="Expand Sidebar"
          >
            +
          </button>
        </div>
      )}

      {!menuCollapsed && (
        <div className="side-menu__content flex-1 overflow-y-auto">
          {renderToolPanel()}
        </div>
      )}
    </aside>
  );
}
