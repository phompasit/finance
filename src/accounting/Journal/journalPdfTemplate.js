// src/pages/journal/journalPdfTemplate.js

/**
 * Generates a professional PDF report for journal vouchers
 * Groups entries by month and date with running totals
 * Includes description column per entry (shown only on first line)
 */
export default function journalPdfTemplate({ data, user }) {
  if (!Array.isArray(data) || data.length === 0) return;

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const formatNumber = (n) =>
    n !== undefined && n !== null && n !== 0
      ? Number(n).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "";

  const formatNumberTotal = (n) =>
    n !== undefined && n !== null
      ? Number(n).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "0.00";

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "");

  const formatMonthYear = (d) => {
    if (!d) return "";
    const date = new Date(d);
    return `${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  const getMonthSortKey = (d) => {
    if (!d) return "";
    const date = new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  };

  const getDateSortKey = (dateStr) => {
    const parts = dateStr.split("/");
    return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : dateStr;
  };

  // ============================================================================
  // DATA PROCESSING
  // ============================================================================

  const groupedData = {};

  data.forEach((entry) => {
    const sortKey  = getMonthSortKey(entry.date);
    const monthYear = formatMonthYear(entry.date);
    const dateKey  = formatDate(entry.date);

    if (!groupedData[sortKey]) {
      groupedData[sortKey] = { display: monthYear, dates: {} };
    }
    if (!groupedData[sortKey].dates[dateKey]) {
      groupedData[sortKey].dates[dateKey] = [];
    }
    groupedData[sortKey].dates[dateKey].push(entry);
  });

  // ============================================================================
  // BUILD TABLE ROWS
  // ============================================================================

  const buildTableRows = () => {
    let rows = "";
    let rowNumber = 1;
    let grandTotalDebitLAK  = 0;
    let grandTotalCreditLAK = 0;

    Object.keys(groupedData).sort().forEach((sortKey) => {
      const monthData = groupedData[sortKey];
      const monthYear = monthData.display;
      let monthTotalDebitLAK  = 0;
      let monthTotalCreditLAK = 0;

      rows += `
      <tr class="month-header">
        <td colspan="13">ເດືອນ: ${monthYear}</td>
      </tr>`;

      const sortedDates = Object.keys(monthData.dates).sort((a, b) =>
        getDateSortKey(a).localeCompare(getDateSortKey(b))
      );

      sortedDates.forEach((dateKey) => {
        let dateTotalDebitLAK  = 0;
        let dateTotalCreditLAK = 0;

        monthData.dates[dateKey].forEach((entry) => {
          const entryLines = entry.lines || [];

          entryLines.forEach((line, lineIndex) => {
            const account   = line.accountId || {};
            const debitLAK  = Number(line.debitLAK  || 0);
            const creditLAK = Number(line.creditLAK || 0);

            dateTotalDebitLAK  += debitLAK;
            dateTotalCreditLAK += creditLAK;
            monthTotalDebitLAK  += debitLAK;
            monthTotalCreditLAK += creditLAK;
            grandTotalDebitLAK  += debitLAK;
            grandTotalCreditLAK += creditLAK;

            const isFirst    = lineIndex === 0;
            const totalLines = entryLines.length;
            const rs         = isFirst && totalLines > 1 ? ` rowspan="${totalLines}"` : "";

            const dateCell  = isFirst ? `<td class="center td-date"${rs}>${dateKey}</td>` : "";
            const refCell   = isFirst ? `<td class="center td-ref"${rs}>${entry.reference || ""}</td>` : "";
            const descCell  = isFirst ? `<td class="left td-desc"${rs}>${entry.description || ""}</td>` : "";

            rows += `
            <tr class="data-row">
              <td class="center td-no">${rowNumber++}</td>
              ${dateCell}
              ${refCell}
              ${descCell}
              <td class="center td-code">${line.side === "dr" ? account.code || "" : ""}</td>
              <td class="center td-code">${line.side === "cr" ? account.code || "" : ""}</td>
              <td class="left td-name">${account.name || ""}</td>
              <td class="right td-amt">${line.side === "dr" ? formatNumber(line.debitOriginal)  : ""}</td>
              <td class="right td-amt">${line.side === "cr" ? formatNumber(line.creditOriginal) : ""}</td>
              <td class="center td-ccy">${line.currency || ""}</td>
              <td class="right td-rate">${line.exchangeRate && line.exchangeRate !== 1 ? formatNumber(line.exchangeRate) : "1.00"}</td>
              <td class="right td-lak dr-col">${debitLAK  ? formatNumber(debitLAK)  : ""}</td>
              <td class="right td-lak cr-col">${creditLAK ? formatNumber(creditLAK) : ""}</td>
            </tr>`;
          });
        });

        rows += `
        <tr class="date-subtotal">
          <td colspan="11" class="right">ຍອດລວມວັນທີ ${dateKey}</td>
          <td class="right">${formatNumberTotal(dateTotalDebitLAK)}</td>
          <td class="right">${formatNumberTotal(dateTotalCreditLAK)}</td>
        </tr>`;
      });

      rows += `
      <tr class="month-subtotal">
        <td colspan="11" class="right">ຍອດລວມເດືອນ ${monthYear}</td>
        <td class="right">${formatNumberTotal(monthTotalDebitLAK)}</td>
        <td class="right">${formatNumberTotal(monthTotalCreditLAK)}</td>
      </tr>`;
    });

    return { rows, grandTotalDebitLAK, grandTotalCreditLAK };
  };

  const { rows, grandTotalDebitLAK, grandTotalCreditLAK } = buildTableRows();

  // ============================================================================
  // CONFIG
  // ============================================================================

  const filename = data.length === 1
    ? data[0].reference || "journal-voucher"
    : "journal-voucher-list";

  const companyName  = user?.companyId?.name  || "";
  const companyPhone = user?.companyId?.phone || "";
  const currentDate  = formatDate(new Date());

  // ============================================================================
  // HTML TEMPLATE
  // ============================================================================

  const html = `<!DOCTYPE html>
<html lang="lo">
<head>
<meta charset="UTF-8"/>
<title>ບັດຜ່ານບັນຊີ - ${filename}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
<style>
/* ─── PAGE ─────────────────────────────────────────────── */
@page { size: A4 landscape; margin: 12mm 10mm 14mm 10mm; }
*, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

body {
  font-family: "Noto Sans Lao", sans-serif;
  font-size: 9pt;
  color: #111;
  line-height: 1.55;
  background: #fff;
}

/* ─── HEADER ────────────────────────────────────────────── */
.header {
  text-align: center;
  padding-bottom: 3.5mm;
  margin-bottom: 4.5mm;
  border-top: 3pt solid #111;
  border-bottom: 1pt solid #111;
  padding-top: 2.5mm;
}
.hd-state {
  font-size: 11pt;
  font-weight: 700;
  letter-spacing: 0.5px;
  margin-bottom: 1mm;
}
.hd-motto {
  font-size: 8.5pt;
  color: #555;
  letter-spacing: 0.5px;
  margin-bottom: 3.5mm;
}
.hd-title {
  display: inline-block;
  font-size: 14.5pt;
  font-weight: 700;
  letter-spacing: 3px;
  padding: 1.5mm 10mm;
  border-top: 0.75pt solid #888;
  border-bottom: 0.75pt solid #888;
}

/* ─── META BAR ──────────────────────────────────────────── */
.meta-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  font-size: 8.5pt;
  line-height: 1.75;
  padding-bottom: 2.5mm;
  margin-bottom: 3.5mm;
  border-bottom: 0.5pt solid #bbb;
}
.meta-right { text-align: right; color: #555; }
.ml { font-weight: 600; display: inline-block; min-width: 62px; }

/* ─── TABLE SCAFFOLD ────────────────────────────────────── */
/*
  Landscape A4 usable ≈ 267mm after 10mm margins each side.
  13 columns. Widths in mm:
  no=4 | date=17 | ref=25 | desc=36 | dr=13 | cr=13 |
  name=38 | orig-dr=19 | orig-cr=19 | ccy=8 | rate=16 |
  lak-dr=25 | lak-cr=24  → total = 257mm (safe)
*/
table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  border: 1.5pt solid #111;
  font-size: 8pt;
}

