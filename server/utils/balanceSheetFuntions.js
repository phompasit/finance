/* -------------------------------------------------------------------------- */
/*                           APPLY OPENING BALANCES                           */

/* -------------------------------------------------------------------------- */
export function applyOpening(rows, accounts, openings) {
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
export function applyMovements(rows, accounts, journals) {
  for (const acc of accounts) {
    const accMap = {};
    accMap[String(acc._id)] = acc.code;

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
}

/* -------------------------------------------------------------------------- */
/*                      ROLL-UP (FOR DISPLAY ONLY)                            */
/* -------------------------------------------------------------------------- */
export function buildTree(rows) {
  const children = {};

  Object.values(rows).forEach((r) => {
    const parent = r.parentCode;
    if (!parent) return;

    if (!children[parent]) children[parent] = [];
    children[parent].push(r.code);
  });

  return children;
}

export function rollUp(rows, childrenMap) {
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
export function computeEnding(rows) {
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
export function buildLine({ accountId, side, amountLAK }) {
  return {
    accountId,
    side,
    currency: "LAK",
    exchangeRate: 1,

    debitOriginal: side === "dr" ? amountLAK : 0,
    creditOriginal: side === "cr" ? amountLAK : 0,

    amountLAK,
  };
}
export function initRows(accounts) {
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
export function parseDateRange(query) {
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
function safeDate(value) {
  if (!value) return null;

  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}
export function calculateTotals(rows) {
  // สร้าง childrenMap เพื่อหา parent\
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
  const isLeafAccount = (r) => parentCodes.has(String(r.code));
  const leafRows = Object.values(rows).filter(isLeafAccount);

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
} // utils/balanceSheetFuntions.js

export function resolveReportFilter({ query = {}, periods = [] }) {
  const periodYears = periods.map((p) => Number(p.year));

  /* ===============================
     0️⃣ SAFE DATE
  =============================== */
  const safeDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  };

  /* ===============================
     1️⃣ SYSTEM DEFAULT YEAR
  =============================== */
  const systemDefaultYear =
    periodYears.length > 0
      ? Math.max(...periodYears) + 1
      : new Date().getFullYear();

  /* ===============================
     2️⃣ RESOLVE YEAR
  =============================== */
  const year = query.year ? Number(query.year) : systemDefaultYear;

  if (!Number.isInteger(year)) {
    throw new Error("Invalid year parameter");
  }

  /* ===============================
     3️⃣ MONTH FILTER (HIGHEST PRIORITY)
  =============================== */
  if (query.month) {
    const month = Number(query.month);
    if (month < 1 || month > 12) {
      throw new Error("Invalid month parameter");
    }
    console.log(year, month)
    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    return {
      year,
      month,
      startDate,
      endDate,
      systemDefaultYear,
      mode: "month",
    };
  }

  /* ===============================
     4️⃣ RESOLVE END DATE (SAFE)
  =============================== */
  let endDate = safeDate(query.endDate);
  if (endDate) {
    endDate.setHours(23, 59, 59, 999);
  } else {
    endDate = new Date(year, 11, 31, 23, 59, 59, 999);
  }

  /* ===============================
     5️⃣ PRESET (ย้อนหลัง)
  =============================== */
  if (query.preset) {
    const months = Number(query.preset);
    if (![1, 3, 6, 12].includes(months)) {
      throw new Error("Invalid preset value");
    }

    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - (months - 1));
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    return {
      year,
      preset: months,
      startDate,
      endDate,
      systemDefaultYear,
      mode: "preset",
    };
  }

  /* ===============================
     6️⃣ CUSTOM RANGE (SAFE)
  =============================== */
  const startDate = safeDate(query.startDate);
  if (startDate && endDate) {
    startDate.setHours(0, 0, 0, 0);

    return {
      year,
      startDate,
      endDate,
      systemDefaultYear,
      mode: "custom",
    };
  }

  /* ===============================
     7️⃣ DEFAULT = FULL YEAR
  =============================== */
  return {
    year,
    startDate: new Date(year, 0, 1, 0, 0, 0, 0),
    endDate,
    systemDefaultYear,
    mode: "year",
  };
}
