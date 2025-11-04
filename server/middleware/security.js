import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });

// 🔒 Environment-based allowed origins
const getAllowedOrigins = () => {
  const origins = [
    "http://localhost:5173",
    "https://finance-1oi.pages.dev",
    "http://127.0.0.1:5173",
  ];
  return origins;
};
// 🔒 CORS configuration with security
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();

    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) {
      return callback(null, true);
    }
    // Check if origin is in whitelist
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`🚫 Blocked CORS request from: ${origin}`);
      callback(new Error("Not allowed by CORS policy"));
    }
  },

  credentials: true, // Allow cookies and auth headers

  // 🔒 Allowed HTTP methods
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  // 🔒 Allowed headers
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-CSRF-Token",
  ],

  // 🔒 Exposed headers (client can access)
  exposedHeaders: ["X-Total-Count", "X-Page-Count"],

  // 🔒 Preflight cache duration (seconds)
  maxAge: 600, // 10 minutes

  // 🔒 Handle preflight OPTIONS requests
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// 🔒 Security headers middleware
const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // XSS Protection (legacy but still useful)
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Referrer Policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Content Security Policy
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https://finance-1oi.pages.dev https://finance-production-bd54.up.railway.app; " +
      "frame-ancestors 'none';"
  );

  // HSTS - Force HTTPS (only in production)
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // Permissions Policy (formerly Feature Policy)
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=()"
  );

  next();
};

// 🔒 Rate limiting per IP

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs`
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health check endpoints
    return req.path === "/health" || req.path === "/api/health";
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  message: "Too many login attempts, please try again later.",
  skipSuccessfulRequests: true,
});

export {
  corsOptions,
  securityHeaders,
  apiLimiter,
  authLimiter,
  getAllowedOrigins,
};
