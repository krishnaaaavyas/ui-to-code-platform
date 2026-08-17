import React, { useState } from "react";
import {
  MousePointer2,
  Square,
  Circle,
  Triangle,
  Minus,
  Type,
} from "lucide-react";

const dockTools = [
  { name: "Select", icon: MousePointer2 },
  { name: "Rectangle", icon: Square },
  { name: "Circle", icon: Circle },
  { name: "Triangle", icon: Triangle },
  { name: "Line", icon: Minus },
  { name: "Text", icon: Type },
];

export default function ToolDock() {
  const [activeShape, setActiveShape] = useState<string | null>(null);

  const handleClick = (name: string) => {
    setActiveShape(name);
    window.dispatchEvent(new CustomEvent("trigger-add-shape", { detail: { shape: name } }));
  };

  return (
    <div className="tool-dock">
      {dockTools.map(({ name, icon: Icon }) => (
        <button
          key={name}
          type="button"
          className={`tool-dock__btn${activeShape === name ? " tool-dock__btn--active" : ""}`}
          onClick={() => handleClick(name)}
          title={name}
          aria-label={name}
        >
          <Icon size={18} />
        </button>
      ))}
    </div>
  );
}
