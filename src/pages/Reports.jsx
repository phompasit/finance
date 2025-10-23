import React, { useState, useEffect } from "react";
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
} from "@chakra-ui/react";
import { Search } from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";

const Report = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    type: "",
    paymentMethod: "",
    currency: "",
    searchText: "",
    status: "",
  });
  const toast = useToast();
  const shortDesc = (desc) => {
    if (!desc) return "-"; // ถ้าไม่มีค่า ให้คืนเครื่องหมายขีด
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
      const response = await fetch(`/api/report?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          response.status === 401 ? "Unauthorized" : "Server error"
        );
      }
      const result = await response.json();
      console.log(result);
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
      setSelectedItems(new Set(data.map((item) => item._id)));
    } else {
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
    const colors = {
      income: "#48BB78", // green
      expense: "#F56565", // red
      receivable: "#9F7AEA", // purple
      ໜີ້ຕ້ອງຮັບ: "#4299E1", // blue
      payable: "#ED8936", // orange
    };

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
    font-family:'Noto Sans Lao', sans-serif;


    font-size:8px;
  ">${labels[key] || sourceType}</span>`;
  };

  // Get badge for status
  const getStatusBadge = (status) => {
    const statusMap = {
      paid: { label: "ຊຳລະແລ້ວ", color: "green" },
      PENDING: { label: "ລໍຖ້າ", color: "yellow" },
      ຊຳລະບາງສ່ວນ: { label: "ຊຳລະບາງສ່ວນ", color: "gray" },
      APPROVED: { label: "ອະນຸມັດ", color: "green" },
    };
    return (
      <Badge
        fontFamily="Noto Sans Lao, sans-serif"
        colorScheme={statusMap[status]?.color || "gray"}
      >
        {statusMap[status]?.label || status}
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

    const selectedData = data.filter((item) => selectedItems.has(item._id));
    console.log(selectedData);
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
<!DOCTYPE html>
<html lang="lo">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ແມ່ແບບລາຍງານ</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Noto Sans Lao', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    
    .container {
      max-width: 210mm;
      margin: 0 auto;
      background: white;
      border-radius: 15px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    
    .toolbar {
      background: #2d3748;
      padding: 15px 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .toolbar h2 {
      color: white;
      font-size: 18px;
    }
    
    .btn-print {
      background: #48bb78;
      color: white;
      border: none;
      padding: 10px 25px;
      border-radius: 8px;
      cursor: pointer;
      font-family: 'Noto Sans Lao', sans-serif;
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.3s;
    }
    
    .btn-print:hover {
      background: #38a169;
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(72, 187, 120, 0.4);
    }
    
    .pdf-content {
      padding: 20mm 15mm;
      min-height: 297mm;
    }
    
    /* ສ່ວນຫົວ - ຮູບແບບທາງການ */
    .header {
      text-align: center;
      border-bottom: 2px solid #1a202c;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    
    .header-line1 {
      font-size: 14px;
      font-weight: 700;
      color: #1a202c;
      margin-bottom: 3px;
      letter-spacing: 0.3px;
    }
    
    .header-line2 {
      font-size: 11px;
      font-weight: 500;
      color: #4a5568;
      margin-bottom: 8px;
    }
    
    /* ວັນທີ - ແບບທາງການ */
    .date-section {
      text-align: right;
      margin-bottom: 15px;
      font-size: 11px;
      color: #2d3748;
      font-weight: 500;
    }
    
    /* ຫົວຂໍ້ລາຍງານ */
    .report-title {
      text-align: center;
      margin: 15px 0 20px 0;
    }
    
    .report-title h2 {
      font-size: 16px;
      font-weight: 700;
      color: #1a202c;
      text-decoration: underline;
      text-underline-offset: 4px;
    }
    
    /* ຕາຕະລາງ - ແບບທາງການ */
    .table-section {
      margin: 20px 0;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 10px;
    }
    
    th {
      background: #1a202c;
      color: white;
      padding: 8px 4px;
      text-align: center;
      font-weight: 600;
      font-size: 10px;
      border: 1px solid #000;
      line-height: 1.3;
    }
    
    td {
      padding: 6px 4px;
      border: 1px solid #2d3748;
      font-size: 9px;
      line-height: 1.4;
    }
    
    tbody tr:nth-child(even) {
      background: #f7fafc;
    }
    
    /* ແຖວສະຫຼຸບ */
    .summary-row td {
      background: #e2e8f0 !important;
      font-weight: 700 !important;
      font-size: 10px !important;
      padding: 8px 4px !important;
      border: 2px solid #1a202c !important;
    }
    
    .summary-label {
      text-align: center !important;
    }
    
    /* ສ່ວນລາຍເຊັນ - ແບບທາງການ */
    .signature-section {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-top: 35px;
      padding-top: 20px;
      page-break-inside: avoid;
    }
    
    .signature-box {
      text-align: center;
    }
    
    .signature-label {
      font-weight: 600;
      margin-bottom: 5px;
      color: #1a202c;
      font-size: 11px;
    }
    
    .signature-line {
      border-top: 1px solid #1a202c;
      margin: 45px 10px 5px;
      padding-top: 5px;
      font-size: 9px;
      color: #4a5568;
    }
    
    /* ພິມ */
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .toolbar {
        display: none;
      }
      
      .container {
        box-shadow: none;
        border-radius: 0;
        max-width: 210mm;
      }
      
      .pdf-content {
        padding: 15mm 12mm;
      }
      
      @page {
        size: A4;
        margin: 0;
      }
      
      /* ກັນບໍ່ໃຫ້ແບ່ງຫນ້າ */
      .header {
        page-break-after: avoid;
        break-after: avoid;
      }
      
      .date-section {
        page-break-after: avoid;
        break-after: avoid;
      }
      
      .report-title {
        page-break-after: avoid;
        break-after: avoid;
      }
      
      /* ບັງຄັບໃຫ້ມີສີຕອນພິມ */
      th {
        background: #1a202c !important;
        color: white !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        border: 1px solid #000 !important;
      }
      
      tbody tr:nth-child(even) {
        background: #f7fafc !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .summary-row td {
        background: #e2e8f0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      /* ກັນບໍ່ໃຫ້ແຖວແຍກ */
      tr {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      
      /* ລາຍເຊັນຢູ່ກັນ */
      .signature-section {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      
      /* ຫົວຕາຕະລາງຊ້ຳທຸກໆຫນ້າ */
      thead {
        display: table-header-group;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="toolbar">
      <h2>📄 ແມ່ແບບລາຍງານ</h2>
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
        <div class="header-line2">ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດຖານາທາວ</div>
      </div>
      
      <!-- ວັນທີ -->
      <div class="date-section">
        ວັນທີ: ${formatDate(new Date()) || "N/A"}
      </div>
      
      <!-- ຫົວຂໍ້ລາຍງານ -->
      <div class="report-title">
        <h2>ລາຍງານ</h2>
      </div>
      
      <!-- ຕາຕະລາງຂໍ້ມູນ -->
      <div class="table-section">
        <table>
          <thead>
            <tr>
              <th style="width: 30px;">ລຳດັບ</th>
              <th style="width: 65px;">ວັນ/ເດືອນ/ປີ</th>
              <th style="width: 55px;">ເລກທີ</th>
              <th style="width: 180px;">ເນື້ອໃນລາຍການ</th>
              <th style="width: 85px;">ຈຳນວນ<br/>(ກີບ)</th>
              <th style="width: 85px;">ຈຳນວນ<br/>(ບາດ)</th>
              <th style="width: 85px;">ຈຳນວນ<br/>(ໂດລາ)</th>
              <th style="width: 85px;">ຈຳນວນ<br/>(ຢວນ)</th>
              <th style="width: 105px;">ປະເພດ<br/></th>
              <th style="width: 110px;">ໝາຍເຫດ</th>
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
                        <td style="text-align: center;">${index + 1}</td>
                        <td style="text-align: center;">${formatDate(
                          item.date
                        )}</td>
                        <td style="text-align: center;">${
                          item.invoiceNumber || "-"
                        }</td>
                        <td style="text-align: left; padding-left: 6px;">${
                          amt.description || item.description || "-"
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
                        <td style=" font-size:10px ;text-align: left; padding-left: 6px;">${getTypeBadgePrint(
                          amt.type || item.type || "-"
                        )}</td>
                         <td style="text-align: left; padding-left: 6px;">${
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
                         <td style=" font-size:10px ; text-align: left; padding-left: 6px;">${getTypeBadgePrint(
                           item.type || "-"
                         )}</td>
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
      
      <!-- ສ່ວນລາຍເຊັນ -->
      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-label">ຜູ້ສ້າງລາຍງານ</div>
          <div class="signature-line">(ເຊັນ ແລະ ຈົ່ງຊື່ຈະແຈ້ງ)</div>
        </div>
        
        <div class="signature-box">
          <div class="signature-label">ຜູ້ກວດສອບ</div>
          <div class="signature-line">(ເຊັນ ແລະ ຈົ່ງຊື່ຈະແຈ້ງ)</div>
        </div>
        
        <div class="signature-box">
          <div class="signature-label">ຜູ້ອະນຸມັດ</div>
          <div class="signature-line">(ເຊັນ ແລະ ຈົ່ງຊື່ຈະແຈ້ງ)</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`);
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
              Export PDF ({selectedItems.size})
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
                            selectedItems.size === data.length &&
                            data.length > 0
                          }
                          onChange={handleSelectAll}
                        />
                      </Th>
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
                    </Tr>
                  </Thead>
                  <Tbody>
                    {data
                      .slice()
                      .sort((a, b) => new Date(b.date) - new Date(a.date)) // b - a = ใหม่ → เก่า
                      .map((item) => (
                        <Tr key={item._id} _hover={{ bg: "gray.50" }}>
                          {/* ✅ Checkbox */}
                          <Td fontFamily="Noto Sans Lao, sans-serif">
                            <Checkbox
                              isChecked={selectedItems.has(item._id)}
                              onChange={() => handleSelectItem(item._id)}
                            />
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
                              <Box fontFamily="Noto Sans Lao, sans-serif">
                                {item.listAmount.map((amt, idx) => (
                                  <Box
                                    fontFamily="Noto Sans Lao, sans-serif"
                                    key={idx}
                                  >
                                    {getStatusBadge(amt.status || item.status)}
                                  </Box>
                                ))}
                              </Box>
                            ) : (
                              getStatusBadge(item.status)
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
                        </Tr>
                      ))}
                  </Tbody>
                </Table>
                {data.length === 0 && !loading && (
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
          </CardBody>
        </Card>
      </VStack>
    </Container>
  );
};

export default Report;
