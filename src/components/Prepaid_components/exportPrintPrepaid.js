export default function exportPrint({ toast, user, selected, formatDate }) {
  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
<!DOCTYPE html>
<html lang="lo">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ລາຍງານການເງິນ</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Noto Sans Lao', sans-serif;
      background: #fff;
      color: #000;
      line-height: 1.5;
      padding: 15mm 12mm;
    }

    .container {
      max-width: 100%;
      margin: 0 auto;
    }

    /* === ส่วนหัวราชการ === */
    .gov-header {
      text-align: center;
      border-bottom: 3px double #000;
      padding-bottom: 10px;
      margin-bottom: 18px;
    }
    .gov-header .line1 {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .gov-header .line2 {
      font-size: 18px;
      font-weight: 700;
      margin-top: 4px;
    }

    /* === ข้อมูลบริษัท === */
    .date-section {
  text-align: center;
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
.company-info {
 display: flex;
    justify-content: space-between; /* จัดให้อยู่ตรงกลางแนวนอน */
    align-items: center;     /* จัดให้อยู่ตรงกลางแนวตั้ง */
    gap: 20px;               /* ระยะห่างระหว่างแต่ละช่อง */
  text-align: left;
  margin-bottom: 15px;
  line-height: 1.8;
  font-size:12px;
    font-weight: 700;
}
 .company-info div {
    white-space: nowrap;     /* ไม่ให้ขึ้นบรรทัดใหม่ */
  }

    /* === หัวเรื่องหลัก === */
    .main-title {
      text-align: center;
      font-size: 18px;
      font-weight: 700;
      text-decoration: underline;
      text-underline-offset: 5px;
      margin: 20px 0 16px;
    }

    /* === วันที่ === */
    .date-print {
      text-align: right;
      font-size: 13px;
      margin-bottom: 20px;
    }
    .date-print input {
      border: none;
      border-bottom: 1px dotted #000;
      width: 130px;
      text-align: center;
      font-family: inherit;
      font-size: 13px;
      background: transparent;
    }

    /* === ตารางรายการ === */
    .table-container {
      margin: 20px 0;
      page-break-inside: avoid;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      border: 1.8px solid #000;
    }

    th {
      background: #f1f3f5 !important;
      font-weight: 700;
      text-align: center;
      padding: 9px 6px;
      border: 1px solid #000;
      font-size: 11.5px;
      white-space: nowrap;
    }

td {
  border: 1px solid #000;
  padding: 7px 6px;
  vertical-align: top;
  font-size: 12px;
  font-family: 'Courier New', monospace;
  text-align: left; /* 👈 ให้ข้อความอยู่ชิดซ้าย */
}

    /* จัดแนวคอลัมน์ */
    td:nth-child(1), td:nth-child(2), td:nth-child(3) {   font-size: 12px; text-align: left;  center; }
    td:nth-child(4), td:nth-child(5), td:nth-child(11) {  font-size: 12px; text-align: left; padding-left: 8px; }
    td:nth-child(6), td:nth-child(7), td:nth-child(8), td:nth-child(9), td:nth-child(10) { 
      text-align: left; 
      padding-right: 8px; 
       font-size: 12px;
      font-family: 'Courier New', monospace;
    }

    /* สรุปยอดในแต่ละแถว (หลายสกุลเงิน) */
    .currency-summary {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 10px;
      line-height: 1.4;
    }
    .currency-block {
      background: #f8f9fa;
      padding: 6px 8px;
      border-radius: 4px;
      border: 1px solid #ddd;
    }
    .currency-label {
      font-weight: 600;
      display: inline-block;
      margin-bottom: 2px;
    }

    /* === ตารางสรุปยอดรวม === */
    .summary-table {
      margin-top: 25px;
      page-break-inside: avoid;
    }
    .summary-table table {
      font-size: 12px;
    }
    .summary-table th {
      background: #e5e7eb !important;
      font-weight: 700;
      width: 25%;
    }
    .summary-table td {
      text-align: right;
      padding-right: 12px;
      font-weight: 600;
      font-family: 'Courier New', monospace;
    }

    /* === ลายเซ็น === */
    .signature-date {
      text-align: right;
      font-size: 13px;
      margin: 35px 0 50px;
    }

    .signature-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      page-break-inside: avoid;
      margin-top: 30px;
    }
    .sig-box {
      text-align: center;
    }
    .sig-label {
      font-weight: 600;
      font-size: 13px;
      margin-bottom: 55px;
    }
    .sig-line {
      border-top: 1px solid #000;
      width: 75%;
      margin: 0 auto;
      padding-top: 6px;
      font-size: 11px;
      color: #555;
    }
         .company-logo {
            width: 100px;
            height: 100px;
            object-fit: cover;
            border-radius: 10px;

        }
             .company-section {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 30px;
        }

        .topHeader{
          text-align: center;
            font-size: 16px;
            font-weight: bold;
            background-clip: text;
            white-space: nowrap;
         
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
 .company-details {
            flex: 1;
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

    /* === พิมพ์ === */
    @media print {
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
      @page {
        size: A4 landscape;
        margin: 12mm 10mm;
      }

      body {
        padding: 0;
        background: white;
      }

      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      table, th, td {
        border-color: #000 !important;
      }

      th {
        background: #f1f3f5 !important;
        font-size: 10.5px !important;
        padding: 7px 5px !important;
      }

      td {
        font-size: 10px !important;
        padding: 6px 5px !important;
      }

      .currency-block {
        background: #f8f9fa !important;
      }

      .summary-table th {
        background: #e5e7eb !important;
      }

      input {
        border: none !important;
        border-bottom: 1px dotted #000 !important;
      }

      .toolbar { display: none !important; }
    }

    /* Toolbar (ซ่อนตอนพิมพ์) */
    .toolbar {
      background: #1f2937;
      color: white;
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 15px;
      position: running(toolbar);
    }
    .btn-print {
      background: #059669;
      color: white;
      border: none;
      padding: 8px 20px;
      border-radius: 6px;
      font-family: inherit;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }
    .btn-print:hover {
      background: #047857;
    }
  </style>
</head>
<body>

  <!-- Toolbar -->
  <div class="toolbar">
    <div>📑 ລາຍງານການເງິນ - ພິມອອກເປັນເອກະສານ</div>
    <button class="btn-print" onclick="window.print()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 6 2 18 2 18 9"></polyline>
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
        <rect x="6" y="14" width="12" height="8"></rect>
      </svg>
      ພິມລາຍງານ
    </button>
  </div>

  <div class="container">

    <!-- ส่วนหัวราชการ -->
    <div class="gov-header">
      <div class="line1">ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ</div>
      <div class="line2">ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ</div>
    </div>

    <!-- ข้อมูลบริษัท -->
      <div class="company-info">
      <div class="company-section">
      <img 
  class="company-logo" 
  src="${user?.companyId?.logo || "/default-logo.png"}" 
  alt="Company Logo"
    />
      <div class="company-details">
      <div class="company-name">${user?.companyId?.name || ""}</div>
      <div class="company-address">${user?.companyId?.address || ""}</div>
        <div class="company-address">${user?.companyId?.phone || ""}</div>
      </div>
      </div>
          <div class="topHeader">ລາຍງານການເງິນ</div>
          <!-- Date Section -->
          <div class="date-section">
            ວັນທີ: <input type="text" value="${formatDate(
              new Date()
            )}" readonly>
          </div>
      </div>

    <!-- ตารางรายการ -->
<div class="table-container">
  <table border="1" style="border-collapse: collapse; width: 100%; text-align: center; font-family: 'Noto Sans Lao', sans-serif;">
    <thead style="background-color: #f3f4f6;">
      <tr>
        <th>ລຳດັບ</th>
        <th>ວັນທີ</th>
        <th>ເລກທີ່</th>
        <th>ຜູ້ເບີກ</th>
        <th>ເນື່ອໃນ</th>
        <th>ຂໍເບີກ</th>
        <th>ຍອດໃຊ້ຈິງ</th>
        <th>ຍອດຄືນພະນັກງານ</th>
        <th>ຍອດຄືນບໍລິສັດ</th>
        <th>ຍອດຈ່າຍສຸດທິ</th>
        <th>ໝາຍເຫດ</th>
      </tr>
    </thead>
    <tbody>
      ${
        selected
          ?.map((item, index) => {
            // ใน template string ของคุณ ให้แทนที่ส่วนคำนวณด้วยโค้ดนี้
            const requests = item.amount_requested || [];
            const summaries = item.summary || {};

            // รวมทุกสกุลที่มีใน requested หรือ summary
            const currencies = [
              ...new Set([
                ...requests.map((r) => r.currency),
                ...Object.keys(summaries),
              ]),
            ];

            return currencies
              .map((cur, i) => {
                const req = requests.find((r) => r.currency === cur);
                const sum = summaries[cur] || {};

                const spent = sum.total_spent || 0;
                const retEmp = sum.total_refund_to_employee || 0;
                const retCom = sum.total_return_to_company || 0;
                const requestedAmount = req ? req.amount : 0;

                // เลือกสูตรที่ถูกต้อง:
                // ถ้ามี total_spent ให้ใช้มันเป็นหลัก (สมมติว่า spent = จำนวนที่ใช้จริง)
                // ถ้าไม่มี spent ให้ใช้ requested - return_to_company + refund_to_employee
                const netPaid =
                  spent > 0
                    ? spent + (retEmp || 0) // ถ้ามี refund_to_employee ให้บวกเข้า
                    : requestedAmount - (retCom || 0) + (retEmp || 0);

                // ฟอร์แมตเพื่อแสดงผล (ถ้าอยากให้เป็น '-' เมื่อไม่มีข้อมูล ให้ปรับได้)
                const displayRequested = requestedAmount
                  ? requestedAmount.toLocaleString() + " " + cur
                  : "-";
                const displaySpent = spent
                  ? spent.toLocaleString() + " " + cur
                  : "-";
                const displayRetEmp = retEmp
                  ? retEmp.toLocaleString() + " " + cur
                  : "-";
                const displayRetCom = retCom
                  ? retCom.toLocaleString() + " " + cur
                  : "-";
                const displayNet = netPaid
                  ? netPaid.toLocaleString() + " " + cur
                  : "-";

                if (i === 0) {
                  return `
        <tr>
          <td rowspan="${currencies.length}">${index + 1}</td>
          <td rowspan="${currencies.length}">${formatDate(
                    item.request_date
                  )}</td>
          <td rowspan="${currencies.length}">${item.serial}</td>
          <td rowspan="${currencies.length}">${
                    item.employee_id?.full_name || "-"
                  }</td>
          <td style="  font-family: 'Noto Sans Lao', sans-serif" rowspan="${
            currencies.length
          }">${item.purpose || "-"}</td>
          <td>${displayRequested}</td>
          <td>${displaySpent}</td>
          <td>${displayRetEmp}</td>
          <td>${displayRetCom}</td>
          <td><strong>${displayNet}</strong></td>
          <td rowspan="${currencies.length}">${item.meta?.note || ""}</td>
        </tr>`;
                } else {
                  return `
        <tr>
          <td>${displayRequested}</td>
          <td>${displaySpent}</td>
          <td>${displayRetEmp}</td>
          <td>${displayRetCom}</td>
          <td><strong>${displayNet}</strong></td>
        </tr>`;
                }
              })
              .join("");
          })
          .join("") || ""
      }
    </tbody>
  </table>
</div>



    <!-- ตารางสรุปยอดรวม (ทุกสกุลเงิน) -->
    <div class="summary-table">
      <table>
        <thead>
          <tr>
            <th>ສະກຸນເງິນ</th>
            <th>ຂໍເບີກທັງໝົດ</th>
            <th>ໃຊ້ຈ່າຍຈິງ</th>
            <th>ຄືນບໍລິສັດ</th>
            <th>ຄືນພະນັກງານ</th>
            <th>ຈ່າຍສຸດທິ</th>
          </tr>
        </thead>
        <tbody>
         ${(() => {
           const totalByCurrency = {};

           selected?.forEach((item) => {
             // รวมยอดเบิกตามสกุล
             (item.amount_requested || []).forEach((req) => {
               if (!totalByCurrency[req.currency]) {
                 totalByCurrency[req.currency] = {
                   requested: 0,
                   spent: 0,
                   returnCo: 0,
                   refundEm: 0,
                 };
               }
               totalByCurrency[req.currency].requested += req.amount;
             });

             // รวมยอดสรุป (ใช้จริง / คืน / refund)
             if (item.summary) {
               Object.entries(item.summary).forEach(([cur, data]) => {
                 if (!totalByCurrency[cur])
                   totalByCurrency[cur] = {
                     requested: 0,
                     spent: 0,
                     returnCo: 0,
                     refundEm: 0,
                   };
                 totalByCurrency[cur].spent += data.total_spent || 0;
                 totalByCurrency[cur].returnCo +=
                   data.total_return_to_company || 0;
                 totalByCurrency[cur].refundEm +=
                   data.total_refund_to_employee || 0;
               });
             }
           });

           // สร้าง HTML ตารางสรุป
           return (
             Object.entries(totalByCurrency)
               .map(([cur, t]) => {
                 // ใช้สูตรที่ถูกต้อง
                 const net =
                   t.spent > 0
                     ? t.spent + (t.refundEm || 0) // ถ้ามี refund ให้บวกเข้า
                     : t.requested - (t.returnCo || 0) + (t.refundEm || 0);

                 return `
          <tr style="background:#f9fafb; font-weight:600;">
            <td style="text-align:center;">${cur}</td>
            <td style="text-align:right;">${t.requested.toLocaleString()}</td>
            <td style="text-align:right;">${t.spent.toLocaleString()}</td>
            <td style="text-align:right;">${t.returnCo.toLocaleString()}</td>
            <td style="text-align:right;">${t.refundEm.toLocaleString()}</td>
            <td style="text-align:right;"><strong>${net.toLocaleString()}</strong></td>
          </tr>`;
               })
               .join("") ||
             "<tr><td colspan='6' style='text-align:center;'>ບໍ່ມີຂໍ້ມູນ</td></tr>"
           );
         })()}

        </tbody>
      </table>
    </div>

    <!-- วันที่ลงนาม -->
    <div class="signature-date">
      ນະຄອນຫຼວງວຽງຈັນ, ວັນທີ ${formatDate(new Date())}
    </div>

    <!-- ลายเซ็น 4 ช่อง -->
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
