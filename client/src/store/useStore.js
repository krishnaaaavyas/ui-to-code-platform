import { create } from "zustand";

const uid = () => crypto.randomUUID();

export const useStore = create((set, get) => ({
  tool: "select",
  fill: "#4f46e5",
  stroke: "#111827",
  strokeWidth: 2,
  elements: [],
  selectedId: null,

  setTool: (tool) => set({ tool }),
  setFill: (fill) => set({ fill }),
  setStroke: (stroke) => set({ stroke }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),

  setSelectedId: (selectedId) => set({ selectedId }),

  addElement: (element) =>
    set((state) => ({
      elements: [...state.elements, { id: uid(), ...element }],
    })),

  updateElement: (id, updates) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      ),
    })),

  deleteSelected: () =>
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== state.selectedId),
      selectedId: null,
    })),

  clearSelection: () => set({ selectedId: null }),

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
    };

    set((state) => ({
      elements: [...state.elements, newLine],
      selectedId: newLine.id,
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