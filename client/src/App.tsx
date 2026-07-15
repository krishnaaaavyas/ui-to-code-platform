import React from "react";
import "./App.css";
import CanvasBase from "./components/CanvasBase";
import Toast from "./components/Toast";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <div className="app">
        <CanvasBase />
        <Toast />
      </div>
    </ErrorBoundary>
  );
}

export default App;
