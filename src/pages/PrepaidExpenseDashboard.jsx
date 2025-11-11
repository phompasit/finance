// PrepaidExpenseDashboard.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Container,
  Heading,
  Button,
  Flex,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useDisclosure,
  useToast,
  Tooltip,
  Checkbox,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Divider,
  useColorModeValue,
  VStack,
  HStack,
  Stack,
} from "@chakra-ui/react";
import { AddIcon, ChevronDownIcon, DeleteIcon } from "@chakra-ui/icons";
import {
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Printer,
  Plus,
  ChevronRightIcon,
  ChevronLeftIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const API_BASE = import.meta.env.VITE_API_URL || "";

// Initial form states as constants
const INITIAL_ADD_FORM = {
  type: "employee",
  employee_id: "",
  company: "",
  requester: "",
  account: "",
  description: "",
  amounts: [{ currency: "LAK", amount: "" }],
  date_from: "",
  date_to: "",
  serial: "",
  paymentMethods: "",
  date: new Date().toISOString().split("T")[0],
  note: "",
  status_payment: "",
  status_Ap: "",
};

const INITIAL_TRANS_FORM = {
  type: "spend",
  amount: "",
  note: "",
  currency: "",
};

// Status configuration
const STATUS_CONFIG = {
  closed: { colorScheme: "green", label: "ປິດລາຍການແລ້ວ" },
  open: { colorScheme: "orange", label: "ລໍດໍາເນີນການ" },
  pending: { colorScheme: "yellow", label: "ລໍດໍາເນີນການ" },
};

const TYPE_CONFIG = {
  employee: { colorScheme: "blue", label: "ພະນັກງານ" },
  vendor: { colorScheme: "green", label: "ຜູ້ຂາຍ" },
};

export default function PrepaidExpenseDashboard() {
  const toast = useToast();
  const { user } = useAuth();
  const textColor = useColorModeValue("gray.700", "gray.200");
  // State management
  const [advances, setAdvances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [currencies, setCurrencies] = useState(["LAK", "THB", "USD", "CNY"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    dateFrom: "",
    dateTo: "",
  });
  const [selectedEmployee, setSelectedEmployee] = useState();
  // Modal states
  const {
    isOpen: isAddOpen,
    onOpen: onAddOpen,
    onClose: onAddClose,
  } = useDisclosure();
  const {
    isOpen: isEditOpen,
    onOpen: onEditOpen,
    onClose: onEditClose,
  } = useDisclosure();
  const {
    isOpen: isTransOpen,
    onOpen: onTransOpen,
    onClose: onTransClose,
  } = useDisclosure();
  const {
    isOpen: isDetailOpen,
    onOpen: onDetailOpen,
    onClose: onDetailClose,
  } = useDisclosure();

  // Form states
  const [editing, setEditing] = useState(null);
  const [transTarget, setTransTarget] = useState(null);
  const [addForm, setAddForm] = useState(INITIAL_ADD_FORM);
  const [editForm, setEditForm] = useState({});
  const [transForm, setTransForm] = useState(INITIAL_TRANS_FORM);
  const [detail, setDetail] = useState();
  // Computed values with useMemo

  // Filtered advances with useMemo
  const filteredAdvances = advances?.filter((a) => {
    // 🔍 กรองตามคำค้นหา
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const searchFields = [
        a.purpose,
        a.meta?.company,
        a.employee_id?.full_name,
        a.requester,
        a.serial,
      ].filter(Boolean);

      if (
        !searchFields.some((field) => field.toLowerCase().includes(searchLower))
      ) {
        return false;
      }
    }

    // 📅 กรองตามวันที่ (request_date)
    if (filters.dateFrom || filters.dateTo) {
      // 🕒 Normalize: แปลงทุกวันที่เป็น YYYY-MM-DD เพื่อไม่ให้ timezone มีผล
      const requestDate = new Date(a.request_date).toISOString().split("T")[0];
      const from = filters.dateFrom
        ? new Date(filters.dateFrom).toISOString().split("T")[0]
        : null;
      const to = filters.dateTo
        ? new Date(filters.dateTo).toISOString().split("T")[0]
        : null;

      if (from && requestDate < from) return false;
      if (to && requestDate > to) return false;
    }

    // 🟢 กรองตามสถานะ
    if (filters.status && a.status !== filters.status) {
      return false;
    }

    return true;
  });

  const pageSize = 100;
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(filteredAdvances.length / pageSize);
  const offset = (page - 1) * pageSize;
  const pageData = useMemo(() => {
    const s = (page - 1) * pageSize;
    return filteredAdvances.slice(s, s + pageSize);
  }, [filteredAdvances, page]);
  // 🔹 สรุปยอดรวมทุกสกุลเงิน
  const summary = useMemo(() => {
    if (!Array.isArray(filteredAdvances)) return [];

    const summaryByCurrency = {};

    filteredAdvances.forEach((adv) => {
      // รวมยอดเบิก
      adv.amount_requested?.forEach((req) => {
        const { currency, amount } = req;
        if (!summaryByCurrency[currency]) {
          summaryByCurrency[currency] = {
            totalRequested: 0,
            totalSpent: 0,
            totalReturnCompany: 0,
            totalRefundEmployee: 0,
          };
        }
        summaryByCurrency[currency].totalRequested += amount || 0;
      });

      // รวมยอด summary (ใช้, คืนบริษัท, คืนพนักงาน)
      if (adv.summary) {
        Object.entries(adv.summary).forEach(([currency, sum]) => {
          if (!summaryByCurrency[currency]) {
            summaryByCurrency[currency] = {
              totalRequested: 0,
              totalSpent: 0,
              totalReturnCompany: 0,
              totalRefundEmployee: 0,
            };
          }

          summaryByCurrency[currency].totalSpent += sum.total_spent || 0;
          summaryByCurrency[currency].totalReturnCompany +=
            sum.total_return_to_company || 0;
          summaryByCurrency[currency].totalRefundEmployee +=
            sum.total_refund_to_employee || 0;
        });
      }
    });

    // สร้าง array สำหรับแสดงผล
    return Object.entries(summaryByCurrency).map(([currency, totals]) => {
      const totalNet =
        totals.totalSpent -
        totals.totalReturnCompany -
        totals.totalRefundEmployee;

      return {
        currency,
        ...totals,
        totalNet,
      };
    });
  }, [filteredAdvances]);

  // Auth headers helper
  const authHeaders = useCallback(() => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }, []);

  // API calls
  const fetchAdvances = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/advances`, {
        headers: authHeaders(),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(
          json.message || `HTTP ${res.status}: Failed to fetch advances`
        );
      }

      setAdvances(json.data || []);
    } catch (err) {
      console.error("Fetch advances error:", err);
      setError(err.message);
      toast({
        title: "ບໍ່ສາມາດດຶງຂໍ້ມູນໄດ້",
        description: err.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [authHeaders, toast]);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/debt/employees`, {
        headers: authHeaders(),
      });
      const result = await res.json();

      if (result.success) {
        setEmployees(result.data || []);
      }
    } catch (err) {
      console.error("Fetch employees error:", err);
      toast({
        title: "ບໍ່ສາມາດດຶງຂໍ້ມູນພະນັກງານໄດ້",
        description: err.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  }, [authHeaders, toast]);

  // Initial data fetch
  useEffect(() => {
    fetchAdvances();
    fetchEmployees();
  }, [fetchAdvances, fetchEmployees]);

  // Multi-currency handlers
  const addCurrencyRow = () => {
    setAddForm({
      ...addForm,
      amounts: [...addForm.amounts, { currency: "LAK", amount: "" }],
    });
  };

  const removeCurrencyRow = (index) => {
    if (addForm.amounts.length > 1) {
      const newAmounts = addForm.amounts.filter((_, i) => i !== index);
      setAddForm({ ...addForm, amounts: newAmounts });
    }
  };

  const updateCurrencyRow = (index, field, value) => {
    const newAmounts = [...addForm.amounts];
    newAmounts[index][field] = value;
    setAddForm({ ...addForm, amounts: newAmounts });
  };

  // Edit form multi-currency handlers
  const addEditCurrencyRow = () => {
    setEditForm({
      ...editForm,
      amounts: [...(editForm.amounts || []), { currency: "LAK", amount: "" }],
    });
  };

  const removeEditCurrencyRow = (index) => {
    if (editForm.amounts && editForm.amounts.length > 1) {
      const newAmounts = editForm.amounts.filter((_, i) => i !== index);
      setEditForm({ ...editForm, amounts: newAmounts });
    }
  };

  const updateEditCurrencyRow = (index, field, value) => {
    const newAmounts = [...(editForm.amounts || [])];
    newAmounts[index][field] = value;
    setEditForm({ ...editForm, amounts: newAmounts });
  };

  // Form validation
  const validateAddForm = () => {
    if (!addForm.description.trim()) {
      toast({
        title: "ກະລຸນາກອກລາຍລະອຽດ",
        status: "warning",
        duration: 3000,
      });
      return false;
    }

    const hasValidAmount = addForm.amounts.some(
      (a) => a.amount && parseFloat(a.amount) > 0
    );

    if (!hasValidAmount) {
      toast({
        title: "ກະລຸນາກອກຈໍານວນເງິນທີ່ຖືກຕ້ອງ",
        status: "warning",
        duration: 3000,
      });
      return false;
    }

    if (!addForm.date) {
      toast({
        title: "ກະລຸນາເລືອກວັນທີ່",
        status: "warning",
        duration: 3000,
      });
      return false;
    }
    return true;
  };

  // Create advance
  const createAdvance = async () => {
    if (!validateAddForm()) return;

    try {
      // Filter out empty amounts and format
      const validAmounts = addForm.amounts
        .filter((a) => a.amount && parseFloat(a.amount) > 0)
        .map((a) => ({
          currency: a.currency,
          amount: parseFloat(a.amount),
        }));

      const payload = {
        type: addForm.type,
        employee_id: addForm.employee_id || null,
        purpose: addForm.description,
        amounts: validAmounts,
        request_date: addForm.date,
        serial: addForm.serial,
        status_payment: addForm.status_payment,
        meta: {
          company: addForm.company,
          account: addForm.account,
          date_from: addForm.date_from,
          date_to: addForm.date_to,
          requester: addForm.requester,
          note: addForm.note,
        },
      };

      const res = await fetch(`${API_BASE}/api/advances`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "ບໍ່ສາມາດບັນທຶກຂໍ້ມູນໄດ້");
      }

      toast({
        title: "ບັນທຶກສໍາເລັດ",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      onAddClose();
      setAddForm(INITIAL_ADD_FORM);
      await fetchAdvances();
    } catch (err) {
      console.error("Create advance error:", err);
      toast({
        title: "ບັນທຶກບໍ່ສໍາເລັດ",
        description: err.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Update advance
  const updateAdvance = async (id, data) => {
    try {
      const validAmounts = (data.amounts || [])
        .filter((a) => a.amount && parseFloat(a.amount) > 0)
        .map((a) => ({
          currency: a.currency,
          amount: parseFloat(a.amount),
        }));

      const payload = {
        amounts: validAmounts,
        request_date: data.request_date,
        purpose: data.purpose,
        serial: data.serial,
        status_payment: data.status_payment,
        employee_id: data.employee_id,
      };

      const res = await fetch(`${API_BASE}/api/advances/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "ບໍ່ສາມາດແກ້ໄຂຂໍ້ມູນໄດ້");
      }

      toast({
        title: "ແກ້ໄຂສໍາເລັດ",
        status: "success",
        duration: 3000,
      });

      onEditClose();
      await fetchAdvances();
      setSelected([]);
    } catch (err) {
      console.error("Update advance error:", err);
      toast({
        title: "ແກ້ໄຂບໍ່ສໍາເລັດ",
        description: err.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Delete advance
  const deleteAdvance = async (id) => {
    if (!window.confirm("ແນ່ໃຈວ່າຈະລົບລາຍການນີ້ຫຼືບໍ່?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/advances/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "ບໍ່ສາມາດລົບຂໍ້ມູນໄດ້");
      }

      toast({
        title: "ລົບສໍາເລັດ",
        status: "success",
        duration: 3000,
      });

      setSelected((prev) => prev.filter((selId) => selId !== id));
      await fetchAdvances();
    } catch (err) {
      console.error("Delete advance error:", err);
      toast({
        title: "ລົບບໍ່ສໍາເລັດ",
        description: err.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Add transaction
  const addTransaction = async (
    advanceId,
    { type, amount, note, currency }
  ) => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "ກະລຸນາກອກຈໍານວນເງິນທີ່ຖືກຕ້ອງ",
        status: "warning",
        duration: 3000,
      });
      return;
    }

    try {
      const payload = {
        type,
        amount: parseFloat(amount),
        note: note || "",
        currency,
      };

      const res = await fetch(
        `${API_BASE}/api/advances/${advanceId}/transaction`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(payload),
        }
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "ບໍ່ສາມາດເພີ່ມລາຍການໄດ້");
      }

      toast({
        title: "ເພີ່ມລາຍການສໍາເລັດ",
        status: "success",
        duration: 3000,
      });

      setTransForm(INITIAL_TRANS_FORM);
      onTransClose();
      await fetchAdvances();
      setSelected([]);
    } catch (err) {
      console.error("Add transaction error:", err);
      toast({
        title: "ບໍ່ສາມາດເພີ່ມລາຍການໄດ້",
        description: err.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Close advance
  const closeAdvance = async (advanceId) => {
    try {
      const res = await fetch(`${API_BASE}/api/advances/${advanceId}/close`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ remarks: "" }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "ບໍ່ສາມາດປິດລາຍການໄດ້");
      }

      toast({
        title: "ປິດລາຍການສໍາເລັດ",
        status: "success",
        duration: 3000,
      });

      await fetchAdvances();
    } catch (err) {
      console.error("Close advance error:", err);
      toast({
        title: "ປິດລາຍການບໍ່ສໍາເລັດ",
        description: err.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Reopen advance
  const reopenAdvance = async (advanceId) => {
    try {
      const res = await fetch(`${API_BASE}/api/advances/${advanceId}/reopen`, {
        method: "POST",
        headers: authHeaders(),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "ບໍ່ສາມາດເປີດລາຍການໄດ້");
      }

      toast({
        title: "ເປີດລາຍການສໍາເລັດ",
        status: "success",
        duration: 3000,
      });

      await fetchAdvances();
    } catch (err) {
      console.error("Reopen advance error:", err);
      toast({
        title: "ເປີດລາຍການບໍ່ສໍາເລັດ",
        description: err.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Selection handlers

  // เช็คว่าถูกเลือกหมดไหม
  const allChecked = selected.length === filteredAdvances.length;
  const isIndeterminate = selected.length > 0 && !allChecked;
  // ✅ เลือก/ยกเลิกรายการเดียว
  const handleToggle = (item) => {
    const exists = selected.find((i) => i.id === item.id);
    if (exists) {
      setSelected(selected.filter((i) => i.id !== item.id));
    } else {
      setSelected([...selected, item]);
    }
  };
  const handleSelectAll = useCallback(
    (e) => {
      if (e.target.checked) {
        setSelected(filteredAdvances);
      } else {
        setSelected([]);
      }
    },
    [filteredAdvances]
  );

  const resetFilters = useCallback(() => {
    setFilters({ search: "", status: "", type: "" });
  }, []);

  const handleEditClose = useCallback(() => {
    setEditing(null);
    setEditForm({});
    onEditClose();
  }, [onEditClose]);

  const handleTransClose = useCallback(() => {
    setTransTarget(null);
    setTransForm(INITIAL_TRANS_FORM);
    onTransClose();
  }, [onTransClose]);
  const shortDesc = (desc) => {
    if (!desc) return "-";
    return desc.length > 7 ? desc.substring(0, 7) + "..." : desc;
  };
  const handleDetail = (data) => {
    onDetailOpen();
    setDetail(data);
  };

  function formatDate(dateString) {
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  const getTransactionTypeText = (type) => {
    const types = {
      refund_to_employee: "ຄືນເງິນໃຫ້ພະນັກງານ",
      return_to_company: "ຄືນເງິນໃຫ້ບໍລິສັດ",
      spend: "ໃຊ້ຈ່າຍຈິງ",
      additional_request: "ຂໍເພີ່ມເຕີ່ມ",
    };
    return types[type] || type;
  };
  // Format amounts display
  const formatAmounts = (amounts) => {
    if (!amounts || amounts.length === 0) return "—";
    return amounts
      .map((a) => `${a.amount?.toLocaleString()} ${a.currency}`)
      .join(" + ");
  };
  const order = [
    "spend",
    "return_to_company",
    "refund_to_employee",
    "additional_request",
  ];
  ///////
  const TransForm_filter_transation = transTarget?.transactions?.filter(
    (i) => i.currency === transForm.currency
  );
  const sortedTransation = TransForm_filter_transation?.sort(
    (a, b) => order.indexOf(a.type) - order.indexOf(b.type)
  );
  const amount_requested = transTarget?.amount_requested?.filter(
    (i) => i.currency === transForm.currency
  );

  const handleDeleteTransaction = async (item, id) => {
    const confirmDelete = window.confirm(
      `ຢືນຢັນລົບລາຍການ "${getTransactionTypeText(item.type)}" ຫຼືບໍ?`
    );
    if (!confirmDelete) return;
    // ถ้าคุณต้องการส่งไป backend ด้วย:
    try {
      const res = await fetch(
        `${API_BASE}/api/advances/transation/${id}/${item._id}`,
        {
          method: "PATCH",
          headers: authHeaders(),
        }
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "ບໍ່ສາມາດເປີດລາຍການໄດ້");
      }

      toast({
        title: "ລົບສຳເລັດ",
        status: "success",
        duration: 3000,
      });

      await fetchAdvances();
      onTransClose();
    } catch (err) {
      console.error("Reopen advance error:", err);
      toast({
        title: "ເປີດລາຍການບໍ່ສໍາເລັດ",
        description: err.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
    // await axios.delete(`/api/transactions/${item._id}`);
  };

  const handleStatus = async (data, status) => {
    try {
      const endpoint = `${
        import.meta.env.VITE_API_URL
      }/api/advances/advance/:${data}`;

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
        fetchAdvances();
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
      console.log(error);
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

    /* === พิมพ์ === */
    @media print {
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
      <div>
        <div class="company-name">${user?.companyInfo?.name || ""}</div>
        <div class="company-address">${user?.companyInfo?.address || ""}</div>
          <div class="company-address">${user?.companyInfo?.phone || ""}</div>
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
    <div class="signature-grid">
      <div class="sig-box">
        <div class="sig-label">CEO & CFO</div>
        <div class="sig-line">(..................................)</div>
      </div>
      <div class="sig-box">
        <div class="sig-label">ຜູ້ຈັດການ</div>
        <div class="sig-line">(..................................)</div>
      </div>
      <div class="sig-box">
        <div class="sig-label">ພະແນກບັນຊີ-ການເງິນສ່ວນກາງ</div>
        <div class="sig-line">(..................................)</div>
      </div>
      <div class="sig-box">
        <div class="sig-label">ຜູ້ສັງລວມ</div>
        <div class="sig-line">(..................................)</div>
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
  };

  return (
    <Container maxW="container.xl" py={6}>
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg" fontFamily="Noto Sans Lao, sans-serif">
          ລາຍຈ່າຍລ່ວງໜ້າ
        </Heading>
        <Flex gap={2}>
          <Button
            leftIcon={<Printer size={16} />}
            variant="outline"
            isDisabled={selected.length === 0}
            fontFamily="Noto Sans Lao, sans-serif"
            onClick={exportToPDF}
          >
            ພິມ ({selected.length})
          </Button>
          <Button
            leftIcon={<AddIcon />}
            colorScheme="blue"
            onClick={onAddOpen}
            fontFamily="Noto Sans Lao, sans-serif"
          >
            ເພີ່ມລາຍການ
          </Button>
        </Flex>
      </Flex>

      {/* Error Alert */}
      {error && (
        <Alert status="error" mb={4} borderRadius="md">
          <AlertIcon />
          <Box flex="1">
            <AlertTitle fontFamily="Noto Sans Lao, sans-serif">
              ເກີດຂໍ້ຜິດພາດ
            </AlertTitle>
            <AlertDescription fontFamily="Noto Sans Lao, sans-serif">
              {error}
            </AlertDescription>
          </Box>
        </Alert>
      )}

      {/* Summary Cards */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
        {summary.map((item) => (
          <Box
            key={item.currency}
            p={4}
            borderRadius="lg"
            boxShadow="md"
            transition="all 0.2s"
            _hover={{ transform: "scale(1.02)", boxShadow: "lg" }}
          >
            <Text
              fontSize="lg"
              fontWeight="bold"
              mb={3}
              color="blue.600"
              fontFamily="Noto Sans Lao, sans-serif"
            >
              {item.currency}
            </Text>

            <Flex justify="space-between" wrap="wrap" gap={3}>
              <Stat minW="120px">
                <StatLabel
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontSize="sm"
                  color={textColor}
                >
                  ຍອດເບີກ
                </StatLabel>
                <StatNumber
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontSize="md"
                >
                  {item.totalRequested.toLocaleString()}
                </StatNumber>
              </Stat>

              <Stat minW="120px">
                <StatLabel
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontSize="sm"
                  color={textColor}
                >
                  ໃຊ້ຈິງ
                </StatLabel>
                <StatNumber
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontSize="md"
                  color="purple.600"
                >
                  {item.totalSpent.toLocaleString()}
                </StatNumber>
              </Stat>

              <Stat minW="120px">
                <StatLabel
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontSize="sm"
                  color={textColor}
                >
                  ຄືນບໍລິສັດ
                </StatLabel>
                <StatNumber
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontSize="md"
                  color="green.600"
                >
                  {item.totalReturnCompany.toLocaleString()}
                </StatNumber>
              </Stat>

              <Stat minW="120px">
                <StatLabel
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontSize="sm"
                  color={textColor}
                >
                  ຄືນພະນັກງານ
                </StatLabel>
                <StatNumber
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontSize="md"
                  color="green.600"
                >
                  {item.totalRefundEmployee.toLocaleString()}
                </StatNumber>
              </Stat>
            </Flex>
          </Box>
        ))}
      </SimpleGrid>
      {/* Filters */}
      <Box bg="white" p={4} borderRadius="md" mb={4} boxShadow="sm">
        <SimpleGrid columns={{ base: 1, md: 4 }} spacing={3}>
          {/* 🔍 ช่องค้นหา */}
          <FormControl>
            <Input
              placeholder="ຄົ້ນຫາ (ຊື່/ລາຍລະອຽດ)"
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              fontFamily="Noto Sans Lao, sans-serif"
            />
          </FormControl>

          {/* 📅 วันที่เริ่มต้น */}
          <FormControl>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) =>
                setFilters({ ...filters, dateFrom: e.target.value })
              }
              fontFamily="Noto Sans Lao, sans-serif"
            />
          </FormControl>

          {/* 📅 วันที่สิ้นสุด */}
          <FormControl>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) =>
                setFilters({ ...filters, dateTo: e.target.value })
              }
              fontFamily="Noto Sans Lao, sans-serif"
            />
          </FormControl>

          {/* 🔘 ปุ่ม */}
          <Flex gap={2}>
            <Button
              leftIcon={<RefreshCw size={16} />}
              onClick={fetchAdvances}
              isLoading={loading}
              flex={1}
              fontFamily="Noto Sans Lao, sans-serif"
            >
              ລີເຟຣຊ
            </Button>
            <Button
              variant="ghost"
              onClick={resetFilters}
              fontFamily="Noto Sans Lao, sans-serif"
            >
              ລ້າງ
            </Button>
          </Flex>
        </SimpleGrid>
      </Box>

      {/* Table */}
      <Box bg="white" borderRadius="md" boxShadow="sm" overflowX="auto">
        {loading && !advances.length ? (
          <Flex justify="center" align="center" minH="200px">
            <Spinner size="lg" color="blue.500" />
          </Flex>
        ) : filteredAdvances.length === 0 ? (
          <Flex justify="center" align="center" minH="200px">
            <Text color="gray.500" fontFamily="Noto Sans Lao, sans-serif">
              ບໍ່ພົບຂໍ້ມູນ
            </Text>
          </Flex>
        ) : (
          <Table variant="simple" size="sm">
            <Thead bg="gray.50">
              <Tr>
                <Th>
                  <Checkbox
                    isChecked={allChecked}
                    isIndeterminate={isIndeterminate}
                    onChange={handleSelectAll}
                  />
                </Th>
                <Th fontFamily="Noto Sans Lao, sans-serif">ວັນທີ່</Th>
                <Th fontFamily="Noto Sans Lao, sans-serif">ເລກທີ່</Th>
                <Th fontFamily="Noto Sans Lao, sans-serif">ຜູ້ເບີກ</Th>
                <Th fontFamily="Noto Sans Lao, sans-serif">ລາຍລະອຽດ</Th>
                <Th fontFamily="Noto Sans Lao, sans-serif">ປະເພດ</Th>
                <Th fontFamily="Noto Sans Lao, sans-serif" isNumeric>
                  ງົບຂໍເບິກ
                </Th>

                <Th fontFamily="Noto Sans Lao, sans-serif">ສະຖານະ</Th>
                <Th fontFamily="Noto Sans Lao, sans-serif">ດຳເນີນການ</Th>
                <Th fontFamily="Noto Sans Lao, sans-serif">ຈັດການ</Th>
              </Tr>
            </Thead>
            <Tbody>
              {pageData?.map((advance) => {
                // 🔹 รวมสกุลเงินจาก summary และ amount_requested ทั้งหมด
                const currencies = new Set([
                  ...(advance.amount_requested?.map((a) => a.currency) || []),
                  ...Object.keys(advance.summary || {}),
                ]);

                // 🔹 สร้าง rowData รวมทุกสกุลเงิน
                const rowData = Array.from(currencies).map((currency) => {
                  const requested =
                    advance.amount_requested?.find(
                      (a) => a.currency === currency
                    )?.amount || 0;

                  return {
                    id: advance._id,
                    currency,
                    summary: advance.summary?.[currency] || {},
                    requested,
                    status_Ap: advance.status_Ap,
                    serial: advance.serial || "-", // ถ้าต้องการโชว์เลข serial ด้วย
                  };
                });

                const statusConfig =
                  STATUS_CONFIG[advance.status] || STATUS_CONFIG.pending;
                const typeConfig =
                  TYPE_CONFIG[advance.type] || TYPE_CONFIG.employee;

                return (
                  <React.Fragment key={advance._id}>
                    {rowData.map(
                      (
                        { currency, summary, requested, serial, status_Ap, id },
                        idx
                      ) => (
                        <Tr
                          key={`${advance._id}-${currency}`}
                          _hover={{ bg: "gray.50" }}
                        >
                          {/* ✅ Checkbox */}
                          {idx === 0 && (
                            <Td
                              fontFamily="Noto Sans Lao, sans-serif"
                              rowSpan={rowData.length}
                            >
                              <Checkbox
                                isChecked={selected.some((i) => i.id === id)}
                                onChange={() => handleToggle(advance)}
                              />
                            </Td>
                          )}

                          {/* ✅ วันที่ */}
                          {idx === 0 && (
                            <Td
                              fontFamily="Noto Sans Lao, sans-serif"
                              rowSpan={rowData.length}
                            >
                              {formatDate(new Date(advance.request_date))}
                            </Td>
                          )}
                          {idx === 0 && (
                            <Td
                              rowSpan={rowData.length}
                              fontFamily="Noto Sans Lao, sans-serif"
                            >
                              {serial}
                            </Td>
                          )}
                          {/* ✅ พนักงาน */}
                          {idx === 0 && (
                            <Td
                              fontFamily="Noto Sans Lao, sans-serif"
                              rowSpan={rowData.length}
                            >
                              {advance.employee_id?.full_name || "—"}
                            </Td>
                          )}

                          {/* ✅ ຈຸດປະສົງ */}
                          {idx === 0 && (
                            <Td rowSpan={rowData.length} maxW="300px">
                              <Tooltip label={advance.purpose} placement="top">
                                <Text
                                  fontFamily="Noto Sans Lao, sans-serif"
                                  isTruncated
                                >
                                  {shortDesc(advance.purpose)}
                                </Text>
                              </Tooltip>
                            </Td>
                          )}

                          {/* ✅ ประเภท */}
                          {idx === 0 && (
                            <Td rowSpan={rowData.length}>
                              <Badge
                                fontFamily="Noto Sans Lao, sans-serif"
                                colorScheme={typeConfig.colorScheme}
                              >
                                {typeConfig.label}
                              </Badge>
                            </Td>
                          )}

                          {/* ✅ ยอดเบิก */}
                          <Td
                            fontFamily="Noto Sans Lao, sans-serif"
                            isNumeric
                            fontWeight="medium"
                          >
                            {requested?.toLocaleString()} {currency}
                          </Td>

                          {/* ✅ สถานะ */}
                          {idx === 0 && (
                            <Td rowSpan={rowData.length}>
                              <Badge
                                fontFamily="Noto Sans Lao, sans-serif"
                                colorScheme={statusConfig.colorScheme}
                              >
                                {statusConfig.label}
                              </Badge>
                            </Td>
                          )}
                          {idx === 0 && (
                            <Td rowSpan={rowData.length}>
                              {user?.role === "admin" && (
                                <HStack>
                                  <Button
                                    fontSize={"20"}
                                    size="sm"
                                    rounded="lg"
                                    fontFamily="Noto Sans Lao, sans-serif"
                                    colorScheme={
                                      status_Ap === "pending"
                                        ? "yellow"
                                        : "gray"
                                    }
                                    variant={
                                      status_Ap === "pending"
                                        ? "solid"
                                        : "outline"
                                    }
                                    onClick={() => handleStatus(id, "pending")}
                                  >
                                    ລໍຖ້າ
                                  </Button>
                                  <Button
                                    fontSize={"20"}
                                    size="sm"
                                    rounded="lg"
                                    fontFamily="Noto Sans Lao, sans-serif"
                                    colorScheme={
                                      status_Ap === "approve" ? "green" : "gray"
                                    }
                                    variant={
                                      status_Ap === "approve"
                                        ? "solid"
                                        : "outline"
                                    }
                                    onClick={() => handleStatus(id, "approve")}
                                  >
                                    ອະນຸມັດ
                                  </Button>
                                  <Button
                                    fontSize={"20"}
                                    size="sm"
                                    rounded="lg"
                                    fontFamily="Noto Sans Lao, sans-serif"
                                    colorScheme={
                                      status_Ap === "cancel" ? "red" : "gray"
                                    }
                                    variant={
                                      status_Ap === "cancel"
                                        ? "solid"
                                        : "outline"
                                    }
                                    onClick={() => handleStatus(id, "cancel")}
                                  >
                                    ຍົກເລີກ
                                  </Button>
                                </HStack>
                              )}
                            </Td>
                          )}
                          {/* ✅ เมนู */}
                          {idx === 0 && (
                            <Td rowSpan={rowData.length}>
                              <Menu>
                                <MenuButton
                                  fontFamily="Noto Sans Lao, sans-serif"
                                  as={IconButton}
                                  icon={<MoreVertical size={16} />}
                                  variant="ghost"
                                  size="sm"
                                />
                                <MenuList>
                                  <MenuItem
                                    fontFamily="Noto Sans Lao, sans-serif"
                                    icon={<Eye size={16} />}
                                    onClick={() => handleDetail(advance)}
                                  >
                                    ເບີ່ງລາຍລະອຽດ
                                  </MenuItem>
                                  <MenuItem
                                    fontFamily="Noto Sans Lao, sans-serif"
                                    icon={<Edit size={16} />}
                                    onClick={() => {
                                      setEditing(advance);
                                      setEditForm({
                                        ...advance,
                                        amounts: advance?.amount_requested,
                                      });
                                      onEditOpen();
                                    }}
                                  >
                                    ແກ້ໄຂ
                                  </MenuItem>
                                  <MenuItem
                                    fontFamily="Noto Sans Lao, sans-serif"
                                    icon={<RefreshCw size={16} />}
                                    onClick={() => {
                                      setTransTarget(advance);
                                      onTransOpen();
                                    }}
                                  >
                                    ບັນທຶກໃຊ້ຈິງ / ຄືນ
                                  </MenuItem>
                                  {advance.status !== "closed" ? (
                                    <MenuItem
                                      fontFamily="Noto Sans Lao, sans-serif"
                                      icon={<ChevronDownIcon />}
                                      onClick={() => closeAdvance(advance._id)}
                                    >
                                      ປິດລາຍການ
                                    </MenuItem>
                                  ) : (
                                    <MenuItem
                                      fontFamily="Noto Sans Lao, sans-serif"
                                      icon={<ChevronDownIcon />}
                                      onClick={() => reopenAdvance(advance._id)}
                                    >
                                      ເປີດລາຍການ
                                    </MenuItem>
                                  )}
                                  <MenuItem
                                    fontFamily="Noto Sans Lao, sans-serif"
                                    icon={<Trash2 size={16} />}
                                    onClick={() => deleteAdvance(advance._id)}
                                    color="red.500"
                                  >
                                    ລົບ
                                  </MenuItem>
                                </MenuList>
                              </Menu>
                            </Td>
                          )}
                        </Tr>
                      )
                    )}
                  </React.Fragment>
                );
              })}
            </Tbody>
          </Table>
        )}
        <HStack paddingTop={"40px"} spacing={2} justify="center">
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
      </Box>

      {/* Add Modal */}
      <Modal isOpen={isAddOpen} onClose={onAddClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader fontFamily="Noto Sans Lao, sans-serif">
            ເພີ່ມລາຍການລາຍຈ່າຍລ່ວງໜ້າ
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <SimpleGrid columns={2} spacing={4}>
                {/* <FormControl isRequired>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ປະເພດ
                  </FormLabel>
                  <Select
                    value={addForm.type}
                    onChange={(e) =>
                      setAddForm({ ...addForm, type: e.target.value })
                    }
                    fontFamily="Noto Sans Lao, sans-serif"
                    placeholder="ເລືອກຜູ້ເບີກ"
                  >
                    <option value="employee">ເບີກພະນັກງານ</option>
                  </Select>
                </FormControl> */}
                <FormControl isRequired>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ເລກທີ່
                  </FormLabel>
                  <Input
                    value={addForm?.serial}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        serial: e.target.value,
                      })
                    }
                    fontFamily="Noto Sans Lao, sans-serif"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ພະນັກງານ
                  </FormLabel>
                  <Select
                    placeholder="ເລືອກພະນັກງານ"
                    value={addForm.employee_id}
                    onChange={(e) =>
                      setAddForm({ ...addForm, employee_id: e.target.value })
                    }
                    fontFamily="Noto Sans Lao, sans-serif"
                  >
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.full_name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                {/* 
                <FormControl>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ບໍລິສັດ/ຜູ້ຮັບ
                  </FormLabel>
                  <Input
                    value={addForm.company}
                    onChange={(e) =>
                      setAddForm({ ...addForm, company: e.target.value })
                    }
                    placeholder="ຊື່ບໍລິສັດຫຼືຜູ້ຮັບ"
                    fontFamily="Noto Sans Lao, sans-serif"
                  />
                </FormControl> */}

                {/* <FormControl>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ຜູ້ເບີກ
                  </FormLabel>
                  <Input
                    value={addForm.requester}
                    onChange={(e) =>
                      setAddForm({ ...addForm, requester: e.target.value })
                    }
                    placeholder="ຊື່ຜູ້ເບີກ"
                    fontFamily="Noto Sans Lao, sans-serif"
                  />
                </FormControl> */}

                <FormControl>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ວິທີການຊຳລະ
                  </FormLabel>

                  <Select
                    placeholder="ເລືອກວິທີຊຳລະ"
                    value={addForm.paymentMethods}
                    onChange={(e) =>
                      setAddForm({ ...addForm, paymentMethods: e.target.value })
                    }
                    fontFamily="Noto Sans Lao, sans-serif"
                  >
                    <option value="cash">ເງິນສົດ</option>
                    <option value="bank">ເງິນໂອນ</option>
                  </Select>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ວັນທີ່ເບີກ
                  </FormLabel>
                  <Input
                    type="date"
                    value={addForm.date}
                    onChange={(e) =>
                      setAddForm({ ...addForm, date: e.target.value })
                    }
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ຕັ້ງແຕ່ວັນທີ່
                  </FormLabel>
                  <Input
                    type="date"
                    value={addForm.date_from}
                    onChange={(e) =>
                      setAddForm({ ...addForm, date_from: e.target.value })
                    }
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ເຖິງວັນທີ່
                  </FormLabel>
                  <Input
                    type="date"
                    value={addForm.date_to}
                    onChange={(e) =>
                      setAddForm({ ...addForm, date_to: e.target.value })
                    }
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ສະຖານະການຊຳລະເງິນ
                  </FormLabel>
                  <Select
                    placeholder="ສະຖານະການຊຳລະເງິນ"
                    value={addForm.status_payment}
                    onChange={(e) =>
                      setAddForm({ ...addForm, status_payment: e.target.value })
                    }
                    fontFamily="Noto Sans Lao, sans-serif"
                  >
                    <option value="paid">ຊຳລະແລ້ວ</option>
                    <option value="unpaid">ຍັງບໍ່ຊຳລະ</option>
                  </Select>
                </FormControl>
              </SimpleGrid>

              {/* Multi-Currency Section */}
              <Box>
                <Flex justify="space-between" align="center" mb={2}>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif" mb={0}>
                    ຈໍານວນເງິນ (ຫຼາຍສະກຸນ)
                  </FormLabel>
                  <Button
                    size="sm"
                    leftIcon={<Plus size={14} />}
                    onClick={addCurrencyRow}
                    colorScheme="green"
                    variant="outline"
                    fontFamily="Noto Sans Lao, sans-serif"
                  >
                    ເພີ່ມສະກຸນເງິນ
                  </Button>
                </Flex>
                <VStack spacing={2} align="stretch">
                  {addForm.amounts.map((item, index) => (
                    <HStack key={index} spacing={2}>
                      <Select
                        value={item.currency}
                        onChange={(e) =>
                          updateCurrencyRow(index, "currency", e.target.value)
                        }
                        w="120px"
                        fontFamily="Noto Sans Lao, sans-serif"
                      >
                        {currencies.map((curr) => (
                          <option key={curr} value={curr}>
                            {curr}
                          </option>
                        ))}
                      </Select>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.amount}
                        onChange={(e) =>
                          updateCurrencyRow(index, "amount", e.target.value)
                        }
                        placeholder="0.00"
                        flex={1}
                      />
                      <IconButton
                        icon={<DeleteIcon />}
                        onClick={() => removeCurrencyRow(index)}
                        isDisabled={addForm.amounts.length === 1}
                        colorScheme="red"
                        variant="ghost"
                        size="sm"
                      />
                    </HStack>
                  ))}
                </VStack>
              </Box>

              <FormControl isRequired>
                <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                  ລາຍລະອຽດ
                </FormLabel>
                <Textarea
                  value={addForm.description}
                  onChange={(e) =>
                    setAddForm({ ...addForm, description: e.target.value })
                  }
                  placeholder="ອະທິບາຍວັດຖຸປະສົງການເບີກເງິນ"
                  rows={3}
                  fontFamily="Noto Sans Lao, sans-serif"
                />
              </FormControl>

              <FormControl>
                <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                  ໝາຍເຫດ
                </FormLabel>
                <Textarea
                  value={addForm.note}
                  onChange={(e) =>
                    setAddForm({ ...addForm, note: e.target.value })
                  }
                  placeholder="ໝາຍເຫດເພີ່ມເຕີມ (ຖ້າມີ)"
                  rows={2}
                  fontFamily="Noto Sans Lao, sans-serif"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={createAdvance}
              fontFamily="Noto Sans Lao, sans-serif"
            >
              ບັນທຶກ
            </Button>
            <Button
              variant="ghost"
              onClick={onAddClose}
              fontFamily="Noto Sans Lao, sans-serif"
            >
              ຍົກເລີກ
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={handleEditClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader fontFamily="Noto Sans Lao, sans-serif">
            ແກ້ໄຂລາຍການ
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {editing && (
              <VStack spacing={4} align="stretch">
                {/* Multi-Currency Edit Section */}
                <Box>
                  <Flex justify="space-between" align="center" mb={2}>
                    <FormLabel fontFamily="Noto Sans Lao, sans-serif" mb={0}>
                      ຈໍານວນເງິນ (ຫຼາຍສະກຸນ)
                    </FormLabel>
                    <Button
                      size="sm"
                      leftIcon={<Plus size={14} />}
                      onClick={addEditCurrencyRow}
                      colorScheme="green"
                      variant="outline"
                      fontFamily="Noto Sans Lao, sans-serif"
                    >
                      ເພີ່ມສະກຸນເງິນ
                    </Button>
                  </Flex>
                  <VStack spacing={2} align="stretch">
                    {editForm?.amounts?.map((item, index) => (
                      <HStack key={index} spacing={2}>
                        <Select
                          value={item.currency}
                          onChange={(e) =>
                            updateEditCurrencyRow(
                              index,
                              "currency",
                              e.target.value
                            )
                          }
                          w="120px"
                          fontFamily="Noto Sans Lao, sans-serif"
                        >
                          {currencies.map((curr) => (
                            <option key={curr} value={curr}>
                              {curr}
                            </option>
                          ))}
                        </Select>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.amount}
                          onChange={(e) =>
                            updateEditCurrencyRow(
                              index,
                              "amount",
                              e.target.value
                            )
                          }
                          placeholder="0.00"
                          flex={1}
                        />
                        <IconButton
                          icon={<DeleteIcon />}
                          onClick={() => removeEditCurrencyRow(index)}
                          isDisabled={
                            editForm.amounts && editForm.amounts.length === 1
                          }
                          colorScheme="red"
                          variant="ghost"
                          size="sm"
                        />
                      </HStack>
                    ))}
                  </VStack>
                </Box>
                <FormControl isRequired>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ປະເພດ
                  </FormLabel>
                  <Select
                    value={editForm.employee_id || ""}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const emp = employees.find(
                        (emp) => emp._id === selectedId
                      );

                      setEditForm({
                        ...editForm,
                        employee_id: selectedId, // ✅ เก็บแค่ ID
                      });

                      setSelectedEmployee(emp || null); // ✅ แสดงชื่อ
                    }}
                    fontFamily="Noto Sans Lao, sans-serif"
                    placeholder="ເລືອກພະນັກງານ"
                  >
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.full_name}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ຜູ້ເບີກ
                  </FormLabel>
                  <Input
                    readOnly
                    value={
                      selectedEmployee?.full_name ||
                      editForm?.employee_id?.full_name ||
                      ""
                    }
                    fontFamily="Noto Sans Lao, sans-serif"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ເລກທີ່
                  </FormLabel>
                  <Input
                    value={editForm?.serial}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        serial: e.target.value,
                      })
                    }
                    fontFamily="Noto Sans Lao, sans-serif"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ວັນທີ່
                  </FormLabel>
                  <Input
                    type="date"
                    value={
                      editForm.request_date
                        ? new Date(editForm.request_date)
                            .toISOString()
                            .slice(0, 10)
                        : ""
                    }
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        request_date: e.target.value,
                      })
                    }
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ສະຖານະການຊຳລະເງິນ
                  </FormLabel>
                  <Select
                    placeholder="ສະຖານະການຊຳລະເງິນ"
                    value={editForm.status_payment}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        status_payment: e.target.value,
                      })
                    }
                    fontFamily="Noto Sans Lao, sans-serif"
                  >
                    <option value="paid">ຊຳລະແລ້ວ</option>
                    <option value="unpaid">ຍັງບໍ່ຊຳລະ</option>
                  </Select>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ລາຍລະອຽດ
                  </FormLabel>
                  <Textarea
                    value={editForm.purpose || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, purpose: e.target.value })
                    }
                    rows={4}
                    fontFamily="Noto Sans Lao, sans-serif"
                  />
                </FormControl>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={() => updateAdvance(editing._id, editForm)}
              fontFamily="Noto Sans Lao, sans-serif"
            >
              ບັນທຶກ
            </Button>
            <Button
              variant="ghost"
              onClick={handleEditClose}
              fontFamily="Noto Sans Lao, sans-serif"
            >
              ຍົກເລີກ
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Transaction Modal */}
      <Modal isOpen={isTransOpen} onClose={handleTransClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader fontFamily="Noto Sans Lao, sans-serif">
            ບັນທຶກໃຊ້ຈິງ / ສົ່ງຄືນ
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {transTarget && (
              <>
                <Box
                  mb={4}
                  p={4}
                  bg="gray.50"
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor="gray.200"
                  boxShadow="sm"
                  fontFamily="Noto Sans Lao, sans-serif"
                >
                  {/* หัวข้อ */}
                  <Text
                    fontFamily="Noto Sans Lao, sans-serif"
                    fontSize="sm"
                    color="gray.600"
                    mb={2}
                  >
                    ບັນທຶກສໍາລັບ:
                  </Text>

                  {/* รายการ transaction */}
                  <Stack spacing={1} mb={3}>
                    {sortedTransation?.length > 0 ? (
                      sortedTransation.map((i, idx) => (
                        <Flex
                          key={idx}
                          justify="space-between"
                          align="center"
                          bg="white"
                          p={2}
                          borderRadius="md"
                          borderWidth="1px"
                          borderColor="gray.100"
                        >
                          <Box>
                            <Text
                              fontFamily="Noto Sans Lao, sans-serif"
                              fontSize="sm"
                              color="gray.700"
                            >
                              {getTransactionTypeText(i.type)}
                            </Text>
                            <Text
                              fontFamily="Noto Sans Lao, sans-serif"
                              fontSize="sm"
                              color="gray.800"
                              fontWeight="medium"
                            >
                              {i?.amount.toLocaleString()} {i?.currency}
                            </Text>
                          </Box>

                          {/* ปุ่มลบ */}
                          <IconButton
                            size="xs"
                            colorScheme="red"
                            variant="ghost"
                            icon={<DeleteIcon />}
                            aria-label="delete"
                            onClick={() =>
                              handleDeleteTransaction(i, transTarget._id)
                            } // ฟังก์ชันลบ
                          />
                        </Flex>
                      ))
                    ) : (
                      <Text
                        fontFamily="Noto Sans Lao, sans-serif"
                        fontSize="sm"
                        color="gray.500"
                      >
                        ຍັງບໍ່ມີລາຍການ
                      </Text>
                    )}
                  </Stack>

                  {/* รวมยอด */}
                  <Divider my={2} />
                  <Flex justify="space-between" align="center">
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      fontSize="sm"
                      color="gray.600"
                    >
                      ເບີກ:
                    </Text>
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      fontWeight="semibold"
                      color="blue.600"
                    >
                      {formatAmounts(amount_requested)}
                    </Text>
                  </Flex>
                </Box>

                <Select
                  value={transForm.currency || ""}
                  onChange={(e) => {
                    const selectedCurrency = e.target.value;
                    const selected = transTarget.amount_requested.find(
                      (i) => i.currency === selectedCurrency
                    );

                    // หา transactions ของสกุลเงินนี้
                    const relatedTransactions = transTarget.transactions.filter(
                      (tx) => tx.currency === selectedCurrency
                    );

                    // รวมยอดใช้จริงทั้งหมด (ไม่รวม refund)
                    const totalSpent = relatedTransactions
                      .filter((tx) => tx.type === "spend")
                      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

                    // คำนวณยอดที่เหลือ
                    const remaining = Number(selected.amount || 0) - totalSpent;

                    // ถ้าเหลือมากกว่า 0 → set อัตโนมัติ
                    // ถ้าเกินยอดเบิก → ให้ผู้ใช้กรอกเอง
                    setTransForm({
                      ...transForm,
                      currency: selectedCurrency,
                      amount: remaining > 0 ? remaining : "", // ถ้าเกินไม่ใส่ค่า
                    });
                  }}
                  placeholder="ເລືອກສະກຸນເງິນ"
                >
                  {transTarget?.amount_requested?.map((i, index) => (
                    <option key={index} value={i.currency}>
                      {i.currency} - {i.amount.toLocaleString()}
                    </option>
                  ))}
                </Select>

                <FormControl isRequired mb={4}>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ປະເພດລາຍການ
                  </FormLabel>
                  <Select
                    value={transForm.type}
                    onChange={(e) =>
                      setTransForm({ ...transForm, type: e.target.value })
                    }
                    fontFamily="Noto Sans Lao, sans-serif"
                  >
                    <option value="spend">ໃຊ້ຈິງ (spend)</option>
                    <option value="return_to_company">
                      ຄືນບໍລິສັດ (return_to_company)
                    </option>
                    <option value="refund_to_employee">
                      ຄືນພະນັກງານ (refund_to_employee)
                    </option>
                    <option value="additional_request">
                      ເບີກເພີ່ມ (additional_request)
                    </option>
                  </Select>
                </FormControl>

                <FormControl isRequired mb={4}>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ຈໍານວນເງິນ
                  </FormLabel>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={transForm.amount}
                    onChange={(e) =>
                      setTransForm({ ...transForm, amount: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ໝາຍເຫດ
                  </FormLabel>
                  <Textarea
                    value={transForm.note}
                    onChange={(e) =>
                      setTransForm({ ...transForm, note: e.target.value })
                    }
                    placeholder="ລາຍລະອຽດເພີ່ມເຕີມ (ຖ້າມີ)"
                    rows={3}
                    fontFamily="Noto Sans Lao, sans-serif"
                  />
                </FormControl>
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={() => addTransaction(transTarget._id, transForm)}
              fontFamily="Noto Sans Lao, sans-serif"
            >
              ບັນທຶກ
            </Button>
            <Button
              variant="ghost"
              onClick={handleTransClose}
              fontFamily="Noto Sans Lao, sans-serif"
            >
              ຍົກເລີກ
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={onDetailClose}
        size="4xl"
        isCentered
      >
        <ModalOverlay />
        <ModalContent borderRadius="2xl" shadow="xl">
          <ModalHeader
            fontFamily="Noto Sans Lao, sans-serif"
            fontWeight="bold"
            fontSize="xl"
          >
            ລາຍລະອຽດລາຍຈ່າຍລ່ວງໜ້າ
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {/* 📌 ข้อมูลพื้นฐาน */}
            <Box mb={4}>
              <Text
                fontFamily="Noto Sans Lao, sans-serif"
                fontWeight="semibold"
                fontSize="lg"
                color="teal.500"
              >
                ຂໍ້ມູນພື້ນຖານ
              </Text>
              <Divider my={2} />
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Box>
                  <Text fontWeight="800" fontFamily="Noto Sans Lao, sans-serif">
                    ພະນັກງານ: {detail?.employee_id?.full_name || "N/A"}
                  </Text>
                  <Text fontWeight="800" fontFamily="Noto Sans Lao, sans-serif">
                    ວັນທີຂໍ:{" "}
                    {detail?.request_date && formatDate(detail.request_date)}
                  </Text>
                  <Text fontWeight="800" fontFamily="Noto Sans Lao, sans-serif">
                    ວິທີການຊຳລະ: {detail?.paymentMethods || "NA"}
                  </Text>
                  <Text fontWeight="800" fontFamily="Noto Sans Lao, sans-serif">
                    ສະຖານະເບີກ:{" "}
                    {detail?.status_payment === "paid"
                      ? "ເບີກເງິນໃຫ້ແລ້ວ"
                      : "ຍັງບໍ່ເບີກເງິນ" || "NA"}
                  </Text>
                </Box>
                <Box>
                  <Text fontWeight="800" fontFamily="Noto Sans Lao, sans-serif">
                    ຈໍານວນທີ່ຂໍ:{" "}
                    {detail?.amount_requested
                      ?.map((a) => `${a.amount.toLocaleString()} ${a.currency}`)
                      .join(" / ")}
                  </Text>
                  <Text fontWeight="800" fontFamily="Noto Sans Lao, sans-serif">
                    ສະຖານະ:{" "}
                    <Badge
                      fontFamily="Noto Sans Lao, sans-serif"
                      colorScheme={
                        detail?.status === "open"
                          ? "green"
                          : detail?.status === "pending"
                          ? "yellow"
                          : "gray"
                      }
                    >
                      {detail?.status?.toUpperCase()}
                    </Badge>
                  </Text>
                  <Text fontWeight="800" fontFamily="Noto Sans Lao, sans-serif">
                    ວັນທີປິດ:{" "}
                    {detail?.closed_at ? formatDate(detail.closed_at) : "-"}
                  </Text>
                </Box>

                <Text fontWeight="800" fontFamily="Noto Sans Lao, sans-serif">
                  ຈຸດປະສົງ: {detail?.purpose}
                </Text>
              </SimpleGrid>
            </Box>

            {/* 📌 Transactions */}
            <Box mt={6}>
              <Text
                fontFamily="Noto Sans Lao, sans-serif"
                fontWeight="semibold"
                fontSize="lg"
                color="teal.500"
              >
                ລາຍການເຄື່ອນໄຫວ (Transactions)
              </Text>
              <Divider my={2} />
              {detail?.transactions?.length > 0 ? (
                Object.entries(
                  detail.transactions.reduce((groups, tx) => {
                    const currency = tx.currency || "N/A";
                    if (!groups[currency]) groups[currency] = [];
                    groups[currency].push(tx);
                    return groups;
                  }, {})
                ).map(([currency, txs]) => {
                  // ✅ เรียงตามลำดับที่ต้องการ
                  const order = [
                    "spend",
                    "return_to_company",
                    "refund_to_employee",
                    "additional_request",
                  ];
                  const sortedTx = txs?.sort(
                    (a, b) => order.indexOf(a.type) - order.indexOf(b.type)
                  );
                  return (
                    <Box key={currency} mb={6}>
                      <Text
                        fontWeight="bold"
                        color="teal.600"
                        fontFamily="Noto Sans Lao, sans-serif"
                        mb={2}
                      >
                        ສະກຸນເງິນ: {currency}
                      </Text>

                      <Table variant="striped" colorScheme="gray" size="sm">
                        <Thead bg={useColorModeValue("gray.100", "gray.700")}>
                          <Tr>
                            <Th fontFamily="Noto Sans Lao, sans-serif">
                              ປະເພດ
                            </Th>
                            <Th
                              fontFamily="Noto Sans Lao, sans-serif"
                              isNumeric
                            >
                              ຈໍານວນ
                            </Th>
                            <Th fontFamily="Noto Sans Lao, sans-serif">
                              ໝາຍເຫດ
                            </Th>
                            <Th fontFamily="Noto Sans Lao, sans-serif">
                              ວັນທີ
                            </Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {sortedTx?.map((tx) => (
                            <Tr key={tx._id}>
                              <Td fontFamily="Noto Sans Lao, sans-serif">
                                <Badge
                                  fontFamily="Noto Sans Lao, sans-serif"
                                  colorScheme={
                                    tx?.type === "spend"
                                      ? "blue"
                                      : tx?.type === "return_to_company"
                                      ? "red"
                                      : tx?.type === "refund_to_employee"
                                      ? "green"
                                      : "orange"
                                  }
                                >
                                  {getTransactionTypeText(tx.type)}
                                </Badge>
                              </Td>
                              <Td
                                fontFamily="Noto Sans Lao, sans-serif"
                                isNumeric
                              >
                                {tx?.amount?.toLocaleString()}
                              </Td>
                              <Td fontFamily="Noto Sans Lao, sans-serif">
                                {tx?.note || "-"}
                              </Td>
                              <Td fontFamily="Noto Sans Lao, sans-serif">
                                {tx?.date && formatDate(tx.date)}
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </Box>
                  );
                })
              ) : (
                <Text fontFamily="Noto Sans Lao, sans-serif" color="gray.500">
                  ຍັງບໍ່ມີລາຍການເຄື່ອນໄຫວ
                </Text>
              )}
            </Box>

            {/* 📌 Summary */}
            <Box mt={6}>
              <Text
                fontFamily="Noto Sans Lao, sans-serif"
                fontWeight="semibold"
                fontSize="lg"
                color="teal.500"
              >
                ສະຫຼຸບຍອດລວມ
              </Text>
              <Divider my={2} />
              {detail?.summary ? (
                Object.entries(detail.summary).map(([currency, sum]) => (
                  <Box key={currency} mb={3}>
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      fontWeight="bold"
                      color="teal.600"
                    >
                      💰 {currency}
                    </Text>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2} pl={4}>
                      <Text fontFamily="Noto Sans Lao, sans-serif">
                        ໃຊ້ຈ່າຍຈິງ: {sum?.total_spent?.toLocaleString()}{" "}
                        {currency}
                      </Text>
                      <Text fontFamily="Noto Sans Lao, sans-serif">
                        ຄືນບໍລິສັດ:{" "}
                        {sum?.total_return_to_company?.toLocaleString()}{" "}
                        {currency}
                      </Text>
                      <Text fontFamily="Noto Sans Lao, sans-serif">
                        ຄືນພະນັກງານ:{" "}
                        {sum?.total_refund_to_employee?.toLocaleString()}{" "}
                        {currency}
                      </Text>
                      <Text fontFamily="Noto Sans Lao, sans-serif">
                        ເພີ່ມເຕີມ:{" "}
                        {sum?.total_additional_request?.toLocaleString()}{" "}
                        {currency}
                      </Text>

                      <Text fontFamily="Noto Sans Lao, sans-serif">
                        {(() => {
                          // ดึงยอดเบิกตาม currency ปัจจุบัน
                          const requested =
                            detail.amount_requested?.find(
                              (a) => a.currency === currency
                            )?.amount || 0;

                          const totalSpent =
                            Number(sum?.total_spent || 0) +
                            Number(sum?.total_refund_to_employee || 0);

                          // ถ้าอยากเทียบกับยอดเบิก เพื่อดูว่ายังเหลือ/ขาด
                          const difference = totalSpent;

                          return (
                            <>
                              ລວມຍອດຈ່າຍຈິງ:
                              {Math.abs(difference).toLocaleString()} {currency}
                            </>
                          );
                        })()}
                      </Text>
                    </SimpleGrid>
                  </Box>
                ))
              ) : (
                <Text fontFamily="Noto Sans Lao, sans-serif" color="gray.500">
                  ບໍ່ມີຂໍ້ມູນສະຫຼຸບ
                </Text>
              )}
            </Box>
          </ModalBody>

          <ModalFooter>
            <Button
              fontFamily="Noto Sans Lao, sans-serif"
              colorScheme="blue"
              mr={3}
              onClick={onDetailClose}
            >
              ປິດ
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}
