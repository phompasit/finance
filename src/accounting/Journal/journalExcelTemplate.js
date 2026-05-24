// src/pages/journal/journalExcelTemplate.js
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export default async function journalExcelTemplate({ data, user }) {
  if (!Array.isArray(data) || data.length === 0) return;

  // ── Helpers ──────────────────────────────────────────────
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "");
  const fmtMonthYear = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    return `${dt.getMonth() + 1}/${dt.getFullYear()}`;
  };
  const getMonthSortKey = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
  };
  const getDateSortKey = (s) => {
    const p = s.split("/");
    return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : s;
  };

  // ── Group data ───────────────────────────────────────────
  const grouped = {};
  data.forEach((entry) => {
    const sortKey = getMonthSortKey(entry.date);
    const monthYear = fmtMonthYear(entry.date);
    const dateKey = fmtDate(entry.date);
    if (!grouped[sortKey]) grouped[sortKey] = { display: monthYear, dates: {} };
    if (!grouped[sortKey].dates[dateKey]) grouped[sortKey].dates[dateKey] = [];
    grouped[sortKey].dates[dateKey].push(entry);
  });

  const companyName = user?.companyId?.name || "";
  const companyPhone = user?.companyId?.phone || "";
  const today = fmtDate(new Date());
  const filename =
    data.length === 1
      ? data[0].reference || "journal-voucher"
      : "journal-voucher-list";

  // ── Workbook & Worksheet ─────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator = "Journal System";
  wb.created = new Date();
  const ws = wb.addWorksheet("ປື້ມປະຈຳວັນ", {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.39, right: 0.39, top: 0.47, bottom: 0.55 },
    },
  });

  // ── Column widths ────────────────────────────────────────
  ws.columns = [
    { width: 5 },   // A  #
    { width: 13 },  // B  date
    { width: 18 },  // C  ref
    { width: 32 },  // D  desc
    { width: 11 },  // E  dr code
    { width: 11 },  // F  cr code
    { width: 30 },  // G  name
    { width: 16 },  // H  orig dr
    { width: 16 },  // I  orig cr
    { width: 7  },  // J  ccy
    { width: 14 },  // K  rate
    { width: 18 },  // L  lak dr
    { width: 18 },  // M  lak cr
  ];

  // ── Style factories ──────────────────────────────────────
  const FONT = "Arial";
  const NUM_FMT = "#,##0.00";

  const borderThin = {
    top:    { style: "thin",   color: { argb: "FF888888" } },
    bottom: { style: "thin",   color: { argb: "FF888888" } },
    left:   { style: "thin",   color: { argb: "FF888888" } },
    right:  { style: "thin",   color: { argb: "FF888888" } },
  };
  const borderMedium = (color = "FF000000") => ({
    top:    { style: "medium", color: { argb: color } },
    bottom: { style: "medium", color: { argb: color } },
    left:   { style: "thin",   color: { argb: "FF888888" } },
    right:  { style: "thin",   color: { argb: "FF888888" } },
  });

  const applyStyle = (cell, opts = {}) => {
    const {
      bold = false, size = 9, color = "FF000000", italic = false,
      hAlign = "center", vAlign = "middle", wrap = true,
      bgColor = null, border = borderThin, numFmt = null,
    } = opts;
    cell.font      = { name: FONT, bold, size, color: { argb: color }, italic };
    cell.alignment = { horizontal: hAlign, vertical: vAlign, wrapText: wrap };
    if (bgColor) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
    if (border)  cell.border = border;
    if (numFmt)  cell.numFmt = numFmt;
  };

  // helper: merge A-M for a row
  const mergeRow = (row, fromCol = 1, toCol = 13) =>
    ws.mergeCells(row, fromCol, row, toCol);

  // ── ROW 1: State ─────────────────────────────────────────
  let r = 1;
  ws.getRow(r).height = 20;
  mergeRow(r);
  const stateCell = ws.getCell(r, 1);
  stateCell.value = "ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ";
  applyStyle(stateCell, { bold: true, size: 12, border: null });

  // ── ROW 2: Motto ─────────────────────────────────────────
  r++;
  ws.getRow(r).height = 16;
  mergeRow(r);
  const mottoCell = ws.getCell(r, 1);
  mottoCell.value = "ສັນຕິພາບ  ເອກະລາດ  ປະຊາທິປະໄຕ  ເອກະພາບ  ວັດທະນະຖາວອນ";
  applyStyle(mottoCell, { size: 9, color: "FF555555", border: null });

  // ── ROW 3: Main title ────────────────────────────────────
  r++;
  ws.getRow(r).height = 28;
  mergeRow(r);
  const titleCell = ws.getCell(r, 1);
  titleCell.value = "ປື້ມປະຈຳວັນທົ່ວໄປ";
  applyStyle(titleCell, { bold: true, size: 16, border: null });

  // ── ROW 4: Spacer ────────────────────────────────────────
  r++;
  ws.getRow(r).height = 5;

  // ── ROW 5: Meta left/right ───────────────────────────────
  r++;
  ws.getRow(r).height = 16;
  ws.mergeCells(r, 1, r, 7);
  const compCell = ws.getCell(r, 1);
  compCell.value = companyName ? `ບໍລິສັດ :   ${companyName}` : "";
  applyStyle(compCell, { hAlign: "left", border: null, size: 9 });

  ws.mergeCells(r, 8, r, 13);
  const dateMetaCell = ws.getCell(r, 8);
  dateMetaCell.value = `ວັນທີພິມ :   ${today}`;
  applyStyle(dateMetaCell, { hAlign: "right", color: "FF555555", border: null, size: 9 });

  // ── ROW 6: Meta left/right ───────────────────────────────
  r++;
  ws.getRow(r).height = 16;
  ws.mergeCells(r, 1, r, 7);
  const phoneCell = ws.getCell(r, 1);
  phoneCell.value = companyPhone ? `ເບີໂທ :   ${companyPhone}` : "";
  applyStyle(phoneCell, { hAlign: "left", border: null, size: 9 });

  ws.mergeCells(r, 8, r, 13);
  const countCell = ws.getCell(r, 8);
  countCell.value = `ຈຳນວນ :   ${data.length} ລາຍການ`;
  applyStyle(countCell, { hAlign: "right", color: "FF555555", border: null, size: 9 });

  // ── ROW 7: Separator spacer ──────────────────────────────
  r++;
  ws.getRow(r).height = 4;
  // thin bottom border across all cols
  for (let c = 1; c <= 13; c++) {
    ws.getCell(r, c).border = { bottom: { style: "thin", color: { argb: "FFBBBBBB" } } };
  }

  // ── ROWS 8-9: Column headers ─────────────────────────────
  const HDR_BG  = "FFD9E1F2";
  const HDR_BG2 = "FFE8EEF9";
  const hdrBorder = {
    top:    { style: "medium", color: { argb: "FF444444" } },
    bottom: { style: "thin",   color: { argb: "FF444444" } },
    left:   { style: "thin",   color: { argb: "FF444444" } },
    right:  { style: "thin",   color: { argb: "FF444444" } },
  };
  const hdrBorder2 = { ...hdrBorder, top: { style: "thin", color: { argb: "FF444444" } } };

  const hdrStyle = (bg = HDR_BG, border = hdrBorder) => ({
    bold: true, size: 9, hAlign: "center", vAlign: "middle",
    wrap: true, bgColor: bg, border,
  });

  r++;
  ws.getRow(r).height = 24;
  const h1 = r;

  r++;
  ws.getRow(r).height = 16;
  const h2 = r;

  // Merge + write header cells
  const setHdr = (r1, c1, r2, c2, value, bg = HDR_BG) => {
    if (r1 !== r2 || c1 !== c2) ws.mergeCells(r1, c1, r2, c2);
    const cell = ws.getCell(r1, c1);
    cell.value = value;
    applyStyle(cell, hdrStyle(bg, r1 === h1 ? hdrBorder : hdrBorder2));
  };

  setHdr(h1, 1,  h2, 1,  "#");
  setHdr(h1, 2,  h2, 2,  "ວັນທີ");
  setHdr(h1, 3,  h2, 3,  "ໃບຢັ້ງຢືນ");
  setHdr(h1, 4,  h2, 4,  "ລາຍລະອຽດ");
  setHdr(h1, 5,  h1, 6,  "ເລກບັນຊີ");
  setHdr(h2, 5,  h2, 5,  "ໜີ້",  HDR_BG2);
  setHdr(h2, 6,  h2, 6,  "ມີ",   HDR_BG2);
  setHdr(h1, 7,  h2, 7,  "ຊື່ບັນຊີ");
  setHdr(h1, 8,  h1, 9,  "ມູນຄ່າເດີມ");
  setHdr(h2, 8,  h2, 8,  "ໜີ້",  HDR_BG2);
  setHdr(h2, 9,  h2, 9,  "ມີ",   HDR_BG2);
  setHdr(h1, 10, h2, 10, "ສ.ງ.");
  setHdr(h1, 11, h2, 11, "ອັດຕາ\nແລກປ່ຽນ");
  setHdr(h1, 12, h1, 13, "ຈຳນວນ (LAK)");
  setHdr(h2, 12, h2, 12, "ໜີ້",  HDR_BG2);
  setHdr(h2, 13, h2, 13, "ມີ",   HDR_BG2);

  // freeze panes below headers
  ws.views = [{ state: "frozen", xSplit: 0, ySplit: h2, topLeftCell: `A${h2 + 1}` }];

  // ── DATA ROWS ────────────────────────────────────────────
  let rowNo = 1;
  let grandDr = 0, grandCr = 0;
  let dataRowCount = 0; // for zebra

  Object.keys(grouped).sort().forEach((sortKey) => {
    const { display: monthYear, dates } = grouped[sortKey];
    let mDr = 0, mCr = 0;

    // ── Month header ──
    r++;
    ws.getRow(r).height = 20;
    ws.mergeCells(r, 1, r, 13);
    const mhCell = ws.getCell(r, 1);
    mhCell.value = `ເດືອນ: ${monthYear}`;
    applyStyle(mhCell, {
      bold: true, size: 9.5, hAlign: "left", wrap: false,
      bgColor: "FFBDD7EE",
      border: {
        top:    { style: "medium", color: { argb: "FF000000" } },
        bottom: { style: "thin",   color: { argb: "FF888888" } },
        left:   { style: "thin",   color: { argb: "FF888888" } },
        right:  { style: "thin",   color: { argb: "FF888888" } },
      },
    });

    Object.keys(dates)
      .sort((a, b) => getDateSortKey(a).localeCompare(getDateSortKey(b)))
      .forEach((dateKey) => {
        let dDr = 0, dCr = 0;

        dates[dateKey].forEach((entry) => {
          (entry.lines || []).forEach((line, li) => {
            const acc   = line.accountId || {};
            const dr    = Number(line.debitLAK  || 0);
            const cr    = Number(line.creditLAK || 0);
            dDr += dr; dCr += cr;
            mDr += dr; mCr += cr;
            grandDr += dr; grandCr += cr;

            const isFirst = li === 0;
            const bg = dataRowCount % 2 === 0 ? "FFFFFFFF" : "FFF6F7F8";
            dataRowCount++;

            r++;
            ws.getRow(r).height = 16;

            const setDataCell = (col, value, opts = {}) => {
              const cell = ws.getCell(r, col);
              cell.value = value === "" ? null : value;
              applyStyle(cell, { size: 8.5, bgColor: bg, border: borderThin, ...opts });
            };

            setDataCell(1,  rowNo++,          { hAlign: "center", color: "FF999999" });
            setDataCell(2,  isFirst ? dateKey         : null, { hAlign: "center" });
            setDataCell(3,  isFirst ? (entry.reference    || null) : null, { hAlign: "center", color: "FF333333" });
            setDataCell(4,  isFirst ? (entry.description  || null) : null, { hAlign: "left",   color: "FF333333", italic: true });
            setDataCell(5,  line.side === "dr" ? (acc.code || null) : null, { hAlign: "center" });
            setDataCell(6,  line.side === "cr" ? (acc.code || null) : null, { hAlign: "center" });
            setDataCell(7,  acc.name || null,   { hAlign: "left" });
            setDataCell(8,  line.side === "dr" ? (Number(line.debitOriginal)  || null) : null, { hAlign: "right", numFmt: NUM_FMT });
            setDataCell(9,  line.side === "cr" ? (Number(line.creditOriginal) || null) : null, { hAlign: "right", numFmt: NUM_FMT });
            setDataCell(10, line.currency || null, { hAlign: "center", color: "FF666666" });
            setDataCell(11, line.exchangeRate && line.exchangeRate !== 1 ? Number(line.exchangeRate) : 1, { hAlign: "right", numFmt: NUM_FMT, color: "FF555555" });
            setDataCell(12, dr || null, { hAlign: "right", numFmt: NUM_FMT, bold: true, color: "FF0C2D6B" });
            setDataCell(13, cr || null, { hAlign: "right", numFmt: NUM_FMT, bold: true, color: "FF0D4D1E" });
          });
        });

        // ── Date subtotal ──
        r++;
        ws.getRow(r).height = 16;
        ws.mergeCells(r, 1, r, 11);
        const dtCell = ws.getCell(r, 1);
        dtCell.value = `ຍອດລວມວັນທີ ${dateKey}`;
        const dtSubBorder = {
          top:    { style: "thin",   color: { argb: "FF6FA8D0" } },
          bottom: { style: "thin",   color: { argb: "FF888888" } },
          left:   { style: "thin",   color: { argb: "FF888888" } },
          right:  { style: "thin",   color: { argb: "FF888888" } },
        };
        applyStyle(dtCell, { bold: true, size: 8, hAlign: "right", bgColor: "FFDEEAF7", color: "FF0C2D6B", border: dtSubBorder });

        [{ c: 12, v: dDr }, { c: 13, v: dCr }].forEach(({ c, v }) => {
          const cell = ws.getCell(r, c);
          cell.value = v;
          applyStyle(cell, { bold: true, size: 8, hAlign: "right", bgColor: "FFDEEAF7", color: "FF0C2D6B", numFmt: NUM_FMT, border: dtSubBorder });
        });
      });

    // ── Month subtotal ──
    r++;
    ws.getRow(r).height = 18;
    ws.mergeCells(r, 1, r, 11);
    const msCell = ws.getCell(r, 1);
    msCell.value = `ຍອດລວມເດືອນ ${monthYear}`;
    const msBorder = {
      top:    { style: "medium", color: { argb: "FF27AE60" } },
      bottom: { style: "medium", color: { argb: "FF27AE60" } },
      left:   { style: "thin",   color: { argb: "FF888888" } },
      right:  { style: "thin",   color: { argb: "FF888888" } },
    };
    applyStyle(msCell, { bold: true, size: 8.5, hAlign: "right", bgColor: "FFDAF0E0", color: "FF0D4D1E", border: msBorder });

    [{ c: 12, v: mDr }, { c: 13, v: mCr }].forEach(({ c, v }) => {
      const cell = ws.getCell(r, c);
      cell.value = v;
      applyStyle(cell, { bold: true, size: 8.5, hAlign: "right", bgColor: "FFDAF0E0", color: "FF0D4D1E", numFmt: NUM_FMT, border: msBorder });
    });
  });

  // ── Grand total ──────────────────────────────────────────
  r++;
  ws.getRow(r).height = 22;
  ws.mergeCells(r, 1, r, 11);
  const gtCell = ws.getCell(r, 1);
  gtCell.value = "ລວມທັງໝົດ  /  GRAND TOTAL";
  const gtBorder = {
    top:    { style: "thick",  color: { argb: "FF000000" } },
    bottom: { style: "double", color: { argb: "FF000000" } },
    left:   { style: "thin",   color: { argb: "FF888888" } },
    right:  { style: "thin",   color: { argb: "FF888888" } },
  };
  applyStyle(gtCell, { bold: true, size: 10, hAlign: "center", bgColor: "FFF2F2F2", border: gtBorder });

  [{ c: 12, v: grandDr }, { c: 13, v: grandCr }].forEach(({ c, v }) => {
    const cell = ws.getCell(r, c);
    cell.value = v;
    applyStyle(cell, { bold: true, size: 10, hAlign: "right", bgColor: "FFF2F2F2", numFmt: NUM_FMT, border: gtBorder });
  });

  // ── Signature section ────────────────────────────────────
  r += 2;
  ws.getRow(r).height = 4;
  for (let c = 1; c <= 13; c++) {
    ws.getCell(r, c).border = { bottom: { style: "thin", color: { argb: "FFBBBBBB" } } };
  }

  const sigDefs = [
    { title: "ຜູ້ອໍານວຍການ",  sub: "Director / CEO",      cols: [1, 4]  },
    { title: "ຫົວໜ້າບັນຊີ",   sub: "Accounting Manager",  cols: [5, 9]  },
    { title: "ຜູ້ສະຫຼຸບ",     sub: "Accountant",           cols: [10, 13] },
  ];

  sigDefs.forEach(({ title, sub, cols: [sc, ec] }) => {
    const sr = r + 1;
    ws.mergeCells(sr,     sc, sr,     ec);
    ws.mergeCells(sr + 1, sc, sr + 1, ec);
    ws.mergeCells(sr + 2, sc, sr + 2, ec); // blank space
    ws.mergeCells(sr + 3, sc, sr + 3, ec); // line
    ws.mergeCells(sr + 4, sc, sr + 4, ec); // name

    ws.getRow(sr).height     = 14;
    ws.getRow(sr + 1).height = 12;
    ws.getRow(sr + 2).height = 36;
    ws.getRow(sr + 3).height = 4;
    ws.getRow(sr + 4).height = 14;

    const tCell = ws.getCell(sr, sc);
    tCell.value = title;
    applyStyle(tCell, { bold: true, size: 9.5, border: null });

    const sCell = ws.getCell(sr + 1, sc);
    sCell.value = sub;
    applyStyle(sCell, { italic: true, size: 8, color: "FF888888", border: null });

    // bottom border as signature line
    for (let c = sc; c <= ec; c++) {
      ws.getCell(sr + 3, c).border = { bottom: { style: "thin", color: { argb: "FF333333" } } };
    }

    const nCell = ws.getCell(sr + 4, sc);
    nCell.value = "( _________________________ )";
    applyStyle(nCell, { size: 8.5, color: "FF555555", border: null });
  });

  // ── Download ─────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `${filename}.xlsx`);
}