// routes/reports/incomeStatement.js
import express from "express";
import Account from "../../models/accouting_system_models/Account_document.js";
import OpeningBalance from "../../models/accouting_system_models/OpeningBalance.js";
import JournalEntry from "../../models/accouting_system_models/journalEntry_models.js";
import { authenticate } from "../../middleware/auth.js";
import { resolveReportFilter } from "../../utils/balanceSheetFuntions.js";
import Period from "../../models/accouting_system_models/accountingPeriod.js";
import {
  apiLimiter,
  validateIncomeStatementQuery,
} from "../../middleware/security.js";

const router = express.Router();

/* ============================================================================
   CONSTANTS
============================================================================ */
const MAX_DATE_RANGE_DAYS = 400;
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

/* ============================================================================
   1) INCOME STATEMENT MAPPING
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
    pattern: "741,748,751,752,753-758",
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
    pattern: "651,652,653-658",
  },
  { key: "finance_income", label: "ລາຍຮັບການເງິນ", pattern: "761-768" },
  { key: "finance_cost", label: "ລາຍຈ່າຍການເງິນ", pattern: "661-668" },
  {
    key: "current_tax",
    label: "ອາກອນຕ້ອງຈ່າຍ ບ້ວງຜົນໄດ້ຮັບປົກກະຕິ",
    pattern: "691",
  },
  { key: "deferred_tax", label: "ອາກອນເຍື້ອນຊຳລະ", pattern: "694,699" },
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
   2) CATEGORY → LINE MAP
   ✅ ໃຊ້ spelling ຕາມ Schema enum ຢ່າງດຽວ
============================================================================ */
const CATEGORY_LINE_MAP = {
  ຕົ້ນທຸນຂາຍ: "cost_of_sales",
  ຕົ້ນທຸນຈຳຫນ່າຍ: "distribution_costs",
  ຕົ້ນທຸນບໍລິຫານ: "administrative_expenses",
};

function categoryToLine(cat) {
  return CATEGORY_LINE_MAP[cat] ?? null;
}

/* ============================================================================
   3) DATE HELPERS
============================================================================ */
function toDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function startOf(year, month = 0, day = 1) {
  return new Date(year, month, day, 0, 0, 0, 0);
}

function endOf(year, month, day) {
  return new Date(year, month, day, 23, 59, 59, 999);
}

function yearRange(year) {
  return { start: startOf(year, 0, 1), end: endOf(year, 11, 31) };
}

function monthRange(year, month) {
  return {
    start: startOf(year, month - 1, 1),
    end: endOf(year, month, 0), // day-0 of next month = last day of this month
  };
}

/* ============================================================================
   4) PATTERN PARSER
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

/* Pre-parse all patterns once at startup */
const PARSED_INCOME_MAPPING = INCOME_MAPPING.map((m) => ({
  ...m,
  parsed: parsePattern(m.pattern),
}));

