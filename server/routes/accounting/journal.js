import express from "express";
import rateLimit from "express-rate-limit";
import JournalEntry from "../../models/accouting_system_models/journalEntry_models.js";
import { authenticate } from "../../middleware/auth.js";
import mongoose from "mongoose";
import User from "../../models/User.js";
import { createAuditLog } from "../Auditlog.js";
import accountingPeriod from "../../models/accouting_system_models/accountingPeriod.js";
import DepreciationLedger from "../../models/accouting_system_models/DepreciationLedger.js";
import FixedAsset from "../../models/accouting_system_models/FixedAsset.js";
import Account_document from "../../models/accouting_system_models/Account_document.js";

const router = express.Router();

/* =====================================================
   SECURITY MIDDLEWARE
===================================================== */

// Rate limiting - ป้องกัน DDoS และ Brute Force
const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 100, // จำกัด 100 requests ต่อ IP
  error: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const modifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // จำกัดการแก้ไข/ลบ
  error: "Too many modification requests, please try again later.",
});

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  if (!req.body) return next();

  const sanitizeValue = (value) => {
    // ✅ Only sanitize strings
    if (typeof value === "string") {
      // Trim + collapse spaces
      const cleaned = value.trim().replace(/\s+/g, " ");

      // ✅ Limit max length to prevent payload abuse
      return cleaned.slice(0, 1000);
    }

    // ✅ Prevent Mongo operator injection
    if (typeof value === "object" && value !== null) {
      for (const key of Object.keys(value)) {
        if (key.startsWith("$")) {
          throw new Error("Invalid input: Mongo operator not allowed");
        }
      }
    }

    return value;
  };

  try {
    Object.keys(req.body).forEach((key) => {
      req.body[key] = sanitizeValue(req.body[key]);
    });

    next();
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};

// Authorization check - ตรวจสอบสิทธิ์การเข้าถึง
const checkPermission = (requiredRole) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id).select("role permissions");

      if (!user) {
        return res.status(403).json({
          success: false,
          error: "User not found",
        });
      }

      // ตรวจสอบ role
      const allowedRoles = ["admin", "master", requiredRole];
      if (!allowedRoles.includes(user.role)) {
        await createAuditLog({
          userId: req.user._id,
          action: "UNAUTHORIZED_ACCESS",
          collectionName: "JournalEntry",
          ipAddress: req.ip,
          description: `Attempted unauthorized access to ${req.method} ${req.originalUrl}`,
          userAgent: req.get("user-agent"),
        });

        return res.status(403).json({
          success: false,
          error: "Insufficient permissions",
        });
      }

      next();
    } catch (err) {
      console.error("Permission check error:", err);
      res
        .status(500)
        .json({ success: false, error: "Permission check failed" });
    }
  };
};

router.use(sanitizeInput); // ทำความสะอาด input

/* =====================================================
   HELPER FUNCTIONS
===================================================== */

const validateSession = async (req, res, next) => {
  try {
    const currentIp = req.ip;
    const currentUA = req.get("user-agent");

    // ✅ Only log for sensitive actions
    const sensitiveMethods = ["POST", "PATCH", "DELETE"];
    if (!sensitiveMethods.includes(req.method)) {
      return next();
    }

    const user = await User.findById(req.user._id).select(
      "lastLoginIp lastLoginUserAgent isActive"
    );

    if (!user || !user.isActive) {
      return res.status(403).json({
        success: false,
        error: "Session invalid",
      });
    }

    // ✅ Log only if both IP + UA changed
    if (
      user.lastLoginIp !== currentIp &&
      user.lastLoginUserAgent !== currentUA
    ) {
      await createAuditLog({
        userId: req.user._id,
        action: "SESSION_ANOMALY",
        collectionName: "JournalEntry",
        ipAddress: currentIp,
        description: `Session anomaly: IP + UserAgent changed`,
        userAgent: currentUA,
      });
    }

    next();
  } catch (err) {
    console.error("Session validation error:", err);
    next(); // don't block
  }
};

