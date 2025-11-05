import mongoose from "mongoose";
import bcrypt from "bcryptjs";
const loginHistorySchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  ipAddress: { type: String },
  userAgent: { type: String },
  sessionId: { type: String },
});
const userSchema = new mongoose.Schema(
  {
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
    },
    role: {
      type: String,
      enum: ["admin", "staff", "user", "master"],
      default: "user",
    },
    fullName: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    companyId: {
      type: String,
    },
    companyInfo: {
      name: {
        type: String,
        default: "บริษัท ตัวอย่าง จำกัด",
      },
      address: {
        type: String,
        default: "123 ถนนตัวอย่าง กรุงเทพฯ 10100",
      },
      phone: {
        type: String,
        default: "02-123-4567",
      },
      email: {
        type: String,
        default: "info@example.com",
      },
      logo: {
        type: String,
        default: "",
      },
      isSuperAdmin: {
        type: Boolean,
      },
      /////
      loginAttempts: { type: Number, default: 0 },
      lastFailedLogin: { type: Date },
      lockedUntil: { type: Date },
      isActive: { type: Boolean, default: true },
      lastLogin: { type: Date },
      lastLoginIp: { type: String },
      lastLoginUserAgent: { type: String },

      twoFactorEnabled: { type: Boolean, default: false },
      twoFactorSecret: { type: String },

      refreshToken: { type: String },
      refreshTokenExpiry: { type: Date },

      loginHistory: [loginHistorySchema], // Array ของ login history
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("User", userSchema);
