import { useState, useEffect } from "react";
import { loadingMessage } from "../lib/loading";

export default function LoadingScreen({ handle, onCancel }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div
        className="w-12 h-12 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mb-6"
        aria-hidden="true"
      ></div>
      <h2 className="text-xl font-medium mb-2" style={{ color: "var(--text-primary)" }}>
        Analyzing {handle}
      </h2>
      <p
        role="status"
        aria-live="polite"
        className="text-sm max-w-sm mb-2"
        style={{ color: "var(--text-secondary)" }}
      >
        {loadingMessage(seconds)}
      </p>
      <p className="text-xs mb-8" style={{ color: "var(--text-muted)" }}>
        {seconds}s elapsed
      </p>
      <button
        type="button"
        onClick={onCancel}
        className="px-5 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
        style={{
          backgroundColor: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          color: "var(--text-secondary)",
        }}
      >
        Cancel
      </button>
    </div>
  );
}
