// ============================================================
// Statement of Financial Position (Improved / Read-only Net Profit)
// ============================================================

import express from "express";
import Account from "../../models/accouting_system_models/Account_document.js";
import OpeningBalance from "../../models/accouting_system_models/OpeningBalance.js";
import JournalEntry from "../../models/accouting_system_models/journalEntry_models.js";
import { authenticate } from "../../middleware/auth.js";
import Period from "../../models/accouting_system_models/accountingPeriod.js";
import { resolveReportFilter } from "../../utils/balanceSheetFuntions.js";
const router = express.Router();

function buildYearRange(year) {
  const start = new Date(year, 0, 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(year, 11, 31);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}
/* ============================================================
   DATE RANGE
============================================================ */
function parseDateRange(query) {
  const { preset, startDate, endDate } = query;

  const end = endDate ? new Date(endDate) : new Date();
  end.setHours(23, 59, 59, 999);

  let start;
  if (preset) {
    start = new Date(
      end.getFullYear(),
      end.getMonth() - (Number(preset) - 1),
      1
    );
  } else if (startDate) {
    start = new Date(startDate);
  } else {
    start = new Date(end.getFullYear(), 0, 1);
  }
  start.setHours(0, 0, 0, 0);

  const prevStart = new Date(start);
  prevStart.setFullYear(prevStart.getFullYear() - 1);

  const prevEnd = new Date(end);
  prevEnd.setFullYear(prevEnd.getFullYear() - 1);

  return { start, end, prevStart, prevEnd };
}

/* ============================================================
   NET PROFIT (READ ONLY)
============================================================ */
async function getNetProfit(companyId, start, end) {
  const maxDays = 400;
  if ((end - start) / 86400000 > maxDays) throw new Error("Range too large");

  // Load only account id + code
  const accounts = await Account.find({ companyId }).select("_id code").lean();

  const accById = {};
  accounts.forEach((a) => {
    accById[String(a._id)] = a.code;
  });

  let revenue = 0;
  let expense = 0;

  // Cursor instead of full load
  const cursor = JournalEntry.find({
    companyId,
    date: { $gte: start, $lte: end },
  })
    .select("lines.accountId lines.amountLAK lines.side")
    .lean()
    .cursor();

  for await (const j of cursor) {
    for (const l of j.lines || []) {
      if (!l.accountId || !["cr", "dr"].includes(l.side)) continue;

      const code = accById[String(l.accountId)];
      if (!code) continue;

      const amt = Number(l.amountLAK || 0);
      if (!amt) continue;

      if (code.startsWith("7")) {
        revenue += l.side === "cr" ? amt : -amt;
      }

      if (code.startsWith("6")) {
        expense += l.side === "dr" ? amt : -amt;
      }
    }
  }

  return revenue - expense;
}

/* ============================================================
   PATTERN PARSER
============================================================ */
function parsePattern(pattern = "") {
  const str = String(pattern);

  if (str.length > 2000) throw new Error("Pattern too long");

  return str
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 200) // prevent huge DoS
    .map((p) => {
      if (p.includes("-")) {
        const parts = p.split("-");
        if (parts.length !== 2) return null;

        const [s, e] = parts;
        const start = Number(s);
        const end = Number(e);

        if (isNaN(start) || isNaN(end)) return null;
        if (start > end) return null;

        return {
          type: "range",
          start,
          end,
          len: s.length,
        };
      }

      return { type: "single", value: p, len: p.length };
    })
    .filter(Boolean);
}

function codeMatchesPattern(code, parsed) {
  if (!code || !parsed?.length) return false;

  const clean = String(code).trim();

  return parsed.some((p) => {
    const prefix = clean.slice(0, p.len);

    if (p.type === "single") return prefix === p.value;

    const n = Number(prefix);
    return Number.isFinite(n) && n >= p.start && n <= p.end;
  });
}

