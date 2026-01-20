// src/pages/journal/journalPdfTemplate.js

/**
 * Generates a professional PDF report for journal vouchers
 * Groups entries by month and date with running totals
 */
export default function journalPdfTemplate({ data, user }) {
  if (!Array.isArray(data) || data.length === 0) return;

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const formatNumber = (n) =>
    n !== undefined && n !== null
      ? Number(n).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "";

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "");

  const formatMonthYear = (d) => {
    if (!d) return "";
    const date = new Date(d);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${month}/${year}`;
  };

  const getMonthSortKey = (d) => {
    if (!d) return "";
    const date = new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  };

  // ============================================================================
  // DATA PROCESSING - Group by Month and Date
  // ============================================================================

  const groupedData = {};

  data.forEach((entry) => {
    const sortKey = getMonthSortKey(entry.date);
    const monthYear = formatMonthYear(entry.date);
    const dateKey = formatDate(entry.date);

    if (!groupedData[sortKey]) {
      groupedData[sortKey] = {
        display: monthYear,
        dates: {},
      };
    }

    if (!groupedData[sortKey].dates[dateKey]) {
      groupedData[sortKey].dates[dateKey] = [];
    }

    groupedData[sortKey].dates[dateKey].push(entry);
  });

  // ============================================================================
  // TABLE GENERATION - Build HTML rows with totals
  // ============================================================================

  const buildTableRows = () => {
    let rows = "";
    let rowNumber = 1;
    let grandTotalDebitLAK = 0;
    let grandTotalCreditLAK = 0;

    Object.keys(groupedData)
      .sort()
      .forEach((sortKey) => {
        const monthData = groupedData[sortKey];
        const monthYear = monthData.display;
        let monthTotalDebitLAK = 0;
        let monthTotalCreditLAK = 0;

        // Month Header Row
        rows += `
        <tr class="month-header">
          <td colspan="12"><strong>ເດືອນ: ${monthYear}</strong></td>
        </tr>`;

        Object.keys(monthData.dates).forEach((dateKey) => {
          let dateTotalDebitLAK = 0;
          let dateTotalCreditLAK = 0;

          // Process each journal entry for this date
          monthData.dates[dateKey].forEach((entry) => {
            entry.lines?.forEach((line) => {
              const account = line.accountId || {};
              const debitLAK = Number(line.debitLAK || 0);
              const creditLAK = Number(line.creditLAK || 0);

              // Accumulate totals
              dateTotalDebitLAK += debitLAK;
              dateTotalCreditLAK += creditLAK;
              monthTotalDebitLAK += debitLAK;
              monthTotalCreditLAK += creditLAK;
              grandTotalDebitLAK += debitLAK;
              grandTotalCreditLAK += creditLAK;

              // Build data row
              rows += `
              <tr>
                <td class="center">${rowNumber++}</td>
                <td class="center">${dateKey}</td>
                <td class="center">${entry.reference || ""}</td>
                <td class="center">${
                  line.side === "dr" ? account.code || "" : ""
                }</td>
                <td class="center">${
                  line.side === "cr" ? account.code || "" : ""
                }</td>
                <td class="left">${account.name || ""}</td>
                <td class="right">${
                  line.side === "dr" ? formatNumber(line.debitOriginal) : ""
                }</td>
                <td class="right">${
                  line.side === "cr" ? formatNumber(line.creditOriginal) : ""
                }</td>
                <td class="center">${line.currency || ""}</td>
                <td class="right">${formatNumber(line.exchangeRate)}</td>
                <td class="right">${formatNumber(line.debitLAK)}</td>
                <td class="right">${formatNumber(line.creditLAK)}</td>
              </tr>`;
            });
          });

          // Daily Subtotal Row
          rows += `
          <tr class="date-subtotal">
            <td colspan="10" class="right"><strong>ຍອດລວມວັນທີ ${dateKey}:</strong></td>
            <td class="right"><strong>${formatNumber(
              dateTotalDebitLAK
            )}</strong></td>
            <td class="right"><strong>${formatNumber(
              dateTotalCreditLAK
            )}</strong></td>
          </tr>`;
        });

        // Monthly Subtotal Row
        rows += `
        <tr class="month-subtotal">
          <td colspan="10" class="right"><strong>ຍອດລວມເດືອນ ${monthYear}:</strong></td>
          <td class="right"><strong>${formatNumber(
            monthTotalDebitLAK
          )}</strong></td>
          <td class="right"><strong>${formatNumber(
            monthTotalCreditLAK
          )}</strong></td>
        </tr>`;
      });

    return {
      rows,
      grandTotalDebitLAK,
      grandTotalCreditLAK,
    };
  };

  const { rows, grandTotalDebitLAK, grandTotalCreditLAK } = buildTableRows();

  // ============================================================================
  // PDF CONFIGURATION
  // ============================================================================

  const filename =
    data.length === 1
      ? data[0].reference || "journal-voucher"
      : "journal-voucher-list";

  const companyName = user?.companyId?.name || "";
  const companyPhone = user?.companyId?.phone || "";
  const currentDate = formatDate(new Date());

  // ============================================================================
  // HTML TEMPLATE GENERATION
  // ============================================================================

  const htmlTemplate = `
<!DOCTYPE html>
<html lang="lo">
<head>
<meta charset="UTF-8" />
<title>Journal Voucher - ${filename}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>

<style>
/* ===== PAGE SETUP ===== */
@page { 
  size: A4 landscape; 
  margin: 15mm 12mm;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: "Noto Sans Lao", sans-serif;
  font-size: 10pt;
  color: #000;
  line-height: 1.5;
  background: #fff;
}

/* ===== HEADER SECTION ===== */
.header {
  text-align: center;
  margin-bottom: 8mm;
  border-bottom: 2pt solid #000;
  padding-bottom: 4mm;
}

.header h1 {
  font-size: 14pt;
  font-weight: 700;
  margin-bottom: 2mm;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.header h2 {
  font-size: 10pt;
  font-weight: 400;
  font-style: italic;
  margin-bottom: 3mm;
  color: #333;
}

.header h3 {
  font-size: 15pt;
  font-weight: 700;
  margin-top: 3mm;
  text-decoration: underline;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* ===== DOCUMENT INFO ===== */
.doc-info {
  margin-bottom: 8mm;
  font-size: 10pt;
  line-height: 1.8;
}

.info-group {
  margin-bottom: 3mm;
}

.info-group .label {
  font-weight: 600;
  display: inline-block;
  width: 80px;
}

.info-group .value {
  display: inline;
}

/* ===== TABLE STYLES ===== */
.table-container {
  margin: 15px 0 25px 0;
}

table {
  width: 100%;
  border-collapse: collapse;
  border: 1.5pt solid #000;
  font-size: 9pt;
}

th, td {
  border: 1px solid #333;
  padding: 6px 5px;
  vertical-align: middle;
}

th {
  background: #f5f5f5;
  color: #000;
  font-weight: 700;
  font-size: 9pt;
  text-align: center;
  white-space: normal;
  line-height: 1.3;
}

td {
  font-size: 9pt;
  line-height: 1.4;
  color: #000;
}

/* Column Alignment */
.center { text-align: center; }
.left { text-align: left; padding-left: 6px; }
.right { 
  text-align: right; 
  padding-right: 6px;
  font-family: 'Courier New', monospace;
}

/* Special Rows */
.month-header td {
  background: #d0e4f7;
  font-weight: 700;
  font-size: 10pt;
  padding: 8px 6px;
  border: 1.5px solid #000;
  text-align: left;
}

.date-subtotal {
  background: #f5f5f5;
}

.date-subtotal td {
  font-weight: 600;
  border-top: 1.5px solid #666;
  font-size: 9pt;
}

.month-subtotal {
  background: #e8e8e8;
}

.month-subtotal td {
  font-weight: 700;
  padding: 8px 6px;
  border-top: 2px solid #000;
  border-bottom: 2px solid #000;
  font-size: 9.5pt;
}

.grand-total-row {
  background: #c8e6c9;
  font-weight: 700;
}

.grand-total-row td {
  border-top: 3pt solid #000;
  border-bottom: 3pt double #000;
  padding: 10px 6px;
  font-size: 10pt;
}

/* ===== FOOTER SECTION ===== */
.footer-info {
  margin-top: 6mm;
  margin-bottom: 10mm;
  display: flex;
  gap: 30px;
  justify-content:"flex-end"
  font-size: 10pt;
}

/* ===== SIGNATURE SECTION ===== */
.signatures {
  margin-top: 12mm;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15mm;
  text-align: center;
}

.signature-box {
  min-height: 55mm;
}

.signature-box .title {
  font-weight: 700;
  font-size: 10pt;
  margin-bottom: 2mm;
}

.signature-box .subtitle {
  font-size: 9pt;
  margin-bottom: 18mm;
  font-style: italic;
  color: #555;
}

.signature-box .line {
  border-top: 1pt solid #000;
  margin: 0 auto;
  width: 75%;
  margin-bottom: 2mm;
}

.signature-box .name {
  font-size: 9pt;
}

/* ===== PRINT OPTIMIZATION ===== */
@media print {
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  
  table {
    page-break-inside: auto;
    font-size: 8.5pt;
  }
  
  tr {
    page-break-inside: avoid;
    page-break-after: auto;
  }
  
  thead {
    display: table-header-group;
  }
  
  th {
    background: #f5f5f5 !important;
    font-size: 8pt !important;
    padding: 5px 4px !important;
  }
  
  td {
    font-size: 8pt !important;
    padding: 5px 4px !important;
  }
  
  .month-header td {
    background: #d0e4f7 !important;
    font-size: 9pt !important;
  }
  
  .date-subtotal td {
    background: #f5f5f5 !important;
  }
  
  .month-subtotal td {
    background: #e8e8e8 !important;
  }
  
  .grand-total-row td {
    background: #c8e6c9 !important;
  }
}
</style>
</head>

<body>

<!-- HEADER -->
<div class="header">
  <h1>ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ</h1>
  <h2>ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ</h2>
  <h3>ບັດຜ່ານບັນຊີ</h3>
</div>

<!-- DOCUMENT INFO -->
<div class="doc-info">
  <div class="info-group">
    <div><span class="label">ບໍລິສັດ:</span> <span class="value">${companyName}</span></div>
  </div>
  <div class="info-group">
    <div><span class="label">ເບີໂທ:</span> <span class="value">${companyPhone}</span></div>
  </div>
</div>

<!-- TABLE -->
<div class="table-container">
<table>
<thead>
<tr>
  <th rowspan="2">ລຳດັບ</th>
  <th rowspan="2">ວັນທີ</th>
  <th rowspan="2">ໃບຢັ້ງຢືນ</th>
  <th colspan="2">ເລກບັນຊີ</th>
  <th rowspan="2">ຄຳອະທິບາຍ</th>
  <th colspan="2">ມູນຄ່າເດິມ</th>
  <th rowspan="2">ສະກຸນເງິນ</th>
  <th rowspan="2">ອັດຕາແລກປ່ຽນ</th>
  <th colspan="2">ຈຳນວນເງິນ (LAK)</th>
</tr>
<tr>
  <th>DR</th>
  <th>CR</th>
  <th>DR</th>
  <th>CR</th>
  <th>DR</th>
  <th>CR</th>
</tr>
</thead>

<tbody>
${rows}
<tr class="grand-total-row">
  <td colspan="10" class="center"><strong>ລວມທັງໝົດ / GRAND TOTAL</strong></td>
  <td class="right"><strong>${formatNumber(grandTotalDebitLAK)}</strong></td>
  <td class="right"><strong>${formatNumber(grandTotalCreditLAK)}</strong></td>
</tr>
</tbody>
</table>
</div>

<!-- FOOTER INFO -->
<div class="footer-info">
  <div>ສະຖານທີ່: .....................................</div>
  <div>ວັນທີ: ${currentDate}</div>
</div>

<!-- SIGNATURES -->
<div class="signatures">
  <div class="signature-box">
    <div class="title">ຜູ້ອໍານວຍການ</div>
    <div class="subtitle">(CEO)</div>
    <div class="line"></div>
    <div class="name">(...............................)</div>
  </div>
  
  <div class="signature-box">
    <div class="title">ຫົວໜ້າການເງິນ</div>
    <div class="subtitle">(CFO)</div>
    <div class="line"></div>
    <div class="name">(...............................)</div>
  </div>
  
  <div class="signature-box">
    <div class="title">ພະນັກງານບັນຊີ</div>
    <div class="subtitle">(Accountant)</div>
    <div class="line"></div>
    <div class="name">(...............................)</div>
  </div>
</div>

<script>
window.onload = function () {
  const element = document.body;

  html2pdf()
    .set({
          margin: [25, 25, 25, 25],
      filename: '${filename}.pdf',
      image: {
        type: "jpeg",
        quality: 0.95
      },
      html2canvas: {
        scale: 2,
        useCORS: true,

      },
      jsPDF: {
        unit: "mm",
        format: "a5",
        orientation: "landscape"
      },
    })
    .from(element)
    .save()
    .then(() => {
      console.log('PDF generated successfully');
    })
    .catch((error) => {
      console.error('PDF generation error:', error);
    });
};
</script>

</body>
</html>
  `;

  // ============================================================================
  // RENDER PDF IN NEW WINDOW
  // ============================================================================

  const win = window.open("", "_blank");
  win.document.write(htmlTemplate);
  win.document.close();
}
