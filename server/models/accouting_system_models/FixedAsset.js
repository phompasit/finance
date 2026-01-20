// models/FixedAsset.js
import mongoose from "mongoose";

const FixedAssetSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    assetCode: {
      type: String,
      required: true, // FA-0001
      index: true,
    },
    name: {
      type: String,
      required: true,
    },

    assetCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AssetCategory",
    },

    purchaseDate: {
      type: Date,
      required: true,
    },

    startUseDate: {
      type: Date,
      required: true,
    },
    original: {
      type: Number,
      required: true,
    },
    exchangeRate: {
      type: Number,
      required: true,
      default: 1,
    },
    currency: {
      type: String,
      enum: ["LAK", "THB", "USD", "CNY"],
      default: "LAK",
    },

    cost: {
      type: Number,
      required: true,
    },

    salvageValue: {
      type: Number,
      default: 0,
    },

    usefulLife: {
      type: Number,
      required: true, // 3, 5, 10
    },

    depreciationMethod: {
      type: String,
      enum: ["straight_line"],
      default: "straight_line",
    },

    // 📘 Accounts (copy from category at create)
    assetAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account_document",
      required: true,
    },
    paidAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account_document",
      required: true,
    },
    depreciationExpenseAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account_document",
      required: true,
    },

    accumulatedDepreciationAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account_document",
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "sold", "disposed"],
      default: "active",
    },

    soldDate: {
      type: Date,
      default: null,
    },

    note: String,
  },
  { timestamps: true }
);

export default mongoose.model("FixedAsset", FixedAssetSchema);
