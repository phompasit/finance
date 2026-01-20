// routes/reports/incomeStatement.js
import express from "express";
import Account from "../../models/accouting_system_models/Account_document.js";
import OpeningBalance from "../../models/accouting_system_models/OpeningBalance.js";
import JournalEntry from "../../models/accouting_system_models/journalEntry_models.js";
import { authenticate } from "../../middleware/auth.js";
import { resolveReportFilter } from "../../utils/balanceSheetFuntions.js";
import Period from "../../models/accouting_system_models/accountingPeriod.js";
const router = express.Router();

/* ============================================================================
   1) INCOME STATEMENT MAPPING (ใช้เฉพาะบัญชี category = "ອື່ນໆ")
============================================================================ */
const INCOME_MAPPING = [
  {
    key: "revenue",
    label: "ລາຍຮັບຈາກກິດຈະການປົກກະຕິ",
    pattern: "701-709,711-718,719",
  },

  {
    key: "cost_of_sales",
    label: "ຕົ້ນທຶນຂາຍ",
    pattern: "601-609,611-619,621-629,631-638,641-648,681-688,782-788",
  },

  {
    key: "other_income",
    label: "ລາຍຮັບອື່ນໆ ຈາກການດຳເນີນງານປົກກະຕິ",
    pattern: "741,748,751-758",
  },

  {
    key: "distribution_costs",
    label: "ຕົ້ນທຶນຈຳໜ່າຍ",
    pattern: "601-609,611-619,621-629,631-638,641-648,681-688,782-788",
  },

  {
    key: "administrative_expenses",
    label: "ຕົ້ນທຶນບໍລິຫານ",
    pattern: "601-609,611-619,621-629,631-638,641-648,681-688,782-788",
  },

  {
    key: "other_expenses",
    label: "ຄ່າໃຊ້ຈ່າຍອື່ນໆ ໃນການທຸລະກິດ",
    pattern: "651-658",
  },

  // finance
  { key: "finance_income", label: "ລາຍຮັບການເງິນ", pattern: "761-768" },
  { key: "finance_cost", label: "ລາຍຈ່າຍການເງິນ", pattern: "661-668" },

  // tax
  {
    key: "current_tax",
    label: "ອາກອນຕ້ອງຈ່າຍ ບ້ວງຜົນໄດ້ຮັບປົກກະຕິ",
    pattern: "691",
  },
  { key: "deferred_tax", label: "ອາກອນເຍື້ອນຊຳລະ", pattern: "694,699" },

  // OCI
  {
    key: "tax_before_income",
    label: "ລາຍຮັບສັງລວມຫຼັງອາກອນ",
    pattern: "773,774,775,778",
  },
  {
    key: "tax_before_expense",
    label: "ລາຍຈ່າຍສັງລວມຫຼັງອາກອນ",
    pattern: "671-678",
  },
];

/* ============================================================================
   2) PATTERN PARSER
============================================================================ */
function parsePattern(pattern) {
  return pattern
    .split(",")
    .map((p) => {
      p = p.trim();
      if (!p) return null;

      if (p.includes("-")) {
        const [s, e] = p.split("-");
        return {
          type: "range",
          start: Number(s),
          end: Number(e),
          len: s.length,
        };
      }

      return { type: "single", value: p, len: p.length };
    })
    .filter(Boolean);
}

function matchCodeWithParsed(code, parsedPatterns) {
  if (!code) return false;
  const digits = code.replace(/\D/g, "");

  for (const p of parsedPatterns) {
    const prefix = digits.slice(0, p.len);
    if (prefix.length < p.len) continue;

    if (p.type === "single" && prefix === p.value) return true;

    if (p.type === "range") {
      const num = Number(prefix);
      if (num >= p.start && num <= p.end) return true;
    }
  }
  return false;
}

