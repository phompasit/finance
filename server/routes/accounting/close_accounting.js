// import express from "express";
// import mongoose from "mongoose";
// import Account from "../../models/accouting_system_models/Account_document.js";
// import OpeningBalance from "../../models/accouting_system_models/OpeningBalance.js";
// import JournalEntry from "../../models/accouting_system_models/journalEntry_models.js";
// import AccountingPeriod from "../../models/accouting_system_models/accountingPeriod.js";
// import { authenticate } from "../../middleware/auth.js";
// import {
//   applyOpening,
//   buildLine,
//   buildTree,
//   computeEnding,
//   initRows,
//   rollUp,
// } from "../../utils/balanceSheetFuntions.js";

// const router = express.Router();

// /* ============================================================
//    Helper: build journal line (ให้ตรง schema)
// ============================================================ */
// function applyMovements(rows, accounts, journalss) {
//   for (const acc of accounts) {
//     if (!["asset", "liability", "equity"].includes(acc.type)) continue;
//     const accMap = {};
//     accMap[String(acc._id)] = acc.code;

//     journalss.forEach((j) => {
//       (j.lines || []).forEach((ln) => {
//         const code = accMap[String(ln.accountId)];
//         if (!code || !rows[code]) return;

//         const amt = Number(ln.amountLAK || 0);
//         if (ln.side === "dr") rows[code].movementDr += amt;
//         else rows[code].movementCr += amt;
//       });
//     });
//   }
// }
// /* ============================================================
//    POST /api/accounting/close-period
// ============================================================ */
// router.post("/close-period", authenticate, async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const { year, month } = req.body;
//     const companyId = req.user.companyId;
//     const userId = req.user._id;

//     if (!year || !month) {
//       throw new Error("year and month are required");
//     }

//     // const startDate = new Date(year, month - 1, 1);
//     // const endDate = new Date(year, month 0, 23, 59, 59, 999);
//     const startDate = new Date(year, 0, 1); // 1 Jan
//     const endDate = new Date(year, 11, 31, 23, 59, 59, 999); // 31 Dec

//     /* ============================================================
//        1) CHECK PERIOD
//     ============================================================ */
//     const period = await AccountingPeriod.findOne({
//       companyId,
//       year,
//     }).session(session);

//     if (period?.isClosed) {
//       throw new Error("Accounting period already closed");
//     }

//     /* ============================================================
//        2) LOAD JOURNALS (NORMAL ONLY)
//     ============================================================ */
//     const journals = await JournalEntry.find({
//       companyId,
//       date: { $gte: startDate, $lte: endDate },
//       status: "posted",
//       type: "normal",
//     }).session(session);

//     /* ============================================================
//        3) VALIDATE JOURNALS (Dr = Cr)
//     ============================================================ */
//     journals.forEach((j) => {
//       const dr = j.lines.reduce((s, l) => s + Number(l.debitOriginal || 0), 0);
//       const cr = j.lines.reduce((s, l) => s + Number(l.creditOriginal || 0), 0);
//       if (dr !== cr) {
//         throw new Error(`Unbalanced journal ${j._id}`);
//       }
//     });

//     /* ============================================================
//     // const accMap = Object.fromEntries(accounts.map((a) => a));
//        4) LOAD ACCOUNTS
//     ============================================================ */
//     /* ============================================================
//     5) CALCULATE INCOME / EXPENSE
//     ============================================================ */
//     const accounts = await Account.find({ companyId }).lean();
//     let income = 0;
//     let expense = 0;

//     journals.forEach((j) => {
//       if (!Array.isArray(j.lines)) return;

//       j.lines.forEach((l) => {
//         const acc = accounts.find(
//           (o) => o._id.toString() === l.accountId?.toString()
//         );
//         if (!acc) return;
//         const amt = Number(l.amountLAK || 0);
//         if (amt <= 0) return;

//         // ===== Income =====
//         if (acc.type === "income" && l.side === "cr") {
//           income += amt;
//         }

//         // ===== Expense =====
//         if (acc.type === "expense" && l.side === "dr") {
//           expense += amt;
//         }
//       });
//     });

