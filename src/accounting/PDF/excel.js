import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// ═══════════════════════════════════════════════════════════════
// SHARED CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MONEY_FMT     = "#,##0.00;[Red](#,##0.00)";
const MIME_XLSX     = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const FONT_BASE     = { name: "Noto Sans Lao", size: 11 };
const FONT_BOLD     = { name: "Noto Sans Lao", size: 11, bold: true };

const BORDER_THIN   = { style: "thin" };
const BORDER_DOUBLE = { style: "double" };

const BORDER_ALL = {
  top: BORDER_THIN, bottom: BORDER_THIN,
  left: BORDER_THIN, right: BORDER_THIN,
};
const BORDER_HEADER = {
  top: BORDER_DOUBLE, bottom: BORDER_DOUBLE,
  left: BORDER_THIN,  right: BORDER_THIN,
};
const BORDER_SUBTOTAL = {
  top: BORDER_DOUBLE, bottom: BORDER_THIN,
  left: BORDER_THIN,  right: BORDER_THIN,
};
const BORDER_GRANDTOTAL = {
  top: BORDER_DOUBLE, bottom: BORDER_DOUBLE,
  left: BORDER_THIN,  right: BORDER_THIN,
};

const FILL_GRAY_LIGHT = solidFill("FFF0F0F0");
const FILL_GRAY       = solidFill("FFE4E4E4");
const FILL_BOLD_ROW   = solidFill("FFFAFAFA");

/** Labels whose income-statement rows render bold */
const BOLD_KEYS = new Set([
  "gross_profit", "operating_profit", "profit_before_tax", "net_profit", "out5",
]);
const BOLD_LABELS = new Set([
  "Gross Profit", "Operating Profit (Loss)", "Profit or Loss before Tax",
  "Profit or Loss for the Year Net of Tax", "Other Comprehensive Income Net of Tax",
  "Profit or Loss for the Period Net of Tax",
  "ຜົນໄດ້ຮັບເບື້ອງຕົ້ນ", "ຜົນໄດ້ຮັບ ໃນການທຸລະກິດ", "ຜົນໄດ້ຮັບ ກ່ອນການເສຍອາກອນ",
  "ຜົນໄດ້ຮັບສຸດທິ ຈາກການດຳເນີນງານ", "ຜົນໄດ້ຮັບສັງລວມ ຫຼັງອາກອນ", "ຜົນໄດ້ຮັບສຸດທິໃນປີ",
]);

/** Section display names */
const GROUP_LABEL_MAP = {
  "Current Assets":        "ຊັບສິນໝູນວຽນ",
  "Non-Current Assets":    "ຊັບສິນບໍ່ໝູນວຽນ",
  "Current_Liabilities":   "ໜີ້ສິນໝູນວຽນ",
  "Non_current_Liabilities": "ໜີ້ສິນບໍ່ໝູນວຽນ",
  "Equity":                "ທຶນ",
};

/** UI parent key → children keys */
const UI_GROUP_MAP = {
  other_receivablesAA: ["other_receivables", "tax_assets", "other_current_assets"],
};

// ═══════════════════════════════════════════════════════════════
// SHARED PURE UTILITIES
// ═══════════════════════════════════════════════════════════════

/** Date / ISO string → "dd/mm/yyyy" */
function formatDate(d) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  return [
    String(date.getDate()).padStart(2, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    date.getFullYear(),
  ].join("/");
}

/** "2025-3" → "3/2025"  |  anything else → as-is */
function formatToMonthYear(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{1,2}$/.test(value))
    return value ?? "";
  const [year, month] = value.split("-");
  return `${Number(month)}/${year}`;
}

/** Today as "dd/mm/yyyy" */
function todayStr() {
  const t = new Date();
  return [
    String(t.getDate()).padStart(2, "0"),
    String(t.getMonth() + 1).padStart(2, "0"),
    t.getFullYear(),
  ].join("/");
}

/** Safe numeric coercion — returns null for empty/invalid */
function num(n) {
  if (n === null || n === undefined || n === "") return null;
  const v = Number(n);
  return isNaN(v) ? null : v;
}

