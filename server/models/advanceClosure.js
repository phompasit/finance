import mongoose from "mongoose";

// Summary Schema สำหรับเก็บยอดสรุปแต่ละสกุล
const summaryByCurrencySchema = new mongoose.Schema(
  {
    total_spent: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_return_to_company: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_refund_to_employee: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_additional_request: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

// เอกสารปิดยอด (Advance Closure)
const advanceClosureSchema = new mongoose.Schema(
  {
    advance_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdvanceRequests",
      required: true,
      unique: true, // หนึ่ง advance มีได้แค่หนึ่ง closure
    },
    employee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employees",
      required: true,
    },
    // สรุปยอดรวมตามสกุลเงิน (เก็บเป็น Map เหมือน AdvanceRequests)
    summary: {
      type: Map,
      of: summaryByCurrencySchema,
      required: true,
    },
    // หมายเหตุเพิ่มเติมเมื่อปิดยอด
    remarks: {
      type: String,
      trim: true,
    },
    // ผู้ทำการปิดยอด
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
    },
    // วันที่ปิดยอด
    closed_date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual สำหรับดึงข้อมูล advance
advanceClosureSchema.virtual("advance", {
  ref: "AdvanceRequests",
  localField: "advance_id",
  foreignField: "_id",
  justOne: true,
});

// Virtual สำหรับดึงข้อมูล employee
advanceClosureSchema.virtual("employee", {
  ref: "Employees",
  localField: "employee_id",
  foreignField: "_id",
  justOne: true,
});

// Index
// advanceClosureSchema.index({ advance_id: 1 });
advanceClosureSchema.index({ employee_id: 1 });
advanceClosureSchema.index({ closed_date: -1 });
advanceClosureSchema.index({ createdAt: -1 });

// Method: คำนวณยอดสุทธิสำหรับแต่ละสกุล
advanceClosureSchema.methods.getNetAmountByCurrency = function (currency) {
  const summary = this.summary.get(currency);
  if (!summary) return 0;

  return (
    summary.total_spent +
    summary.total_additional_request -
    summary.total_return_to_company -
    summary.total_refund_to_employee
  );
};

// Method: ดึงยอดสุทธิทั้งหมด (แปลงเป็น array)
advanceClosureSchema.methods.getAllNetAmounts = function () {
  const results = [];
  
  if (this.summary instanceof Map) {
    for (const [currency, amounts] of this.summary.entries()) {
      results.push({
        currency,
        net_amount:
          amounts.total_spent +
          amounts.total_additional_request -
          amounts.total_return_to_company -
          amounts.total_refund_to_employee,
        ...amounts,
      });
    }
  } else {
    // ถ้าเป็น Object แทน Map
    for (const [currency, amounts] of Object.entries(this.summary)) {
      results.push({
        currency,
        net_amount:
          amounts.total_spent +
          amounts.total_additional_request -
          amounts.total_return_to_company -
          amounts.total_refund_to_employee,
        ...amounts,
      });
    }
  }

  return results;
};

// Static method: หา closure ตาม employee
advanceClosureSchema.statics.findByEmployee = function (employeeId) {
  return this.find({ employee_id: employeeId })
    .populate("advance_id", "purpose request_date")
    .sort({ closed_date: -1 });
};

// Static method: หา closure ในช่วงเวลา
advanceClosureSchema.statics.findByDateRange = function (startDate, endDate) {
  return this.find({
    closed_date: {
      $gte: startDate,
      $lte: endDate,
    },
  })
    .populate("employee_id", "full_name department")
    .populate("advance_id", "purpose request_date")
    .sort({ closed_date: -1 });
};

// Post-find hook: แปลง Map เป็น Object
advanceClosureSchema.post("find", function (docs) {
  docs.forEach((doc) => {
    if (doc.summary instanceof Map) {
      doc.summary = Object.fromEntries(doc.summary);
    }
  });
});

advanceClosureSchema.post("findOne", function (doc) {
  if (doc && doc.summary instanceof Map) {
    doc.summary = Object.fromEntries(doc.summary);
  }
});

const AdvanceClosure = mongoose.model("AdvanceClosure", advanceClosureSchema);

export default AdvanceClosure;