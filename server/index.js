import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "./.env") });

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import hpp from "hpp";
import cookieParser from "cookie-parser";

// Routes
import authRoutes from "./routes/auth.js";
import incomeExpenseRoutes from "./routes/incomeExpense.js";
import opoRoutes from "./routes/opo.js";
import debtRoutes from "./routes/debt.js";
import dashboardRoutes from "./routes/dashboard.js";
import reportRoutes from "./routes/report.js";
import advanceRoutes from "./routes/advance.js";
import categoryRoutes from "./routes/category.js";
import companyRoutes from "./routes/company.js";
import accountRoutes from "./routes/accounting/accountingL.js";
import opening_balanceRoutes from "./routes/accounting/openingBalance.js";
import journalRoutes from "./routes/accounting/journal.js";
import financialReportsRoutes from "./routes/accounting/balanceSlice.js";
import generalLedgerRoutes from "./routes/accounting/generalLedger.js";
import statementRoutes from "./routes/accounting/statementOfFinancialPosition.js";
import statementAssetsRoutes from "./routes/accounting/assets.js";
import income_statementRoutes from "./routes/accounting/incomeStatement.js";
import closingRoutes from "./routes/accounting/close_accounting.js";
import BooksRoutes from "./routes/accounting/cashBook.js";
import cashflowRoutes from "./routes/accounting/report_cashflow.js";
import fixedAssetRoutes from "./routes/accounting/fixedAsset.js";

import {
  corsOptions,
  securityHeaders,
  authLimiter,
} from "./middleware/security.js";
import { sanitizeInput } from "./middleware/sanitize.js";
import errorHandler from "./middleware/errorHandler.js";
import compression from "compression";
const app = express();

// ============================================
// 🔒 SECURITY MIDDLEWARE
// ============================================
app.use(helmet());
app.use(compression({  // ✅ ตรงนี้
  level: 6,
  threshold: 1024,
}))
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(sanitizeInput);
app.use(hpp({ whitelist: ["sort", "fields", "page", "limit"] }));

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}
app.disable("x-powered-by");

// ✅ Service Worker header
app.use((req, res, next) => {
  res.setHeader("Service-Worker-Allowed", "/");
  next();
});

// ============================================
// 🔒 MONGODB CONNECTION
// ============================================
if (!process.env.MONGODB_URI) {
  console.error("❌ MONGODB_URI is not defined");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    console.log("✅ MongoDB connected");
    console.log(`📊 Database: ${mongoose.connection.name}`);
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

mongoose.connection.on("error", (err) => console.error("MongoDB error:", err));
mongoose.connection.on("disconnected", () =>
  console.warn("⚠️ MongoDB disconnected")
);

// ============================================
// 🔒 HEALTH CHECK
// ============================================
app.get("/api/health", (req, res) => {
  // ✅ เปลี่ยนเป็น /api/health ให้ตรงกับ Dockerfile
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    environment: process.env.NODE_ENV || "development",
  });
});

// ============================================
// 🔒 API ROUTES
// ============================================
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/income-expense", incomeExpenseRoutes);
app.use("/api/opo", opoRoutes);
app.use("/api/debt", debtRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/report", reportRoutes);
app.use("/api/advances", advanceRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/account-document", accountRoutes);
app.use("/api/opening-balance", opening_balanceRoutes);
app.use("/api/journal", journalRoutes);
app.use("/api/reports", financialReportsRoutes);
app.use("/api/generalLedger", generalLedgerRoutes);
app.use("/api/statement", statementRoutes);
app.use("/api/statement-assets", statementAssetsRoutes);
app.use("/api/income-statement", income_statementRoutes);
app.use("/api/accounting", closingRoutes);
app.use("/api/book", BooksRoutes);
app.use("/api/fixAsset", fixedAssetRoutes);
app.use("/api/cashflow", cashflowRoutes);

// ============================================
// ✅ SERVE FRONTEND (Production only)
// ============================================
if (process.env.NODE_ENV === "production") {
  // ✅ ย้ายมาไว้หลัง API routes — สำคัญมาก
  app.use(express.static(path.join(__dirname, "../public")));

  // SPA fallback — ทุก route ที่ไม่ใช่ /api → ส่ง index.html
  app.get("/api/health", (req, res) => {
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
}

// ============================================
// 🔒 ERROR HANDLING
// ============================================
app.use(errorHandler);

app.use((err, req, res, next) => {
  console.error("❌ Error:", err.stack);

  if (err.name === "ValidationError") {
    return res
      .status(400)
      .json({ message: "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ", errors: err.errors });
  }
  if (err.name === "UnauthorizedError") {
    return res.status(401).json({ message: "ບໍ່ໄດ້ຮັບອະນຸຍາດ" });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: "ຂໍ້ມູນຊ້ຳກັນ" });
  }

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
  console.log(`\n${signal} received. Closing server...`);
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
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  gracefulShutdown("uncaughtException");
});
process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
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
  console.log(`🔒 Security middleware active`);
  console.log("=".repeat(50));
});

export default app;