async function blockClosedJournal(req, res, next) {
  try {
    if (!req.params.id) return next();

    // ✅ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid journal ID format",
      });
    }

    // ✅ Find journal (company-safe)
    const journal = await JournalEntry.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    }).select("date status");

    if (!journal) {
      await createAuditLog({
        userId: req.user._id,
        action: "FAILED_ACCESS",
        collectionName: "JournalEntry",
        documentId: req.params.id,
        ipAddress: req.ip,
        description: "Attempted to access non-existent journal",
        userAgent: req.get("user-agent"),
      });

      return res.status(404).json({
        success: false,
        error: "Journal not found",
      });
    }

    // ✅ Block if accounting period is closed
    const year = new Date(journal.date).getFullYear();

    const period = await accountingPeriod.findOne({
      companyId: req.user.companyId,
      year,
      isClosed: true,
    });

    if (period) {
      await createAuditLog({
        userId: req.user._id,
        action: "BLOCKED_MODIFICATION",
        collectionName: "JournalEntry",
        documentId: req.params.id,
        ipAddress: req.ip,
        description: `Attempted to modify journal in closed year ${year}`,
        userAgent: req.get("user-agent"),
      });

      return res.status(403).json({
        success: false,
        error: "❌ ปีนี้ปิดบัญชีแล้ว ไม่สามารถแก้ไขหรือลบได้",
      });
    }

    next();
  } catch (err) {
    console.error("blockClosedJournal error:", err);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
}

/**
 * Enhanced validation with security checks
 */
const validateAndCalculateLines = (lines) => {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new Error("At least one journal line is required");
  }

  // ป้องกัน array ขนาดใหญ่เกินไป (DoS attack)
  if (lines.length > 1000) {
    throw new Error("Too many journal lines (maximum 1000)");
  }

  let totalDebit = 0;
  let totalCredit = 0;

  const validatedLines = lines.map((ln, index) => {
    // Validate accountId
    if (!ln.accountId || !mongoose.Types.ObjectId.isValid(ln.accountId)) {
      throw new Error(`Line ${index + 1}: Invalid account ID`);
    }

    // Validate currency
    const validCurrencies = ["LAK", "USD", "THB", "CNY"];
    if (!ln.currency || !validCurrencies.includes(ln.currency)) {
      throw new Error(
        `Line ${
          index + 1
        }: Invalid currency. Must be one of: ${validCurrencies.join(", ")}`
      );
    }

    // Validate exchange rate
    const exchangeRate = parseFloat(ln.exchangeRate);
    if (!exchangeRate || exchangeRate <= 0 || exchangeRate > 1000000) {
      throw new Error(
        `Line ${index + 1}: Exchange rate must be between 0 and 1,000,000`
      );
    }

    let debitLAK = 0;
    let creditLAK = 0;
    let side = "";

    // Check if using new format (debitLAK/creditLAK)
    if (ln.debitLAK !== undefined || ln.creditLAK !== undefined) {
      debitLAK = parseFloat(ln.debitLAK) || 0;
      creditLAK = parseFloat(ln.creditLAK) || 0;

      // ป้องกันตัวเลขที่ใหญ่เกินไป
      if (
        debitLAK > Number.MAX_SAFE_INTEGER ||
        creditLAK > Number.MAX_SAFE_INTEGER
      ) {
        throw new Error(`Line ${index + 1}: Amount exceeds maximum safe value`);
      }

      if (debitLAK > 0) side = "dr";
      else if (creditLAK > 0) side = "cr";
    }
    // Check if using old format (side + amountOriginal)
    else if (ln.side && ln.amountOriginal) {
      const amount = parseFloat(ln.amountOriginal) * exchangeRate;

      if (amount > Number.MAX_SAFE_INTEGER) {
        throw new Error(`Line ${index + 1}: Amount exceeds maximum safe value`);
      }

      if (ln.side === "dr") {
        debitLAK = amount;
        side = "dr";
      } else if (ln.side === "cr") {
        creditLAK = amount;
        side = "cr";
      }
    }

    if (debitLAK === 0 && creditLAK === 0) {
      throw new Error(
        `Line ${index + 1}: Must have either debit or credit amount`
      );
    }

    if (debitLAK > 0 && creditLAK > 0) {
      throw new Error(
        `Line ${index + 1}: Cannot have both debit and credit amounts`
      );
    }

    const amountLAK = debitLAK > 0 ? debitLAK : creditLAK;
    totalDebit += debitLAK;
    totalCredit += creditLAK;

    const roundedDebit = Math.round(debitLAK * 100) / 100;
    const roundedCredit = Math.round(creditLAK * 100) / 100;
    const roundedAmount = Math.round(amountLAK * 100) / 100;

    return {
      accountId: ln.accountId,
      currency: ln.currency,
      exchangeRate,
      side,
      debitLAK: roundedDebit,
      creditLAK: roundedCredit,
      amountLAK: roundedAmount,
      debitOriginal: ln.debitOriginal,
      creditOriginal: ln.creditOriginal,
    };
  });

  totalDebit = Math.round(totalDebit * 100) / 100;
  totalCredit = Math.round(totalCredit * 100) / 100;

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(
      `Journal entry is not balanced. Total Debit: ${totalDebit.toLocaleString()} LAK, Total Credit: ${totalCredit.toLocaleString()} LAK, Difference: ${Math.abs(
        totalDebit - totalCredit
      ).toLocaleString()} LAK`
    );
  }

  return { validatedLines, totalDebit, totalCredit };
};

