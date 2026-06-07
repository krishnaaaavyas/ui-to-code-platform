import { useState, useCallback } from "react";
import JSZip from "jszip";

// ─── Simple lightweight syntax highlighter (no external dep) ────────────────
function highlight(code, lang) {
  if (!code) return "";
  // Basic JSX/JS highlighting using regex + span injection
  let escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  if (lang === "jsx" || lang === "tsx" || lang === "js") {
    // Keywords
    escaped = escaped.replace(
      /\b(import|export|default|from|const|let|var|function|return|if|else|for|while|class|extends|new|this|typeof|null|undefined|true|false|async|await|try|catch|throw)\b/g,
      '<span style="color:#c792ea">$1</span>'
    );
    // Strings
    escaped = escaped.replace(
      /(`[^`]*`|"[^"]*"|'[^']*')/g,
      '<span style="color:#c3e88d">$1</span>'
    );
    // JSX tags
    escaped = escaped.replace(
      /(&lt;\/?[A-Za-z][A-Za-z0-9]*)/g,
      '<span style="color:#89ddff">$1</span>'
    );
    // Comments
    escaped = escaped.replace(
      /(\/\/[^\n]*)/g,
      '<span style="color:#546e7a;font-style:italic">$1</span>'
    );
    // Numbers
    escaped = escaped.replace(
      /\b(\d+)\b/g,
      '<span style="color:#f78c6c">$1</span>'
    );
  } else if (lang === "css") {
    escaped = escaped.replace(
      /([a-z-]+)(\s*:)/g,
      '<span style="color:#89ddff">$1</span>$2'
    );
    escaped = escaped.replace(
      /(#[0-9a-fA-F]{3,8}|\d+px|\d+%|[a-z]+\(.*?\))/g,
      '<span style="color:#c3e88d">$1</span>'
    );
  }

  return escaped;
}

// ─── Copy-to-clipboard button ────────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy to clipboard"
      style={{
        background: copied ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)",
        border: `1px solid ${copied ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.12)"}`,
        borderRadius: "8px",
        color: copied ? "#10b981" : "#94a3b8",
        padding: "4px 12px",
        fontSize: "11px",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s ease",
        letterSpacing: "0.04em",
        display: "flex",
        alignItems: "center",
        gap: "6px",
      }}
    >
      {copied ? (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20,6 9,17 4,12" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

// ─── Code block ──────────────────────────────────────────────────────────────
function CodeBlock({ file }) {
  const highlighted = highlight(file.content, file.language);
  return (
    <div style={{ marginBottom: "20px" }}>
      {/* File header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderBottom: "none",
          borderRadius: "10px 10px 0 0",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: "600",
            color: "#e2e8f0",
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14,2 14,8 20,8" />
          </svg>
          {file.filename}
          <span
            style={{
              fontSize: "10px",
              background: "rgba(99,102,241,0.15)",
              color: "#818cf8",
              padding: "1px 7px",
              borderRadius: "4px",
              fontWeight: "500",
              letterSpacing: "0.05em",
            }}
          >
            {file.language.toUpperCase()}
          </span>
        </span>
        <CopyButton text={file.content} />
      </div>

      {/* Code content */}
      <pre
        style={{
          margin: 0,
          padding: "16px 18px",
          background: "rgba(8,12,22,0.7)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "0 0 10px 10px",
          overflowX: "auto",
          fontSize: "12px",
          lineHeight: "1.7",
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
          color: "#e2e8f0",
          maxHeight: "400px",
          overflowY: "auto",
        }}
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    </div>
  );
}

// ─── Download file/blob helper ───────────────────────────────────────────────
function downloadFile(content, filename, type = "text/plain") {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Main component ──────────────────────────────────────────────────────────
/**
 * CodePreviewPanel
 * A slide-over drawer that shows the generated code output from the AI pipeline.
 *
 * Props:
 *   isOpen: boolean
 *   onClose: () => void
 *   result: { generated: { files, entryFile, description, componentTree }, pipeline: { rawSchema, tokens, normalizedSchema } } | null
 *   isLoading: boolean
 *   error: string | null
 */
export default function CodePreviewPanel({ isOpen, onClose, result, isLoading, error, onRefine, onRegenerate }) {
  const [activeTab, setActiveTab] = useState("code"); // "code" | "schema" | "tokens"
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [refinePrompt, setRefinePrompt] = useState("");

  const files = result?.generated?.files || [];
  const activeFile = files[activeFileIndex];

  const handleDownloadAll = async () => {
    try {
      const zip = new JSZip();
      files.forEach((file) => {
        zip.file(file.filename, file.content);
      });
      const blob = await zip.generateAsync({ type: "blob" });
      downloadFile(blob, "ui-code-export.zip", "application/zip");
    } catch (err) {
      console.error("Failed to generate zip", err);
      // Fallback
      files.forEach((file) => {
        downloadFile(file.content, file.filename, "text/plain");
      });
    }
  };

  const handleRefine = () => {
    if (refinePrompt.trim() && onRefine) {
      onRefine(refinePrompt.trim());
      setRefinePrompt("");
    }
  };

  const tabs = [
    { id: "code", label: "Generated Code" },
    { id: "schema", label: "UI Schema" },
    { id: "tokens", label: "Design Tokens" },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
          zIndex: 1000,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.3s ease",
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(760px, 90vw)",
          background: "linear-gradient(160deg, #0f172a 0%, #0b1120 100%)",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "-24px 0 64px rgba(0,0,0,0.5)",
          zIndex: 1001,
          display: "flex",
          flexDirection: "column",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(255,255,255,0.02)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Icon */}
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 16px rgba(99,102,241,0.3)",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <polyline points="16,18 22,12 16,6" />
                <polyline points="8,6 2,12 8,18" />
              </svg>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#f1f5f9" }}>
                Design to Code
              </h2>
              <p style={{ margin: 0, fontSize: "11px", color: "#64748b", marginTop: "1px" }}>
                {isLoading
                  ? "Generating code..."
                  : result
                  ? `React + Tailwind • ${files.length} file${files.length !== 1 ? "s" : ""} generated`
                  : "AI-powered code generator"}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {result && !isLoading && (
              <button
                type="button"
                onClick={handleDownloadAll}
                title="Download all files"
                style={{
                  background: "rgba(99,102,241,0.12)",
                  border: "1px solid rgba(99,102,241,0.25)",
                  borderRadius: "8px",
                  color: "#818cf8",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(99,102,241,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(99,102,241,0.12)";
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7,10 12,15 17,10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download
              </button>
            )}

            {/* Close */}
            <button
              id="code-preview-close"
              type="button"
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "#94a3b8",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(239,68,68,0.1)";
                e.currentTarget.style.color = "#ef4444";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.color = "#94a3b8";
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "20px",
              padding: "40px",
            }}
          >
            {/* Animated spinner */}
            <div style={{ position: "relative", width: "64px", height: "64px" }}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: "3px solid rgba(99,102,241,0.15)",
                  borderTopColor: "#6366f1",
                  animation: "spin 1s linear infinite",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: "8px",
                  borderRadius: "50%",
                  border: "3px solid rgba(139,92,246,0.15)",
                  borderTopColor: "#8b5cf6",
                  animation: "spin 0.7s linear infinite reverse",
                }}
              />
              <svg
                style={{ position: "absolute", inset: "18px", color: "#6366f1" }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="16,18 22,12 16,6" />
                <polyline points="8,6 2,12 8,18" />
              </svg>
            </div>

            <div style={{ textAlign: "center" }}>
              <p style={{ color: "#e2e8f0", fontWeight: "600", margin: 0, fontSize: "15px" }}>
                Generating Code...
              </p>
              <p style={{ color: "#475569", fontSize: "13px", margin: "6px 0 0" }}>
                Analyzing design → Building AST → Generating React components
              </p>
            </div>

            {/* Pipeline steps */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%", maxWidth: "320px" }}>
              {[
                { label: "Parsing canvas elements", done: true },
                { label: "Extracting design tokens", done: true },
                { label: "Normalizing with AI", done: false },
                { label: "Generating React + Tailwind code", done: false },
              ].map((step, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 12px",
                    background: step.done ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${step.done ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)"}`,
                    borderRadius: "8px",
                  }}
                >
                  {step.done ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                      <polyline points="20,6 9,17 4,12" />
                    </svg>
                  ) : (
                    <div
                      style={{
                        width: "14px",
                        height: "14px",
                        borderRadius: "50%",
                        border: "2px solid rgba(99,102,241,0.3)",
                        borderTopColor: "#6366f1",
                        animation: "spin 1s linear infinite",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <span
                    style={{
                      fontSize: "12px",
                      color: step.done ? "#6ee7b7" : "#64748b",
                      fontWeight: step.done ? "600" : "400",
                    }}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Error state */}
        {!isLoading && error && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              padding: "40px",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "#ef4444", fontWeight: "600", margin: 0, fontSize: "15px" }}>
                Generation Failed
              </p>
              <p style={{ color: "#64748b", fontSize: "13px", margin: "6px 0 0", maxWidth: "340px", lineHeight: "1.6" }}>
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Result */}
        {!isLoading && !error && result && (
          <>
            {/* Description banner */}
            {result.generated?.description && (
              <div
                style={{
                  padding: "12px 24px",
                  background: "rgba(99,102,241,0.06)",
                  borderBottom: "1px solid rgba(99,102,241,0.1)",
                  fontSize: "12px",
                  color: "#a5b4fc",
                  lineHeight: "1.5",
                  flexShrink: 0,
                }}
              >
                <span style={{ marginRight: "6px" }}>✦</span>
                {result.generated.description}
              </div>
            )}

            {/* Tab bar */}
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                padding: "0 24px",
                flexShrink: 0,
                background: "rgba(255,255,255,0.01)",
              }}
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: "12px 0",
                    marginRight: "24px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "600",
                    color: activeTab === tab.id ? "#818cf8" : "#475569",
                    borderBottom: `2px solid ${activeTab === tab.id ? "#6366f1" : "transparent"}`,
                    transition: "all 0.2s ease",
                    paddingBottom: "10px",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: Generated Code */}
            {activeTab === "code" && (
              <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                {/* File tabs */}
                {files.length > 1 && (
                  <div
                    style={{
                      display: "flex",
                      gap: "4px",
                      padding: "10px 24px 0",
                      overflowX: "auto",
                      flexShrink: 0,
                    }}
                  >
                    {files.map((f, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActiveFileIndex(i)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: "6px",
                          border: `1px solid ${i === activeFileIndex ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.07)"}`,
                          background: i === activeFileIndex ? "rgba(99,102,241,0.12)" : "transparent",
                          color: i === activeFileIndex ? "#818cf8" : "#475569",
                          fontSize: "11px",
                          fontWeight: "600",
                          cursor: "pointer",
                          fontFamily: "'JetBrains Mono', monospace",
                          whiteSpace: "nowrap",
                          transition: "all 0.2s ease",
                        }}
                      >
                        {f.filename}
                      </button>
                    ))}
                  </div>
                )}

                {/* Code view */}
                <div style={{ flex: 1, overflow: "auto", padding: "16px 24px" }}>
                  {activeFile && <CodeBlock file={activeFile} />}
                </div>
              </div>
            )}

            {/* Tab: UI Schema */}
            {activeTab === "schema" && (
              <div style={{ flex: 1, overflow: "auto", padding: "16px 24px" }}>
                <CodeBlock
                  file={{
                    filename: "ui-schema.json",
                    language: "json",
                    content: JSON.stringify(result.pipeline?.normalizedSchema || result.pipeline?.rawSchema || {}, null, 2),
                  }}
                />
              </div>
            )}

            {/* Tab: Design Tokens */}
            {activeTab === "tokens" && (
              <div style={{ flex: 1, overflow: "auto", padding: "16px 24px" }}>
                {/* Color swatches */}
                {result.pipeline?.tokens?.colors && Object.keys(result.pipeline.tokens.colors).length > 0 && (
                  <div style={{ marginBottom: "20px" }}>
                    <p style={{ color: "#64748b", fontSize: "11px", fontWeight: "700", letterSpacing: "0.08em", margin: "0 0 12px", textTransform: "uppercase" }}>
                      Color Tokens
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                      {Object.entries(result.pipeline.tokens.colors).map(([name, value]) => (
                        <div
                          key={name}
                          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}
                        >
                          <div
                            style={{
                              width: "40px",
                              height: "40px",
                              borderRadius: "10px",
                              background: value,
                              border: "1px solid rgba(255,255,255,0.12)",
                              boxShadow: `0 4px 12px ${value}40`,
                            }}
                          />
                          <span style={{ fontSize: "10px", color: "#64748b", fontFamily: "monospace" }}>{name}</span>
                          <span style={{ fontSize: "9px", color: "#334155", fontFamily: "monospace" }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <CodeBlock
                  file={{
                    filename: "design-tokens.json",
                    language: "json",
                    content: JSON.stringify(result.pipeline?.tokens || {}, null, 2),
                  }}
                />
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {!isLoading && !error && !result && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              padding: "40px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "20px",
                background: "rgba(99,102,241,0.08)",
                border: "1px solid rgba(99,102,241,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5">
                <polyline points="16,18 22,12 16,6" />
                <polyline points="8,6 2,12 8,18" />
              </svg>
            </div>
            <div>
              <p style={{ color: "#e2e8f0", fontWeight: "600", margin: 0, fontSize: "15px" }}>
                No Code Generated Yet
              </p>
              <p style={{ color: "#475569", fontSize: "13px", margin: "6px 0 0", lineHeight: "1.6" }}>
                Add elements to your canvas, then click{" "}
                <strong style={{ color: "#818cf8" }}>Generate Code</strong> to convert your design into React components.
              </p>
            </div>
          </div>
        )}
        {/* Refinement Panel at the bottom */}
        {!isLoading && !error && result && (
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid rgba(255,255,255,0.07)",
              background: "rgba(15, 23, 42, 0.4)",
              backdropFilter: "blur(12px)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Refine with AI Instruction
              </span>
              <button
                type="button"
                onClick={onRegenerate}
                title="Rerun the entire code generation from the current canvas elements"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  fontSize: "11px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  transition: "color 0.2s ease",
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = "#818cf8"}
                onMouseLeave={(e) => e.currentTarget.style.color = "#94a3b8"}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                Regenerate Code
              </button>
            </div>
            
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="e.g., Make the layout mobile responsive, use dark mode, change primary color..."
                value={refinePrompt}
                onChange={(e) => setRefinePrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && refinePrompt.trim()) {
                    handleRefine();
                  }
                }}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  fontSize: "13px",
                  color: "#f8fafc",
                  outline: "none",
                  transition: "all 0.2s ease",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#6366f1";
                  e.currentTarget.style.boxShadow = "0 0 0 2px rgba(99,102,241,0.2)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <button
                type="button"
                onClick={handleRefine}
                disabled={!refinePrompt.trim()}
                style={{
                  background: refinePrompt.trim()
                    ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                    : "rgba(255,255,255,0.04)",
                  border: `1px solid ${refinePrompt.trim() ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: "10px",
                  color: refinePrompt.trim() ? "#ffffff" : "#475569",
                  padding: "0 18px",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: refinePrompt.trim() ? "pointer" : "not-allowed",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
                onMouseEnter={(e) => {
                  if (refinePrompt.trim()) {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(99,102,241,0.3)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow = "";
                }}
              >
                Refine
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
