import mongoose from "mongoose";

const lineSchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account_document",
    required: true,
  },
  dr: {
    type: Number,
    required: true,
  },
  cr: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: "LAK",
  },
  exchangRate: {
    type: Number,
    default: 1,
  },
});
const JournalEntrySchema = new mongoose.Schema(
  {
    serial: {
      type: String,
      require: true,
      unique: true,
    },
    description: { type: String, require: true },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    totalJounal: {
      type: Number,
      required: true,
    },
    createBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    lines: {
      type: [lineSchema],
      validate: [arrayLimit, "ຕ້ອງມີຢ່າງໜ້ອຍ 1 ແຖວ"],
    },
  },
  { timestamps: true } // ✅ มี createdAt และ updatedAt
);

function arrayLimit(val) {
  return val.length > 0;
}
const JournalEntry = mongoose.model("JournalEntry", JournalEntrySchema);

export default JournalEntry;
