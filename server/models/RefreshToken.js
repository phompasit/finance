// models/RefreshToken.js
import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema(
  {
    // ─── Core ──────────────────────────────────────────────────
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sessionId: {
      type: String,
      required: true,
    },

    // ─── Lifecycle ─────────────────────────────────────────────
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null, // null = ยังใช้ได้อยู่
    },

    // ─── Rotation chain ────────────────────────────────────────
    // ใช้ trace ว่า token นี้ถูกแทนที่ด้วย token อะไร
    // ถ้า token เก่าถูกใช้ซ้ำ → detect ได้ทันที
    replacedByToken: {
      type: String,
      default: null,
    },

    // ─── Metadata ──────────────────────────────────────────────
    ipAddress: { type: String },
    userAgent:  { type: String },
  },
  {
    timestamps: true, // createdAt = เวลาที่ออก token
  }
);

// ✅ MongoDB TTL index — ลบ document อัตโนมัติหลัง expire
// ไม่ต้อง cron job ทำความสะอาดเอง
refreshTokenSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

// index สำหรับ reuse detection query
refreshTokenSchema.index({ userId: 1, revokedAt: 1 });

export default mongoose.model("RefreshToken", refreshTokenSchema);