import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { 
  MousePointer2, Square, Circle as CircleIcon, 
  Type, Pencil, Eraser, ChevronLeft, ChevronRight, Trash2 
} from 'lucide-react';

const Toolbar = () => {
  const [minimized, setMinimized] = useState(false);
  const { tool, setTool, color, setColor, deleteElement, selectedId } = useStore();

  const tools = [
    { id: 'select', icon: <MousePointer2 size={20}/>, label: 'Select' },
    { id: 'rectangle', icon: <Square size={20}/>, label: 'Square' },
    { id: 'circle', icon: <CircleIcon size={20}/>, label: 'Circle' },
    { id: 'text', icon: <Type size={20}/>, label: 'Text' },
    { id: 'pen', icon: <Pencil size={20}/>, label: 'Draw' },
  ];

  return (
    <div className={`fixed left-4 top-1/2 -translate-y-1/2 bg-white border shadow-2xl rounded-2xl transition-all duration-300 flex flex-col p-2 gap-2 ${minimized ? 'w-12' : 'w-16'}`}>
      <button onClick={() => setMinimized(!minimized)} className="p-2 hover:bg-gray-100 rounded-lg self-center">
        {minimized ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
      </button>
      
      {!minimized && (
        <>
          <div className="h-[1px] bg-gray-200 mx-2" />
          {tools.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`p-3 rounded-xl flex items-center justify-center transition ${tool === t.id ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-gray-100 text-gray-600'}`}
              title={t.label}
            >
              {t.icon}
            </button>
          ))}
          <div className="h-[1px] bg-gray-200 mx-2" />
          <input 
            type="color" 
            value={color} 
            onChange={(e) => setColor(e.target.value)}
            className="w-10 h-10 p-0 border-none bg-transparent cursor-pointer rounded-full overflow-hidden"
          />
          {selectedId && (
            <button onClick={() => deleteElement(selectedId)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl">
              <Trash2 size={20} />
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default Toolbar;