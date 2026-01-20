// models/AccountingPeriod.js
import mongoose from "mongoose";

const accountingPeriodSchema = new mongoose.Schema(
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
    // ระบุงวด
    year: {
      type: Number,
      required: true,
      index: true,
    },

    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
      index: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    // สถานะงวด
    isClosed: {
      type: Boolean,
      default: false,
      index: true,
    },

    // ข้อมูลการปิดงวด
    closedAt: {
      type: Date,
    },

    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // สรุปงวด (เก็บไว้เพื่อ performance / audit)
    incomeTotal: {
      type: Number,
      default: 0,
    },

    expenseTotal: {
      type: Number,
      default: 0,
    },

    netProfit: {
      type: Number,
      default: 0,
    },

    // หมายเหตุ (optional)
    note: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * 1 ปี + 1 เดือน ต้องมีแค่งวดเดียว
 */
accountingPeriodSchema.index({ year: 1, month: 1 }, { unique: true });

export default mongoose.model("AccountingPeriod", accountingPeriodSchema);
