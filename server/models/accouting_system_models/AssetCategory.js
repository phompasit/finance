// models/AssetCategory.js
import mongoose from "mongoose";

const AssetCategorySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true, // เช่น Vehicle, Equipment
    },

    assetAccountId: {
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

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("AssetCategory", AssetCategorySchema);
