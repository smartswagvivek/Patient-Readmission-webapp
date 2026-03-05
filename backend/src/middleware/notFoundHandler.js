export function notFoundHandler(req, res, next) {
  if (res.headersSent) return next();
  res.status(404).json({ error: { message: "Not found" } });
}

