export default function exportPDF({
  selectedOpo,
  selectedItems = [],
  user,
  formatDate,
  toast,
  PAYMENT_METHODS,
}) {
  if (!selectedOpo || !selectedOpo.items) return;
  const itemsToExport =
    selectedItems.length > 0
      ? selectedOpo.items.filter((item) => selectedItems.includes(item._id))
      : selectedOpo.items;

  if (itemsToExport.length === 0) {
    toast({
      title: "ກະລຸນາເລືອກລາຍການ",
      status: "warning",
      duration: 2000,
    });
    return;
  }

  // Calculate totals by currency
  const totals = {};
  itemsToExport.forEach((item) => {
    const currency = item.currency || "LAK";
    const amount = parseFloat(item.amount || 0);
    totals[currency] = (totals[currency] || 0) + amount;
  });

  // Create formatted content for PDF
  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
<!DOCTYPE html>
<html lang="lo">
<head>
  <meta charset="UTF-8">
  <title>ໃບສັ່ງຊື້ (PO) - Print Template</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
   @page {
      size: A4 landscape;
      margin: 8mm 10mm;
    }
  .note-section {
      margin-top: 6px;
      font-size: 12px;
      color: red;
      border-top: 1px dashed #cbd5e0;
      padding-top: 4px;
        display: flex;
      justify-content: flex-end;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Noto Sans Lao', 'Phetsarath OT', sans-serif;
      font-size: 8.5pt;
      line-height: 1.15;
      color: #000;
      background: #fff;
      padding: 0;
    }

    .document {
      width: 100%;
      margin: 0 auto;
      background: white;
    }

    .header-band {
      height: 4px;
      background: linear-gradient(90deg, #1a202c 0%, #4a5568 50%, #1a202c 100%);
      margin-bottom: 8px;
    }

    .document-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 6px;
      margin-bottom: 8px;
      padding-left:20px;
      border-bottom: 2px solid #1a202c;
    }
      .company-info {
 display: flex;
    justify-content: space-between; /* จัดให้อยู่ตรงกลางแนวนอน */
    align-items: center;     /* จัดให้อยู่ตรงกลางแนวตั้ง */
    gap: 20px;               /* ระยะห่างระหว่างแต่ละช่อง */
  text-align: left;
  margin-bottom: 15px;
  line-height: 1.8;
    font-weight: 700;
}
    .company-section {
      flex: 1;
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

   .company-logo {
  width: 55px;
  height: 55px;
  background-color: #1a202c;       /* เผื่อไม่มีรูป */
  background-size: cover;           /* ทำให้รูปไม่บี้ */
  background-position: center;      /* เอากลางภาพ */
  background-repeat: no-repeat;     /* ไม่ซ้ำรูป */

  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: white;
  font-weight: bold;
}


    .company-details {
      flex: 1;
    }

    .company-name {
      font-size: 12px
      font-weight: 700;
      color: #1a202c;
      margin-bottom: 3px;
    }

    .contact-section {
      font-size: 7.5pt;
      color: #2d3748;
      line-height: 1.3;
    }

    .national-header {
      flex: 1.2;
      text-align: center;
      padding: 0 10px;
      font-weight:700;
      font-size:18px;
    }

    .doc-reference {
      flex: 1;
      text-align: right;
      font-size: 7pt;
      padding-right:10px;
      color: #4a5568;
    }

    .document-title {
      text-align: center;
      font-size: 17pt;
      font-weight: 700;
      color: #1a202c;
      margin-bottom: 2px;
    }

    .document-subtitle {
      text-align: center;
      font-size: 10pt;
      color: #4a5568;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .doc-info {
      background: #f7fafc;
      border: 2px solid #1a202c;
      border-radius: 4px;
      padding: 8px 10px;
      margin-bottom: 8px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 4px 10px;
    }

    .info-row {
      display: flex;
      align-items: center;
      padding: 3px 6px;
      background: white;
      border: 1px solid #cbd5e0;
      border-radius: 2px;
    }

    .section-title {
      font-size: 9pt;
      font-weight: 700;
      margin: 6px 0 4px 0;
      padding: 4px 8px;
      background: #1a202c;
      color: white;
      border-radius: 3px;
      text-transform: uppercase;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      border: 2px solid #1a202c;
      font-size: 12px
      page-break-inside: auto;
    }

    thead {
      background: #e2e8f0;
    }

    th {
      padding: 5px 3px;
      border: 1px solid #1a202c;
      text-align: left;
      color: #1a202c;
    }

    td {
      padding: 4px 3px;
      border: 1px solid #2d3748;
      font-size: 12px
    }

    tbody tr:nth-child(even) {
      background: #f7fafc;
    }

    .total-section {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 6px;
      margin-bottom: 6px;
      page-break-inside: avoid;
    }
/* Toolbar */
.toolbar {
  padding: 15px 30px;
  display: flex;
  position: absolute;             /* 👈 แก้จาก comma เป็น semicolon */
  justify-content: space-between; /* จัดระยะซ้าย-ขวา */
  align-items: center;            /* จัดกึ่งกลางแนวตั้ง */
  width: 100%;                    /* ให้ toolbar กว้างเต็มหน้าจอ */
  top: 0;                         /* อยู่ติดขอบบน */
  left: 0;                        /* อยู่ชิดซ้าย */
  color: white;                   /* สีตัวอักษร */
  z-index: 1000;                  /* ซ้อนอยู่บนสุด */
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

 .total-item {
  padding: 6px 12px;
  border-radius: 3px;
  min-width: 150px;
  border: 1px solid #1a202c; /* 👈 ขอบสีเทาอ่อนแบบ Tailwind gray-300 */
}

    .signatures {
      background: #f7fafc;
      border: 2px solid #1a202c;
      border-radius: 4px;
      padding: 8px;
      text-align: center;
      margin-top: 6px;
      page-break-before: auto;
      page-break-inside: avoid;
      font-weight:700
    }


    .signature-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }

    .signature-cell {
      text-align: center;
      background: white;
      border: 1.5px solid #cbd5e0;
      border-radius: 3px;
      min-height: 130px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .footer {
      margin-top: 6px;
      text-align: center;
      font-size: 6pt;
      color: #718096;
    }

    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
  .toolbar {
    display: none !important;
  }
      thead {
        display: table-header-group;
      }

      tr, td, th {
        page-break-inside: avoid;
      }

      .total-section, .signatures {
        page-break-before: auto !important;
        page-break-inside: avoid !important;
        page-break-after: auto !important;
      }

      tbody tr:nth-child(even) {
        background: #f7fafc !important;
        -webkit-print-color-adjust: exact !important;
      }

      .section-title,
      .total-item {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>
 <div class="toolbar">
      <button class="btn-print" onclick="window.print()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        ພິມລາຍງານ
      </button>
    </div>
  <div class="document">
    <div class="header-band"></div>
    
    <!-- Header -->
    <div class="document-header">

      <div class="national-header">
        <div class="header-line1">
          ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ
        </div>
        <div class="header-line2">
          ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ
        </div>
      </div>
    </div>

    <!-- Title -->
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
        <div>${user?.companyId?.address || ""}</div>
         <div>${user?.companyId?.phone || ""}</div>
          </div>
        </div>
      </div>
          <div>
    <div class="document-title">ໃບສັ່ງຊື້</div>
    <div class="document-subtitle">Purchase Order(PO)</div>
    
    </div>

      <div class="doc-reference">
      <div class="date-section">
            ວັນທີ: <input type="text" value="${formatDate(
              new Date()
            )}" readonly>
          </div>
      </div>
    
    </div>


    <!-- Document Info -->
    <div class="doc-info">
      <div class="info-grid">
        <div class="info-row">
          <div class="info-label">ເລກທີ /No:</div>
          <div class="info-value"><strong>${
            selectedOpo.serial || selectedOpo.number
          }</strong></div>
        </div>
        <div class="info-row">
          <div class="info-label">ຜູ້ຮ້ອງຂໍ:</div>
          <div class="info-value">${selectedOpo.requester || "-"}</div>
        </div>
        <div class="info-row">
          <div class="info-label">ວັນທີ/Date:</div>
          <div class="info-value">${formatDate(selectedOpo.date)}</div>
        </div>
        <div class="info-row">
          <div class="info-label">ພະແນກບັນຊີ-ການເງິນ:</div>
          <div class="info-value">${selectedOpo.manager || "-"}</div>
        </div>
        <div class="info-row">
          <div class="info-label">ຜູ້ຈັດການ:</div>
          <div class="info-value">${selectedOpo.createdBy || "-"}</div>
        </div>
      </div>
    </div>

    <!-- Items Table -->
    <div class="section-title">ລາຍການຈ່າຍເງິນ / Payment Items</div>
    <table>
      <thead>
        <tr>
          <th style="width: 4%;">ລຳດັບ<br>No.</th>
          <th style="width: 28%;">ລາຍລະອຽດ<br>Description</th>
          <th style="width: 14%;">ວິທີຊຳລະ<br>Payment Method</th>
          <th style="width: 10%;" class="center">ສະກຸນເງິນ<br>Currency</th>
          <th style="width: 20%;">ຈຳນວນເງິນ<br>Amount</th>
          <th style="width: 24%;">ໝາຍເຫດ<br>Note</th>
        </tr>
      </thead>
      <tbody>
        ${itemsToExport
          .slice()
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .map(
            (item, index) => `
        <tr>
          <td class="center"><strong>${index + 1}</strong></td>
          <td>${item.description || "-"}</td>
          <td>${
            PAYMENT_METHODS[item.paymentMethod] || item.paymentMethod || "-"
          }</td>
          <td class="center"><strong>${item.currency || "LAK"}</strong></td>
          <td class="number">${parseFloat(
            item.amount || 0
          ).toLocaleString()}</td>
          <td>${item?.notes || "-"}</td>
        </tr>
        `
          )
          .join("")}
      </tbody>
    </table>

    <!-- Total Section -->
    <div class="total-section">
      ${Object.entries(totals)
        .map(
          ([currency, amount]) => `
      <div class="total-item">
        <div class="total-title">ຍອດລວມ / Total (${currency}):</div>
        <div class="total-amount">${amount.toLocaleString()} ${currency}</div>
      </div>
      `
        )
        .join("")}
    </div>
<div class="note-section" style="color:red">ບິນຮັບໃບ PO ອາທິດໜຶ່ງເທື່ອໜຶ່ງເທົ່ານັ້ນ-ວັນພຸດ 3 ໂມງ</div>
    <!-- Signatures -->
    <div class="signatures">
      <div class="signature-title">ລາຍເຊັນຜູ້ກ່ຽວຂ້ອງ / Authorized Signatures</div>
      <div class="signature-grid">
        <div class="signature-cell">
          <span class="signature-label">ຜູ້ຮ້ອງຂໍ<br>Requester</span>
          <div class="signature-area">
            <div class="signature-line">
              <div class="signature-name">${selectedOpo.requester || ""}</div>
          
            </div>
          </div>
        </div>
        <div class="signature-cell">
          <span class="signature-label">ພະແນກບັນຊີ-ການເງິນ<br>A&F Dept.</span>
          <div class="signature-area">
            <div class="signature-line">
              <div class="signature-name">${selectedOpo.manager || ""}</div>
            </div>
          </div>
        </div>
        <div class="signature-cell">
          <span class="signature-label">ຜູ້ຈັດການ<br>Manager</span>
          <div class="signature-area">
            <div class="signature-line">
              <div class="signature-name">${selectedOpo.createdBy || ""}</div>

            </div>
          </div>
        </div>
           <div class="signature-cell">
          <span class="signature-label">ປະທານ/ຮອງປະທານ<br>Approved By</span>
          <div class="signature-area">
            <div class="signature-line">
              <div class="signature-name"></div>

            </div>
          </div>
        </div>
      </div>
    </div>
<div  class="note-section"  style="color:red">ໝາຍເຫດ: ກຳນົດ 15 ວັນ ໃນການເບີກຈ່າຍນັບຈາກມື້ອະນຸມັດ PO ເອກະສານຕິດຄັດ:ໃບສະເໜີລາຄາ ,ໃບແຈ້ງໜີ້,ໃບຮັບສິນຄ້າຈາກຜູ້ຂາຍ ແລະ ເອກະສານອື່ນໆທີ່ຕິດພັນ ມາພ້ອມທຸກຄັ້ງ</div>
    <!-- Footer -->

  </div>
</body>
</html>
  `);
  printWindow.document.close();

  printWindow.onload = function () {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);
  };

  toast({
    title: "ກຳລັງສົ່ງອອກ PDF",
    description: "ກະລຸນາເລືອກ 'Save as PDF' ໃນໜ້າຕ່າງການພິມ",
    status: "info",
    duration: 3000,
  });
}
