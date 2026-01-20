import mongoose from "mongoose";

const JournalLineSchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account_document",
    required: true,
  },

  amountOriginal: { type: Number },

  currency: {
    type: String,
    enum: ["LAK", "USD", "THB", "CNY"],
    required: true,
  },
  debitOriginal: {
    type: Number,
    required: true,
  },
  creditOriginal: {
    type: Number,
    required: true,
  },
  exchangeRate: { type: Number, required: true },

  amountLAK: { type: Number, required: true },

  side: { type: String, enum: ["dr", "cr"], required: true },

  debitLAK: { type: Number, default: 0 },
  creditLAK: { type: Number, default: 0 },
});

// ------------------------------------------------------------

const JournalEntrySchema = new mongoose.Schema(
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

    date: { type: Date, required: true },

    description: { type: String, default: "" },

    reference: { type: String, default: "" },

    status: {
      type: String,
      enum: ["draft", "posted"],
      default: "draft",
    },
    status_close: {
      type: String,
      enum: ["locked", "unlocked"],
      default: "unlocked",
    },
    periodId: {
      type: String,
    },
    type: {
      type: String,
      enum: ["normal", "closing","depreciation","fiexdAsset"],
      default: "normal",
    },
    source: {
      type: String,
      enum: ["depreciation", "asset_sale", "manual"],
    },
    source: {
      type: String,
      required: true,
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    totalDebitLAK: { type: Number, required: true },
    totalCreditLAK: { type: Number, required: true },

    lines: [JournalLineSchema],
  },
  { timestamps: true }
);

export default mongoose.model("JournalEntry", JournalEntrySchema);