const validateHeaderData = (data) => {
  const { date, description, reference } = data;
  if (!date) {
    throw new Error("Date is required");
  }

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    throw new Error("Invalid date format");
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  // if (dateObj > today) {
  //   throw new Error("Date cannot be in the future");
  // }

  // ป้องกัน backdating มากเกินไป (เช่น 5 ปีย้อนหลัง)
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  if (dateObj < fiveYearsAgo) {
    throw new Error("Date cannot be more than 5 years in the past");
  }

  if (description && description.length > 500) {
    throw new Error("Description must be 500 characters or less");
  }

  if (reference && reference.length > 100) {
    throw new Error("Reference must be 100 characters or less");
  }

  // ป้องกัน SQL/NoSQL injection patterns
  const dangerousPatterns = [
    /(\$where|\$regex|\$ne)/i,
    /(union.*select|insert.*into|drop.*table)/i,
  ];

  [description, reference].forEach((field) => {
    if (field && dangerousPatterns.some((pattern) => pattern.test(field))) {
      throw new Error("Invalid characters detected in input");
    }
  });
};

/* =====================================================
   ROUTES WITH SECURITY
===================================================== */

// GET ALL - with rate limiting
router.get(
  "/",
  authenticate,
  validateSession,
  checkPermission("viewer"),
  createLimiter,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 50,
        startDate,
        endDate,
        reference,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      // จำกัด limit สูงสุด
      const maxLimit = Math.min(parseInt(limit), 100);
      const safePage = Math.max(parseInt(page) || 1, 1);
      const skip = (safePage - 1) * maxLimit;
      if (startDate && isNaN(new Date(startDate)))
        return res.status(400).json({ error: "Invalid startDate" });
      const maxDays = 400;
      if ((endDate - startDate) / 86400000 > maxDays) return res.status(400);

      const query = { companyId: req.user.companyId };

      const periods = await accountingPeriod
        .find({ companyId: req.user.companyId }, { year: 1, _id: 0 })
        .lean();
      const closedYears = periods.map((p) => Number(p.year));

      // ✅ เลือกปีล่าสุดที่ยังไม่ปิด หรือปีปัจจุบัน
      const activeYear =
        closedYears.length > 0
          ? Math.max(...closedYears) + 1 // ปีถัดไปจากปีที่ปิดแล้ว
          : new Date().getFullYear();
      query.date = {};

      if (startDate || endDate) {
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          query.date.$lte = end;
        }
      } else {
        query.date.$gte = new Date(`${activeYear}-01-01`);
        query.date.$lte = new Date(`${activeYear}-12-31T23:59:59.999`);
      }

      if (reference) {
        // ป้องกัน ReDoS (Regular Expression Denial of Service)
        const safeReference = reference.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        query.reference = { $regex: safeReference, $options: "i" };
      }

      const [journals, total] = await Promise.all([
        JournalEntry.find(query)
          .populate("lines.accountId", "code name")
          .select("-status_close -userId -companyId")
          .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
          .skip(skip)
          .limit(maxLimit)
          .lean(),

        JournalEntry.countDocuments(query),
      ]);

      res.json({
        success: true,
        activeYear,
        journals,
        pagination: {
          total,
          page: parseInt(page),
          limit: maxLimit,
          totalPages: Math.ceil(total / maxLimit),
        },
      });
    } catch (err) {
      console.error("GET /journals error:", err);
      res.status(400).json({ error: "Invalid request" });
    }
  }
);

