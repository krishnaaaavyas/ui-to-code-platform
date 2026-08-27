import { useEffect } from "react";
import { useStore } from "../store/useStore";
import { updateDocument } from "../api/documents";

export function useAutosave(serializeDocument: () => any) {
  const user = useStore((state: any) => state.user);
  const documentId = useStore((state: any) => state.documentId);
  const isDirty = useStore((state: any) => state.isDirty);
  const elements = useStore((state: any) => state.elements);
  const boardWidth = useStore((state: any) => state.boardWidth);
  const boardHeight = useStore((state: any) => state.boardHeight);
  const boardColor = useStore((state: any) => state.boardColor);
  const documentName = useStore((state: any) => state.documentName);
  const documentVersion = useStore((state: any) => state.documentVersion);
  const setSaveStatus = useStore((state: any) => state.setSaveStatus);
  const showToast = useStore((state: any) => state.showToast);

  useEffect(() => {
    if (!user || !documentId || !isDirty) return;

    const timeoutId = setTimeout(async () => {
      try {
        setSaveStatus("saving");
        const payload = {
          name: documentName,
          data: serializeDocument(),
          version: documentVersion,
          manual: false,
        };
        const updatedDoc = await updateDocument(documentId, payload);
        useStore.setState({
          isDirty: false,
          saveStatus: "saved",
          documentVersion: updatedDoc.version,
          saveError: null,
        });
      } catch (e: any) {
        console.error("Autosave failed:", e);
        if (e.status === 409 || e.message === "conflict") {
          useStore.setState({
            saveStatus: "conflict",
            saveError: "Version conflict: This design has been updated elsewhere. Please reload or duplicate.",
          });
          showToast("Autosave Conflict: This file was edited elsewhere. Save failed.", "error");
        } else {
          useStore.setState({
            saveStatus: "error",
            saveError: e.message || "Autosave failed",
          });
        }
      }
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [
    user,
    documentId,
    isDirty,
    elements,
    boardWidth,
    boardHeight,
    boardColor,
    documentName,
    documentVersion,
    serializeDocument,
    setSaveStatus,
    showToast,
  ]);
}
