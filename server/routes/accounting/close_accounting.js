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
  computeEnding,
  initRows,
} from "../../utils/balanceSheetFuntions.js";
import accountingPeriod from "../../models/accouting_system_models/accountingPeriod.js";

const router = express.Router();

/* ============================================================
 🛡️ ROLE-BASED AUTHORIZATION
============================================================ */
const requireAdminOrAccountant = async (req, res, next) => {
  try {
    // SECURITY: Validate user exists
    const user = await mongoose
      .model("User")
      .findById(req.user._id)
      .select("role permissions companyId")
      .lean();

    if (!user) {
      await createAuditLog({
        userId: req.user._id,
        action: "UNAUTHORIZED_ACCESS",
        collectionName: "AccountingPeriod",
        ipAddress: req.ip,
        description: "User not found attempting to access period operations",
        userAgent: req.get("user-agent"),
      });

      return res.status(403).json({
        success: false,
        error: "User not found",
      });
    }

    // SECURITY: Role-based access control
    const allowedRoles = ["admin", "senior_accountant"];
    if (!allowedRoles.includes(user.role)) {
      await createAuditLog({
        userId: req.user._id,
        action: "UNAUTHORIZED_PERIOD_OPERATION",
        collectionName: "AccountingPeriod",
        ipAddress: req.ip,
        description: `User with role '${user.role}' attempted unauthorized period operation`,
        userAgent: req.get("user-agent"),
      });

      return res.status(403).json({
        success: false,
        error: "Insufficient permissions. Only admin or senior accountant can perform period operations.",
      });
    }

    // SECURITY: Verify company ID matches
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
    console.error("Authorization error:", err.message);
    res.status(500).json({
      success: false,
      error: "Authorization check failed",
    });
  }
};

/* ============================================================
 ✅ TREE + ROLLUP
============================================================ */
function buildTree(rows) {
  const children = {};

  Object.values(rows).forEach((r) => {
    if (!r.parentCode) return;

    if (!children[r.parentCode]) children[r.parentCode] = [];
    children[r.parentCode].push(r.code);
  });

  return children;
}

function rollUp(rows, childrenMap) {
  const visited = new Set();

  function dfs(code) {
    if (visited.has(code)) return;
    visited.add(code);

    const childs = childrenMap[code] || [];

    childs.forEach((c) => {
      dfs(c);

      rows[code].openingDr += rows[c].openingDr;
      rows[code].openingCr += rows[c].openingCr;

      rows[code].movementDr += rows[c].movementDr;
      rows[code].movementCr += rows[c].movementCr;
    });
  }

  Object.values(rows)
    .filter((r) => !r.parentCode)
    .forEach((r) => dfs(r.code));
}

/* ============================================================
 ✅ LEAF ACCOUNT CHECKER
============================================================ */
function isLeafAccount(code, childrenMap) {
  return !childrenMap[code] || childrenMap[code].length === 0;
}

/* ============================================================
 ✅ APPLY MOVEMENTS
============================================================ */
function applyMovements(rows, accounts, journals) {
  const accMap = {};

  accounts.forEach((acc) => {
    accMap[String(acc._id)] = acc.code;
  });

  journals.forEach((j) => {
    (j.lines || []).forEach((ln) => {
      const code = accMap[String(ln.accountId)];
      if (!code || !rows[code]) return;

      const amt = Number(ln.amountLAK || 0);
      if (!isFinite(amt) || amt <= 0) return;

      if (ln.side === "dr") rows[code].movementDr += amt;
      else rows[code].movementCr += amt;
    });
  });
}

/* ============================================================
 🛡️ RATE LIMITER
============================================================ */
const closePeriodLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: "Too many period operations. Try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