// GET BY ID
router.get(
  "/:id",
  authenticate,
  validateSession,
  checkPermission("viewer"),
  createLimiter,
  async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          error: "Invalid journal ID format",
        });
      }

      const journal = await JournalEntry.findOne({
        _id: req.params.id,
        companyId: req.user.companyId,
      })
        .populate("lines.accountId", "code name type")
        .select("-status_close -userId -companyId")
        .lean();

      if (!journal) {
        return res.status(404).json({
          success: false,
          error: "Journal entry not found",
        });
      }

      res.json({ success: true, journal });
    } catch (err) {
      console.error("GET /journals/:id error:", err);
      res.status(500).json({
        success: false,
        error: "Internal Server Error",
      });
    }
  }
);

// CREATE - with stricter rate limiting
router.post(
  "/",
  authenticate,
  validateSession,
  checkPermission("editor"),
  modifyLimiter,
  async (req, res) => {
    try {
      const { date, description, reference, lines } = req.body;

      if (!req.user) {
        return res.status(403).json({
          message: "ບໍ່ມີສິດເຂົ້າເຖິງ",
        });
      }
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime()))
        return res.status(400).json({ error: "Invalid date" });

      const journalYear = new Date(date).getFullYear();
      const periods = await accountingPeriod
        .find({ companyId: req.user.companyId }, { year: 1, _id: 0 })
        .lean();

      const closedYears = periods.map((p) => Number(p.year));

      if (closedYears.includes(journalYear)) {
        return res.status(400).json({
          success: false,
          message: `❌ ປີ${journalYear} ຖືກປິດໄປແລ້ວ ກະລຸນາລະບຸປີຖັດໄປ`,
        });
      }

      const checkList = await User.findOne({
        _id: req.user._id,
        companyId: req.user.companyId,
      });

      if (!checkList) {
        return res.status(403).json({
          message: "ບໍ່ມີສິດເຂົ້າເຖິງ",
        });
      }

      const existsJournalEntry = await JournalEntry.exists({
        reference,
        companyId: req.user.companyId, // เพิ่มเพื่อความปลอดภัย
      });

      if (existsJournalEntry) {
        return res.status(409).json({
          success: false,
          message: "❌ ເລກທີ່ນີ້ມີແລ້ວ ກະລຸນາລະບຸເລກທີ່ໃໝ່",
        });
      }

      validateHeaderData({ date, description, reference });
      const {
        validatedLines,
        totalDebit,
        totalCredit,
      } = validateAndCalculateLines(lines);
      const accountIds = validatedLines.map((l) => l.accountId);

      const count = await Account_document.countDocuments({
        _id: { $in: accountIds },
        companyId: req.user.companyId,
      });

      if (count !== accountIds.length)
        throw new Error("Invalid accountId (not in your company)");
      const newJournal = await JournalEntry.create({
        companyId: req.user.companyId,
        userId: req.user._id,
        date: new Date(date),
        description: description?.trim() || "",
        reference: reference?.trim() || "",
        totalDebitLAK: totalDebit,
        totalCreditLAK: totalCredit,
        lines: validatedLines,
        status: "posted",
      });

      const populatedJournal = await JournalEntry.findById(newJournal._id)
        .populate("lines.accountId", "code name")
        .populate("userId", "name")
        .lean();

      await createAuditLog({
        userId: req.user._id,
        action: "CREATE",
        collectionName: "JournalEntry",
        documentId: newJournal._id,
        ipAddress: req.ip,
        description: `สร้าง Journal วันที่ ${date} อ้างอิง ${reference}`,
        userAgent: req.get("user-agent"),
      });

      res.status(201).json({
        success: true,
        message: "Journal entry created successfully",
        journal: populatedJournal,
      });
    } catch (err) {
      console.error("POST /journals error:", err);

      await createAuditLog({
        userId: req.user._id,
        action: "CREATE_FAILED",
        collectionName: "JournalEntry",
        ipAddress: req.ip,
        description: `Failed to create journal: ${err.message}`,
        userAgent: req.get("user-agent"),
      });

      const statusCode = err.message.includes("not found") ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: "Invalid request",
      });
    }
  }
);