/** Build ExcelJS solid fill object */
function solidFill(argb) {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

// ─────────────────────────────────────────────────────────────
// Period / column label builders  (shared across all 3 exports)
// ─────────────────────────────────────────────────────────────

/**
 * Subtitle shown below the report title.
 * Mirrors IncomePrint / FinancialStatement periodText logic.
 */
function buildPeriodText({ mode, currentYear, previousYear, period, start, end, activeFilterLabel = "" }) {
  const startDate = period?.startDate ?? period?.statDate;
  const endDate   = period?.endDate;

  if (startDate && endDate)
    return `ແຕ່ວັນທີ: ${formatDate(startDate)} ຫາ: ${formatDate(endDate)}`;

  if (mode === "month-compare") {
    const yr = currentYear ?? previousYear;
    return yr != null ? `ປະຈຳເດືອນ ${formatToMonthYear(yr)}` : activeFilterLabel;
  }
  if (mode === "custom") {
    return startDate && endDate
      ? `ແຕ່ວັນທີ: ${formatDate(startDate)} ຫາ: ${formatDate(endDate)}`
      : activeFilterLabel;
  }
  if (mode === "default-compare") {
    const yr = currentYear ?? previousYear;
    return yr != null ? `ປະຈຳປີ ${yr}` : activeFilterLabel;
  }
  return activeFilterLabel;
}

/**
 * Column header label (current or previous).
 * Mirrors IncomePrint currentColLabel / previousColLabel logic.
 */
function buildColLabel({ mode, year, isCurrentCol, period, activeFilterLabel = "" }) {
  const startDate = period?.startDate ?? period?.statDate;
  const endDate   = period?.endDate;

  switch (mode) {
    case "month-compare":
      return year != null
        ? `${isCurrentCol ? "ງວດປັດຈຸບັນ" : "ງວດກ່ອນ"}\n${formatToMonthYear(year)}\nມູນຄ່າຍັງເຫຼືອ`
        : `${activeFilterLabel}\nມູນຄ່າຍັງເຫຼືອ`;

    case "default-compare":
      return year != null
        ? `ປະຈຳປີ ${year}\nມູນຄ່າຍັງເຫຼືອ`
        : `${activeFilterLabel}\nມູນຄ່າຍັງເຫຼືອ`;

    case "custom":
      if (!isCurrentCol) return `${activeFilterLabel}\nມູນຄ່າຍັງເຫຼືອ`;
      return startDate && endDate
        ? `ແຕ່ ${formatDate(startDate)}\nຫາ ${formatDate(endDate)}\nມູນຄ່າຍັງເຫຼືອ`
        : `${activeFilterLabel}\nມູນຄ່າຍັງເຫຼືອ`;

    default:
      return `${activeFilterLabel || year || ""}\nມູນຄ່າຍັງເຫຼືອ`;
  }
}

// ─────────────────────────────────────────────────────────────
// Data helpers
// ─────────────────────────────────────────────────────────────

/** Merge cur+prev arrays by item.key → [{ key, cur, prev }] */
function mergeItems(curItems = [], prevItems = []) {
  const map = new Map();
  curItems.forEach((c)  => map.set(c.key, { key: c.key, cur: c,    prev: null }));
  prevItems.forEach((p) => {
    if (map.has(p.key)) map.get(p.key).prev = p;
    else map.set(p.key, { key: p.key, cur: null, prev: p });
  });
  return [...map.values()];
}

/**
 * Annotate rows with isParent/children per UI_GROUP_MAP.
 * Preserves original order — parent stays at its position.
 */
function buildUIRows(rows) {
  const childKeySet = new Set(Object.values(UI_GROUP_MAP).flat());
  return rows
    .filter((row) => !childKeySet.has(row.key))
    .map((row) => {
      const childKeys = UI_GROUP_MAP[row.key];
      if (!childKeys) return row;
      return {
        ...row,
        isParent: true,
        children: childKeys.map((k) => rows.find((r) => r.key === k)).filter(Boolean),
      };
    });
}

/** Group flat array by item.section → { [section]: { items[], total } } */
function groupBySection(data = []) {
  return data.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = { items: [], total: 0 };
    acc[item.section].items.push(item);
    acc[item.section].total += Number(item.ending ?? 0);
    return acc;
  }, {});
}

// ─────────────────────────────────────────────────────────────
// Excel cell / row helpers
// ─────────────────────────────────────────────────────────────

function setCenterBold(cell, size) {
  cell.font      = { bold: true, ...(size ? { size } : {}) };
  cell.alignment = { horizontal: "center", vertical: "middle" };
}

/** Apply border + numFmt + alignment to amount columns (col ≥ firstNumCol) */
function styleDataRow(row, colCount, firstNumCol = 3) {
  row.eachCell({ includeEmpty: true }, (cell, col) => {
    if (col > colCount) return;
    cell.border = BORDER_ALL;
    if (col >= firstNumCol) {
      cell.numFmt    = MONEY_FMT;
      cell.alignment = { horizontal: "right", vertical: "middle" };
    } else {
      cell.alignment = { vertical: "middle" };
    }
  });
}

/** Fill cols 1..colCount of a row with a solid color */
function fillRow(row, argb, colCount = 4) {
  for (let c = 1; c <= colCount; c++) {
    row.getCell(c).fill = solidFill(argb);
  }
}

/**
 * Write the standard Lao gov header block used by all reports.
 * Returns the next free row number.
 */
