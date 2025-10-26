import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import incomeExpenseRoutes from "./routes/incomeExpense.js";
import opoRoutes from "./routes/opo.js";
import debtRoutes from "./routes/debt.js";
import dashboardRoutes from "./routes/dashboard.js";
import reportRoutes from "./routes/report.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, './.env') });

const app = express();

// CORS Configuration
app.use(
  cors({
    origin: ["https://finance-1oi.pages.dev", "http://localhost:5173"],
    credentials: true,
  })
);

app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 
  "mongodb+srv://phompasith11_db_user:laos1212aX@cluster0.4ybjped.mongodb.net/financial-management?retryWrites=true&w=majority&appName=Cluster0";

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/income-expense", incomeExpenseRoutes);
app.use("/api/opo", opoRoutes);
app.use("/api/debt", debtRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/report", reportRoutes);

// Serve static files (สำหรับ production)
const distPath = path.join(__dirname, "../dist");
console.log("Dist path:", distPath);

app.use(express.static(distPath));

// Catch-all route สำหรับ SPA
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(500).json({ 
    message: "ເກີດຂໍ້ຜິດພາດ", 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});