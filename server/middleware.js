import { sendError } from "./http.js";

// Work admission: at most `maxTotal` analyses at once and `maxPerClient` per IP.
// Over the limit the request is rejected with retry guidance instead of piling up.
// Counters are released when the handler finishes, so they track real work, and a
// handler that throws still releases its slot.
export const createAdmission = ({ maxTotal, maxPerClient }) => {
  let total = 0;
  const perClient = new Map();

  const wrap = (handler) => async (req, res, next) => {
    const key = req.ip;
    const mine = perClient.get(key) ?? 0;

    if (total >= maxTotal) {
      res.set("Retry-After", "5");
      return sendError(res, 503, "SERVER_BUSY", "The server is busy. Please try again in a few seconds.");
    }
    if (mine >= maxPerClient) {
      res.set("Retry-After", "5");
      return sendError(res, 429, "TOO_MANY_CONCURRENT", "You already have an analysis running. Please wait for it to finish.");
    }

    total++;
    perClient.set(key, mine + 1);
    try {
      await handler(req, res, next);
    } finally {
      total--;
      const left = perClient.get(key) - 1;
      if (left > 0) perClient.set(key, left);
      else perClient.delete(key);
    }
  };

  return { wrap, active: () => total };
};

// Last-resort handlers: always JSON, never a stack trace or a raw error message.
export const notFound = (req, res) => sendError(res, 404, "NOT_FOUND", "Not found.");

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.type === "entity.too.large") {
    return sendError(res, 413, "PAYLOAD_TOO_LARGE", "Request body is too large.");
  }
  if (err.type === "entity.parse.failed") {
    return sendError(res, 400, "INVALID_REQUEST", "Request body must be valid JSON.");
  }
  console.error("Unhandled error:", err);
  sendError(res, 500, "INTERNAL", "Something went wrong. Please try again.");
};