// UPDATE
// UPDATE
router.patch(
  "/:id",
  authenticate,
  validateSession,
  checkPermission("editor"),
  // ⚠️ ลบ blockClosedJournal ออก เพราะเราตรวจสอบใน route แล้ว
  modifyLimiter,
  async (req, res) => {
    try {
      /* ================= SECURITY: Input Validation ================= */
      const { date, description, reference, lines } = req.body;

      // SECURITY: Validate journal ID
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          error: "Invalid journal ID format",
        });
      }

      // SECURITY: Validate required fields
      if (!date || !lines || !Array.isArray(lines)) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: date, lines",
        });
      }

      // SECURITY: Validate lines array
      if (lines.length === 0) {
        return res.status(400).json({
          success: false,
          error: "At least one journal line is required",
        });
      }

      if (lines.length > 100) {
        return res.status(400).json({
          success: false,
          error: "Too many journal lines. Maximum 100 allowed.",
        });
      }

      // SECURITY: Validate date
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return res.status(400).json({ 
          success: false,
          error: "Invalid date format" 
        });
      }

      // SECURITY: Prevent future dates
      const maxFutureDate = new Date();
      maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 1);
      if (dateObj > maxFutureDate) {
        return res.status(400).json({
          success: false,
          error: "Date cannot be more than 1 year in the future",
        });
      }

      /* ================= 1. Check if period is closed ================= */
      const journalYear = dateObj.getFullYear();

      const closed = await accountingPeriod.exists({
        companyId: req.user.companyId,
        year: journalYear,
        isClosed: true,
      });

      if (closed) {
        return res.status(403).json({
          success: false,
          error: `❌ ປີ ${journalYear} ຖືກປິດໄປແລ້ວ ກະລຸນາລະບຸປີຖັດໄປ`,
        });
      }

      /* ================= 2. Load existing journal ================= */
      // SECURITY: Always filter by companyId
      const existingJournal = await JournalEntry.findOne({
        _id: req.params.id,
        companyId: req.user.companyId,
      }).lean();

      if (!existingJournal) {
        return res.status(404).json({
          success: false,
          error: "Journal entry not found or access denied",
        });
      }

      /* ================= 3. Check if locked ================= */
      if (existingJournal.status === "locked" || existingJournal.status_close === "locked") {
        return res.status(403).json({
          success: false,
          error: "Cannot modify a locked journal entry",
        });
      }

      /* ================= 4. Validate header data ================= */
      validateHeaderData({ date, description, reference });

      /* ================= 5. Validate and calculate lines ================= */
      const {
        validatedLines,
        totalDebit,
        totalCredit,
      } = validateAndCalculateLines(lines);

      // SECURITY: Check debit = credit
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return res.status(400).json({
          success: false,
          error: "Total debit must equal total credit",
        });
      }

      /* ================= 6. Verify all accounts exist and belong to company ================= */
      const accountIds = validatedLines.map((l) => l.accountId);

      // SECURITY: Verify accounts belong to company
      const validCount = await Account_document.countDocuments({
        _id: { $in: accountIds },
        companyId: req.user.companyId,
      });

      if (validCount !== accountIds.length) {
        return res.status(400).json({
          success: false,
          error: "One or more accounts not found or access denied",
        });
      }

      /* ================= 7. Check duplicate reference ================= */
      if (reference && reference.trim()) {
        const duplicate = await JournalEntry.exists({
          _id: { $ne: req.params.id },
          companyId: req.user.companyId,
          reference: reference.trim(),
        });

        if (duplicate) {
          return res.status(409).json({
            success: false,
            error: "A journal entry with this reference already exists",
          });
        }
      }

      /* ================= 8. Update journal entry ================= */
      const updatedJournal = await JournalEntry.findOneAndUpdate(
        {
          _id: req.params.id,
          companyId: req.user.companyId, // SECURITY: Double-check company
        },
        {
          date: dateObj,
          description: description?.trim() || "",
          reference: reference?.trim() || "",
          lines: validatedLines,
          totalDebitLAK: totalDebit,
          totalCreditLAK: totalCredit,
          updatedAt: new Date(),
          updatedBy: req.user._id,
        },
        { 
          new: true, 
          runValidators: true,
        }
      )
        .populate("lines.accountId", "code name")
        .populate("userId", "name")
        .lean();

      if (!updatedJournal) {
        return res.status(404).json({
          success: false,
          error: "Journal entry not found during update",
        });
      }

      /* ================= 9. Audit log ================= */
      await createAuditLog({
        userId: req.user._id,
        action: "UPDATE",
        collectionName: "JournalEntry",
        documentId: req.params.id,
        ipAddress: req.ip,
        description: `Updated Journal: ${reference?.trim() || existingJournal.reference}`,
        userAgent: req.get("user-agent"),
        metadata: {
          reference: reference?.trim(),
          totalDebit,
          totalCredit,
          linesCount: validatedLines.length,
        },
      });

      res.json({
        success: true,
        message: "Journal entry updated successfully",
        data: updatedJournal,
      });

    } catch (err) {
      console.error("PATCH /journals/:id error:", err.message);

      // Handle specific errors
      if (err.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: Object.values(err.errors).map((e) => e.message),
        });
      }

      if (err.name === "CastError") {
        return res.status(400).json({
          success: false,
          error: "Invalid data format",
        });
      }

      res.status(500).json({
        success: false,
        error: "Failed to update journal entry",
        message: process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  }
);

