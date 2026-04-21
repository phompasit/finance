// middleware/sanitize.js
import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";

const { window } = new JSDOM("");
const DOMPurify = createDOMPurify(window);

const MAX_STRING_LENGTH = 1000;
const MAX_DEPTH = 10;
const MONGO_OP = /^\$/; // block $where, $ne, $gt ...

const sanitizeString = (str) => {
  const trimmed = str.trim().replace(/\s+/g, " ").slice(0, MAX_STRING_LENGTH);
  // ລຶບ HTML tags ທັງໝົດ — ປ້ອງກັນ XSS
  return DOMPurify.sanitize(trimmed, { ALLOWED_TAGS: [] });
};

const sanitizeValue = (value, depth = 0) => {
  if (depth > MAX_DEPTH) return value;

  if (typeof value === "string") {
    return sanitizeString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1));
  }

  if (value !== null && typeof value === "object") {
    // ✅ return object ໃໝ່ ແທນ mutate ຂອງເກົ່າ
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => {
        if (MONGO_OP.test(key)) {
          throw new Error(`Invalid key: "${key}"`);
        }
        return [key, sanitizeValue(val, depth + 1)];
      })
    );
  }

  return value; // number, boolean, null → ປ່ອຍຜ່ານ
};

export const sanitizeInput = (req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data")) return next();

  try {
    if (req.body && Object.keys(req.body).length > 0) {
      req.body = sanitizeValue(req.body);
    }
    // ✅ sanitize query และ params ດ້ວຍ
    if (req.query) {
      const sanitized = sanitizeValue(req.query);
      Object.keys(sanitized).forEach((key) => {
        req.query[key] = sanitized[key];
      });
    }
    if (req.params) req.params = sanitizeValue(req.params);

    next();
  } catch (err) {
    console.log(err);
    return res.status(400).json({
      success: false,
      message: "Invalid input detected",
      // ❌ ບໍ່ສົ່ງ err.message ໃຫ້ client — ເປີດເຜີຍຂໍ້ມູນ internal
    });
  }
};
