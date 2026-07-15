import { create } from "zustand";
import { getSocket } from "../lib/socket";

export interface CanvasElement {
  id: string;
  type: "rect" | "rectangle" | "circle" | "triangle" | "diamond" | "line" | "text" | "path" | "image" | "pen";
  x: number;
  y: number;
  visible: boolean;
  locked: boolean;
  name: string;
  width?: number;
  height?: number;
  radius?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fill?: string | null;
  stroke?: string | null;
  strokeWidth?: number;
  lineCap?: string;
  points?: number[];
  rotation?: number;
  url?: string | null;
  src?: string | null;
}

export interface DocumentSnapshot {
  boardWidth: number;
  boardHeight: number;
  backgroundColor: string;
  selectedElementId: string | null;
  elements: CanvasElement[];
}

const getSnapshot = (state: any): DocumentSnapshot => ({
  boardWidth: state.boardWidth,
  boardHeight: state.boardHeight,
  backgroundColor: state.backgroundColor,
  selectedElementId: state.selectedElementId,
  elements: state.elements.map((el: any) => ({
    ...el,
    points: el.points ? [...el.points] : undefined,
  })),
});

const loadSnapshot = (snapshot: DocumentSnapshot) => ({
  boardWidth: snapshot.boardWidth,
  boardHeight: snapshot.boardHeight,
  backgroundColor: snapshot.backgroundColor,
  selectedElementId: snapshot.selectedElementId,
  elements: snapshot.elements.map((el: any) => ({
    ...el,
    points: el.points ? [...el.points] : undefined,
  })),
});

const initialSnapshot: DocumentSnapshot = {
  boardWidth: 2200,
  boardHeight: 1400,
  backgroundColor: "#ffffff",
  selectedElementId: null,
  elements: [],
};

const historyLimit = 50;

const pushState = (state: any, patch: any) => {
  const mergedState = { ...state, ...patch };
  const snapshot = getSnapshot(mergedState);
  const nextHistory = state.history.slice(0, state.historyIndex + 1);
  const finalHistory = [...nextHistory, snapshot];
  
  let nextIndex = nextHistory.length;
  if (finalHistory.length > historyLimit) {
    finalHistory.shift();
    nextIndex = historyLimit - 1;
  }
  
  return {
    ...patch,
    isDirty: true,
    saveStatus: "idle",
    history: finalHistory,
    historyIndex: nextIndex,
  };
};