/* ============================================================
 ✅ CLOSE PERIOD ROUTE
============================================================ */
router.post(
  "/close-period",
  authenticate,
  requireAdminOrAccountant,
  closePeriodLimiter,
  async (req, res) => {
    let session;

    try {
      /* ================= SECURITY: Input Validation ================= */
      const { year } = req.body;

      // SECURITY: Validate year
      if (!year || typeof year !== "number") {
        return res.status(400).json({
          success: false,
          error: "Valid year is required",
        });
      }

      if (year < 1900 || year > 2100) {
        return res.status(400).json({
          success: false,
          error: "Year must be between 1900 and 2100",
        });
      }

      const companyId = req.user.companyId;
      const userId = req.user._id;

      session = await mongoose.startSession();
      await session.startTransaction();

      /* ====================================================
        ✅ 1. CHECK IF ALREADY CLOSED
      ==================================================== */
      const existing = await AccountingPeriod.findOne({
        companyId,
        year,
      }).session(session);

      if (existing?.isClosed) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          error: `Year ${year} is already closed`,
        });
      }

      /* ====================================================
        ✅ 2. CHECK PREVIOUS YEAR IS CLOSED
      ==================================================== */
      if (year > 1900) {
        const previousYear = year - 1;
        const previousPeriod = await AccountingPeriod.findOne({
          companyId,
          year: previousYear,
        }).session(session);

        // If previous year exists and not closed, prevent closing current year
        if (previousPeriod && !previousPeriod.isClosed) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            error: `Cannot close year ${year}. Previous year ${previousYear} must be closed first.`,
          });
        }
      }

      /* ====================================================
        ✅ 3. LOAD JOURNALS POSTED ONLY
      ==================================================== */
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);

      const journals = await JournalEntry.find({
        companyId,
        date: { $gte: startDate, $lte: endDate },
        status: "posted",
        type: "normal",
      })
        .session(session)
        .lean();

      /* ====================================================
        ✅ 4. LOAD ACCOUNTS
      ==================================================== */
      const accounts = await Account.find({ companyId })
        .session(session)
        .lean();

      if (!accounts.length) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          error: "No accounts found for this company",
        });
      }

      /* ====================================================
        ✅ 5. CALCULATE PROFIT/LOSS
      ==================================================== */
      let income = 0;
      let expense = 0;

      journals.forEach((j) => {
        (j.lines || []).forEach((l) => {
          const acc = accounts.find(
            (a) => a._id.toString() === l.accountId.toString()
          );
          if (!acc) return;

          const amt = Number(l.amountLAK || 0);
          if (!isFinite(amt) || amt <= 0) return;

          if (acc.type === "income" && l.side === "cr") income += amt;
          if (acc.type === "expense" && l.side === "dr") expense += amt;
        });
      });

      const netProfit = income - expense;

      console.log(`✅ Close Period ${year}: Income=${income}, Expense=${expense}, NetProfit=${netProfit}`);

      /* ====================================================
        ✅ 6. BUILD CLOSING ENTRY
      ==================================================== */
      const closingLines = [];

      // ✅ Close income accounts
      accounts
        .filter((a) => a.type === "income")
        .forEach((acc) => {
          const total = journals.reduce((sum, j) => {
            (j.lines || []).forEach((l) => {
              if (l.accountId.toString() === acc._id.toString())
                sum += Number(l.amountLAK || 0);
            });
            return sum;
          }, 0);

          if (total > 0) {
            closingLines.push(
              buildLine({
                accountId: acc._id,
                side: "dr",
                amountLAK: total,
              })
            );
          }
        });

      // ✅ Close expense accounts
      accounts
        .filter((a) => a.type === "expense")
        .forEach((acc) => {
          const total = journals.reduce((sum, j) => {
            (j.lines || []).forEach((l) => {
              if (l.accountId.toString() === acc._id.toString())
                sum += Number(l.amountLAK || 0);
            });
            return sum;
          }, 0);

          if (total > 0) {
            closingLines.push(
              buildLine({
                accountId: acc._id,
                side: "cr",
                amountLAK: total,
              })
            );
          }
        });

      // ✅ Retained Earnings account
      const retainedCode = netProfit >= 0 ? "321" : "329";
      const retained = accounts.find((a) => a.code === retainedCode);

      if (!retained) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          error: `Retained earnings account ${retainedCode} not found. Please create it first.`,
        });
      }

      closingLines.push(
        buildLine({
          accountId: retained._id,
          side: netProfit >= 0 ? "cr" : "dr",
          amountLAK: Math.abs(netProfit),
        })
      );

      /* ====================================================
        ✅ 7. BUILD BALANCE SHEET ENDING
      ==================================================== */
      const { rows } = initRows(accounts);

      // ✅ Opening
      const openings = await OpeningBalance.find({
        companyId,
        year,
      })
        .session(session)
        .lean();

      applyOpening(rows, accounts, openings);

      // ✅ Movements from journals
      applyMovements(rows, accounts, journals);

      // ✅ Movements from closing entry
      applyMovements(rows, accounts, [{ lines: closingLines }]);

      // ✅ Rollup balances
      const children = buildTree(rows);
      rollUp(rows, children);

      // ✅ Compute ending
      computeEnding(rows);

      /* ====================================================
        ✅ 8. CREATE NEXT YEAR OPENING (LEAF ONLY)
      ==================================================== */
      const nextYear = year + 1;

      // SECURITY: Delete existing opening balances for safety
      await OpeningBalance.deleteMany({
        companyId,
        year: nextYear,
      }).session(session);

      const openingDocs = Object.values(rows)
        .filter((r) => {
          const hasBalance = r.endingDr !== 0 || r.endingCr !== 0;

          // ✅ retained earnings must always be carried forward
          if (r.code === "321" || r.code === "329") {
            return hasBalance;
          }

          // ✅ other accounts must be leaf only
          const leaf = isLeafAccount(r.code, children);
          return leaf && hasBalance;
        })
        .map((r) => ({
          userId,
          companyId,
          accountId: r.accountId,
          year: nextYear,
          debit: r.endingDr,
          credit: r.endingCr,
          status_close: "locked",
          note: `Carry forward from ${year}`,
        }));

      if (openingDocs.length > 0) {
        await OpeningBalance.insertMany(openingDocs, { session });
      }

      console.log(`✅ Leaf Opening Created: ${openingDocs.length} accounts`);

      /* ====================================================
        ✅ 9. LOCK JOURNALS
      ==================================================== */
      const lockResult = await JournalEntry.updateMany(
        {
          companyId,
          status: "posted",
          type: "normal",
          date: { $gte: startDate, $lte: endDate },
        },
        {
          $set: {
            status_close: "locked",
            lockedBy: userId,
            lockedAt: new Date(),
          },
        },
        { session }
      );

      /* ====================================================
        ✅ 10. CLOSE PERIOD RECORD
      ==================================================== */
      await AccountingPeriod.updateOne(
        { companyId, year },
        {
          isClosed: true,
          closedAt: new Date(),
          closedBy: userId,
          summary: {
            income,
            expense,
            netProfit,
          },
        },
        { upsert: true, session }
      );

      /* ====================================================
        ✅ 11. AUDIT LOG
      ==================================================== */
      await createAuditLog({
        userId,
        action: "CLOSE_ACCOUNTING_PERIOD",
        collectionName: "AccountingPeriod",
        documentId: year.toString(),
        ipAddress: req.ip,
        description: `Closed accounting period ${year}. NetProfit: ${netProfit}, Journals locked: ${lockResult.modifiedCount}`,
        userAgent: req.get("user-agent"),
        metadata: {
          year,
          income,
          expense,
          netProfit,
          journalsLocked: lockResult.modifiedCount,
          openingAccountsCreated: openingDocs.length,
        },
      });

      await session.commitTransaction();

      return res.json({
        success: true,
        message: `✅ Successfully closed year ${year}`,
        data: {
          year,
          income,
          expense,
          netProfit,
          journalsLocked: lockResult.modifiedCount,
          leafAccountsCarried: openingDocs.length,
        },
      });
    } catch (err) {
      if (session && session.inTransaction()) {
        await session.abortTransaction();
      }

      console.error("Close period error:", err.message);

      return res.status(500).json({
        success: false,
        error: err.message || "Failed to close period",
      });
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }
);

