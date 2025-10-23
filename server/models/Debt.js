import mongoose from "mongoose"

const installmentSchema = new mongoose.Schema({

  dueDate: {
    type: Date,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    required: true,
    enum: ["THB", "USD", "LAK", "EUR", "CNY"],
  },
  isPaid: {
    type: Boolean,
    default: false,
  },
  paidDate: {
    type: Date,
  },
})

const debtSchema = new mongoose.Schema(
  {
    userId:{
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
    debtType: {
      type: String,
      required: true,
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
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
    reason: {
      type: String,
      required: true,
    },
    installments: [installmentSchema],
    status: {
      type: String,
      enum: ["ຄ້າງຊຳລະ", "ຊຳລະບາງສ່ວນ", "ຊຳລະຄົບ"],
      default: "ຄ້າງຊຳລະ",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
)

export default mongoose.model("Debt", debtSchema)
