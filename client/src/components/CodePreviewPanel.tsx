import React, { useState, useEffect, Suspense } from "react";

// Lazy load Monaco Editor and Sandpack components
const Editor = React.lazy(() => import("@monaco-editor/react"));
const Sandpack = React.lazy(() =>
  import("@codesandbox/sandpack-react").then((m) => ({ default: m.Sandpack }))
);

// Lazy load JSZip
const loadJSZip = () => import("jszip").then((m) => m.default);

interface CodeFile {
  filename: string;
  content: string;
  language: string;
}

interface PipelineData {
  rawSchema?: any;
  tokens?: any;
  normalizedSchema?: any;
}

interface CodePreviewPanelProps {
  isOpen: boolean;
  onClose: () => void;
  result: {
    generated?: {
      files: CodeFile[];
      entryFile?: string;
      description?: string;
      componentTree?: any;
    };
    pipeline?: PipelineData;
  } | null;
  proposedRefinedResult: {
    files: CodeFile[];
    entryFile?: string;
    description?: string;
  } | null;
  isLoading: boolean;
  error: string | null;
  onRefine: (prompt: string) => void;
  onRegenerate: () => void;
  onAcceptRefinement: () => void;
  onRejectRefinement: () => void;
}

function LoaderPlaceholder({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center h-96">
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute inset-0 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin" />
        <div className="absolute inset-2 rounded-full border-4 border-purple-500/10 border-t-purple-500 animate-spin [animation-duration:0.7s] [animation-direction:reverse]" />
      </div>
      <p className="text-slate-200 font-semibold text-sm">{message}</p>
      <p className="text-slate-500 text-xs mt-1">Fetching editor bundles & environment assets...</p>
    </div>
  );
}

