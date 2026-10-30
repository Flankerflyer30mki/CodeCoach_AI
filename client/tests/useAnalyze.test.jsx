import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import axios from "axios";

vi.mock("axios", () => ({
  default: { post: vi.fn(), isCancel: (e) => e?.name === "CanceledError" },
}));

// Controllable requests: each axios.post call returns a promise we settle by hand.
let calls;
const settle = (i, how, value) => calls[i][how](value);
const canceled = () => Object.assign(new Error("canceled"), { name: "CanceledError" });

beforeEach(() => {
  calls = [];
  axios.post.mockReset();
  axios.post.mockImplementation((url, body, opts) => {
    let resolve, reject;
    const promise = new Promise((res, rej) => ((resolve = res), (reject = rej)));
    calls.push({ url, body, opts, resolve, reject });
    return promise;
  });
});
afterEach(() => vi.unstubAllEnvs());

const load = async () => (await import("../src/hooks/useAnalyze.js")).default;

describe("useAnalyze", () => {
  test("posts the handle with a cancel signal and a timeout, then exposes the result", async () => {
    const useAnalyze = await load();
    const { result } = renderHook(() => useAnalyze());
    act(() => void result.current.analyze("tourist"));
    expect(result.current.loading).toBe(true);
    expect(calls[0].url).toMatch(/\/api\/analyze$/);
    expect(calls[0].body).toEqual({ handle: "tourist" });
    expect(calls[0].opts.signal).toBeInstanceOf(AbortSignal);
    expect(calls[0].opts.timeout).toBeGreaterThan(50000);

    await act(async () => settle(0, "resolve", { data: { handle: "tourist" } }));
    expect(result.current.result).toEqual({ handle: "tourist" });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test("server errors become a coded UI error and stop loading", async () => {
    const useAnalyze = await load();
    const { result } = renderHook(() => useAnalyze());
    act(() => void result.current.analyze("nobody"));
    await act(async () =>
      settle(0, "reject", { response: { status: 404, data: { code: "HANDLE_NOT_FOUND" }, headers: {} } }),
    );
    expect(result.current.error.code).toBe("HANDLE_NOT_FOUND");
    expect(result.current.loading).toBe(false);
    expect(result.current.result).toBeNull();
  });

  test("cancel aborts the request, stops loading, and shows NO error", async () => {
    const useAnalyze = await load();
    const { result } = renderHook(() => useAnalyze());
    act(() => void result.current.analyze("slow"));
    const { signal } = calls[0].opts;
    act(() => result.current.cancel());
    expect(signal.aborted).toBe(true);
    expect(result.current.loading).toBe(false);
    await act(async () => settle(0, "reject", canceled()));
    expect(result.current.error).toBeNull();
  });

  test("a response that arrives AFTER cancel is ignored", async () => {
    const useAnalyze = await load();
    const { result } = renderHook(() => useAnalyze());
    act(() => void result.current.analyze("slow"));
    act(() => result.current.cancel());
    await act(async () => settle(0, "resolve", { data: { handle: "slow" } })); // late success
    expect(result.current.result).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  test("a new request replaces the old one: the old signal aborts, its late reply is ignored, and loading stays on until the NEW one finishes", async () => {
    const useAnalyze = await load();
    const { result } = renderHook(() => useAnalyze());
    act(() => void result.current.analyze("first"));
    act(() => void result.current.analyze("second"));
    expect(calls[0].opts.signal.aborted).toBe(true);
    expect(calls[1].opts.signal.aborted).toBe(false);

    await act(async () => settle(0, "resolve", { data: { handle: "first" } })); // stale reply
    expect(result.current.result).toBeNull();
    expect(result.current.loading).toBe(true); // still waiting for "second"

    await act(async () => settle(1, "resolve", { data: { handle: "second" } }));
    expect(result.current.result).toEqual({ handle: "second" });
    expect(result.current.loading).toBe(false);
  });

  test("leaving the page aborts the in-flight request", async () => {
    const useAnalyze = await load();
    const { result, unmount } = renderHook(() => useAnalyze());
    act(() => void result.current.analyze("x"));
    const { signal } = calls[0].opts;
    unmount();
    expect(signal.aborted).toBe(true);
  });

  test("a new analysis clears the previous error and result", async () => {
    const useAnalyze = await load();
    const { result } = renderHook(() => useAnalyze());
    act(() => void result.current.analyze("a"));
    await act(async () => settle(0, "reject", { response: { status: 500, data: { code: "INTERNAL" }, headers: {} } }));
    expect(result.current.error).not.toBeNull();
    act(() => void result.current.analyze("a"));
    expect(result.current.error).toBeNull();
    await waitFor(() => expect(result.current.loading).toBe(true));
  });

  test("production build without VITE_API_BASE_URL: clear error, no request made", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_API_BASE_URL", "");
    vi.resetModules();
    const useAnalyze = await load();
    const { result } = renderHook(() => useAnalyze());
    await act(async () => result.current.analyze("x"));
    expect(result.current.error.code).toBe("MISCONFIGURED");
    expect(axios.post).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  test("VITE_API_BASE_URL is used, trailing slashes trimmed", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com//");
    vi.resetModules();
    const useAnalyze = await load();
    const { result } = renderHook(() => useAnalyze());
    act(() => void result.current.analyze("x"));
    expect(calls[0].url).toBe("https://api.example.com/api/analyze");
  });
});