function writeGovHeader(ws, { company, reportTitle, periodText, colSpan = 4 }) {
  const last = String.fromCharCode(64 + colSpan); // "D" for 4 cols, "I" for 9 cols

  // Row 1 — gov title
  ws.mergeCells(`A1:${last}1`);
  ws.getCell("A1").value = "ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ";
  setCenterBold(ws.getCell("A1"), 12);

  // Row 2 — slogan
  ws.mergeCells(`A2:${last}2`);
  ws.getCell("A2").value = "ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ";
  setCenterBold(ws.getCell("A2"));

  // Rows 3-5 — company info (left) | report title (right)
  ws.getCell("A3").value = company.name    ?? "";
  ws.getCell("A3").font  = FONT_BOLD;
  ws.getCell("A4").value = company.address ?? "";
  ws.getCell("A5").value = company.phone   ? `ເບີໂທ: ${company.phone}` : "";

  const midCol  = colSpan >= 4 ? "C" : "B";
  const midLast = last;

  ws.mergeCells(`${midCol}3:${midLast}3`);
  ws.getCell(`${midCol}3`).value = reportTitle;
  setCenterBold(ws.getCell(`${midCol}3`), 14);

  ws.mergeCells(`${midCol}4:${midLast}4`);
  ws.getCell(`${midCol}4`).value     = periodText;
  ws.getCell(`${midCol}4`).alignment = { horizontal: "center" };

  ws.mergeCells(`${midCol}5:${midLast}5`);
  ws.getCell(`${midCol}5`).value     = "(ຫົວໜ່ວຍເງິນ: LAK)";
  ws.getCell(`${midCol}5`).font      = { italic: true, size: 8 };
  ws.getCell(`${midCol}5`).alignment = { horizontal: "right" };

  return 6; // next available row
}

/** Write signature + date footer block */
function writeFooter(ws, colCount = 4) {
  ws.addRow([]);

  const dateRow = ws.addRow(Array(colCount).fill(""));
  dateRow.getCell(colCount).value     = `ວັນທີ: ${todayStr()}`;
  dateRow.getCell(colCount).alignment = { horizontal: "right" };

  ws.addRow([]);

  const titles  = ["ຜູ້ອຳນວຍການ", "ຫົວໜ້າບັນຊີ", "ຜູ້ສະຫຼຸບ"];
  const signRow = ws.addRow(
    colCount === 4
      ? [titles[0], "", titles[1], titles[2]]
      : [titles[0], titles[1], titles[2]]
  );

  signRow.eachCell({ includeEmpty: true }, (cell, col) => {
    if (col > colCount) return;
    cell.font      = FONT_BOLD;
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
}

/** Write a standard table-header row */
function writeTableHeader(ws, labels, colCount) {
  ws.addRow([]); // spacer
  const hr = ws.addRow(labels);
  hr.height = 40;
  hr.eachCell({ includeEmpty: true }, (cell, col) => {
    if (col > colCount) return;
    cell.font      = { bold: true, size: 10 };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border    = BORDER_HEADER;
    cell.fill      = FILL_GRAY_LIGHT;
  });
}

/** Download workbook as .xlsx */
async function saveWorkbook(wb, filename) {
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer], { type: MIME_XLSX }), filename);
}

// ═══════════════════════════════════════════════════════════════
// 1. GENERAL LEDGER  (exportGeneralLedgerToExcel)
// ═══════════════════════════════════════════════════════════════

