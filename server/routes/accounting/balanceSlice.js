// routes/reports/detailedBalance.js
import express from "express";
import Account from "../../models/accouting_system_models/Account_document.js";
import OpeningBalance from "../../models/accouting_system_models/OpeningBalance.js";
import JournalEntry from "../../models/accouting_system_models/journalEntry_models.js";
import { authenticate } from "../../middleware/auth.js";

const router = express.Router();

/* -------------------------------------------------------------------------- */
/*                               DATE PARSER                                  */
/* -------------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------------- */
/*                         INITIAL ACCOUNT STRUCTURE                          */
/* -------------------------------------------------------------------------- */
function initRows(accounts) {
  const rows = {};
  const mapId = {};
  const mapCode = {};
  const parentCodes = new Set();

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

    mapId[String(acc._id)] = acc.code;
    mapCode[acc.code] = acc.code;

    if (acc.parentCode) parentCodes.add(acc.parentCode);
  });

  return { rows, mapId, mapCode, parentCodes };
}

/* -------------------------------------------------------------------------- */
/*                           APPLY OPENING BALANCES                           */
/* -------------------------------------------------------------------------- */
function applyOpening(rows, accounts, openings) {
  const accMap = {};
  accounts.forEach((acc) => {
    accMap[String(acc._id)] = acc.code;
  });

  openings.forEach((ob) => {
    const code = accMap[String(ob.accountId)];
    if (!code || !rows[code]) return;
    rows[code].openingDr += Number(ob.debit || 0);
    rows[code].openingCr += Number(ob.credit || 0);
  });
}

/* -------------------------------------------------------------------------- */
/*                          APPLY JOURNAL MOVEMENTS                           */
/* -------------------------------------------------------------------------- */
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
      if (ln.side === "dr") rows[code].movementDr += amt;
      else rows[code].movementCr += amt;
    });
  });
}

/* -------------------------------------------------------------------------- */
/*                      ROLL-UP (FOR DISPLAY ONLY)                            */
/* -------------------------------------------------------------------------- */
function buildTree(rows) {
  const children = {};

  Object.values(rows).forEach((r) => {
    const parent = r.parentCode;
    if (!parent) return;

    if (!children[parent]) children[parent] = [];
    children[parent].push(r.code);
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

/* -------------------------------------------------------------------------- */
/*                        CALCULATE ENDING BALANCES                           */
/* -------------------------------------------------------------------------- */
function computeEnding(rows) {
  Object.values(rows).forEach((r) => {
    const isDr = r.normalSide === "Dr";

    const openNet = isDr
      ? r.openingDr - r.openingCr
      : r.openingCr - r.openingDr;

    const movNet = isDr
      ? r.movementDr - r.movementCr
      : r.movementCr - r.movementDr;

    const end = openNet + movNet;

    if (end >= 0) {
      if (isDr) r.endingDr = end;
      else r.endingCr = end;
    } else {
      if (isDr) r.endingCr = -end;
      else r.endingDr = -end;
    }
  });
}

/* -------------------------------------------------------------------------- */
/*                    CALCULATE TOTALS (LEAF ONLY)                            */
/* -------------------------------------------------------------------------- */
function calculateTotals(rows) {
  // สร้าง childrenMap เพื่อหา parent
  const childrenMap = {};
  Object.values(rows).forEach((r) => {
    if (r.parentCode) {
      if (!childrenMap[r.parentCode]) childrenMap[r.parentCode] = [];
      childrenMap[r.parentCode].push(r.code);
    }
  });

  // parent คือ key ของ childrenMap
  const parentCodes = new Set(Object.keys(childrenMap));

  // leaf = account ที่ไม่อยู่ใน parentCodes
  const leafRows = Object.values(rows).filter(
    (r) => !parentCodes.has(String(r.code))
  );

  const totals = {
    openingDr: 0,
    openingCr: 0,
    movementDr: 0,
    movementCr: 0,
    endingDr: 0,
    endingCr: 0,
  };

  leafRows.forEach((r) => {
    totals.openingDr += r.openingDr;
    totals.openingCr += r.openingCr;
    totals.movementDr += r.movementDr;
    totals.movementCr += r.movementCr;
    totals.endingDr += r.endingDr;
    totals.endingCr += r.endingCr;
  });

  return totals;
}

/* -------------------------------------------------------------------------- */
/*                                MAIN ROUTE                                  */
/* -------------------------------------------------------------------------- */
router.get("/detailed-balance", authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { start, end } = parseDateRange(req.query);

    const accounts = await Account.find({ companyId }).lean();
    const { rows } = initRows(accounts);

    const openings = await OpeningBalance.find({
      companyId,
      year: start.getFullYear(),
    }).lean();

    applyOpening(rows, accounts, openings);

    const journals = await JournalEntry.find({
      companyId,
      date: { $gte: start, $lte: end },
    }).lean();

    applyMovements(rows, accounts, journals);

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

    res.json({
      success: true,
      list,
      totals,
    });
  } catch (err) {
    console.error("ERROR detailed-balance:", err);
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
