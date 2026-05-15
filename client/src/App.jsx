import Toolbar from './components/canvas/Toolbar';
import DesignerCanvas from './components/canvas/DesignerCanvas';
import PropertiesPanel from './components/canvas/PropertiesPanel';

function App() {
  return (
    <div className="h-screen w-screen overflow-hidden flex bg-[#f3f4f6]">
      <Toolbar />
      
      <main className="flex-1 relative flex items-center justify-center p-10">
        <div className="bg-white shadow-xl rounded-sm">
           <DesignerCanvas />
        </div>
      </main>

      <aside className="w-72 bg-white border-l shadow-sm flex flex-col">
        <PropertiesPanel />
        {/* We can put the JSON preview here later */}
      </aside>
    </div>
  );
}