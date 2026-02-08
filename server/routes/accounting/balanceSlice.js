// // routes/reports/detailedBalance.js
// import express from "express";
// import Account from "../../models/accouting_system_models/Account_document.js";
// import OpeningBalance from "../../models/accouting_system_models/OpeningBalance.js";
// import JournalEntry from "../../models/accouting_system_models/journalEntry_models.js";
// import { authenticate } from "../../middleware/auth.js";
// import {
//   applyMovements,
//   applyOpening,
//   parseDateRange,
//   buildTree,
//   computeEnding,
//   initRows,
//   rollUp,
//   calculateTotals,
//   resolveReportFilter,
// } from "../../utils/balanceSheetFuntions.js";
// import accountingPeriod from "../../models/accouting_system_models/accountingPeriod.js";
// const router = express.Router();

// export function applyCarryToOpening(rows, accounts, journals) {
//   const accMap = {};
//   accounts.forEach((acc) => {
//     accMap[String(acc._id)] = acc.code;
//   });

//   journals.forEach((j) => {
//     (j.lines || []).forEach((ln) => {
//       const code = accMap[String(ln.accountId)];
//       if (!code || !rows[code]) return;

//       const amt = Number(ln.amountLAK || 0);
//       if (ln.side === "dr") rows[code].openingDr += amt;
//       else rows[code].openingCr += amt;
//     });
//   });
// }

// router.get("/detailed-balance", authenticate, async (req, res) => {
//   try {
//     const companyId = req.user.companyId;

//     /* ===============================
//        1) LOAD PERIODS
//     =============================== */
//     const periods = await accountingPeriod
//       .find({ companyId }, { year: 1, _id: 0 })
//       .lean();

//     const { year, startDate, endDate, systemDefaultYear } = resolveReportFilter(
//       {
//         query: req.query,
//         periods,
//       }
//     );

//     /* ===============================
//        2) LOAD ACCOUNTS & INIT
//     =============================== */
//     const accounts = await Account.find({ companyId }).lean();
//     const { rows } = initRows(accounts);

//     /* ===============================
//        3) OPENING BALANCE (ต้นปี)
//     =============================== */
//     const openings = await OpeningBalance.find({
//       companyId,
//       year,
//     }).lean();
//     applyOpening(rows, accounts, openings);
//     ///ຍອດຍົກມາຈາກເດືອນກ່ອນ ປີກ່ອນ
//     const carryJournals = await JournalEntry.find({
//       companyId,
//       date: {
//         $gte: new Date(year, 0, 1), // 1 ม.ค. ปีที่เลือก
//         $lt: startDate, // ก่อนเดือน / ช่วงที่เลือก
//       },
//     }).lean();
//     applyCarryToOpening(rows, accounts, carryJournals);
//     /* ===============================
//        5) MOVEMENT (ช่วงที่เลือกจริง)
//     =============================== */
//     const journals = await JournalEntry.find({
//       companyId,
//       date: { $gte: startDate, $lte: endDate },
//     }).lean();

//     // Validate journal balance
//     journals.forEach((j) => {
//       const dr = j.lines.reduce((s, l) => s + Number(l.debitOriginal || 0), 0);
//       const cr = j.lines.reduce((s, l) => s + Number(l.creditOriginal || 0), 0);
//       if (dr !== cr) {
//         throw new Error(`Unbalanced journal ${j._id}`);
//       }
//     });

//     applyMovements(rows, accounts, journals);

//     /* ===============================
//        6) ROLL UP & CALCULATE
//     =============================== */
//     const childrenMap = buildTree(rows);
//     rollUp(rows, childrenMap);
//     computeEnding(rows);

//     const totals = calculateTotals(rows);

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

//     /* ===============================
//        7) RESPONSE
//     =============================== */
//     res.json({
//       success: true,
//       year,
//       isDefaultYear: year === systemDefaultYear,
//       period: { startDate, endDate },
//       list,
//       totals,
//     });
//   } catch (err) {
//     console.error("ERROR detailed-balance:", err);
//     res.status(400).json({
//       success: false,
//       error: err.message,
//     });
//   }
// });

// function applyMovements_balance_after(rows, accounts, journalss) {
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
// /// ໃບດຸ່ນດ່ຽງຫຼັງປິດງວດ (After Income Statement)
// router.get("/balance_after", authenticate, async (req, res) => {
//   try {
//     const companyId = req.user.companyId;

//     /* ================= Period Filter ================= */
//     const periods = await accountingPeriod
//       .find({ companyId }, { year: 1, _id: 0 })
//       .lean();

//     const { year, startDate, endDate, systemDefaultYear } = resolveReportFilter(
//       {
//         query: req.query,
//         periods,
//       }
//     );

//     /* ================= Accounts ================= */
//     const accounts = await Account.find({ companyId }).lean();
//     if (!accounts.length) throw new Error("No accounts found");

//     const accountMap = new Map(accounts.map((a) => [String(a._id), a]));

