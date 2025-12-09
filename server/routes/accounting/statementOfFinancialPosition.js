// ============================================================
// Statement of Financial Position (Final Fixed Version - FULL)
// ============================================================

import express from "express";
import Account from "../../models/accouting_system_models/Account_document.js";
import OpeningBalance from "../../models/accouting_system_models/OpeningBalance.js";
import JournalEntry from "../../models/accouting_system_models/journalEntry_models.js";
import { authenticate } from "../../middleware/auth.js";

const router = express.Router();

/** ------------------ DATE RANGE ------------------ **/
function parseDateRange(query) {
  const { preset, startDate, endDate } = query;

  let end = endDate ? new Date(endDate) : new Date();
  end.setHours(23, 59, 59, 999);

  let start;
  if (preset) {
    const months = Number(preset);
    start = new Date(end.getFullYear(), end.getMonth() - (months - 1), 1);
  } else if (startDate) {
    start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
  } else {
    start = new Date(end.getFullYear(), 0, 1);
    start.setHours(0, 0, 0, 0);
  }

  const prevStart = new Date(start);
  prevStart.setFullYear(prevStart.getFullYear() - 1);

  const prevEnd = new Date(end);
  prevEnd.setFullYear(prevEnd.getFullYear() - 1);

  return { start, end, prevStart, prevEnd };
}

/** ---------------- PATTERN PARSER ---------------- **/
function parsePattern(pat) {
  if (!pat) return [];

  return String(pat)
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      if (p.includes("-")) {
        const [a, b] = p.split("-").map((x) => x.trim());
        return {
          type: "range",
          start: Number(a),
          end: Number(b),
          len: String(a).length,
        };
      }
      return {
        type: "single",
        value: p,
        len: String(p).length,
      };
    });
}

/** ------- MATCH CODE WITH PATTERN -------- **/
function codeMatchesPattern(codeStr, parsedPatterns) {
  if (!codeStr || !parsedPatterns.length) return false;

  const clean = String(codeStr).trim();

  for (const p of parsedPatterns) {
    const prefix = clean.slice(0, p.len);

    // debug
    console.log(
      `[MATCH] code=${clean} prefix=${prefix} pat=${JSON.stringify(p)}`
    );

    if (p.type === "single") {
      if (prefix === p.value) return true;
    }

    if (p.type === "range") {
      const num = parseInt(prefix, 10);
      if (!isNaN(num) && num >= p.start && num <= p.end) return true;
    }
  }
  return false;
}

/** ---------- MAP CONFIG ----------- **/
const MAPPING = [
  // I — Current liabilities
  {
    section: "Current Liabilities",
    key: "cl_bank_overdrafts",
    label: "Bank overdrafts",
    pattern: "411",
    type: "liability",
  },
  {
    section: "Current Liabilities",
    key: "cl_trade_payables",
    label: "Trade and other payables",
    pattern: "401,402,403,404,405,406,407,408",
    type: "liability",
  },
  {
    section: "Current Liabilities",
    key: "cl_fin_short_borrowings",
    label: "Financial liabilities, short-term borrowings",
    pattern: "412,413,414,415,416,417,418",
    type: "liability",
  },
  {
    section: "Current Liabilities",
    key: "cl_state_debts",
    label: "State-debts payable (Levies-taxes)",
    pattern: "43",
    type: "liability",
  },
  {
    section: "Current Liabilities",
    key: "cl_short_emp_benefit",
    label: "Short-term employee benefit obligations",
    pattern: "420,462,463",
    type: "liability",
  },
  {
    section: "Current Liabilities",
    key: "cl_other_current_payables",
    label: "Other current payables",
    pattern: "421,422,44,45",
    type: "liability",
  },
  {
    section: "Current Liabilities",
    key: "cl_short_term_provisions",
    label: "Short-term provisions",
    pattern: "461,464,465,466,467,468",
    type: "liability",
  },

  // II — Non-current liabilities
  {
    section: "Non-current Liabilities",
    key: "ncl_fin_long_borrowings",
    label: "Financial liabilities, long-term borrowings",
    pattern: "47",
    type: "liability",
  },
  {
    section: "Non-current Liabilities",
    key: "ncl_long_emp_benefit",
    label: "Long-term employee benefit obligations",
    pattern: "491",
    type: "liability",
  },
  {
    section: "Non-current Liabilities",
    key: "ncl_other_noncurrent",
    label: "Other non-current payables",
    pattern: "481,482",
    type: "liability",
  },
  {
    section: "Non-current Liabilities",
    key: "ncl_provisions",
    label: "Provisions non-current liabilities",
    pattern: "492,493,494,495,496,497,498",
    type: "liability",
  },
  {
    section: "Non-current Liabilities",
    key: "ncl_deferred_tax",
    label: "Deferred tax",
    pattern: "493",
    type: "liability",
  },

  // III — Equity
  {
    section: "Equity",
    key: "eq_share_capital",
    label: "Share capital",
    pattern: "301,302,303,308,309",
    type: "equity",
  },
  {
    section: "Equity",
    key: "eq_share_premium",
    label: "Share premium",
    pattern: "304",
    type: "equity",
  },
  {
    section: "Equity",
    key: "eq_reserves",
    label: "Reserves",
    pattern: "31",
    type: "equity",
  },
  {
    section: "Equity",
    key: "eq_retained",
    label: "Retained earnings",
    pattern: "321,329",
    type: "equity",
  },
  {
    section: "Equity",
    key: "eq_net_profit",
    label: "Net profit for the year",
    pattern: "331,339",
    type: "equity",
  },
  {
    section: "Equity",
    key: "eq_minority",
    label: "Minority interests",
    pattern: "",
    type: "equity",
  },
  {
    section: "Equity",
    key: "eq_group_share",
    label: "Group share",
    pattern: "",
    type: "equity",
  },
];

