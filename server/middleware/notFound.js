// JSON 404 catch-all. Registered AFTER all routes, so it only runs
// when no route matched the request.
export default function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}