/* ============================================================
   GET /api/accounting/period-status
   Check period status
============================================================ */
router.get("/period-status", authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId;

    // SECURITY: Always filter by companyId
    const periods = await accountingPeriod
      .find({ companyId })
      .select("year isClosed closedAt closedBy summary")
      .sort({ year: -1 })
      .lean();

    res.json({
      success: true,
      data: periods.map((p) => ({
        year: p.year,
        isClosed: p.isClosed || false,
        closedAt: p.closedAt,
        closedBy: p.closedBy,
        income: p.summary?.income || 0,
        expense: p.summary?.expense || 0,
        netProfit: p.summary?.netProfit || 0,
      })),
    });
  } catch (err) {
    console.error("Period status error:", err.message);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve period status",
    });
  }
});

/* ============================================================
 🛡️ ROLLBACK VALIDATION MIDDLEWARE
============================================================ */
const validateRollbackInput = (req, res, next) => {
  const { year } = req.body;

  // SECURITY: Validate year
  if (!year || typeof year !== "number") {
    return res.status(400).json({
      success: false,
      error: "Valid year is required for rollback",
    });
  }

  if (year < 1900 || year > 2100) {
    return res.status(400).json({
      success: false,
      error: "Year must be between 1900 and 2100",
    });
  }

  next();
};