/* ============================================================================
   3) CATEGORY → INCOME STATEMENT LINE MAPPING
============================================================================ */
function categoryToLine(cat) {
  switch (cat) {
    case "ຕົ້ນທຸນຂາຍ":
      return "cost_of_sales";
    case "ຕົ້ນທຸນຈຳຫນ່າຍ":
      return "distribution_costs";
    case "ຕົ້ນທຸນບໍລິຫານ":
      return "administrative_expenses";
    default:
      return null; // fallback → pattern
  }
}

/* ============================================================================
   4) DATE RANGE
============================================================================ */
function parseDateRange(query) {
  const { preset, startDate, endDate } = query;
  const end = endDate ? new Date(endDate) : new Date();
  end.setHours(23, 59, 59, 999);

  let start;
  if (preset) {
    start = new Date(end.getFullYear(), end.getMonth() - (preset - 1), 1);
  } else if (startDate) {
    start = new Date(startDate);
  } else {
    start = new Date(end.getFullYear(), 0, 1);
  }

  start.setHours(0, 0, 0, 0);
  return { start, end };
}
async function buildIncomeStatement({ companyId, start, end }) {
  /* ------------------------ Load accounts ------------------------ */
  const accounts = await Account.find({ companyId }).lean();
  const idToAcc = {};
  accounts.forEach((acc) => {
    idToAcc[String(acc._id)] = acc;
  });

  /* ------------------------ Init rows --------------------------- */
  const rows = {};
  accounts.forEach((acc) => {
    rows[acc.code] = {
      accountId: String(acc._id),
      code: acc.code,
      name: acc.name,
      parentCode: acc.parentCode || null,
      normalSide: acc.normalSide || "Dr",
      openingDr: 0,
      openingCr: 0,
      movementDr: 0,
      movementCr: 0,
      endingDr: 0,
      endingCr: 0,
    };
  });

  /* --------------------- Opening ------------------------ */
  const opens = await OpeningBalance.find({
    companyId,
    year: start.getFullYear(),
  }).lean();

  opens.forEach((ob) => {
    const acc = idToAcc[String(ob.accountId)];
    if (!acc) return;
    const code = acc.code;

    rows[code].openingDr += Number(ob.debit || 0);
    rows[code].openingCr += Number(ob.credit || 0);
  });

  /* --------------------- Movements ------------------------ */
  const journals = await JournalEntry.find({
    companyId,
    date: { $gte: start, $lte: end },
  }).lean();

  journals.forEach((j) => {
    (j.lines || []).forEach((ln) => {
      const acc = idToAcc[String(ln.accountId)];
      if (!acc) return;
      const code = acc.code;
      const amt = Number(ln.amountLAK || 0);

      if (ln.side === "dr") rows[code].movementDr += amt;
      else rows[code].movementCr += amt;
    });
  });

  /* --------------------- Roll-up child → parent ---------------- */
  const childrenMap = {};
  Object.values(rows).forEach((r) => {
    if (!r.parentCode) return;
    if (!childrenMap[r.parentCode]) childrenMap[r.parentCode] = [];
    childrenMap[r.parentCode].push(r.code);
  });

  function roll(code) {
    const childs = childrenMap[code] || [];
    childs.forEach((c) => {
      roll(c);

      rows[code].openingDr += rows[c].openingDr;
      rows[code].openingCr += rows[c].openingCr;
      rows[code].movementDr += rows[c].movementDr;
      rows[code].movementCr += rows[c].movementCr;
    });
  }

  Object.values(rows)
    .filter((r) => !r.parentCode)
    .forEach((r) => roll(r.code));

  /* --------------------- Compute ending ------------------------ */
  Object.values(rows).forEach((r) => {
    const isDr = r.normalSide === "Dr";
    const net = isDr
      ? r.openingDr - r.openingCr + (r.movementDr - r.movementCr)
      : r.openingCr - r.openingDr + (r.movementCr - r.movementDr);

    r.endingDr = r.endingCr = 0;
    if (net >= 0) {
      if (isDr) r.endingDr = net;
      else r.endingCr = net;
    } else {
      if (isDr) r.endingCr = -net;
      else r.endingDr = -net;
    }
  });

  /* ============================================================================
       6) CALCULATE INCOME STATEMENT — LEAF ONLY!
    ============================================================================ */

  const leafAccounts = Object.values(rows).filter((r) => {
    return !Object.values(rows).some((x) => x.parentCode === r.code);
  });

  const parsedMap = INCOME_MAPPING.map((m) => ({
    ...m,
    parsed: parsePattern(m.pattern),
  }));

  const lines = {};
  parsedMap.forEach((m) => {
    lines[m.key] = {
      key: m.key,
      label: m.label,
      amount: 0,
      accounts: [],
    };
  });
  leafAccounts.forEach((r) => {
    const acc = idToAcc[r.accountId];
    if (!acc) return;

    const catLine = categoryToLine(acc.category);
    const signed = -(r.endingDr - r.endingCr);

    if (catLine) {
      lines[catLine].amount += signed;
      lines[catLine].accounts.push(r);
      return;
    }
    parsedMap.forEach((m) => {
      if (matchCodeWithParsed(r.code, m.parsed)) {
        lines[m.key].amount += signed;
        lines[m.key].accounts.push(r);
      }
    });
  });
  /* ============================================================================
       7) FINANCIAL CALCULATIONS
    ============================================================================ */
  const revenue = lines.revenue.amount;
  const cost = lines.cost_of_sales.amount;
  const gross = revenue - cost;

  const dist = lines.distribution_costs.amount;
  const admin = lines.administrative_expenses.amount;
  const otherIncome = lines.other_income.amount;
  const otherExp = lines.other_expenses.amount;

  const operating = gross + otherIncome - (dist - admin - otherExp);

  const finIncome = lines.finance_income.amount;
  const finCost = lines.finance_cost.amount;

  const pbt = operating + finIncome - finCost;

  const tax = lines.current_tax.amount;
  const deferred = lines.deferred_tax.amount;

  const nets = pbt - tax - deferred;
  ///ຫລັງອາກອນ
  const income_before_tex = lines.tax_before_income.amount;

  const expense_before_tax = lines.tax_before_expense.amount;
  const net = nets - (income_before_tex - expense_before_tax);
  return {
    lines: [
      lines.revenue,
      lines.cost_of_sales,
      { key: "gross_profit", label: "ຜົນໄດ້ຮັບເບື້ອງຕົ້ນ", amount: gross },
      lines.other_income,
      lines.distribution_costs,
      lines.administrative_expenses,
      lines.other_expenses,
      {
        key: "operating_profit",
        label: "ຜົນໄດ້ຮັບ ໃນການທຸລະກິດ",
        amount: operating,
      },
      lines.finance_income,
      lines.finance_cost,
      {
        key: "profit_before_tax",
        label: "ຜົນໄດ້ຮັບ ກ່ອນການເສຍອາກອນ",
        amount: pbt,
      },
      lines.current_tax,
      lines.deferred_tax,
      {
        key: "net_profit",
        label: "ຜົນໄດ້ຮັບສຸດທິ ຈາກການດຳເນີນງານ",
        amount: nets,
      },
      {
        key: "out1",
        label: "ທີ່ເປັນສ່ວນຂອງ",
        amount: 0,
      },
      {
        key: "out2",
        label: "ພູດສ່ວນ ຂອງຜົນປະໂຫຍດສ່ວນນ້ອຍ (1)",
        amount: 0,
      },
      {
        key: "out3",
        label: "ພູດສ່ວນ ຂອງກຸ່ມ (1)",
        amount: 0,
      },
      lines?.tax_before_income,
      lines?.tax_before_expense,
      {
        key: "out4",
        label: "ຜົນໄດ້ຮັບສັງລວມ ຫຼັງອາກອນ",
        amount: income_before_tex - expense_before_tax,
      },
      {
        key: "out5",
        label: "ຜົນໄດ້ຮັບສຸດທິໃນປີ",
        amount: net,
      },
      {
        key: "out6",
        label: "ທີ່ເປັນສ່ວນຂອງ",
        amount: 0,
      },
      {
        key: "out7",
        label: "ພູດສ່ວນ ຂອງຜົນປະໂຫຍດສ່ວນນ້ອຍ (1)",
        amount: 0,
      },
      {
        key: "out8",
        label: "ພູດສ່ວນ ຂອງກຸ່ມ (1)",
        amount: 0,
      },
    ],
    totals: { revenue, gross, operating, pbt, net },
  };
}