//     /* ================= Init Rows ================= */
//     const { rows } = initRows(accounts);

//     /* ================= Opening Balances ================= */
//     const openings = await OpeningBalance.find({ companyId, year }).lean();
//     applyOpening(rows, accounts, openings);

//     /* ================= Load Journals (1 Query ✅) ================= */
//     const allJournals = await JournalEntry.find({
//       companyId,
//       status: "posted",
//       date: {
//         $gte: new Date(year, 0, 1),
//         $lte: endDate,
//       },
//     }).lean();

//     /* ================= Split Carry + Current Period ================= */
//     const carryJournals = [];
//     const periodJournals = [];

//     allJournals.forEach((j) => {
//       if (j.date < startDate) carryJournals.push(j);
//       else periodJournals.push(j);
//     });

//     /* ================= Carry Forward Into Opening ================= */
//     applyCarryToOpening(rows, accounts, carryJournals);

//     /* ================= Apply Movements For Period ================= */
//     applyMovements_balance_after(rows, accounts, periodJournals);

//     /* ================= Calculate Profit / Loss ================= */
//     let income = 0;
//     let expense = 0;

//     periodJournals.forEach((j) => {
//       if (!Array.isArray(j.lines)) return;

//       j.lines.forEach((l) => {
//         const acc = accountMap.get(String(l.accountId));
//         if (!acc) return;

//         const amt = Number(l.amountLAK || 0);
//         if (amt <= 0) return;

//         if (acc.type === "income" && l.side === "cr") income += amt;
//         if (acc.type === "expense" && l.side === "dr") expense += amt;
//       });
//     });

//     const netProfit = income - expense;

//     console.log("✅ Net Profit:", netProfit);

//     /* ==========================================================
//        ✅ REMOVE INCOME / EXPENSE FROM BALANCE SHEET
//     ========================================================== */
//     Object.values(rows).forEach((r) => {
//       const acc = accounts.find((a) => a.code === r.code);
//       if (!acc) return;

//       if (acc.type === "income" || acc.type === "expense") {
//         r.movementDr = 0;
//         r.movementCr = 0;
//         r.endingDr = 0;
//         r.endingCr = 0;
//       }
//     });

//     /* ==========================================================
//        ✅ YEAR RESULT ACCOUNT (331/339 Separate)
//        ✅ DO NOT TOUCH 321/329
//     ========================================================== */
//     if (netProfit >= 0) {
//       if (!rows["331"]) throw new Error("Account 331 not found");
//       rows["331"].movementCr += netProfit;
//     } else {
//       if (!rows["339"]) throw new Error("Account 339 not found");
//       rows["339"].movementDr += Math.abs(netProfit);
//     }

//     /* ==========================================================
//        ✅ FIX RETAINED EARNINGS DISPLAY (321/329)
//        Equity must not stay on Debit side
//     ========================================================== */
//     /* ==========================================================
//    ✅ FIX RETAINED EARNINGS DISPLAY
//    ✅ 321 อยู่ Credit
//    ✅ 329 อยู่ Debit
// ========================================================== */

//     // ✅ 321 = Profit Retained → Credit only
//     if (rows["321"]) {
//       const r = rows["321"];

//       if (r.openingDr > 0) {
//         r.openingCr += r.openingDr;
//         r.openingDr = 0;
//       }

//       if (r.endingDr > 0) {
//         r.endingCr += r.endingDr;
//         r.endingDr = 0;
//       }
//     }

//     // ✅ 329 = Loss Retained → Debit only
//     if (rows["329"]) {
//       const r = rows["329"];

//       if (r.openingCr > 0) {
//         r.openingDr += r.openingCr;
//         r.openingCr = 0;
//       }

//       if (r.endingCr > 0) {
//         r.endingDr += r.endingCr;
//         r.endingCr = 0;
//       }
//     }

//     /* ================= Rollup + Ending ================= */
//     const childrenMap = buildTree(rows);
//     rollUp(rows, childrenMap);
//     computeEnding(rows);

//     /* ================= Output List ================= */
//     const list = Object.values(rows)
//       .filter(
//         (r) =>
//           r.openingDr ||
//           r.openingCr ||
//           r.movementDr ||
//           r.movementCr ||
//           r.endingDr ||
//           r.endingCr
//       )
//       .sort((a, b) =>
//         a.code.localeCompare(b.code, undefined, { numeric: true })
//       );

//     /* ================= Calculate Totals (Leaf Only ✅) ================= */

//     function calculateTotals(list) {
//       return list.reduce(
//         (sum, r) => {
//           sum.openingDr += r.openingDr || 0;
//           sum.openingCr += r.openingCr || 0;

//           sum.movementDr += r.movementDr || 0;
//           sum.movementCr += r.movementCr || 0;

//           sum.endingDr += r.endingDr || 0;
//           sum.endingCr += r.endingCr || 0;

