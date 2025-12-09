// routes/reports/assets.js
import express from "express";
import Account from "../../models/accouting_system_models/Account_document.js";
import OpeningBalance from "../../models/accouting_system_models/OpeningBalance.js";
import JournalEntry from "../../models/accouting_system_models/journalEntry_models.js";
import { authenticate } from "../../middleware/auth.js";

const router = express.Router();

/* --------------------------- ASSET GROUP MAPPING -------------------------- */
const ASSET_MAPPING = [
  { group: "Current Assets", key: "cash_equivalents", label: "Cash & Cash equivalents", pattern: "101,102,109" },
  { group: "Current Assets", key: "financial_instruments_current", label: "Financial instruments (current)", pattern: "111-114,1139,119" },
  { group: "Current Assets", key: "trade_receivables", label: "Trade receivables", pattern: "121-126,129" },
  { group: "Current Assets", key: "inventories", label: "Inventories", pattern: "131-138,139" },
  { group: "Current Assets", key: "other_receivables", label: "Other receivables & receivable from related parties", pattern: "141-148,149" },
  { group: "Current Assets", key: "tax_assets", label: "Tax assets", pattern: "164,167,168" },
  { group: "Current Assets", key: "other_current_assets", label: "Other current assets", pattern: "151-155,159,160-163,1690-1693" },

  // Non-current Assets
  { group: "Non-current Assets", key: "financial_assets", label: "Financial assets (non-current)", pattern: "201-208,209,290,237" },
  { group: "Non-current Assets", key: "invest_subsidiaries", label: "Investments in subsidiaries", pattern: "210,213,216,2190,2910" },
  { group: "Non-current Assets", key: "invest_associates", label: "Investments in associates", pattern: "211,217,2191,2911" },
  { group: "Non-current Assets", key: "jointly_controlled", label: "Investments in jointly controlled entities", pattern: "212,2192,2912" },
  { group: "Non-current Assets", key: "investment_property", label: "Investment property & long-term investments", pattern: "214,218,2194,2914" },
  { group: "Non-current Assets", key: "ppe", label: "Property, Plant and Equipment", pattern: "22,231,2381,241,243,282,2841,2843,292,2941,2943" },
  { group: "Non-current Assets", key: "biological_assets", label: "Biological assets & related", pattern: "25,285,295" },
  { group: "Non-current Assets", key: "goodwill", label: "Goodwill", pattern: "2427" },
  { group: "Non-current Assets", key: "intangible_assets", label: "Intangible assets", pattern: "232,2382,2420-2424,2428,284,2942" },
  { group: "Non-current Assets", key: "deferred_tax_assets", label: "Deferred tax assets", pattern: "271" },
];

/* --------------------------- Pattern parsing -------------------------- */
function parsePattern(pattern) {
  return pattern.split(",").map((p) => {
    p = p.trim();
    if (!p) return null;

    if (p.includes("-")) {
      const [s, e] = p.split("-").map((x) => Number(x));
      const len = String(p.split("-")[0]).length;
      return { type: "range", start: s, end: e, len };
    }

    return { type: "single", value: p, len: p.length };
  }).filter(Boolean);
}

function matchCodeWithParsed(code, parsedPatterns) {
  const digits = (code || "").replace(/\D/g, "");
  if (!digits) return false;

  for (const p of parsedPatterns) {
    const prefix = digits.slice(0, p.len);
    if (p.type === "single") {
      if (prefix === p.value) return true;
    } else if (p.type === "range") {
      const num = Number(prefix);
      if (!isNaN(num) && num >= p.start && num <= p.end) return true;
    }
  }
  return false;
}

