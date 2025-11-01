import mongoose from "mongoose";

const incomeExpenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    serial: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
    },
    status_Ap: {
      type: String,
      enum: ["approve", "cancel", "pending", "success_approve"],
      default: "pending",
    },
    amounts: [
      {
        currency: {
          type: String,
          required: true,
          enum: ["THB", "USD", "LAK", "EUR", "CNY"],
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    note: {
      type: String,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    advance: {
      type: String,
      enum: ["advance"],
      default: "advance",
    },
    referance: {
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("IncomeExpense", incomeExpenseSchema);
