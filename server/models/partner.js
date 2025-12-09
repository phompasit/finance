import mongoose from "mongoose";

// สร้าง Schema สำหรับ Partner
const PartnerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    name: { type: String, required: true },
    taxId: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    accountName: { type: String, trim: true },
    type: { type: String, trim: true },
  },
  { timestamps: true }
);

// สร้างโมเดล
const Partner = mongoose.model("Partner", PartnerSchema);

export default Partner;