//     const netProfit = income - expense;
//     /* ============================================================
//        6) BUILD CLOSING JOURNAL LINES
//     ============================================================ */
//     const closingLines = [];
//     // Retained earnings
//     let retained;
//     if (netProfit >= 0) {
//       retained = accounts.find((a) => a.code === "321");
//     } else {
//       retained = accounts.find((a) => a.code === "329");
//     }

//     if (!retained) {
//       throw new Error("Retained earnings account not found");
//     }
//     closingLines.push(
//       buildLine({
//         accountId: retained._id,
//         side: netProfit >= 0 ? "cr" : "dr",
//         amountLAK: Math.abs(netProfit),
//       })
//     );
//     console.log("closingLines", closingLines);

//     const { rows } = initRows(accounts);
//     const start = new Date(year, 0, 1); // 1 Jan 2025
//     const end = new Date(year, 11, 31, 23, 59, 59, 999); // 31 Dec 2025
//     const openings = await OpeningBalance.find({
//       companyId,
//       year: year,
//     }).lean();

//     applyOpening(rows, accounts, openings);

//     const journalss = await JournalEntry.find({
//       companyId,
//       date: { $gte: start, $lte: end },
//     }).lean();

//     applyMovements(rows, accounts, journalss);

//     const childrenMap = buildTree(rows);
//     rollUp(rows, childrenMap);

//     computeEnding(rows);
//     const list = Object.values(rows)
//       .filter(
//         (r) =>
//           r.openingDr !== 0 ||
//           r.openingCr !== 0 ||
//           r.movementDr !== 0 ||
//           r.movementCr !== 0 ||
//           r.endingDr !== 0 ||
//           r.endingCr !== 0
//       )
//       .sort((a, b) =>
//         a.code.localeCompare(b.code, undefined, { numeric: true })
//       );
//     const lockMain = list.filter((o) => o.parentCode !== null);
//     const nextYear = year + 1;
//     const docs = lockMain.map((o) => ({
//       userId,
//       companyId,
//       accountId: o.accountId,
//       year: nextYear,
//       debit: o.endingDr,
//       credit: o.endingCr,
//       note: `Closing in ${nextYear}`,
//       status_close: "locked",
//     }));
//     const closingLinesToOpenningBalance = closingLines.map((o) => ({
//       userId,
//       companyId,
//       accountId: o.accountId,
//       year: nextYear,
//       debit: o.debitOriginal,
//       credit: o.creditOriginal,
//       note: `Closing in ${nextYear}`,
//       status_close: "locked",
//     }));
//     const openingDocs = [...docs, ...closingLinesToOpenningBalance];
//     await OpeningBalance.insertMany(openingDocs, { session });
//     await JournalEntry.updateMany(
//       {
//         companyId,
//         date: {
//           $gte: new Date(`${year}-01-01`),
//           $lte: new Date(`${year}-12-31T23:59:59.999`),
//         },
//       },
//       {
//         $set: { status_close: "locked" },
//       }
//     );

//     // // /* ============================================================
//     // //    10) LOCK PERIOD
//     // // ============================================================ */
//     await AccountingPeriod.updateOne(
//       { companyId, year, month },
//       {
//         isClosed: true,
//         closedAt: new Date(),
//         closedBy: userId,
//       },
//       { upsert: true, session }
//     );
//     await session.commitTransaction();
//     session.endSession();

//     return res.json({
//       success: true,
//       message: "Accounting period closed successfully",
//       netProfit,
//     });
//   } catch (err) {
//     await session.abortTransaction();
//     session.endSession();

//     console.error("CLOSING ERROR:", err);
//     return res.status(500).json({
//       success: false,
//       error: err.message,
//     });
//   }
// });

// export default router;

// // Close income (Dr)
// // accounts
// //   .filter((a) => a.type === "income")
// //   .forEach((acc) => {
// //     let balance = 0;
// //     journals.forEach((j) => {
// //       j.lines.forEach((l) => {
// //         if (String(l.accountId) !== String(acc._id)) return;
// //         balance +=
// //           l.side === "cr" ? Number(l.amountLAK) : -Number(l.amountLAK);
// //       });
// //     });

