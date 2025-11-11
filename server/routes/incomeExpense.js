import express from "express";
import IncomeExpense from "../models/IncomeExpense.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { body, query, validationResult } from "express-validator";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import AdvanceRequests from "../models/advanceRequests.js";
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
  sanitizeInput, // Sanitize inputs
  validateQueryParams, // Validate query parameters
  limiter,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ",
          errors: errors.array(),
        });
      }
      const { type, category, startDate, endDate, search } = req.query;
      const query = {};
      if (req.user.role === "admin") {
        query.userId = req.user._id;
      }
      // ✅ ถ้าเป็น staff หรือ user ปกติ ให้ดูเฉพาะของตัวเอง
      else {
        query.userId = req.user.companyId;
      }
      if (type) {
        query.type = Array.isArray(type) ? type[0] : type;
      }
      if (category) {
        query.category = Array.isArray(category) ? category[0] : category;
      }
      // ✅ Date Range Validation - ป้องกัน Date Injection
      if (startDate || endDate) {
        query.date = {};
        if (startDate) {
          const start = new Date(startDate);
          if (isNaN(start.getTime())) {
            return res.status(400).json({
              message: "startDate ບໍ່ຖືກຕ້ອງ",
            });
          }
          query.date.$gte = start;
        }
        if (endDate) {
          const end = new Date(endDate);
          if (isNaN(end.getTime())) {
            return res.status(400).json({
              message: "endDate ບໍ່ຖືກຕ້ອງ",
            });
          }
          query.date.$lte = end;
        }

        // ตรวจสอบว่า startDate ต้องไม่มากกว่า endDate
        if (
          query.date.$gte &&
          query.date.$lte &&
          query.date.$gte > query.date.$lte
        ) {
          return res.status(400).json({
            message: "startDate ຕ້ອງໜ້ອຍກ່ວາຫຼືເທົ່າກັບ endDate",
          });
        }
      }
      // ✅ Safe Search - ป้องกัน ReDoS และ Injection
      if (search) {
        const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        query.$or = [
          { description: { $regex: sanitizedSearch, $options: "i" } },
          { reference: { $regex: sanitizedSearch, $options: "i" } },
        ];
      }
      // ✅ Query with Limit - ป้องกัน Resource Exhaustion
      const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
      const skip = Math.max(parseInt(req.query.skip) || 0, 0);
      const dd = await IncomeExpense.find({
        userId: "68f7a326a8648b10cdea4944",
      });
      const records = await IncomeExpense.find(query)
        .sort({ date: -1 })
        .limit(limit)
        .skip(skip)
        .select("-__v") // ไม่ส่ง version key
        .populate("createdBy", "username email role")
        .lean() // เพิ่มประสิทธิภาพ
        .exec();
      // ✅ Security Headers
      res.set({
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
      });
      res.status(200).json(records);
    } catch (error) {
      // ✅ Error Logging (ควรใช้ logger จริง เช่น Winston)
      console.error("Error in GET /income-expense:", {
        error: error.message,
        stack: error.stack,
        user: req.user?._id,
        timestamp: new Date().toISOString(),
      });

      // ✅ ไม่เปิดเผย error details ให้ client
      res.status(500).json({
        success: false,
        message: "เกิดข้อผิดพลาดในการดึงข้อมูล กรุณาลองใหม่อีกครั้ง",
      });
    }
  }
);

// Bulk creation endpoint
router.post("/bulk", authenticate, async (req, res) => {
  try {
    const { transactions } = req.body;

    const expenses = await IncomeExpense.find();
    const advances = await AdvanceRequests.find();
    const allSerials = [
      ...expenses.map((e) => e.serial),
      ...advances.map((a) => a.serial),
    ];
    const isDuplicate = allSerials.includes(transactions.serial);

    if (isDuplicate) {
      return res.status(400).json({
        success: false,
        message:
          "❌ ເລກທີນີ້ມີຢູ່ໃນລະບົບແລ້ວ (ອາດຢູ່ຝັ່ງລາຍຈ່າຍຫຼືລາຍຈ່າຍລ່ວງໜ້າ)",
      });
    }
    // Insert all records at once
    // 🔒 Input validation
    if (!transactions || typeof transactions !== "object") {
      return res.status(400).json({
        message: "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ",
      });
    }

    const query = {};
    if (req.user.role === "admin") {
      query.userId = req.user._id;
    }
    // ✅ ถ้าเป็น staff หรือ user ปกติ ให้ดูเฉพาะของตัวเอง
    else {
      query.userId = req.user.companyId;
    }
    const exists = await IncomeExpense.findOne({
      serial: transactions.serial,
    }).lean();
    if (exists) {
      return res.status(400).json({
        message: "ເລກທີມີແລ້ວກະລຸນາເລືອກໃໝ່",
      });
    }
    const savedRecords = await IncomeExpense.insertMany({
      userId: query.userId,
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
    });

    res.status(201).json({
      message: `ບັນທຶກ ${savedRecords.length} ລາຍການສຳເລັດ`,
      count: savedRecords.length,
      records: savedRecords,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "เกิดข้อผิดพลาดในการบันทึกหลายรายการ",
      error: error.message,
    });
  }
});

