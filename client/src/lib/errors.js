// Turns whatever went wrong into one UI-friendly shape:
//   { code, message, retryable }
// Messages are written here (not taken from the server) so the wording is friendly and
// consistent; the server's own text is only used where it carries specifics.
const MESSAGES = {
  INVALID_HANDLE:
    "That doesn't look like a valid Codeforces handle. Use letters, digits, underscores, dashes or dots (up to 24 characters).",
  HANDLE_NOT_FOUND: "We couldn't find that Codeforces handle. Check the spelling and try again.",
  UNRATED_USER:
    "This account has no rating yet. CodeCoach needs at least one rated contest to compare you with peers.",
  INSUFFICIENT_HISTORY:
    "There isn't enough recent history to analyze this account yet. Solve a few more rated problems and try again.",
  CODEFORCES_UNAVAILABLE:
    "Codeforces isn't responding right now. This is on their side, so try again in a minute.",
  BASELINE_UNAVAILABLE: "Peer data is being refreshed. Please try again in a little while.",
  RATE_LIMITED: "You've made a lot of requests. Please wait a few minutes before trying again.",
  TOO_MANY_CONCURRENT: "You already have an analysis running. Wait for it to finish first.",
  SERVER_BUSY: "The server is busy right now. Please try again in a few seconds.",
  PAYLOAD_TOO_LARGE: "Something was wrong with the request. Please reload the page and try again.",
  INVALID_REQUEST: "Something was wrong with the request. Please reload the page and try again.",
  INTERNAL: "Something went wrong on our side. Please try again.",
  // raised in the browser, never by the server
  TIMEOUT: "This is taking too long. Codeforces may be slow, so try again in a minute.",
  NETWORK: "Couldn't reach the server. Check your connection and try again.",
  MISCONFIGURED: "This app is misconfigured: the API address is not set.",
};

// Worth offering "try again": the same request might succeed later.
const RETRYABLE = new Set([
  "CODEFORCES_UNAVAILABLE",
  "BASELINE_UNAVAILABLE",
  "RATE_LIMITED",
  "TOO_MANY_CONCURRENT",
  "SERVER_BUSY",
  "INTERNAL",
  "TIMEOUT",
  "NETWORK",
]);

// Only these carry a wait time worth showing
const SHOWS_WAIT = new Set(["RATE_LIMITED", "SERVER_BUSY", "TOO_MANY_CONCURRENT"]);

export const waitText = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  if (seconds < 90) return ` Try again in about ${Math.ceil(seconds)} seconds.`;
  return ` Try again in about ${Math.ceil(seconds / 60)} minutes.`;
};

// err: an axios-style error ({ response?: { data, headers }, code? })
export const toUiError = (err) => {
  const res = err?.response;
  const serverCode = res?.data?.code;

  let code;
  if (typeof serverCode === "string" && Object.hasOwn(MESSAGES, serverCode)) code = serverCode;
  else if (res) code = "INTERNAL"; // a response we don't recognise, e.g. a proxy error page
  else if (err?.code === "ECONNABORTED" || err?.code === "ETIMEDOUT") code = "TIMEOUT";
  else code = "NETWORK";

  let message = MESSAGES[code];
  // the server's history message has the exact counts, which are useful here
  if (code === "INSUFFICIENT_HISTORY" && typeof res?.data?.error === "string") {
    message = res.data.error;
  }
  if (SHOWS_WAIT.has(code)) message += waitText(Number(res?.headers?.["retry-after"]));

  return { code, message, retryable: RETRYABLE.has(code) };
};

export const misconfiguredError = () => ({
  code: "MISCONFIGURED",
  message: MESSAGES.MISCONFIGURED,
  retryable: false,
});