const performRollbackValidation = async (companyId, year, session) => {
  const issues = [];

  // Must be a closed period
  const period = await AccountingPeriod.findOne({
    companyId,
    year,
    isClosed: true,
  }).session(session);

  if (!period) {
    issues.push("Period is not closed or does not exist");
    return issues;
  }

  // Must be the latest closed period
  const latestClosed = await AccountingPeriod.findOne({
    companyId,
    isClosed: true,
  })
    .sort({ year: -1 })
    .session(session);

  if (latestClosed.year !== year) {
    issues.push(`Only the latest closed period (${latestClosed.year}) can be rolled back`);
  }

  // SECURITY: Check if next year has transactions
  const nextYear = year + 1;
  const nextYearJournals = await JournalEntry.countDocuments({
    companyId,
    date: {
      $gte: new Date(nextYear, 0, 1),
      $lte: new Date(nextYear, 11, 31),
    },
  }).session(session);

  if (nextYearJournals > 0) {
    issues.push(`Cannot rollback ${year}. Next year (${nextYear}) has ${nextYearJournals} journal entries.`);
  }

  return issues;
};

/* ============================================================
 ✅ ROLLBACK PERIOD ROUTE
============================================================ */
router.post(
  "/rollback-period",
  authenticate,
  requireAdminOrAccountant,
  closePeriodLimiter,
  validateRollbackInput,
  async (req, res) => {
    let session;

    try {
      const { year } = req.body;
      const companyId = req.user.companyId;
      const userId = req.user._id;

      session = await mongoose.startSession();
      await session.startTransaction();

      console.log(`[ROLLBACK PERIOD] Company ${companyId}, Year ${year}`);

      /* ================= VALIDATION ================= */
      const issues = await performRollbackValidation(companyId, year, session);

      if (issues.length > 0) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          error: issues.join("; "),
        });
      }

      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);

      /* ================= STEP 1: UNLOCK JOURNALS ================= */
      const unlockResult = await JournalEntry.updateMany(
        {
          companyId,
          date: { $gte: startDate, $lte: endDate },
          status_close: "locked",
        },
        {
          $unset: {
            status_close: "",
            lockedAt: "",
            lockedBy: "",
          },
        },
        { session }
      );

      /* ================= STEP 2: DELETE OPENING BALANCES ================= */
      const nextYear = year + 1;

      const openingDeleteResult = await OpeningBalance.deleteMany(
        {
          companyId,
          year: nextYear,
          status_close: "locked",
        },
        { session }
      );

      /* ================= STEP 3: UPDATE ACCOUNTING PERIOD ================= */
      await AccountingPeriod.updateOne(
        { companyId, year },
        {
          $set: {
            isClosed: false,
          },
          $unset: {
            closedAt: "",
            closedBy: "",
          },
        },
        { session }
      );

      /* ================= COMMIT ================= */
      await session.commitTransaction();

      /* ================= AUDIT LOG ================= */
      await createAuditLog({
        userId,
        action: "ROLLBACK_PERIOD_SUCCESS",
        collectionName: "AccountingPeriod",
        documentId: year.toString(),
        ipAddress: req.ip,
        description: `Rolled back accounting period ${year}`,
        userAgent: req.get("user-agent"),
        metadata: {
          year,
          journalsUnlocked: unlockResult.modifiedCount,
          openingBalancesDeleted: openingDeleteResult.deletedCount,
        },
      });

      return res.json({
        success: true,
        message: `Accounting period ${year} rolled back successfully`,
        data: {
          year,
          journalsUnlocked: unlockResult.modifiedCount,
          openingBalancesDeleted: openingDeleteResult.deletedCount,
        },
      });
    } catch (err) {
      if (session && session.inTransaction()) {
        await session.abortTransaction();
      }

      console.error("[ROLLBACK PERIOD ERROR]", err.message);

      await createAuditLog({
        userId: req.user._id,
        action: "ROLLBACK_PERIOD_FAILED",
        collectionName: "AccountingPeriod",
        ipAddress: req.ip,
        description: `Failed to rollback period: ${err.message}`,
        userAgent: req.get("user-agent"),
      });

      return res.status(400).json({
        success: false,
        error: err.message || "Rollback period failed",
      });
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }
);

export default router;




