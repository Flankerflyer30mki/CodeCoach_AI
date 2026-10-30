// Stable error shape for every API error: { error: <safe message>, code: <machine-readable> }
export const sendError = (res, status, code, error) => res.status(status).json({ error, code });
