import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // ใครเป็นคนทำ
    action: { type: String, required: true },                      // การกระทำ เช่น CREATE, UPDATE, DELETE
    collectionName: { type: String },                              // ชื่อ collection ที่ถูกกระทำ เช่น "orders"
    documentId: { type: mongoose.Schema.Types.ObjectId },           // id ของ document ที่ถูกกระทำ
    oldData: { type: Object },                                     // ข้อมูลก่อนเปลี่ยน (optional)
    newData: { type: Object },                                     // ข้อมูลหลังเปลี่ยน (optional)
    description: { type: String },                                 // คำอธิบายสั้น ๆ เช่น “ลบใบสั่งซื้อ #1234”
    ipAddress: { type: String },                                   // IP ของผู้ทำรายการ
    userAgent: { type: String },                                   // Browser/Device info
 


},
  { timestamps: true } // ✅ มี createdAt และ updatedAt
);
auditLogSchema.add({
  expireAt: {
    type: Date,
    default: () => new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 วัน
    index: { expires: 0 }, // TTL ลบเมื่อครบเวลา
  },
})
const AuditLog = mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;