// import express from "express";
// import mongoose from "mongoose";
// import rateLimit from "express-rate-limit";
// import Account from "../../models/accouting_system_models/Account_document.js";
// import OpeningBalance from "../../models/accouting_system_models/OpeningBalance.js";
// import JournalEntry from "../../models/accouting_system_models/journalEntry_models.js";
// import AccountingPeriod from "../../models/accouting_system_models/accountingPeriod.js";
// import { authenticate } from "../../middleware/auth.js";
// import { createAuditLog } from "../Auditlog.js";
// import {
//   applyOpening,
//   buildLine,
//   computeEnding,
//   initRows,
// } from "../../utils/balanceSheetFuntions.js";
// import accountingPeriod from "../../models/accouting_system_models/accountingPeriod.js";

// const router = express.Router();
// // 🛡️ Role-based authorization for period closing
// const requireAdminOrAccountant = async (req, res, next) => {
//   try {
//     const user = await mongoose
//       .model("User")
//       .findById(req.user._id)
//       .select("role permissions companyId");

//     if (!user) {
//       await createAuditLog({
//         userId: req.user._id,
//         action: "UNAUTHORIZED_ACCESS",
//         collectionName: "AccountingPeriod",
//         ipAddress: req.ip,
//         description: "User not found attempting to close period",
//         userAgent: req.get("user-agent"),
//       });

//       return res.status(403).json({
//         success: false,
//         error: "User not found",
//       });
//     }

//     // Only admin and senior accountant can close periods
//     const allowedRoles = ["admin", "senior_accountant"];
//     if (!allowedRoles.includes(user.role)) {
//       await createAuditLog({
//         userId: req.user._id,
//         action: "UNAUTHORIZED_PERIOD_CLOSE",
//         collectionName: "AccountingPeriod",
//         ipAddress: req.ip,
//         description: `User with role '${user.role}' attempted to close accounting period`,
//         userAgent: req.get("user-agent"),
//       });

//       return res.status(403).json({
//         success: false,
//         error:
//           "Insufficient permissions. Only admin or senior accountant can close periods.",
//       });
//     }

//     // Verify company ID matches
//     if (user.companyId.toString() !== req.user.companyId.toString()) {
//       await createAuditLog({
//         userId: req.user._id,
//         action: "SECURITY_VIOLATION",
//         collectionName: "AccountingPeriod",
//         ipAddress: req.ip,
//         description: "Company ID mismatch detected",
//         userAgent: req.get("user-agent"),
//       });

//       return res.status(403).json({
//         success: false,
//         error: "Company verification failed",
//       });
//     }

//     next();
//   } catch (err) {
//     console.error("Authorization error:", err);
//     res.status(500).json({
//       success: false,
//       error: "Authorization check failed",
//     });
//   }
// }; /* ============================================================
//  ✅ TREE + ROLLUP
// ============================================================ */

// function buildTree(rows) {
//   const children = {};

//   Object.values(rows).forEach((r) => {
//     if (!r.parentCode) return;

//     if (!children[r.parentCode]) children[r.parentCode] = [];
//     children[r.parentCode].push(r.code);
//   });

//   return children;
// }

// function rollUp(rows, childrenMap) {
//   const visited = new Set();

//   function dfs(code) {
//     if (visited.has(code)) return;
//     visited.add(code);

//     const childs = childrenMap[code] || [];

//     childs.forEach((c) => {
//       dfs(c);

//       rows[code].openingDr += rows[c].openingDr;
//       rows[code].openingCr += rows[c].openingCr;

//       rows[code].movementDr += rows[c].movementDr;
//       rows[code].movementCr += rows[c].movementCr;
//     });
//   }

//   Object.values(rows)
//     .filter((r) => !r.parentCode)
//     .forEach((r) => dfs(r.code));
// }

// /* ============================================================
//  ✅ LEAF ACCOUNT CHECKER
// ============================================================ */

// function isLeafAccount(code, childrenMap) {
//   return !childrenMap[code] || childrenMap[code].length === 0;
// }

// /* ============================================================
//  ✅ APPLY MOVEMENTS
// ============================================================ */

// function applyMovements(rows, accounts, journals) {
//   const accMap = {};

//   accounts.forEach((acc) => {
//     accMap[String(acc._id)] = acc.code;
//   });

//   journals.forEach((j) => {
//     (j.lines || []).forEach((ln) => {
//       const code = accMap[String(ln.accountId)];
//       if (!code || !rows[code]) return;

//       const amt = Number(ln.amountLAK || 0);
//       if (!isFinite(amt) || amt <= 0) return;

