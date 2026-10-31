import { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import { toUiError, misconfiguredError } from "../lib/errors";

// Vite env values are public (baked into the bundle): never put secrets here.
// Dev falls back to the local server; a production build without the variable
// shows a clear error instead of silently calling the wrong place.
const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://localhost:5000" : "")
).replace(/\/+$/, "");

// Server worst case is ~50s (queued Codeforces calls + both AI timeouts)
const REQUEST_TIMEOUT_MS = 75000;

const useAnalyze = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // { code, message, retryable } | null
  const [result, setResult] = useState(null);
  const controllerRef = useRef(null);

  const analyze = useCallback(async (handle) => {
    if (!API_BASE) {
      setError(misconfiguredError());
      return;
    }
    controllerRef.current?.abort(); // a new request replaces any running one
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await axios.post(
        `${API_BASE}/api/analyze`,
        { handle },
        { signal: controller.signal, timeout: REQUEST_TIMEOUT_MS },
      );
      if (controller.signal.aborted) return;
      setResult(response.data);
    } catch (err) {
      if (axios.isCancel(err) || controller.signal.aborted) return; // user cancelled: not an error
      setError(toUiError(err));
    } finally {
      // only the newest request may touch loading state; a stale one must not
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setLoading(false);
      }
    }
  }, []);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setLoading(false);
  }, []);

  // leaving the page cancels the request instead of leaving it running
  useEffect(() => () => controllerRef.current?.abort(), []);

  return { loading, error, result, analyze, cancel };
};

export default useAnalyze;