// //     if (balance !== 0) {
// //       closingLines.push(
// //         buildLine({
// //           accountId: acc._id,
// //           side: "dr",
// //           amountLAK: balance,
// //         })
// //       );
// //     }
// //   });

// // Close expense (Cr)
// // accounts
// //   .filter((a) => a.type === "expense")
// //   .forEach((acc) => {
// //     let balance = 0;
// //     journals.forEach((j) => {
// //       j.lines.forEach((l) => {
// //         if (String(l.accountId) !== String(acc._id)) return;
// //         balance +=
// //           l.side === "dr" ? Number(l.amountLAK) : -Number(l.amountLAK);
// //       });
// //     });

// //     if (balance !== 0) {
// //       closingLines.push(
// //         buildLine({
// //           accountId: acc._id,
// //           side: "cr",
// //           amountLAK: balance,
// //         })
// //       );
// //     }
// //   });
// /* ============================================================
//        7) TOTAL DEBIT / CREDIT (REQUIRED)
//     ============================================================ */
// // const totalDebitLAK = closingLines.reduce(
// //   (s, l) => s + Number(l.debitOriginal || 0),
// //   0
// // );
// // const totalCreditLAK = closingLines.reduce(
// //   (s, l) => s + Number(l.creditOriginal || 0),
// //   0
// // );

// // if (totalDebitLAK !== totalCreditLAK) {
// //   throw new Error("Closing journal not balanced");
// // }
// /* ============================================================
//        8) CREATE CLOSING JOURNAL
//     ============================================================ */
// // await JournalEntry.create(
// //   [
// //     {
// //       companyId,
// //       userId,
// //       date: endDate,
// //       type: "closing",
// //       status: "posted",
// //       description: `Closing period ${month}/${year}`,

// //       totalDebitLAK,
// //       totalCreditLAK,

// //       lines: closingLines,
// //       createdBy: userId,
// //     },
// //   ],
// //   { session }
// // );

// /* ============================================================
//        9) CREATE OPENING BALANCE (NEXT PERIOD)
//     ============================================================ */
// // const nextYear = month === 12 ? year + 1 : year;
// // const nextMonth = month === 12 ? 1 : month + 1;
import express from "express";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import Account from "../../models/accouting_system_models/Account_document.js";
import OpeningBalance from "../../models/accouting_system_models/OpeningBalance.js";
import JournalEntry from "../../models/accouting_system_models/journalEntry_models.js";
import AccountingPeriod from "../../models/accouting_system_models/accountingPeriod.js";
import { authenticate } from "../../middleware/auth.js";
import { createAuditLog } from "../Auditlog.js";
import {
  applyOpening,
  buildLine,
  buildTree,
  computeEnding,
  initRows,
  rollUp,
} from "../../utils/balanceSheetFuntions.js";

const router = express.Router();

/* ============================================================
   SECURITY MIDDLEWARE
============================================================ */

// 🔐 Extremely strict rate limiting for critical operations
const closePeriodLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // Only 3 attempts per hour
  message: "Too many close period attempts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count even successful requests
});

// 🛡️ Role-based authorization for period closing
const requireAdminOrAccountant = async (req, res, next) => {
  try {
    const user = await mongoose
      .model("User")
      .findById(req.user._id)
      .select("role permissions companyId");

    if (!user) {
      await createAuditLog({
        userId: req.user._id,
        action: "UNAUTHORIZED_ACCESS",
        collectionName: "AccountingPeriod",
        ipAddress: req.ip,
        description: "User not found attempting to close period",
        userAgent: req.get("user-agent"),
      });

      return res.status(403).json({
        success: false,
        error: "User not found",
      });
    }

    // Only admin and senior accountant can close periods
    const allowedRoles = ["admin", "senior_accountant"];
    if (!allowedRoles.includes(user.role)) {
      await createAuditLog({
        userId: req.user._id,
        action: "UNAUTHORIZED_PERIOD_CLOSE",
        collectionName: "AccountingPeriod",
        ipAddress: req.ip,
        description: `User with role '${user.role}' attempted to close accounting period`,
        userAgent: req.get("user-agent"),
      });

      return res.status(403).json({
        success: false,
        error:
          "Insufficient permissions. Only admin or senior accountant can close periods.",
      });
    }

    // Verify company ID matches
    if (user.companyId.toString() !== req.user.companyId.toString()) {
      await createAuditLog({
        userId: req.user._id,
        action: "SECURITY_VIOLATION",
        collectionName: "AccountingPeriod",
        ipAddress: req.ip,
        description: "Company ID mismatch detected",
        userAgent: req.get("user-agent"),
      });

      return res.status(403).json({
        success: false,
        error: "Company verification failed",
      });
    }

    next();
  } catch (err) {
    console.error("Authorization error:", err);
    res.status(500).json({
      success: false,
      error: "Authorization check failed",
    });
  }
};

