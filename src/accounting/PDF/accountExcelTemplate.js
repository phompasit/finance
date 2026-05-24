// src/pages/accounts/accountExcelTemplate.js
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export default async function accountExcelTemplate({ data, user }) {
  if (!Array.isArray(data) || data.length === 0) return;

  const companyName = user?.companyId?.name || "";
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "");
  const today = fmtDate(new Date());

  const TYPE_MAP = {
    asset: "ຊັບສິນ",
    liability: "ໜີ້ສິນ",
    equity: "ທຶນ",
    income: "ລາຍຮັບ",
    expense: "ລາຍຈ່າຍ",
  };

  const wb = new ExcelJS.Workbook();
  wb.creator = "Account System";
  wb.created = new Date();

  const ws = wb.addWorksheet("ສາລະບານບັນຊີ", {
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  // ── Column widths ──────────────────────────────────────────
  ws.columns = [
    { width: 6  },  // A  ລຳດັບ
    { width: 16 },  // B  ລະຫັດບັນຊີ
    { width: 52 },  // C  ຊື່ບັນຊີ
    { width: 14 },  // D  ປະເພດ
    { width: 10 },  // E  ລະດັບ
    { width: 12 },  // F  ດ້ານປົກກະຕິ
    { width: 18 },  // G  ລະຫັດແມ່
    { width: 18 },  // H  ຍອດ Dr
    { width: 18 },  // I  ຍອດ Cr
  ];

  const THIN = { style: "thin", color: { argb: "FF888888" } };
  const MED  = { style: "medium", color: { argb: "FF000000" } };
  const THCK = { style: "thick",  color: { argb: "FF000000" } };

  const thinBorder = {
    top: THIN, bottom: THIN, left: THIN, right: THIN,
  };

  const applyStyle = (cell, opts = {}) => {
    const {
      bold = false, size = 9, color = "FF000000", italic = false,
      hAlign = "center", vAlign = "middle", wrap = true,
      bgColor = null, border = thinBorder, numFmt = null,
    } = opts;
    cell.font      = { name: "Arial", bold, size, color: { argb: color }, italic };
    cell.alignment = { horizontal: hAlign, vertical: vAlign, wrapText: wrap };
    if (bgColor) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
    if (border)  cell.border = border;
    if (numFmt)  cell.numFmt = numFmt;
  };

  // ── ROW 1: State ──────────────────────────────────────────
  let r = 1;
  ws.getRow(r).height = 20;
  ws.mergeCells(r, 1, r, 9);
  const stateCell = ws.getCell(r, 1);
  stateCell.value = "ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ";
  applyStyle(stateCell, { bold: true, size: 12, border: null });

  // ── ROW 2: Motto ──────────────────────────────────────────
  r++;
  ws.getRow(r).height = 15;
  ws.mergeCells(r, 1, r, 9);
  const mottoCell = ws.getCell(r, 1);
  mottoCell.value = "ສັນຕິພາບ  ເອກະລາດ  ປະຊາທິປະໄຕ  ເອກະພາບ  ວັດທະນະຖາວອນ";
  applyStyle(mottoCell, { size: 9, color: "FF555555", border: null });

  // ── ROW 3: Title ──────────────────────────────────────────
  r++;
  ws.getRow(r).height = 28;
  ws.mergeCells(r, 1, r, 9);
  const titleCell = ws.getCell(r, 1);
  titleCell.value = "ສາລະບານບັນຊີ (Chart of Accounts)";
  applyStyle(titleCell, { bold: true, size: 15, border: null });

  // ── ROW 4: spacer ─────────────────────────────────────────
  r++;
  ws.getRow(r).height = 4;

  // ── ROW 5-6: Meta ─────────────────────────────────────────
  r++;
  ws.getRow(r).height = 15;
  ws.mergeCells(r, 1, r, 5);
  const compCell = ws.getCell(r, 1);
  compCell.value = companyName ? `ບໍລິສັດ :   ${companyName}` : "";
  applyStyle(compCell, { hAlign: "left", border: null, size: 9 });

  ws.mergeCells(r, 6, r, 9);
  const dateCell = ws.getCell(r, 6);
  dateCell.value = `ວັນທີພິມ :   ${today}`;
  applyStyle(dateCell, { hAlign: "right", color: "FF555555", border: null, size: 9 });

  r++;
  ws.getRow(r).height = 15;
  ws.mergeCells(r, 1, r, 5);
  const countCell = ws.getCell(r, 1);
  countCell.value = `ຈຳນວນ :   ${data.length} ລາຍການ`;
  applyStyle(countCell, { hAlign: "left", color: "FF555555", border: null, size: 9 });

  // ── ROW 7: separator ──────────────────────────────────────
  r++;
  ws.getRow(r).height = 4;
  for (let c = 1; c <= 9; c++) {
    ws.getCell(r, c).border = {
      bottom: { style: "thin", color: { argb: "FFBBBBBB" } },
    };
  }

  // ── ROW 8: Column Headers ─────────────────────────────────
  r++;
  ws.getRow(r).height = 24;
  ws.getRow(r).freeze = true;
  ws.views = [{ state: "frozen", xSplit: 0, ySplit: r, topLeftCell: `A${r + 1}` }];

  const HDR_BG = "FFD9E1F2";
  const hdrBorder = {
    top:    { style: "medium", color: { argb: "FF444444" } },
    bottom: { style: "medium", color: { argb: "FF444444" } },
    left:   { style: "thin",   color: { argb: "FF444444" } },
    right:  { style: "thin",   color: { argb: "FF444444" } },
  };

  const headers = [
    { col: 1, label: "#",              h: "center" },
    { col: 2, label: "ລະຫັດບັນຊີ",    h: "center" },
    { col: 3, label: "ຊື່ບັນຊີ",       h: "left"   },
    { col: 4, label: "ປະເພດ",          h: "center" },
    { col: 5, label: "ລະດັບ",          h: "center" },
    { col: 6, label: "ດ້ານປົກກະຕິ",   h: "center" },
    { col: 7, label: "ລະຫັດແມ່",       h: "center" },
    { col: 8, label: "ຍອດ Dr",         h: "right"  },
    { col: 9, label: "ຍອດ Cr",         h: "right"  },
  ];

  headers.forEach(({ col, label, h }) => {
    const cell = ws.getCell(r, col);
    cell.value = label;
    applyStyle(cell, {
      bold: true, size: 9, hAlign: h, bgColor: HDR_BG, border: hdrBorder,
    });
  });

  // ── DATA ROWS ─────────────────────────────────────────────
  // Color by account type
  const TYPE_COLOR = {
    asset:     "FFF0F7FF",
    liability: "FFFFF0F0",
    equity:    "FFF0FFF0",
    income:    "FFFFF8E8",
    expense:   "FFFDF0FF",
  };

  // Level indent for account name
  const LEVEL_INDENT = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 };
  const LEVEL_BOLD   = [1, 2];  // levels that get bold text

  // Group color for type-header rows
  const TYPE_HEADER_COLOR = {
    asset:     "FFD6E4F0",
    liability: "FFFFD6D6",
    equity:    "FFD6F0D6",
    income:    "FFFFF0C8",
    expense:   "FFF5D6FF",
  };

  let currentType = null;
  let rowNo = 1;
  let dataRowCount = 0;

  const NUM_FMT = "#,##0.00";

  data.forEach((acc) => {
    // ── Type header row ──
    if (acc.type !== currentType) {
      currentType = acc.type;
      r++;
      ws.getRow(r).height = 18;
      ws.mergeCells(r, 1, r, 9);
      const typeCell = ws.getCell(r, 1);
      typeCell.value = `▶  ${TYPE_MAP[acc.type] || acc.type}  (${acc.type.toUpperCase()})`;
      applyStyle(typeCell, {
        bold: true, size: 10, hAlign: "left",
        bgColor: TYPE_HEADER_COLOR[acc.type] || "FFF0F0F0",
        color: "FF1E1E1E",
        border: {
          top:    MED,
          bottom: { style: "thin", color: { argb: "FF888888" } },
          left:   THIN, right: THIN,
        },
        wrap: false,
      });
      dataRowCount = 0; // reset zebra per section
    }

    // ── Data row ──
    r++;
    ws.getRow(r).height = 16;

    const bg      = dataRowCount % 2 === 0
      ? "FFFFFFFF"
      : (TYPE_COLOR[acc.type] || "FFF8F8F8");
    const isParent = LEVEL_BOLD.includes(acc.level);
    const indent   = LEVEL_INDENT[acc.level] || 0;
    dataRowCount++;

    const setCell = (col, val, opts = {}) => {
      const cell = ws.getCell(r, col);
      cell.value = val === undefined || val === null ? null : val;
      applyStyle(cell, {
        size: isParent ? 9 : 8.5,
        bold: isParent,
        bgColor: bg,
        border: thinBorder,
        ...opts,
      });
    };

    // # (row number)
    setCell(1, rowNo++, { hAlign: "center", color: "FF999999", bold: false, size: 8 });

    // Code — style by level
    const codeCell = ws.getCell(r, 2);
    codeCell.value = acc.code;
    applyStyle(codeCell, {
      bold: isParent, size: isParent ? 9 : 8.5,
      hAlign: "left", bgColor: bg, border: thinBorder,
    });
    // indent name column
    const nameCell = ws.getCell(r, 3);
    nameCell.value = "  ".repeat(indent) + (acc.name || "");
    applyStyle(nameCell, {
      bold: isParent, size: isParent ? 9 : 8.5,
      hAlign: "left", bgColor: bg, border: thinBorder, wrap: true,
    });

    setCell(4, TYPE_MAP[acc.type] || acc.type,  { hAlign: "center", bold: false, size: 8.5 });
    setCell(5, acc.level,                         { hAlign: "center", bold: false, size: 8.5 });
    setCell(6, acc.normalSide,                    {
      hAlign: "center", bold: false, size: 8.5,
      color: acc.normalSide === "Dr" ? "FF0C2D6B" : "FF0D4D1E",
    });
    setCell(7, acc.parentCode || "-",             { hAlign: "center", bold: false, size: 8, color: "FF666666" });
    setCell(8, acc.balanceDr || null,             { hAlign: "right",  bold: isParent, numFmt: NUM_FMT, color: "FF0C2D6B" });
    setCell(9, acc.balanceCr || null,             { hAlign: "right",  bold: isParent, numFmt: NUM_FMT, color: "FF0D4D1E" });
  });

  // ── Summary row ───────────────────────────────────────────
  r++;
  ws.getRow(r).height = 20;
  ws.mergeCells(r, 1, r, 7);
  const sumCell = ws.getCell(r, 1);
  sumCell.value = `ລວມທັງໝົດ  /  TOTAL  (${data.length} ລາຍການ)`;
  applyStyle(sumCell, {
    bold: true, size: 10, hAlign: "center", bgColor: "FFF2F2F2",
    border: { top: THCK, bottom: { style: "double", color: { argb: "FF000000" } }, left: THIN, right: THIN },
  });

  const totalDr = data.reduce((s, a) => s + (a.balanceDr || 0), 0);
  const totalCr = data.reduce((s, a) => s + (a.balanceCr || 0), 0);

  [{ c: 8, v: totalDr, clr: "FF0C2D6B" }, { c: 9, v: totalCr, clr: "FF0D4D1E" }].forEach(({ c, v, clr }) => {
    const cell = ws.getCell(r, c);
    cell.value = v;
    applyStyle(cell, {
      bold: true, size: 10, hAlign: "right", bgColor: "FFF2F2F2",
      numFmt: NUM_FMT, color: clr,
      border: { top: THCK, bottom: { style: "double", color: { argb: "FF000000" } }, left: THIN, right: THIN },
    });
  });

  // ── Signature ─────────────────────────────────────────────
  r += 2;
  ws.getRow(r).height = 4;
  for (let c = 1; c <= 9; c++) {
    ws.getCell(r, c).border = { bottom: { style: "thin", color: { argb: "FFBBBBBB" } } };
  }

  const sigDefs = [
    { title: "ຜູ້ອໍານວຍການ",  sub: "Director / CEO",      cols: [1, 3] },
    { title: "ຫົວໜ້າບັນຊີ",   sub: "Accounting Manager",  cols: [4, 6] },
    { title: "ຜູ້ສະຫຼຸບ",     sub: "Accountant",           cols: [7, 9] },
  ];

  sigDefs.forEach(({ title, sub, cols: [sc, ec] }) => {
    const sr = r + 1;
    [sr, sr+1, sr+2, sr+3, sr+4].forEach((row, i) => {
      ws.getRow(row).height = [14, 12, 36, 4, 14][i];
      ws.mergeCells(row, sc, row, ec);
    });

    const tCell = ws.getCell(sr, sc);
    tCell.value = title;
    applyStyle(tCell, { bold: true, size: 9.5, border: null });

    const sCell = ws.getCell(sr + 1, sc);
    sCell.value = sub;
    applyStyle(sCell, { italic: true, size: 8, color: "FF888888", border: null });

    for (let c = sc; c <= ec; c++) {
      ws.getCell(sr + 3, c).border = {
        bottom: { style: "thin", color: { argb: "FF333333" } },
      };
    }

    const nCell = ws.getCell(sr + 4, sc);
    nCell.value = "( _________________________ )";
    applyStyle(nCell, { size: 8.5, color: "FF555555", border: null });
  });

  // ── Download ──────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, "chart-of-accounts.xlsx");
}