import express from "express";
import IncomeExpense from "../models/IncomeExpense.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { body, query, validationResult } from "express-validator";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import AdvanceRequests from "../models/advanceRequests.js";
import Debt from "../models/Debt.js";
import Company from "../models/company.js";
const router = express.Router();
// ✅ Rate Limiting - ป้องกัน DDoS และ Brute Force
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 100, // จำกัด 100 requests ต่อ IP
  message: "ມີການເອີນໃຊ້ຫລາຍເກີນໄປ ກະລຸນາລອງພາຍຫລັງ",
  standardHeaders: true,
  legacyHeaders: false,
});
const validateQueryParams = [
  query("type")
    .optional()
    .isIn(["income", "expense"])
    .withMessage("type ต้องเป็น income หรือ expense เท่านั้น"),
  query("category")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("category ต้องไม่เกิน 100 ตัวอักษร"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("startDate ต้องเป็นรูปแบบวันที่ที่ถูกต้อง"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("endDate ต้องเป็นรูปแบบวันที่ที่ถูกต้อง"),
  query("search")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("search ต้องไม่เกิน 200 ตัวอักษร")
    .matches(/^[a-zA-Z0-9ก-๙\s\-_]+$/)
    .withMessage("search มีตัวอักษรที่ไม่อนุญาต"),
];
// ✅ Sanitize Input - ป้องกัน NoSQL Injection
const sanitizeInput = (req, res, next) => {
  mongoSanitize.sanitize(req.query); // ✅ sanitize โดยไม่ override
  next();
};
// Get all income/expense records
router.get(
  "/",
  authenticate,
  sanitizeInput,
  validateQueryParams,
  limiter,
  async (req, res) => {
    try {
      // Validate express-validator
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ",
          errors: errors.array(),
        });
      }

      let {
        page = 1,
        pageSize = 50,
        search,
        startDate,
        endDate,
        type,
        currency,
        status,
        status_Ap,
      } = req.query;
      console.log("search", search);
      page = parseInt(page);
      pageSize = parseInt(pageSize);

      if (page < 1) page = 1;
      if (pageSize < 1) pageSize = 50;

      // 1️⃣ Base query with company
      const query = { companyId: req.user.companyId };

      // 2️⃣ Type filter
      if (type) query.type = type;

      // 3️⃣ Category filter
      if (req.query.category) query.categoryId = req.query.category;

      // 4️⃣ Currency filter
      if (currency) query["amounts.currency"] = currency;

      // 5️⃣ Status filter
      if (status) query.status = status;
      if (status_Ap) query.status_Ap = status_Ap;

      // 3️⃣ Category filter

      // 4️⃣ Date filter
      if (startDate || endDate) {
        query.date = {};

        if (startDate) {
          const s = new Date(startDate);
          if (isNaN(s))
            return res.status(400).json({ message: "startDate ບໍ່ຖືກຕ້ອງ" });
          query.date.$gte = s;
        }

        if (endDate) {
          const e = new Date(endDate);
          if (isNaN(e))
            return res.status(400).json({ message: "endDate ບໍ່ຖືກຕ້ອງ" });
          query.date.$lte = e;
        }

        if (
          query.date.$gte &&
          query.date.$lte &&
          query.date.$gte > query.date.$lte
        ) {
          return res
            .status(400)
            .json({ message: "startDate ຕ້ອງໜ້ອຍກ່ວາ endDate" });
        }
      }

      // 5️⃣ Safe Search
      if (search) {
        if (search.length > 100) {
          return res.status(400).json({ message: "search ຍາວເກີນໄປ" });
        }

        const esc = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        query.$or = [
          { serial: new RegExp(esc, "i") },
          { description: new RegExp(esc, "i") },
        ];
      }

      // 6️⃣ Pagination ต้องมาจาก page/pageSize
      const skip = (page - 1) * pageSize;

      // 7️⃣ Load company account map
      const company = await Company.findById(req.user.companyId).lean();
      const accountMap = new Map();

      company.bankAccounts?.forEach((acc) => {
        accountMap.set(String(acc._id), { ...acc, type: "bank" });
      });
      company.cashAccounts?.forEach((acc) => {
        accountMap.set(String(acc._id), { ...acc, type: "cash" });
      });

      // 8️⃣ Count total records (before pagination)
      const total = await IncomeExpense.countDocuments(query);

      // 9️⃣ Fetch paginated records
      const records = await IncomeExpense.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(pageSize)
        .select("-__v")
        .populate("createdBy", "username role")
        .populate("categoryId", "name type")
        .lean();

      // Map account details
      records.forEach((r) => {
        r.amounts = r.amounts.map((a) => ({
          ...a,
          account: accountMap.get(String(a.accountId)) || null,
        }));
      });

      // 10️⃣ Security headers
      res.set({
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
      });

      return res.status(200).json({
        success: true,
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        records,
      });
    } catch (error) {
      console.error("Error in GET /income-expense:", error);

      return res.status(500).json({
        success: false,
        message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
      });
    }
  }
);

