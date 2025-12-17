import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load ENV
dotenv.config({ path: path.join(__dirname, "../../.env") });

/* =========================================
   🔒 ALLOWED ORIGINS (Dynamic)
========================================= */
const getAllowedOrigins = () => {
  const origins = [
    "http://localhost:5173", // dev
    "https://finance.manignom.group"
  ];

  // FRONTEND_DOMAIN from env
  if (process.env.PRODUCTION_URL) {
    origins.push(process.env.PRODUCTION_URL);
  }

  // Allow multiple domains via ENV list
  if (process.env.ALLOWED_ORIGINS) {
    const list = process.env.ALLOWED_ORIGINS.split(",");
    origins.push(...list);
  }

  return origins;
};

/* =========================================
   🔒 CORS CONFIG (Strict Mode)
========================================= */
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();

    // Allow non-browser tools (Postman / mobile apps)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🚫 Blocked CORS request from: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["X-Total-Count", "X-Page-Count"],
  maxAge: 600,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

/* =========================================
   🔒 SECURITY HEADERS (Fully Hardened)
========================================= */
const securityHeaders = (req, res, next) => {
  // No clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // Prevent MIME sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // XSS protection (legacy)
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  /* 
    🔥 Single CSP header only (Fix duplicate issue)
    ✔ No unsafe-inline
    ✔ Dynamic connect-src
    ✔ Allow only self + API + FRONTEND
  */

  const allowedConnect = [
    "'self'",
    process.env.PRODUCTION_URL || "",
    ...(process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : []),
  ].filter(Boolean);

  res.setHeader(
    "Content-Security-Policy",
    `
      default-src 'self';
      script-src 'self' https://cdnjs.cloudflare.com;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      font-src 'self' data:;
      connect-src ${allowedConnect.join(" ")};
      frame-ancestors 'none';
    `.replace(/\s+/g, " ") // compact formatting
  );

  // HTTPS enforcement
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // Block sensitive browser APIs
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=()"
  );

  next();
};

/* =========================================
   🔒 RATE LIMITING
========================================= */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // each IP
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/health" || req.path === "/api/health",
});

// Login brute-force protection
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // lowered for security
  message: "Too many login attempts. Try again later.",
  skipSuccessfulRequests: true,
});

export {
  corsOptions,
  securityHeaders,
  apiLimiter,
  authLimiter,
  getAllowedOrigins,
};
