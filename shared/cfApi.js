import axios from "axios";

const CF_API_BASE = "https://codeforces.com/api";
const TIMEOUT_MS = 15000;
const MAX_ATTEMPTS = 3;

// Mutable only so tests can set both to 0.
export const cfTiming = {
  minGapMs: 2000, // Codeforces asks for at most 1 request every 2 seconds
  backoffBaseMs: 1000,
};

// kind: "not_found" (bad handle) | "unavailable" (Codeforces failed / timed out)
export class CfError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Every outbound Codeforces call goes through here: one at a time, >= minGapMs apart.
// Process-local: with several server instances each would have its own throttle.
let chain = Promise.resolve();
let lastCall = 0;
const throttled = (fn) => {
  const run = chain.then(async () => {
    const wait = lastCall + cfTiming.minGapMs - Date.now();
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();
    return fn();
  });
  chain = run.catch(() => {});
  return run;
};

export const cfGet = async (method, params) => {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await throttled(() =>
        axios.get(`${CF_API_BASE}/${method}`, { params, timeout: TIMEOUT_MS }),
      );
      if (res.data?.status !== "OK") {
        throw new CfError("unavailable", res.data?.comment ?? "Codeforces returned a failure");
      }
      return res.data.result;
    } catch (err) {
      const status = err.response?.status;
      const comment = err.response?.data?.comment ?? err.message;
      if (/not found/i.test(comment)) throw new CfError("not_found", comment);

      // retry only transient failures: network/timeout, 429, 5xx, call-limit message
      const transient =
        !err.response || status === 429 || status >= 500 || /limit exceeded/i.test(comment);
      if (!transient || attempt === MAX_ATTEMPTS) {
        throw err instanceof CfError ? err : new CfError("unavailable", comment);
      }
      await sleep(cfTiming.backoffBaseMs * 2 ** (attempt - 1) + Math.random() * (cfTiming.backoffBaseMs / 2)); // backoff + jitter
    }
  }
};

export const getUserInfo = async (handle) => {
  const [user] = await cfGet("user.info", { handles: handle });
  return user;
};

// Last 500 submissions. An empty array here is a REAL empty history;
// failures throw CfError and are never turned into [].
export const getUserSubmissions = (handle) =>
  cfGet("user.status", { handle, from: 1, count: 500 });