export const exportGeneralLedgerToExcel = async ({ data, user, dateRange, activeTab }) => {
  const HEADINGS = {
    CASH: "ປື້ມຕິດຕາມບັນຊີເງິນສົດ",
    BANK: "ປື້ມຕິດຕາມບັນຊີເງິນຝາກ",
    ALL:  "ປື້ມຕິດຕາມບັນຊີໃຫຍ່ແຍກປະເພດ",
  };
  const title = HEADINGS[activeTab] ?? "";

  const wb = new ExcelJS.Workbook();
  wb.creator = "SmartAcc";
  wb.created = new Date();

  const accounts = Array.isArray(data) ? data : [data];

  accounts.forEach((accData) => {
    const ws = wb.addWorksheet(accData.accountCode ?? "Ledger", {
      views: [{ state: "frozen", ySplit: 12 }],
    });

    ws.columns = [
      { width: 5  }, // #
      { width: 12 }, // date
      { width: 18 }, // ref
      { width: 40 }, // description
      { width: 16 }, // original amount
      { width: 14 }, // exchange rate
      { width: 16 }, // Dr
      { width: 16 }, // Cr
      { width: 18 }, // balance
    ];

    const COL = 9;

    // ── Gov header ──────────────────────────────────
    ws.mergeCells("A1:I1");
    ws.getCell("A1").value = "ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ";
    setCenterBold(ws.getCell("A1"), 12);

    ws.mergeCells("A2:I2");
    ws.getCell("A2").value = "ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ";
    setCenterBold(ws.getCell("A2"));

    // ── Company info ────────────────────────────────
    const company = user?.companyId ?? {};
    ws.mergeCells("A4:F4"); ws.getCell("A4").value = company.name    ?? "";
    ws.mergeCells("A5:F5"); ws.getCell("A5").value = `ທີ່ຢູ່: ${company.address ?? ""}`;
    ws.mergeCells("A6:F6"); ws.getCell("A6").value = `ເບີໂທ: ${company.phone ?? ""}`;

    ws.mergeCells("G5:I5"); ws.getCell("G5").value = "ເລກທີ່.............................";
    ws.mergeCells("G6:I6"); ws.getCell("G6").value = "ວັນທີ່............/....../...........";
    ["G5", "G6"].forEach((c) => (ws.getCell(c).alignment = { horizontal: "right" }));

    // ── Report title ────────────────────────────────
    ws.mergeCells("A8:I8");
    ws.getCell("A8").value = title;
    setCenterBold(ws.getCell("A8"), 16);

    ws.mergeCells("A9:I9");
    ws.getCell("A9").value = `ໄລຍະລາຍງານ: ${dateRange ?? ""}`;
    ws.getCell("A9").font      = FONT_BOLD;
    ws.getCell("A9").alignment = { horizontal: "center" };

    ws.mergeCells("A11:F11");
    ws.getCell("A11").value = `${accData.accountCode} - ${accData.accountName}`;
    ws.getCell("A11").font  = FONT_BOLD;
    ws.getCell("I11").value = "ສະກຸນ: LAK";
    ws.getCell("I11").font  = FONT_BOLD;
    ws.getCell("I11").alignment = { horizontal: "right" };

    // ── Table header ────────────────────────────────
    const HEADERS = ["#", "ວັນທີ່", "ອ້າງອີງ", "ເນື້ອໃນລາຍການ",
                      "ມູນຄ່າເດີມ", "ອັດຕາແລກປ່ຽນ", "ໜີ້ (Dr)", "ມີ (Cr)", "ຍອດເຫຼືອ"];

    const hr = ws.getRow(12);
    hr.values = HEADERS;
    hr.eachCell((cell) => {
      cell.font      = FONT_BOLD;
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border    = BORDER_ALL;
      cell.fill      = solidFill("FFD9D9D9");
    });

    // ── Rows ────────────────────────────────────────
    let lineNo = 1;

    const styleRow = (row) => {
      row.eachCell((cell, col) => {
        cell.font   = FONT_BASE;
        cell.border = BORDER_ALL;
        cell.alignment = col >= 5
          ? { horizontal: "right",  vertical: "middle" }
          : { horizontal: "center", vertical: "middle" };
        if ([5, 7, 8, 9].includes(col)) cell.numFmt = "#,##0.00;[Red]-#,##0.00";
      });
    };

    // Opening balance
    const opening = accData.rows?.find((r) => r.description === "Opening Balance");
    if (opening) {
      const r = ws.addRow([lineNo++, "", "-", "ຍອດຍົກມາ", null, null, null, null, num(opening.balance)]);
      styleRow(r);
    }

    // Transactions
    (accData.rows ?? [])
      .filter((r) => r.description !== "Opening Balance")
      .forEach((t) => {
        const original = t.side === "dr" ? t.debitOriginal : t.creditOriginal;
        const r = ws.addRow([
          lineNo++,
          formatDate(t.date),
          t.reference  ?? "",
          t.description ?? "",
          num(original),
          t.exchangeRate ?? null,
          num(t.dr),
          num(t.cr),
          num(t.balance),
        ]);
        styleRow(r);
      });

    // ── Footer ──────────────────────────────────────
    ws.addRow([]);
    const f = ws.addRow([]);
    ws.mergeCells(`F${f.number}:I${f.number}`);
    ws.getCell(`F${f.number}`).value     = "ທີ່............................., ວັນທີ່......../......./.........";
    ws.getCell(`F${f.number}`).alignment = { horizontal: "right" };

    ws.addRow([]);
    const sign = ws.addRow(["ຜູ້ອຳນວຍການ", "", "", "ຫົວໜ້າບັນຊີ", "", "", "ຜູ້ສະຫຼຸບ"]);
    ws.mergeCells(`A${sign.number}:C${sign.number}`);
    ws.mergeCells(`D${sign.number}:F${sign.number}`);
    ws.mergeCells(`G${sign.number}:I${sign.number}`);
    ["A", "D", "G"].forEach((c) => {
      ws.getCell(`${c}${sign.number}`).font      = FONT_BOLD;
      ws.getCell(`${c}${sign.number}`).alignment = { horizontal: "center" };
    });
  });

  await saveWorkbook(wb, `general-ledger-${todayStr().replace(/\//g, "-")}.xlsx`);
};

// ═══════════════════════════════════════════════════════════════
// 2. TRIAL BALANCE  (exportBalanceToExcel)
// ═══════════════════════════════════════════════════════════════