//       if (ln.side === "dr") rows[code].movementDr += amt;
//       else rows[code].movementCr += amt;
//     });
//   });
// }

// /* ============================================================
//  ✅ RATE LIMITER
// ============================================================ */

// const closePeriodLimiter = rateLimit({
//   windowMs: 60 * 60 * 1000,
//   max: 10,
//   message: "Too many attempts. Try again later.",
// });

// /* ============================================================
//  ✅ CLOSE PERIOD ROUTE
// ============================================================ */

// router.post(
//   "/close-period",
//   authenticate,
//   closePeriodLimiter,
//   async (req, res) => {
//     let session;

//     try {
//       const { year } = req.body;
//       const companyId = req.user.companyId;
//       const userId = req.user._id;

//       if (!year) throw new Error("Year is required");

//       session = await mongoose.startSession();
//       session.startTransaction();

//       /* ====================================================
//         ✅ 1. CHECK IF ALREADY CLOSED
//       ==================================================== */

//       const existing = await AccountingPeriod.findOne({
//         companyId,
//         year,
//       }).session(session);

//       if (existing?.isClosed) {
//         throw new Error(`Year ${year} already closed`);
//       }

//       /* ====================================================
//         ✅ 2. LOAD JOURNALS POSTED ONLY
//       ==================================================== */

//       const startDate = new Date(year, 0, 1);
//       const endDate = new Date(year, 11, 31, 23, 59, 59);

//       const journals = await JournalEntry.find({
//         companyId,
//         date: { $gte: startDate, $lte: endDate },
//         status: "posted",
//         type: "normal",
//       }).session(session);

//       /* ====================================================
//         ✅ 3. LOAD ACCOUNTS
//       ==================================================== */

//       const accounts = await Account.find({ companyId }).lean();
//       if (!accounts.length) throw new Error("No accounts found");

//       /* ====================================================
//         ✅ 4. CALCULATE PROFIT/LOSS
//       ==================================================== */

//       let income = 0;
//       let expense = 0;

//       journals.forEach((j) => {
//         j.lines.forEach((l) => {
//           const acc = accounts.find(
//             (a) => a._id.toString() === l.accountId.toString()
//           );
//           if (!acc) return;

//           const amt = Number(l.amountLAK || 0);
//           if (!isFinite(amt) || amt <= 0) return;

//           if (acc.type === "income" && l.side === "cr") income += amt;
//           if (acc.type === "expense" && l.side === "dr") expense += amt;
//         });
//       });

//       const netProfit = income - expense;

//       console.log("✅ NetProfit:", netProfit);

//       /* ====================================================
//         ✅ 5. BUILD CLOSING ENTRY
//       ==================================================== */

//       const closingLines = [];

//       // ✅ Close income accounts
//       accounts
//         .filter((a) => a.type === "income")
//         .forEach((acc) => {
//           const total = journals.reduce((sum, j) => {
//             j.lines.forEach((l) => {
//               if (l.accountId.toString() === acc._id.toString())
//                 sum += Number(l.amountLAK || 0);
//             });
//             return sum;
//           }, 0);

//           if (total > 0) {
//             closingLines.push(
//               buildLine({
//                 accountId: acc._id,
//                 side: "dr",
//                 amountLAK: total,
//               })
//             );
//           }
//         });

//       // ✅ Close expense accounts
//       accounts
//         .filter((a) => a.type === "expense")
//         .forEach((acc) => {
//           const total = journals.reduce((sum, j) => {
//             j.lines.forEach((l) => {
//               if (l.accountId.toString() === acc._id.toString())
//                 sum += Number(l.amountLAK || 0);
//             });
//             return sum;
//           }, 0);

//           if (total > 0) {
//             closingLines.push(
//               buildLine({
//                 accountId: acc._id,
//                 side: "cr",
//                 amountLAK: total,
//               })
//             );
//           }
//         });

//       // ✅ Retained Earnings account
//       const retainedCode = netProfit >= 0 ? "321" : "329";
//       const retained = accounts.find((a) => a.code === retainedCode);

//       if (!retained)
//         throw new Error(`Retained earnings account ${retainedCode} missing`);

//       closingLines.push(
//         buildLine({
//           accountId: retained._id,
//           side: netProfit >= 0 ? "cr" : "dr",
//           amountLAK: Math.abs(netProfit),
//         })
//       );

//       /* ====================================================
//         ✅ 6. BUILD BALANCE SHEET ENDING
//       ==================================================== */