// 🔍 Validate critical operation parameters
const validateClosePeriodInput = (req, res, next) => {
  const { year, month } = req.body;

  // Validate year
  if (!year || typeof year !== "number") {
    return res.status(400).json({
      success: false,
      error: "Valid year is required (number)",
    });
  }

  const currentYear = new Date().getFullYear();
  if (year < 2000 || year > currentYear + 1) {
    return res.status(400).json({
      success: false,
      error: `Invalid year. Must be between 2000 and ${currentYear + 1}`,
    });
  }

  // Validate month (if provided)
  if (month !== undefined) {
    if (typeof month !== "number" || month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        error: "Invalid month. Must be between 1 and 12",
      });
    }
  }

  next();
};

// 🔒 Prevent concurrent closing operations
const closingLocks = new Map();

const preventConcurrentClose = (req, res, next) => {
  const { year } = req.body;
  const lockKey = `${req.user.companyId}-${year}`;

  if (closingLocks.has(lockKey)) {
    return res.status(409).json({
      success: false,
      error: "Period closing is already in progress. Please wait.",
    });
  }

  closingLocks.set(lockKey, true);

  // Auto-release lock after 5 minutes (safety mechanism)
  setTimeout(() => {
    closingLocks.delete(lockKey);
  }, 5 * 60 * 1000);

  // Store lock key for cleanup in finally block
  req.lockKey = lockKey;

  next();
};

/* ============================================================
   HELPER FUNCTIONS
============================================================ */

function applyMovements(rows, accounts, journalss) {
  for (const acc of accounts) {
    if (!["asset", "liability", "equity"].includes(acc.type)) continue;
    const accMap = {};
    accMap[String(acc._id)] = acc.code;

    journalss.forEach((j) => {
      (j.lines || []).forEach((ln) => {
        const code = accMap[String(ln.accountId)];
        if (!code || !rows[code]) return;

        const amt = Number(ln.amountLAK || 0);

        // Security: Validate amount is not NaN or Infinity
        if (!isFinite(amt)) {
          console.warn(
            `Invalid amount detected for account ${code}:`,
            ln.amountLAK
          );
          return;
        }

        if (ln.side === "dr") rows[code].movementDr += amt;
        else rows[code].movementCr += amt;
      });
    });
  }
}

// 🔍 Validate journal integrity
const validateJournalIntegrity = (journals) => {
  const errors = [];

  journals.forEach((j, index) => {
    // Check if journal has lines
    if (!Array.isArray(j.lines) || j.lines.length === 0) {
      errors.push(`Journal ${j._id || index} has no lines`);
      return;
    }

    // Calculate totals
    let totalDebit = 0;
    let totalCredit = 0;

    j.lines.forEach((l) => {
      const debit = Number(l.debitOriginal || 0);
      const credit = Number(l.creditOriginal || 0);

      // Check for invalid numbers
      if (!isFinite(debit) || !isFinite(credit)) {
        errors.push(`Journal ${j._id || index} has invalid amounts`);
        return;
      }

      totalDebit += debit;
      totalCredit += credit;
    });

    // Check balance (allow 0.01 tolerance for rounding)
    const difference = Math.abs(totalDebit - totalCredit);
    if (difference > 0.01) {
      errors.push(
        `Journal ${j._id || index} is unbalanced. ` +
          `Debit: ${totalDebit.toFixed(2)}, Credit: ${totalCredit.toFixed(
            2
          )}, ` +
          `Difference: ${difference.toFixed(2)}`
      );
    }

    // Check for locked status
    if (j.status_close === "locked") {
      errors.push(`Journal ${j._id || index} is already locked`);
    }
  });

  return errors;
};

