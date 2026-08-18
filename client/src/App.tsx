import React from "react";
import "./App.css";
import AppBar from "./components/AppBar";
import CanvasBase from "./components/CanvasBase";
import InspectorPanel from "./components/InspectorPanel";
import Toast from "./components/Toast";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <AppBar />
      <div className="app">
        <CanvasBase />
        <InspectorPanel />
        <Toast />
      </div>
    </ErrorBoundary>
  );
}

export default App;