// DELETE
router.delete(
  "/:id",
  authenticate,
  validateSession,
  checkPermission("admin"), // เฉพาะ admin ถึงลบได้
  blockClosedJournal,
  modifyLimiter,
  async (req, res) => {
    const session = await mongoose.startSession();

    try {
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          error: "Invalid journal ID format",
        });
      }

      // Start transaction
      await session.startTransaction();

      // Find journal with company verification
      const journal = await JournalEntry.findOne({
        _id: req.params.id,
        companyId: req.user.companyId,
      }).session(session);

      if (!journal) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          error: "Journal entry not found",
        });
      }

      const assetExists = await FixedAsset.exists({
        _id: journal.sourceId,
        companyId: req.user.companyId,
      }).session(session);

      if (assetExists) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          error: "Journal linked to Fixed Asset cannot be deleted",
        });
      }
      // Check if journal is locked
      if (journal.status === "locked") {
        await session.abortTransaction();
        return res.status(403).json({
          success: false,
          error: "Cannot delete a locked journal entry",
        });
      }

      // Check for related depreciation ledgers
      const depreciationLedger = await DepreciationLedger.findOne({
        journalEntryId: req.params.id,
        companyId: req.user.companyId,
      }).session(session);

      // Delete depreciation ledger if exists
      if (depreciationLedger) {
        await DepreciationLedger.findOneAndDelete(
          {
            journalEntryId: req.params.id,
            companyId: req.user.companyId,
          },
          { session }
        );

        console.log(
          `Deleted related depreciation ledger: ${depreciationLedger._id}`
        );
      }

      // Delete the journal entry
      await JournalEntry.deleteOne(
        { _id: req.params.id, companyId: req.user.companyId },
        { session }
      );

      // Create audit log
      await createAuditLog({
        userId: req.user._id,
        action: "DELETE",
        collectionName: "JournalEntry",
        documentId: req.params.id,
        ipAddress: req.ip,
        description: `ลบ Journal ${journal.reference}${
          depreciationLedger ? " และ Depreciation Ledger ที่เกี่ยวข้อง" : ""
        }`,
        userAgent: req.get("user-agent"),
        metadata: {
          journalReference: journal.reference,
          deletedDepreciationLedger: depreciationLedger ? true : false,
        },
      });

      // Commit transaction
      await session.commitTransaction();

      // Log successful deletion
      console.log(
        `Journal ${req.params.id} deleted by user ${req.user._id} from company ${req.user.companyId}`
      );

      res.json({
        success: true,
        message: "Journal entry deleted successfully",
        deletedId: req.params.id,
        relatedDeletions: depreciationLedger ? ["DepreciationLedger"] : [],
      });
    } catch (err) {
      // Rollback transaction on error
      await session.abortTransaction();

      console.error("DELETE /journals/:id error:", err);

      // Handle specific errors
      if (err.name === "CastError") {
        return res.status(400).json({
          success: false,
          error: "Invalid data format",
        });
      }

      if (err.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: err.message,
        });
      }

      // Generic error response
      res.status(500).json({
        success: false,
        error: "Failed to delete journal entry",
        message:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    } finally {
      // End session
      session.endSession();
    }
  }
);
// BULK DELETE
router.post(
  "/bulk-delete",
  authenticate,
  validateSession,
  checkPermission("admin"),
  modifyLimiter,
  async (req, res) => {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Array of journal IDs is required",
        });
      }

      // จำกัดจำนวน bulk delete
      if (ids.length > 100) {
        return res.status(400).json({
          success: false,
          error: "Cannot delete more than 100 journals at once",
        });
      }

      const invalidIds = ids.filter(
        (id) => !mongoose.Types.ObjectId.isValid(id)
      );
      if (invalidIds.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid journal IDs: ${invalidIds.join(", ")}`,
        });
      }

      const result = await JournalEntry.deleteMany({
        _id: { $in: ids },
        companyId: req.user.companyId,
        status: { $ne: "locked" },
      });

      await createAuditLog({
        userId: req.user._id,
        action: "BULK_DELETE",
        collectionName: "JournalEntry",
        ipAddress: req.ip,
        description: `ลบ Journal ${result.deletedCount} รายการ`,
        userAgent: req.get("user-agent"),
      });

      res.json({
        success: true,
        message: `${result.deletedCount} journal entries deleted successfully`,
        deletedCount: result.deletedCount,
      });
    } catch (err) {
      console.error("POST /journals/bulk-delete error:", err);
      res.status(400).json({ success: false, error: err.message });
    }
  }
);

// STATISTICS
router.get(
  "/stats/summary",
  authenticate,
  validateSession,
  checkPermission("viewer"),
  createLimiter,
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const query = { companyId: req.user.companyId };

      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          query.date.$lte = end;
        }
      }

      const stats = await JournalEntry.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalEntries: { $sum: 1 },
            totalDebit: { $sum: "$totalDebitLAK" },
            totalCredit: { $sum: "$totalCreditLAK" },
            avgAmount: { $avg: "$totalDebitLAK" },
          },
        },
      ]);

      res.json({
        success: true,
        stats: stats[0] || {
          totalEntries: 0,
          totalDebit: 0,
          totalCredit: 0,
          avgAmount: 0,
        },
      });
    } catch (err) {
      console.error("GET /journals/stats/summary error:", err);
      res.status(400).json({ success: false, error: err.message });
    }
  }
);

export default router;
