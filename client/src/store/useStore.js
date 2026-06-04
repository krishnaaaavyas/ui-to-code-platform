import { create } from "zustand";

/**
 * @typedef {Object} CanvasElement
 * @property {string} id
 * @property {'rect' | 'circle' | 'triangle' | 'diamond' | 'line' | 'text' | 'path'} type
 * @property {number} x
 * @property {number} y
 * @property {boolean} visible
 * @property {boolean} locked
 * @property {string} name
 * @property {number} [width]
 * @property {number} [height]
 * @property {number} [radius]
 * @property {string} [text]
 * @property {number} [fontSize]
 * @property {string} [fill]
 * @property {string} [stroke]
 * @property {number} [strokeWidth]
 * @property {string} [lineCap]
 * @property {number[]} [points]
 * @property {number} [rotation]
 */

const getSnapshot = (state) => ({
  boardWidth: state.boardWidth,
  boardHeight: state.boardHeight,
  backgroundColor: state.backgroundColor,
  selectedElementId: state.selectedElementId,
  elements: state.elements.map((element) => ({
    ...element,
    points: element.points ? [...element.points] : undefined,
  })),
});

const loadSnapshot = (snapshot) => ({
  boardWidth: snapshot.boardWidth,
  boardHeight: snapshot.boardHeight,
  backgroundColor: snapshot.backgroundColor,
  selectedElementId: snapshot.selectedElementId,
  elements: snapshot.elements.map((element) => ({
    ...element,
    points: element.points ? [...element.points] : undefined,
  })),
});

const initialSnapshot = {
  boardWidth: 2200,
  boardHeight: 1400,
  backgroundColor: "#ffffff",
  selectedElementId: null,
  elements: [],
};

const pushState = (state, patch) => {
  const mergedState = { ...state, ...patch };
  const snapshot = getSnapshot(mergedState);
  const nextHistory = state.history.slice(0, state.historyIndex + 1);
  return {
    ...patch,
    isDirty: true,
    saveStatus: "idle",
    history: [...nextHistory, snapshot],
    historyIndex: nextHistory.length,
  };
};

