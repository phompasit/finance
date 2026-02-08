// routes/reports/assets.js
import express from "express";
import Account from "../../models/accouting_system_models/Account_document.js";
import OpeningBalance from "../../models/accouting_system_models/OpeningBalance.js";
import JournalEntry from "../../models/accouting_system_models/journalEntry_models.js";
import { authenticate } from "../../middleware/auth.js";
import Period from "../../models/accouting_system_models/accountingPeriod.js";
import { resolveReportFilter } from "../../utils/balanceSheetFuntions.js";
const router = express.Router();

/* --------------------------- ASSET GROUP MAPPING -------------------------- */
const ASSET_MAPPING = [
  {
    group: "Current Assets",
    key: "cash_equivalents",
    label: "ເງິນສົດ ແລະ ທຽບເທົ່າເງິນສົດ",
    pattern: "101,102,109",
  },
  {
    group: "Current Assets",
    key: "financial_instruments_current",
    label: "ເຄື່ອງມືການເງິນ ແລະ ຊັບສິນຄ້າຍຄືກັນ",
    pattern: "111-114,1139,119",
  },
  {
    group: "Current Assets",
    key: "trade_receivables",
    label: "ລູກໜີ້ການຄ້າ",
    pattern: "121-126,129",
  },
  {
    group: "Current Assets",
    key: "inventories",
    label: "ເຄື່ອງໃນສາງ",
    pattern: "131-138,139",
  },
  {
    group: "Current Assets",
    key: "other_receivablesAA",
    label: "ໜີ້ຕ້ອງຮັບ ແລະ ຊັບສິນຄ້າຍຄືກັນ",
    pattern: "141-148,149,164,167,168",
    excludeFromTotal: true, // ⭐ สำคัญ
  },
  {
    group: "Current Assets",
    key: "other_receivables",
    label: "ລູກໜີ້ອື່ນໆ",
    pattern: "141-148,149",
  },
  {
    group: "Current Assets",
    key: "tax_assets",
    label: "ອາກອນ",
    pattern: "164,167,168",
  },
  {
    group: "Current Assets",
    key: "other_current_assets",
    label: "ຊັບສິນໝູນວຽນອື່ນໆ",
    pattern: "151-155,159,160-163,1690-1693",
  },

  // Non-current Assets
  {
    group: "Non-current Assets",
    key: "financial_assets",
    label: "ຊັບສິນການເງິນ",
    pattern: "201-208,209,290,237",
  },
  {
    group: "Non-current Assets",
    key: "invest_subsidiaries",
    label: "ເງິນລົງທຶນ ບໍລິສັດໃນເຄືອ (ໃນກຸ່ມ)",
    pattern: "210,213,216,2190,2910",
  },
  {
    group: "Non-current Assets",
    key: "invest_associates",
    label: "ເງິນລົງທຶນ ໃນວິສາຫະກິດຂາຮຸ້ນ",
    pattern: "211,217,2191,2911",
  },
  {
    group: "Non-current Assets",
    key: "jointly_controlled",
    label: "ເງິນລົງທຶນ ໃນບໍລິສັດທີ່ຄວບຄຸມຮ່ວມກັນ ",
    pattern: "212,2192,2912",
  },
  {
    group: "Non-current Assets",
    key: "investment_property",
    label: "ອະສັງຫາລິມະຊັບ ເພື່ອການລົງທຶນ ",
    pattern: "214,218,2194,2914",
  },
  {
    group: "Non-current Assets",
    key: "ppe",
    label: "ຊັບສົມບັດຄົງທີ່ ມີຕົວຕົນ ",
    pattern: "22,231,2381,241,243,282,2841,2843,292,2941,2943",
  },
  {
    group: "Non-current Assets",
    key: "biological_assets",
    label: "ຊັບສິນ ຊີວະພາບ",
    pattern: "25,285,295",
  },
  {
    group: "Non-current Assets",
    key: "goodwill",
    label: "ຄ່ານິຍົມ",
    pattern: "2427",
  },
  {
    group: "Non-current Assets",
    key: "intangible_assets",
    label: "ຊັບສົມບັດຄົງທີ່ ບໍ່ມີຕົວຕົນ",
    pattern: "232,2382,2420-2424,2428,2942",
  },
  {
    group: "Non-current Assets",
    key: "deferred_tax_assets",
    label: "ອາກອນເຍື້ອນຊຳລະ ",
    pattern: "271",
  },
];
/* ============================================================
   HELPERS
============================================================ */
const parsePattern = (pattern = "") =>
  pattern
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) =>
      p.includes("-")
        ? (([s, e]) => ({ type: "range", start: +s, end: +e, len: s.length }))(
            p.split("-")
          )
        : { type: "single", value: p, len: p.length }
    );