//           return sum;
//         },
//         {
//           openingDr: 0,
//           openingCr: 0,
//           movementDr: 0,
//           movementCr: 0,
//           endingDr: 0,
//           endingCr: 0,
//         }
//       );
//     }
//     // ✅ หา parent codes ทั้งหมด
//     /* ✅ Correct Leaf From Report Structure */

//     // ✅ หา parent code ที่มีลูกใน list จริง
//     const parentCodes = new Set(
//       list.filter((r) => r.parentCode).map((r) => r.parentCode)
//     );

//     // ✅ Leaf = code ที่ไม่ใช่ parent ของใคร
//     const leafList = list.filter((r) => !parentCodes.has(r.code));

//     // ✅ Totals leaf only
//     const totals = calculateTotals(leafList);

//     /* ================= Response ================= */
//     return res.json({
//       success: true,
//       year,
//       startDate,
//       endDate,

//       income,
//       expense,
//       netProfit,
//       yearResultAccount: netProfit >= 0 ? "331" : "339",

//       list,
//       totals,
//       isDefaultYear: year === systemDefaultYear,
//     });
//   } catch (err) {
//     console.error("ERROR balance_after:", err);

//     return res.status(400).json({
//       success: false,
//       error: err.message,
//     });
//   }
// });

// ////balance-sheet-income-expense
// function applyMovements_balance_income_expense(rows, accounts, journalss) {
//   for (const acc of accounts) {
//     if (!["expense", "income"].includes(acc.type)) continue;
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

// /* -------------------------------------------------------------------------- */
// /*                           APPLY OPENING BALANCES                           */
// /* -------------------------------------------------------------------------- */
// function applyOpening_Income_expense(rows, accounts, openings) {
//   const accMap = {};
//   for (const acc of accounts) {
//     if (!["expense", "income"].includes(acc.type)) continue;
//     accMap[String(acc._id)] = acc.code;

//     openings.forEach((ob) => {
//       const code = accMap[String(ob.accountId)];
//       if (!code || !rows[code]) return;
//       rows[code].openingDr += Number(ob.debit || 0);
//       rows[code].openingCr += Number(ob.credit || 0);
//     });
//   }
// }
// router.get(
//   "/fetchDetailedBalance_Income_expense",
//   authenticate,
//   async (req, res) => {
//     try {
//       const companyId = req.user.companyId;
//       const accounts = await Account.find({ companyId }).lean();
//       const periods = await accountingPeriod
//         .find({ companyId }, { year: 1, _id: 0 })
//         .lean();
//       // 1️⃣ ดึง period ทั้งหมด
//       const {
//         year,
//         startDate,
//         endDate,
//         systemDefaultYear,
//       } = resolveReportFilter({
//         query: req.query,
//         periods,
//       });
//       const { rows } = initRows(accounts);

//       ///ຍອດຍົກມາຈາກເດືອນກ່ອນ ປີກ່ອນ
//       const carryJournals = await JournalEntry.find({
//         companyId,
//         date: {
//           $gte: new Date(year, 0, 1), // 1 ม.ค. ปีที่เลือก
//           $lt: startDate, // ก่อนเดือน / ช่วงที่เลือก
//         },
//       }).lean();
//       applyCarryToOpening(rows, accounts, carryJournals);

//       /////ເຄືອນໄຫວໃນເດືອນ
//       const journals = await JournalEntry.find({
//         companyId,
//         date: { $gte: startDate, $lte: endDate },
//       }).lean();
//       journals.forEach((j) => {
//         const dr = j.lines.reduce(
//           (s, l) => s + Number(l.debitOriginal || 0),
//           0
//         );
//         const cr = j.lines.reduce(
//           (s, l) => s + Number(l.creditOriginal || 0),
//           0
//         );
//         if (dr !== cr) {
//           throw new Error(`Unbalanced journal ${j._id}`);
//         }
//       });
//       applyMovements_balance_income_expense(rows, accounts, journals);

//       const childrenMap = buildTree(rows);
//       rollUp(rows, childrenMap);

//       computeEnding(rows);

//       const totals = calculateTotals(rows);

//       // ✔ filter accounts with all-zero balances
//       const list = Object.values(rows)
//         .filter(
//           (r) =>
//             r.openingDr !== 0 ||
//             r.openingCr !== 0 ||
//             r.movementDr !== 0 ||
//             r.movementCr !== 0 ||
//             r.endingDr !== 0 ||
//             r.endingCr !== 0
//         )
//         .sort((a, b) =>
//           a.code.localeCompare(b.code, undefined, { numeric: true })
//         );
//       let balance = 0;
//       balance = totals.endingCr - totals.endingDr;
//       res.json({
//         success: true,
//         list,
//         totals,
//         balance,
//         year,
//         isDefaultYear: year === systemDefaultYear,
//       });
//     } catch (err) {
//       console.error("ERROR detailed-balance:", err);
//       res.status(400).json({ success: false, error: err.message });
//     }
//   }
// );
// export default router;
// routes/reports/detailedBalance.js
import express from "express";
import Account from "../../models/accouting_system_models/Account_document.js";
import OpeningBalance from "../../models/accouting_system_models/OpeningBalance.js";
import JournalEntry from "../../models/accouting_system_models/journalEntry_models.js";
import { authenticate } from "../../middleware/auth.js";
import {
  applyMovements,
  applyOpening,
  parseDateRange,
  buildTree,
  computeEnding,
  initRows,
  rollUp,
  calculateTotals,
  resolveReportFilter,
} from "../../utils/balanceSheetFuntions.js";
import accountingPeriod from "../../models/accouting_system_models/accountingPeriod.js";
const router = express.Router();

