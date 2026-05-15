import { create } from 'zustand';

export const useStore = create((set) => ({
  elements: [],
  selectedId: null,
  tool: 'select', // 'select', 'rect', 'circle', 'text', 'pen', 'eraser'
  color: '#3b82f6',

  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
  setSelectedId: (id) => set({ selectedId: id }),

  addElement: (type, pos) => set((state) => {
    const newElement = {
      id: `${type}_${Date.now()}`,
      type,
      x: pos.x,
      y: pos.y,
      fill: state.color,
      // For Pen
      points: type === 'pen' ? [pos.x, pos.y] : [],
      // For Text
      text: type === 'text' ? 'Double click to edit' : '',
      // Default sizes
      width: 100,
      height: 100,
      radius: 50,
    };
    return { 
      elements: [...state.elements, newElement],
      selectedId: newElement.id 
    };
  }),

  updateElement: (id, attrs) => set((state) => ({
    elements: state.elements.map(el => el.id === id ? { ...el, ...attrs } : el)
  })),

  deleteElement: (id) => set((state) => ({
    elements: state.elements.filter(el => el.id !== id),
    selectedId: null
  }))
}));