// Bulk creation endpoint
router.post("/bulk", authenticate, async (req, res) => {
  try {
    const { transactions } = req.body;

    // 1️⃣ Validate request body
    if (!transactions || typeof transactions !== "object") {
      return res.status(400).json({
        success: false,
        message: "Invalid input format",
      });
    }

    // 2️⃣ Escape dangerous characters (prevent XSS stored attack)
    const sanitize = (str) =>
      typeof str === "string" ? str.replace(/[<>]/g, "") : str;

    transactions.serial = sanitize(transactions.serial);
    transactions.description = sanitize(transactions.description);
    transactions.note = sanitize(transactions.note);

    // 3️⃣ Efficient duplicate serial checking
    const serial = transactions.serial;

    const existsInExpense = await IncomeExpense.exists({ serial });
    const existsInAdvance = await AdvanceRequests.exists({ serial });

    if (existsInExpense || existsInAdvance) {
      return res.status(400).json({
        success: false,
        message: "❌ ເລກທີ່ນີ້ມີແລ້ວ ກະລຸນາລະບຸເລກທີ່ໃໝ່",
      });
    }

    // 4️⃣ Validate category
    if (!transactions.categoryId) {
      return res.status(400).json({
        success: false,
        message: "ກະລຸນາເລືອກໝວດໝູ່",
      });
    }

    // 5️⃣ Validate amounts
    if (
      !Array.isArray(transactions.amounts) ||
      transactions.amounts.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "ກະລຸນາລະບຸຈຳນວນເງິນ",
      });
    }

    // Validate currency count — FIXED
    const currencies = transactions.amounts.map((a) => a.currency);
    const duplicatedCurrency = currencies.filter(
      (c, i) => currencies.indexOf(c) !== i
    );

    if (duplicatedCurrency.length > 0) {
      return res.status(400).json({
        success: false,
        message: `ບໍ່ສາມາດໃຫ້ມີສະກຸນເງິນຄືກັນສອງສະກຸນໄດ້: ${duplicatedCurrency[0]}`,
      });
    }
    // โหลด company ครั้งเดียว
    const company = await Company.findById(req.user.companyId).lean();

    // แยก list เงินสด และ list ธนาคาร
    const cashAccounts = company.cashAccounts || []; // เช่น petty cash, cash on hand
    const bankAccounts = company.bankAccounts || [];
    // check amount numeric
    for (const item of transactions.amounts) {
      // ถ้าเป็นเงินสด → ตรวจใน CashAccounts
      let isValid = false;
      let isValidCurrency = false;
      if (transactions.paymentMethod === "cash") {
        isValid = cashAccounts.some(
          (acc) => acc._id.toString() === item.accountId
        );
        isValidCurrency = cashAccounts.some(
          (acc) => acc.currency === item.currency
        );
      }
      // ถ้าเป็นธนาคาร → ตรวจใน BankAccounts
      if (transactions.paymentMethod === "bank_transfer") {
        isValid = bankAccounts.some(
          (acc) => acc._id.toString() === item.accountId
        );
        isValidCurrency = bankAccounts.some(
          (acc) => acc.currency === item.currency
        );
      }
      if (!isValidCurrency) {
        return res.status(400).json({
          message: `ສະກຸນເງິນແລະເລກບັນຊີບໍ່ກົງກັນ ກະລຸນາກວດສອບຄືນ`,
        });
      }
      if (!isValid) {
        return res.status(400).json({
          message: `ກະລຸນາເລືອກວິທີຊຳລະເງິນໃຫ້ຖືກຕ້ອງກັບບັນຊີທ່ານ`,
        });
      }
      if (isNaN(Number(item.amount))) {
        return res.status(400).json({
          message: `ຈຳນວນເງິນຂອງ ${item.currency} ບໍ່ຖືກຕ້ອງ`,
        });
      }
    }
    // 6️⃣ Save (not insertMany because only 1 record)
    const record = await IncomeExpense.create({
      userId: req.user._id,
      companyId: req.user.companyId,
      serial: transactions.serial,
      description: transactions.description,
      type: transactions.type,
      paymentMethod: transactions.paymentMethod,
      date: transactions.date,
      amounts: transactions.amounts,
      note: transactions.note,
      createdBy: req.user._id,
      status: transactions.status,
      status_Ap: transactions.status_Ap,
      categoryId: transactions.categoryId,
    });

    return res.status(201).json({
      success: true,
      message: "ບັນທຶກສຳເລັດ",
      data: record,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// Update income/expense record
router.put("/:id", authenticate, async (req, res) => {
  try {
    const id = req.params.id;
    // 1️⃣ ดึงข้อมูลเดิม
    const existing = await IncomeExpense.findOne({
      _id: id,
      companyId: req.user.companyId,
    }).lean();

    if (!existing) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }

    // 2️⃣ ป้องกันแก้ไขหนี้ (ดูจาก existing ไม่ใช่ req.body)
    if (existing.referance || existing.installmentId) {
      return res.status(400).json({
        message: "ບໍ່ສາມາດແກ້ໄຂໄດ້ເພາະເປັນບັນຊີໜີ້",
      });
    }

    // 3️⃣ ถ้าไม่ใช่ admin → ห้ามแก้ข้อมูลที่ approve แล้ว
    if (req.user.role !== "admin" && existing.status_Ap === "approve") {
      return res.status(403).json({
        message: "ໄດ້ຮັບການອະນຸມັດແລ້ວບໍ່ສາມາດປ່ຽນແປງໄດ້",
      });
    }

    // 4️⃣ ตรวจ serial ซ้ำ (เฉพาะ record อื่น)
    if (req.body.serial) {
      const duplicated = await IncomeExpense.exists({
        serial: req.body.serial,
        _id: { $ne: id },
      });

      const duplicatedAdv = await AdvanceRequests.exists({
        serial: req.body.serial,
      });

      if (duplicated || duplicatedAdv) {
        return res.status(400).json({
          success: false,
          message: "❌ ເລກທີນີ້ມີຢູ່ໃນລະບົບແລ້ວ",
        });
      }
    }

    // 5️⃣ Validate categoryId
    if (!req.body.categoryId) {
      return res.status(400).json({
        message: `ກະລຸນາເພີ່ມໝວດໝູ່`,
      });
    }

    // 6️⃣ Validate amounts (currency ห้ามซ้ำ)
    if (req.body.amounts) {
      const currencies = req.body.amounts.map((a) => a.currency);
      const dup = currencies.find(
        (c, index) => currencies.indexOf(c) !== index
      );

      if (dup) {
        return res.status(400).json({
          message: `ສະກຸນເງິນ ${dup} ສາມາດມີພຽງໄດ້ 1 ລາຍການເທົ່ານັ້ນ`,
        });
      }
      // โหลด company ครั้งเดียว
      const company = await Company.findById(req.user.companyId).lean();

      // แยก list เงินสด และ list ธนาคาร
      const cashAccounts = company.cashAccounts || []; // เช่น petty cash, cash on hand
      const bankAccounts = company.bankAccounts || [];
      // check amount numeric
      for (const item of req.body.amounts) {
        // ถ้าเป็นเงินสด → ตรวจใน CashAccounts
        let isValid = false;
        let isValidCurrency = false;
        if (req.body.paymentMethod === "cash") {
          isValid = cashAccounts.some(
            (acc) => acc._id.toString() === item.accountId
          );
          isValidCurrency = cashAccounts.some(
            (acc) => acc.currency === item.currency
          );
        }
        // ถ้าเป็นธนาคาร → ตรวจใน BankAccounts
        if (req.body.paymentMethod === "bank_transfer") {
          isValid = bankAccounts.some(
            (acc) => acc._id.toString() === item.accountId
          );
          isValidCurrency = bankAccounts.some(
            (acc) => acc.currency === item.currency
          );
        }
        if (!isValidCurrency) {
          return res.status(400).json({
            message: `ສະກຸນເງິນແລະເລກບັນຊີບໍ່ກົງກັນ ກະລຸນາກວດສອບຄືນ`,
          });
        }
        if (!isValid) {
          return res.status(400).json({
            message: `ກະລຸນາເລືອກວິທີຊຳລະເງິນໃຫ້ຖືກຕ້ອງກັບບັນຊີທ່ານ`,
          });
        }
        if (isNaN(Number(item.amount))) {
          return res.status(400).json({
            message: `Amount ของ ${item.currency} ບໍ່ຖືກຕ້ອງ`,
          });
        }
      }
    }

    // 7️⃣ Sanitize input
    const sanitize = (str) =>
      typeof str === "string" ? str.replace(/[<>]/g, "") : str;

    if (req.body.serial) req.body.serial = sanitize(req.body.serial);
    if (req.body.description)
      req.body.description = sanitize(req.body.description);
    if (req.body.note) req.body.note = sanitize(req.body.note);

    // 8️⃣ จำกัดเฉพาะ field ที่แก้ไขได้ (Whitelist)
    const allowedFields = [
      "serial",
      "description",
      "type",
      "paymentMethod",
      "date",
      "amounts",
      "note",
      "status",
      "status_Ap",
      "categoryId",
    ];

    const updateData = {};
    for (const key of allowedFields) {
      if (key in req.body) updateData[key] = req.body[key];
    }

    // 9️⃣ Update
    const updated = await IncomeExpense.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    return res.json({
      success: true,
      message: "Update สำเร็จ",
      data: updated,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "เกิดข้อผิดพลาด",
      error: error.message,
    });
  }
});

// Delete income/expense record
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const id = req.params.id;

    // 1️⃣ โหลดเฉพาะข้อมูลของบริษัทนี้เท่านั้น (ป้องกันข้อมูลรั่ว)
    const existing = await IncomeExpense.findOne({
      _id: id,
      companyId: req.user.companyId,
    }).lean();

    if (!existing) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }

    // 2️⃣ ป้องกันลบรายการที่ approve (เฉพาะ admin ลบได้)
    if (req.user.role !== "admin" && existing.status_Ap === "approve") {
      return res.status(403).json({
        message: "ລາຍການນີ້ຖືກອະນຸມັດແລ້ວ ບໍ່ສາມາດລຶບໄດ້",
      });
    }

    // 3️⃣ user ธรรมดา 👉 อนุญาตลบเฉพาะรายการที่ตัวเองสร้าง
    if (
      req.user.role !== "admin" &&
      String(existing.createdBy) !== String(req.user._id)
    ) {
      return res.status(403).json({
        message: "ທ່ານບໍ່ມີສິດລຶບລາຍການນີ້",
      });
    }

    // 4️⃣ ลบ record
    const record = await IncomeExpense.findOneAndDelete({
      _id: id,
      companyId: req.user.companyId,
    });

    if (!record) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }

    // 5️⃣ ถ้าเป็นการลบรายการชำระหนี้ → reset isPaid
    if (record.referance && record.installmentId) {
      await Debt.findOneAndUpdate(
        {
          _id: record.referance,
          "installments._id": record.installmentId,
        },
        {
          $set: { "installments.$.isPaid": false },
        }
      );

      // ❗ Check ถ้ายังมี installment ที่ยังคง isPaid === false ทั้งหมด → debt.status = "unpaid"
      await Debt.findByIdAndUpdate(record.referance, [
        {
          $set: {
            status: {
              $cond: [
                {
                  $anyElementTrue: "$installments.isPaid",
                },
                "partial",
                "unpaid",
              ],
            },
          },
        },
      ]);
    }

    return res.json({ message: "ລຶບສຳເລັດ" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "ເກີດຂໍ້ຜິດພາດ",
      error: error.message,
    });
  }
});

