// middleware/sanitize.js

/**
 * Global Input Sanitization Middleware
 * - Trim strings + collapse whitespace
 * - Enforce max string length (1000 chars)
 * - Block Mongo operator injection ($where, $ne, etc.)
 * - Deep sanitize nested objects and arrays
 */

const MAX_STRING_LENGTH = 1000;

const sanitizeValue = (value, depth = 0) => {
  // ป้องกัน deep recursion (DoS via deeply nested object)
  if (depth > 10) return value;

  if (typeof value === "string") {
    return value.trim().replace(/\s+/g, " ").slice(0, MAX_STRING_LENGTH);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1));
  }

  if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value)) {
      // Block Mongo operator injection
      if (key.startsWith("$")) {
        throw new Error(`Invalid input: Mongo operator "${key}" not allowed`);
      }
      value[key] = sanitizeValue(value[key], depth + 1);
    }
    return value;
  }

  return value;
};

export const sanitizeInput = (req, res, next) => {
  // Skip ถ้าไม่มี body หรือ body ว่าง
  if (!req.body || Object.keys(req.body).length === 0) return next();

  // Skip multipart/form-data (multer จัดการเอง)
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data")) return next();

  try {
    req.body = sanitizeValue(req.body);
    next();
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};