import mongoose from "mongoose";

const Account_documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    parentCode: {
      type: String,
      default: null, // ถ้า null = เป็นบัญชีหลัก
    },

    code: {
      type: String,
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["asset", "liability", "equity", "income", "expense"],
      required: true,
    },

    // ⭐ Normal Balance ของบัญชี: Dr หรือ Cr
    normalSide: {
      type: String,
      enum: ["Dr", "Cr"],
      required: true,
    },

    category: {
      type: String,
      enum: ["ຕົ້ນທຸນຂາຍ", "ຕົ້ນທຸນຈຳຫນ່າຍ", "ຕົ້ນທຸນບໍລິຫານ", "ອື່ນໆ"],
      default: "ອື່ນໆ",
    },

    balanceDr: {
      type: Number,
      default: 0,
    },

    balanceCr: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// ✅ ป้องกัน code ซ้ำในบริษัทเดียวกัน
Account_documentSchema.index({ companyId: 1, code: 1 }, { unique: true });

// ⭐ Auto-set normalSide ตามประเภทบัญชี (ถ้าไม่ส่งมา)
Account_documentSchema.pre("validate", function (next) {
  if (!this.normalSide) {
    if (this.type === "asset" || this.type === "expense") {
      this.normalSide = "Dr";
    } else {
      this.normalSide = "Cr";
    }
  }
  next();
});

const Account_document = mongoose.model(
  "Account_document",
  Account_documentSchema
);

export default Account_document;