/* ============================================================
   MAPPING CONFIG
============================================================ */
const MAPPING = [
  // Current Liabilities
  {
    section: "Current_Liabilities",
    key: "cl_bank_overdrafts",
    label: " ເງິນເບີກເກິນບັນຊີ",
    pattern: "411",
    type: "liability",
  },
  {
    section: "Current_Liabilities",
    key: "cl_trade_payables",
    label: " ໜີ້ຕ້ອງສົ່ງການຄ້າ ແລະ ອື່ນໆ",
    pattern: "401,402,403,404,405,406,407,408",
    type: "liability",
  },
  {
    section: "Current_Liabilities",
    key: "cl_fin_short_borrowings",
    label: "ໜີ້ສິນການເງິນ, ເງິນກູ້ຢືມ ໄລຍະສັ້ນ",
    pattern: "412-418",
    type: "liability",
  },
  {
    section: "Current_Liabilities",
    key: "cl_state_debts",
    label: "ໜີ້ຕ້ອງສົ່ງລັດ (ຄ່າພາສີ-ອາກອນ)",
    pattern: "43",
    type: "liability",
  },
  {
    section: "Current_Liabilities",
    key: "cl_short_emp_benefit",
    label: "ພັນທະໄລຍະສັ້ນ ຜົນປະໂຫຍດຂອງພະນັກງານ",
    pattern: "420,462,463",
    type: "liability",
  },
  {
    section: "Current_Liabilities",
    key: "cl_other_current_payables",
    label: " ໜີ້ຕ້ອງສົ່ງ ໝູນວຽນອື່ນໆ",
    pattern: "421,422,44,45",
    type: "liability",
  },
  {
    section: "Current_Liabilities",
    key: "cl_short_term_provisions",
    label: "ເງິນແຮ-ໜີ້ສິນໝູນວຽນ",
    pattern: "461,464-468",
    type: "liability",
  },

  // Non-current Liabilities
  {
    section: "Non_current_Liabilities",
    key: "ncl_fin_long_borrowings",
    label: "ໜີ້ສິນທາງການເງິນ, ເງິນກູ້ຢືມ ໄລຍະຍາວ",
    pattern: "47",
    type: "liability",
  },
  {
    section: "Non_current_Liabilities",
    key: "ncl_long_emp_benefit",
    label: "ພັນທະໄລຍະຍາວ ຜົນປະໂຫຍດຂອງພະນັກງານ",
    pattern: "491",
    type: "liability",
  },
  {
    section: "Non_current_Liabilities",
    key: "ncl_other_noncurrent",
    label: "ໜີ້ຕ້ອງສົ່ງ ບໍ່ໝູນວຽນອື່ນໆ",
    pattern: "481,482",
    type: "liability",
  },
  {
    section: "Non_current_Liabilities",
    key: "ncl_provisions",
    label: " ເງິນແຮ-ໜີ້ສິນບໍ່ໝູນວຽນ",
    pattern: "492-498",
    type: "liability",
  },
  {
    section: "Non_current_Liabilities",
    key: "tax_",
    label: "ອາກອນເຍຶ່ອນຊຳລະ",
    pattern: "483",
    type: "liability",
  },
  // Equity
  {
    section: "Equity",
    key: "eq_share_capital",
    label: " ທຶນຈົດທະບຽນ",
    pattern: "301-303,308,309",
    type: "equity",
  },
  {
    section: "Equity",
    key: "eq_share_premium",
    label: "ສ່ວນເພີ່ມມູນຄ່າຮຸ່ນ",
    pattern: "304",
    type: "equity",
  },
  {
    section: "Equity",
    key: "eq_reserves",
    label: "ຄັງສຳຮອງ",
    pattern: "31",
    type: "equity",
  },
  {
    section: "Equity",
    key: "eq_retained",
    label: " ຜົນໄດ້ຮັບຍົກມາ (ກຳໄລ ຫຼື ຂາດທຶນຍົກມາ)",
    pattern: "321,329",
    type: "equity",
  },

  // 🔴 Read-only
  {
    section: "Equity",
    key: "eq_net_profit",
    label: " ຜົນໄດ້ຮັບສຸດທິ ໃນປີ",
    pattern: "",
    type: "equity",
  },
  {
    section: "Equity",
    key: "eq_2",
    label: "ພູດສ່ວນ ຂອງຜົນປະໂຫຍດສ່ວນນ້ອຍ (1)",
    pattern: "",
    type: "equity",
  },
  {
    section: "Equity",
    key: "eq_1",
    label: "ພູດສ່ວນ ຂອງກຸ່ມ (1)",
    pattern: "",
    type: "equity",
  },
];
function getSignedOpening(accType, debit, credit) {
  const d = Number(debit || 0);
  const c = Number(credit || 0);

  if (accType === "asset" || accType === "expense") {
    return d - c;
  }
  return c - d;
}

