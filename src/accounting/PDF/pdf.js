export default function pdfJournal({ data, user }) {
  /* ===== Helpers ===== */
  console.log("data", data);
  const formatNumber = (n) =>
    n !== undefined && n !== null
      ? Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 })
      : "";

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "");

  /* ===== Build Table Rows ===== */
  let rows = "";
  let no = 1;

  data?.lines?.forEach((l) => {
    const acc = l.accountId || {};
    rows += `
      <tr>
        <td class="center">${no++}</td>
        <td class="center">${formatDate(data.date)}</td>
        <td class="center">${data.reference || ""}</td>
        <td class="center">${l.side === "dr" ? acc.code || "" : ""}</td>
        <td class="center">${l.side === "cr" ? acc.code || "" : ""}</td>
        <td class="left">${acc.name || ""}</td>
        <td class="right">${
          l.side === "dr" ? formatNumber(l.debitOriginal) : ""
        }</td>
        <td class="right">${
          l.side === "cr" ? formatNumber(l.creditOriginal) : ""
        }</td>
        <td class="center">${l.currency || ""}</td>
        <td class="right">${formatNumber(l.exchangeRate)}</td>
        <td class="right">${formatNumber(l.debitLAK)}</td>
        <td class="right">${formatNumber(l.creditLAK)}</td>
      </tr>`;
  });

  const win = window.open("", "_blank");

  win.document.write(`
<!DOCTYPE html>
<html lang="lo">
<head>
<meta charset="UTF-8" />
<title>Journal Voucher</title>

<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>

<style>
@page { 
  size: A4; 
  margin: 20mm 15mm;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: "Noto Sans Lao", sans-serif;
  font-size: 11pt;
  color: #000;
  line-height: 1.6;
  background: white;
}

/* ===== HEADER ===== */
.header {
  text-align: center;
  margin-bottom: 10mm;
  border-bottom: 2pt solid #000;
  padding-bottom: 5mm;
}

.header h1 {
  font-size: 15pt;
  font-weight: 700;
  margin-bottom: 2mm;
  text-transform: uppercase;
}

.header h2 {
  font-size: 11pt;
  font-weight: 400;
  font-style: italic;
  margin-bottom: 3mm;
}

.header h3 {
  font-size: 16pt;
  font-weight: 700;
  margin-top: 3mm;
  text-decoration: underline;
  text-transform: uppercase;
}

/* ===== DOCUMENT INFO ===== */
.doc-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10mm;
  margin-bottom: 8mm;
  font-size: 11pt;
}

.info-group {
  line-height: 1.8;
}

.info-group .label {
  font-weight: 600;
  display: inline-block;
  width: 120px;
}

.info-group .value {
  display: inline;
}

.description {
  margin-bottom: 6mm;
  font-size: 11pt;
  line-height: 1.8;
}

.description .label {
  font-weight: 600;
  display: inline-block;
  width: 120px;
}

/* ===== TABLE ===== */
.table-container {
 margin: 20px 0 30px 0;
  overflow: visible;
}

table {
  width: 100%;
  border-collapse: collapse;
  border: 1.5pt solid #000;
  font-size: 10pt;
   font-family: "Noto Sans Lao", sans-serif;
}

th, td {
  border: 1px solid #000;
  padding: 8px 6px;
  word-wrap: break-word;
  overflow-wrap: break-word;
   font-family: "Noto Sans Lao", sans-serif;
}

th {
  background: #fff;
  color: #000;
  font-weight: 700;
  font-size: 11px;
  text-align: center;
  white-space: normal;
  line-height: 1.4;
   font-family: "Noto Sans Lao", sans-serif;
  vertical-align: middle;
}

td {
  font-size: 12px;
  line-height: 1.5;
  color: #000;
  vertical-align: top;
}

/* จัดแนวตาราง */
td:nth-child(1), 
td:nth-child(2), 
td:nth-child(3),
td:nth-child(9) {
  text-align: center;
  vertical-align: middle;
}

td:nth-child(4),
td:nth-child(10) {
  text-align: left;
  padding-left: 8px;
}

td:nth-child(5),
td:nth-child(6),
td:nth-child(7),
td:nth-child(8) {
  text-align: right;
  padding-right: 8px;
 font-family: "Noto Sans Lao", sans-serif;
}

.center {
  text-align: center;
}

.left {
  text-align: left;
}

.right {
  text-align: left;
  font-family: 'Courier New', monospace;
}
/* Total row */
.total-row {
  background: #e8e8e8;
  font-weight: 700;
}

.total-row td {
  border-top: 2pt solid #000;
  padding: 3mm 2mm;
}

/* ===== FOOTER INFO ===== */
.footer-info {
  margin-top: 8mm;
  margin-bottom: 12mm;
  display: flex;
  font-size: 11pt;
}

/* ===== SIGNATURES ===== */
.signatures {
  margin-top: 15mm;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15mm;
  text-align: center;
}

.signature-box {
  min-height: 60mm;
}

.signature-box .title {
  font-weight: 700;
  font-size: 11pt;
  margin-bottom: 2mm;
}

.signature-box .subtitle {
  font-size: 10pt;
  margin-bottom: 20mm;
  font-style: italic;
}

.signature-box .line {
  border-top: 1pt solid #000;
  margin: 0 auto;
  width: 80%;
  margin-bottom: 2mm;
}

.signature-box .name {
  font-size: 10pt;
}

/* ===== PRINT OPTIMIZATION ===== */
@media print {
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
 table {
    page-break-inside: auto;
    border: 1.5px solid #000 !important;
  }
  
  tr {
    page-break-inside: avoid;
    page-break-after: auto;
  }
  
  thead {
    display: table-header-group;
  }
  
  th {
    background: #ffffff !important;
    border: 1px solid #000 !important;
    padding: 6px 5px !important;
    font-size: 10px !important;
  }
  
  td {
    border: 1px solid #000 !important;
    padding: 6px 5px !important;
    font-size: 9.5px !important;
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
    <div><span class="label">ບໍລິສັດ:</span> <span class="value">${
      user?.companyId?.name || ""
    }</span></div>
    <div><span class="label">ເບີໂທ:</span> <span class="value">${
      user?.companyId?.phone || ""
    }</span></div>
  </div>
  
  <div class="info-group">
    <div><span class="label">ເລກອ້າງອິງ:</span> <span class="value">${
      data.reference || ""
    }</span></div>
    <div><span class="label">ວັນທີ:</span> <span class="value">${formatDate(
      data.date
    )}</span></div>
  </div>
</div>

<div class="description">
  <span class="label">ລາຍລະອຽດ:</span> <span class="value">${
    data.description || ""
  }</span>
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
<tr class="total-row">
  <td colspan="10" class="center"><strong>ລວມທັງໝົດ / TOTAL</strong></td>
  <td class="right"><strong>${formatNumber(data.totalDebitLAK)}</strong></td>
  <td class="right"><strong>${formatNumber(data.totalCreditLAK)}</strong></td>
</tr>
</tbody>
</table>
</div>

<!-- FOOTER INFO -->
<div class="footer-info">
  <div>ສະຖານທີ່: .....................................</div>
  <div>ວັນທີ: ${formatDate(new Date())}</div>
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

html2pdf().set({
  margin: [20, 15, 20, 15], // TOP, LEFT, BOTTOM, RIGHT (mm)
  filename: '${data.reference || "journal-voucher"}.pdf',
  image: {
    type: "jpeg",
    quality: 0.98
  },
  html2canvas: {
    scale: 2,
    useCORS: true,
    letterRendering: true,
    scrollY: 0
  },
  jsPDF: {
    unit: "mm",
    format: "a4",
    orientation: "portrait"
  },
  pagebreak: {
    mode: ["css", "legacy"]
  }
}).from(element).save();

};
</script>

</body>
</html>
  `);

  win.document.close();
}