/* ============================================================================
   🔒 SECURITY: Input Validation & Sanitization
============================================================================ */

/**
 * Validate and sanitize year parameter
 */
function validateYear(year) {
  if (!year) return null;

  const yearNum = parseInt(year, 10);

  // ป้องกัน invalid numbers และค่าที่ไม่สมเหตุสมผล
  if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
    throw new Error("Invalid year parameter");
  }

  return yearNum;
}

/**
 * Validate and sanitize date parameters
 */
function validateDate(dateStr, paramName) {
  if (!dateStr) return null;

  const date = new Date(dateStr);

  // ป้องกัน Invalid Date
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid ${paramName} parameter`);
  }

  // ป้องกันค่าที่ไม่สมเหตุสมผล
  const minDate = new Date("1900-01-01");
  const maxDate = new Date("2100-12-31");

  if (date < minDate || date > maxDate) {
    throw new Error(`${paramName} out of acceptable range`);
  }

  return date;
}

/**
 * Validate account code to prevent injection
 */
function isValidAccountCode(code) {
  // อนุญาตเฉพาะตัวเลข, ตัวอักษร, จุด, ขีด
  return /^[a-zA-Z0-9._-]+$/.test(code);
}

/**
 * Sanitize and validate numeric amount
 */
function sanitizeAmount(value) {
  const num = Number(value);

  // ป้องกัน NaN, Infinity
  if (!Number.isFinite(num)) {
    return 0;
  }

  // ป้องกันค่าที่ใหญ่เกินไป (overflow attack)
  if (Math.abs(num) > Number.MAX_SAFE_INTEGER) {
    throw new Error("Amount exceeds safe integer limit");
  }

  return num;
}

/**
 * Validate ObjectId format to prevent injection
 */
function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(String(id));
}

/* ============================================================================
   🔒 SECURITY: Rate Limiting Helper (ควรใช้ร่วมกับ middleware)
============================================================================ */

const requestCounts = new Map();

function checkRateLimit(userId, limit = 100, windowMs = 60000) {
  const now = Date.now();
  const userKey = String(userId);

  if (!requestCounts.has(userKey)) {
    requestCounts.set(userKey, []);
  }

  const requests = requestCounts.get(userKey);

  // ลบ requests ที่เก่าเกินกว่า window
  const validRequests = requests.filter(
    (timestamp) => now - timestamp < windowMs
  );

  if (validRequests.length >= limit) {
    throw new Error("Rate limit exceeded");
  }

  validRequests.push(now);
  requestCounts.set(userKey, validRequests);
}

/* ============================================================================
   ORIGINAL FUNCTIONS (with security enhancements)
============================================================================ */

export function applyCarryToOpening(rows, accounts, journals) {
  const accMap = {};
  accounts.forEach((acc) => {
    // 🔒 SECURITY: Validate account structure
    if (!acc || !acc._id || !acc.code) return;
    if (!isValidAccountCode(acc.code)) return;

    accMap[String(acc._id)] = acc.code;
  });

  journals.forEach((j) => {
    // 🔒 SECURITY: Validate journal structure
    if (!j || !Array.isArray(j.lines)) return;

    j.lines.forEach((ln) => {
      // 🔒 SECURITY: Validate line structure
      if (!ln || !ln.accountId) return;

      const code = accMap[String(ln.accountId)];
      if (!code || !rows[code]) return;

      // 🔒 SECURITY: Sanitize amount
      const amt = sanitizeAmount(ln.amountLAK);

      // 🔒 SECURITY: Validate side value
      if (ln.side === "dr") rows[code].openingDr += amt;
      else if (ln.side === "cr") rows[code].openingCr += amt;
      // อื่นๆ ไม่ทำอะไร (ป้องกัน invalid side value)
    });
  });
}

router.get("/detailed-balance", authenticate, async (req, res) => {
  try {
    // 🔒 SECURITY: Validate user context
    if (!req.user || !req.user.companyId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Invalid user context",
      });
    }

    // 🔒 SECURITY: Rate limiting
    try {
      checkRateLimit(req.user.companyId);
    } catch (rateLimitError) {
      return res.status(429).json({
        success: false,
        error: "Too many requests",
      });
    }

    const companyId = req.user.companyId;

    // 🔒 SECURITY: Validate companyId format
    if (!isValidObjectId(companyId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid company ID",
      });
    }

    /* ===============================
       1) LOAD PERIODS
    =============================== */
    const periods = await accountingPeriod
      .find({ companyId }, { year: 1, _id: 0 })
      .lean()
      .maxTimeMS(5000); // 🔒 SECURITY: Prevent slow query DoS

    const { year, startDate, endDate, systemDefaultYear } = resolveReportFilter(
      {
        query: req.query,
        periods,
      }
    );

    // 🔒 SECURITY: Additional validation after resolveReportFilter
    if (year) validateYear(year);
    if (startDate) validateDate(startDate, "startDate");
    if (endDate) validateDate(endDate, "endDate");

    /* ===============================
       2) LOAD ACCOUNTS & INIT
    =============================== */
    const accounts = await Account.find({ companyId }).lean().maxTimeMS(5000); // 🔒 SECURITY: Prevent slow query DoS

    // 🔒 SECURITY: Limit result size
    if (accounts.length > 10000) {
      throw new Error("Account limit exceeded");
    }

    const { rows } = initRows(accounts);

    /* ===============================
       3) OPENING BALANCE (ต้นปี)
    =============================== */
    const openings = await OpeningBalance.find({
      companyId,
      year,
    })
      .lean()
      .maxTimeMS(5000); // 🔒 SECURITY: Prevent slow query DoS

    applyOpening(rows, accounts, openings);

    ///ຍອດຍົກມາຈາກເດືອນກ່ອນ ປີກ່ອນ
    const carryJournals = await JournalEntry.find({
      companyId,
      date: {
        $gte: new Date(year, 0, 1), // 1 ม.ค. ปีที่เลือก
        $lt: startDate, // ก่อนเดือน / ช่วงที่เลือก
      },
    })
      .lean()
      .limit(50000) // 🔒 SECURITY: Limit query results
      .maxTimeMS(10000); // 🔒 SECURITY: Prevent slow query DoS

    applyCarryToOpening(rows, accounts, carryJournals);

    /* ===============================
       5) MOVEMENT (ช่วงที่เลือกจริง)
    =============================== */
    const journals = await JournalEntry.find({
      companyId,
      date: { $gte: startDate, $lte: endDate },
    })
      .lean()
      .limit(50000) // 🔒 SECURITY: Limit query results
      .maxTimeMS(10000); // 🔒 SECURITY: Prevent slow query DoS

    // Validate journal balance
    journals.forEach((j) => {
      // 🔒 SECURITY: Validate journal structure
      if (!j || !Array.isArray(j.lines)) return;

      const dr = j.lines.reduce(
        (s, l) => s + sanitizeAmount(l.debitOriginal),
        0
      );
      const cr = j.lines.reduce(
        (s, l) => s + sanitizeAmount(l.creditOriginal),
        0
      );

      // 🔒 SECURITY: ใช้ tolerance สำหรับการเปรียบเทียบ floating point
      if (Math.abs(dr - cr) > 0.01) {
        throw new Error(`Unbalanced journal ${j._id}`);
      }
    });

    applyMovements(rows, accounts, journals);

    /* ===============================
       6) ROLL UP & CALCULATE
    =============================== */
    const childrenMap = buildTree(rows);
    rollUp(rows, childrenMap);
    computeEnding(rows);

    const totals = calculateTotals(rows);

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

    /* ===============================
       7) RESPONSE
    =============================== */
    res.json({
      success: true,
      year,
      isDefaultYear: year === systemDefaultYear,
      period: { startDate, endDate },
      list,
      totals,
    });
  } catch (err) {
    console.error("ERROR detailed-balance:", err);

    // 🔒 SECURITY: Don't expose sensitive error details to client
    const safeErrorMessage =
      err.message.includes("Rate limit") ||
      err.message.includes("Invalid") ||
      err.message.includes("Unauthorized")
        ? err.message
        : "An error occurred while processing your request";

    res.status(400).json({
      success: false,
      error: safeErrorMessage,
    });
  }
});

function applyMovements_balance_after(rows, accounts, journalss) {
  for (const acc of accounts) {
    // 🔒 SECURITY: Validate account structure
    if (!acc || !acc._id || !acc.code || !acc.type) continue;
    if (!["asset", "liability", "equity"].includes(acc.type)) continue;
    if (!isValidAccountCode(acc.code)) continue;

    const accMap = {};
    accMap[String(acc._id)] = acc.code;

    journalss.forEach((j) => {
      // 🔒 SECURITY: Validate journal structure
      if (!j || !Array.isArray(j.lines)) return;

      j.lines.forEach((ln) => {
        // 🔒 SECURITY: Validate line structure
        if (!ln || !ln.accountId) return;

        const code = accMap[String(ln.accountId)];
        if (!code || !rows[code]) return;

        // 🔒 SECURITY: Sanitize amount
        const amt = sanitizeAmount(ln.amountLAK);

        // 🔒 SECURITY: Validate side value
        if (ln.side === "dr") rows[code].movementDr += amt;
        else if (ln.side === "cr") rows[code].movementCr += amt;
      });
    });
  }
}

/// ໃບດຸ່ນດ່ຽງຫຼັງປິດງວດ (After Income Statement)
router.get("/balance_after", authenticate, async (req, res) => {
  try {
    // 🔒 SECURITY: Validate user context
    if (!req.user || !req.user.companyId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Invalid user context",
      });
    }

    // 🔒 SECURITY: Rate limiting
    try {
      checkRateLimit(req.user.companyId);
    } catch (rateLimitError) {
      return res.status(429).json({
        success: false,
        error: "Too many requests",
      });
    }

    const companyId = req.user.companyId;

    // 🔒 SECURITY: Validate companyId format
    if (!isValidObjectId(companyId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid company ID",
      });
    }

    /* ================= Period Filter ================= */
    const periods = await accountingPeriod
      .find({ companyId }, { year: 1, _id: 0 })
      .lean()
      .maxTimeMS(5000); // 🔒 SECURITY: Prevent slow query DoS

    const { year, startDate, endDate, systemDefaultYear } = resolveReportFilter(
      {
        query: req.query,
        periods,
      }
    );

    // 🔒 SECURITY: Additional validation
    if (year) validateYear(year);
    if (startDate) validateDate(startDate, "startDate");
    if (endDate) validateDate(endDate, "endDate");

    /* ================= Accounts ================= */
    const accounts = await Account.find({ companyId }).lean().maxTimeMS(5000); // 🔒 SECURITY: Prevent slow query DoS

    if (!accounts?.length)
      return res.status(400).json({
        success: false,
        error: "No accounts found",
      });

    // 🔒 SECURITY: Limit result size
    if (accounts.length > 10000) {
      return res.status(400).json({
        success: false,
        error: "Account limit exceeded",
      });
    }

    const accountMap = new Map(accounts.map((a) => [String(a._id), a]));

    /* ================= Init Rows ================= */
    const { rows } = initRows(accounts);

    /* ================= Opening Balances ================= */
    const openings = await OpeningBalance.find({ companyId, year })
      .lean()
      .maxTimeMS(5000); // 🔒 SECURITY: Prevent slow query DoS

    applyOpening(rows, accounts, openings);

    /* ================= Load Journals (1 Query ✅) ================= */
    const allJournals = await JournalEntry.find({
      companyId,
      status: "posted",
      date: {
        $gte: new Date(year, 0, 1),
        $lte: endDate,
      },
    })
      .lean()
      .limit(50000) // 🔒 SECURITY: Limit query results
      .maxTimeMS(10000); // 🔒 SECURITY: Prevent slow query DoS

    /* ================= Split Carry + Current Period ================= */
    const carryJournals = [];
    const periodJournals = [];

    allJournals.forEach((j) => {
      // 🔒 SECURITY: Validate journal structure
      if (!j || !j.date) return;

      if (j.date < startDate) carryJournals.push(j);
      else periodJournals.push(j);
    });

    /* ================= Carry Forward Into Opening ================= */
    applyCarryToOpening(rows, accounts, carryJournals);

    /* ================= Apply Movements For Period ================= */
    applyMovements_balance_after(rows, accounts, periodJournals);

    /* ================= Calculate Profit / Loss ================= */
    let income = 0;
    let expense = 0;

    periodJournals.forEach((j) => {
      if (!Array.isArray(j.lines)) return;

      j.lines.forEach((l) => {
        // 🔒 SECURITY: Validate line structure
        if (!l || !l.accountId) return;

        const acc = accountMap.get(String(l.accountId));
        if (!acc) return;

        // 🔒 SECURITY: Sanitize amount
        const amt = sanitizeAmount(l.amountLAK);
        if (amt <= 0) return;

        // 🔒 SECURITY: Validate account type and side
        if (acc.type === "income" && l.side === "cr") income += amt;
        if (acc.type === "expense" && l.side === "dr") expense += amt;
      });
    });

    const netProfit = income - expense;

    /* ==========================================================
       ✅ REMOVE INCOME / EXPENSE FROM BALANCE SHEET
    ========================================================== */
    Object.values(rows).forEach((r) => {
      const acc = accounts.find((a) => a.code === r.code);
      if (!acc) return;

      if (acc.type === "income" || acc.type === "expense") {
        r.movementDr = 0;
        r.movementCr = 0;
        r.endingDr = 0;
        r.endingCr = 0;
      }
    });

    /* ==========================================================
       ✅ YEAR RESULT ACCOUNT (331/339 Separate)
       ✅ DO NOT TOUCH 321/329
    ========================================================== */
    if (netProfit >= 0) {
      if (!rows["331"]) throw new Error("Account 331 not found");
      rows["331"].movementCr += netProfit;
    } else {
      if (!rows["339"]) throw new Error("Account 339 not found");
      rows["339"].movementDr += Math.abs(netProfit);
    }

    /* ==========================================================
       ✅ FIX RETAINED EARNINGS DISPLAY (321/329)
       Equity must not stay on Debit side
    ========================================================== */
    /* ==========================================================
   ✅ FIX RETAINED EARNINGS DISPLAY
   ✅ 321 อยู่ Credit
   ✅ 329 อยู่ Debit
========================================================== */

    // ✅ 321 = Profit Retained → Credit only
    if (rows["321"]) {
      const r = rows["321"];

      if (r.openingDr > 0) {
        r.openingCr += r.openingDr;
        r.openingDr = 0;
      }

      if (r.endingDr > 0) {
        r.endingCr += r.endingDr;
        r.endingDr = 0;
      }
    }

    // ✅ 329 = Loss Retained → Debit only
    if (rows["329"]) {
      const r = rows["329"];

      if (r.openingCr > 0) {
        r.openingDr += r.openingCr;
        r.openingCr = 0;
      }

      if (r.endingCr > 0) {
        r.endingDr += r.endingCr;
        r.endingCr = 0;
      }
    }

    /* ================= Rollup + Ending ================= */
    const childrenMap = buildTree(rows);
    rollUp(rows, childrenMap);
    computeEnding(rows);

    /* ================= Output List ================= */
    const list = Object.values(rows)
      .filter(
        (r) =>
          r.openingDr ||
          r.openingCr ||
          r.movementDr ||
          r.movementCr ||
          r.endingDr ||
          r.endingCr
      )
      .sort((a, b) =>
        a.code.localeCompare(b.code, undefined, { numeric: true })
      );

    /* ================= Calculate Totals (Leaf Only ✅) ================= */

    function calculateTotals(list) {
      return list.reduce(
        (sum, r) => {
          // 🔒 SECURITY: Sanitize all values
          sum.openingDr += sanitizeAmount(r.openingDr);
          sum.openingCr += sanitizeAmount(r.openingCr);

          sum.movementDr += sanitizeAmount(r.movementDr);
          sum.movementCr += sanitizeAmount(r.movementCr);

          sum.endingDr += sanitizeAmount(r.endingDr);
          sum.endingCr += sanitizeAmount(r.endingCr);

          return sum;
        },
        {
          openingDr: 0,
          openingCr: 0,
          movementDr: 0,
          movementCr: 0,
          endingDr: 0,
          endingCr: 0,
        }
      );
    }
    // ✅ หา parent codes ทั้งหมด
    /* ✅ Correct Leaf From Report Structure */

    // ✅ หา parent code ที่มีลูกใน list จริง
    const parentCodes = new Set(
      list.filter((r) => r.parentCode).map((r) => r.parentCode)
    );

    // ✅ Leaf = code ที่ไม่ใช่ parent ของใคร
    const leafList = list.filter((r) => !parentCodes.has(r.code));

    // ✅ Totals leaf only
    const totals = calculateTotals(leafList);

    /* ================= Response ================= */
    return res.json({
      success: true,
      year,
      startDate,
      endDate,

      income,
      expense,
      netProfit,
      yearResultAccount: netProfit >= 0 ? "331" : "339",

      list,
      totals,
      isDefaultYear: year === systemDefaultYear,
    });
  } catch (err) {
    console.error("ERROR balance_after:", err);

    // 🔒 SECURITY: Don't expose sensitive error details
    const safeErrorMessage =
      err.message.includes("Rate limit") ||
      err.message.includes("Invalid") ||
      err.message.includes("Unauthorized") ||
      err.message.includes("not found")
        ? err.message
        : "An error occurred while processing your request";

    return res.status(400).json({
      success: false,
      error: safeErrorMessage,
    });
  }
});

////balance-sheet-income-expense
function applyMovements_balance_income_expense(rows, accounts, journalss) {
  for (const acc of accounts) {
    // 🔒 SECURITY: Validate account structure
    if (!acc || !acc._id || !acc.code || !acc.type) continue;
    if (!["expense", "income"].includes(acc.type)) continue;
    if (!isValidAccountCode(acc.code)) continue;

    const accMap = {};
    accMap[String(acc._id)] = acc.code;

    journalss.forEach((j) => {
      // 🔒 SECURITY: Validate journal structure
      if (!j || !Array.isArray(j.lines)) return;

      j.lines.forEach((ln) => {
        // 🔒 SECURITY: Validate line structure
        if (!ln || !ln.accountId) return;

        const code = accMap[String(ln.accountId)];
        if (!code || !rows[code]) return;

        // 🔒 SECURITY: Sanitize amount
        const amt = sanitizeAmount(ln.amountLAK);

        // 🔒 SECURITY: Validate side value
        if (ln.side === "dr") rows[code].movementDr += amt;
        else if (ln.side === "cr") rows[code].movementCr += amt;
      });
    });
  }
}

/* -------------------------------------------------------------------------- */
/*                           APPLY OPENING BALANCES                           */
/* -------------------------------------------------------------------------- */
function applyOpening_Income_expense(rows, accounts, openings) {
  const accMap = {};
  for (const acc of accounts) {
    // 🔒 SECURITY: Validate account structure
    if (!acc || !acc._id || !acc.code || !acc.type) continue;
    if (!["expense", "income"].includes(acc.type)) continue;
    if (!isValidAccountCode(acc.code)) continue;

    accMap[String(acc._id)] = acc.code;

    openings.forEach((ob) => {
      // 🔒 SECURITY: Validate opening balance structure
      if (!ob || !ob.accountId) return;

      const code = accMap[String(ob.accountId)];
      if (!code || !rows[code]) return;

      // 🔒 SECURITY: Sanitize amounts
      rows[code].openingDr += sanitizeAmount(ob.debit);
      rows[code].openingCr += sanitizeAmount(ob.credit);
    });
  }
}

router.get(
  "/fetchDetailedBalance_Income_expense",
  authenticate,
  async (req, res) => {
    try {
      // 🔒 SECURITY: Validate user context
      if (!req.user || !req.user.companyId) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized: Invalid user context",
        });
      }

      // 🔒 SECURITY: Rate limiting
      try {
        checkRateLimit(req.user.companyId);
      } catch (rateLimitError) {
        return res.status(429).json({
          success: false,
          error: "Too many requests",
        });
      }

      const companyId = req.user.companyId;

      // 🔒 SECURITY: Validate companyId format
      if (!isValidObjectId(companyId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid company ID",
        });
      }

      const accounts = await Account.find({ companyId }).lean().maxTimeMS(5000); // 🔒 SECURITY: Prevent slow query DoS

      // 🔒 SECURITY: Limit result size
      if (accounts.length > 10000) {
        throw new Error("Account limit exceeded");
      }

      const periods = await accountingPeriod
        .find({ companyId }, { year: 1, _id: 0 })
        .lean()
        .maxTimeMS(5000); // 🔒 SECURITY: Prevent slow query DoS

      // 1️⃣ ดึง period ทั้งหมด
      const {
        year,
        startDate,
        endDate,
        systemDefaultYear,
      } = resolveReportFilter({
        query: req.query,
        periods,
      });

      // 🔒 SECURITY: Additional validation
      if (year) validateYear(year);
      if (startDate) validateDate(startDate, "startDate");
      if (endDate) validateDate(endDate, "endDate");

      const { rows } = initRows(accounts);

      ///ຍອດຍົກມາຈາກເດືອນກ່ອນ ປີກ່ອນ
      const carryJournals = await JournalEntry.find({
        companyId,
        date: {
          $gte: new Date(year, 0, 1), // 1 ม.ค. ปีที่เลือก
          $lt: startDate, // ก่อนเดือน / ช่วงที่เลือก
        },
      })
        .lean()
        .limit(50000) // 🔒 SECURITY: Limit query results
        .maxTimeMS(10000); // 🔒 SECURITY: Prevent slow query DoS

      applyCarryToOpening(rows, accounts, carryJournals);

      /////ເຄືອນໄຫວໃນເດືອນ
      const journals = await JournalEntry.find({
        companyId,
        date: { $gte: startDate, $lte: endDate },
      })
        .lean()
        .limit(50000) // 🔒 SECURITY: Limit query results
        .maxTimeMS(10000); // 🔒 SECURITY: Prevent slow query DoS

      journals.forEach((j) => {
        // 🔒 SECURITY: Validate journal structure
        if (!j || !Array.isArray(j.lines)) return;

        const dr = j.lines.reduce(
          (s, l) => s + sanitizeAmount(l.debitOriginal),
          0
        );
        const cr = j.lines.reduce(
          (s, l) => s + sanitizeAmount(l.creditOriginal),
          0
        );

        // 🔒 SECURITY: ใช้ tolerance สำหรับ floating point comparison
        if (Math.abs(dr - cr) > 0.01) {
          throw new Error(`Unbalanced journal ${j._id}`);
        }
      });

      applyMovements_balance_income_expense(rows, accounts, journals);

      const childrenMap = buildTree(rows);
      rollUp(rows, childrenMap);

      computeEnding(rows);

      const totals = calculateTotals(rows);

      // ✔ filter accounts with all-zero balances
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

      let balance = 0;
      balance = totals.endingCr - totals.endingDr;

      res.json({
        success: true,
        list,
        totals,
        balance,
        year,
        isDefaultYear: year === systemDefaultYear,
      });
    } catch (err) {
      console.error("ERROR detailed-balance:", err);

      // 🔒 SECURITY: Don't expose sensitive error details
      const safeErrorMessage =
        err.message.includes("Rate limit") ||
        err.message.includes("Invalid") ||
        err.message.includes("Unauthorized") ||
        err.message.includes("limit exceeded")
          ? err.message
          : "An error occurred while processing your request";

      res.status(400).json({
        success: false,
        error: safeErrorMessage,
      });
    }
  }
);

export default router;
