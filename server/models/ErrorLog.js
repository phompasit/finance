import mongoose from "mongoose";

const errorLogSchema = new mongoose.Schema({
  endpoint: { type: String, required: true },
  error: { type: String, required: true },
  stack: { type: String },
  ipAddress: { type: String },
  timestamp: { type: Date, default: Date.now },
});
errorLogSchema.add({
  expireAt: {
    type: Date,
    default: () => new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 วัน
    index: { expires: 0 }, // TTL ลบเมื่อครบเวลา
  },
})
const ErrorLog = mongoose.model("ErrorLog", errorLogSchema);

export default ErrorLog;
