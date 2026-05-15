import { useEffect, useRef } from "react";
import { useStore } from "../store/useStore";

export default function InlineTextEditor() {
  const editingTextId = useStore((state) => state.editingTextId);
  const textEditPosition = useStore((state) => state.textEditPosition);
  const elements = useStore((state) => state.elements);
  const updateElement = useStore((state) => state.updateElement);
  const endTextEdit = useStore((state) => state.endTextEdit);

  const textareaRef = useRef(null);
  const activeText = elements.find((el) => el.id === editingTextId);

  useEffect(() => {
    if (editingTextId && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editingTextId]);

  if (!editingTextId || !textEditPosition || !activeText) {
    return null;
  }

  return (
    <textarea
      ref={textareaRef}
      className="inline-text-editor"
      style={{
        top: textEditPosition.top,
        left: textEditPosition.left,
        width: Math.max(textEditPosition.width, 120),
        minHeight: Math.max(textEditPosition.height, 40),
        fontSize: textEditPosition.fontSize,
        color: activeText.fill || "#111827",
      }}
      value={activeText.text || ""}
      onChange={(e) => updateElement(activeText.id, { text: e.target.value })}
      onBlur={endTextEdit}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          endTextEdit();
        }
      }}
    />
  );
}