import React, { useState } from "react";
import { Copy, Check, Download, AlertCircle, RefreshCw } from "lucide-react";
import { SandpackProvider, SandpackLayout, SandpackCodeEditor, SandpackPreview } from "@codesandbox/sandpack-react";

interface CodeFile {
  filename: string;
  content: string;
}

interface CodePreviewPanelProps {
  isOpen: boolean;
  onClose: () => void;
  result: {
    success: boolean;
    generated?: {
      files: CodeFile[];
    };
    error?: string;
  } | null;
  proposedRefinedResult: {
    files: CodeFile[];
  } | null;
  isLoading: boolean;
  error: string | null;
  onRefine: (prompt: string) => void;
  onRegenerate: () => void;
  onAcceptRefinement: () => void;
  onRejectRefinement: () => void;
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
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code");
  const [refinePrompt, setRefinePrompt] = useState("");

  const files = proposedRefinedResult?.files || result?.generated?.files || [];

  const handleCopyCode = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error("Failed to copy code to clipboard", err);
    }
  };

  const handleDownloadAll = () => {
    if (files.length === 0) return;
    files.forEach((file) => {
      const blob = new Blob([file.content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  };

  const handleRefineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refinePrompt.trim()) return;
    onRefine(refinePrompt.trim());
    setRefinePrompt("");
  };

  // Convert schema or tokens tab content for previewing
  const getLayoutSchemaString = () => {
    return JSON.stringify(result, null, 2);
  };

  const getSandpackFiles = () => {
    const spFiles: Record<string, string> = {};
    let hasApp = false;
    files.forEach((f) => {
      if (f.filename === "App.jsx" || f.filename === "App.tsx") {
        spFiles["/App.js"] = f.content;
        hasApp = true;
      } else {
        spFiles[`/${f.filename}`] = f.content;
      }
    });
    if (!hasApp && files.length > 0) {
      spFiles["/App.js"] = files[0].content;
    }
    // inject tailwind CSS config for sandbox rendering
    spFiles["/styles.css"] = `
      @tailwind base;
      @tailwind components;
      @tailwind utilities;
      body { margin: 0; padding: 20px; background-color: #0f172a; color: #fff; font-family: sans-serif; }
    `;
    return spFiles;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
      {/* Tab Switcher Header */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/40 px-4 py-2 flex-shrink-0">
        <div className="flex bg-slate-900 border border-slate-850 p-0.5 rounded-lg">
          <button
            onClick={() => setActiveTab("code")}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              activeTab === "code" ? "bg-indigo-650 text-white shadow" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Code
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            disabled={files.length === 0}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              activeTab === "preview" ? "bg-indigo-650 text-white shadow" : "text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
            }`}
          >
            Preview
          </button>
        </div>

        {files.length > 0 && !isLoading && !proposedRefinedResult && (
          <button
            type="button"
            onClick={handleDownloadAll}
            className="px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 transition-all flex items-center gap-1.5 text-xs font-semibold"
          >
            <Download size={13} />
            <span>Download All</span>
          </button>
        )}
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-200">Reconstructing design code...</p>
            <p className="text-xs text-slate-400 max-w-[280px] mt-1">Refactoring layout models and applying Tailwind styles.</p>
          </div>
        )}

        {error && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-950">
            <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
            <h3 className="text-sm font-semibold text-slate-200">Generation Failed</h3>
            <p className="text-xs text-slate-400 max-w-[285px] mt-1.5 leading-relaxed">{error}</p>
            <button
              onClick={onRegenerate}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-all"
            >
              Retry Generation
            </button>
          </div>
        )}

        {!isLoading && !error && files.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-950">
            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-850 flex items-center justify-center text-slate-500 mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-slate-300">No Code Generated</h3>
            <p className="text-xs text-slate-550 max-w-[220px] mt-1.5 leading-relaxed">
              Design your UI on the canvas, then click the **Generate Code** button in the top header.
            </p>
          </div>
        )}

        {!isLoading && !error && files.length > 0 && (
          <>
            {activeTab === "code" ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* File tab list */}
                <div className="flex overflow-x-auto bg-slate-900 border-b border-slate-800/80 px-2 flex-shrink-0">
                  {files.map((f, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveFileIndex(i)}
                      className={`px-3 py-1.5 rounded-t-lg text-xs font-mono border-t border-x transition-all flex-shrink-0 ${
                        i === activeFileIndex
                          ? "bg-slate-950 border-slate-800 text-indigo-400 font-semibold"
                          : "bg-transparent border-transparent text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {f.filename}
                    </button>
                  ))}
                </div>

                {/* Active File Content Code Block */}
                <div className="flex-1 overflow-auto bg-slate-950 relative p-4">
                  <div className="absolute right-4 top-4 z-10 flex gap-2">
                    <button
                      onClick={() => handleCopyCode(files[activeFileIndex].content, activeFileIndex)}
                      className="p-1.5 rounded bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                      title="Copy Code"
                    >
                      {copiedIndex === activeFileIndex ? <Check size={13} className="text-emerald-450" /> : <Copy size={13} />}
                    </button>
                  </div>
                  <pre className="text-xs font-mono text-slate-300 select-all leading-relaxed whitespace-pre-wrap">
                    <code>{files[activeFileIndex].content}</code>
                  </pre>
                </div>
              </div>
            ) : (
              // Sandpack live interactive preview sandbox
              <div className="flex-1 overflow-hidden">
                <SandpackProvider
                  files={getSandpackFiles()}
                  theme="dark"
                  customSetup={{
                    dependencies: {
                      lucide: "latest",
                      "lucide-react": "latest",
                    },
                  }}
                  options={{
                    externalResources: ["https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css"],
                  }}
                >
                  <SandpackLayout className="h-full border-none">
                    <SandpackPreview className="h-full" showNavigator={false} showOpenInCodeSandbox={false} />
                  </SandpackLayout>
                </SandpackProvider>
              </div>
            )}

            {/* AI Prompter/Refinement Footer Panel */}
            <div className="p-4 border-t border-slate-900 bg-slate-950/95 flex-shrink-0">
              {proposedRefinedResult ? (
                <div className="bg-indigo-950/20 border border-indigo-900/40 rounded-xl p-3.5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-400">Apply Refined Output?</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={onRejectRefinement}
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold transition-all"
                      >
                        Discard
                      </button>
                      <button
                        onClick={onAcceptRefinement}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow shadow-indigo-650/30"
                      >
                        Accept Changes
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-450 leading-normal">
                    You can view the proposed generated code and interact with the sandbox preview before merging the modifications into your project.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleRefineSubmit} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ask AI to refine layout, tweak colors, or adjust elements..."
                    value={refinePrompt}
                    onChange={(e) => setRefinePrompt(e.target.value)}
                    disabled={isLoading}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-850 text-slate-200 placeholder-slate-550 text-xs outline-none focus:border-indigo-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!refinePrompt.trim() || isLoading}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      refinePrompt.trim() && !isLoading
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow"
                        : "bg-slate-900 border border-slate-850 text-slate-650 cursor-not-allowed"
                    }`}
                  >
                    <span>Refine</span>
                  </button>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
