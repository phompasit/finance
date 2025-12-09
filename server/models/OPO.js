import mongoose from "mongoose";

const ItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  paymentMethod: {
    type: String,
    required: true,
    enum: ["cash", "transfer", "check"],
  },
  currency: { type: String, required: true, enum: ["LAK", "THB", "USD"] },
  amount: { type: Number, required: true },
  reason: { type: String, required: true },
  notes: { type: String },
});

const OPOSchema = new mongoose.Schema(
  {
    serial: { type: String, required: true, unique: true },
    date: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      enum: ["paid", "unpaid"],
    },
    status_Ap: {
      type: String,
      required: true,
      enum: ["PENDING", "APPROVED", "PAID", "CANCELLED"],
      default: "PENDING",
    },
    requester: { type: String },
    manager: { type: String },
    createdBy: { type: String, required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    items: [ItemSchema],
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const OPO = mongoose.model("OPO", OPOSchema);
export default OPO;
