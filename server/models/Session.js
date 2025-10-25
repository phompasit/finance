import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId, // ✅ ต้องอ้างผ่าน Schema.Types.ObjectId
      ref: "User", // (ทางเลือก) ถ้ามีโมเดล User ให้เชื่อมความสัมพันธ์ไว้ด้วย
      required: true,
    },
    sessionId: { type: String, required: true },
    token: { type: String, required: true },
    refreshToken: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
    logoutAt: { type: Date },
  },
  {
    timestamps: true, // ✅ จะสร้าง createdAt และ updatedAt อัตโนมัติ
  }
);
sessionSchema.add({
  expireAt: {
    type: Date,
    default: () => new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 วัน
    index: { expires: 0 }, // TTL ลบเมื่อครบเวลา
  },
})
// ✅ สร้างโมเดล
const Session = mongoose.model("Session", sessionSchema);

export default Session;
