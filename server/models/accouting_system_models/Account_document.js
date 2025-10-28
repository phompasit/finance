import mongoose from "mongoose";

const Account_documentSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true, // เพิ่ม index เพื่อค้นหาบัญชีของแต่ละบริษัทเร็วขึ้น
    },
    parentCode: {
      type: String,
      required: true,
    }, // เช่น 606 (บัญชีหลัก)
    code: {
      type: String,
      required: true,
      unique: true, // แต่ละบัญชีต้องมีเลขบัญชีไม่ซ้ำ
    }, // เลขบัญชีย่อย เช่น 6061, 6061.001
    name: {
      type: String,
      required: true,
    }, // ชื่อบัญชี
    type: {
      type: String,
      enum: ["asset", "liability", "equity", "income", "expense"],
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

const Account_document = mongoose.model(
  "Account_document",
  Account_documentSchema
);

export default Account_document;