export const useStore = create<any>((set: any, get: any) => ({
  // User & Session Authentication
  user: null,
  accessToken: null,
  isAuthReady: false,

  // Persistent document metadata
  documentId: null,
  documentName: "Untitled Design",
  documentVersion: 1,
  userRole: "owner",
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

  // Toast notification state
  toast: null,
  showToast: (message: string, type: "error" | "success" | "info" = "info") => {
    set({ toast: { message, type } });
    setTimeout(() => {
      const currentToast = get().toast;
      if (currentToast && currentToast.message === message) {
        set({ toast: null });
      }
    }, 4000);
  },
  dismissToast: () => set({ toast: null }),

  // History actions
  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  undo: () =>
    set((state: any) => {
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
    set((state: any) => {
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

  commitHistory: () =>
    set((state: any) => {
      const snapshot = getSnapshot(state);
      const nextHistory = state.history.slice(0, state.historyIndex + 1);
      const finalHistory = [...nextHistory, snapshot];
      
      let nextIndex = nextHistory.length;
      if (finalHistory.length > historyLimit) {
        finalHistory.shift();
        nextIndex = historyLimit - 1;
      }
      
      return {
        isDirty: true,
        saveStatus: "idle",
        history: finalHistory,
        historyIndex: nextIndex,
      };
    }),

  // UI state actions
  setActiveTool: (tool: string) => set({ activeTool: tool }),
  setSelectedStroke: (stroke: string) => set({ selectedStroke: stroke }),
  setMenuCollapsed: (collapsed: boolean) => set({ menuCollapsed: collapsed }),
  setIsDrawing: (value: boolean) => set({ isDrawing: value }),
  setEditingTextId: (id: string | null) => set({ editingTextId: id }),
  setTransformingId: (id: string | null) => set({ transformingId: id }),
  setDraftElement: (draft: any) => set({ draftElement: draft }),

  // Document metadata actions
  setDocumentName: (name: string) => set({ documentName: name, isDirty: true, saveStatus: "idle" }),
  setDocumentId: (id: string | null) => set({ documentId: id }),
  setIsSaving: (isSaving: boolean) => set({ saveStatus: isSaving ? "saving" : get().saveStatus }),
  setSaveStatus: (status: string) => set({ saveStatus: status }),
  setSaveError: (error: any) => set({ saveError: error }),
  setDocumentVersion: (version: number) => set({ documentVersion: version }),

  // Auth actions
  setUser: (user: any) => set({ user }),
  setAccessToken: (accessToken: string | null) => set({ accessToken }),
  setAuthReady: (isAuthReady: boolean) => set({ isAuthReady }),

  logoutUser: () => set({
    user: null,
    accessToken: null,
    documentId: null,
    elements: [],
    history: [initialSnapshot],
    historyIndex: 0,
    isDirty: false,
    saveStatus: "idle"
  }),

  serializeDocument: () => {
    const state = get();
    return {
      schemaVersion: 2,
      name: state.documentName,
      board: {
        width: state.boardWidth,
        height: state.boardHeight,
        background: state.backgroundColor,
      },
      elements: state.elements.map((el: any, index: number) => ({
        id: el.id,
        type: el.type === "rectangle" ? "rect" : el.type === "path" ? "pen" : el.type,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        radius: el.radius,
        rotation: el.rotation,
        fill: el.fill,
        stroke: el.stroke,
        strokeWidth: el.strokeWidth,
        text: el.text,
        fontSize: el.fontSize,
        fontFamily: el.fontFamily,
        points: el.points ? [...el.points] : undefined,
        src: el.url || el.src,
        locked: !!el.locked,
        visible: el.visible !== false,
        zIndex: index,
        name: el.name || el.type,
      })),
    };
  },

  loadDocument: (doc: any) => {
    const data = doc.data || {};
    const board = data.board || data.boardSettings || {};
    const boardWidth = board.width ?? board.boardWidth ?? data.boardWidth ?? 2200;
    const boardHeight = board.height ?? board.boardHeight ?? data.boardHeight ?? 1400;
    const backgroundColor = board.background ?? board.backgroundColor ?? data.backgroundColor ?? "#ffffff";

    const elements = (data.elements || []).map((el: any) => {
      let type = el.type;
      if (type === "rect") type = "rectangle";
      if (type === "pen") type = "path";

      return {
        ...el,
        type,
        visible: el.hidden !== true && el.visible !== false,
        url: el.src || el.url,
        points: el.points ? [...el.points] : undefined,
      };
    });

    const loadedSnapshot = {
      boardWidth,
      boardHeight,
      backgroundColor,
      selectedElementId: null,
      elements,
    };

    set({
      documentId: doc.id,
      documentName: doc.name || "Untitled Design",
      documentVersion: doc.version || 1,
      userRole: doc.user_role || "owner",
      boardWidth,
      boardHeight,
      backgroundColor,
      selectedElementId: null,
      elements,
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
      userRole: "owner",
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
  addElement: (element: any) =>
    set((state: any) => {
      const nextElements = [...state.elements, element];
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit("element.op", {
          documentId: state.documentId,
          op: { type: "element.add", payload: element }
        });
      }
      return pushState(state, {
        elements: nextElements,
        selectedElementId: element.id,
      });
    }),

  updateElement: (id: string, patch: any, commit = true) =>
    set((state: any) => {
      const nextElements = state.elements.map((element: any) =>
        element.id === id ? { ...element, ...patch } : element
      );
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit("element.op", {
          documentId: state.documentId,
          op: { type: "element.update", payload: { id, patch } }
        });
      }

      if (commit) {
        return pushState(state, { elements: nextElements });
      } else {
        return { elements: nextElements };
      }
    }),

  deleteElement: (id: string) =>
    set((state: any) => {
      const nextElements = state.elements.filter((element: any) => element.id !== id);
      const nextSelectedId = state.selectedElementId === id ? null : state.selectedElementId;
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit("element.op", {
          documentId: state.documentId,
          op: { type: "element.delete", payload: { id } }
        });
      }
      return pushState(state, {
        elements: nextElements,
        selectedElementId: nextSelectedId,
      });
    }),

  reorderElements: (fromIndex: number, toIndex: number) =>
    set((state: any) => {
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
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit("element.op", {
          documentId: state.documentId,
          op: { type: "element.reorder", payload: { from: fromIndex, to: toIndex } }
        });
      }
      return pushState(state, { elements: nextElements });
    }),

  toggleElementVisibility: (id: string) =>
    set((state: any) => {
      const nextElements = state.elements.map((element: any) =>
        element.id === id ? { ...element, visible: !element.visible } : element
      );
      const nextVisibility = nextElements.find((el: any) => el.id === id)?.visible;
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit("element.op", {
          documentId: state.documentId,
          op: { type: "element.update", payload: { id, patch: { visible: nextVisibility } } }
        });
      }
      return pushState(state, { elements: nextElements });
    }),

  toggleElementLocked: (id: string) =>
    set((state: any) => {
      const nextElements = state.elements.map((element: any) =>
        element.id === id ? { ...element, locked: !element.locked } : element
      );
      const nextLocked = nextElements.find((el: any) => el.id === id)?.locked;
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit("element.op", {
          documentId: state.documentId,
          op: { type: "element.update", payload: { id, patch: { locked: nextLocked } } }
        });
      }
      return pushState(state, { elements: nextElements });
    }),

  renameElement: (id: string, name: string) =>
    set((state: any) => {
      const nextElements = state.elements.map((element: any) =>
        element.id === id ? { ...element, name } : element
      );
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit("element.op", {
          documentId: state.documentId,
          op: { type: "element.update", payload: { id, patch: { name } } }
        });
      }
      return pushState(state, { elements: nextElements });
    }),

  selectElement: (id: string | null) => set({ selectedElementId: id }),
  setSelectedId: (id: string | null) => set({ selectedElementId: id }),

  setBoardWidth: (width: number) =>
    set((state: any) => {
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit("element.op", {
          documentId: state.documentId,
          op: { type: "canvas.update", payload: { boardWidth: width } }
        });
      }
      return pushState(state, { boardWidth: width });
    }),

  setBoardHeight: (height: number) =>
    set((state: any) => {
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit("element.op", {
          documentId: state.documentId,
          op: { type: "canvas.update", payload: { boardHeight: height } }
        });
      }
      return pushState(state, { boardHeight: height });
    }),

  setBackgroundColor: (color: string) =>
    set((state: any) => {
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit("element.op", {
          documentId: state.documentId,
          op: { type: "canvas.update", payload: { backgroundColor: color } }
        });
      }
      return pushState(state, { backgroundColor: color });
    }),

  bringToFront: (id: string) =>
    set((state: any) => {
      const idx = state.elements.findIndex((el: any) => el.id === id);
      if (idx === -1) return {};
      const nextElements = [...state.elements];
      const [item] = nextElements.splice(idx, 1);
      nextElements.push(item);
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit("element.op", {
          documentId: state.documentId,
          op: { type: "canvas.update", payload: { elements: nextElements } }
        });
      }
      return pushState(state, { elements: nextElements });
    }),

  sendToBack: (id: string) =>
    set((state: any) => {
      const idx = state.elements.findIndex((el: any) => el.id === id);
      if (idx === -1) return {};
      const nextElements = [...state.elements];
      const [item] = nextElements.splice(idx, 1);
      nextElements.unshift(item);
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit("element.op", {
          documentId: state.documentId,
          op: { type: "canvas.update", payload: { elements: nextElements } }
        });
      }
      return pushState(state, { elements: nextElements });
    }),

  centerElement: (id: string, direction: "horizontal" | "vertical") =>
    set((state: any) => {
      const element = state.elements.find((el: any) => el.id === id);
      if (!element) return {};
      const patch: any = {};
      
      if (direction === "horizontal") {
        const width = element.width || (element.radius ? element.radius * 2 : 120);
        patch.x = Math.round((state.boardWidth - width) / 2);
      } else if (direction === "vertical") {
        const height = element.height || (element.radius ? element.radius * 2 : 120);
        patch.y = Math.round((state.boardHeight - height) / 2);
      }

      const nextElements = state.elements.map((el: any) =>
        el.id === id ? { ...el, ...patch } : el
      );

      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit("element.op", {
          documentId: state.documentId,
          op: { type: "element.update", payload: { id, patch } }
        });
      }
      return pushState(state, { elements: nextElements });
    }),

  duplicateElement: (id: string) => {
    const state = get();
    const element = state.elements.find((el: any) => el.id === id);
    if (!element) return;
    const duplicated = {
      ...element,
      id: `element-${Date.now()}`,
      x: element.x + 30,
      y: element.y + 30,
      name: `${element.name || element.type} (Copy)`,
    };
    state.addElement(duplicated);
  },

  // Remote elements & board actions (Socket.IO updates)
  remoteAddElement: (element: any) =>
    set((state: any) => {
      const exists = state.elements.some((el: any) => el.id === element.id);
      if (exists) return {};
      return { elements: [...state.elements, element] };
    }),

  remoteUpdateElement: (id: string, patch: any) =>
    set((state: any) => {
      const nextElements = state.elements.map((el: any) =>
        el.id === id ? { ...el, ...patch } : el
      );
      return { elements: nextElements };
    }),

  remoteDeleteElement: (id: string) =>
    set((state: any) => {
      const nextElements = state.elements.filter((el: any) => el.id !== id);
      const nextSelectedId = state.selectedElementId === id ? null : state.selectedElementId;
      return { elements: nextElements, selectedElementId: nextSelectedId };
    }),

  remoteReorderElements: (fromIndex: number, toIndex: number) =>
    set((state: any) => {
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
      return { elements: nextElements };
    }),

  remoteUpdateBoard: (patch: any) =>
    set(() => {
      const update: any = {};
      if (patch.boardWidth !== undefined) update.boardWidth = patch.boardWidth;
      if (patch.boardHeight !== undefined) update.boardHeight = patch.boardHeight;
      if (patch.backgroundColor !== undefined) update.backgroundColor = patch.backgroundColor;
      return update;
    }),
}));