function getSignedMovement(accType, side, amount) {
  const amt = Number(amount || 0);

  if (accType === "asset" || accType === "expense") {
    return side === "dr" ? amt : -amt;
  }
  return side === "cr" ? amt : -amt;
}
////  {Math.abs(amount).toLocaleString()}
async function buildSFP({ companyId, start, end, accounts }) {
  const accById = {};
  const accByCode = {};
  accounts.forEach((a) => {
    accById[String(a._id)] = a;
    accByCode[String(a.code)] = a;
  });
  const maxDays = 400;
  if ((end - start) / 86400000 > maxDays) throw new Error("Range too large");
  /* ===== ancestor ===== */
  const ancestorCache = {};
  function getAncestors(code) {
    if (ancestorCache[code]) return ancestorCache[code];
    const set = new Set([code]);
    let cur = code;
    while (accByCode[cur]?.parentCode) {
      cur = String(accByCode[cur].parentCode);
      set.add(cur);
    }
    ancestorCache[code] = [...set];
    return ancestorCache[code];
  }

  const parsedMap = MAPPING.map((m) => ({
    ...m,
    parsed: parsePattern(m.pattern),
  }));

  const bucket = {};
  parsedMap.forEach((m) => {
    bucket[m.key] = { ...m, opening: 0, movement: 0 };
  });

  /* ===== OPENING ===== */
  const openings = await OpeningBalance.find({
    companyId,
    year: start.getFullYear(),
  })
    .select("accountId debit credit")
    .lean();

  openings.forEach((ob) => {
    const acc = accById[String(ob.accountId)];
    if (!acc) return;
    const ancestors = getAncestors(String(acc.code));
    parsedMap.forEach((m) => {
      if (ancestors.some((c) => codeMatchesPattern(c, m.parsed))) {
        bucket[m.key].opening += Number(ob.credit || 0) - Number(ob.debit || 0);
        //         bucket[m.key].opening += getSignedOpening(
        //   m.type,
        //   ob.debit,
        //   ob.credit
        // );
      }
    });
  });

  /* ===== MOVEMENT ===== */
  const journals = JournalEntry.find({
    companyId,
    date: { $gte: start, $lte: end },
  })
    .select("lines.accountId lines.amountLAK lines.side")
    .lean()
    .cursor();

  for await (const j of journals) {
    (j.lines || []).forEach((l) => {
      if (!l.accountId || !["cr", "dr"].includes(l.side)) return;

      const acc = accById[String(l.accountId)];
      if (!acc) return;

      const amt = Number(l.amountLAK || 0);
      const ancestors = getAncestors(String(acc.code));

      parsedMap.forEach((m) => {
        if (ancestors.some((c) => codeMatchesPattern(c, m.parsed))) {
          bucket[m.key].movement += l.side === "cr" ? amt : -amt;
        }
      });
    });
  }

  /* ===== NET PROFIT ===== */
  const netProfit = await getNetProfit(companyId, start, end);
  if (bucket.eq_net_profit) {
    bucket.eq_net_profit.movement = netProfit;
  }
  const lines = Object.values(bucket).map((l) => ({
    ...l,
    ending: l.opening + l.movement,
  }));

  return lines;
}