export default function CodePreviewPanel({
  isOpen,
  onClose,
  result,
  proposedRefinedResult,
  isLoading,
  error,
  onRefine,
  onRegenerate,
  onAcceptRefinement,
  onRejectRefinement,
}: CodePreviewPanelProps) {
  const [activeTab, setActiveTab] = useState<"code" | "preview" | "schema" | "tokens">("code");
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [refinePrompt, setRefinePrompt] = useState("");

  const files = result?.generated?.files || [];
  const activeFile = files[activeFileIndex];

  // Map files to CodeSandbox Sandpack layout
  const getSandpackFiles = () => {
    const spFiles: Record<string, string> = {};
    
    // Default entrypoint if not found
    let hasApp = false;
    files.forEach((f) => {
      // Normalize sandpack files to src/
      const name = f.filename.startsWith("src/") || f.filename === "package.json"
        ? f.filename
        : `src/${f.filename}`;
      spFiles[name] = f.content;
      if (name.includes("App")) {
        hasApp = true;
      }
    });

    // Provide default template entries if missing
    if (!spFiles["src/index.js"]) {
      spFiles["src/index.js"] = `import React from "react";\nimport { createRoot } from "react-dom/client";\nimport App from "./App";\nimport "./styles.css";\n\nconst root = createRoot(document.getElementById("root"));\nroot.render(<App />);`;
    }

    if (!spFiles["src/styles.css"]) {
      spFiles["src/styles.css"] = `@import "tailwindcss";`;
    }

    return spFiles;
  };

  const handleDownloadAll = async () => {
    try {
      const JSZipLib = await loadJSZip();
      const zip = new JSZipLib();
      files.forEach((file) => {
        zip.file(file.filename, file.content);
      });
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${result?.generated?.entryFile || "whiteboard-design"}-export.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate zip export:", err);
      // Fallback: download individually
      files.forEach((file) => {
        const blob = new Blob([file.content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
    }
  };

  const handleRefineSubmit = () => {
    if (refinePrompt.trim()) {
      onRefine(refinePrompt.trim());
      setRefinePrompt("");
    }
  };

  // Find matching proposed file for split-screen comparison
  const proposedFile = proposedRefinedResult?.files.find(
    (f) => f.filename === activeFile?.filename
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <polyline points="16,18 22,12 16,6" />
              <polyline points="8,6 2,12 8,18" />
            </svg>
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-100">
              {proposedRefinedResult ? "Review Changes" : "Design to Code"}
            </h2>
            <p className="text-[10px] text-slate-400">
              {isLoading
                ? "Processing structure..."
                : proposedRefinedResult
                ? "Verify changes side-by-side"
                : result
                ? `React + Tailwind • ${files.length} files`
                : "Convert canvas elements"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {result && !isLoading && !proposedRefinedResult && (
            <button
              type="button"
              onClick={handleDownloadAll}
              className="px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 transition-all flex items-center gap-1 text-[10px] font-semibold"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7,10 12,15 17,10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:bg-red-500/15 hover:text-red-400 transition-all flex items-center justify-center"
            title="Collapse Panel"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950/40">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin" />
              <div className="absolute inset-2 rounded-full border-4 border-purple-500/10 border-t-purple-500 animate-spin [animation-duration:0.7s] [animation-direction:reverse]" />
            </div>
            <h3 className="text-slate-200 font-semibold">Refining Component Code...</h3>
            <p className="text-slate-500 text-xs mt-1">Re-compiling UI layout trees and styles</p>
          </div>
        )}

        {/* Error Fallback */}
        {!isLoading && error && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h3 className="text-red-500 font-semibold">Generation Error</h3>
            <p className="text-slate-400 text-xs max-w-sm mt-2 leading-relaxed">{error}</p>
          </div>
        )}

        {/* Diff Review Mode (Proposed Refinement Available) */}
        {!isLoading && !error && proposedRefinedResult && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Split Screen File Tabs */}
            {files.length > 1 && (
              <div className="flex gap-1 px-5 pt-3 overflow-x-auto bg-slate-900/10">
                {files.map((f, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveFileIndex(i)}
                    className={`px-3 py-1.5 rounded-t-lg text-xs font-mono border-t border-x transition-all ${
                      i === activeFileIndex
                        ? "bg-slate-900 border-slate-800 text-indigo-400"
                        : "bg-transparent border-transparent text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {f.filename}
                  </button>
                ))}
              </div>
            )}

            {/* Side-by-Side Editor View */}
            <div className="flex-1 flex divide-x divide-slate-800 overflow-hidden">
              {/* Original Code */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-4 py-2 bg-slate-900/40 border-b border-slate-800 text-xs font-semibold text-slate-400 flex justify-between">
                  <span>Current Version ({activeFile?.filename})</span>
                  <span className="text-red-400/80">Original</span>
                </div>
                <div className="flex-1 relative">
                  <Suspense fallback={<LoaderPlaceholder message="Loading Diff Editor..." />}>
                    <Editor
                      height="100%"
                      language={activeFile?.language || "javascript"}
                      theme="vs-dark"
                      value={activeFile?.content || ""}
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 12,
                        domReadOnly: true,
                      }}
                    />
                  </Suspense>
                </div>
              </div>

              {/* Refined Code */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-4 py-2 bg-slate-900/40 border-b border-slate-800 text-xs font-semibold text-slate-400 flex justify-between">
                  <span>Refined Proposal ({proposedFile?.filename || activeFile?.filename})</span>
                  <span className="text-emerald-400/80">Refined</span>
                </div>
                <div className="flex-1 relative">
                  <Suspense fallback={<LoaderPlaceholder message="Loading Diff Editor..." />}>
                    <Editor
                      height="100%"
                      language={proposedFile?.language || activeFile?.language || "javascript"}
                      theme="vs-dark"
                      value={proposedFile?.content || activeFile?.content || ""}
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 12,
                        domReadOnly: true,
                      }}
                    />
                  </Suspense>
                </div>
              </div>
            </div>

            {/* Split Screen Control Panel */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between gap-4">
              <span className="text-xs text-slate-400 max-w-md">
                Accepting these changes will replace your current design's underlying code with the refined version.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onRejectRefinement}
                  className="px-5 py-2 rounded-xl text-xs font-bold border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                >
                  Discard Refinement
                </button>
                <button
                  type="button"
                  onClick={onAcceptRefinement}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-600/20"
                >
                  Accept Refinement
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Regular Mode */}
        {!isLoading && !error && result && !proposedRefinedResult && (
          <>
            {/* Description Banner */}
            {result.generated?.description && (
              <div className="px-5 py-3 bg-indigo-500/5 border-b border-indigo-500/10 text-xs text-indigo-300/90 leading-relaxed flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5">✦</span>
                <p>{result.generated.description}</p>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex px-5 border-b border-slate-800 bg-slate-900/20">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-3.5 mr-6 text-sm font-bold border-b-2 transition-all ${
                    activeTab === tab.id
                      ? "border-indigo-500 text-indigo-400"
                      : "border-transparent text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: Code View */}
            {activeTab === "code" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {files.length > 1 && (
                  <div className="flex gap-1.5 px-5 pt-3 overflow-x-auto flex-shrink-0">
                    {files.map((f, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActiveFileIndex(i)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                          i === activeFileIndex
                            ? "bg-indigo-500/12 border-indigo-500/30 text-indigo-400"
                            : "bg-slate-900/30 border-slate-850 text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        {f.filename}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex-1 relative p-4">
                  <Suspense fallback={<LoaderPlaceholder message="Loading Code Editor..." />}>
                    <Editor
                      height="100%"
                      language={activeFile?.language || "javascript"}
                      theme="vs-dark"
                      value={activeFile?.content || ""}
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 12,
                        domReadOnly: true,
                      }}
                    />
                  </Suspense>
                </div>
              </div>
            )}

            {/* Tab: Sandbox Preview */}
            {activeTab === "preview" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 relative">
                  <Suspense fallback={<LoaderPlaceholder message="Spinning up Sandbox Container..." />}>
                    <Sandpack
                      template="react"
                      theme="dark"
                      files={getSandpackFiles()}
                      options={{
                        showNavigator: true,
                        showTabs: true,
                        editorHeight: "100%",
                      }}
                    />
                  </Suspense>
                </div>
              </div>
            )}

            {/* Tab: UI Schema */}
            {activeTab === "schema" && (
              <div className="flex-1 relative p-4">
                <Suspense fallback={<LoaderPlaceholder message="Loading Schema Viewer..." />}>
                  <Editor
                    height="100%"
                    language="json"
                    theme="vs-dark"
                    value={JSON.stringify(result.pipeline?.normalizedSchema || result.pipeline?.rawSchema || {}, null, 2)}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 12,
                      domReadOnly: true,
                    }}
                  />
                </Suspense>
              </div>
            )}

            {/* Tab: Design Tokens */}
            {activeTab === "tokens" && (
              <div className="flex-1 relative p-4">
                <Suspense fallback={<LoaderPlaceholder message="Loading Tokens Viewer..." />}>
                  <Editor
                    height="100%"
                    language="json"
                    theme="vs-dark"
                    value={JSON.stringify(result.pipeline?.tokens || {}, null, 2)}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 12,
                      domReadOnly: true,
                    }}
                  />
                </Suspense>
              </div>
            )}

            {/* Refinement input bar */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/40 backdrop-blur-md flex flex-col gap-2.5 flex-shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest">
                  Refine with AI Instructions
                </span>
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="text-slate-500 hover:text-indigo-400 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                  Rebuild Canvas Code
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Add dark mode styles, center the columns, make it look modern..."
                  value={refinePrompt}
                  onChange={(e) => setRefinePrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRefineSubmit();
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/50 text-slate-100 text-sm placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={handleRefineSubmit}
                  disabled={!refinePrompt.trim()}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    refinePrompt.trim()
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                      : "bg-slate-900 border border-slate-850 text-slate-600 cursor-not-allowed"
                  }`}
                >
                  Refine UI
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {!isLoading && !error && !result && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-950">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center mb-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5">
                <polyline points="16,18 22,12 16,6" />
                <polyline points="8,6 2,12 8,18" />
              </svg>
            </div>
            <h3 className="text-slate-300 font-semibold text-sm">No Code Generated Yet</h3>
            <p className="text-slate-500 text-xs max-w-[220px] mt-1 leading-relaxed">
              Draw elements on your canvas and click <span className="text-indigo-400 font-semibold">Generate Code</span> to inspect outputs.
            </p>
          </div>
        )}
    </div>
  );
}

const tabs = [
  { id: "code", label: "Generated Code" },
  { id: "preview", label: "Live Sandbox" },
  { id: "schema", label: "Layout Tree Schema" },
  { id: "tokens", label: "Design Tokens" },
];
