export default function exportPDF({
  selectedTransactions = [],
  user = {},
  formatDate,
  status_income_expense,
  toast,
}) {
  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
      <!DOCTYPE html>
<html lang="lo">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title font-family: 'Noto Sans Lao', sans-serif;>-</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>

  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
 * {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Noto Sans Lao', sans-serif;
  background: #f5f5f5;
  padding: 20px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

/* Toolbar */
.toolbar {
  background: #374151;
  padding: 15px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbar h2 {
  color: white;
  font-size: 16px;
  font-weight: 600;
}

.btn-print {
  background: #10b981;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-family: 'Noto Sans Lao', sans-serif;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.3s;
}

.btn-print:hover {
  background: #059669;
}

/* PDF Content */
.pdf-content {
  padding: 25mm 20mm;
  background: white;
}

/* Header */
.header {
  text-align: center;
  border-bottom: 3px double #000;
  padding-bottom: 12px;
  margin-bottom: 20px;
}

.header-line1 {
  font-size: 18px;
  font-weight: 700;
  color: #000;
    font-weight: 700;
  margin-bottom: 5px;
}

.header-line2 {
  font-size: 18px;
   font-weight: 700;
   
  color: #000;
}

/* Company Info */
     .company-info {
            background: white;
            max-width: 1200px;
            width: 100%;
               display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .company-section {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 30px;
        }

        .company-logo {
            width: 100px;
            height: 100px;
            object-fit: cover;
            border-radius: 10px;

        }

        .company-details {
            flex: 1;
        }

        .contact-section {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .company-name {
            font-size: 12px;
            color: #2d3748;
            padding-right: 10px;
            font-weight: 500;
        }

        .company-name:first-child {
            font-size: 16px;
            font-weight: bold;
            color: #1a202c;
        }

        .topHeader {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            background-clip: text;
            white-space: nowrap;
            padding-left: 150px;
        }
/* Date Section */
.date-section {
  text-align: right;
  margin-bottom: 15px;
  font-size: 12px;
  color: #000;
   font-weight: 700;
}

.date-section input {
  border: none;
  border-bottom: 1px dotted #000;
  padding: 4px 8px;
  font-family: 'Noto Sans Lao', sans-serif;
  text-align: center;
  width: 140px;
  background: transparent;
  font-size: 12px;
   font-weight: 700;
}

/* Table */
.table-section {
  margin: 20px 0 30px 0;
  overflow: visible;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'Noto Sans Lao', sans-serif;
  border: 1.5px solid #000;
}

th, td {
  border: 1px solid #000;
  padding: 8px 6px;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

th {
  background: #fff;
  color: #000;
  font-weight: 700;
  font-size: 11px;
  text-align: center;
  white-space: normal;
  line-height: 1.4;
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
  font-family: 'Courier New', monospace;
}

.summary-row td {
  background: #f3f4f6;
  font-weight: 700;
  font-size: 11px;
  border: 1.5px solid #000;
}

/* Signature Date */
.signature-date {
  text-align: right;
  font-size: 12px;
  color: #000;
  margin: 25px 0 15px 0;
}

/* Signatures */
.signatures {
  background: #fff;
  border: 1.5px solid #000;
  padding: 15px;
  margin-top: 20px;
  page-break-inside: avoid;
}

.signature-title {
  text-align: center;
  font-weight: 700;
  font-size: 12px;
  margin-bottom: 15px;
  color: #000;
}

.signature-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
}

.signature-cell {
  text-align: center;
  border: 1px solid #000;
  padding: 15px 10px;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: #fff;
}

.signature-label {
  font-size: 11px;
  font-weight: 600;
  color: #000;
  line-height: 1.4;
}

.signature-area {
  margin-top: auto;
}

.signature-line {
  border-top: 1px solid #000;
  width: 70%;
  margin: 50px auto 0;
  padding-top: 6px;
}

/* Print Styles */
@media print {
  @page {
    size: A4 landscape;
    margin: 12mm 10mm;
  }
  
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  
  body {
    background: white;
    padding: 0;
    margin: 0;
  }
  
  .container {
    box-shadow: none;
    max-width: 100%;
    margin: 0;
  }
  
  .toolbar {
    display: none !important;
  }
  
  .pdf-content {
    padding: 0;
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
  
  .summary-row td {
    background: #e5e7eb !important;
    border: 1.5px solid #000 !important;
    font-size: 10px !important;
  }
  
  .signatures {
    page-break-inside: avoid;
    border: 1.5px solid #000 !important;
    padding: 12px;
  }
  
  .signature-grid {
    gap: 12px;
  }
  
  .signature-cell {
    border: 1px solid #000 !important;
    min-height: 110px;
  }
  
  .signature-label {
    font-size: 10px !important;
  }
  
  .signature-line {
    margin-top: 40px;
  }
  
  input {
    border: none !important;
    border-bottom: 1px dotted #000 !important;
  }
}
  </style>
</head>
<body>
  <div class="container">
    <div class="toolbar">
      <h2>📄 ແບບລາຍງານ</h2>
      <button class="btn-print" onclick="window.print()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        ພິມລາຍງານ
      </button>
    
    </div>
    
    <div id="pdf-root" class="pdf-content">
 
      
      <!-- Government Info -->
      <div class="header">
        <div class="header-line1">ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ</div>
        <div class="header-line2">ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ</div>
      </div>
           <!-- Company Info -->
        <div class="company-info">
         <div class="company-section">
           <img 
          class="company-logo" 
          src="${user?.companyId?.logo || "/default-logo.png"}" 
          alt="Company Logo"
            />
              <div class="company-details">
              <div class="contact-section">
              <div class="company-name">${
                user?.companyId?.name || "Company Name"
              }</div>
                <div class="company-name">${
                  user?.companyId?.address || ""
                }</div>
              <div class="company-name">${user?.companyId?.phone || ""}</div>
                </div>
                </div>
                <!-- Date Section --> 
          <div class="topHeader">ລາຍງານການເງິນ</div>
          <!-- Date Section -->
          </div>
          <div class="date-section">
        ວັນທີ: <input type="text" value="${formatDate(new Date())}" readonly>
           </div>
                </div>

      
      <!-- Table Section -->
      <div class="table-section">
        <table>
          <thead>
            <tr>
              <th>ລຳດັບ</th>
              <th>ວັນ/ເດືອນ/ປີ</th>
              <th>ເລກທີ່</th>
              <th>ເນື້ອໃນລາຍການ</th>
              <th>ຈຳນວນ (ກີບ)</th>
              <th>ຈຳນວນ (ບາດ)</th>
              <th>ຈຳນວນ (ໂດລາ)</th>
              <th>ຈຳນວນ (ຍວນ)</th>
              <th>ປະເພດ</th>
              <th>ໝາຍເຫດ</th>
            </tr>
          </thead>
          <tbody>
            ${(() => {
              // Fallback for empty transactions
              if (!selectedTransactions || selectedTransactions.length === 0) {
                return `
                  <tr>
                    <td colspan="9" style="text-align: center; padding: 20px;">
                      ບໍ່ມີຂໍ້ມູນ
                    </td>
                  </tr>`;
              }

              let totalLAK = 0,
                totalTHB = 0,
                totalUSD = 0,
                totalCNY = 0;

              const rows = selectedTransactions
                .slice()
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map((item, index) => {
                  const amountLAK =
                    item.amounts?.find((a) => a.currency === "LAK")?.amount ||
                    0;
                  const amountTHB =
                    item.amounts?.find((a) => a.currency === "THB")?.amount ||
                    0;
                  const amountUSD =
                    item.amounts?.find((a) => a.currency === "USD")?.amount ||
                    0;
                  const amountCNY =
                    item.amounts?.find((a) => a.currency === "CNY")?.amount ||
                    0;

                  totalLAK += amountLAK;
                  totalTHB += amountTHB;
                  totalUSD += amountUSD;
                  totalCNY += amountCNY;

                  return `
                    <tr>
                      <td>${index + 1}</td>
                      <td>${formatDate(item.date)}</td>
                      <td>${item.serial || "-"}</td>
                      <td>${item.description || "-"}</td>
                      <td> ${amountLAK.toLocaleString("lo-LA")}</td>
                      <td> ${amountTHB.toLocaleString("lo-LA")}</td>
                      <td> ${amountUSD.toLocaleString("lo-LA")}</td>
                      <td> ${amountCNY.toLocaleString("lo-LA")}</td>
                      <td>${status_income_expense[item.type] || "-"}</td>
                      <td>${item.note}</td>
                    </tr>`;
                })
                .join("");
              const totalRow = `
                <tr style" class="summary-row">
                  <td colspan="4" style="text-align: right;">ລວມທັງໝົດ</td>
                  <td> ${totalLAK.toLocaleString("lo-LA")}</td>
                  <td> ${totalTHB.toLocaleString("lo-LA")}</td>
                  <td> ${totalUSD.toLocaleString("lo-LA")}</td>
                  <td> ${totalCNY.toLocaleString("lo-LA")}</td>
                  <td></td>
                  <td></td>
                </tr>`;
              return rows + totalRow;
            })()}
          </tbody>
        </table>
      </div>
      
      <!-- Signature Section -->
      <div class="signature-date">
        ນະຄອນຫຼວງວຽງຈັນ, ວັນທີ ${formatDate(new Date())}
      </div>
    <div class="signatures">
      <div class="signature-title">ລາຍເຊັນຜູ້ກ່ຽວຂ້ອງ / Authorized Signatures</div>
      <div class="signature-grid">
        <div class="signature-cell">
          <span class="signature-label">ຜູ້ສັງລວມ<br></span>
          <div class="signature-area">
            <div class="signature-line">
          
            </div>
          </div>
        </div>
        <div class="signature-cell">
          <span class="signature-label">ພະແນກບັນຊີ-ການເງິນສ່ວນກາງ</span>
          <div class="signature-area">
            <div class="signature-line">

            </div>
          </div>
        </div>
        <div class="signature-cell">
          <span class="signature-label">ຜູ້ຈັດການ</span>
          <div class="signature-area">
            <div class="signature-line">


            </div>
          </div>
        </div>
        <div class="signature-cell">
          <span class="signature-label">CEO & CFO</span>
          <div class="signature-area">
            <div class="signature-line">
              <div class="signature-name"></div>

            </div>
          </div>
        </div>
      </div>
    </div>

  </div>

</body>
<script>
function downloadPDF() {
  const element = document.getElementById("pdf-root");

  // สร้าง style สำหรับ PDF
  const style = document.createElement("style");

  element.prepend(style)

  html2pdf()
    .set({
      filename: "financial-report.pdf",
      margin: 10,
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { format: "a4", orientation: "landscape" },
    })
    .from(element)
    .save()
    .then(() => style.remove()); // ลบ style หลัง export
}
</script>

</html>`);

  toast({
    title: "ກຳລັງສ້າງ PDF",
    description: "ກະລຸນາລໍຖ້າສັກຄູ່...",
    status: "info",
    duration: 2000,
    isClosable: true,
    position: "top-right",
  });
}
