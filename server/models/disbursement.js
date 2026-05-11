import mongoose from "mongoose";

const DisbursementSchema = new mongoose.Schema(
  {
    serial: { type: String, required: true, unique: true },
    opoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OPO",
      required: true,
    },
    disbursedAt: { type: Date, default: Date.now },
    note: { type: String, default: "" },
    totalAmount: { type: Number, default: 0 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
  },
  { timestamps: true }
);

const Disbursement = mongoose.model("Disbursement", DisbursementSchema);
export default Disbursement;