/** ============================================================ **/
router.get(
  "/statement-of-financial-position",
  authenticate,
  async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const { start, end, prevStart, prevEnd } = parseDateRange(req.query);

      /** Load accounts */
      const accounts = await Account.find({ companyId }).lean();

      /** Build account lookups */
      const accById = {};
      const accByCode = {};

      accounts.forEach((a) => {
        accById[String(a._id)] = a;
        accByCode[String(a.code).trim()] = a;
      });

      console.log("====== ACCOUNT MAP BUILT ======");
      function getAncestorsCodes(code) {
        const out = new Set();
        console.log("code", code);
        let curCode = String(code).trim();

        // 1) add itself
        out.add(curCode);

        // 2) climb parentCode → root
        while (true) {
          const acc = accByCode[curCode];
          if (!acc) break;

          if (!acc.parentCode) break; // reached main account

          out.add(String(acc.parentCode).trim());
          curCode = String(acc.parentCode).trim();
        }

        console.log(`[ANCESTOR] for ${code}:`, [...out]);
        return [...out];
      }
      /** Prepare mapping patterns */
      const parsedMap = MAPPING.map((m) => ({
        ...m,
        parsed: parsePattern(m.pattern),
      }));
      /** init results */
      const bucket = {};
      parsedMap.forEach((m) => {
        bucket[m.key] = {
          ...m,
          opening: 0,
          movement: 0,
          prevMovement: 0,
        };
      });
      /** ------------------ OPENING BALANCES ------------------ **/
      const openings = await OpeningBalance.find({
        companyId,
        year: start.getFullYear(),
      }).lean();

      openings.forEach((ob) => {
        const acc = accById[String(ob.accountId)];
        if (!acc) return;

        const ancestors = getAncestorsCodes(acc.code);

        parsedMap.forEach((m) => {
          if (ancestors.some((c) => codeMatchesPattern(c, m.parsed))) {
            const amount =
              m.type === "liability" || m.type === "equity"
                ? Number(ob.credit) - Number(ob.debit)
                : Number(ob.debit) - Number(ob.credit);

            bucket[m.key].opening += amount;
          }
        });
      });
      /** ------------------ CURRENT JOURNALS ------------------ **/
      const journals = await JournalEntry.find({
        companyId,
        // date: { $gte: start, $lte: end },
      }).lean();
      journals.forEach((j) => {
        j.lines.forEach((l) => {
          const accId = l.accountId?._id
            ? String(l.accountId._id)
            : String(l.accountId);
          const acc = accById[accId];
          console.log("acc ", acc);
          if (!acc) return;
          const ancestors = getAncestorsCodes(acc.code);
          const amt = Number(l.amountLAK);

          parsedMap.forEach((m) => {
            if (ancestors.some((c) => codeMatchesPattern(c, m.parsed))) {
              const net =
                m.type === "liability" || m.type === "equity"
                  ? l.side === "cr"
                    ? amt
                    : -amt
                  : l.side === "dr"
                  ? amt
                  : -amt;

              bucket[m.key].movement += net;
            }
          });
        });
      });
      /** ------------------ PREVIOUS PERIOD ------------------ **/
      const prev = await JournalEntry.find({
        companyId,
        // date: { $gte: prevStart, $lte: prevEnd },
      }).lean();

      prev.forEach((j) => {
        j.lines.forEach((l) => {
          const accId = l.accountId?._id
            ? String(l.accountId._id)
            : String(l.accountId);
          const acc = accById[accId];
          if (!acc) return;

          const ancestors = getAncestorsCodes(acc.code);
          const amt = Number(l.amountLAK);

          parsedMap.forEach((m) => {
            if (ancestors.some((c) => codeMatchesPattern(c, m.parsed))) {
              const net =
                m.type === "liability" || m.type === "equity"
                  ? l.side === "cr"
                    ? amt
                    : -amt
                  : l.side === "dr"
                  ? amt
                  : -amt;

              bucket[m.key].prevMovement += net;
            }
          });
        });
      });

      /** Build output */
      const lines = Object.values(bucket).map((m) => {
        const ending = m.opening + m.movement;
        const prevEnding = m.opening + m.prevMovement;

        return {
          ...m,
          ending,
          prevEnding,
        };
      });

      /** Section totals */
      const sections = {};
      lines.forEach((l) => {
        if (!sections[l.section]) sections[l.section] = 0;
        sections[l.section] += l.ending;
      });
      return res.json({
        success: true,
        lines,
        sections,
      });
    } catch (err) {
      console.error("SOP ERROR:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

export default router;