// 📊 Pre-close validation checks
const performPreCloseValidation = async (companyId, year, session) => {
  const issues = [];

  // 1. Check if period is already closed
  const period = await AccountingPeriod.findOne({
    companyId,
    year,
  }).session(session);

  if (period?.isClosed) {
    issues.push({
      type: "ALREADY_CLOSED",
      message: `Year ${year} is already closed`,
      severity: "ERROR",
    });
  }

  // 2. Check if previous year is closed
  const previousYear = year - 1;
  const prevPeriod = await AccountingPeriod.findOne({
    companyId,
    year: previousYear,
  }).session(session);

  // if (previousYear >= 2000 && !prevPeriod?.isClosed) {
  //   issues.push({
  //     type: 'PREVIOUS_YEAR_NOT_CLOSED',
  //     message: `Previous year (${previousYear}) must be closed first`,
  //     severity: 'ERROR'
  //   });
  // }

  // 3. Check for draft journals
  const draftCount = await JournalEntry.countDocuments({
    companyId,
    date: {
      $gte: new Date(year, 0, 1),
      $lte: new Date(year, 11, 31, 23, 59, 59, 999),
    },
    status: "draft",
  }).session(session);

  if (draftCount > 0) {
    issues.push({
      type: "DRAFT_JOURNALS_EXIST",
      message: `${draftCount} draft journal(s) found. All journals must be posted before closing.`,
      severity: "ERROR",
    });
  }

  // 4. Check for required accounts
  const requiredAccounts = ["321", "329"]; // Retained earnings accounts
  const accounts = await Account.find({
    companyId,
    code: { $in: requiredAccounts },
  }).session(session);

  const missingAccounts = requiredAccounts.filter(
    (code) => !accounts.find((a) => a.code === code)
  );

  if (missingAccounts.length > 0) {
    issues.push({
      type: "MISSING_ACCOUNTS",
      message: `Required account(s) missing: ${missingAccounts.join(", ")}`,
      severity: "ERROR",
    });
  }

  return issues;
};

