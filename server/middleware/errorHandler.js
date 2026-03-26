const errorHandler = (err, req, res, next) => {
  // ซ่อน error detail ใน production
  const isDev = process.env.NODE_ENV === "development";

  // Log เสมอ (server-side เท่านั้น)
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  // MongoDB errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: isDev ? Object.values(err.errors).map(e => e.message) : undefined,
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      error: "Duplicate entry",
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      error: "Invalid ID format",
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      error: "Invalid token",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      error: "Token expired",
    });
  }

  // Rate limit
  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      error: "Too many requests",
    });
  }

  // Default
  res.status(err.status || 500).json({
    success: false,
    error: isDev ? err.message : "Internal server error",
  });
};

export default errorHandler;