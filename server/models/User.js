// models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const loginHistorySchema = new mongoose.Schema({
  timestamp:  { type: Date, default: Date.now },
  ipAddress:  { type: String },
  userAgent:  { type: String },
  sessionId:  { type: String },
});

const userSchema = new mongoose.Schema(
  {
    // ─── Identity ──────────────────────────────────────────────
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // ✅ ไม่ดึงมาโดยอัตโนมัติ ต้อง .select("+password") ชัดเจน
    },
    fullName: { type: String },

    // ─── Role & Status ─────────────────────────────────────────
    role: {
      type: String,
      enum: ["admin", "staff", "user", "master","accountant"],
      default: "user",
    },
    isSuperAdmin: { type: Boolean, default: false },
    isActive:     { type: Boolean, default: true },  // ✅ ลบ duplicate ออก

    // ─── Company ───────────────────────────────────────────────
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    // ─── Login tracking ────────────────────────────────────────
    lastLogin:          { type: Date },
    lastLoginIp:        { type: String },
    lastLoginUserAgent: { type: String },
    loginHistory:       { type: [loginHistorySchema], default: [] },

    // ─── Account lockout (DB-level) ────────────────────────────
    // ⚠️  In-memory Map ใน auth.js จัดการ fast-path
    // field เหล่านี้ใช้สำหรับ persistent lock (รอด server restart)
    loginAttempts:  { type: Number, default: 0 },
    lastFailedLogin:{ type: Date },
    lockedUntil:    { type: Date },           // DB-level lock timestamp

    // ─── 2FA ───────────────────────────────────────────────────
    twoFactorEnabled:    { type: Boolean, default: false },
    twoFactorSecret:     { type: String, select: false }, // ✅ ไม่ดึงมา default

    // temp token ตอน login (รอยืนยัน 2FA)
    twoFactorTempToken:        { type: String, select: false },
    twoFactorTempTokenExpires: { type: Date },

    // brute-force protection สำหรับ 2FA
    // ✅ เพิ่ม — มีใช้ใน verify-2fa route แต่ไม่มีใน schema เดิม!
    twoFactorAttempts:   { type: Number, default: 0 },
    twoFactorLockedUntil:{ type: Date },
  },
  {
    timestamps: true,
  }
);

// ─── Hooks ──────────────────────────────────────────────────────
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12); // ✅ 12 rounds แทน 10
});

// ─── Methods ────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
  // ✅ ลบ console.log ออก — อย่า log password operations ใน production
};

// ─── Indexes ────────────────────────────────────────────────────
// ✅ เพิ่ม index สำหรับ query ที่ใช้บ่อย
userSchema.index({ email: 1 });
userSchema.index({ companyId: 1, role: 1 });
userSchema.index({ lockedUntil: 1 }, { sparse: true }); // sparse เพราะส่วนใหญ่ null

export default mongoose.model("User", userSchema);