/* ============================================================================
   5) CORE: buildIncomeStatement
============================================================================ */
async function buildIncomeStatement({ companyId, start, end }) {
  /* ---- Validate dates ---- */
  console.log(
    `[incomeStatement] Building report for company ${companyId} from ${start} to ${end}`
  );
  if (!(start instanceof Date) || isNaN(start.getTime()))
    throw new Error("Invalid start date");
  if (!(end instanceof Date) || isNaN(end.getTime()))
    throw new Error("Invalid end date");
  if (start > end) throw new Error("Start date must not be after end date");
  if ((end - start) / 86_400_000 > MAX_DATE_RANGE_DAYS)
    throw new Error(`Date range exceeds ${MAX_DATE_RANGE_DAYS} days`);

  /* ---- Load accounts ---- */
  const accounts = await Account.find({ companyId }).lean();
  if (!accounts.length) return buildEmptyResult();

  const idToAcc = Object.fromEntries(accounts.map((a) => [String(a._id), a]));

  /* ---- Initialise per-account rows ---- */
  const rows = {};
  for (const acc of accounts) {
    rows[acc.code] = {
      accountId: String(acc._id),
      code: acc.code,
      name: acc.name,
      parentCode: acc.parentCode || null,
      normalSide: acc.normalSide || "Dr",
      level: acc.level ?? null,
      openingDr: 0,
      openingCr: 0,
      movementDr: 0,
      movementCr: 0,
      endingDr: 0,
      endingCr: 0,
    };
  }

  /* ---- Opening balances ---- */
  const opens = await OpeningBalance.find({
    companyId,
    year: start.getFullYear(),
  }).lean();

  for (const ob of opens) {
    const acc = idToAcc[String(ob.accountId)];
    if (!acc || !rows[acc.code]) continue;
    rows[acc.code].openingDr += Number(ob.debit || 0);
    rows[acc.code].openingCr += Number(ob.credit || 0);
  }

  /* ---- Journal movements ---- */
  const cursor = JournalEntry.find({
    companyId,
    date: { $gte: start, $lte: end },
  })
    .select("lines.accountId lines.amountLAK lines.side")
    .lean()
    .cursor();

  for await (const j of cursor) {
    for (const ln of j.lines ?? []) {
      const acc = idToAcc[String(ln.accountId)];
      if (!acc || !rows[acc.code]) continue;
      const amt = Number(ln.amountLAK || 0);
      if (ln.side === "dr") rows[acc.code].movementDr += amt;
      else rows[acc.code].movementCr += amt;
    }
  }

  /* ---- Roll-up: child → parent (DFS, cycle-safe) ---- */
  const childrenMap = {};
  for (const r of Object.values(rows)) {
    if (!r.parentCode) continue;
    (childrenMap[r.parentCode] ??= []).push(r.code);
  }

  const rolled = new Set();
  const visiting = new Set();

  function roll(code) {
    if (!rows[code] || rolled.has(code)) return;
    if (visiting.has(code)) {
      console.warn(`[incomeStatement] Cycle detected at account ${code}`);
      return;
    }
    visiting.add(code);
    for (const child of childrenMap[code] ?? []) {
      if (!rows[child]) continue;
      roll(child);
      if (rows[code].level < 4) {
        rows[code].openingDr += rows[child].openingDr;
        rows[code].openingCr += rows[child].openingCr;
        rows[code].movementDr += rows[child].movementDr;
        rows[code].movementCr += rows[child].movementCr;
      }
    }
    visiting.delete(code);
    rolled.add(code);
  }

  for (const r of Object.values(rows)) {
    if (!r.parentCode) roll(r.code);
  }

  /* ---- Compute ending balances ---- */
  for (const r of Object.values(rows)) {
    const isDr = r.normalSide === "Dr";
    const net = isDr
      ? r.openingDr - r.openingCr + (r.movementDr - r.movementCr)
      : r.openingCr - r.openingDr + (r.movementCr - r.movementDr);

    r.endingDr = r.endingCr = 0;
    if (net >= 0) {
      isDr ? (r.endingDr = net) : (r.endingCr = net);
    } else {
      isDr ? (r.endingCr = -net) : (r.endingDr = -net);
    }
  }

  /* ---- Classify leaf accounts — ✅ SINGLE LOOP, ບໍ່ຊ້ຳ ---- */
  const leafAccounts = Object.values(rows).filter(
    (r) => r.level === 4 || r.level === 5
  );

  const lines = Object.fromEntries(
    PARSED_INCOME_MAPPING.map((m) => [
      m.key,
      { key: m.key, label: m.label, amount: 0, accounts: [] },
    ])
  );

  for (const r of leafAccounts) {
    const acc = idToAcc[r.accountId];
    if (!acc) continue;

    // Revenue (Cr normal) = positive income | Expense (Dr normal) = positive cost
    const amount =
      r.normalSide === "Cr" ? r.endingCr - r.endingDr : r.endingDr - r.endingCr;

    const hasValue = r.endingDr !== 0 || r.endingCr !== 0;
    const catLine = categoryToLine(acc.category);

    // ✅ category match → ໃສ່ ແລ້ວ continue (ຢ່າໃຫ້ pattern loop ຈັບຊ້ຳ)
    if (catLine && lines[catLine]) {
      lines[catLine].amount += amount;
      if (hasValue) lines[catLine].accounts.push(r);
      continue;
    }

    // ✅ code-pattern match
    for (const m of PARSED_INCOME_MAPPING) {
      if (m.parsed.length && matchCodeWithParsed(r.code, m.parsed)) {
        lines[m.key].amount += amount;
        if (hasValue) lines[m.key].accounts.push(r);
      }
    }
  }

  /* ---- Financial calculations ---- */
  const revenue = lines.revenue.amount;
  const cost = lines.cost_of_sales.amount;
  const gross = revenue - cost;

  const dist = lines.distribution_costs.amount;
  const admin = lines.administrative_expenses.amount;
  const otherIncome = lines.other_income.amount;
  const otherExp = lines.other_expenses.amount;
  const operating = gross + otherIncome - dist - admin - otherExp;

  const finIncome = lines.finance_income.amount;
  const finCost = lines.finance_cost.amount;
  const pbt = operating + finIncome - finCost;

  const tax = lines.current_tax.amount;
  const deferred = lines.deferred_tax.amount;
  const nets = pbt - tax - deferred;

  const ociIncome = lines.tax_before_income.amount;
  const ociExpense = lines.tax_before_expense.amount;
  const ociNet = ociIncome - ociExpense;
  const net = nets + ociNet;

  /* ---- Build output ---- */
  const outputLines = [
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
    { key: "out1", label: "ທີ່ເປັນສ່ວນຂອງ", amount: 0 },
    { key: "out2", label: "ພູດສ່ວນ ຂອງຜົນປະໂຫຍດສ່ວນນ້ອຍ (1)", amount: 0 },
    { key: "out3", label: "ພູດສ່ວນ ຂອງກຸ່ມ (1)", amount: 0 },
    lines.tax_before_income,
    lines.tax_before_expense,
    { key: "out4", label: "ຜົນໄດ້ຮັບສັງລວມ ຫຼັງອາກອນ", amount: ociNet },
    { key: "out5", label: "ຜົນໄດ້ຮັບສຸດທິໃນປີ", amount: net },
    { key: "out6", label: "ທີ່ເປັນສ່ວນຂອງ", amount: 0 },
    { key: "out7", label: "ພູດສ່ວນ ຂອງຜົນປະໂຫຍດສ່ວນນ້ອຍ (1)", amount: 0 },
    { key: "out8", label: "ພູດສ່ວນ ຂອງກຸ່ມ (1)", amount: 0 },
  ];

  return {
    lines: outputLines,
    totals: { revenue, gross, operating, pbt, nets, net },
  };
}

