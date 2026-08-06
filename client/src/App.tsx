import React from "react";
import "./App.css";
import AppBar from "./components/AppBar";
import CanvasBase from "./components/CanvasBase";
import Toast from "./components/Toast";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <AppBar />
      <div className="app">
        <CanvasBase />
        <Toast />
      </div>
    </ErrorBoundary>
  );
}

export default App;