/* ============================================================================
   5) MAIN ROUTE — INCOME STATEMENT
============================================================================ */
router.get("/income-statement", authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const periods = await Period.find({ companyId }).lean();

    const {
      year,
      month,
      startDate,
      endDate,
      mode,
      systemDefaultYear,
    } = resolveReportFilter({
      query: req.query,
      periods,
    });

    const closedYears = periods
      .filter((p) => p.isClosed)
      .map((p) => p.year)
      .sort((a, b) => a - b);

    /* =====================================================
       MODE 1: MONTH COMPARE (year + month)
       ex: 2025-10 vs 2024-10
    ===================================================== */
    if (mode === "month" && req.query.year) {
      const prevYear = year - 1;

      const curStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const curEnd = new Date(year, month, 0, 23, 59, 59, 999);

      const prevStart = new Date(prevYear, month - 1, 1, 0, 0, 0, 0);
      const prevEnd = new Date(prevYear, month, 0, 23, 59, 59, 999);

      const current = await buildIncomeStatement({
        companyId,
        start: curStart,
        end: curEnd,
      });

      const previous = await buildIncomeStatement({
        companyId,
        start: prevStart,
        end: prevEnd,
      });

      return res.json({
        success: true,
        comparable: true,
        mode: "month-compare",
        currentYear: `${year}-${String(month).padStart(2, "0")}`,
        previousYear: `${prevYear}-${String(month).padStart(2, "0")}`,
        data: { current, previous },
      });
    }

    /* =====================================================
       MODE 2: PRESET / CUSTOM RANGE (NO COMPARE)
    ===================================================== */
    if (mode === "preset" || mode === "custom") {
      const current = await buildIncomeStatement({
        companyId,
        start: startDate,
        end: endDate,
      });

      return res.json({
        success: true,
        comparable: false,
        mode,
        year,
        data: { current },
      });
    }

    /* =====================================================
       MODE 3: USER SELECT YEAR → YEAR COMPARE
    ===================================================== */
    if (mode === "year" && req.query.year && year !== systemDefaultYear) {
      const current = await buildIncomeStatement({
        companyId,
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31, 23, 59, 59, 999),
      });

      const previous = await buildIncomeStatement({
        companyId,
        start: new Date(year - 1, 0, 1),
        end: new Date(year - 1, 11, 31, 23, 59, 59, 999),
      });

      return res.json({
        success: true,
        comparable: true,
        mode: "year-compare",
        currentYear: year,
        previousYear: year - 1,
        data: { current, previous },
      });
    }

    /* =====================================================
       MODE 4: DEFAULT → LAST CLOSED YEAR COMPARE
    ===================================================== */
    if (!closedYears.length) {
      return res.json({
        success: true,
        comparable: false,
        message: "ยังไม่มีปีที่ปิดบัญชี",
      });
    }

    const previousYear = closedYears.at(-1);
    const currentYear = previousYear + 1;

    const current = await buildIncomeStatement({
      companyId,
      start: new Date(currentYear, 0, 1),
      end: new Date(currentYear, 11, 31, 23, 59, 59, 999),
    });

    const previous = await buildIncomeStatement({
      companyId,
      start: new Date(previousYear, 0, 1),
      end: new Date(previousYear, 11, 31, 23, 59, 59, 999),
    });

    return res.json({
      success: true,
      comparable: true,
      mode: "default-compare",
      currentYear,
      previousYear,
      data: { current, previous },
    });
  } catch (err) {
    console.error("income-statement error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