col.c-no      { width:  4mm; }
col.c-date    { width: 17mm; }
col.c-ref     { width: 25mm; }
col.c-desc    { width: 36mm; }
col.c-drcode  { width: 13mm; }
col.c-crcode  { width: 13mm; }
col.c-name    { width: 38mm; }
col.c-odr     { width: 19mm; }
col.c-ocr     { width: 19mm; }
col.c-ccy     { width:  8mm; }
col.c-rate    { width: 16mm; }
col.c-ldr     { width: 25mm; }
col.c-lcr     { width: 24mm; }

/* ─── TH ─────────────────────────────────────────────────── */
th, td {
  border: 0.5pt solid #888;
  padding: 3px 2.5px;
  vertical-align: middle;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

thead th {
  color: #1e1e1e;
  font-weight: 600;
  font-size: 7.5pt;
  text-align: center;
  line-height: 1.3;
  padding: 4px 3px;
  border-color: #444;
}
thead tr:nth-child(2) th {
  
  font-size: 7pt;
  padding: 2.5px 3px;
}

/* ─── ALIGNMENT HELPERS ─────────────────────────────────── */
.center { text-align: center; }
.left   { text-align: left;  padding-left: 3.5px; }
.right  { text-align: right; padding-right: 3.5px; font-variant-numeric: tabular-nums; }

/* ─── CELL STYLES ───────────────────────────────────────── */
/* row number */
.td-no {
  font-size: 7pt;
  color: #999;
}

/* date — never wrap */
.td-date {
  font-size: 7.5pt;
  white-space: nowrap;
}

/* reference — small, no wrap, ellipsis if overflow */
.td-ref {
  font-size: 7pt;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* description — italic, wraps, line-clamp for very long text */
.td-desc {
  font-size: 7.5pt;
  font-style: italic;
  color: #333;
  line-height: 1.4;
}

/* account code — semi-bold, no wrap */
.td-code {
  font-size: 7.5pt;
  font-weight: 500;
  white-space: nowrap;
}

/* account name — wraps naturally */
.td-name {
  font-size: 7.5pt;
  line-height: 1.4;
}

/* original amount */
.td-amt {
  font-size: 7.5pt;
}

/* currency */
.td-ccy {
  font-size: 7pt;
  color: #666;
}

/* exchange rate */
.td-rate {
  font-size: 7.5pt;
  color: #555;
}

/* LAK columns */
.td-lak {
  font-size: 8pt;
  font-weight: 600;
}
.dr-col { color: #0c2d6b; }
.cr-col { color: #0d4d1e; }

/* ─── SPECIAL ROWS ──────────────────────────────────────── */

/* zebra — data rows only */
tbody tr.data-row:nth-child(odd)  td { background: #fff; }
tbody tr.data-row:nth-child(even) td { background: #f6f7f8; }

/* month header */
.month-header td {
  color:#1e1e1e;
  font-size: 8.5pt;
  font-weight: 600;
  padding: 4.5px 6px;
  border-color: #000;
  letter-spacing: 0.3px;
}

/* date subtotal */
.date-subtotal td {
  background: #deeaf7 !important;
  font-size: 7.5pt;
  font-weight: 600;
  color: #0c2d6b;
  padding: 3px 4px;
  border-top: 1pt solid #6fa8d0;
}

/* month subtotal */
.month-subtotal td {
  background: #daf0e0 !important;
  font-size: 8pt;
  font-weight: 700;
  color: #0d4d1e;
  padding: 4px 4px;
  border-top: 1.5pt solid #27ae60;
  border-bottom: 1.5pt solid #27ae60;
}

/* grand total */
.grand-total-row td {
  color:#1e1e1e;
  font-size: 9pt;
  font-weight: 700;
  padding: 6px 4px;
  border-top: 2.5pt solid #000;
  border-bottom: 2.5pt double #000;
}

/* ─── FOOTER & SIGNATURES ───────────────────────────────── */
.footer-row {
  display: flex;
  justify-content: flex-end;
  gap: 18mm;
  font-size: 8.5pt;
  color: #444;
  margin-top: 4mm;
  margin-bottom: 6mm;
  padding-top: 2mm;
  border-top: 0.5pt solid #bbb;
}

.sigs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8mm;
  text-align: center;
  margin-top: 6mm;
}
.sig {
  border: 0.5pt solid #ccc;
  padding: 3mm 4mm 4mm;
}
.sig .s-title { font-size: 9pt; font-weight: 700; margin-bottom: 0.8mm; }
.sig .s-sub   { font-size: 7.5pt; color: #888; font-style: italic; margin-bottom: 13mm; }
.sig .s-line  { border-top: 0.75pt solid #333; width: 75%; margin: 0 auto 1.5mm; }
.sig .s-name  { font-size: 8pt; color: #555; }

/* ─── PRINT ─────────────────────────────────────────────── */
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table { page-break-inside: auto; }
  tr    { page-break-inside: avoid; page-break-after: auto; }
  thead { display: table-header-group; }

  thead th                        { color:#1e1e1e !important; }
  thead tr:nth-child(2) th        
  .month-header td                {  color:#1e1e1e !important; }
  .date-subtotal td               { background: #deeaf7 !important; }
  .month-subtotal td              { background: #daf0e0 !important; }
  .grand-total-row td             {  color:#1e1e1e !important; }
  tbody tr.data-row:nth-child(even) td { background: #f6f7f8 !important; }
}
</style>
</head>
<body>

<!-- HEADER -->
<div class="header">
  <div class="hd-state">ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ</div>
  <div class="hd-motto">ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ  ເອກະພາບ  ວັດທະນະຖາວອນ</div>
  <div class="hd-title">ປື້ມປະຈຳວັນທົ່ວໄປ</div>
</div>

<!-- META BAR -->
<div class="meta-bar">
  <div class="meta-left">
    ${companyName  ? `<div><span class="ml">ບໍລິສັດ :</span> ${companyName}</div>`  : ""}
    ${companyPhone ? `<div><span class="ml">ເບີໂທ &nbsp;&nbsp;:</span> ${companyPhone}</div>` : ""}
  </div>
  <div class="meta-right">
    <div><span class="ml">ວັນທີພິມ :</span> ${currentDate}</div>
    <div><span class="ml">ຈຳນວນ &nbsp;&nbsp;:</span> ${data.length} ລາຍການ</div>
  </div>
</div>

<!-- TABLE -->
<table>
<colgroup>
  <col class="c-no">   <col class="c-date">  <col class="c-ref">
  <col class="c-desc"> <col class="c-drcode"><col class="c-crcode">
  <col class="c-name"> <col class="c-odr">   <col class="c-ocr">
  <col class="c-ccy">  <col class="c-rate">
  <col class="c-ldr">  <col class="c-lcr">
</colgroup>
<thead>
<tr>
  <th rowspan="2">#</th>
  <th rowspan="2">ວັນທີ</th>
  <th rowspan="2">ໃບຢັ້ງຢືນ</th>
  <th rowspan="2">ລາຍລະອຽດ</th>
  <th colspan="2">ເລກບັນຊີ</th>
  <th rowspan="2">ຊື່ບັນຊີ</th>
  <th colspan="2">ມູນຄ່າເດີມ</th>
  <th rowspan="2">ສ.ງ.</th>
  <th rowspan="2">ອັດຕາ<br>ແລກປ່ຽນ</th>
  <th colspan="2">ຈຳນວນ (LAK)</th>
</tr>
<tr>
  <th>ໜີ້</th><th>ມີ</th>
   <th>ໜີ້</th><th>ມີ</th>
   <th>ໜີ້</th><th>ມີ</th>
</tr>
</thead>
<tbody>
${rows}
<tr class="grand-total-row">
  <td colspan="11" class="center">ລວມທັງໝົດ &nbsp;/&nbsp; GRAND TOTAL</td>
  <td class="right">${formatNumberTotal(grandTotalDebitLAK)}</td>
  <td class="right">${formatNumberTotal(grandTotalCreditLAK)}</td>
</tr>
</tbody>
</table>

<!-- FOOTER -->
<div class="footer-row">
  <span>ສະຖານທີ່: _______________________________</span>
  <span>ວັນທີ: ${currentDate}</span>
</div>

<!-- SIGNATURES -->
<div class="sigs">
  <div class="sig">
    <div class="s-title">ຜູ້ອໍານວຍການ</div>
    <div class="s-sub">Director / CEO</div>
    <div class="s-line"></div>
    <div class="s-name">( _________________________ )</div>
  </div>
  <div class="sig">
    <div class="s-title">ຫົວໜ້າບັນຊີ</div>
    <div class="s-sub">Accounting Manager </div>
    <div class="s-line"></div>
    <div class="s-name">( _________________________ )</div>
  </div>
  <div class="sig">
    <div class="s-title">ຜູ້ສະຫຼຸບ</div>
    <div class="s-sub">Accountant</div>
    <div class="s-line"></div>
    <div class="s-name">( _________________________ )</div>
  </div>
</div>

<script>
window.onload = function () {
  html2pdf()
    .set({
      margin: [12, 10, 14, 10],
      filename: "${filename}.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2.5, useCORS: true, letterRendering: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
    })
    .from(document.body)
    .save()
    .then(() => console.log("PDF saved: ${filename}.pdf"))
    .catch((err) => console.error("PDF error:", err));
};
</script>
</body>
</html>`;

  // ============================================================================
  // RENDER
  // ============================================================================

  const win = window.open("", "_blank");
  if (!win) {
    console.error("Popup blocked — please allow popups for this site.");
    return;
  }
  win.document.write(html);
  win.document.close();
}