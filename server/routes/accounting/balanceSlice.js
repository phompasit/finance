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

export function applyCarryToOpening(rows, accounts, journals) {
  const accMap = {};
  accounts.forEach((acc) => {
    accMap[String(acc._id)] = acc.code;
  });

  journals.forEach((j) => {
    (j.lines || []).forEach((ln) => {
      const code = accMap[String(ln.accountId)];
      if (!code || !rows[code]) return;

      const amt = Number(ln.amountLAK || 0);
      if (ln.side === "dr") rows[code].openingDr += amt;
      else rows[code].openingCr += amt;
    });
  });
}

router.get("/detailed-balance", authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId;

    /* ===============================
       1) LOAD PERIODS
    =============================== */
    const periods = await accountingPeriod
      .find({ companyId }, { year: 1, _id: 0 })
      .lean();

    const { year, startDate, endDate, systemDefaultYear } = resolveReportFilter(
      {
        query: req.query,
        periods,
      }
    );

    /* ===============================
       2) LOAD ACCOUNTS & INIT
    =============================== */
    const accounts = await Account.find({ companyId }).lean();
    const { rows } = initRows(accounts);

    /* ===============================
       3) OPENING BALANCE (ต้นปี)
    =============================== */
    const openings = await OpeningBalance.find({
      companyId,
      year,
    }).lean();
    applyOpening(rows, accounts, openings);
    ///ຍອດຍົກມາຈາກເດືອນກ່ອນ ປີກ່ອນ
    const carryJournals = await JournalEntry.find({
      companyId,
      date: {
        $gte: new Date(year, 0, 1), // 1 ม.ค. ปีที่เลือก
        $lt: startDate, // ก่อนเดือน / ช่วงที่เลือก
      },
    }).lean();
    applyCarryToOpening(rows, accounts, carryJournals);
    /* ===============================
       5) MOVEMENT (ช่วงที่เลือกจริง)
    =============================== */
    const journals = await JournalEntry.find({
      companyId,
      date: { $gte: startDate, $lte: endDate },
    }).lean();

    // Validate journal balance
    journals.forEach((j) => {
      const dr = j.lines.reduce((s, l) => s + Number(l.debitOriginal || 0), 0);
      const cr = j.lines.reduce((s, l) => s + Number(l.creditOriginal || 0), 0);
      if (dr !== cr) {
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
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

function applyMovements_balance_after(rows, accounts, journalss) {
  for (const acc of accounts) {
    if (!["asset", "liability", "equity"].includes(acc.type)) continue;
    const accMap = {};
    accMap[String(acc._id)] = acc.code;

    journalss.forEach((j) => {
      (j.lines || []).forEach((ln) => {
        const code = accMap[String(ln.accountId)];
        if (!code || !rows[code]) return;

        const amt = Number(ln.amountLAK || 0);
        if (ln.side === "dr") rows[code].movementDr += amt;
        else rows[code].movementCr += amt;
      });
    });
  }
}
/// ໃບດຸ່ນດ່ຽງຫຼັງປິດງວດ (After Income Statement)
router.get("/balance_after", authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId;

    /* ================= Period ================= */
    const periods = await accountingPeriod
      .find({ companyId }, { year: 1, _id: 0 })
      .lean();

    const {
      year,
      startDate,
      endDate,
      systemDefaultYear,
    } = resolveReportFilter({ query: req.query, periods });

    /* ================= Accounts ================= */
    const accounts = await Account.find({ companyId }).lean();
    const accountMap = new Map(accounts.map((a) => [String(a._id), a]));

    const { rows } = initRows(accounts);

    /* ================= Opening ================= */
    const openings = await OpeningBalance.find({ companyId, year }).lean();
    applyOpening(rows, accounts, openings);

    /* ================= Journals ================= */
    const journals = await JournalEntry.find({
      companyId,
      date: { $gte: startDate, $lte: endDate },
    }).lean();
    ///ຍອດຍົກມາຈາກເດືອນກ່ອນ ປີກ່ອນ
    const carryJournals = await JournalEntry.find({
      companyId,
      date: {
        $gte: new Date(year, 0, 1), // 1 ม.ค. ปีที่เลือก
        $lt: startDate, // ก่อนเดือน / ช่วงที่เลือก
      },
    }).lean();
    applyCarryToOpening(rows, accounts, carryJournals);
    // ✔ validate journal balance
    journals.forEach((j) => {
      if (!Array.isArray(j.lines)) return;
      const dr = j.lines.reduce((s, l) => s + Number(l.debitOriginal || 0), 0);
      const cr = j.lines.reduce((s, l) => s + Number(l.creditOriginal || 0), 0);
      if (dr !== cr) {
        throw new Error(`Unbalanced journal ${j._id}`);
      }
    });

    /* ================= Income / Expense ================= */
    let income = 0;
    let expense = 0;

    journals.forEach((j) => {
      if (!Array.isArray(j.lines)) return;

      j.lines.forEach((l) => {
        const acc = accountMap.get(String(l.accountId));
        if (!acc) return;

        const amt = Number(l.amountLAK || 0);
        if (amt <= 0) return;

        if (acc.type === "income" && l.side === "cr") {
          income += amt;
        }

        if (acc.type === "expense" && l.side === "dr") {
          expense += amt;
        }
      });
    });

    const netProfit = income - expense;

    /* ================= Retained Earnings ================= */
    const parentCode = netProfit >= 0 ? "331" : "329";

    const retainedChildren = accounts.filter(
      (a) => a.parentCode === parentCode
    );

    if (!retainedChildren.length) {
      throw new Error(
        `Retained earnings sub-account not found for ${parentCode}`
      );
    }

    // default sub หรือ ตัวแรก
    const retained =
      retainedChildren.find((a) => a.isDefault) ?? retainedChildren[0];

    const retainedRow = rows[retained.code];
    if (!retainedRow) {
      throw new Error(`Row not found for retained account ${retained.code}`);
    }

    // ✔ โยกผลกำไรขาดทุน
    if (netProfit >= 0) {
      retainedRow.movementCr += netProfit;
    } else {
      retainedRow.movementDr += Math.abs(netProfit);
    }

    /* ================= Apply Movements ================= */
    applyMovements_balance_after(rows, accounts, journals);

    /* ================= Rollup ================= */
    const childrenMap = buildTree(rows);
    rollUp(rows, childrenMap);
    computeEnding(rows);

    const totals = calculateTotals(rows);

    /* ================= Output ================= */
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

    res.json({
      success: true,
      list,
      totals,
      year,
      isDefaultYear: year === systemDefaultYear,
    });
  } catch (err) {
    console.error("ERROR balance_after:", err);
    res.status(400).json({ success: false, error: err.message });
  }
});

////balance-sheet-income-expense
function applyMovements_balance_income_expense(rows, accounts, journalss) {
  for (const acc of accounts) {
    if (!["expense", "income"].includes(acc.type)) continue;
    const accMap = {};
    accMap[String(acc._id)] = acc.code;

    journalss.forEach((j) => {
      (j.lines || []).forEach((ln) => {
        const code = accMap[String(ln.accountId)];
        if (!code || !rows[code]) return;

        const amt = Number(ln.amountLAK || 0);
        if (ln.side === "dr") rows[code].movementDr += amt;
        else rows[code].movementCr += amt;
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
    if (!["expense", "income"].includes(acc.type)) continue;
    accMap[String(acc._id)] = acc.code;

    openings.forEach((ob) => {
      const code = accMap[String(ob.accountId)];
      if (!code || !rows[code]) return;
      rows[code].openingDr += Number(ob.debit || 0);
      rows[code].openingCr += Number(ob.credit || 0);
    });
  }
}
router.get(
  "/fetchDetailedBalance_Income_expense",
  authenticate,
  async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const accounts = await Account.find({ companyId }).lean();
      const periods = await accountingPeriod
        .find({ companyId }, { year: 1, _id: 0 })
        .lean();
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
      const { rows } = initRows(accounts);

      ///ຍອດຍົກມາຈາກເດືອນກ່ອນ ປີກ່ອນ
      const carryJournals = await JournalEntry.find({
        companyId,
        date: {
          $gte: new Date(year, 0, 1), // 1 ม.ค. ปีที่เลือก
          $lt: startDate, // ก่อนเดือน / ช่วงที่เลือก
        },
      }).lean();
      applyCarryToOpening(rows, accounts, carryJournals);

    /////ເຄືອນໄຫວໃນເດືອນ
      const journals = await JournalEntry.find({
        companyId,
        date: { $gte: startDate, $lte: endDate },
      }).lean();
      journals.forEach((j) => {
        const dr = j.lines.reduce(
          (s, l) => s + Number(l.debitOriginal || 0),
          0
        );
        const cr = j.lines.reduce(
          (s, l) => s + Number(l.creditOriginal || 0),
          0
        );
        if (dr !== cr) {
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
      res.status(400).json({ success: false, error: err.message });
    }
  }
);
export default router;
