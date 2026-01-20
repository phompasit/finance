import mongoose from "mongoose";

// Schema บัญชีธนาคาร
const BankAccountSchema = new mongoose.Schema({
  bankName: { type: String, required: true }, // ชื่อธนาคาร
  accountNumber: { type: String, required: true }, // เลขบัญชี
  currency: {
    type: String,
    enum: ["LAK", "THB", "USD", "CNY", "EUR"],
    required: true,
  },
  balance: { type: Number, default: 0 }, // ยอดเงินคงเหลือ
});

// Schema เงินสด
const CashAccountSchema = new mongoose.Schema({
  name: { type: String, required: true }, // ชื่อ เช่น "เงินสดหน้าร้าน", "เงินสดหลัก"
  currency: {
    type: String,
    enum: ["LAK", "THB", "USD", "CNY", "EUR"],
    required: true,
  },
  balance: { type: Number, default: 0 }, // ยอดเงินสดคงเหลือ
});

const CompanySchema = new mongoose.Schema(
  {
    name: { type: String, default: "บริษัท ตัวอย่าง จำกัด" },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    logo: { type: String, default: "" },

    // ⭐ หลายบัญชีธนาคาร
    bankAccounts: [BankAccountSchema],

    // ⭐ หลายบัญชีเงินสด
    cashAccounts: [CashAccountSchema],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Company", CompanySchema);
