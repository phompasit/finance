"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  VStack,
  HStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Checkbox,
  IconButton,
  Flex,
  Heading,
  Divider,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Card,
  CardBody,
  useColorModeValue,
  Icon,
  SimpleGrid,
  useDisclosure,
  Badge,
  Text,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Container,
  InputGroup,
  InputLeftElement,
  Tooltip,
  Collapse,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from "@chakra-ui/react";
import {
  AddIcon,
  CloseIcon,
  DeleteIcon,
  ChevronDownIcon,
  EditIcon,
  DownloadIcon,
  SettingsIcon,
  ViewIcon,
} from "@chakra-ui/icons";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import Papa from "papaparse";
import {
  FilterIcon,
  SearchIcon,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  FileText,
  CreditCard,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import { on } from "events";
import { useAuth } from "../context/AuthContext";

export default function IncomeExpense() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [views, setViews] = useState();
  const { user } = useAuth();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isEdit,
    onOpen: onEditOpen,
    onClose: onEditClose,
  } = useDisclosure();
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("purple.200", "purple.600");
  const badgeBg = useColorModeValue("purple.50", "purple.900");

  const {
    isOpen: isViews,
    onOpen: onOpenViews,
    onClose: onCloseViews,
  } = useDisclosure();
  // Enhanced color scheme
  const bgGradient = useColorModeValue(
    "linear(to-br, gray.50, blue.50)",
    "linear(to-br, gray.900, gray.800)"
  );
  const cardBg = useColorModeValue("white", "gray.800");
  const borderClr = useColorModeValue("gray.200", "gray.700");
  const labelClr = useColorModeValue("gray.700", "gray.300");
  const hoverBg = useColorModeValue("gray.50", "gray.700");
  const statBg = useColorModeValue("white", "gray.700");
  const tableBg = useColorModeValue("white", "gray.800");
  const tableHeaderBg = useColorModeValue("teal.600", "teal.700");
  const statusColors = {
    pending: "yellow",
    approve: "green",
    cancel: "red",
    reject: "gray",
  };

  const [formData, setFormData] = useState({
    serial: "",
    description: "",
    type: "income",
    paymentMethod: "cash",
    date: "",
    amounts: [{ currency: "LAK", amount: "" }],
    note: "",
    status: "paid",
    status_Ap: "pending",
  });
  const [formEditData, setFormEditData] = useState({
    id: null,
    serial: "",
    description: "",
    type: "income",
    paymentMethod: "cash",
    date: new Date().toISOString().split("T")[0],
    amounts: [{ currency: "LAK", amount: "" }],
    note: "",
    status: "paid",
    status_Ap: "pending",
  });

  const [filters, setFilters] = useState({
    search: "",
    dateStart: "",
    dateEnd: "",
    type: "",
    currency: "",
    paymentMethod: "",
    status: "",
    status_Ap: "",
  });

  const toast = useToast();

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/income-expense`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",

            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast({
        title: "ຜິດພາດ",
        description: "ບໍ່ສາມາດດຶງຂໍ້ມູນລາຍການໄດ້",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };
  const pageSize = 30;
  const [page, setPage] = useState(1);

  const paymentMethodLabels = {
    cash: "ເງິນສົດ",
    bank_transfer: "ໂອນເງິນ",
    ໂອນເງິນ: "bank_transfer",
  };
  const status_Ap = {
    cancel: "ຍົກເລີກ",
    approve: "ອະນຸມັດ",
    success_approve: "ອະນູມັດແລ້ວ",
    pending: "ລໍຖ້າ",
  };
   const status_income_expense = {
    income:"ລາຍຮັບ",
    expense:"ລາຍຈ່າຍ",
  };
  function formatDate(dateString) {
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  const filteredTransactions = transactions.filter((t) => {
    const searchLower = filters.search.toLowerCase();
    const matchesSearch =
      filters.search === "" ||
      t.description.toLowerCase().includes(searchLower) ||
      t.note?.toLowerCase().includes(searchLower);
    const matchesDate =
      (!filters.dateStart || new Date(t.date) >= new Date(filters.dateStart)) &&
      (!filters.dateEnd || new Date(t.date) <= new Date(filters.dateEnd));
    const matchesType = !filters.type || t.type === filters.type;
    const matchesCurrency =
      !filters.currency ||
      t.amounts.some((amt) => amt.currency === filters.currency);
    const matchesPaymentMethod =
      !filters.paymentMethod || t.paymentMethod === filters.paymentMethod;
    const matchesStatus = !filters.status || t.status === filters.status;
    const matchstatus_Ap =
      !filters.status_Ap || t.status_Ap === filters.status_Ap;
    return (
      matchesSearch &&
      matchesDate &&
      matchesType &&
      matchesCurrency &&
      matchesPaymentMethod &&
      matchesStatus &&
      matchstatus_Ap
    );
  });
  const totalPages = Math.ceil(filteredTransactions.length / pageSize);
  const offset = (page - 1) * pageSize;
  const pageData = useMemo(() => {
    const s = (page - 1) * pageSize;
    return filteredTransactions.slice(s, s + pageSize);
  }, [filteredTransactions, page]);
  // Calculate statistics
  const calculateStats = () => {
    const totals = {}; // { LAK: 0, THB: 0, USD: 0, CNY: 0, ... }

    filteredTransactions.forEach((t) => {
      t.amounts.forEach((a) => {
        const amount = parseFloat(a.amount || 0);
        if (!totals[a.currency]) totals[a.currency] = { income: 0, expense: 0 };

        // Logic สำหรับแต่ละ type และ status
        if (t.type === "expense") {
          if (t.status_Ap !== "cancel") {
            totals[a.currency].expense += amount;
          }
          // ถ้า cancel ไม่บวก
        } else if (t.type === "income") {
          totals[a.currency].income += amount; // รายได้บวกตามปกติ
        }
      });
    });

    // สร้างผลรวมรวมทั้งหมด
    const summary = {};
    Object.keys(totals).forEach((currency) => {
      summary[currency] = {
        income: totals[currency].income,
        expense: totals[currency].expense,
        balance: totals[currency].income - totals[currency].expense,
      };
    });

    return summary;
  };

  const stats = calculateStats();

  const addCurrency = (index = null) => {
    if (index !== null) {
      // ใช้ formEditData
      const updated = { ...formEditData };
      updated.amounts = [
        ...(updated.amounts || []),
        { currency: "LAK", amount: "" },
      ];
      setFormEditData(updated);
    } else {
      // ใช้ formData
      const updated = { ...formData };
      updated.amounts = [
        ...(updated.amounts || []),
        { currency: "LAK", amount: "" },
      ];
      setFormData(updated);
    }
  };
  const removeCurrency = async (currencyIndex, index = null) => {
    if (index !== null) {
      // formEditData
      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL
        }/api/income-expense/item/${currencyIndex}/${index}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",

            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const updated = { ...formEditData };
      updated.amounts = (updated.amounts || []).filter(
        (_, i) => i !== currencyIndex
      );
      setFormEditData(updated);
    } else {
      // formData
      const updated = { ...formData };
      updated.amounts = (updated.amounts || []).filter(
        (_, i) => i !== currencyIndex
      );
      setFormData(updated);
    }
  };

  const updateCurrency = (currencyIndex, field, value, index = null) => {
    if (index !== null) {
      // formEditData
      const updated = { ...formEditData };
      const amounts = [...(updated.amounts || [])];
      if (amounts[currencyIndex]) amounts[currencyIndex][field] = value;
      updated.amounts = amounts;
      setFormEditData(updated);
    } else {
      // formData
      const updated = { ...formData };
      const amounts = [...(updated.amounts || [])];
      if (amounts[currencyIndex]) amounts[currencyIndex][field] = value;
      updated.amounts = amounts;
      setFormData(updated);
    }
  };

  const shortDesc = (desc) => {
    if (!desc) return "-"; // ถ้าไม่มีค่า ให้คืนเครื่องหมายขีด
    return desc.length > 7 ? desc.substring(0, 7) + "..." : desc;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // กรอง amounts ที่มี amount มากกว่า 0

      const hasValidAmount = (formData.amounts || []).some(
        (item) => parseFloat(item.amount) > 0
      );

      // ตรวจว่าข้อมูลจำเป็นครบไหม
      if (
        !hasValidAmount ||
        !formData.serial ||
        !formData.description ||
        !formData.type ||
        !formData.paymentMethod ||
        !formData.date ||
        !formData.note
      ) {
        toast({
          title: "ກະລຸນາລະບຸຂໍ້ມູນໃຫ້ຄົບຖ້ວນ",
          description: "ກະລຸນາປ້ອນຂໍ້ມູນທຸກຊ່ອງໃຫ້ຄົບຖ້ວນ",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      const endpoint = `${
        import.meta.env.VITE_API_URL
      }/api/income-expense/bulk`;

      // เตรียม body ให้เป็น JSON string
      const body = JSON.stringify({ transactions: formData });

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body,
      });

      if (response.ok) {
        setShowForm(false);
        fetchTransactions();
        setFormData({
          serial: "",
          description: "",
          type: "income",
          paymentMethod: "cash",
          date: "",
          amounts: [{ currency: "LAK", amount: 0 }],
          note: "",
          status: "paid",
        });
        toast({
          title: "ສຳເລັດ",
          description: "ບັນທຶກລາຍການສຳເລັດ",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        onClose();
      } else {
        const data = await response.json();
        toast({
          title: "ກະລຸນາກວດສອບຄືນ",
          description: data.message,
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Error creating transaction:", error);
      toast({
        title: "ຜິດພາດ",
        description: "ບໍ່ສາມາດບັນທຶກລາຍການໄດ້",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };
  const handleEdit = async (id) => {
    try {
      const amounts = formData.amounts || [];

      const hasValidAmount = (formEditData.amounts || []).some(
        (item) => parseFloat(item.amount) > 0
      );
      // ตรวจว่าข้อมูลจำเป็นครบไหม
      if (
        !hasValidAmount ||
        !formEditData?.serial ||
        !formEditData?.description ||
        !formEditData?.type ||
        !formEditData?.paymentMethod ||
        !formEditData?.date ||
        !formEditData?.note
      ) {
        toast({
          title: "ກະລຸນາລະບຸຂໍ້ມູນໃຫ້ຄົບຖ້ວນ",
          description: "ກະລຸນາປ້ອນຂໍ້ມູນທຸກຊ່ອງໃຫ້ຄົບຖ້ວນ",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      const endpoint = `${import.meta.env.VITE_API_URL}/api/income-expense/${
        formEditData.id
      }`;
      const body = JSON.stringify(formEditData);
      console.log(body);
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body,
      });
      if (response.ok) {
        setShowForm(false);
        fetchTransactions();
        toast({
          title: "ສຳເລັດ",
          description: "ແກ້ໄຂລາຍການສຳເລັດ",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        onEditClose();
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to edit transaction");
      }
    } catch (error) {
      console.error("Error editing transaction:", error);
    }
  };
  const handleDelete = async (id) => {
    try {
      const endpoint = `${
        import.meta.env.VITE_API_URL
      }/api/income-expense/${id}`;
      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.ok) {
        setShowForm(false);
        fetchTransactions();
        toast({
          title: "ສຳເລັດ",
          description: "ລຶບລາຍການສຳເລັດ",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        const data = await response.json();

        throw new Error(data.message || "Failed to delete transaction");
      }
    } catch (error) {
      console.error("Error deleting transaction:", error);
    }
  };

  const handleViews = (data) => {
    setViews(data);
    onOpenViews();
  };

  const handleStatus = async (data, status) => {
    try {
      console.log("data", data);
      const endpoint = `${
        import.meta.env.VITE_API_URL
      }/api/income-expense/status/:${data._id}`;

      // เตรียม body ให้เป็น JSON string
      const body = JSON.stringify({
        status_Ap: status,
      });

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body,
      });

      if (response.ok) {
        fetchTransactions();
        toast({
          title: "ສຳເລັດ",
          description: `${status} ສຳເລັດແລ້ວ`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        onClose();
      } else {
        const data = await response.json();
        toast({
          title: "ກະລຸນາກວດສອບຄືນ",
          description: data.message,
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: "something with wrong",
        description: "ກະລຸນາລອງໃໝ່",
        status: "error",
        duration: 2000,
        isClosable: true,
        position: "top-right",
      });
    }
  };
  const exportToPDF = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
<html lang="lo">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title font-family: 'Noto Sans Lao', sans-serif;>-</title>
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
      max-width: 1200px;
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
      padding: 30px 40px;
    }
    
    /* Header */
    .header {
      text-align: center;
      border-bottom: 3px double #2d3748;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
        .topHeader {
      text-align: center;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    // .header-line1 {
    //   font-size: 16px;
    //   font-weight: 600;
    //   color: #2d3748;
    //   margin-bottom: 5px;
    // }
    
    // .header-line2 {
    //   font-size: 14px;
    //   font-weight: 500;
    //   color: #4a5568;
    //   margin-bottom: 10px;
    // }
    
    // .header-line3 {
    //   font-size: 15px;
    //   font-weight: 600;
    //   color: #2d3748;
    // }
    
    /* Company Info */
    .company-info {
      text-align: left;
      font-size: 12px;
      color: #555;
      margin-bottom: 10px;
    }
    
    /* Date Section */
    .date-section {
      text-align: right;
      margin-bottom: 20px;
      font-size: 14px;
      color: #4a5568;
    }
    
    .date-section input {
      border: none;
      border-bottom: 1px dotted #cbd5e0;
      padding: 5px;
      font-family: 'Noto Sans Lao', sans-serif;
      text-align: center;
      width: 150px;
    }
    
    /* Table */
    .table-section {
      margin: 20px 0;
      overflow-x: auto;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-family: 'Noto Sans Lao', sans-serif;
      font-size: 11px;
      text-align: left;
      table-layout: fixed;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
    }
    
/* ✅ ปรับความกว้างของแต่ละคอลัมน์ให้เหมาะกับ A4 แนวนอน */
/* รวมแล้วจะไม่เกิน ~100% */
table th:nth-child(1),
table td:nth-child(1) { width: 4%; min-width: 40px; }

table th:nth-child(2),
table td:nth-child(2) { width: 8%; min-width: 60px; }

table th:nth-child(3),
table td:nth-child(3) { width: 7%; min-width: 55px; }

table th:nth-child(4),
table td:nth-child(4) { width: 22%; min-width: 160px; } /* ✅ ปรับลดลงจาก 28% เพื่อไม่บีบคอลัมน์ท้าย */

table th:nth-child(5),
table td:nth-child(5) { width: 10%; min-width: 75px; }

table th:nth-child(6),
table td:nth-child(6) { width: 8%; min-width: 60px; }

table th:nth-child(7),
table td:nth-child(7) { width: 8%; min-width: 60px; }

table th:nth-child(8),
table td:nth-child(8) { width: 8%; min-width: 60px; }

table th:nth-child(9),
table td:nth-child(9) { width: 12%; min-width: 90px; }

table th:nth-child(10),
table td:nth-child(10) { width: 13%; min-width: 100px; } /* ✅ ปรับจาก 20% → 13% ให้พอดีแนวนอน */

/* ✅ ปรับหัวตารางให้เรียบหรูและพิมพ์ชัด */
th {
  background: linear-gradient(90deg, #0f172a, #1e293b);
  color: white;
  padding: 8px 6px;
  font-weight: 600;
  font-size: 11px;
  border: 1px solid #334155;
  text-align: center;
  white-space: normal;
  word-break: break-word;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* ✅ เซลล์ข้อมูล */
td {
  padding: 6px 5px;
  border: 1px solid #e5e7eb;
  font-size: 7px;
  white-space: normal;
  word-wrap: break-word;
  overflow-wrap: break-word;
  vertical-align: top;
  line-height: 1.45;
}

/* ✅ การจัดแนวคอลัมน์เฉพาะ */
td:nth-child(1),
td:nth-child(2),
td:nth-child(3) {
  text-align: center;
}

td:nth-child(4),
td:nth-child(5),
td:nth-child(6),
td:nth-child(7),
td:nth-child(8),
td:nth-child(9),
td:nth-child(10) {
  text-align: left;
  padding-left: 8px;
}
    
    tr:hover td {
      background: #f7fafc;
    }
    
    .summary-row td {
      background: #e2e8f0;
      font-weight: 700;
      font-size: 11px;
      padding: 8px;
      border: 2px solid #1a202c;
    }
    
    /* Signature Section */
    .signature-section {
      display: flex;
      justify-content: flex-end;
      margin-top: 40px;
      padding-top: 30px;
      border-top: 2px solid #e5e7eb;
    }
    
    .signature-box {
      text-align: center;
      min-width: 220px;
    }
    
    .signature-label {
      font-weight: 600;
      margin-bottom: 10px;
      color: #2d3748;
      font-size: 14px;
    }
    
    .signature-line {
      margin: 50px 0 10px 0;
      font-size: 12px;
      color: #718096;
    }
    
    /* Print Styles */
    @media print {
      @page {
        size: A4 landscape;
        margin: 10mm;
      }
      
      body {
        background: white;
        padding: 0;
      }
      
      .container {
        box-shadow: none;
        border-radius: 0;
        max-width: 100%;
      }
      
      .toolbar {
        display: none;
      }
      
      .pdf-content {
        padding: 10mm;
      }
      
      .table-section {
        overflow: visible;
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
        page-break-inside: auto;
      }
      
      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
      
      th {
        background: #0f172a !important;
        color: white !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        border: 1px solid #000 !important;
        padding: 6px 4px !important;
        font-size: 10px !important;
      }
      
      td {
        border: 1px solid #333 !important;
        padding: 5px 4px !important;
        font-size: 9.5px !important;
        line-height: 1.3;
      }
      
      tbody tr:nth-child(even) {
        background-color: #f8f8f8 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .summary-row td {
        background: #d9d9d9 !important;
        font-weight: bold !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        border: 2px solid #000 !important;
      }
      
      input, textarea {
        border: none !important;
        border-bottom: 1px dotted #999 !important;
      }
      
      .header-line1,
      .header-line2,
      .header-line3 {
        font-size: 12px !important;
      }
      
      .company-info {
        font-size: 10px !important;
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
    
    <div class="pdf-content">
 
      
      <!-- Government Info -->
      <div class="header">
        <div class="header-line1">ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ</div>
        <div class="header-line2">ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ</div>
      </div>
           <!-- Company Info -->
      <div class="company-info">
        <div class="company-name">${user?.companyInfo?.name || ""}</div>
        <div class="company-address">${user?.companyInfo?.address || ""}</div>
          <div class="company-address">${user?.companyInfo?.phone || ""}</div>
      </div>
  <div class="topHeader">
  <div class="">ລາຍງານການເງິນ</div>
  </div>
      <!-- Date Section -->
      <div class="date-section">
        ວັນທີ: <input type="text" value="${formatDate(new Date())}" readonly>
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
              // { minimumFractionDigits: 2 }
              // { minimumFractionDigits: 2 }
              // { minimumFractionDigits: 2 }
              // { minimumFractionDigits: 2 }
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
      <div class="signature-section">
        <div class="signature-box">
          <div>ນະຄອນຫຼວງວຽງຈັນ, ວັນທີ ${formatDate(new Date())}</div>
          <div class="signature-label">ຜູ້ສັງລວມ</div>
          
        </div>
      </div>
    </div>
  </div>

  <script>
    // Mock formatDate function (replace with actual implementation)
    function formatDate(date) {
      if (!date) return "-";
      const d = new Date(date);
      return \`\${d.getDate().toString().padStart(2, "0")}/\${(d.getMonth() + 1).toString().padStart(2, "0")}/\${d.getFullYear()}\`;
    }

    // Mock user and selectedTransactions data (replace with actual data source)
    const user = {
      companyInfo: {
        name: "ບໍລິສັດ ຕົວຢ່າງ ຈຳກັດ",
        address: "ນະຄອນຫຼວງວຽງຈັນ, ປະເທດລາວ"
      }
    };

    const selectedTransactions = [
      {
        date: "2025-10-01",
        serial: "INV001",
        description: "ຊຳລະຄ່າສິນຄ້າໃຫ້ຜູ້ສະໜອງ A ສຳລັບໂຄງການພັດທະນາ",
        amounts: [
          { currency: "LAK", amount: 1000000 },
          { currency: "THB", amount: 0 },
          { currency: "USD", amount: 0 },
          { currency: "CNY", amount: 0 }
        ],
        note: "ຈ່າຍຜ່ານທະນາຄານ"
      },
      {
        date: "2025-10-02",
        serial: "INV002",
        description: "ຄ່າບໍລິການຂົນສົ່ງສິນຄ້າ",
        amounts: [
          { currency: "LAK", amount: 500000 },
          { currency: "THB", amount: 2000 },
          { currency: "USD", amount: 0 },
          { currency: "CNY", amount: 0 }
        ],
        note: ""
      }
    ];
  </script>
</body>
</html>`);

    toast({
      title: "ກຳລັງສ້າງ PDF",
      description: "ກະລຸນາລໍຖ້າສັກຄູ່...",
      status: "info",
      duration: 2000,
      isClosable: true,
      position: "top-right",
    });
  };
  const renderFormFields = (data, index) => {
    const updateField = (field, value) => {
      setFormData({ ...data, [field]: value });
    };

    return (
      <VStack spacing={5} align="stretch">
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <FormControl>
            <FormLabel
              fontFamily={"Noto Sans Lao, sans-serif"}
              color={labelClr}
              fontSize="sm"
              fontWeight="600"
            >
              ເລກທີ່
            </FormLabel>
            <Input
              value={data.serial}
              onChange={(e) => updateField("serial", e.target.value)}
              placeholder="ເຊັ່ນ INV-001"
              size="md"
              rounded="lg"
            />
          </FormControl>

          <FormControl>
            <FormLabel
              fontFamily={"Noto Sans Lao, sans-serif"}
              color={labelClr}
              fontSize="sm"
              fontWeight="600"
            >
              ປະເພດ
            </FormLabel>
            <Select
              value={data.type}
              onChange={(e) => updateField("type", e.target.value)}
              size="md"
              rounded="lg"
            >
              <option value="income">ລາຍຮັບ</option>
              <option value="expense">ລາຍຈ່າຍ</option>
            </Select>
          </FormControl>

          <FormControl>
            <FormLabel
              fontFamily={"Noto Sans Lao, sans-serif"}
              color={labelClr}
              fontSize="sm"
              fontWeight="600"
            >
              ວິທີຊຳລະ
            </FormLabel>
            <Select
              fontFamily={"Noto Sans Lao, sans-serif"}
              value={data.paymentMethod}
              onChange={(e) => updateField("paymentMethod", e.target.value)}
              size="md"
              rounded="lg"
            >
              {Object.entries(paymentMethodLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </FormControl>
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <FormControl isRequired>
            <FormLabel
              fontFamily={"Noto Sans Lao, sans-serif"}
              color={labelClr}
              fontSize="sm"
              fontWeight="600"
            >
              ລາຍລະອຽດ
            </FormLabel>
            <Input
              fontFamily={"Noto Sans Lao, sans-serif"}
              value={data.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="ເຊັ່ນ ຂາຍສິນຄ້າ, ຄ່າເຊົ່າ"
              size="md"
              rounded="lg"
            />
          </FormControl>
          <FormControl isRequired>
            <FormLabel
              fontFamily={"Noto Sans Lao, sans-serif"}
              color={labelClr}
              fontSize="sm"
              fontWeight="600"
            >
              ວັນທີ່
            </FormLabel>
            <Input
              fontFamily={"Noto Sans Lao, sans-serif"}
              type="date"
              value={data.date}
              onChange={(e) => updateField("date", e.target.value)}
              size="md"
              rounded="lg"
            />
          </FormControl>
        </SimpleGrid>

        <FormControl>
          <FormLabel
            fontFamily={"Noto Sans Lao, sans-serif"}
            color={labelClr}
            fontSize="sm"
            fontWeight="600"
          >
            ສະຖານະ
          </FormLabel>
          <Select
            value={data.status}
            onChange={(e) => updateField("status", e.target.value)}
            size="md"
            rounded="lg"
            fontFamily={"Noto Sans Lao, sans-serif"}
          >
            <option value="paid">ຊຳລະແລ້ວ</option>
            <option value="unpaid">ຍັງບໍ່ຊຳລະ</option>
          </Select>
        </FormControl>

        <Divider />

        <Box>
          <Flex justify="space-between" align="center" mb={3}>
            <FormLabel
              fontFamily={"Noto Sans Lao, sans-serif"}
              color={labelClr}
              fontSize="sm"
              fontWeight="600"
              mb={0}
            >
              ຈຳນວນເງິນ
            </FormLabel>
            <Button
              size="sm"
              fontFamily={"Noto Sans Lao, sans-serif"}
              onClick={() => addCurrency(index)}
              colorScheme="teal"
              rounded="full"
              leftIcon={<AddIcon boxSize={3} />}
            >
              ເພີ່ມສະກຸນ
            </Button>
          </Flex>
          <VStack spacing={3}>
            {data.amounts.map((amt, currencyIndex) => (
              <HStack key={currencyIndex} spacing={2} w="full">
                <Select
                  fontFamily={"Noto Sans Lao, sans-serif"}
                  value={amt.currency}
                  onChange={(e) =>
                    updateCurrency(
                      currencyIndex,
                      "currency",
                      e.target.value,
                      index
                    )
                  }
                  w="120px"
                  size="md"
                  rounded="lg"
                >
                  <option value="LAK">LAK (₭)</option>
                  <option value="THB">THB (฿)</option>
                  <option value="USD">USD ($)</option>
                  <option value="CNY">CNY (¥)</option>
                </Select>
                <Input
                  fontFamily={"Noto Sans Lao, sans-serif"}
                  type="number"
                  step="0.01"
                  value={amt.amount}
                  onChange={(e) =>
                    updateCurrency(
                      currencyIndex,
                      "amount",
                      e.target.value,
                      index
                    )
                  }
                  placeholder="ຈຳນວນ"
                  isRequired
                  size="md"
                  rounded="lg"
                />
                {data.amounts.length > 1 && (
                  <IconButton
                    icon={<CloseIcon />}
                    colorScheme="red"
                    variant="ghost"
                    rounded="full"
                    size="sm"
                    onClick={() => removeCurrency(currencyIndex, index)}
                  />
                )}
              </HStack>
            ))}
          </VStack>
        </Box>

        <FormControl>
          <FormLabel
            fontFamily={"Noto Sans Lao, sans-serif"}
            color={labelClr}
            fontSize="sm"
            fontWeight="600"
          >
            ໝາຍເຫດ
          </FormLabel>
          <Textarea
            fontFamily={"Noto Sans Lao, sans-serif"}
            value={data.note}
            onChange={(e) => updateField("note", e.target.value)}
            placeholder="ໝາຍເຫດເພີ່ມເຕີມ (ຖ້າມີ)"
            rows={3}
            size="md"
            rounded="lg"
          />
        </FormControl>
        <FormControl>
          <FormLabel
            fontFamily={"Noto Sans Lao, sans-serif"}
            color={labelClr}
            fontSize="sm"
          >
            ສະຖານະ
          </FormLabel>
          <Input
            fontFamily={"Noto Sans Lao, sans-serif"}
            type="text"
            isDisabled
            value={data?.status_Ap}
            onChange={(e) => updateField("status_Ap", e.target.value)}
            placeholder=""
            isRequired
            size="md"
            rounded="lg"
          />
        </FormControl>
      </VStack>
    );
  };
  // form edit
  const renderFormFieldsEdit = (data, index) => {
    const updateField = (field, value) => {
      setFormEditData({ ...data, [field]: value });
    };

    return (
      <VStack spacing={5} align="stretch">
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <FormControl>
            <FormLabel
              fontFamily={"Noto Sans Lao, sans-serif"}
              color={labelClr}
              fontSize="sm"
              fontWeight="600"
            >
              ເລກທີ່
            </FormLabel>
            <Input
              value={data.serial}
              onChange={(e) => updateField("serial", e.target.value)}
              placeholder="ເຊັ່ນ INV-001"
              size="md"
              rounded="lg"
            />
          </FormControl>

          <FormControl>
            <FormLabel
              fontFamily={"Noto Sans Lao, sans-serif"}
              color={labelClr}
              fontSize="sm"
              fontWeight="600"
            >
              ປະເພດ
            </FormLabel>
            <Select
              value={data.type}
              onChange={(e) => updateField("type", e.target.value)}
              size="md"
              rounded="lg"
            >
              <option value="income">ລາຍຮັບ</option>
              <option value="expense">ລາຍຈ່າຍ</option>
            </Select>
          </FormControl>

          <FormControl>
            <FormLabel
              fontFamily={"Noto Sans Lao, sans-serif"}
              color={labelClr}
              fontSize="sm"
              fontWeight="600"
            >
              ວິທີຊຳລະ
            </FormLabel>
            <Select
              fontFamily={"Noto Sans Lao, sans-serif"}
              value={data.paymentMethod}
              onChange={(e) => updateField("paymentMethod", e.target.value)}
              size="md"
              rounded="lg"
            >
              {Object.entries(paymentMethodLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </FormControl>
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <FormControl isRequired>
            <FormLabel
              fontFamily={"Noto Sans Lao, sans-serif"}
              color={labelClr}
              fontSize="sm"
              fontWeight="600"
            >
              ລາຍລະອຽດ
            </FormLabel>
            <Input
              fontFamily={"Noto Sans Lao, sans-serif"}
              value={data.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="ເຊັ່ນ ຂາຍສິນຄ້າ, ຄ່າເຊົ່າ"
              size="md"
              rounded="lg"
            />
          </FormControl>
          <FormControl isRequired>
            <FormLabel
              fontFamily={"Noto Sans Lao, sans-serif"}
              color={labelClr}
              fontSize="sm"
              fontWeight="600"
            >
              ວັນທີ່
            </FormLabel>
            <Input
              fontFamily={"Noto Sans Lao, sans-serif"}
              type="date"
              value={data.date}
              onChange={(e) => updateField("date", e.target.value)}
              size="md"
              rounded="lg"
            />
          </FormControl>
        </SimpleGrid>

        <FormControl>
          <FormLabel
            fontFamily={"Noto Sans Lao, sans-serif"}
            color={labelClr}
            fontSize="sm"
            fontWeight="600"
          >
            ສະຖານະ
          </FormLabel>
          <Select
            value={data.status}
            onChange={(e) => updateField("status", e.target.value)}
            size="md"
            rounded="lg"
            fontFamily={"Noto Sans Lao, sans-serif"}
          >
            <option value="paid">ຊຳລະແລ້ວ</option>
            <option value="unpaid">ຍັງບໍ່ຊຳລະ</option>
          </Select>
        </FormControl>

        <Divider />

        <Box>
          <Flex justify="space-between" align="center" mb={3}>
            <FormLabel
              fontFamily={"Noto Sans Lao, sans-serif"}
              color={labelClr}
              fontSize="sm"
              fontWeight="600"
              mb={0}
            >
              ຈຳນວນເງິນ
            </FormLabel>
            <Button
              size="sm"
              fontFamily={"Noto Sans Lao, sans-serif"}
              onClick={() => addCurrency(index)}
              colorScheme="teal"
              rounded="full"
              leftIcon={<AddIcon boxSize={3} />}
            >
              ເພີ່ມສະກຸນ
            </Button>
          </Flex>
          <VStack spacing={3}>
            {data.amounts.map((amt, currencyIndex) => (
              <HStack key={currencyIndex} spacing={2} w="full">
                <Select
                  fontFamily={"Noto Sans Lao, sans-serif"}
                  value={amt.currency}
                  onChange={(e) =>
                    updateCurrency(
                      currencyIndex,
                      "currency",
                      e.target.value,
                      index
                    )
                  }
                  w="120px"
                  size="md"
                  rounded="lg"
                >
                  <option value="LAK">LAK (₭)</option>
                  <option value="THB">THB (฿)</option>
                  <option value="USD">USD ($)</option>
                  <option value="CNY">CNY (¥)</option>
                </Select>
                <Input
                  fontFamily={"Noto Sans Lao, sans-serif"}
                  type="number"
                  step="0.01"
                  value={amt.amount}
                  onChange={(e) =>
                    updateCurrency(
                      currencyIndex,
                      "amount",
                      e.target.value,
                      index
                    )
                  }
                  placeholder="ຈຳນວນ"
                  isRequired
                  size="md"
                  rounded="lg"
                />
                {data.amounts.length > 1 && (
                  <IconButton
                    icon={<CloseIcon />}
                    colorScheme="red"
                    variant="ghost"
                    rounded="full"
                    size="sm"
                    onClick={() => removeCurrency(currencyIndex, index)}
                  />
                )}
              </HStack>
            ))}
          </VStack>
        </Box>

        <FormControl>
          <FormLabel
            fontFamily={"Noto Sans Lao, sans-serif"}
            color={labelClr}
            fontSize="sm"
            fontWeight="600"
          >
            ໝາຍເຫດ
          </FormLabel>
          <Textarea
            fontFamily={"Noto Sans Lao, sans-serif"}
            value={data.note}
            onChange={(e) => updateField("note", e.target.value)}
            placeholder="ໝາຍເຫດເພີ່ມເຕີມ (ຖ້າມີ)"
            rows={3}
            size="md"
            rounded="lg"
          />
        </FormControl>

        <FormControl>
          <FormLabel
            fontFamily={"Noto Sans Lao, sans-serif"}
            color={labelClr}
            fontSize="sm"
          >
            ສະຖານະ
          </FormLabel>
          <Input
            fontFamily={"Noto Sans Lao, sans-serif"}
            type="text"
            isDisabled
            value={data?.status_Ap}
            onChange={(e) => updateField("status_Ap", e.target.value)}
            placeholder=""
            isRequired
            size="md"
            rounded="lg"
          />
        </FormControl>
      </VStack>
    );
  };
  if (loading) {
    return (
      <Flex h="100vh" align="center" justify="center">
        <VStack spacing={4}>
          <Box
            borderWidth={4}
            borderColor="teal.500"
            borderTopColor="transparent"
            borderRadius="full"
            w={12}
            h={12}
            animation="spin 1s linear infinite"
            css={{
              "@keyframes spin": {
                "0%": { transform: "rotate(0deg)" },
                "100%": { transform: "rotate(360deg)" },
              },
            }}
          />
          <Text fontFamily={"Noto Sans Lao, sans-serif"} color={labelClr}>
            ກຳລັງໂຫຼດ...
          </Text>
        </VStack>
      </Flex>
    );
  }

  return (
    <Box>
      <Container maxW="container.xl">
        {/* Header */}
        <Flex justify="space-between" align="center" mb={8}>
          <HStack spacing={4}>
            <Icon as={DollarSign} boxSize={8} color="teal.500" />
            <Heading
              fontFamily={"Noto Sans Lao, sans-serif"}
              size="xl"
              bgGradient="linear(to-r, teal.400, blue.500)"
              bgClip="text"
            >
              ລາຍຮັບ-ລາຍຈ່າຍ
            </Heading>
          </HStack>
          <HStack spacing={3}>
            <Button
              fontFamily={"Noto Sans Lao, sans-serif"}
              colorScheme="teal"
              leftIcon={<AddIcon />}
              onClick={onOpen}
              rounded="xl"
              shadow="md"
              _hover={{ shadow: "lg", transform: "translateY(-2px)" }}
              transition="all 0.2s"
            >
              ເພີ່ມລາຍການ
            </Button>
          </HStack>
        </Flex>

        {/* Statistics Cards */}
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={6}>
          {Object.entries(stats).map(([currency, data], idx) => {
            const symbolMap = {
              LAK: "₭",
              USD: "$",
              THB: "฿",
              CNY: "¥",
              EUR: "€",
            };
            const symbol = symbolMap[currency] || currency;
            const colorBalance = data.balance >= 0 ? "blue.500" : "orange.500";

            return (
              <Card
                key={idx}
                bg="white"
                rounded="lg"
                shadow="sm"
                border="1px solid"
                borderColor="gray.200"
                fontFamily="Noto Sans Lao, sans-serif"
                transition="all 0.2s"
                _hover={{ shadow: "md" }}
              >
                <CardBody>
                  <Text
                    fontFamily="Noto Sans Lao, sans-serif"
                    fontWeight="bold"
                    fontSize="md"
                    mb={2}
                  >
                    {currency}
                  </Text>
                  <Flex justify="space-between" mb={1}>
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      color="green.500"
                    >
                      ລາຍຮັບ
                    </Text>
                    <Text fontFamily="Noto Sans Lao, sans-serif">
                      {symbol}
                      {data.income.toLocaleString()}
                    </Text>
                  </Flex>
                  <Flex justify="space-between" mb={1}>
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      color="red.500"
                    >
                      ລາຍຈ່າຍ
                    </Text>
                    <Text fontFamily="Noto Sans Lao, sans-serif">
                      {symbol}
                      {data.expense.toLocaleString()}
                    </Text>
                  </Flex>
                  <Flex justify="space-between">
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      color={colorBalance}
                      fontWeight="semibold"
                    >
                      ຄົງເຫຼືອ
                    </Text>
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      color={colorBalance}
                      fontWeight="semibold"
                    >
                      {symbol}
                      {data.balance.toLocaleString()}
                    </Text>
                  </Flex>
                </CardBody>
              </Card>
            );
          })}
        </SimpleGrid>

        {/* Search and Filter */}
        <Card
          bg={cardBg}
          rounded="2xl"
          shadow="md"
          border="1px"
          borderColor={borderClr}
          mb={6}
        >
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Flex justify="space-between" align="center">
                <HStack>
                  <Icon as={SearchIcon} color="teal.500" />
                  <Text
                    fontFamily={"Noto Sans Lao, sans-serif"}
                    fontWeight="600"
                    color={labelClr}
                  >
                    ຄົ້ນຫາ ແລະ ກັ່ນຕອງ
                  </Text>
                </HStack>
                <Button
                  size="sm"
                  fontFamily={"Noto Sans Lao, sans-serif"}
                  variant="ghost"
                  onClick={() => setShowFilters(!showFilters)}
                  rightIcon={
                    <ChevronDownIcon
                      transform={showFilters ? "rotate(180deg)" : ""}
                      transition="0.2s"
                    />
                  }
                >
                  {showFilters ? "ເຊື່ອງ" : "ສະແດງ"}ຕົວກັ່ນຕອງ
                </Button>
              </Flex>

              <InputGroup size="lg">
                <InputLeftElement>
                  <Icon as={SearchIcon} color="gray.400" />
                </InputLeftElement>
                <Input
                  fontFamily={"Noto Sans Lao, sans-serif"}
                  placeholder="ຄົ້ນຫາລາຍລະອຽດ ຫຼື ໝາຍເຫດ..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                  rounded="xl"
                  bg={hoverBg}
                />
              </InputGroup>

              <Collapse in={showFilters}>
                <VStack spacing={4} pt={4}>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="full">
                    <FormControl>
                      <FormLabel
                        fontFamily={"Noto Sans Lao, sans-serif"}
                        color={labelClr}
                        fontSize="sm"
                      >
                        ວັນທີ່ເລີ່ມຕົ້ນ
                      </FormLabel>
                      <Input
                        type="date"
                        value={filters.dateStart}
                        onChange={(e) =>
                          setFilters({ ...filters, dateStart: e.target.value })
                        }
                        rounded="lg"
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel
                        fontFamily={"Noto Sans Lao, sans-serif"}
                        color={labelClr}
                        fontSize="sm"
                      >
                        ວັນທີ່ສິ້ນສຸດ
                      </FormLabel>
                      <Input
                        fontFamily={"Noto Sans Lao, sans-serif"}
                        type="date"
                        value={filters.dateEnd}
                        onChange={(e) =>
                          setFilters({ ...filters, dateEnd: e.target.value })
                        }
                        rounded="lg"
                      />
                    </FormControl>
                  </SimpleGrid>

                  <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} w="full">
                    <FormControl>
                      <FormLabel
                        fontFamily={"Noto Sans Lao, sans-serif"}
                        color={labelClr}
                        fontSize="sm"
                      >
                        ປະເພດ
                      </FormLabel>
                      <Select
                        fontFamily={"Noto Sans Lao, sans-serif"}
                        value={filters.type}
                        onChange={(e) =>
                          setFilters({ ...filters, type: e.target.value })
                        }
                        rounded="lg"
                      >
                        <option value="">ທັງໝົດ</option>
                        <option value="income">ລາຍຮັບ</option>
                        <option value="expense">ລາຍຈ່າຍ</option>
                      </Select>
                    </FormControl>
                    <FormControl>
                      <FormLabel
                        fontFamily={"Noto Sans Lao, sans-serif"}
                        color={labelClr}
                        fontSize="sm"
                      >
                        ເລືອກສະຖານະ
                      </FormLabel>
                      <Select
                        fontFamily={"Noto Sans Lao, sans-serif"}
                        value={filters.status_Ap}
                        onChange={(e) =>
                          setFilters({ ...filters, status_Ap: e.target.value })
                        }
                        rounded="lg"
                      >
                        <option value="">ທັງໝົດ</option>
                        <option value="approve">ອະນຸມັດ</option>
                        <option value="cancel">ຍົກເລີກ</option>
                        <option value="pending">ລໍຖ້າ</option>
                      </Select>
                    </FormControl>
                    <FormControl>
                      <FormLabel
                        fontFamily={"Noto Sans Lao, sans-serif"}
                        color={labelClr}
                        fontSize="sm"
                      >
                        ສະກຸນເງິນ
                      </FormLabel>
                      <Select
                        fontFamily={"Noto Sans Lao, sans-serif"}
                        value={filters.currency}
                        onChange={(e) =>
                          setFilters({ ...filters, currency: e.target.value })
                        }
                        rounded="lg"
                      >
                        <option value="">ທັງໝົດ</option>
                        <option value="LAK">LAK</option>
                        <option value="THB">THB</option>
                        <option value="USD">USD</option>
                      </Select>
                    </FormControl>

                    <FormControl>
                      <FormLabel
                        fontFamily={"Noto Sans Lao, sans-serif"}
                        color={labelClr}
                        fontSize="sm"
                      >
                        ວິທີຊຳລະ
                      </FormLabel>
                      <Select
                        fontFamily={"Noto Sans Lao, sans-serif"}
                        value={filters.paymentMethod}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            paymentMethod: e.target.value,
                          })
                        }
                        rounded="lg"
                      >
                        <option value="">ທັງໝົດ</option>
                        {Object.entries(paymentMethodLabels).map(
                          ([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          )
                        )}
                      </Select>
                    </FormControl>

                    <FormControl>
                      <FormLabel
                        fontFamily={"Noto Sans Lao, sans-serif"}
                        color={labelClr}
                        fontSize="sm"
                      >
                        ສະຖານະ
                      </FormLabel>
                      <Select
                        fontFamily={"Noto Sans Lao, sans-serif"}
                        value={filters.status}
                        onChange={(e) =>
                          setFilters({ ...filters, status: e.target.value })
                        }
                        rounded="lg"
                      >
                        <option value="">ທັງໝົດ</option>
                        <option value="paid">ຊຳລະແລ້ວ</option>
                        <option value="unpaid">ຍັງບໍ່ຊຳລະ</option>
                      </Select>
                    </FormControl>
                  </SimpleGrid>

                  <HStack justify="flex-end" w="full">
                    <Button
                      fontFamily={"Noto Sans Lao, sans-serif"}
                      variant="ghost"
                      onClick={() =>
                        setFilters({
                          search: "",
                          dateStart: "",
                          dateEnd: "",
                          type: "",
                          currency: "",
                          paymentMethod: "",
                          status: "",
                        })
                      }
                    >
                      ລ້າງຕົວກັ່ນ
                    </Button>
                  </HStack>
                </VStack>
              </Collapse>
            </VStack>
          </CardBody>
        </Card>

        {/* Export Buttons */}
        <HStack mb={4} spacing={3}>
          <Button
            leftIcon={<DownloadIcon />}
            colorScheme="teal"
            variant="outline"
            onClick={exportToPDF}
            isDisabled={selectedTransactions.length === 0}
            rounded="lg"
          >
            Print ({selectedTransactions.length})
          </Button>

          <Text
            fontFamily={"Noto Sans Lao, sans-serif"}
            fontSize="sm"
            color={labelClr}
          >
            ເລືອກ {selectedTransactions.length} ລາຍການ
          </Text>
        </HStack>

        {/* Transactions Table */}

        <Box>
          <Table variant="simple">
            <Thead bg={tableHeaderBg}>
              <Tr>
                <Th fontFamily={"Noto Sans Lao, sans-serif"}>
                  <Checkbox
                    fontFamily={"Noto Sans Lao, sans-serif"}
                    colorScheme="teal"
                    isChecked={
                      selectedTransactions.length === pageData.length &&
                      pageData.length > 0
                    }
                    onChange={(e) =>
                      setSelectedTransactions(e.target.checked ? pageData : [])
                    }
                  />
                </Th>
                <Th fontFamily={"Noto Sans Lao, sans-serif"} color="white">
                  ລຳດັບ
                </Th>
                <Th fontFamily={"Noto Sans Lao, sans-serif"} color="white">
                  ເລກທີ່
                </Th>
                <Th fontFamily={"Noto Sans Lao, sans-serif"} color="white">
                  ວັນທີ່
                </Th>
                <Th fontFamily={"Noto Sans Lao, sans-serif"} color="white">
                  ປະເພດ
                </Th>
                <Th fontFamily={"Noto Sans Lao, sans-serif"} color="white">
                  ລາຍລະອຽດ
                </Th>
                <Th fontFamily={"Noto Sans Lao, sans-serif"} color="white">
                  ວິທີຊຳລະ
                </Th>
                <Th fontFamily={"Noto Sans Lao, sans-serif"} color="white">
                  ຈຳນວນເງິນ
                </Th>
                <Th fontFamily={"Noto Sans Lao, sans-serif"} color="white">
                  ສະຖານະຊຳລະ
                </Th>
                <Th fontFamily={"Noto Sans Lao, sans-serif"} color="white">
                  ຜູ້ສ້າງ
                </Th>
                <Th fontFamily={"Noto Sans Lao, sans-serif"} color="white">
                  ສະຖານະ
                </Th>
                <Th fontFamily={"Noto Sans Lao, sans-serif"} color="white">
                  ການກະທຳ
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {pageData.length === 0 ? (
                <Tr>
                  <Td colSpan={9} textAlign="center" py={12}>
                    <VStack spacing={3}>
                      <Icon as={FileText} boxSize={12} color="gray.400" />
                      <Text
                        fontFamily={"Noto Sans Lao, sans-serif"}
                        color={labelClr}
                        fontSize="lg"
                      >
                        ບໍ່ມີລາຍການທີ່ຕົງກັບເງື່ອນໄຂການຄົ້ນຫາ
                      </Text>
                    </VStack>
                  </Td>
                </Tr>
              ) : (
                pageData
                  .slice() // สร้างสำเนา array เพื่อไม่แก้ตัวต้นฉบับ
                  .sort((a, b) => new Date(b.date) - new Date(a.date)) // b - a = ใหม่ → เก่า
                  .map((transaction, idx) => (
                    <Tr
                      key={transaction._id}
                      _hover={{ bg: hoverBg }}
                      transition="all 0.2s"
                    >
                      <Td>
                        <Checkbox
                          colorScheme="teal"
                          isChecked={selectedTransactions.includes(transaction)}
                          onChange={(e) =>
                            setSelectedTransactions(
                              e.target.checked
                                ? [...selectedTransactions, transaction]
                                : selectedTransactions.filter(
                                    (t) => t._id !== transaction._id
                                  )
                            )
                          }
                        />
                      </Td>
                      <Td>
                        <Text fontWeight="600" color={labelClr}>
                          {offset + idx + 1 || "-"}
                        </Text>
                      </Td>
                      <Td>
                        <Text fontWeight="600" color={labelClr}>
                          {transaction.serial || "-"}
                        </Text>
                      </Td>
                      <Td>
                        <HStack spacing={2}>
                          <Icon as={Calendar} boxSize={4} color="gray.400" />
                          <Text color={labelClr}>
                            {formatDate(new Date(transaction.date))}
                          </Text>
                        </HStack>
                      </Td>
                      <Td>
                        <Badge
                          px={3}
                          py={1}
                          borderRadius="full"
                          colorScheme={
                            transaction.type === "income" ? "green" : "red"
                          }
                          fontSize="sm"
                          fontWeight="600"
                          fontFamily={"Noto Sans Lao, sans-serif"}
                        >
                          {transaction.type === "income" ? "ລາຍຮັບ" : "ລາຍຈ່າຍ"}
                        </Badge>
                      </Td>
                      <Td>
                        <Tooltip label={transaction.note} placement="top">
                          <Text
                            fontFamily={"Noto Sans Lao, sans-serif"}
                            color={labelClr}
                            fontWeight="500"
                          >
                            {shortDesc(transaction.description) || "-"}
                          </Text>
                        </Tooltip>
                      </Td>
                      <Td>
                        <Badge
                          variant="outline"
                          colorScheme="blue"
                          rounded="md"
                          fontFamily={"Noto Sans Lao, sans-serif"}
                        >
                          {paymentMethodLabels[transaction?.paymentMethod] ||
                            transaction?.paymentMethod}
                        </Badge>
                      </Td>
                      <Td>
                        <VStack spacing={1} align="start">
                          {transaction.amounts.map((amt, i) => (
                            <HStack key={i} spacing={1}>
                              <Text
                                color={
                                  transaction.type === "income"
                                    ? "green.500"
                                    : "red.500"
                                }
                                fontWeight="bold"
                                fontSize="md"
                              >
                                {transaction.type === "income" ? "+" : "-"}
                                {amt.currency === "LAK" && "₭"}
                                {amt.currency === "THB" && "฿"}
                                {amt.currency === "USD" && "$"}
                                {amt.currency === "CNY" && "¥"}
                                {parseFloat(amt.amount).toLocaleString()}
                              </Text>
                            </HStack>
                          ))}
                        </VStack>
                      </Td>
                      <Td>
                        <Badge
                          fontFamily={"Noto Sans Lao, sans-serif"}
                          px={3}
                          py={1}
                          borderRadius="full"
                          colorScheme={
                            transaction.status === "paid" ? "green" : "orange"
                          }
                          variant="subtle"
                        >
                          {transaction.status === "paid"
                            ? "✓ ຊຳລະແລ້ວ"
                            : "⏳ ຍັງບໍ່ຊຳລະ"}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge
                          fontFamily={"Noto Sans Lao, sans-serif"}
                          px={3}
                          py={1}
                          borderRadius="full"
                          colorScheme={
                            transaction.status === "paid" ? "green" : "orange"
                          }
                          variant="subtle"
                        >
                          {transaction?.createdBy?.username}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge
                          rounded="lg"
                          colorScheme={
                            statusColors[transaction?.status_Ap] || "blue"
                          }
                          fontFamily={"Noto Sans Lao, sans-serif"}
                          px={4}
                          py={2}
                          fontWeight="bold"
                          fontSize={"22px"}
                          textTransform="capitalize"
                          variant="solid" // ใช้แบบทึบจะเด่นกว่า outline
                          boxShadow="0px 2px 10px rgba(0,0,0,0.25)" // เพิ่มเงาให้ลอยขึ้น
                          border="1px solid rgba(255,255,255,0.6)" // ขอบจาง ๆ ให้ดูมีชั้น
                          letterSpacing="0.5px"
                        >
                          {status_Ap[transaction?.status_Ap] || "ບໍ່ມີຂໍ້ມູນ"}
                        </Badge>
                      </Td>

                      <Td>
                        <HStack spacing={1}>
                          {user?.role === "admin" &&
                            transaction.type !== "income" && (
                              <HStack spacing={2}>
                                <Button
                                  fontSize={"20"}
                                  size="sm"
                                  rounded="lg"
                                  fontFamily="Noto Sans Lao, sans-serif"
                                  colorScheme={
                                    transaction.status_Ap === "pending"
                                      ? "yellow"
                                      : "gray"
                                  }
                                  variant={
                                    transaction.status_Ap === "pending"
                                      ? "solid"
                                      : "outline"
                                  }
                                  onClick={() =>
                                    handleStatus(transaction, "pending")
                                  }
                                >
                                  ລໍຖ້າ
                                </Button>

                                <Button
                                  fontSize={"20"}
                                  size="sm"
                                  rounded="lg"
                                  fontFamily="Noto Sans Lao, sans-serif"
                                  colorScheme={
                                    transaction.status_Ap === "approve"
                                      ? "green"
                                      : "gray"
                                  }
                                  variant={
                                    transaction.status_Ap === "approve"
                                      ? "solid"
                                      : "outline"
                                  }
                                  onClick={() =>
                                    handleStatus(transaction, "approve")
                                  }
                                >
                                  ອະນຸມັດ
                                </Button>

                                <Button
                                  fontSize={"20"}
                                  size="sm"
                                  rounded="lg"
                                  fontFamily="Noto Sans Lao, sans-serif"
                                  colorScheme={
                                    transaction.status_Ap === "cancel"
                                      ? "red"
                                      : "gray"
                                  }
                                  variant={
                                    transaction.status_Ap === "cancel"
                                      ? "solid"
                                      : "outline"
                                  }
                                  onClick={() =>
                                    handleStatus(transaction, "cancel")
                                  }
                                >
                                  ຍົກເລີກ
                                </Button>
                              </HStack>
                            )}

                          <Tooltip label="ແກ້ໄຂ" placement="top">
                            <IconButton
                              icon={<EditIcon />}
                              size="sm"
                              variant="ghost"
                              colorScheme="blue"
                              rounded="lg"
                              isDisabled={
                                !(user.role === "admin") &&
                                (transaction?.status_Ap === "approve" ||
                                  transaction?.status_Ap === "cancel")
                              }
                              onClick={() => {
                                setFormEditData({
                                  serial: transaction.serial || "",
                                  type: transaction.type,
                                  description: transaction.description,
                                  date: transaction.date.slice(0, 10),
                                  paymentMethod: transaction.paymentMethod,
                                  status: transaction.status,
                                  status_Ap: transaction.status_Ap,
                                  amounts: transaction.amounts.map((amt) => ({
                                    currency: amt.currency,
                                    amount: amt.amount,
                                  })),
                                  note: transaction.note || "",
                                  id: transaction._id,
                                });
                                onEditOpen();
                              }}
                            />
                          </Tooltip>
                          <Tooltip label="ເບີງລາຍລະອຽດ" placement="top">
                            <IconButton
                              onClick={() => handleViews(transaction)}
                              icon={<ViewIcon />}
                              size="sm"
                              variant="ghost"
                              colorScheme="red"
                              rounded="lg"
                            />
                          </Tooltip>

                          <Tooltip label="ລຶບ" placement="top">
                            <IconButton
                              onClick={() => handleDelete(transaction._id)}
                              icon={<DeleteIcon />}
                              size="sm"
                              variant="ghost"
                              colorScheme="red"
                              rounded="lg"
                              isDisabled={
                                !(user.role === "admin") &&
                                (transaction?.status_Ap === "approve" ||
                                  transaction?.status_Ap === "cancel")
                              }
                            />
                          </Tooltip>
                        </HStack>
                      </Td>
                    </Tr>
                  ))
              )}
            </Tbody>
          </Table>
        </Box>
        {/* </Card> */}

        {/* Add/Edit Modal */}
        <Modal
          isOpen={isOpen}
          onClose={onClose}
          size="4xl"
          isCentered
          motionPreset="slideInBottom"
        >
          <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(10px)" />
          <ModalContent
            bg={cardBg}
            rounded="2xl"
            shadow="2xl"
            border="1px solid"
            borderColor={borderClr}
          >
            <ModalHeader borderBottom="1px" borderColor={borderClr}>
              <HStack spacing={3}>
                <Icon as={DollarSign} boxSize={6} color="teal.500" />
                <Heading
                  fontFamily={"Noto Sans Lao, sans-serif"}
                  size="md"
                  bgGradient="linear(to-r, teal.400, blue.500)"
                  bgClip="text"
                >
                  ເພີ່ມລາຍຮັບ / ລາຍຈ່າຍ
                </Heading>
              </HStack>
            </ModalHeader>
            <ModalCloseButton rounded="full" top={4} right={4} />

            <ModalBody fontFamily={"Noto Sans Lao, sans-serif"} py={6}>
              {renderFormFields(formData)}
            </ModalBody>

            <ModalFooter borderTop="1px" borderColor={borderClr}>
              <Button
                fontFamily={"Noto Sans Lao, sans-serif"}
                colorScheme="teal"
                mr={3}
                onClick={handleSubmit}
                rounded="xl"
                px={8}
                shadow="md"
                _hover={{ shadow: "lg" }}
              >
                ບັນທຶກ
              </Button>
              <Button
                fontFamily={"Noto Sans Lao, sans-serif"}
                variant="ghost"
                onClose={onClose}
                rounded="xl"
              >
                ຍົກເລີກ
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
        {/* //////edit form */}
        <Modal
          isOpen={isEdit}
          onClose={onEditClose}
          size="4xl"
          isCentered
          motionPreset="slideInBottom"
        >
          <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(10px)" />
          <ModalContent
            bg={cardBg}
            rounded="2xl"
            shadow="2xl"
            border="1px solid"
            borderColor={borderClr}
          >
            <ModalHeader borderBottom="1px" borderColor={borderClr}>
              <HStack spacing={3}>
                <Icon as={DollarSign} boxSize={6} color="teal.500" />
                <Heading
                  fontFamily={"Noto Sans Lao, sans-serif"}
                  size="md"
                  bgGradient="linear(to-r, teal.400, blue.500)"
                  bgClip="text"
                >
                  ເພີ່ມລາຍຮັບ / ລາຍຈ່າຍ
                </Heading>
              </HStack>
            </ModalHeader>
            <ModalCloseButton rounded="full" top={4} right={4} />

            <ModalBody fontFamily={"Noto Sans Lao, sans-serif"} py={6}>
              {renderFormFieldsEdit(formEditData, formEditData.id)}
            </ModalBody>

            <ModalFooter borderTop="1px" borderColor={borderClr}>
              <Button
                fontFamily={"Noto Sans Lao, sans-serif"}
                colorScheme="teal"
                mr={3}
                onClick={handleEdit}
                rounded="xl"
                px={8}
                shadow="md"
                _hover={{ shadow: "lg" }}
              >
                ບັນທຶກ
              </Button>
              <Button
                fontFamily={"Noto Sans Lao, sans-serif"}
                variant="ghost"
                onClick={onClose}
                rounded="xl"
              >
                ຍົກເລີກ
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
        {/* ///views */}
        {/* //////edit form */}
        <Modal
          isOpen={isViews}
          onClose={onCloseViews}
          size="4xl"
          isCentered
          motionPreset="slideInBottom"
        >
          <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(10px)" />
          <ModalContent>
            <ModalBody fontFamily={"Noto Sans Lao, sans-serif"} py={6}>
              <VStack spacing={6} align="stretch">
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
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      fontWeight="semibold"
                    >
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
                  <Text
                    fontFamily="Noto Sans Lao, sans-serif"
                    fontWeight="medium"
                  >
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
                    {views?.amounts?.map((amount, index) => (
                      <Box
                        key={index}
                        p={4}
                        bg={useColorModeValue("gray.50", "gray.700")}
                        rounded="lg"
                        border="1px solid"
                        borderColor={borderClr}
                      >
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
                            color={
                              views?.type === "income" ? "green.500" : "red.500"
                            }
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
                        <Text
                          fontFamily="Noto Sans Lao, sans-serif"
                          fontSize="md"
                        >
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
                    ສ້າງເມື່ອ:{" "}
                    {new Date(views?.createdAt).toLocaleString("lo-LA")}
                  </Text>
                </Box>
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>
        {/* Footer info */}

        <Flex
          justify="space-between"
          align="center"
          mt={6}
          pt={6}
          borderTop="1px"
          borderColor={borderClr}
        >
          <Text
            fontFamily={"Noto Sans Lao, sans-serif"}
            fontSize="sm"
            color={labelClr}
          >
            ສະແດງ {pageData.length} ລາຍການຈາກທັງໝົດ {transactions.length} ລາຍການ
          </Text>
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
          <Text
            fontFamily={"Noto Sans Lao, sans-serif"}
            fontSize="sm"
            color={labelClr}
          >
            ອັບເດດລ່າສຸດ: {new Date().toLocaleString("lo-LA")}
          </Text>
        </Flex>
      </Container>
    </Box>
  );
}