// deleteAmount
router.delete("/item/:id/:index", authenticate, async (req, res) => {
  try {
    const amountIndex = Number(req.params.id); // index ของ amounts
    const docId = req.params.index; // _id ของ IncomeExpense

    // 1️⃣ Validate amount index
    if (isNaN(amountIndex) || amountIndex < 0) {
      return res.status(400).json({ message: "index ไม่ถูกต้อง" });
    }

    // 2️⃣ ค้นหาเฉพาะข้อมูลบริษัทนี้เท่านั้น (ป้องกันข้อมูลรั่ว)
    const doc = await IncomeExpense.findOne({
      _id: docId,
      companyId: req.user.companyId,
    });

    if (!doc) {
      return res.status(404).json({ message: "ບໍ່ພົບຂໍ້ມູນ" });
    }

    // 3️⃣ user ธรรมดาแก้ไขเฉพาะรายการที่ตัวเองสร้างเท่านั้น
    if (
      req.user.role !== "admin" &&
      String(doc.createdBy) !== String(req.user._id)
    ) {
      return res.status(403).json({
        message: "ທ່ານບໍ່ມີສິດແກ້ໄຂລາຍການນີ້",
      });
    }

    // 4️⃣ ถ้า approve แล้วและไม่ใช่ admin → ห้ามแก้ไข
    if (req.user.role !== "admin" && doc.status_Ap === "approve") {
      return res.status(403).json({
        message: "ລາຍການນີ້ຖືກອະນຸມັດແລ້ວ ບໍ່ສາມາດປ່ຽນແປງໄດ້",
      });
    }
    // 5️⃣ ตรวจสอบ amounts index ว่ามีอยู่จริง
    if (!Array.isArray(doc.amounts) || !doc.amounts[amountIndex]) {
      return res.status(400).json({
        message: "ไม่พบ amounts ตาม index ที่ระบุ",
      });
    }

    // 6️⃣ ลบ amounts item ตาม index
    doc.amounts.splice(amountIndex, 1);

    // 7️⃣ Validate currency ห้ามซ้ำ
    const currencies = doc.amounts.map((a) => a.currency);
    const dup = currencies.find((c, i) => currencies.indexOf(c) !== i);

    if (dup) {
      return res.status(400).json({
        message: `ສະກຸນເງິນ ${dup} ຊ້ຳກັນ`,
      });
    }

    // 8️⃣ บันทึกข้อมูล
    await doc.save();

    return res.json({
      message: "ລົບສຳເລັດ",
      data: doc,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "เกิดข้อผิดพลาด",
      error: error.message,
    });
  }
});
router.patch("/status/:id", authenticate, async (req, res) => {
  try {
    const id = req.params.id;

    // 1️⃣ โหลดข้อมูลก่อนแก้ (ป้องกัน bypass)
    const record = await IncomeExpense.findOne({
      _id: id,
      companyId: req.user.companyId,
    }).lean();

    if (!record) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }

    // 2️⃣ ป้องกัน user ธรรมดาแก้ status approve
    if (req.user.role !== "admin") {
      if ("status_Ap" in req.body) {
        return res.status(403).json({
          message: "ທ່ານບໍ່ມີສິດປ່ຽນສະຖານະອະນຸມັດ",
        });
      }
    }

    // 3️⃣ ถ้า approve แล้ว user ห้ามเปลี่ยนกลับ
    if (req.user.role !== "admin" && record.status_Ap === "approve") {
      return res.status(403).json({
        message: "ລາຍການນີ້ຖືກອະນຸມັດແລ້ວ ບໍ່ສາມາດປ່ຽນໄດ້",
      });
    }

    // 4️⃣ Validate allowed values
    const allowedStatus = ["active", "void", "pending", "cancel"];
    const allowedApproval = ["pending", "approve", "rejected", "cancel"];

    if (req.body.status && !allowedStatus.includes(req.body.status)) {
      return res.status(400).json({
        message: "สถานะไม่ถูกต้อง",
      });
    }

    if (req.body.status_Ap && !allowedApproval.includes(req.body.status_Ap)) {
      return res.status(400).json({
        message: "สถานะอนุมัติไม่ถูกต้อง",
      });
    }

    // 5️⃣ Whitelist fields ที่ให้แก้ไขได้เท่านั้น
    const allowedUpdate = {};
    if ("status" in req.body) allowedUpdate.status = req.body.status;
    if ("status_Ap" in req.body && req.user.role === "admin") {
      allowedUpdate.status_Ap = req.body.status_Ap;
    }

    // ถ้าไม่มี field ที่แก้ได้เลย
    if (Object.keys(allowedUpdate).length === 0) {
      return res.status(400).json({
        message: "ไม่พบข้อมูลที่สามารถแก้ไขได้",
      });
    }

    // 6️⃣ update
    const updated = await IncomeExpense.findByIdAndUpdate(id, allowedUpdate, {
      new: true,
    });

    return res.json({
      message: "อัปเดตสถานะสำเร็จ",
      data: updated,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "เกิดข้อผิดพลาด",
      error: error.message,
    });
  }
});

export default router;