/* ---- Empty result when no accounts exist ---- */
function buildEmptyResult() {
  return {
    lines: [
      ...INCOME_MAPPING.map((m) => ({
        key: m.key,
        label: m.label,
        amount: 0,
        accounts: [],
      })),
      { key: "gross_profit", label: "ຜົນໄດ້ຮັບເບື້ອງຕົ້ນ", amount: 0 },
      { key: "operating_profit", label: "ຜົນໄດ້ຮັບ ໃນການທຸລະກິດ", amount: 0 },
      {
        key: "profit_before_tax",
        label: "ຜົນໄດ້ຮັບ ກ່ອນການເສຍອາກອນ",
        amount: 0,
      },
      { key: "net_profit", label: "ຜົນໄດ້ຮັບສຸດທິ ຈາກການດຳເນີນງານ", amount: 0 },
      { key: "out4", label: "ຜົນໄດ້ຮັບສັງລວມ ຫຼັງອາກອນ", amount: 0 },
      { key: "out5", label: "ຜົນໄດ້ຮັບສຸດທິໃນປີ", amount: 0 },
    ],
    totals: { revenue: 0, gross: 0, operating: 0, pbt: 0, nets: 0, net: 0 },
  };
}

/* ============================================================================
   6) INPUT VALIDATION HELPERS
============================================================================ */
function validateYear(year) {
  return Number.isInteger(year) && year >= MIN_YEAR && year <= MAX_YEAR;
}
function validateMonth(month) {
  return Number.isInteger(month) && month >= 1 && month <= 12;
}

