import React from "react";
import { Folder, ArrowLeft, Code, Eye } from "lucide-react";
import { useStore } from "../store/useStore";

export interface AppBarProps {
  leftContent?: React.ReactNode;
  centerContent?: React.ReactNode;
  rightContent?: React.ReactNode;
}

export default function AppBar({ leftContent, centerContent, rightContent }: AppBarProps) {
  const user = useStore((state: any) => state.user);
  const documentName = useStore((state: any) => state.documentName);

  const handleGenerateCodeClick = () => {
    window.dispatchEvent(new CustomEvent("trigger-generate-code"));
  };

  const handleInspectSchemaClick = () => {
    window.dispatchEvent(new CustomEvent("trigger-inspect-schema"));
  };

  return (
    <header className="app-bar">
      {/* Left Zone: File / Back Nav */}
      <div className="app-bar__left">
        {leftContent || (
          <div className="app-bar__nav">
            <button type="button" className="app-bar__btn" title="Back">
              <ArrowLeft size={16} />
            </button>
            <button type="button" className="app-bar__btn" title="Files">
              <Folder size={16} />
            </button>
            <span className="app-bar__brand">UI to Code</span>
          </div>
        )}
      </div>

      {/* Center Zone: Future Document Title */}
      <div className="app-bar__center">
        {centerContent || (documentName ? <span className="app-bar__doc-title">{documentName}</span> : null)}
      </div>

      {/* Right Zone: View Mode / Code Generation Toggle Controls */}
      <div className="app-bar__right">
        {rightContent || (
          <div className="app-bar__controls">
            {user && (
              <>
                <button
                  id="app-bar-generate-code-btn"
                  type="button"
                  className="app-bar__action-btn app-bar__action-btn--primary"
                  onClick={handleGenerateCodeClick}
                  title="Convert design to React + Tailwind code"
                >
                  <Code size={14} />
                  <span>Generate Code</span>
                </button>
                <button
                  id="app-bar-inspect-schema-btn"
                  type="button"
                  className="app-bar__action-btn app-bar__action-btn--secondary"
                  onClick={handleInspectSchemaClick}
                  title="Inspect raw UI Schema"
                >
                  <Eye size={14} />
                  <span>Inspect Schema</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