/* ---------------------------- Date range ---------------------------- */
function parseDateRange(query) {
  const { preset, startDate, endDate } = query;
  const end = endDate ? new Date(endDate) : new Date();
  end.setHours(23, 59, 59, 999);
  let start;
  if (preset) {
    const months = Number(preset);
    start = new Date(end.getFullYear(), end.getMonth() - (months - 1), 1);
  } else if (startDate) {
    start = new Date(startDate);
  } else {
    start = new Date(end.getFullYear(), 0, 1);
  }
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

/* ------------------------------- MAIN ROUTE ------------------------------- */
router.get("/assets", authenticate, async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ success: false, error: "No companyId" });

    const { start, end } = parseDateRange(req.query);

    const accounts = await Account.find({ companyId }).lean();

    // quick maps
    const idToAcc = {};
    accounts.forEach((a) => (idToAcc[String(a._id)] = a));

    // init rows
    const rows = {};
    accounts.forEach((a) => {
      rows[a.code] = {
        accountId: String(a._id),
        code: a.code,
        name: a.name,
        parentCode: a.parentCode || null,
        normalSide: a.normalSide || "Dr",
        openingDr: 0,
        openingCr: 0,
        movementDr: 0,
        movementCr: 0,
        endingDr: 0,
        endingCr: 0,
      };
    });

    // openings
    const opens = await OpeningBalance.find({ companyId, year: start.getFullYear() }).lean();
    opens.forEach((ob) => {
      const acc = idToAcc[String(ob.accountId)];
      if (!acc) return;
      const code = acc.code;
      if (!rows[code]) return;
      rows[code].openingDr += Number(ob.debit || 0);
      rows[code].openingCr += Number(ob.credit || 0);
    });

    // journals within period
    const journals = await JournalEntry.find({ companyId, date: { $gte: start, $lte: end } }).lean();
    journals.forEach((j) => {
      (j.lines || []).forEach((ln) => {
        const acc = idToAcc[String(ln.accountId)];
        if (!acc) return;
        const code = acc.code;
        if (!rows[code]) return;
        const amt = Number(ln.amountLAK || 0);
        if (ln.side === "dr") rows[code].movementDr += amt;
        else rows[code].movementCr += amt;
      });
    });

    // build children map and rollup (for display/parent totals only)
    const childrenMap = {};
    Object.values(rows).forEach((r) => {
      if (r.parentCode) {
        if (!childrenMap[r.parentCode]) childrenMap[r.parentCode] = [];
        childrenMap[r.parentCode].push(r.code);
      }
    });

    // DFS roll-up from deepest to top
    const rolled = new Set();
    function rollUp(code) {
      if (rolled.has(code)) return;
      const children = childrenMap[code] || [];
      for (const child of children) {
        rollUp(child);
        if (!rows[child] || !rows[code]) continue;
        rows[code].openingDr += rows[child].openingDr;
        rows[code].openingCr += rows[child].openingCr;
        rows[code].movementDr += rows[child].movementDr;
        rows[code].movementCr += rows[child].movementCr;
      }
      rolled.add(code);
    }
    Object.values(rows).filter(r => !r.parentCode).forEach(r => rollUp(r.code));

    // compute ending balance
    Object.values(rows).forEach((r) => {
      const isDr = r.normalSide === "Dr";
      const openNet = isDr ? r.openingDr - r.openingCr : r.openingCr - r.openingDr;
      const moveNet = isDr ? r.movementDr - r.movementCr : r.movementCr - r.movementDr;
      const net = openNet + moveNet;

      r.endingDr = 0; r.endingCr = 0;
      if (net >= 0) {
        if (isDr) r.endingDr = Math.round(net);
        else r.endingCr = Math.round(net);
      } else {
        if (isDr) r.endingCr = Math.round(-net);
        else r.endingDr = Math.round(-net);
      }
      r.openingDr = Math.round(r.openingDr || 0);
      r.openingCr = Math.round(r.openingCr || 0);
      r.movementDr = Math.round(r.movementDr || 0);
      r.movementCr = Math.round(r.movementCr || 0);
    });

    // only leaf accounts for group sums
    const parentCodes = new Set(Object.keys(childrenMap));
    const parsedMapping = ASSET_MAPPING.map(m => ({ ...m, parsed: parsePattern(m.pattern) }));

    const grouped = {};
    for (const m of parsedMapping) {
      if (!grouped[m.group]) grouped[m.group] = { items: [], total: 0 };
      let sum = 0;
      const accountsMatched = [];

      Object.values(rows).forEach(r => {
        if (parentCodes.has(r.code)) return; // skip parent
        if (matchCodeWithParsed(r.code, m.parsed)) {
          const val = r.endingDr - r.endingCr;
          sum += val;
          accountsMatched.push({
            code: r.code,
            name: r.name,
            endingDr: r.endingDr,
            endingCr: r.endingCr,
            openingDr: r.openingDr,
            openingCr: r.openingCr,
            movementDr: r.movementDr,
            movementCr: r.movementCr,
          });
        }
      });

      grouped[m.group].items.push({
        key: m.key,
        label: m.label,
        amount: Math.round(sum),
        accounts: accountsMatched,
      });
      grouped[m.group].total += Math.round(sum);
    }

    // build result
    const result = { groups: {}, totalAssets: 0, dateRange: { start, end } };
    Object.keys(grouped).forEach(g => {
      result.groups[g] = { items: grouped[g].items, total: grouped[g].total };
      result.totalAssets += grouped[g].total;
    });

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error("assets report error:", err);
    return res.status(400).json({ success: false, error: err.message || "Server error" });
  }
});

export default router;
