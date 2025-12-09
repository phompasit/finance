import mongoose from "mongoose";

// Transaction ย่อย (แต่ละรายการจ่าย / คืน / ขอเพิ่ม)
const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "spend",
        "return_to_company",
        "refund_to_employee",
        "additional_request",
      ],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      enum: ["LAK", "THB", "USD", "CNY", "EUR", "JPY"],
      default: "LAK",
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      trim: true,
    },
  },
  { _id: true }
);

// Amount Schema สำหรับจำนวนเงินแต่ละสกุล
const amountSchema = new mongoose.Schema(
  {
    currency: {
      type: String,
      enum: ["LAK", "THB", "USD", "CNY", "EUR", "JPY"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
  },
  { _id: false }
);

// Summary Schema สำหรับสรุปยอดแต่ละประเภท
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

// Meta data สำหรับข้อมูลเพิ่มเติม
const metaSchema = new mongoose.Schema(
  {
    company: String,
    date_from: Date,
    date_to: Date,
    requester: String,
    note: String,
  },
  { _id: false }
);

// Advance Request หลัก
const advanceRequestsSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      default: "employee",
    },
    serial: {
      type: String,
      required: true,
      unique: true,
    },
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
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    employee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employees",
    },
    request_date: {
      type: Date,
      default: Date.now,
      required: true,
    },
    purpose: {
      type: String,
      required: true,
      trim: true,
    },
    // จำนวนเงินที่ขอเบิก (รองรับหลายสกุล)
    amount_requested: {
      type: [amountSchema],
      required: true,
      validate: {
        validator: function (arr) {
          return arr && arr.length > 0;
        },
        message: "At least one amount is required",
      },
    },
    status: {
      type: String,
      enum: ["pending", "open", "closed"],
      default: "open",
    },
    paymentMethods: {
      type: String,
      enum: ["bank", "cash"],
      default: "cash",
    },
    // ธุรกรรมย่อยหลายรายการ
    transactions: {
      type: [transactionSchema],
      default: [],
    },
    // สรุปยอดรวมตามสกุลเงิน (ใช้ Map เพื่อ dynamic keys)
    summary: {
      type: Map,
      of: summaryByCurrencySchema,
      default: {},
    },
    // Meta data เพิ่มเติม
    // meta: {
    //   type: metaSchema,
    //   default: {},
    // },
    closed_at: {
      type: Date,
      default: null,
    },
    status_payment: {
      type: String,
    },
    status_Ap: {
      type: String,
      enum: ["approve", "cancel", "pending", "success_approve"],
      default: "pending",
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual สำหรับดึง employee data
advanceRequestsSchema.virtual("employee", {
  ref: "Employees",
  localField: "employee_id",
  foreignField: "_id",
  justOne: true,
});

// Index สำหรับเพิ่มความเร็วในการค้นหา
advanceRequestsSchema.index({ employee_id: 1, status: 1 });
advanceRequestsSchema.index({ request_date: -1 });
advanceRequestsSchema.index({ status: 1 });
advanceRequestsSchema.index({ createdAt: -1 });

// Method: คำนวณยอดคงเหลือสำหรับสกุลเงินที่กำหนด
advanceRequestsSchema.methods.getBalanceByCurrency = function (currency) {
  const requested =
    this.amount_requested.find((a) => a.currency === currency)?.amount || 0;

  const summary = this.summary.get(currency);
  if (!summary) {
    return requested;
  }

  return (
    requested +
    summary.total_additional_request -
    summary.total_spent -
    summary.total_return_to_company +
    summary.total_refund_to_employee
  );
};

// Method: ดึงยอดรวมทั้งหมด
advanceRequestsSchema.methods.getTotalRequested = function () {
  return this.amount_requested.reduce((total, item) => {
    // แปลงทุกอย่างเป็น LAK สำหรับการคำนวณ (ถ้าต้องการ)
    return total + item.amount;
  }, 0);
};

// Method: ตรวจสอบว่าสามารถปิดได้หรือไม่
advanceRequestsSchema.methods.canBeClosed = function () {
  // ตรวจสอบว่ามี transaction อย่างน้อย 1 รายการ
  return this.transactions.length > 0;
};

// Static method: ค้นหารายการที่ยังไม่ปิด
advanceRequestsSchema.statics.findOpen = function () {
  return this.find({ status: { $in: ["pending", "open"] } })
    .populate("employee_id", "full_name department position")
    .sort({ request_date: -1 });
};

// Static method: ค้นหาตาม employee
advanceRequestsSchema.statics.findByEmployee = function (employeeId) {
  return this.find({ employee_id: employeeId }).sort({ request_date: -1 });
};

// Pre-save hook: อัปเดต summary อัตโนมัติเมื่อมีการเปลี่ยนแปลง transactions
advanceRequestsSchema.pre("save", function (next) {
  if (this.isModified("transactions")) {
    const summaryMap = new Map();

    this.transactions.forEach((transaction) => {
      const currency = transaction.currency;

      if (!summaryMap.has(currency)) {
        summaryMap.set(currency, {
          total_spent: 0,
          total_return_to_company: 0,
          total_refund_to_employee: 0,
          total_additional_request: 0,
        });
      }

      const currencySummary = summaryMap.get(currency);

      switch (transaction.type) {
        case "spend":
          currencySummary.total_spent += transaction.amount;
          break;
        case "return_to_company":
          currencySummary.total_return_to_company += transaction.amount;
          break;
        case "refund_to_employee":
          currencySummary.total_refund_to_employee += transaction.amount;
          break;
        case "additional_request":
          currencySummary.total_additional_request += transaction.amount;
          break;
      }
    });

    this.summary = summaryMap;
  }

  next();
});

// Post-find hook: แปลง Map เป็น Object สำหรับ JSON response
advanceRequestsSchema.post("find", function (docs) {
  docs.forEach((doc) => {
    if (doc.summary instanceof Map) {
      doc.summary = Object.fromEntries(doc.summary);
    }
  });
});

advanceRequestsSchema.post("findOne", function (doc) {
  if (doc && doc.summary instanceof Map) {
    doc.summary = Object.fromEntries(doc.summary);
  }
});

const AdvanceRequests = mongoose.model(
  "AdvanceRequests",
  advanceRequestsSchema
);

export default AdvanceRequests;