export const useStore = create((set, get) => ({
  // User & Session Authentication
  user: null,
  accessToken: null,
  isAuthReady: false,

  // Persistent document metadata
  documentId: null,
  documentName: "Untitled Design",
  documentVersion: 1, // keeps track of DB version
  isDirty: false,
  saveStatus: "idle", // "idle" | "saving" | "saved" | "error" | "conflict"
  saveError: null,

  // Persistent document state
  boardWidth: 2200,
  boardHeight: 1400,
  backgroundColor: "#ffffff",
  selectedElementId: null,
  elements: [],

  // Transient UI state
  activeTool: "Shapes",
  selectedStroke: "Pen",
  menuCollapsed: false,
  isDrawing: false,
  editingTextId: null,
  transformingId: null,
  draftElement: null,

  // History state
  history: [initialSnapshot],
  historyIndex: 0,

  // History actions
  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  undo: () =>
    set((state) => {
      if (state.historyIndex <= 0) return {};
      const nextIndex = state.historyIndex - 1;
      const snapshot = state.history[nextIndex];
      return {
        historyIndex: nextIndex,
        isDirty: true,
        saveStatus: "idle",
        ...loadSnapshot(snapshot),
      };
    }),

  redo: () =>
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) return {};
      const nextIndex = state.historyIndex + 1;
      const snapshot = state.history[nextIndex];
      return {
        historyIndex: nextIndex,
        isDirty: true,
        saveStatus: "idle",
        ...loadSnapshot(snapshot),
      };
    }),

  // UI state actions
  setActiveTool: (tool) => set({ activeTool: tool }),
  setSelectedStroke: (stroke) => set({ selectedStroke: stroke }),
  setMenuCollapsed: (collapsed) => set({ menuCollapsed: collapsed }),
  setIsDrawing: (value) => set({ isDrawing: value }),
  setEditingTextId: (id) => set({ editingTextId: id }),
  setTransformingId: (id) => set({ transformingId: id }),
  setDraftElement: (draft) => set({ draftElement: draft }),

  // Document metadata actions
  setDocumentName: (name) => set({ documentName: name, isDirty: true, saveStatus: "idle" }),
  setDocumentId: (id) => set({ documentId: id }),
  setIsSaving: (isSaving) => set({ saveStatus: isSaving ? "saving" : get().saveStatus }),
  setSaveStatus: (status) => set({ saveStatus: status }),
  setSaveError: (error) => set({ saveError: error }),
  setDocumentVersion: (version) => set({ documentVersion: version }),

  // Auth actions
  setUser: (user) => set({ user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setAuthReady: (isAuthReady) => set({ isAuthReady }),

  logoutUser: () => set({ user: null, accessToken: null, documentId: null, elements: [], history: [initialSnapshot], historyIndex: 0, isDirty: false, saveStatus: "idle" }),

  serializeDocument: () => {
    const state = get();
    return {
      boardWidth: state.boardWidth,
      boardHeight: state.boardHeight,
      backgroundColor: state.backgroundColor,
      elements: state.elements.map((el) => ({
        ...el,
        points: el.points ? [...el.points] : undefined,
      })),
    };
  },

  loadDocument: (doc) => {
    const loadedSnapshot = {
      boardWidth: doc.data.boardWidth,
      boardHeight: doc.data.boardHeight,
      backgroundColor: doc.data.backgroundColor,
      selectedElementId: null,
      elements: doc.data.elements.map((el) => ({
        ...el,
        points: el.points ? [...el.points] : undefined,
      })),
    };
    set({
      documentId: doc.id,
      documentName: doc.name,
      documentVersion: doc.version || 1,
      boardWidth: doc.data.boardWidth,
      boardHeight: doc.data.boardHeight,
      backgroundColor: doc.data.backgroundColor,
      selectedElementId: null,
      elements: loadedSnapshot.elements,
      history: [loadedSnapshot],
      historyIndex: 0,
      isDirty: false,
      saveStatus: "saved",
      saveError: null,
    });
  },

  resetDocument: () => {
    const freshSnapshot = {
      boardWidth: 2200,
      boardHeight: 1400,
      backgroundColor: "#ffffff",
      selectedElementId: null,
      elements: [],
    };
    set({
      documentId: null,
      documentName: "Untitled Design",
      documentVersion: 1,
      boardWidth: 2200,
      boardHeight: 1400,
      backgroundColor: "#ffffff",
      selectedElementId: null,
      elements: [],
      history: [freshSnapshot],
      historyIndex: 0,
      isDirty: false,
      saveStatus: "idle",
      saveError: null,
    });
  },

  // Document state actions
  addElement: (element) =>
    set((state) => {
      const nextElements = [...state.elements, element];
      return pushState(state, {
        elements: nextElements,
        selectedElementId: element.id,
      });
    }),

  updateElement: (id, patch) =>
    set((state) => {
      const nextElements = state.elements.map((element) =>
        element.id === id ? { ...element, ...patch } : element
      );
      return pushState(state, { elements: nextElements });
    }),

  deleteElement: (id) =>
    set((state) => {
      const nextElements = state.elements.filter((element) => element.id !== id);
      const nextSelectedId =
        state.selectedElementId === id ? null : state.selectedElementId;
      return pushState(state, {
        elements: nextElements,
        selectedElementId: nextSelectedId,
      });
    }),

  reorderElements: (fromIndex, toIndex) =>
    set((state) => {
      const elements = state.elements;
      if (
        fromIndex < 0 ||
        fromIndex >= elements.length ||
        toIndex < 0 ||
        toIndex >= elements.length
      ) {
        return {};
      }
      const nextElements = [...elements];
      const [removed] = nextElements.splice(fromIndex, 1);
      nextElements.splice(toIndex, 0, removed);
      return pushState(state, { elements: nextElements });
    }),

  toggleElementVisibility: (id) =>
    set((state) => {
      const nextElements = state.elements.map((element) =>
        element.id === id ? { ...element, visible: !element.visible } : element
      );
      return pushState(state, { elements: nextElements });
    }),

  toggleElementLocked: (id) =>
    set((state) => {
      const nextElements = state.elements.map((element) =>
        element.id === id ? { ...element, locked: !element.locked } : element
      );
      return pushState(state, { elements: nextElements });
    }),

  renameElement: (id, name) =>
    set((state) => {
      const nextElements = state.elements.map((element) =>
        element.id === id ? { ...element, name } : element
      );
      return pushState(state, { elements: nextElements });
    }),

  selectElement: (id) => set({ selectedElementId: id }),

  // Deprecated/Alias methods for compatibility
  setSelectedId: (id) => set({ selectedElementId: id }),

  setBoardWidth: (width) =>
    set((state) => pushState(state, { boardWidth: width })),

  setBoardHeight: (height) =>
    set((state) => pushState(state, { boardHeight: height })),

  setBackgroundColor: (color) =>
    set((state) => pushState(state, { backgroundColor: color })),
}));