export const exportBalanceToExcel = async ({ user, data, activeFilterLabel, heading, totals }) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SmartAcc";
  wb.created = new Date();

  const ws = wb.addWorksheet("Trial Balance");
  ws.columns = [
    { width: 26 }, { width: 18 },
    { width: 16 }, { width: 16 },
    { width: 16 }, { width: 16 },
    { width: 18 }, { width: 18 },
  ];

  const COL = 8;
  const company = user?.companyId ?? {};

  // ── Gov header (9-col variant) ───────────────────
  ws.mergeCells("A1:H1");
  ws.getCell("A1").value = "ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ";
  setCenterBold(ws.getCell("A1"), 12);

  ws.mergeCells("A2:H2");
  ws.getCell("A2").value = "ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ";
  setCenterBold(ws.getCell("A2"));

  ws.mergeCells("A4:F4"); ws.getCell("A4").value = company.name    ?? "";
  ws.mergeCells("A5:F5"); ws.getCell("A5").value = `ທີ່ຢູ່: ${company.address ?? ""}`;
  ws.mergeCells("A6:F6"); ws.getCell("A6").value = `ເບີໂທ: ${company.phone ?? ""}`;

  ws.mergeCells("G5:H5"); ws.getCell("G5").value = "ເລກທີ່.............................";
  ws.mergeCells("G6:H6"); ws.getCell("G6").value = "ວັນທີ່............/....../...........";
  ["G5", "G6"].forEach((c) => (ws.getCell(c).alignment = { horizontal: "right" }));

  ws.mergeCells("A8:H8");
  ws.getCell("A8").value = heading ?? "";
  setCenterBold(ws.getCell("A8"), 16);

  ws.mergeCells("A9:H9");
  ws.getCell("A9").value = activeFilterLabel ?? "";
  ws.getCell("A9").font      = FONT_BOLD;
  ws.getCell("A9").alignment = { horizontal: "center" };

  ws.getCell("H11").value     = "ຫົວໜ່ວຍ: LAK";
  ws.getCell("H11").font      = FONT_BOLD;
  ws.getCell("H11").alignment = { horizontal: "right" };

  // ── 2-row table header ───────────────────────────
  ws.mergeCells("A11:A12"); // account name
  ws.mergeCells("B11:B12"); // account code
  ws.mergeCells("C11:D11"); // opening
  ws.mergeCells("E11:F11"); // movement
  ws.mergeCells("G11:H11"); // closing

  const setHeaderCell = (addr, value) => {
    ws.getCell(addr).value     = value;
    ws.getCell(addr).font      = FONT_BOLD;
    ws.getCell(addr).alignment = { horizontal: "center", vertical: "middle" };
    ws.getCell(addr).border    = BORDER_ALL;
  };

  setHeaderCell("A11", "ບັນຊີ");
  setHeaderCell("B11", "ເລກລະຫັດບັນຊີ");
  setHeaderCell("C11", "ຍອດຍົກມາ");
  setHeaderCell("E11", "ລາຍການເຄື່ອນໄຫວ");
  setHeaderCell("G11", "ຍອດເຫຼືອ");
  ["C12", "D12", "E12", "F12", "G12", "H12"].forEach((addr, i) => {
    setHeaderCell(addr, ["ໜີ້", "ມີ", "ໜີ້", "ມີ", "ໜີ້", "ມີ"][i]);
  });

  // ── Data rows ────────────────────────────────────
  let rowIndex = 13;
  (data ?? []).forEach((acc) => {
    const r = ws.getRow(rowIndex++);
    r.values = [
      " ".repeat(acc.level * 4) + (acc.name ?? ""),
      " ".repeat(acc.level * 4) + (acc.code ?? ""),
      num(acc.openingDr),  num(acc.openingCr),
      num(acc.movementDr), num(acc.movementCr),
      num(acc.endingDr),   num(acc.endingCr),
    ];
    r.eachCell((cell, col) => {
      cell.font   = acc.isParent ? FONT_BOLD : FONT_BASE;
      cell.border = BORDER_ALL;
      cell.alignment = col >= 3
        ? { horizontal: "right", vertical: "middle" }
        : { horizontal: "left",  vertical: "middle" };
      if (col >= 3) cell.numFmt = "#,##0.00;[Red]-#,##0.00";
    });
  });

  // ── Totals row ───────────────────────────────────
  const tr = ws.getRow(rowIndex);
  ws.mergeCells(`A${rowIndex}:B${rowIndex}`);
  tr.getCell(1).value = "ທັງໝົດ";
  [
    [3, totals?.openingDr],  [4, totals?.openingCr],
    [5, totals?.movementDr], [6, totals?.movementCr],
    [7, totals?.endingDr],   [8, totals?.endingCr],
  ].forEach(([col, val]) => {
    tr.getCell(col).value  = val ?? 0;
    tr.getCell(col).numFmt = "#,##0.00;[Red]-#,##0.00";
  });
  tr.eachCell((cell, col) => {
    cell.font   = FONT_BOLD;
    cell.border = BORDER_ALL;
    cell.alignment = col >= 3
      ? { horizontal: "right",  vertical: "middle" }
      : { horizontal: "center", vertical: "middle" };
  });

  // ── Footer ──────────────────────────────────────
  ws.addRow([]);
  const f = ws.addRow([]);
  ws.mergeCells(`F${f.number}:H${f.number}`);
  ws.getCell(`F${f.number}`).value     = "ທີ່......................................., ວັນທີ ........../........../..........";
  ws.getCell(`F${f.number}`).alignment = { horizontal: "right" };

  ws.addRow([]);
  const s = ws.addRow(["ຜູ້ອຳນວຍການ", "", "", "ຫົວໜ້າບັນຊີ", "", "", "ຜູ້ສະຫຼຸບ"]);
  ws.mergeCells(`A${s.number}:C${s.number}`);
  ws.mergeCells(`D${s.number}:F${s.number}`);
  ws.mergeCells(`G${s.number}:H${s.number}`);
  ["A", "D", "G"].forEach((c) => {
    ws.getCell(`${c}${s.number}`).font      = FONT_BOLD;
    ws.getCell(`${c}${s.number}`).alignment = { horizontal: "center" };
  });

  await saveWorkbook(wb, `trial-balance-${todayStr().replace(/\//g, "-")}.xlsx`);
};

