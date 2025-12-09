import mongoose from "mongoose";

const openingBalanceSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account_document",
      required: true,
    },

    year: { type: Number, required: true },

    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },

    note: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("OpeningBalance", openingBalanceSchema);
