import React, { useState, useMemo, useEffect } from "react";
import {
  Box,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Checkbox,
  Input,
  Select,
  HStack,
  VStack,
  Icon,
  Text,
  Badge,
  useToast,
  Container,
  Heading,
  InputGroup,
  InputLeftElement,
  Flex,
  Spinner,
  Card,
  CardBody,
  IconButton,
  ChakraProvider,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Stack,
  Divider,
  useColorModeValue,
} from "@chakra-ui/react";
import {
  Eye,
  Search,
  TrendingUp,
  CreditCard,
  Calendar,
  DollarSign,
  TrendingDown,
  ChevronRightIcon,
  ChevronLeftIcon,
} from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { useAuth } from "../context/AuthContext";

const Report = () => {
  const [data, setData] = useState([]);
  const { user } = useAuth();
  const bg = useColorModeValue("gray.50", "gray.700");
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [selectData, setSelectData] = useState();
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    type: "",
    paymentMethod: "",
    currency: "",
    searchText: "",
    status: "",
    status_Ap: "",
  });
  const pageSize = 30;
  const [page, setPage] = useState(1);

  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const shortDesc = (desc) => {
    if (!desc) return "-";
    return desc.length > 7 ? desc.substring(0, 7) + "..." : desc;
  };
  // Normalize payment methods (map Lao and English terms)
  const paymentMethodMap = {
    cash: "ເງິນສົດ",
    transfer: "ໂອນ",
    bank_transfer: "ໂອນທະນາຄານ",
    ເງິນສົດ: "ເງິນສົດ",
  };

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/report?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          response.status === 401 ? "Unauthorized" : "Server error"
        );
      }
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        title: "ເກີດຂໍ້ຜິດພາດ",
        description: error.message || "ບໍ່ສາມາດດຶງຂໍ້ມູນໄດ້",
        status: "error",
        duration: 3000,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);
  // Handle select all
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // ✅ เลือกเฉพาะ item ในหน้านี้
      setSelectedItems(new Set(pageData.map((item) => item._id)));
    } else {
      // ✅ ยกเลิก = ล้างทั้งหมด
      setSelectedItems(new Set());
    }
  };

  // Handle individual item selection
  const handleSelectItem = (id) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  // Format amount
  const formatAmount = (amount, currency) => {
    return `${amount.toLocaleString("lo-LA")} ${currency}`;
  };

  // Format date
  function formatDate(dateString) {
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  const totalPages = Math.ceil(data.length / pageSize);
  const offset = (page - 1) * pageSize;
  const pageData = useMemo(() => {
    const s = (page - 1) * pageSize;
    return data.slice(s, s + pageSize);
  }, [data, page]);
  // Get badge for type
  const getTypeBadge = (type, sourceType) => {
    const colors = {
      ລາຍຮັບ: "green",
      ລາຍຈ່າຍ: "red",
      OPO: "purple",
      ໜີ້ຕ້ອງຮັບ: "blue",
      ໜີ້ຕ້ອງສົ່ງ: "orange",
    };
    const labels = {
      ລາຍຮັບ: "ລາຍຮັບ",
      ລາຍຈ່າຍ: "ລາຍຈ່າຍ",
      OPO: "OPO",
      ໜີ້ຕ້ອງຮັບ: "ໜີ້ຕ້ອງຮັບ",
      ໜີ້ຕ້ອງສົ່ງ: "ໜີ້ຕ້ອງສົ່ງ",
    };
    const key = sourceType;
    return (
      <Badge fontFamily="Noto Sans Lao, sans-serif" colorScheme={colors[key]}>
        {labels[key]}
      </Badge>
    );
  };
  //get print
  const getTypeBadgePrint = (sourceType) => {
    const labels = {
      income: "ລາຍຮັບ",
      expense: "ລາຍຈ່າຍ",
      receivable: "OPO",
      ໜີ້ຕ້ອງຮັບ: "ໜີ້ຕ້ອງຮັບ",
      payable: "ໜີ້ຕ້ອງສົ່ງ",
    };

    const key = sourceType;

    return `<span style="
    display:inline-block;
    padding:2px 6px;
    border-radius:12px;
    font-size:15px;
    font-family:'Noto Sans Lao', sans-serif;
  ">${labels[key] || sourceType}</span>`;
  };
  const paymentStatusMap = {
    ຊຳລະບາງສ່ວນ: { label: "ຊຳລະບາງສ່ວນ", color: "gray" },
    unpaid: { label: "ຍັງບໍ່ຈ່າຍ", color: "red" },
    paid: { label: "ຈ່າຍແລ້ວ", color: "green" },
  };

  // สถานะการอนุมัติ
  const approveStatusMap = {
    pending: { label: "ລໍຖ້າອະນຸມັດ", color: "yellow" },
    approve: { label: "ອະນຸມັດແລ້ວ", color: "green" },
    cancel: { label: "ຍົກເລີກ", color: "red" },
    PENDING: { label: "ລໍຖ້າອະນຸມັດ", color: "yellow" },
    APPROVED: { label: "ອະນຸມັດ", color: "green" },
    CANCELLED: { label: "ຍົກເລີກ", color: "red" },
  };
  // Get badge for status
  const getPaymentBadge = (status) => {
    const st = paymentStatusMap[status] || { label: status, color: "gray" };
    return (
      <Badge
        colorScheme={st.color}
        variant="subtle"
        rounded="md"
        fontFamily="Noto Sans Lao, sans-serif"
      >
        {st.label}
      </Badge>
    );
  };

  const getApproveBadge = (statusAp) => {
    const st = approveStatusMap[statusAp] || { label: statusAp, color: "gray" };
    return (
      <Badge
        colorScheme={st.color}
        variant="outline"
        rounded="md"
        fontFamily="Noto Sans Lao, sans-serif"
      >
        {st.label}
      </Badge>
    );
  };
  const getPaymentMethodLabel = (method) => {
    switch (method) {
      case "cash":
        return "ເງິນສົດ";
      case "ເງິນສົດ":
        return "ເງິນສົດ";
      case "transfer":
        return "ເງິນໂອນ";
      case "bank_transfer":
        return "ເງິນໂອນ";
      default:
        return method || "-";
    }
  };
  const handleDetail = (item) => {
    onOpen();
    setSelectData(item);
  };
  // Export to PDF
  const exportToPDF = () => {
    if (selectedItems.size === 0) {
      toast({
        title: "ກະລຸນາເລືອກລາຍການ",
        description: "ເລືອກລາຍການທີ່ຕ້ອງການ Export",
        status: "warning",
        duration: 3000,
      });
      return;
    }

    const selectedData = pageData.filter((item) => selectedItems.has(item._id));
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
<!DOCTYPE html>
<html lang="lo">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;500;600;700&display=swap" rel="stylesheet">
  <title  font-family: 'Noto Sans Lao', sans-serif;>-</title>
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
  max-width: 297mm;
  margin: 0 auto;
  background: white;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

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

.pdf-content {
  padding: 20mm 15mm;
  min-height: 210mm;
  background: white;
}

/* Header */
.header {
  text-align: center;
  border-bottom: 3px double #000;
  padding-bottom: 12px;
  margin-bottom: 15px;
}

.header-line1 {
  font-size: 18px;
  font-weight: 700;
  color: #000;
  margin-bottom: 5px;
}

.header-line2 {
  font-size: 18px;
  font-weight: 700;
  color: #000;
}

/* Company Info */
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
 .company-info div {
    white-space: nowrap;     /* ไม่ให้ขึ้นบรรทัดใหม่ */
  }
.company-name {
  font-size: 13px;
  font-weight: 700;
  color: #000;
}

.company-address {
  font-size: 12px;
  color: #333;
  font-weight: 700;
}

/* Top Header */
.topHeader {
  font-weight: 700;
}

.topHeader div {
  font-size: 16px;
  font-weight: 700;
  color: #000;
  text-decoration: underline;
  text-underline-offset: 4px;
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


.report-title {
  text-align: center;
  margin: 15px 0 20px 0;
}

.report-title h2 {
  font-size: 16px;
  font-weight: 700;
  color: #000;
  text-decoration: underline;
  text-underline-offset: 4px;
}

/* Table */
.table-section {
  margin: 15px 0 25px 0;
  overflow: visible;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 10px 0;
  font-size: 11px;
  table-layout: auto;
  border: 1.5px solid #000;
}

th {
  background: #fff;
  color: #000;
  padding: 8px 6px;
  text-align: center;
  font-weight: 700;
  border: 1px solid #000;
  line-height: 1.4;
  font-size: 11px;
}

td {
  padding: 6px;
  border: 1px solid #000;
  font-size: 12px;
  line-height: 1.5;
  word-wrap: break-word;
  white-space: normal;
  overflow-wrap: break-word;
  vertical-align: top;
  color: #000;
}

tbody tr:nth-child(even) {
  background: #f9f9f9;
}

.summary-row td {
  background: #e5e7eb !important;
  font-weight: 700 !important;
  font-size: 12px !important;
  padding: 8px 6px !important;
  border: 1.5px solid #000 !important;
}

.summary-label {
  text-align: center !important;
  font-weight: 700 !important;
}

/* Signature */

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
.signature-date {
  text-align: right;
  font-size: 12px;
  color: #000;
  margin: 25px 0 15px 0;
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
    background: white !important;
    padding: 0;
    margin: 0;
  }

  .toolbar {
    display: none !important;
  }

  .container {
    box-shadow: none;
    width: 100%;
    max-width: 297mm;
    margin: 0;
  }

  .pdf-content {
    padding: 0;
  }

  .header, .date-section, .report-title {
    page-break-after: avoid;
    break-after: avoid;
  }

  table {
    page-break-inside: auto;
    border: 1.5px solid #000 !important;
  }

  tr {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  thead {
    display: table-header-group;
  }

  th {
    background: #ffffff !important;
    color: #000 !important;
    border: 1px solid #000 !important;
    padding: 6px 5px !important;
    font-size: 10px !important;
  }

  td {
    border: 1px solid #000 !important;
    padding: 5px 4px !important;
    font-size: 12px !important;
    white-space: normal;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  tbody tr:nth-child(even) {
    background: #f5f5f5 !important;
  }

  .summary-row td {
    background: #d1d5db !important;
    font-weight: 700 !important;
    border: 1.5px solid #000 !important;
  }
 .summary-row td {
    background: #e5e7eb !important;
    border: 1.5px solid #000 !important;
    font-size: 10px !important;
  }
  .signature-date {
  text-align: right;
  font-size: 12px;
  color: #000;
  margin: 25px 0 15px 0;
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
      <h2>📄 ແບບລາຍງານ (A4 ແນວນອນ)</h2>
      <button class="btn-print" onclick="window.print()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        ພິມລາຍງານ
      </button>
    </div>
    
    <div class="pdf-content">
      <!-- ສ່ວນຫົວ -->
      <div class="header">
        <div class="header-line1">ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ</div>
        <div class="header-line2">ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ</div>
      </div>
      
 <div class="company-info">
      <div>
        <div class="company-name">${user?.companyId?.name || ""}</div>
        <div class="company-address">${user?.companyId?.address || ""}</div>
          <div class="company-address">${user?.companyId?.phone || ""}</div>
      </div>
          <div class="topHeader">ລາຍງານການເງິນ</div>
          <!-- Date Section -->
          <div class="date-section">
            ວັນທີ: <input type="text" value="${formatDate(
              new Date()
            )}" readonly>
          </div>
      </div>
      <!-- ຕາຕະລາງຂໍ້ມູນ -->
      <div class="table-section">
        <table>
          <thead>
            <tr>
              <th style=" font-size:12px;  width: 35px;">ລຳດັບ</th>
              <th style=" font-size:12px;  width: 70px;">ວັນ/ເດືອນ/ປີ</th>
              <th style=" font-size:12px;  width: 60px;">ເລກທີ</th>
              <th style=" font-size:12px;  width: 200px;">ເນື້ອໃນລາຍການ</th>
              <th style=" font-size:12px;  width: 90px;">ຈຳນວນ<br/>(ກີບ)</th>
              <th style=" font-size:12px;  width: 90px;">ຈຳນວນ<br/>(ບາດ)</th>
              <th style=" font-size:12px;  width: 90px;">ຈຳນວນ<br/>(ໂດລາ)</th>
              <th style=" font-size:12px;  width: 90px;">ຈຳນວນ<br/>(ຢວນ)</th>
              <th style=" font-size:12px;  width: 100px;">ປະເພດ<br/></th>
              <th style=" font-size:12px;  width: 120px;">ໝາຍເຫດ</th>
            </tr>
          </thead>
          <tbody>
            ${selectedData
              .map((item, index) => {
                if (item.listAmount && item.listAmount.length > 0) {
                  return item.listAmount
                    .map((amt, idx) => {
                      const kipAmount = amt.currency === "LAK" ? amt.amount : 0;
                      const thbAmount = amt.currency === "THB" ? amt.amount : 0;
                      const usdAmount = amt.currency === "USD" ? amt.amount : 0;
                      const cnyAmount = amt.currency === "CNY" ? amt.amount : 0;

                      return `
                      <tr>
                        <td style="font-size:12px; text-align: center;">${
                          index + 1
                        }</td>
                        <td style=" font-size:12px;  text-align: center;">${formatDate(
                          item.date
                        )}</td>
                        <td style=" font-size:12px;  text-align: center;">${
                          item.serial || "-"
                        }</td>
                        <td style=" font-size:12px;  text-align: left; padding-left: 6px;">${
                          amt.description || item.description || "-"
                        }</td>
                        <td style=" font-size:12px;  text-align:left ; padding-right: 6px;">${
                          kipAmount > 0 ? kipAmount.toLocaleString() : "-"
                        }</td>
                        <td style=" font-size:12px;  text-align:left ; padding-right: 6px;">${
                          thbAmount > 0 ? thbAmount.toLocaleString() : "-"
                        }</td>
                        <td style=" font-size:12px;  text-align:left ; padding-right: 6px;">${
                          usdAmount > 0 ? usdAmount.toLocaleString() : "-"
                        }</td>
                        <td style=" font-size:12px;  text-align:left ; padding-right: 6px;">${
                          cnyAmount > 0 ? cnyAmount.toLocaleString() : "-"
                        }</td>
                        <td style="font-size:12px; text-align: left; padding-left: 6px;">${getTypeBadgePrint(
                          amt.type || item.type || "-"
                        )}</td>
                        <td style=" font-size:12px;  text-align: left; padding-left: 6px;">${
                          amt.notes || item.notes || "-"
                        }</td>
                      </tr>
                    `;
                    })
                    .join("");
                } else {
                  return `
                    <tr>
                      <td style="text-align: center;">${index + 1}</td>
                      <td style="text-align: center;">${formatDate(
                        item.date
                      )}</td>
                      <td style="text-align: center;">${
                        item.invoiceNumber || "-"
                      }</td>
                      <td style="text-align: left; padding-left: 6px;">${
                        item.description || "-"
                      }</td>
                      <td style="text-align: right; padding-right: 6px;">${
                        kipAmount > 0 ? kipAmount.toLocaleString() : "-"
                      }</td>
                      <td style="text-align: right; padding-right: 6px;">${
                        thbAmount > 0 ? thbAmount.toLocaleString() : "-"
                      }</td>
                      <td style="text-align: right; padding-right: 6px;">${
                        usdAmount > 0 ? usdAmount.toLocaleString() : "-"
                      }</td>
                      <td style="text-align: right; padding-right: 6px;">${
                        cnyAmount > 0 ? cnyAmount.toLocaleString() : "-"
                      }</td>
                      <td >${getTypeBadgePrint(item.type || "-")}</td>
                      <td style="text-align: left; padding-left: 6px;">${
                        item.notes || "-"
                      }</td>
                    </tr>
                  `;
                }
              })
              .join("")}
            
            <!-- ແຖວສະຫຼຸບຍອດລວມ -->
            ${(() => {
              const totals = { LAK: 0, THB: 0, USD: 0, CNY: 0 };

              selectedData.forEach((item) => {
                if (item.listAmount && item.listAmount.length > 0) {
                  item.listAmount.forEach((amt) => {
                    if (totals.hasOwnProperty(amt.currency)) {
                      totals[amt.currency] += amt.amount;
                    }
                  });
                }
              });

              return `
                <tr class="summary-row">
                  <td colspan="4" class="summary-label">ລວມທັງໝົດ</td>
                  <td style="text-align: right; padding-right: 6px;">${
                    totals.LAK > 0 ? totals.LAK.toLocaleString() : "-"
                  }</td>
                  <td style="text-align: right; padding-right: 6px;">${
                    totals.THB > 0 ? totals.THB.toLocaleString() : "-"
                  }</td>
                  <td style="text-align: right; padding-right: 6px;">${
                    totals.USD > 0 ? totals.USD.toLocaleString() : "-"
                  }</td>
                  <td style="text-align: right; padding-right: 6px;">${
                    totals.CNY > 0 ? totals.CNY.toLocaleString() : "-"
                  }</td>
                  <td></td>
                  <td></td>
                </tr>
              `;
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
  </div>
</body>
</html>
`);
  };
  const renderOPO = (selectedOpo) => {
    const STATUS_COLORS = {
      PENDING: "yellow",
      APPROVED: "green",
      CANCELLED: "red",
    };
    const STATUS_TEXTS = {
      PENDING: "ລໍຖ້າອະນຸມັດ",
      APPROVED: "ອະນຸມັດແລ້ວ",
      CANCELLED: "ຍົກເລີກ",
    };
    const groupByCurrency = (items) =>
      items.reduce((acc, item) => {
        acc[item.currency] =
          (acc[item.currency] || 0) + parseFloat(item.amount || 0);
        return acc;
      }, {});
    return (
      <Box id="pdf-preview" bg="white" p={8} border="1px solid #e2e8f0">
        {/* Header */}
        <Box textAlign="center" mb={6}>
          <Box
            h="80px"
            bg="blue.600"
            display="flex"
            alignItems="center"
            justifyContent="center"
            mb={4}
            borderRadius="md"
          >
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              color="white"
              fontSize="2xl"
              fontWeight="bold"
            >
              {user?.companyInfo?.name}
            </Text>
          </Box>
          <Heading
            fontFamily="Noto Sans Lao, sans-serif"
            size="lg"
            color="blue.700"
          >
            ໃບສັ່ງຈ່າຍເງິນ (OPO)
          </Heading>
          <Text
            fontFamily="Noto Sans Lao, sans-serif"
            fontSize="lg"
            fontWeight="bold"
            mt={2}
            color="gray.600"
          >
            Outgoing Payment Order
          </Text>
        </Box>

        {/* Info */}
        <Flex
          justify="space-between"
          mb={6}
          pb={4}
          borderBottom="2px solid #e2e8f0"
        >
          <Box>
            <HStack fontFamily="Noto Sans Lao, sans-serif" mb={1}>
              <Text fontFamily="Noto Sans Lao, sans-serif">ເລກທີ:</Text>{" "}
              <Text fontFamily="Noto Sans Lao, sans-serif">
                {selectedOpo.serial || selectedOpo.number}
              </Text>
            </HStack>
            <HStack fontFamily="Noto Sans Lao, sans-serif">
              <Text fontFamily="Noto Sans Lao, sans-serif" fontWeight="bold">
                ວັນທີ:
              </Text>{" "}
              <Text fontFamily="Noto Sans Lao, sans-serif">
                {formatDate(selectedOpo.date)}
              </Text>
            </HStack>
          </Box>
          <Box textAlign="right">
            <Badge
              fontFamily="Noto Sans Lao, sans-serif"
              colorScheme={STATUS_COLORS[selectedOpo.status]}
              fontSize="md"
              p={2}
              borderRadius="md"
            >
              {STATUS_TEXTS[selectedOpo.status]}
            </Badge>
          </Box>
        </Flex>

        {/* Items */}
        <Box mb={6}>
          <Heading
            fontFamily="Noto Sans Lao, sans-serif"
            size="md"
            mb={3}
            color="blue.700"
          >
            ລາຍການຈ່າຍເງິນ
          </Heading>
          <Table variant="simple" size="sm">
            <Thead bg="gray.100">
              <Tr>
                <Th fontFamily="Noto Sans Lao, sans-serif">ລຳດັບ</Th>
                <Th fontFamily="Noto Sans Lao, sans-serif">ລາຍລະອຽດ</Th>
                <Th fontFamily="Noto Sans Lao, sans-serif">ວິທີຊຳລະ</Th>
                <Th fontFamily="Noto Sans Lao, sans-serif">ສະກຸນເງິນ</Th>
                <Th fontFamily="Noto Sans Lao, sans-serif" isNumeric>
                  ຈຳນວນເງິນ
                </Th>
                <Th fontFamily="Noto Sans Lao, sans-serif">ສາເຫດ</Th>
                <Th fontFamily="Noto Sans Lao, sans-serif">ໝາຍເຫດ</Th>
              </Tr>
            </Thead>
            <Tbody>
              {(selectedItems.length > 0
                ? (selectedOpo?.listAmount || []).filter((item) =>
                    selectedItems.includes(item._id)
                  )
                : selectedOpo?.listAmount || []
              )
                .slice() // สร้างสำเนา array เพื่อไม่แก้ตัวต้นฉบับ
                .sort((a, b) => new Date(b.date) - new Date(a.date)) // b - a = ใหม่ → เก่า
                .map((item, index) => (
                  <Tr key={item._id}>
                    <Td fontFamily="Noto Sans Lao, sans-serif">
                      {offset + index + 1}
                    </Td>
                    <Td fontFamily="Noto Sans Lao, sans-serif">
                      <Text>{item.description}</Text>
                    </Td>
                    <Td fontFamily="Noto Sans Lao, sans-serif">
                      {PAYMENT_METHODS[item.paymentMethod]}
                    </Td>
                    <Td fontFamily="Noto Sans Lao, sans-serif">
                      {item.currency}
                    </Td>
                    <Td
                      fontFamily="Noto Sans Lao, sans-serif"
                      isNumeric
                      fontWeight="bold"
                    >
                      {parseFloat(item.amount || 0).toLocaleString()}
                    </Td>
                    <Td fontFamily="Noto Sans Lao, sans-serif">
                      {item.reason}
                    </Td>
                    <Td fontFamily="Noto Sans Lao, sans-serif">{item.notes}</Td>
                  </Tr>
                ))}
            </Tbody>
          </Table>
        </Box>

        {/* Total */}
        <Box mb={6} bg="blue.50" p={4} borderRadius="md">
          <Heading
            fontFamily="Noto Sans Lao, sans-serif"
            size="sm"
            mb={2}
            color="blue.700"
          >
            ຍອດລວມທັງໝົດ
          </Heading>
          {Object.entries(
            groupByCurrency(
              selectedItems.length > 0
                ? (selectedOpo.items || []).filter((item) =>
                    selectedItems.includes(item.id)
                  )
                : selectedOpo.items || []
            )
          ).map(([currency, amount]) => (
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              key={currency}
              fontSize="xl"
              fontWeight="bold"
              color="blue.600"
            >
              {amount.toLocaleString()} {currency}
            </Text>
          ))}
        </Box>

        {/* Signatures */}
        <Box mt={8}>
          <Heading
            fontFamily="Noto Sans Lao, sans-serif"
            size="sm"
            mb={4}
            color="blue.700"
          >
            ລາຍເຊັນຜູ້ກ່ຽວຂ້ອງ
          </Heading>
          <Flex justify="space-between" gap={4}>
            {[
              { label: "ຜູ້ຮ້ອງຂໍ", value: selectedOpo.requester },
              { label: "ຜູ້ຈັດການພະແນກ", value: selectedOpo.manager },
              { label: "ຜູ້ສ້າງ OPO", value: selectedOpo.createdBy },
              { label: "CEO & CFO", value: "" },
            ].map((sign, index) => (
              <Box key={index} flex="1" textAlign="center">
                <Text
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontWeight="bold"
                  mb={16}
                >
                  {sign.label}
                </Text>
                <Box borderTop="2px solid" borderColor="gray.400" pt={2}>
                  <Text fontFamily="Noto Sans Lao, sans-serif" fontSize="sm">
                    {sign.value || "___________________"}
                  </Text>
                  <Text
                    fontFamily="Noto Sans Lao, sans-serif"
                    fontSize="xs"
                    color="gray.500"
                    mt={1}
                  >
                    ວັນທີ: ___/___/______
                  </Text>
                </Box>
              </Box>
            ))}
          </Flex>
        </Box>

        {/* Footer */}
        <Box mt={8} pt={4} borderTop="1px solid #e2e8f0" textAlign="center">
          <Text
            fontFamily="Noto Sans Lao, sans-serif"
            fontSize="xs"
            color="gray.500"
          >
            ເອກະສານນີ້ຖືກສ້າງໂດຍລະບົບ OPO - {formatDate(new Date())}
          </Text>
        </Box>
      </Box>
    );
  };
  const renderIncomeAndExpese = (views) => {
    return (
      <VStack py={6} spacing={6} align="stretch">
        {/* Transaction Type Badge */}
        <HStack
          w="100%"
          p={4}
          bg="white"
          shadow="md"
          rounded="lg"
          spacing={6}
          align="center"
          fontFamily="Noto Sans Lao, sans-serif"
        >
          {/* Type */}
          <HStack spacing={2}>
            <Icon
              as={views?.type === "income" ? TrendingUp : TrendingDown}
              color={views?.type === "income" ? "green.500" : "red.500"}
            />
            <Badge
              px={3}
              fontFamily="Noto Sans Lao, sans-serif"
              py={1}
              rounded="full"
              colorScheme={views?.type === "income" ? "green" : "red"}
              fontSize="sm"
            >
              {views?.type === "income" ? "📈 ລາຍຮັບ" : "📉 ລາຍຈ່າຍ"}
            </Badge>
          </HStack>

          <Divider orientation="vertical" />

          {/* Serial */}
          <VStack spacing={1} align="start">
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              fontSize="sm"
              color="gray.500"
            >
              ເລກທີ່
            </Text>
            <Text fontFamily="Noto Sans Lao, sans-serif" fontWeight="semibold">
              {views?.serial || "-"}
            </Text>
          </VStack>

          <Divider orientation="vertical" />

          <Divider orientation="vertical" />

          {/* Payment Method */}
          <VStack spacing={1} align="start">
            <HStack spacing={1}>
              <Icon as={CreditCard} boxSize={4} color="blue.500" />
              <Text
                fontFamily="Noto Sans Lao, sans-serif"
                fontSize="sm"
                color="gray.500"
              >
                ວິທີການຊຳລະ
              </Text>
            </HStack>
            <Badge
              px={3}
              fontFamily="Noto Sans Lao, sans-serif"
              py={1}
              rounded="md"
              colorScheme="blue"
              fontSize="sm"
            >
              {views?.paymentMethod === "cash"
                ? "💵 ເງິນສົດ"
                : views?.paymentMethod === "transfer"
                ? "🏦 ໂອນເງິນ"
                : views?.paymentMethod}
            </Badge>
          </VStack>

          <Divider orientation="vertical" />

          {/* Date */}
          <VStack spacing={1} align="start">
            <HStack spacing={1}>
              <Icon as={Calendar} boxSize={4} color="purple.500" />
              <Text
                fontFamily="Noto Sans Lao, sans-serif"
                fontSize="sm"
                color="gray.500"
              >
                ວັນທີ່
              </Text>
            </HStack>
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              fontSize="sm"
              fontWeight="medium"
            >
              {formatDate(new Date(views?.date))}
            </Text>
          </VStack>
          <VStack>
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              fontSize="sm"
              color="gray.500"
            >
              ໝາຍເຫດ
            </Text>
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              fontSize="sm"
              color="gray.500"
            >
              {views?.notes}
            </Text>
          </VStack>
        </HStack>

        {/* Description */}
        <VStack spacing={1} align="start" flex={1}>
          <Text
            fontFamily="Noto Sans Lao, sans-serif"
            fontSize="sm"
            color="gray.500"
          >
            ລາຍລະອຽດ
          </Text>
          <Text fontFamily="Noto Sans Lao, sans-serif" fontWeight="medium">
            {views?.description || "-"}
          </Text>
        </VStack>

        <Divider />

        {/* Amounts */}
        <Box>
          <HStack spacing={2} mb={3}>
            <Icon as={DollarSign} boxSize={4} color="teal.500" />
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              fontSize="sm"
              color="gray.500"
              fontWeight="medium"
            >
              ຈຳນວນເງິນ
            </Text>
          </HStack>
          <VStack spacing={3} align="stretch">
            {views?.listAmount?.map((amount, index) => (
              <Box key={index} p={4} bg={bg} rounded="lg" border="1px solid">
                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      fontSize="lg"
                      fontWeight="bold"
                      color="gray.600"
                    >
                      {amount?.currency}
                    </Text>
                  </HStack>
                  <Text
                    fontFamily="Noto Sans Lao, sans-serif"
                    fontSize="2xl"
                    fontWeight="bold"
                    color={views?.type === "income" ? "green.500" : "red.500"}
                  >
                    {amount.amount.toLocaleString("lo-LA")}
                  </Text>
                </HStack>
              </Box>
            ))}
          </VStack>
        </Box>

        {/* Note */}
        {views?.note && (
          <>
            <Divider />
            <Box>
              <HStack spacing={2} mb={2}>
                <Icon as={FileText} boxSize={4} color="orange.500" />
                <Text
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontSize="sm"
                  color="gray.500"
                  fontWeight="medium"
                >
                  ໝາຍເຫດ
                </Text>
              </HStack>
              <Box
                p={4}
                bg={useColorModeValue("orange.50", "orange.900")}
                rounded="lg"
                border="1px solid"
                borderColor="orange.200"
              >
                <Text fontFamily="Noto Sans Lao, sans-serif" fontSize="md">
                  {views?.note}
                </Text>
              </Box>
            </Box>
          </>
        )}

        {/* Created Date */}
        <Box pt={2}>
          <Text
            fontFamily="Noto Sans Lao, sans-serif"
            fontSize="xs"
            color="gray.400"
            textAlign="center"
          >
            ສ້າງເມື່ອ: {new Date(views?.createdAt).toLocaleString("lo-LA")}
          </Text>
        </Box>
      </VStack>
    );
  };
  const renderDebt = (documentData) => {
    return (
      <Stack spacing={6}>
        {/* General Information */}
        <Card
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="md"
          boxShadow="sm"
          _hover={{ boxShadow: "md" }}
          transition="all 0.2s"
        >
          <CardBody>
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              fontSize="lg"
              fontWeight="semibold"
              color="gray.700"
              mb={3}
            >
              ຂໍ້ມູນທົ່ວໄປ
            </Text>
            <Stack spacing={3}>
              <Flex justify="space-between" align="center">
                <Text
                  fontFamily="Noto Sans Lao, sans-serif"
                  color="gray.600"
                  fontSize="sm"
                >
                  ເລກທີ່:
                </Text>
                <Text
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontWeight="medium"
                >
                  {documentData?.serial}
                </Text>
              </Flex>
              <Text
                fontFamily="Noto Sans Lao, sans-serif"
                color="gray.600"
                fontSize="sm"
              >
                ລາຍລະອຽດ:
              </Text>
              <Flex justify="space-between" align="center">
                <Text
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontWeight="medium"
                >
                  {documentData?.description}
                </Text>
              </Flex>
              <Flex justify="space-between" align="center">
                <Text
                  fontFamily="Noto Sans Lao, sans-serif"
                  color="gray.600"
                  fontSize="sm"
                >
                  ປະເພດໜີ້:
                </Text>
                <Badge
                  fontFamily="Noto Sans Lao, sans-serif"
                  colorScheme={
                    documentData?.debtType === "payable" ? "red" : "green"
                  }
                  px={2}
                  py={1}
                  borderRadius="full"
                >
                  {documentData?.debtType === "payable"
                    ? "ໜີ້ຕ້ອງສົ່ງ"
                    : "ໜີ້ຕ້ອງຮັບ"}
                </Badge>
              </Flex>
              <Flex justify="space-between" align="center">
                <Text
                  fontFamily="Noto Sans Lao, sans-serif"
                  color="gray.600"
                  fontSize="sm"
                >
                  ວິທີການຊຳລະ:
                </Text>
                <Text
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontWeight="medium"
                >
                  {documentData?.paymentMethod}
                </Text>
              </Flex>
              <Flex justify="space-between" align="center">
                <Text
                  fontFamily="Noto Sans Lao, sans-serif"
                  color="gray.600"
                  fontSize="sm"
                >
                  ວັນທີ່:
                </Text>
                <Text
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontWeight="medium"
                >
                  {formatDate(documentData?.date)}
                </Text>
              </Flex>
              <Flex justify="space-between" align="center">
                <Text
                  fontFamily="Noto Sans Lao, sans-serif"
                  color="gray.600"
                  fontSize="sm"
                >
                  ສະຖານະ:
                </Text>
                <Badge
                  fontFamily="Noto Sans Lao, sans-serif"
                  colorScheme={
                    documentData?.status === "ຊຳລະບາງສ່ວນ" ? "yellow" : "green"
                  }
                  px={2}
                  py={1}
                  borderRadius="full"
                >
                  {documentData?.status}
                </Badge>
              </Flex>
              <Flex justify="space-between" align="center">
                <Text
                  fontFamily="Noto Sans Lao, sans-serif"
                  color="gray.600"
                  fontSize="sm"
                >
                  ສ້າງເມື່ອ:
                </Text>
                <Text
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontWeight="medium"
                >
                  {formatDate(documentData?.createdAt)}
                </Text>
              </Flex>
              <Flex justify="space-between" align="center">
                <Text
                  fontFamily="Noto Sans Lao, sans-serif"
                  color="gray.600"
                  fontSize="sm"
                >
                  ອັບເດດເມື່ອ:
                </Text>
                <Text
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontWeight="medium"
                >
                  {formatDate(documentData?.updatedAt)}
                </Text>
              </Flex>
            </Stack>
          </CardBody>
        </Card>

        {/* Amounts Section */}
        <Card
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="md"
          boxShadow="sm"
          _hover={{ boxShadow: "md" }}
          transition="all 0.2s"
        >
          <CardBody>
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              fontSize="lg"
              fontWeight="semibold"
              color="gray.700"
              mb={3}
            >
              ຈຳນວນເງິນ
            </Text>
            <Table variant="simple" size="sm">
              <Thead bg="gray.50">
                <Tr>
                  <Th
                    fontFamily="Noto Sans Lao, sans-serif"
                    color="gray.600"
                    fontSize="xs"
                    textTransform="none"
                  >
                    ສະກຸນເງິນ
                  </Th>
                  <Th
                    fontFamily="Noto Sans Lao, sans-serif"
                    color="gray.600"
                    fontSize="xs"
                    textTransform="none"
                    isNumeric
                  >
                    ຈຳນວນ
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {documentData?.listAmount?.map((amt) => (
                  <Tr
                    key={amt._id?.$oid}
                    _hover={{ bg: "gray.50" }}
                    transition="background 0.2s"
                  >
                    <Td fontFamily="Noto Sans Lao, sans-serif" fontSize="sm">
                      {amt.currency}
                    </Td>
                    <Td
                      fontFamily="Noto Sans Lao, sans-serif"
                      fontSize="sm"
                      isNumeric
                      fontWeight="medium"
                    >
                      {formatAmount(amt.amount, amt.currency)}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </Card>

        {/* Installments Section */}
        <Card
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="md"
          boxShadow="sm"
          _hover={{ boxShadow: "md" }}
          transition="all 0.2s"
        >
          <CardBody>
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              fontSize="lg"
              fontWeight="semibold"
              color="gray.700"
              mb={3}
            >
              ງວດການຊຳລະ (ແຍກຕາມສະກຸນເງິນ)
            </Text>

            {(() => {
              // 🧮 จัดกลุ่ม installments ตามสกุลเงิน
              const groupedByCurrency = documentData?.installments?.reduce(
                (acc, inst) => {
                  if (!acc[inst.currency]) acc[inst.currency] = [];
                  acc[inst.currency].push(inst);
                  return acc;
                },
                {}
              );

              return Object.entries(groupedByCurrency || {}).map(
                ([currency, installments]) => (
                  <Box key={currency} mb={6}>
                    {/* 🔹 หัวข้อของแต่ละสกุลเงิน */}
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      fontWeight="bold"
                      fontSize="md"
                      color="blue.600"
                      mb={2}
                    >
                      💱 ສະກຸນເງິນ: {currency}
                    </Text>

                    {/* 🔹 ตารางของแต่ละสกุลเงิน */}
                    <Table variant="simple" size="xl">
                      <Thead bg="gray.50">
                        <Tr>
                          <Th
                            fontFamily="Noto Sans Lao, sans-serif"
                            color="gray.600"
                            fontSize="xs"
                            textTransform="none"
                          >
                            ວັນຄົບກຳນົດ
                          </Th>
                          <Th
                            fontFamily="Noto Sans Lao, sans-serif"
                            color="gray.600"
                            fontSize="xs"
                            textTransform="none"
                          >
                            ວັນທີ່ຊຳລະ
                          </Th>
                          <Th
                            fontFamily="Noto Sans Lao, sans-serif"
                            color="gray.600"
                            fontSize="xs"
                            textTransform="none"
                            isNumeric
                          >
                            ຈຳນວນ
                          </Th>
                          <Th
                            fontFamily="Noto Sans Lao, sans-serif"
                            color="gray.600"
                            fontSize="xs"
                            textTransform="none"
                          >
                            ສະຖານະ
                          </Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {installments.map((inst) => (
                          <Tr
                            key={inst._id?.$oid || inst._id}
                            _hover={{ bg: "gray.50" }}
                            transition="background 0.2s"
                          >
                            <Td
                              fontFamily="Noto Sans Lao, sans-serif"
                              fontSize="sm"
                            >
                              {formatDate(inst.dueDate)}
                            </Td>
                            <Td
                              fontFamily="Noto Sans Lao, sans-serif"
                              fontSize="sm"
                            >
                              {inst.paidDate
                                ? formatDate(inst.paidDate)
                                : "ຍັງບໍ່ຊຳລະ"}
                            </Td>
                            <Td
                              fontFamily="Noto Sans Lao, sans-serif"
                              fontSize="sm"
                              isNumeric
                              fontWeight="medium"
                            >
                              {formatAmount(inst.amount, inst.currency)}
                            </Td>
                            <Td
                              fontFamily="Noto Sans Lao, sans-serif"
                              fontSize="sm"
                            >
                              <Badge
                                fontFamily="Noto Sans Lao, sans-serif"
                                colorScheme={inst.isPaid ? "green" : "red"}
                                px={2}
                                py={1}
                                borderRadius="full"
                              >
                                {inst.isPaid ? "ຊຳລະແລ້ວ" : "ຍັງບໍ່ຊຳລະ"}
                              </Badge>
                            </Td>
                          </Tr>
                        ))}

                        {/* 🔹 แสดงยอดรวมของแต่ละสกุล */}
                        <Tr bg="gray.50">
                          <Td
                            colSpan={2}
                            textAlign="right"
                            fontFamily="Noto Sans Lao, sans-serif"
                            fontWeight="bold"
                            color="gray.700"
                          >
                            ລວມທັງໝົດ:
                          </Td>
                          <Td
                            isNumeric
                            fontFamily="Noto Sans Lao, sans-serif"
                            fontWeight="bold"
                            color="blue.700"
                          >
                            {formatAmount(
                              installments.reduce(
                                (sum, i) => sum + i.amount,
                                0
                              ),
                              currency
                            )}
                          </Td>
                          <Td></Td>
                        </Tr>
                      </Tbody>
                    </Table>
                  </Box>
                )
              );
            })()}
          </CardBody>
        </Card>

        {/* Notes and Reason */}
        <Card
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="md"
          boxShadow="sm"
          _hover={{ boxShadow: "md" }}
          transition="all 0.2s"
        >
          <CardBody>
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              fontSize="lg"
              fontWeight="semibold"
              color="gray.700"
              mb={3}
            >
              ຂໍ້ມູນເພີ່ມເຕີມ
            </Text>
            <Stack spacing={3}>
              <Flex justify="space-between" align="center">
                <Text
                  fontFamily="Noto Sans Lao, sans-serif"
                  color="gray.600"
                  fontSize="sm"
                >
                  ໝາຍເຫດ:
                </Text>
                <Text
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontWeight="medium"
                >
                  {documentData?.notes || "ບໍ່ມີ"}
                </Text>
              </Flex>
              <Flex justify="space-between" align="center">
                <Text
                  fontFamily="Noto Sans Lao, sans-serif"
                  color="gray.600"
                  fontSize="sm"
                >
                  ເຫດຜົນ:
                </Text>
                <Text
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontWeight="medium"
                >
                  {documentData?.reason || "ບໍ່ມີ"}
                </Text>
              </Flex>
            </Stack>
          </CardBody>
        </Card>
      </Stack>
    );
  };
  const renderContent = (selectData) => {
    switch (selectData?.type) {
      case "OPO":
        return renderOPO(selectData);
      case "receivable":
      case "payable":
        return renderDebt(selectData);
      case "income":
      case "expense":
        return renderIncomeAndExpese(selectData);
      default:
        return <p>ไม่พบข้อมูลที่ต้องการแสดง</p>;
    }
  };
  const PAYMENT_METHODS = {
    cash: "ເງິນສົດ",
    transfer: "ໂອນເງິນ",
  };
  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Flex justify="space-between" align="center" flexWrap="wrap">
          <Heading fontFamily="Noto Sans Lao, sans-serif" size="lg">
            ລາຍງານການເງິນ
          </Heading>
          <HStack spacing={4}>
            <Button
              fontFamily="Noto Sans Lao, sans-serif"
              colorScheme="blue"
              onClick={exportToPDF}
              isDisabled={selectedItems.size === 0}
            >
              Print ({selectedItems.size})
            </Button>
            <Button
              fontFamily="Noto Sans Lao, sans-serif"
              colorScheme="teal"
              onClick={fetchData}
              isLoading={loading}
            >
              ຄົ້ນຫາ
            </Button>
          </HStack>
        </Flex>

        {/* Filters */}
        <Card>
          <CardBody>
            <VStack spacing={4}>
              <HStack w="full" spacing={4} flexWrap="wrap">
                <InputGroup flex={1} minW="200px">
                  <InputLeftElement pointerEvents="none">
                    <Search size={20} />
                  </InputLeftElement>
                  <Input
                    fontFamily="Noto Sans Lao, sans-serif"
                    placeholder="ຄົ້ນຫາ (ລາຍລະອຽດ ຫຼື ໝາຍເຫດ)"
                    value={filters.searchText}
                    onChange={(e) =>
                      setFilters({ ...filters, searchText: e.target.value })
                    }
                  />
                </InputGroup>
                <Button
                  fontFamily="Noto Sans Lao, sans-serif"
                  variant="outline"
                  onClick={() => {
                    setFilters({
                      startDate: "",
                      endDate: "",
                      type: "",
                      paymentMethod: "",
                      currency: "",
                      searchText: "",
                      status: "",
                    });
                    setTimeout(fetchData, 100);
                  }}
                >
                  ລ້າງ
                </Button>
              </HStack>

              <HStack w="full" spacing={4} flexWrap="wrap">
                <Input
                  fontFamily="Noto Sans Lao, sans-serif"
                  type="date"
                  placeholder="ວັນທີ່ເລີ່ມ"
                  value={filters.startDate}
                  onChange={(e) =>
                    setFilters({ ...filters, startDate: e.target.value })
                  }
                  flex={1}
                  minW="150px"
                />
                <Input
                  type="date"
                  placeholder="ວັນທີ່ສິ້ນສຸດ"
                  value={filters.endDate}
                  onChange={(e) =>
                    setFilters({ ...filters, endDate: e.target.value })
                  }
                  flex={1}
                  minW="150px"
                />
                <Select
                  placeholder="ປະເພດ"
                  value={filters.type}
                  onChange={(e) =>
                    setFilters({ ...filters, type: e.target.value })
                  }
                  fontFamily="Noto Sans Lao, sans-serif"
                  flex={1}
                  minW="150px"
                >
                  <option value="income">ລາຍຮັບ</option>
                  <option value="expense">ລາຍຈ່າຍ</option>
                  <option value="OPO">OPO</option>
                  <option value="receivable">ໜີ້ຮັບ</option>
                  <option value="payable">ໜີ້ສົ່ງ</option>
                </Select>
                <Select
                  fontFamily="Noto Sans Lao, sans-serif"
                  placeholder="ວິທີຊຳລະ"
                  value={filters.paymentMethod}
                  onChange={(e) =>
                    setFilters({ ...filters, paymentMethod: e.target.value })
                  }
                  flex={1}
                  minW="150px"
                >
                  <option value="cash">ເງິນສົດ</option>
                  <option value="transfer">ໂອນ</option>
                  <option value="bank_transfer">ໂອນທະນາຄານ</option>
                </Select>
                <Select
                  placeholder="ສະກຸນເງິນ"
                  value={filters.currency}
                  onChange={(e) =>
                    setFilters({ ...filters, currency: e.target.value })
                  }
                  flex={1}
                  fontFamily="Noto Sans Lao, sans-serif"
                  minW="150px"
                >
                  <option value="LAK">LAK</option>
                  <option value="THB">THB</option>
                  <option value="USD">USD</option>
                </Select>
                <Select
                  fontFamily="Noto Sans Lao, sans-serif"
                  placeholder="ສະຖານະ"
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value })
                  }
                  flex={1}
                  minW="150px"
                >
                  <option value="paid">ຊຳລະແລ້ວ</option>
                  <option value="PENDING">ລໍຖ້າ</option>
                  <option value="ຊຳລະບາງສ່ວນ">ຊຳລະບາງສ່ວນ</option>
                </Select>

                {/* <Select
                  fontFamily="Noto Sans Lao, sans-serif"
                  placeholder="ເລືອກສະຖານະ"
                  value={filters.status_Ap}
                  onChange={(e) =>
                    setFilters({ ...filters, status_Ap: e.target.value })
                  }
                  flex={1}
                  minW="150px"
                >
                  <option value="">ທັງໝົດ</option>
                  <option value="APPROVED">ອະນຸມັດ</option>
                  <option value="PENDING">ລໍຖ້າອະນຸມັດ</option>
                  <option value="CANCELLED">ຍົກເລີກ</option>
                </Select> */}
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Summary */}
        <HStack>
          <Text
            fontFamily="Noto Sans Lao, sans-serif"
            fontSize="sm"
            color="gray.600"
          >
            ທັງໝົດ: {data.length} ລາຍການ
          </Text>
          <Text
            fontFamily="Noto Sans Lao, sans-serif"
            fontSize="sm"
            color="blue.600"
          >
            ເລືອກແລ້ວ: {selectedItems.size} ລາຍການ
          </Text>
        </HStack>

        {/* Table */}
        <Card>
          <CardBody p={0}>
            {loading ? (
              <Flex justify="center" align="center" h="200px">
                <Spinner size="xl" color="blue.500" />
              </Flex>
            ) : (
              <Box overflowX="auto">
                <Table variant="simple" size="sm">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th fontFamily="Noto Sans Lao, sans-serif">
                        <Checkbox
                          isChecked={
                            selectedItems.size === pageData.length &&
                            pageData.length > 0
                          }
                          onChange={handleSelectAll}
                        />
                      </Th>
                      <Th fontFamily="Noto Sans Lao, sans-serif">ລຳດັບ</Th>
                      <Th fontFamily="Noto Sans Lao, sans-serif">ວັນທີ່</Th>
                      <Th fontFamily="Noto Sans Lao, sans-serif">ເລກທີ</Th>
                      <Th fontFamily="Noto Sans Lao, sans-serif">ລາຍລະອຽດ</Th>
                      <Th fontFamily="Noto Sans Lao, sans-serif">ປະເພດ</Th>
                      <Th fontFamily="Noto Sans Lao, sans-serif" isNumeric>
                        ຈຳນວນ
                      </Th>
                      <Th fontFamily="Noto Sans Lao, sans-serif">ວິທີຊຳລະ</Th>
                      <Th fontFamily="Noto Sans Lao, sans-serif">ສະຖານະ</Th>
                      <Th fontFamily="Noto Sans Lao, sans-serif">ໝາຍເຫດ</Th>
                      <Th fontFamily="Noto Sans Lao, sans-serif">ການກະທຳ</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {pageData
                      .slice()
                      .sort((a, b) => new Date(b.date) - new Date(a.date)) // b - a = ใหม่ → เก่า
                      .map((item, index) => (
                        <Tr key={item._id} _hover={{ bg: "gray.50" }}>
                          {/* ✅ Checkbox */}
                          <Td fontFamily="Noto Sans Lao, sans-serif">
                            <Checkbox
                              isChecked={selectedItems.has(item._id)}
                              onChange={() => handleSelectItem(item._id)}
                            />
                          </Td>
                          <Td fontFamily="Noto Sans Lao, sans-serif">
                            {offset + index + 1}
                          </Td>
                          {/* ✅ วันที่ */}
                          <Td fontFamily="Noto Sans Lao, sans-serif">
                            {formatDate(item.date)}
                          </Td>

                          {/* ✅ เลขที่ */}
                          <Td fontFamily="Noto Sans Lao, sans-serif">
                            {item.serial || "-"}
                          </Td>

                          {/* ✅ รายละเอียด */}
                          <Td
                            fontFamily="Noto Sans Lao, sans-serif"
                            maxW="200px"
                            isTruncated
                          >
                            <HStack spacing={2} align="start">
                              <Text fontSize="sm">
                                📄{shortDesc(item.description)}{" "}
                              </Text>
                            </HStack>
                          </Td>

                          {/* ✅ ประเภท */}
                          <Td fontFamily="Noto Sans Lao, sans-serif">
                            {getTypeBadge(item.type, item.sourceType)}
                          </Td>

                          {/* ✅ จำนวนเงิน (รองรับหลายสกุล) */}
                          <Td
                            fontFamily="Noto Sans Lao, sans-serif"
                            fontWeight="semibold"
                            verticalAlign="top"
                          >
                            {item?.listAmount?.map((amt, idx) => (
                              <Box
                                key={idx}
                                mb={2}
                                p={2}
                                border="1px solid #E2E8F0"
                                borderRadius="md"
                                bg="gray.50"
                                _hover={{ bg: "gray.100" }}
                              >
                                <Text>
                                  💰 {formatAmount(amt.amount, amt.currency)}
                                </Text>
                              </Box>
                            ))}
                          </Td>

                          {/* ✅ วิธีชำระ */}
                          <Td fontFamily="Noto Sans Lao, sans-serif">
                            {item?.listAmount && item.listAmount.length > 1 ? (
                              <Box fontFamily="Noto Sans Lao, sans-serif">
                                {item.listAmount.map((amt, idx) => (
                                  <Text
                                    fontFamily="Noto Sans Lao, sans-serif"
                                    key={idx}
                                    fontSize="sm"
                                  >
                                    🏦{" "}
                                    {paymentMethodMap[amt.paymentMethod] ||
                                      paymentMethodMap[item.paymentMethod]}
                                  </Text>
                                ))}
                              </Box>
                            ) : (
                              paymentMethodMap[item.paymentMethod] ||
                              paymentMethodMap[item.paymentMethod]
                            )}
                          </Td>

                          {/* ✅ สถานะ */}
                          <Td fontFamily="Noto Sans Lao, sans-serif">
                            {item?.listAmount && item.listAmount.length > 1 ? (
                              <VStack align="start" spacing={1}>
                                {item.listAmount.map((amt, idx) => (
                                  <HStack
                                    key={idx}
                                    spacing={2}
                                    fontFamily="Noto Sans Lao, sans-serif"
                                  >
                                    {getPaymentBadge(amt.status || item.status)}
                                    {getApproveBadge(item.status_Ap)}
                                  </HStack>
                                ))}
                              </VStack>
                            ) : (
                              <HStack spacing={2}>
                                {getPaymentBadge(item.status)}
                                {getApproveBadge(item.status_Ap)}
                              </HStack>
                            )}
                          </Td>

                          {/* ✅ หมายเหตุ */}
                          <Td
                            fontFamily="Noto Sans Lao, sans-serif"
                            maxW="150px"
                            isTruncated
                            title={item?.notes}
                          >
                            {item.listAmount && item.listAmount.length > 1 ? (
                              <Box fontFamily="Noto Sans Lao, sans-serif">
                                {item.listAmount.map((amt, idx) => (
                                  <Text
                                    fontFamily="Noto Sans Lao, sans-serif"
                                    key={idx}
                                    fontSize="sm"
                                  >
                                    📝 {shortDesc(amt.notes) || "-"}
                                  </Text>
                                ))}
                              </Box>
                            ) : (
                              shortDesc(item.notes || "-")
                            )}
                          </Td>
                          <Td>
                            <IconButton
                              icon={<Eye size={18} />}
                              colorScheme="blue"
                              variant="solid"
                              size="sm"
                              borderRadius="md"
                              onClick={() => handleDetail(item)}
                              _hover={{
                                transform: "scale(1.05)",
                                boxShadow: "md",
                              }}
                              fontFamily="Noto Sans Lao, sans-serif"
                              transition="all 0.2s"
                            />
                          </Td>
                        </Tr>
                      ))}
                  </Tbody>
                </Table>
                {pageData.length === 0 && !loading && (
                  <Flex justify="center" align="center" h="200px">
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      color="gray.500"
                    >
                      ບໍ່ມີຂໍ້ມູນ
                    </Text>
                  </Flex>
                )}
              </Box>
            )}
            <HStack spacing={2} justify="center">
              <IconButton
                icon={<ChevronLeftIcon />}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                isDisabled={page === 1}
                colorScheme="purple"
                variant="outline"
                borderRadius="full"
                aria-label="Previous page"
                _hover={{
                  transform: "scale(1.1)",
                }}
              />

              <Badge
                colorScheme="purple"
                fontSize="md"
                px={4}
                py={2}
                borderRadius="full"
              >
                {page} / {totalPages}
              </Badge>

              <IconButton
                icon={<ChevronRightIcon />}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                isDisabled={page === totalPages}
                colorScheme="purple"
                variant="outline"
                borderRadius="full"
                aria-label="Next page"
                _hover={{
                  transform: "scale(1.1)",
                }}
              />
            </HStack>
          </CardBody>
        </Card>
      </VStack>
      {/* /////details */}

      <ChakraProvider>
        <Modal
          size="4xl"
          isCentered
          motionPreset="slideInBottom"
          isOpen={isOpen}
          onClose={onClose}
        >
          <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(10px)" />
          <ModalContent rounded="2xl" shadow="2xl" border="1px solid">
            <ModalHeader borderBottom="1px">{selectData?.type}</ModalHeader>
            <ModalCloseButton />
            <ModalBody py={6}>{renderContent(selectData)}</ModalBody>
            <ModalFooter>
              <Button colorScheme="blue" onClick={onClose}>
                Close
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </ChakraProvider>
    </Container>
  );
};

export default Report;