// ═══════════════════════════════════════════════════════════════
// 3. BALANCE SHEET — LIABILITIES (exportBalanceSheetExcel)
// ═══════════════════════════════════════════════════════════════

export const exportBalanceSheetExcel = async ({
  current = [],
  previous = [],
  currentYear,
  previousYear,
  comparable    = true,
  user,
  activeFilterLabel = "",
  period        = {},
  start         = null,
  end           = null,
  mode          = "",
}) => {
  const company    = user?.companyId ?? {};
  const colCount   = comparable ? 4 : 3;
  const curGroups  = groupBySection(current);
  const prevGroups = groupBySection(previous);

  const periodText       = buildPeriodText({ mode, currentYear, previousYear, period, start, end, activeFilterLabel });
  const currentColLabel  = buildColLabel({ mode, year: currentYear,  isCurrentCol: true,  period, activeFilterLabel });
  const previousColLabel = buildColLabel({ mode, year: previousYear, isCurrentCol: false, period, activeFilterLabel });

  const grandCur  = Object.values(curGroups).reduce((s, g) => s + (g.total ?? 0), 0);
  const grandPrev = Object.values(prevGroups).reduce((s, g) => s + (g.total ?? 0), 0);

  const wb = new ExcelJS.Workbook();
  wb.creator = "SmartAcc";
  wb.created = new Date();

  const ws = wb.addWorksheet("Balance Sheet");
  ws.columns = [{ width: 48 }, { width: 10 }, { width: 20 }, { width: 20 }];

  writeGovHeader(ws, { company, reportTitle: "ໃບລາຍງານຖານະການເງິນ - ໜີ້ສິນ", periodText });
  writeTableHeader(ws,
    ["ໜີ້ສິນ ແລະ ທຶນ", "ໝາຍເຫດ", currentColLabel, comparable ? previousColLabel : ""],
    colCount
  );

  // ── Section order ───────────────────────────────
  const SECTION_ORDER = ["Current_Liabilities", "Non_current_Liabilities", "Equity"];
  const allKeys = new Set([...Object.keys(curGroups), ...Object.keys(prevGroups)]);
  const orderedKeys = [
    ...SECTION_ORDER.filter((k) => allKeys.has(k)),
    ...[...allKeys].filter((k) => !SECTION_ORDER.includes(k)),
  ];

  // ── Body ────────────────────────────────────────
  orderedKeys.forEach((sectionKey) => {
    const curG  = curGroups[sectionKey]  ?? { items: [], total: 0 };
    const prevG = prevGroups[sectionKey] ?? { items: [], total: 0 };
    const displayName = GROUP_LABEL_MAP[sectionKey] ?? sectionKey;
    const rows  = mergeItems(curG.items, prevG.items);

    // Section header
    const sec = ws.addRow([displayName]);
    ws.mergeCells(`A${sec.number}:D${sec.number}`);
    sec.getCell(1).font      = FONT_BOLD;
    sec.getCell(1).fill      = FILL_GRAY;
    sec.getCell(1).border    = { ...BORDER_ALL, top: { style: "medium" } };
    sec.getCell(1).alignment = { horizontal: "left", vertical: "middle" };

    // Data rows
    rows.forEach((r, i) => {
      const item = r.cur ?? r.prev;
      if (!item) return;
      const row = ws.addRow([
        `${i + 1}. ${item.label ?? ""}`,
        item.pattern ?? "",
        r.cur?.ending  ?? 0,
        comparable ? (r.prev?.ending ?? 0) : "",
      ]);
      styleDataRow(row, colCount);
    });

    // Subtotal
    const tr = ws.addRow([
      `ລວມຍອດ ${displayName}`, "",
      curG.total ?? 0,
      comparable ? (prevG.total ?? 0) : "",
    ]);
    ws.mergeCells(`A${tr.number}:B${tr.number}`);
    tr.getCell(1).font      = FONT_BOLD;
    tr.getCell(1).alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    tr.eachCell({ includeEmpty: true }, (cell, col) => {
      if (col > colCount) return;
      cell.border = BORDER_SUBTOTAL;
      if (col >= 3) { cell.numFmt = MONEY_FMT; cell.alignment = { horizontal: "right" }; cell.font = FONT_BOLD; }
    });
  });

  // ── Grand total ─────────────────────────────────
  const gt = ws.addRow(["ລວມຍອດ ໜີ້ສິນ + ທຶນ", "", grandCur, comparable ? grandPrev : ""]);
  ws.mergeCells(`A${gt.number}:B${gt.number}`);
  gt.getCell(1).font = FONT_BOLD;
  gt.fill = FILL_GRAY;
  gt.eachCell({ includeEmpty: true }, (cell, col) => {
    if (col > colCount) return;
    cell.border = BORDER_GRANDTOTAL;
    if (col >= 3) { cell.numFmt = MONEY_FMT; cell.alignment = { horizontal: "right" }; cell.font = FONT_BOLD; }
  });

  writeFooter(ws, colCount);
  await saveWorkbook(wb, `balance-sheet-${todayStr().replace(/\//g, "-")}.xlsx`);
};