//       const { rows } = initRows(accounts);

//       // ✅ Opening
//       const openings = await OpeningBalance.find({
//         companyId,
//         year,
//       }).lean();

//       applyOpening(rows, accounts, openings);

//       // ✅ Movements from journals
//       applyMovements(rows, accounts, journals);

//       // ✅ Movements from closing entry
//       applyMovements(rows, accounts, [{ lines: closingLines }]);

//       // ✅ Rollup balances
//       const children = buildTree(rows);
//       rollUp(rows, children);

//       // ✅ Compute ending
//       computeEnding(rows);

//       /* ====================================================
//         ✅ 7. CREATE NEXT YEAR OPENING (LEAF ONLY ✅)
//       ==================================================== */

//       const nextYear = year + 1;

//       await OpeningBalance.deleteMany({
//         companyId,
//         year: nextYear,
//       }).session(session);

//       const openingDocs = Object.values(rows)
//         .filter((r) => {
//           const hasBalance = r.endingDr !== 0 || r.endingCr !== 0;

//           // ✅ retained earnings ต้องยกเสมอ
//           if (r.code === "321" || r.code === "329") {
//             return hasBalance;
//           }

//           // ✅ บัญชีอื่นๆ ต้องเป็น leaf เท่านั้น
//           const leaf = isLeafAccount(r.code, children);

//           return leaf && hasBalance;
//         })
//         .map((r) => ({
//           userId,
//           companyId,
//           accountId: r.accountId,
//           year: nextYear,
//           debit: r.endingDr,
//           credit: r.endingCr,
//           status_close: "locked",
//           note: `Carry forward from ${year}`,
//         }));
//       await OpeningBalance.insertMany(openingDocs, { session });

//       console.log("✅ Leaf Opening Created:", openingDocs.length);

//       /* ====================================================
//         ✅ 8. LOCK JOURNALS
//       ==================================================== */

//       await JournalEntry.updateMany(
//         {
//           companyId,
//           status: "posted",
//           type: "normal",
//           date: { $gte: startDate, $lte: endDate },
//         },
//         {
//           $set: {
//             status_close: "locked",
//             lockedBy: userId,
//             lockedAt: new Date(),
//           },
//         },
//         { session }
//       );

//       /* ====================================================
//         ✅ 9. CLOSE PERIOD RECORD
//       ==================================================== */

//       await AccountingPeriod.updateOne(
//         { companyId, year },
//         {
//           isClosed: true,
//           closedAt: new Date(),
//           closedBy: userId,
//           summary: {
//             income,
//             expense,
//             netProfit,
//           },
//         },
//         { upsert: true, session }
//       );

//       await session.commitTransaction();

//       return res.json({
//         success: true,
//         message: `✅ Closed year ${year} successfully`,
//         netProfit,
//         leafAccountsCarried: openingDocs.length,
//       });
//     } catch (err) {
//       if (session) await session.abortTransaction();

//       return res.status(500).json({
//         success: false,
//         error: err.message,
//       });
//     } finally {
//       if (session) session.endSession();
//     }
//   }
// );

// /* ============================================================
//    GET /api/accounting/period-status/:year
//    Check if a period can be closed
// ============================================================ */
// router.get("/period-status", authenticate, async (req, res) => {
//   try {
//     const companyId = req.user.companyId;

//     // ดึงทุกปีที่เคยมีการปิดงวด
//     const periods = await accountingPeriod
//       .find({ companyId })
//       .select(
//         "year isClosed closedAt closedBy incomeTotal expenseTotal netProfit"
//       )
//       .sort({ year: -1 })
//       .lean();

//     res.json({
//       success: true,
//       years: periods.map((p) => ({
//         year: p.year,
//         isClosed: p.isClosed,
//         closedAt: p.closedAt,
//         incomeTotal: p.incomeTotal,
//         expenseTotal: p.expenseTotal,
//         netProfit: p.netProfit,
//       })),
//     });
//   } catch (err) {
//     console.error("Period status error:", err);
//     res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// });
// const validateRollbackInput = (req, res, next) => {
//   const { year } = req.body;

//   if (!year || typeof year !== "number") {
//     return res.status(400).json({
//       success: false,
//       error: "Valid year is required for rollback",
//     });
//   }

//   next();
// };
// const performRollbackValidation = async (companyId, year, session) => {
//   const issues = [];

