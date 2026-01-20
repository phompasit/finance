// models/DepreciationLedger.js
import mongoose from "mongoose";

const DepreciationLedgerSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FixedAsset",
      required: true,
      index: true,
    },

    year: {
      type: Number,
      required: true,
    },

    month: {
      type: Number,
      required: true, // 1-12
    },

    depreciationAmount: {
      type: Number,
      required: true,
    },

    journalEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalEntry",
      required: true,
    },

    isPosted: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// ❌ ห้ามซ้ำ asset + year + month
DepreciationLedgerSchema.index(
  { assetId: 1, year: 1, month: 1 },
  { unique: true }
);

export default mongoose.model(
  "DepreciationLedger",
  DepreciationLedgerSchema
);