// ═══════════════════════════════════════════════════════════════
// 4. ASSET STATEMENT  (exportAsset)
// ═══════════════════════════════════════════════════════════════

export const exportAsset = async ({
  current         = {},
  previous        = {},
  currentYear,
  previousYear,
  comparable      = true,
  user,
  activeFilterLabel = "",
  period          = {},
  start           = null,
  end             = null,
  mode            = "",
}) => {
  const company    = user?.companyId ?? {};
  const colCount   = comparable ? 4 : 3;
  const curGroups  = current?.groups  ?? {};
  const prevGroups = previous?.groups ?? {};

  const periodText       = buildPeriodText({ mode, currentYear, previousYear, period, start, end, activeFilterLabel });
  const currentColLabel  = buildColLabel({ mode, year: currentYear,  isCurrentCol: true,  period, activeFilterLabel });
  const previousColLabel = buildColLabel({ mode, year: previousYear, isCurrentCol: false, period, activeFilterLabel });

  const wb = new ExcelJS.Workbook();
  wb.creator = "SmartAcc";
  wb.created = new Date();

  const ws = wb.addWorksheet("Statement of Financial Position");
  ws.columns = [{ width: 48 }, { width: 10 }, { width: 20 }, { width: 20 }];

  writeGovHeader(ws, { company, reportTitle: "ໃບລາຍງານຖານະການເງິນ - ຊັບສິນ", periodText });
  writeTableHeader(ws,
    ["ຊັບສິນ", "ໝາຍເຫດ", currentColLabel, comparable ? previousColLabel : ""],
    colCount
  );

  // ── Section order ───────────────────────────────
  const SECTION_ORDER = ["Current Assets", "Non-Current Assets"];
  const allKeys = new Set([...Object.keys(curGroups), ...Object.keys(prevGroups)]);
  const orderedKeys = [
    ...SECTION_ORDER.filter((k) => allKeys.has(k)),
    ...[...allKeys].filter((k) => !SECTION_ORDER.includes(k)),
  ];

  // ── Body ────────────────────────────────────────
  orderedKeys.forEach((sectionKey) => {
    const curG  = curGroups[sectionKey]  ?? { items: [], total: 0 };
    const prevG = prevGroups[sectionKey] ?? { items: [], total: 0 };
    const displayName = GROUP_LABEL_MAP[sectionKey] ?? sectionKey;

    const merged = mergeItems(curG.items ?? [], prevG.items ?? []);
    const uiRows = buildUIRows(merged);

    // Section header
    const sec = ws.addRow([displayName]);
    ws.mergeCells(`A${sec.number}:D${sec.number}`);
    sec.getCell(1).font      = FONT_BOLD;
    sec.getCell(1).fill      = FILL_GRAY;
    sec.getCell(1).border    = { ...BORDER_ALL, top: { style: "medium" } };
    sec.getCell(1).alignment = { horizontal: "left", vertical: "middle" };

    let idx = 1;
    uiRows.forEach((row) => {
      const label = row.cur?.label ?? row.prev?.label ?? "";

      if (row.isParent) {
        const pr = ws.addRow([`${idx}. ${label}`, "", row.cur?.amount ?? 0, comparable ? (row.prev?.amount ?? 0) : ""]);
        pr.getCell(1).font = FONT_BOLD;
        styleDataRow(pr, colCount);

        (row.children ?? []).forEach((c, ci) => {
          const childLabel = c.cur?.label ?? c.prev?.label ?? "";
          const cr = ws.addRow([`${idx}.${ci + 1} ${childLabel}`, "", c.cur?.amount ?? 0, comparable ? (c.prev?.amount ?? 0) : ""]);
          cr.getCell(1).alignment = { horizontal: "left", indent: 2 };
          styleDataRow(cr, colCount);
        });
        idx++;
        return;
      }

      const nr = ws.addRow([`${idx}. ${label}`, "", row.cur?.amount ?? 0, comparable ? (row.prev?.amount ?? 0) : ""]);
      styleDataRow(nr, colCount);
      idx++;
    });

    // Subtotal
    const tr = ws.addRow([`ລວມຍອດ ${displayName}`, "", curG.total ?? 0, comparable ? (prevG.total ?? 0) : ""]);
    ws.mergeCells(`A${tr.number}:B${tr.number}`);
    tr.getCell(1).font      = FONT_BOLD;
    tr.getCell(1).alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    tr.eachCell({ includeEmpty: true }, (cell, col) => {
      if (col > colCount) return;
      cell.border = BORDER_SUBTOTAL;
      if (col >= 3) { cell.numFmt = MONEY_FMT; cell.alignment = { horizontal: "right" }; cell.font = FONT_BOLD; }
    });
  });

  // ── Grand total ─────────────────────────────────
  const gt = ws.addRow(["ລວມຍອດ ຊັບສິນທັງໝົດ", "", current.totalAssets ?? 0, comparable ? (previous.totalAssets ?? 0) : ""]);
  ws.mergeCells(`A${gt.number}:B${gt.number}`);
  gt.getCell(1).font = FONT_BOLD;
  gt.fill = FILL_GRAY;
  gt.eachCell({ includeEmpty: true }, (cell, col) => {
    if (col > colCount) return;
    cell.border = BORDER_GRANDTOTAL;
    if (col >= 3) { cell.numFmt = MONEY_FMT; cell.alignment = { horizontal: "right" }; cell.font = FONT_BOLD; }
  });

  writeFooter(ws, colCount);
  await saveWorkbook(wb, `asset-statement-${todayStr().replace(/\//g, "-")}.xlsx`);
};

