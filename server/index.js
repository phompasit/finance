import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import hpp from "hpp";
import mongoSanitize from "express-mongo-sanitize";
import path from "path";
import { fileURLToPath } from "url";

// Routes
import authRoutes from "./routes/auth.js";
import incomeExpenseRoutes from "./routes/incomeExpense.js";
import opoRoutes from "./routes/opo.js";
import debtRoutes from "./routes/debt.js";
import dashboardRoutes from "./routes/dashboard.js";
import reportRoutes from "./routes/report.js";

// Security middleware
import {
  corsOptions,
  securityHeaders,
  apiLimiter,
  authLimiter,
} from "./middleware/security";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔒 Load environment variables FIRST
dotenv.config({ path: path.join(__dirname, "./.env") });

const app = express();

// ============================================
// 🔒 SECURITY MIDDLEWARE (Order matters!)
// ============================================

// 1. Helmet - Basic security headers
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// 2. Custom security headers
app.use(securityHeaders);

// 3. CORS with validation
app.use(cors(corsOptions));

// 4. Body parsing with size limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 5. Prevent NoSQL injection

// 6. Prevent HTTP Parameter Pollution
app.use(
  hpp({
    whitelist: ["sort", "fields", "page", "limit", "type", "status"],
  })
);

// 7. Trust proxy (if behind reverse proxy/load balancer)
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// 8. Disable X-Powered-By header
app.disable("x-powered-by");

// ============================================
// 🔒 MONGODB CONNECTION
// ============================================

const MONGODB_URI = process.env.MONGODB_URI;

// Validate MongoDB URI exists
if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not defined in environment variables");
  process.exit(1);
}

// Mongoose connection options
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

mongoose
  .connect(MONGODB_URI, mongooseOptions)
  .then(() => {
    console.log("✅ MongoDB connected successfully");
    console.log(`📊 Database: ${mongoose.connection.name}`);
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// Handle MongoDB connection events
mongoose.connection.on("error", (err) => {
  console.error("MongoDB error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB disconnected. Attempting to reconnect...");
});

// ============================================
// 🔒 HEALTH CHECK (Before rate limiting)
// ============================================

app.get("/health", (req, res) => {
  const healthCheck = {
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    environment: process.env.NODE_ENV || "development",
  };
  res.status(200).json(healthCheck);
});

// ============================================
// 🔒 RATE LIMITING
// ============================================

// Apply general rate limiting to all API routes

// Apply strict rate limiting to auth routes

// ============================================
// 🔒 API ROUTES (Must come BEFORE static files)
// ============================================

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/income-expense", incomeExpenseRoutes);
app.use("/api/opo", opoRoutes);
app.use("/api/debt", debtRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/report", reportRoutes);

// ============================================
// 🔒 STATIC FILES & SPA (Last priority)
// ============================================

// Only serve static files in production
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "../dist");

  // Serve static files
  app.use(
    express.static(distPath, {
      maxAge: "1y", // Cache static assets
      etag: true,
    })
  );

  // Catch-all route for SPA (must be last!)
}
// ============================================
// 🔒 ERROR HANDLING
// ============================================

// Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.stack);

  // Handle specific error types
  if (err.name === "ValidationError") {
    return res.status(400).json({
      message: "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ",
      errors: err.errors,
    });
  }

  if (err.name === "UnauthorizedError") {
    return res.status(401).json({
      message: "ບໍ່ໄດ້ຮັບອະນຸຍາດ",
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      message: "ຂໍ້ມູນຊ້ຳກັນ",
    });
  }

  // Generic error response
  res.status(err.status || 500).json({
    message: "ເກີດຂໍ້ຜິດພາດ",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// ============================================
// 🔒 GRACEFUL SHUTDOWN
// ============================================

const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Closing server gracefully...`);

  try {
    await mongoose.connection.close();
    console.log("✅ MongoDB connection closed");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error during shutdown:", err);
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("unhandledRejection");
});

// ============================================
// 🚀 START SERVER
// ============================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("=".repeat(50));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🌍 CORS enabled for configured origins`);
  console.log(`🔒 Security middleware active`);
  console.log("=".repeat(50));
});

export default app;
