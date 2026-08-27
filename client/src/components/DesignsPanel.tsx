import React, { useState, useEffect } from "react";
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

interface DesignsPanelProps {
  onExportPNG: () => void;
  onExportJSON: () => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function DesignsPanel({ onExportPNG, onExportJSON, onImportJSON }: DesignsPanelProps) {
  const documentId = useStore((state: any) => state.documentId);
  const documentName = useStore((state: any) => state.documentName);
  const documentVersion = useStore((state: any) => state.documentVersion);
  const setDocumentName = useStore((state: any) => state.setDocumentName);
  const saveStatus = useStore((state: any) => state.saveStatus);
  const setSaveStatus = useStore((state: any) => state.setSaveStatus);
  const saveError = useStore((state: any) => state.saveError);
  const setSaveError = useStore((state: any) => state.setSaveError);
  const serializeDocument = useStore((state: any) => state.serializeDocument);
  const loadDocument = useStore((state: any) => state.loadDocument);
  const resetDocument = useStore((state: any) => state.resetDocument);
  const userRole = useStore((state: any) => state.userRole);
  const showToast = useStore((state: any) => state.showToast);

  const user = useStore((state: any) => state.user);
  const setUser = useStore((state: any) => state.setUser);
  const setAccessToken = useStore((state: any) => state.setAccessToken);
  const logoutUserStore = useStore((state: any) => state.logoutUser);

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
