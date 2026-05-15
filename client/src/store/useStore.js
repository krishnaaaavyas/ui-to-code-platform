import { create } from "zustand";

const uid = () => crypto.randomUUID();
const clone = (value) => JSON.parse(JSON.stringify(value));

const pushHistory = (state) => ({
  history: [...state.history, clone(state.elements)],
  future: [],
});

const moveItem = (array, from, to) => {
  const copy = [...array];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
};

const duplicateElementData = (element) => {
  const offset = 24;

  if (element.type === "line") {
    return {
      ...clone(element),
      id: uid(),
      points: element.points.map((value, index) =>
        index % 2 === 0 ? value + offset : value + offset
      ),
    };
  }

  return {
    ...clone(element),
    id: uid(),
    x: (element.x || 0) + offset,
    y: (element.y || 0) + offset,
  };
};

const normalizeImportedElements = (elements) =>
  (elements || []).map((element) => ({
    id: element.id || uid(),
    locked: false,
    hidden: false,
    groupId: null,
    opacity: 1,
    ...element,
  }));

export const useStore = create((set, get) => ({
  tool: "select",
  fill: "#7c3aed",
  stroke: "#0f172a",
  strokeWidth: 2,

  elements: [],
  selectedIds: [],

  history: [],
  future: [],

  editingTextId: null,
  textEditPosition: null,

  stageScale: 1,
  stageX: 0,
  stageY: 0,

  gridEnabled: true,
  snapToGrid: false,
  gridSize: 20,

  clipboard: [],

  contextMenu: {
    visible: false,
    x: 0,
    y: 0,
  },

  setTool: (tool) => set({ tool }),
  setFill: (fill) => set({ fill }),
  setStroke: (stroke) => set({ stroke }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),

  setGridEnabled: (gridEnabled) => set({ gridEnabled }),
  setSnapToGrid: (snapToGrid) => set({ snapToGrid }),
  setGridSize: (gridSize) => set({ gridSize }),

  setStageTransform: ({ stageScale, stageX, stageY }) =>
    set({ stageScale, stageX, stageY }),

  setSelectedIds: (selectedIds) => set({ selectedIds }),
  clearSelection: () => set({ selectedIds: [] }),
  selectAll: () => set((state) => ({ selectedIds: state.elements.map((el) => el.id) })),
  selectSingle: (id) => set({ selectedIds: id ? [id] : [] }),

  toggleSelectedId: (id) =>
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((item) => item !== id)
        : [...state.selectedIds, id],
    })),

  showContextMenu: (x, y) =>
    set({
      contextMenu: {
        visible: true,
        x,
        y,
      },
    }),

  hideContextMenu: () =>
    set({
      contextMenu: {
        visible: false,
        x: 0,
        y: 0,
      },
    }),

  beginTextEdit: (id, position) =>
    set({
      editingTextId: id,
      textEditPosition: position,
      selectedIds: [id],
    }),

  endTextEdit: () =>
    set({
      editingTextId: null,
      textEditPosition: null,
    }),

  addElement: (element) =>
    set((state) => {
      const next = {
        id: uid(),
        locked: false,
        hidden: false,
        groupId: null,
        opacity: 1,
        ...element,
      };
      return {
        ...pushHistory(state),
        elements: [...state.elements, next],
        selectedIds: [next.id],
      };
    }),

  updateElement: (id, updates) =>
    set((state) => ({
      ...pushHistory(state),
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      ),
    })),

  updateElementSilently: (id, updates) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      ),
    })),

  setElements: (elements) => set({ elements }),

  commitElements: (elements) =>
    set((state) => ({
      ...pushHistory(state),
      elements,
    })),

  replaceElements: (elements) =>
    set((state) => ({
      ...pushHistory(state),
      elements: normalizeImportedElements(elements),
      selectedIds: [],
    })),

  deleteSelected: () =>
    set((state) => {
      if (!state.selectedIds.length) return state;
      return {
        ...pushHistory(state),
        elements: state.elements.filter((el) => !state.selectedIds.includes(el.id)),
        selectedIds: [],
      };
    }),

  duplicateSelected: () =>
    set((state) => {
      const selected = state.elements.filter((el) =>
        state.selectedIds.includes(el.id)
      );
      if (!selected.length) return state;

      const duplicated = selected.map(duplicateElementData);

      return {
        ...pushHistory(state),
        elements: [...state.elements, ...duplicated],
        selectedIds: duplicated.map((el) => el.id),
      };
    }),

  copySelected: () =>
    set((state) => {
      const selected = state.elements.filter((el) =>
        state.selectedIds.includes(el.id)
      );
      return { clipboard: clone(selected) };
    }),

  cutSelected: () =>
    set((state) => {
      const selected = state.elements.filter((el) =>
        state.selectedIds.includes(el.id)
      );
      if (!selected.length) return state;

      return {
        ...pushHistory(state),
        clipboard: clone(selected),
        elements: state.elements.filter((el) => !state.selectedIds.includes(el.id)),
        selectedIds: [],
      };
    }),

  pasteClipboard: () =>
    set((state) => {
      if (!state.clipboard.length) return state;
      const pasted = state.clipboard.map(duplicateElementData);

      return {
        ...pushHistory(state),
        elements: [...state.elements, ...pasted],
        selectedIds: pasted.map((el) => el.id),
      };
    }),

  nudgeSelected: (dx, dy) =>
    set((state) => {
      if (!state.selectedIds.length) return state;

      return {
        ...pushHistory(state),
        elements: state.elements.map((el) => {
          if (!state.selectedIds.includes(el.id) || el.locked) return el;

          if (el.type === "line") {
            const nextPoints = el.points.map((value, index) =>
              index % 2 === 0 ? value + dx : value + dy
            );
            return { ...el, points: nextPoints };
          }

          return {
            ...el,
            x: (el.x || 0) + dx,
            y: (el.y || 0) + dy,
          };
        }),
      };
    }),

  toggleHidden: (id) =>
    set((state) => ({
      ...pushHistory(state),
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, hidden: !el.hidden } : el
      ),
      selectedIds: state.selectedIds.filter((selectedId) => selectedId !== id),
    })),

  toggleLocked: (id) =>
    set((state) => ({
      ...pushHistory(state),
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, locked: !el.locked } : el
      ),
    })),

  reorderElements: (fromId, toId) =>
    set((state) => {
      const fromIndex = state.elements.findIndex((el) => el.id === fromId);
      const toIndex = state.elements.findIndex((el) => el.id === toId);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return state;

      return {
        ...pushHistory(state),
        elements: moveItem(state.elements, fromIndex, toIndex),
      };
    }),

  bringToFront: () =>
    set((state) => {
      if (!state.selectedIds.length) return state;
      let next = [...state.elements];

      state.selectedIds.forEach((id) => {
        const index = next.findIndex((el) => el.id === id);
        if (index !== -1) {
          next = moveItem(next, index, next.length - 1);
        }
      });

      return {
        ...pushHistory(state),
        elements: next,
      };
    }),

  sendToBack: () =>
    set((state) => {
      if (!state.selectedIds.length) return state;
      let next = [...state.elements];

      [...state.selectedIds].reverse().forEach((id) => {
        const index = next.findIndex((el) => el.id === id);
        if (index !== -1) {
          next = moveItem(next, index, 0);
        }
      });

      return {
        ...pushHistory(state),
        elements: next,
      };
    }),

  groupSelected: () =>
    set((state) => {
      if (state.selectedIds.length < 2) return state;
      const groupId = uid();

      return {
        ...pushHistory(state),
        elements: state.elements.map((el) =>
          state.selectedIds.includes(el.id) ? { ...el, groupId } : el
        ),
      };
    }),

  ungroupSelected: () =>
    set((state) => {
      if (!state.selectedIds.length) return state;

      const selectedGroups = new Set(
        state.elements
          .filter((el) => state.selectedIds.includes(el.id) && el.groupId)
          .map((el) => el.groupId)
      );

      if (!selectedGroups.size) return state;

      return {
        ...pushHistory(state),
        elements: state.elements.map((el) =>
          selectedGroups.has(el.groupId) ? { ...el, groupId: null } : el
        ),
      };
    }),

  exportProject: () => {
    const state = get();
    return clone({
      version: 3,
      elements: state.elements,
      style: {
        fill: state.fill,
        stroke: state.stroke,
        strokeWidth: state.strokeWidth,
      },
      viewport: {
        stageScale: state.stageScale,
        stageX: state.stageX,
        stageY: state.stageY,
      },
      grid: {
        gridEnabled: state.gridEnabled,
        snapToGrid: state.snapToGrid,
        gridSize: state.gridSize,
      },
    });
  },

  importProject: (project) =>
    set((state) => ({
      ...pushHistory(state),
      elements: normalizeImportedElements(project?.elements || []),
      fill: project?.style?.fill || state.fill,
      stroke: project?.style?.stroke || state.stroke,
      strokeWidth: project?.style?.strokeWidth || state.strokeWidth,
      stageScale: project?.viewport?.stageScale ?? state.stageScale,
      stageX: project?.viewport?.stageX ?? state.stageX,
      stageY: project?.viewport?.stageY ?? state.stageY,
      gridEnabled: project?.grid?.gridEnabled ?? state.gridEnabled,
      snapToGrid: project?.grid?.snapToGrid ?? state.snapToGrid,
      gridSize: project?.grid?.gridSize ?? state.gridSize,
      selectedIds: [],
      editingTextId: null,
      textEditPosition: null,
    })),

  undo: () =>
    set((state) => {
      if (state.history.length === 0) return state;
      const previous = state.history[state.history.length - 1];

      return {
        elements: clone(previous),
        history: state.history.slice(0, -1),
        future: [clone(state.elements), ...state.future],
        selectedIds: [],
        editingTextId: null,
        textEditPosition: null,
        tool: state.tool,
        fill: state.fill,
        stroke: state.stroke,
        strokeWidth: state.strokeWidth,
        stageScale: state.stageScale,
        stageX: state.stageX,
        stageY: state.stageY,
        gridEnabled: state.gridEnabled,
        snapToGrid: state.snapToGrid,
        gridSize: state.gridSize,
        clipboard: state.clipboard,
        contextMenu: { visible: false, x: 0, y: 0 },
      };
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0) return state;
      const next = state.future[0];

      return {
        elements: clone(next),
        history: [...state.history, clone(state.elements)],
        future: state.future.slice(1),
        selectedIds: [],
        editingTextId: null,
        textEditPosition: null,
        tool: state.tool,
        fill: state.fill,
        stroke: state.stroke,
        strokeWidth: state.strokeWidth,
        stageScale: state.stageScale,
        stageX: state.stageX,
        stageY: state.stageY,
        gridEnabled: state.gridEnabled,
        snapToGrid: state.snapToGrid,
        gridSize: state.gridSize,
        clipboard: state.clipboard,
        contextMenu: { visible: false, x: 0, y: 0 },
      };
    }),

  addLineStart: (point) => {
    const { stroke, strokeWidth } = get();
    const newLine = {
      id: uid(),
      type: "line",
      points: [point.x, point.y],
      stroke,
      strokeWidth,
      lineCap: "round",
      lineJoin: "round",
      tension: 0.5,
      opacity: 1,
      locked: false,
      hidden: false,
      groupId: null,
    };

    set((state) => ({
      ...pushHistory(state),
      elements: [...state.elements, newLine],
      selectedIds: [newLine.id],
    }));
  },

  appendToLine: (id, point) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id
          ? { ...el, points: [...el.points, point.x, point.y] }
          : el
      ),
    })),
}));