//   // ต้องเป็นปีที่ปิดแล้ว
//   const period = await AccountingPeriod.findOne({
//     companyId,
//     year,
//     isClosed: true,
//   }).session(session);

//   if (!period) {
//     issues.push("Period is not closed or does not exist");
//     return issues;
//   }

//   // ต้องเป็นปีล่าสุด
//   const latestClosed = await AccountingPeriod.findOne({
//     companyId,
//     isClosed: true,
//   })
//     .sort({ year: -1 })
//     .session(session);

//   if (latestClosed.year !== year) {
//     issues.push("Only the latest closed period can be rolled back");
//   }



//   return issues;
// };

// router.post(
//   "/rollback-period",
//   authenticate,
//   closePeriodLimiter, // reuse limiter (critical op)
//   requireAdminOrAccountant,
//   validateRollbackInput,
//   async (req, res) => {
//     let session;

//     try {
//       const { year } = req.body;
//       const companyId = req.user.companyId;
//       const userId = req.user._id;

//       session = await mongoose.startSession();
//       session.startTransaction();

//       console.log(`[ROLLBACK PERIOD] Company ${companyId}, Year ${year}`);

//       /* ================= VALIDATION ================= */
//       const issues = await performRollbackValidation(companyId, year, session);

//       if (issues.length > 0) {
//         throw new Error(issues.join("; "));
//       }

//       const startDate = new Date(year, 0, 1);
//       const endDate = new Date(year, 11, 31, 23, 59, 59);

//       /* ================= STEP 1: UNLOCK JOURNALS ================= */
//       const unlockResult = await JournalEntry.updateMany(
//         {
//           companyId,
//           date: { $gte: startDate, $lte: endDate },
//           status_close: "locked",
//         },
//         {
//           $unset: {
//             status_close: "",
//             lockedAt: "",
//             lockedBy: "",
//           },
//         },
//         { session }
//       );

//       /* ================= STEP 2: DELETE OPENING BALANCES ================= */
//       const nextYear = year + 1;

//       const openingDeleteResult = await OpeningBalance.deleteMany(
//         {
//           companyId,
//           year: nextYear,
//           status_close: "locked",
//         },
//         { session }
//       );

//       /* ================= STEP 3: DELETE ACCOUNTING PERIOD ================= */
//       await AccountingPeriod.deleteOne({ companyId, year }, { session });

//       /* ================= COMMIT ================= */
//       await session.commitTransaction();

//       /* ================= AUDIT LOG ================= */
//       await createAuditLog({
//         userId,
//         action: "ROLLBACK_PERIOD_SUCCESS",
//         collectionName: "AccountingPeriod",
//         documentId: year.toString(),
//         ipAddress: req.ip,
//         description: `Rolled back accounting period ${year}. Journals unlocked: ${unlockResult.modifiedCount}, Opening balances deleted: ${openingDeleteResult.deletedCount}`,
//         userAgent: req.get("user-agent"),
//       });

//       return res.json({
//         success: true,
//         message: `Accounting period ${year} rolled back successfully`,
//         data: {
//           year,
//           journalsUnlocked: unlockResult.modifiedCount,
//           openingBalancesDeleted: openingDeleteResult.deletedCount,
//         },
//       });
//     } catch (err) {
//       if (session) {
//         await session.abortTransaction();
//       }

//       console.error("[ROLLBACK PERIOD ERROR]", err);

//       // await createAuditLog({
//       //   userId: req.user._id,
//       //   action: "ROLLBACK_PERIOD_FAILED",
//       //   collectionName: "AccountingPeriod",
//       //   ipAddress: req.ip,
//       //   description: err.message,
//       //   userAgent: req.get("user-agent"),
//       // });

//       return res.status(400).json({
//         success: false,
//         error: err.message || "Rollback period failed",
//       });
//     } finally {
//       if (session) {
//         session.endSession();
//       }
//     }
//   }
// );

// export default router;
  // ห้ามมี journal ในปีถัดไป
  // const nextYear = year + 1;
  // const nextYearJournalCount = await JournalEntry.countDocuments({
  //   companyId,
  //   date: {
  //     $gte: new Date(nextYear, 0, 1),
  //     $lte: new Date(nextYear, 11, 31, 23, 59, 59),
  //   },
  // }).session(session);

  // if (nextYearJournalCount > 0) {
  //   issues.push(
  //     `Cannot rollback. ${nextYearJournalCount} journal(s) exist in year ${nextYear}`
  //   );
  // }