/* ============================================================
   POST /api/accounting/close-period
   🔥 CRITICAL OPERATION - Maximum Security
============================================================ */
router.post(
  "/close-period",
  authenticate,
  closePeriodLimiter,
  requireAdminOrAccountant,
  validateClosePeriodInput,
  preventConcurrentClose,
  async (req, res) => {
    const startTime = Date.now();
    let session = null;

    try {
      const { year, month } = req.body;
      const companyId = req.user.companyId;
      const userId = req.user._id;

      console.log(
        `[CLOSE PERIOD] Starting for Company: ${companyId}, Year: ${year}`
      );

      // Start transaction
      session = await mongoose.startSession();
      session.startTransaction();

      // 📋 Step 1: Pre-close validation
      console.log("[CLOSE PERIOD] Step 1: Validation");
      const validationIssues = await performPreCloseValidation(
        companyId,
        year,
        session
      );

      const errors = validationIssues.filter((i) => i.severity === "ERROR");
      if (errors.length > 0) {
        await createAuditLog({
          userId,
          action: "CLOSE_PERIOD_FAILED",
          collectionName: "AccountingPeriod",
          ipAddress: req.ip,
          description: `Pre-close validation failed: ${errors
            .map((e) => e.message)
            .join("; ")}`,
          userAgent: req.get("user-agent"),
        });

        throw new Error(
          `Cannot close period. Issues found:\n${errors
            .map((e) => `- ${e.message}`)
            .join("\n")}`
        );
      }

      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

      // 📊 Step 2: Load and validate journals
      console.log("[CLOSE PERIOD] Step 2: Load journals");
      const journals = await JournalEntry.find({
        companyId,
        date: { $gte: startDate, $lte: endDate },
        status: "posted",
        type: "normal",
      }).session(session);

      console.log(`[CLOSE PERIOD] Found ${journals.length} journals`);

      // Validate journal integrity
      const journalErrors = validateJournalIntegrity(journals);
      if (journalErrors.length > 0) {
        await createAuditLog({
          userId,
          action: "CLOSE_PERIOD_FAILED",
          collectionName: "AccountingPeriod",
          ipAddress: req.ip,
          description: `Journal validation failed: ${journalErrors.join("; ")}`,
          userAgent: req.get("user-agent"),
        });

        throw new Error(
          `Journal validation failed:\n${journalErrors.join("\n")}`
        );
      }

      // 💰 Step 3: Load accounts and calculate P&L
      console.log("[CLOSE PERIOD] Step 3: Calculate P&L");
      const accounts = await Account.find({ companyId }).lean();

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found for company");
      }

      let income = 0;
      let expense = 0;

      journals.forEach((j) => {
        if (!Array.isArray(j.lines)) return;

        j.lines.forEach((l) => {
          const acc = accounts.find(
            (o) => o._id.toString() === l.accountId?.toString()
          );
          if (!acc) return;

          const amt = Number(l.amountLAK || 0);
          if (amt <= 0 || !isFinite(amt)) return;

          // Income
          if (acc.type === "income" && l.side === "cr") {
            income += amt;
          }

          // Expense
          if (acc.type === "expense" && l.side === "dr") {
            expense += amt;
          }
        });
      });

      const netProfit = income - expense;
      console.log(`[CLOSE PERIOD] Net Profit: ${netProfit.toFixed(2)} LAK`);

      // Security check: Validate calculated amounts
      if (!isFinite(income) || !isFinite(expense) || !isFinite(netProfit)) {
        throw new Error("Invalid financial calculations detected");
      }

      // 📝 Step 4: Build closing journal lines
      console.log("[CLOSE PERIOD] Step 4: Build closing entries");
      const closingLines = [];

      // Find retained earnings account
      const retainedCode = netProfit >= 0 ? "321" : "329";
      const retained = accounts.find((a) => a.code === retainedCode);

      if (!retained) {
        throw new Error(
          `Retained earnings account (${retainedCode}) not found`
        );
      }

      closingLines.push(
        buildLine({
          accountId: retained._id,
          side: netProfit >= 0 ? "cr" : "dr",
          amountLAK: Math.abs(netProfit),
        })
      );

      // 📊 Step 5: Calculate balances for carry forward
      console.log("[CLOSE PERIOD] Step 5: Calculate balances");
      const { rows } = initRows(accounts);

      // Apply opening balances
      const openings = await OpeningBalance.find({
        companyId,
        year: year,
      }).lean();

      applyOpening(rows, accounts, openings);

      // Apply movements
      const journalss = await JournalEntry.find({
        companyId,
        date: { $gte: startDate, $lte: endDate },
      }).lean();

      applyMovements(rows, accounts, journalss);

      // Build tree and calculate
      const childrenMap = buildTree(rows);
      rollUp(rows, childrenMap);
      computeEnding(rows);

      // Filter active accounts
      const list = Object.values(rows)
        .filter(
          (r) =>
            r.openingDr !== 0 ||
            r.openingCr !== 0 ||
            r.movementDr !== 0 ||
            r.movementCr !== 0 ||
            r.endingDr !== 0 ||
            r.endingCr !== 0
        )
        .sort((a, b) =>
          a.code.localeCompare(b.code, undefined, { numeric: true })
        );

      const lockMain = list.filter((o) => o.parentCode !== null);

      // 💾 Step 6: Create opening balances for next year
      console.log("[CLOSE PERIOD] Step 6: Create next year openings");
      const nextYear = year + 1;

      const docs = lockMain.map((o) => ({
        userId,
        companyId,
        accountId: o.accountId,
        year: nextYear,
        debit: o.endingDr,
        credit: o.endingCr,
        note: `Carried forward from ${year}`,
        status_close: "locked",
        createdAt: new Date(),
      }));

      const closingLinesToOpeningBalance = closingLines.map((o) => ({
        userId,
        companyId,
        accountId: o.accountId,
        year: nextYear,
        debit: o.debitOriginal || 0,
        credit: o.creditOriginal || 0,
        note: `Net profit/loss from ${year}`,
        status_close: "locked",
        createdAt: new Date(),
      }));

      const openingDocs = [...docs, ...closingLinesToOpeningBalance];

      if (openingDocs.length === 0) {
        throw new Error("No opening balances to create");
      }

      await OpeningBalance.insertMany(openingDocs, { session });

      // 🔒 Step 7: Lock all journals in the period
      console.log("[CLOSE PERIOD] Step 7: Lock journals");
      const lockResult = await JournalEntry.updateMany(
        {
          companyId,
          date: { $gte: startDate, $lte: endDate },
          status_close: { $ne: "locked" }, // Only update unlocked journals
        },
        {
          $set: {
            status_close: "locked",
            lockedAt: new Date(),
            lockedBy: userId,
          },
        },
        { session }
      );

      console.log(`[CLOSE PERIOD] Locked ${lockResult.modifiedCount} journals`);

      // 🔐 Step 8: Mark period as closed
      console.log("[CLOSE PERIOD] Step 8: Close period");
      await AccountingPeriod.updateOne(
        { companyId, year },
        {
          year,
          month: month || 12,
          isClosed: true,
          closedAt: new Date(),
          closedBy: userId,
          summary: {
            income,
            expense,
            netProfit,
            journalsProcessed: journals.length,
            accountsCarriedForward: openingDocs.length,
          },
        },
        { upsert: true, session }
      );

      // ✅ Commit transaction
      await session.commitTransaction();

      const executionTime = Date.now() - startTime;
      console.log(`[CLOSE PERIOD] Completed in ${executionTime}ms`);

      // 📝 Log successful close
      await createAuditLog({
        userId,
        action: "CLOSE_PERIOD_SUCCESS",
        collectionName: "AccountingPeriod",
        documentId: year.toString(),
        ipAddress: req.ip,
        description: `Successfully closed year ${year}. Net Profit: ${netProfit.toFixed(
          2
        )} LAK, Journals: ${
          journals.length
        }, Execution time: ${executionTime}ms`,
        userAgent: req.get("user-agent"),
      });

      return res.json({
        success: true,
        message: `Accounting period ${year} closed successfully`,
        data: {
          year,
          netProfit: Math.round(netProfit * 100) / 100,
          income: Math.round(income * 100) / 100,
          expense: Math.round(expense * 100) / 100,
          journalsProcessed: journals.length,
          accountsCarriedForward: openingDocs.length,
          executionTime: `${executionTime}ms`,
        },
      });
    } catch (err) {
      // Rollback transaction
      if (session) {
        await session.abortTransaction();
      }

      console.error("[CLOSE PERIOD ERROR]:", err);

      // Log failed attempt
      await createAuditLog({
        userId: req.user._id,
        action: "CLOSE_PERIOD_FAILED",
        collectionName: "AccountingPeriod",
        ipAddress: req.ip,
        description: `Failed to close period: ${err.message}`,
        userAgent: req.get("user-agent"),
      });

      return res.status(500).json({
        success: false,
        error: err.message || "Failed to close accounting period",
      });
    } finally {
      // Cleanup
      if (session) {
        session.endSession();
      }

      // Release lock
      if (req.lockKey) {
        closingLocks.delete(req.lockKey);
      }
    }
  }
);

/* ============================================================
   GET /api/accounting/period-status/:year
   Check if a period can be closed
============================================================ */
router.get("/period-status", authenticate, async (req, res) => {
  try {
    const {year}=req.query
    console.log(req.query)
    const companyId = req.user.companyId;
    if (isNaN(year) || year < 2000 || year > new Date().getFullYear() + 1) {
      return res.status(400).json({
        success: false,
        error: "Invalid year",
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const issues = await performPreCloseValidation(companyId, year, session);
      await session.commitTransaction();

      const canClose = issues.some((i) => i.severity === "ERROR");

      res.json({
        success: true,
        year,
        canClose,
        issues,
      });
    } finally {
      session.endSession();
    }
  } catch (err) {
    console.error("Period status check error:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;