/* ============================================================================
   7) MAIN ROUTE — GET /income-statement
============================================================================ */
router.get("/income-statement", apiLimiter, authenticate, async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId)
      return res.status(401).json({ success: false, error: "Unauthorised" });

    const periods = await Period.find({ companyId }).lean();

    const {
      year,
      month,
      startDate,
      endDate,
      mode,
      systemDefaultYear,
    } = resolveReportFilter({ query: req.query, periods });

    validateIncomeStatementQuery({
      year: req.query.year ? Number(req.query.year) : undefined,
      month: req.query.month ? Number(req.query.month) : undefined,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });

    if (year !== undefined && !validateYear(year))
      return res
        .status(400)
        .json({ success: false, error: "Invalid year (2000-2100)" });
    if (month !== undefined && !validateMonth(month))
      return res
        .status(400)
        .json({ success: false, error: "Invalid month (1-12)" });

    const closedYears = periods
      .filter((p) => p.isClosed)
      .map((p) => p.year)
      .sort((a, b) => a - b);

    /* MODE 1: MONTH COMPARE */
    if (mode === "month" && year) {
      const prevYear = year - 1;
      const [current, previous] = await Promise.all([
        buildIncomeStatement({ companyId, ...monthRange(year, month) }),
        buildIncomeStatement({ companyId, ...monthRange(prevYear, month) }),
      ]);
      return res.json({
        success: true,
        comparable: true,
        mode: "month-compare",
        currentYear: `${year}-${String(month).padStart(2, "0")}`,
        previousYear: `${prevYear}-${String(month).padStart(2, "0")}`,
        data: { current, previous },
      });
    }

    /* MODE 2: PRESET / CUSTOM RANGE */
    if (mode === "preset" || mode === "custom") {
      const start = toDate(startDate);
      const end = toDate(endDate);
      if (!start)
        return res
          .status(400)
          .json({ success: false, error: "Invalid or missing startDate" });
      if (!end)
        return res
          .status(400)
          .json({ success: false, error: "Invalid or missing endDate" });
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      const current = await buildIncomeStatement({ companyId, start, end });
      return res.json({
        success: true,
        comparable: false,
        mode,
        period: { startDate: start, endDate: end },
        year,
        data: { current },
      });
    }

    /* MODE 3: USER-SELECTED YEAR */
    if (mode === "year" && year && year !== systemDefaultYear) {
      const [current, previous] = await Promise.all([
        buildIncomeStatement({ companyId, ...yearRange(year) }),
        buildIncomeStatement({ companyId, ...yearRange(year - 1) }),
      ]);
      return res.json({
        success: true,
        comparable: true,
        mode: "year-compare",
        currentYear: year,
        previousYear: year - 1,
        data: { current, previous },
      });
    }

    /* MODE 4: DEFAULT */
    if (!closedYears.length) {
      const fallbackYear = new Date().getFullYear();
      const previousYear = fallbackYear - 1;
      const [current, previous] = await Promise.all([
        buildIncomeStatement({ companyId, ...yearRange(fallbackYear) }),
        buildIncomeStatement({ companyId, ...yearRange(previousYear) }),
      ]);
      return res.json({
        success: true,
        comparable: true,
        mode: "default-no-closed",
        currentYear: fallbackYear,
        previousYear: previousYear,
        data: { current, previous },
      });
    }

    const previousYear = closedYears.at(-1);
    const currentYear = previousYear + 1;
    const [current, previous] = await Promise.all([
      buildIncomeStatement({ companyId, ...yearRange(currentYear) }),
      buildIncomeStatement({ companyId, ...yearRange(previousYear) }),
    ]);
    return res.json({
      success: true,
      comparable: true,
      mode: "default-compare",
      currentYear,
      previousYear,
      data: { current, previous },
    });
  } catch (err) {
    console.error("[income-statement]", err.message, err.stack);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      detail: err.message,
    });
  }
});

export default router;
