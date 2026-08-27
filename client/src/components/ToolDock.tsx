import React, { useRef, useState } from "react";
import {
  MousePointer2,
  Square,
  Circle,
  Triangle,
  Minus,
  Type,
  Upload,
  Layout,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { getPresignedUrl, uploadFileDirectly, registerAsset } from "../api/uploads";

export default function ToolDock() {
  const activeTool = useStore((state: any) => state.activeTool);
  const setActiveTool = useStore((state: any) => state.setActiveTool);
  const addElement = useStore((state: any) => state.addElement);
  const selectElement = useStore((state: any) => state.selectElement);
  const showToast = useStore((state: any) => state.showToast);
  const userRole = useStore((state: any) => state.userRole);
  const documentId = useStore((state: any) => state.documentId);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleToolClick = (toolName: string) => {
    if (toolName === "Select") {
      setActiveTool("Shapes"); // In this codebase, Select/Pointer mode is named "Shapes"
      return;
    }

    if (toolName === "Image") {
      if (userRole === "viewer") {
        showToast("Access denied: Viewers cannot upload images.", "error");
        return;
      }
      if (!documentId) {
        showToast("Please save your design first before uploading images.", "error");
        return;
      }
      fileInputRef.current?.click();
      return;
    }

    if (toolName === "Frame") {
      window.dispatchEvent(new CustomEvent("trigger-add-shape", { detail: { shape: "Frame" } }));
      return;
    }

    if (toolName === "Text") {
      window.dispatchEvent(new CustomEvent("trigger-add-text", { detail: { text: "Double click to edit" } }));
      return;
    }

    // Otherwise it's a shape: Rectangle, Circle, Triangle, Line
    window.dispatchEvent(new CustomEvent("trigger-add-shape", { detail: { shape: toolName } }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      showToast("Uploading image...", "info");

      const presignResponse = await getPresignedUrl({ filename: file.name, mimeType: file.type, documentId });
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

      addElement(newImageElement);
      selectElement(newImageElement.id);
      showToast("Image uploaded successfully.", "success");
    } catch (err: any) {
      showToast("Failed to upload image: " + err.message, "error");
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const tools = [
    { name: "Select", label: "Select (V)", icon: MousePointer2, activeKey: "Shapes" },
    { name: "Rectangle", label: "Rectangle (R)", icon: Square, activeKey: "Rectangle" },
    { name: "Circle", label: "Circle (O)", icon: Circle, activeKey: "Circle" },
    { name: "Triangle", label: "Triangle", icon: Triangle, activeKey: "Triangle" },
    { name: "Line", label: "Line (L)", icon: Minus, activeKey: "Line" },
    { name: "Text", label: "Text (T)", icon: Type, activeKey: "Text" },
    { name: "Image", label: "Upload Image", icon: Upload, activeKey: "Image" },
    { name: "Frame", label: "Board Frame (F)", icon: Layout, activeKey: "Frame" },
  ];

  return (
    <div className="tool-dock">
      {tools.map((t) => {
        const Icon = t.icon;
        const isActive = activeTool === t.activeKey;
        return (
          <button
            key={t.name}
            type="button"
            className={`tool-dock__btn ${isActive ? "tool-dock__btn--active" : ""}`}
            onClick={() => handleToolClick(t.name)}
            title={t.label}
            disabled={t.name === "Image" && uploading}
          >
            <Icon size={16} />
          </button>
        );
      })}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        style={{ display: "none" }}
      />
    </div>
  );
}
