import React from 'react';
import { useStore } from '../../store/useStore';

const PropertiesPanel = () => {
  const { selectedId, elements, updateElement, removeElement } = useStore();
  const selectedElement = elements.find(el => el.id === selectedId);

  if (!selectedElement) return <div className="p-4 text-gray-400 italic">Select an item to edit properties</div>;

  return (
    <div className="p-4 flex flex-col gap-6">
      <h3 className="font-bold text-sm uppercase tracking-wider text-gray-500">Properties</h3>
      
      <div>
        <label className="block text-xs mb-2">Fill Color</label>
        <input 
          type="color" 
          value={selectedElement.fill}
          onChange={(e) => updateElement(selectedId, { fill: e.target.value })}
          className="w-full h-10 rounded cursor-pointer"
        />
      </div>

      <div>
        <label className="block text-xs mb-2">Border Color</label>
        <input 
          type="color" 
          value={selectedElement.stroke}
          onChange={(e) => updateElement(selectedId, { stroke: e.target.value })}
          className="w-full h-10 rounded cursor-pointer"
        />
      </div>

      <button 
        onClick={() => removeElement(selectedId)}
        className="mt-4 bg-red-50 text-red-600 p-2 rounded hover:bg-red-100 transition"
      >
        Delete Element
      </button>
    </div>
  );
};