// ═══════════════════════════════════════════════════════════════
// 5. INCOME STATEMENT  (exportReport)
// ═══════════════════════════════════════════════════════════════

export const exportReport = async ({
  mergedLines     = [],
  current,
  previous,
  currentYear,
  previousYear,
  comparable      = true,
  user,
  activeFilterLabel = "",
  period          = {},
  start           = null,
  end             = null,
  mode            = "",
}) => {
  const company  = user?.companyId ?? {};
  const colCount = comparable ? 4 : 3;

  // Support legacy current.lines / previous.lines shape
  let lines = mergedLines;
  if (!lines.length && current?.lines?.length) {
    const prevMap = new Map((previous?.lines ?? []).map((l) => [l.key, l]));
    lines = current.lines.map((l) => ({
      key: l.key, label: l.label,
      cur: l.amount ?? 0,
      prev: prevMap.get(l.key)?.amount ?? 0,
    }));
  }

  const periodText       = buildPeriodText({ mode, currentYear, previousYear, period, start, end, activeFilterLabel });
  const currentColLabel  = buildColLabel({ mode, year: currentYear,  isCurrentCol: true,  period, activeFilterLabel });
  const previousColLabel = buildColLabel({ mode, year: previousYear, isCurrentCol: false, period, activeFilterLabel });

  const wb = new ExcelJS.Workbook();
  wb.creator = "SmartAcc";
  wb.created = new Date();

  const ws = wb.addWorksheet("Income Statement");
  ws.columns = [{ width: 48 }, { width: 12 }, { width: 20 }, { width: 20 }];

  writeGovHeader(ws, { company, reportTitle: "ໃບລາຍງານຜົນດຳເນີນງານ", periodText });
  writeTableHeader(ws,
    ["ເນື້ອໃນລາຍການ", "ໝາຍເຫດ", currentColLabel, comparable ? previousColLabel : ""],
    colCount
  );

  // ── Body ────────────────────────────────────────
  lines.forEach((line) => {
    const isBold    = BOLD_KEYS.has(line.key) || BOLD_LABELS.has(line.label);
    const isSection = line.label === "Of which:" || line.label?.startsWith("Of which");

    const r = ws.addRow([
      line.label,
      "",
      line.cur  ?? 0,
      comparable ? (line.prev ?? 0) : undefined,
    ].slice(0, colCount));

    r.eachCell({ includeEmpty: true }, (cell, col) => {
      if (col > colCount) return;
      cell.border = BORDER_ALL;
      if (col === 1) {
        cell.alignment = { horizontal: "left", vertical: "middle", indent: isSection ? 2 : 0 };
        if (isBold) cell.font = FONT_BOLD;
      }
      if (col >= 3) {
        cell.numFmt    = MONEY_FMT;
        cell.alignment = { horizontal: "right", vertical: "middle" };
        if (isBold) cell.font = FONT_BOLD;
      }
    });

    if (isBold) fillRow(r, "FFFAFAFA", colCount);
  });

  // ── Footnote ────────────────────────────────────
  ws.addRow([]);
  const noteRow = ws.addRow(["(1) ໃຫ້ນຳໃຊ້ພຽງແຕ່ ເພື່ອສະເໜີ ເອກະສານລາຍງານການເງິນ ລວມກິດຈະການ."]);
  ws.mergeCells(`A${noteRow.number}:D${noteRow.number}`);
  noteRow.getCell(1).font      = { italic: true, size: 8 };
  noteRow.getCell(1).alignment = { horizontal: "left" };

  writeFooter(ws, colCount);
  await saveWorkbook(wb, `income-statement-${todayStr().replace(/\//g, "-")}.xlsx`);
};

// ═══════════════════════════════════════════════════════════════
// UTILITY EXPORTS
// ═══════════════════════════════════════════════════════════════

export const flattenAccountTree = (tree) => {
  const rows = [];
  const walk = (node, level = 0) => {
    const isParent = node.children?.length > 0;
    rows.push({
      code: node.code, name: node.name,
      level, isParent,
      openingDr:  node.openingDr  ?? 0,
      openingCr:  node.openingCr  ?? 0,
      movementDr: node.movementDr ?? 0,
      movementCr: node.movementCr ?? 0,
      endingDr:   node.endingDr   ?? 0,
      endingCr:   node.endingCr   ?? 0,
    });
    if (isParent) node.children.forEach((c) => walk(c, level + 1));
  };
  tree.forEach((root) => walk(root, 0));
  return rows;
};