router.get(
  "/statement-of-financial-position",
  authenticate,
  async (req, res) => {
    try {
      const companyId = req.user.companyId;
      if (!req.user?.companyId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const periods = await Period.find({ companyId })
        .select("-companyId  -closedBy -createdAt -updatedAt")
        .lean();
      const accounts = await Account.find({ companyId })
        .select("-companyId  -userId -createdAt -updatedAt")
        .lean();

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
      if (year < 2000 || year > 2100)
        return res.status(400).json({ error: "Invalid year" });
      if (month && (month < 1 || month > 12)) {
        return res.status(400).json({ error: "Invalid month" });
      }
      if (isNaN(endDate.getTime()))
        return res.status(400).json({ error: "Invalid end date" });
      if (isNaN(startDate.getTime())) throw new Error("Invalid date");
      const maxRangeDays = 400;
      if ((endDate - startDate) / 86400000 > maxRangeDays) {
        return res.status(400).json({ error: "Range too large" });
      }

      /* =====================================================
         MODE 1: MONTH → COMPARE SAME MONTH LAST YEAR ✅
      ===================================================== */
      if (mode === "month") {
        const current = await buildSFP({
          companyId,
          start: startDate,
          end: endDate,
          accounts,
        });

        const prevStart = new Date(year - 1, month - 1, 1, 0, 0, 0);
        const prevEnd = new Date(year - 1, month, 0, 23, 59, 59, 999);

        const previous = await buildSFP({
          companyId,
          start: prevStart,
          end: prevEnd,
          accounts,
        });

        return res.json({
          success: true,
          comparable: true,
          mode: "month-compare",
          currentYear: `${year}-${month}`,
          previousYear: `${year - 1}-${month}`,
          data: { current, previous },
        });
      }

      /* =====================================================
         MODE 2: PRESET → COMPARE SAME RANGE LAST YEAR ✅
      ===================================================== */
      if (mode === "preset") {
        const current = await buildSFP({
          companyId,
          start: startDate,
          end: endDate,
          accounts,
        });

        const previous = await buildSFP({
          companyId,
          start: shiftYear(startDate, -1),
          end: shiftYear(endDate, -1),
          accounts,
        });

        return res.json({
          success: true,
          comparable: true,
          mode: "preset-compare",
          data: { current, previous },
        });
      }

      /* =====================================================
         MODE 3: CUSTOM RANGE → NO COMPARE
      ===================================================== */
      if (mode === "custom") {
        const current = await buildSFP({
          companyId,
          start: startDate,
          end: endDate,
          accounts,
        });

        return res.json({
          success: true,
          comparable: false,
          mode: "custom",
          data: { current },
        });
      }

      /* =====================================================
         MODE 4: USER SELECT YEAR → COMPARE YEAR
      ===================================================== */
      if (mode === "year" && year !== systemDefaultYear) {
        const current = await buildSFP({
          companyId,
          start: new Date(year, 0, 1),
          end: new Date(year, 11, 31, 23, 59, 59, 999),
          accounts,
        });

        const previous = await buildSFP({
          companyId,
          start: new Date(year - 1, 0, 1),
          end: new Date(year - 1, 11, 31, 23, 59, 59, 999),
          accounts,
        });

        return res.json({
          success: true,
          comparable: true,
          currentYear: year,
          previousYear: year - 1,
          mode: "year-compare",
          data: { current, previous },
        });
      }

      /* =====================================================
         MODE 5: DEFAULT → LAST CLOSED YEAR
      ===================================================== */
      const closedYears = periods
        .filter((p) => p.isClosed)
        .map((p) => p.year)
        .sort((a, b) => a - b);

      let previousYear;
      let currentYear;

      if (!closedYears.length) {
        // ยังไม่เคยปิดบัญชี
        currentYear = new Date().getFullYear();
        previousYear = currentYear - 1;
      } else {
        previousYear = closedYears.at(-1);
        currentYear = previousYear + 1;
      }
      const current = await buildSFP({
        companyId,
        start: new Date(currentYear, 0, 1),
        end: new Date(currentYear, 11, 31, 23, 59, 59, 999),
        accounts,
      });

      const previous = await buildSFP({
        companyId,
        start: new Date(previousYear, 0, 1),
        end: new Date(previousYear, 11, 31, 23, 59, 59, 999),
        accounts,
      });

      return res.json({
        success: true,
        comparable: true,
        currentYear,
        previousYear,
        mode: "default-compare",
        data: { current, previous },
      });
    } catch (err) {
      console.error("SFP ERROR:", err);
      res.status(500).json({
        success: false,
        error: "Internal Server Error",
      });
    }
  }
);
export default router;