// Update income/expense record
router.put("/:id", authenticate, async (req, res) => {
  try {
    const exiting = await IncomeExpense.findById(req.params.id).lean();
    if (!exiting) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }
    // ดึงข้อมูลจากทั้งสอง collection
    const expenses = await IncomeExpense.find();
    const advances = await AdvanceRequests.find();

    // รวมทั้งหมด
    const allDocs = [
      ...expenses.map((e) => ({ id: e._id.toString(), serial: e.serial })),
      ...advances.map((a) => ({ id: a._id.toString(), serial: a.serial })),
    ];

    // ตรวจว่ามี serial ซ้ำ และไม่ใช่ของตัวเอง
    const isDuplicate = allDocs.some(
      (d) => d.serial === req.body.serial && d.id !== req.params.id
    );

    if (isDuplicate) {
      return res.status(400).json({
        success: false,
        message:
          "❌ ເລກທີນີ້ມີຢູ່ໃນລະບົບແລ້ວ (ອາດຢູ່ຝັ່ງລາຍຈ່າຍຫຼືລາຍຈ່າຍລ່ວງໜ້າ)",
      });
    }
    // ถ้าไม่ใช่ admin และ status เป็น approve → block
    if (req.user.role !== "admin" && exiting.status_Ap === "approve") {
      return res.status(403).json({
        message: "ໄດ້ຮັບການອະນຸມັດແລ້ວບໍ່ສາມາດປ່ຽນແປງໄດ້",
      });
    }

    // query สำหรับการ update
    const query = { _id: req.params.id };
    if (req.user.role === "admin") {
      // admin สามารถแก้ไขได้ทุกเรคคอร์ด
      // ไม่ต้องจำกัด userId
    } else {
      // staff / user → เฉพาะเรคคอร์ดของตัวเอง
      query.userId = req.user.companyId; // หรือ req.user._id ขึ้นกับโครงสร้าง
    }

    const record = await IncomeExpense.findOneAndUpdate(query, req.body, {
      new: true,
    });

    if (!record) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }

    res.json(record);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: error.message });
  }
});

// Delete income/expense record
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const exiting = await IncomeExpense.findById(req.params.id).lean();
    if (!exiting) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }
    const query = {};
    if (req.user.role === "admin") {
      query.userId = req.user._id;
    }
    // ✅ ถ้าเป็น staff หรือ user ปกติ ให้ดูเฉพาะของตัวเอง
    else {
      query.userId = req.user.companyId;
    }
    if (req.user.role !== "admin" && exiting.status_Ap === "approve") {
      return res.status(403).json({
        message: "ໄດ້ຮັບການອະນຸມັດແລ້ວບໍ່ສາມາດປ່ຽນແປງໄດ້",
      });
    }
    const record = await IncomeExpense.findOneAndDelete({
      _id: req.params.id,
      ...query,
    });
    if (!record) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }
    res.json({ message: "ลบข้อมูลสำเร็จ" });
  } catch (error) {
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: error.message });
  }
});

// deleteAmount
router.delete("/item/:id/:index", authenticate, async (req, res) => {
  try {
    const { id, index } = req.params;

    // หา document ก่อน
    const doc = await IncomeExpense.findById(id);
    if (!doc) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }

    // ตรวจสอบ index ว่ามีอยู่จริง
    if (!doc.amounts || !doc.amounts[index]) {
      return res
        .status(400)
        .json({ message: "ไม่พบรายการ amounts ตาม index ที่ระบุ" });
    }

    // ลบ item ตาม index
    doc.amounts.splice(index, 1);
    await doc.save();

    res.json({ message: "ລົບສຳເລັດ", data: doc });
  } catch (error) {
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: error.message });
  }
});
router.patch("/status/:id", authenticate, async (req, res) => {
  try {
    const id = req.params.id.replace(/^:/, "");
    const query = {};
    if (req.user.role === "admin") {
      query.userId = req.user._id;
    }
    // ✅ ถ้าเป็น staff หรือ user ปกติ ให้ดูเฉพาะของตัวเอง
    else {
      query.userId = req.user.companyId;
    }
    const record = await IncomeExpense.findOneAndUpdate(
      { _id: id, ...query },
      req.body,
      {
        new: true,
      }
    );
    if (!record) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }
    res.json(record);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: error.message });
  }
});
export default router;