const matchCode = (code, parsed) => {
  const digits = String(code || "").replace(/\D/g, "");
  return parsed.some((p) => {
    const prefix = digits.slice(0, p.len);
    if (p.type === "single") return prefix === p.value;
    const n = Number(prefix);
    return n >= p.start && n <= p.end;
  });
};

/* ============================================================
   CORE BUILDER
============================================================ */
async function buildAssets({ companyId, start, end, year }) {
  const accounts = await Account.find({ companyId }).lean();
  const accById = Object.fromEntries(accounts.map((a) => [String(a._id), a]));

  const rows = {};
  accounts.forEach((a) => {
    rows[a.code] = { opening: 0, movement: 0 };
  });

  /* ================= OPENING ================= */
  const opens = await OpeningBalance.find({
    companyId,
    year,
  }).lean();

  opens.forEach((o) => {
    const acc = accById[String(o.accountId)];
    if (!acc) return;

    rows[acc.code].opening += Number(o.debit || 0) - Number(o.credit || 0);
  });

  /* ================= MOVEMENT ================= */
  const journals = await JournalEntry.find({
    companyId,
    date: { $gte: start, $lte: end },
    status: "posted",
  }).lean();

  journals.forEach((j) =>
    j.lines?.forEach((l) => {
      const acc = accById[String(l.accountId)];
      if (!acc) return;

      const amt = Number(l.amountLAK || 0);
      if (!amt) return;

      rows[acc.code].movement += l.side === "dr" ? amt : -amt;
    })
  );

  /* ================= GROUPING ================= */
  const grouped = {};

  ASSET_MAPPING.forEach((m) => {
    grouped[m.group] ||= { items: [], total: 0 };
    const parsed = parsePattern(m.pattern);

    let sum = 0;

    Object.entries(rows).forEach(([code, r]) => {
      if (matchCode(code, parsed)) {
        sum += r.opening + r.movement;
      }
    });

    /* ✅ FIX: Assets must not be negative */
    let amount = Math.round(sum);

    if (amount < 0) amount = Math.abs(amount);
    // if (amount < 0) amount = amount

    grouped[m.group].items.push({
      key: m.key,
      label: m.label,
      amount,
      excludeFromTotal: m.excludeFromTotal || false,
    });

    if (!m.excludeFromTotal) {
      grouped[m.group].total += amount;
    }
  });

  /* ================= TOTAL ================= */
  const totalAssets = Object.values(grouped).reduce((s, g) => s + g.total, 0);

  return {
    groups: grouped,
    totalAssets,
  };
}

/* ============================================================
   ROUTE
============================================================ */
router.get("/assets", authenticate, async (req, res) => {
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

    /* =====================================================
       MODE 1: MONTH COMPARE
       ex: 2025-10 vs 2024-10
    ===================================================== */
    if (mode === "month" && req.query.year) {
      const prevYear = year - 1;

      const curStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const curEnd = new Date(year, month, 0, 23, 59, 59, 999);

      const prevStart = new Date(prevYear, month - 1, 1, 0, 0, 0, 0);
      const prevEnd = new Date(prevYear, month, 0, 23, 59, 59, 999);

      const current = await buildAssets({
        companyId,
        year,
        start: curStart,
        end: curEnd,
      });

      const previous = await buildAssets({
        companyId,
        year: prevYear,
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
      const current = await buildAssets({
        companyId,
        year,
        start: startDate,
        end: endDate,
      });

      return res.json({
        success: true,
        comparable: false,
        mode,
        period: { year, startDate, endDate },
        data: { current },
      });
    }

    /* =====================================================
       MODE 3: USER SELECT YEAR → YEAR COMPARE
    ===================================================== */
    if (mode === "year" && req.query.year && year !== systemDefaultYear) {
      const current = await buildAssets({
        companyId,
        year,
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31, 23, 59, 59, 999),
      });

      const previous = await buildAssets({
        companyId,
        year: year - 1,
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
       MODE 4: DEFAULT (optional – เหมือน SFP)
    ===================================================== */
    const closedYears = periods
      .filter((p) => p.isClosed)
      .map((p) => p.year)
      .sort((a, b) => a - b);

    if (!closedYears.length) {
      return res.json({
        success: true,
        comparable: false,
        message: "ยังไม่มีปีที่ปิดบัญชี",
      });
    }

    const previousYear = closedYears.at(-1);
    const currentYear = previousYear + 1;

    const current = await buildAssets({
      companyId,
      year: currentYear,
      start: new Date(currentYear, 0, 1),
      end: new Date(currentYear, 11, 31, 23, 59, 59, 999),
    });

    const previous = await buildAssets({
      companyId,
      year: previousYear,
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
    console.error("ASSETS ERROR:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});
export default router;
