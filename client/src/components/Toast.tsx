import React from "react";
import { useStore } from "../store/useStore";

export default function Toast() {
  const toast = useStore((state) => state.toast);
  const dismissToast = useStore((state) => state.dismissToast);

  if (!toast) return null;

  const bgColors = {
    error: "bg-red-500/20 border-red-500/50 text-red-200",
    success: "bg-emerald-500/20 border-emerald-500/50 text-emerald-200",
    info: "bg-blue-500/20 border-blue-500/50 text-blue-200",
  };

  const icons = {
    error: (
      <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    success: (
      <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl animate-fade-in-up"
      style={{
        backgroundColor: toast.type === "error" ? "rgba(239, 68, 68, 0.15)" : toast.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(59, 130, 246, 0.15)",
        borderColor: toast.type === "error" ? "rgba(239, 68, 68, 0.4)" : toast.type === "success" ? "rgba(16, 185, 129, 0.4)" : "rgba(59, 130, 246, 0.4)",
        color: "#f8fafc",
      }}
    >
      <div className="flex-shrink-0">{icons[toast.type]}</div>
      <p className="text-sm font-medium pr-2">{toast.message}</p>
      <button
        onClick={dismissToast}
        aria-label="Dismiss notification"
        className="text-slate-400 hover:text-white transition-colors duration-150 focus:outline-none"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
