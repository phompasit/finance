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
import { fetchCategories } from "../store/reducer/partner";
import { useDispatch, useSelector } from "react-redux";
import {
  addTransaction,
  closeAdvance,
  createAdvanceA,
  deleteAdvance,
  fetchAdvances,
  fetchEmployees,
  reopenAdvance,
  updateAdvance,
} from "../store/reducer/advance";
import exportPrint from "../components/Prepaid_components/exportPrintPrepaid";
import PrepaidSummary from "../components/Prepaid_components/Summary";
import PrepaidFilter from "../components/Prepaid_components/PrepaidFilter";
import PrepaidTable from "../components/Prepaid_components/PrepaidTable";
import PrepaidHeader from "../components/Prepaid_components/PrepaidHeader";

const API_BASE = import.meta.env.VITE_API_URL || "";

// Initial form states as constants
const INITIAL_ADD_FORM = {
  type: "employee",
  employee_id: "",
  company: "",
  requester: "",
  account: "",
  description: "",
  amounts: [{ currency: "LAK", amount: "", accountId: "" }],
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
  // State management
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
  const dispatch = useDispatch();
  const { categoriesRedu: categories } = useSelector((state) => state.partner);
  const { advancesList: advances, employees } = useSelector(
    (state) => state.advance
  );
  const filteredAdvances = advances;
  const [page, setPage] = useState(1);
  const { pagination } = useSelector((s) => s.advance);
  const totalPages = pagination?.totalPages || 1;
  const pageData = advances;

  // Auth headers helper
  const authHeaders = useCallback(() => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }, []);

  // API calls

  const fetchC = useCallback(async () => {
    try {
      setLoading(true);

      await Promise.all([
        dispatch(fetchCategories()).unwrap(),
        dispatch(fetchEmployees()).unwrap(),
        dispatch(
          fetchAdvances({
            search: filters.search,
            status: filters.status,
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
            page,
            limit: 20,
          })
        ),
      ]);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Fetch failed");
    } finally {
      setLoading(false);
    }
  }, [dispatch, filters, page]);

  // Initial data fetch
  useEffect(() => {
    fetchC();
  }, [fetchC]);

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
      amounts: [
        ...(editForm.amounts || []),
        { currency: "LAK", amount: "", accountId: "" },
      ],
    });
  };

  const removeEditCurrencyRow = (index) => {
    if (editForm.amounts && editForm.amounts.length > 1) {
      const newAmounts = editForm.amounts.filter((_, i) => i !== index);
      setEditForm({ ...editForm, amounts: newAmounts });
    }
  };

  const updateEditCurrencyRow = (index, field, value) => {
    setEditForm((prev) => {
      const newAmounts = prev.amounts.map((row, i) =>
        i === index ? { ...row, [field]: value } : row
      );

      return { ...prev, amounts: newAmounts };
    });
  };

  // Form validation
  const validateAddForm = () => {
    const {
      type,
      employee_id,
      description,
      amounts,
      date_from,
      date_to,
      serial,
      paymentMethods,
      date,
      note,
    } = addForm;

    // 1. description
    if (!description.trim()) {
      return toastWarn("ກະລຸນາກອກລາຍລະອຽດ");
    }

    // 2. amount
    const hasValidAmount = amounts.some(
      (a) => a.amount && parseFloat(a.amount) > 0
    );
    if (!hasValidAmount) {
      return toastWarn("ກະລຸນາກອກຈໍານວນເງິນທີ່ຖືກຕ້ອງ");
    }

    // 3. date
    if (!date) {
      return toastWarn("ກະລຸນາເລືອກວັນທີ່");
    }

    // 4. employee_id
    if (type === "employee" && !employee_id.trim()) {
      return toastWarn("ກະລຸນາເລືອກພະນັກງານ");
    }

    // 8. date_from - date_to
    if (!date_from || !date_to) {
      return toastWarn("ກະລຸນາເລືອກວັນທີ່ (From-To)");
    }

    // ถ้าอยากบังคับว่า date_from <= date_to
    if (new Date(date_from) > new Date(date_to)) {
      return toastWarn("ວັນທີ່ From ຕ້ອງນ້ອຍກວ່າ To");
    }

    // 9. serial
    if (!serial.trim()) {
      return toastWarn("ກະລຸນາກອກ Serial");
    }

    // 10. payment method
    if (!paymentMethods.trim()) {
      return toastWarn("ກະລຸນາເລືອກວິທີການຈ່າຍ");
    }

    return true;
  };

  // Toast helper
  const toastWarn = (title) => {
    toast({
      title,
      status: "warning",
      duration: 3000,
    });
    return false;
  };
  ///category
  const [value, setValue] = useState("");
  // Create advance
  const createAdvance = async () => {
    try {
      if (!validateAddForm()) return;

      const validAmounts = addForm.amounts
        .filter(({ amount }) => parseFloat(amount) > 0)
        .map(({ currency, amount, accountId }) => ({
          currency,
          amount: parseFloat(amount),
          accountId,
        }));

      const payload = {
        type: addForm.type,
        employee_id: addForm.employee_id || null,
        purpose: addForm.description?.trim(),
        amounts: validAmounts,
        request_date: addForm.date,
        serial: addForm.serial?.trim(),
        status_payment: addForm.status_payment,
        paymentMethods: addForm.paymentMethods,
        categoryId: value || null,
        meta: {
          company: addForm.company || "",
          account: addForm.account || "",
          date_from: addForm.date_from,
          date_to: addForm.date_to,
          requester: addForm.requester,
          note: addForm.note,
        },
      };
      // 👇 ส่งให้ Redux แทน fetch()
      const resultAction = await dispatch(createAdvanceA(payload)).unwrap();
      if (resultAction?.success) {
        toast({
          title: "ບັນທຶກສໍາເລັດ",
          status: "success",
          duration: 3000,
          isClosable: true,
        });

        onAddClose();
        setAddForm(INITIAL_ADD_FORM);
      } else {
        toast({
          title: "ບັນທຶກບໍ່ສໍາເລັດ",
          description: resultAction?.message || "Error",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
      await fetchC(); // โหลดใหม่
    } catch (error) {
      // ถ้ามีอะไรผิดพลาด มันจะกระโดดมาที่นี่โดยอัตโนมัติ
      toast({
        title: "ມີບາງຢ່າງຜິດພາດ",
        description: error?.message || "Error",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Update advance
  const updateAdvanceA = async (id, data) => {
    try {
      // 🔹 1) Validate amounts
      const validAmounts = (data.amounts || [])
        .filter((a) => !!a.amount && parseFloat(a.amount) > 0)
        .map((a) => ({
          currency: a.currency,
          amount: parseFloat(a.amount),
          accountId: a.accountId,
        }));

      // 🔹 2) Build payload
      const payload = {
        amounts: validAmounts,
        request_date: data.request_date || null,
        purpose: data.purpose?.trim() || "",
        serial: data.serial?.trim() || "",
        status_payment: data.status_payment || "",
        employee_id: data.employee_id || null,
        paymentMethods: data.paymentMethods || "",
        categoryId: data.categoryId || null,
      };

      // 🔹 3) Dispatch Redux Thunk
      const response = await dispatch(
        updateAdvance({ id, data: payload })
      ).unwrap();

      // 🔹 4) Check success
      if (!response?.success) {
        throw new Error(response?.message || "ບໍ່ສາມາດແກ້ໄຂຂໍ້ມູນໄດ້");
      }

      // 🔹 5) Toast success
      toast({
        title: "ແກ້ໄຂສໍາເລັດ",
        status: "success",
        duration: 3000,
      });

      // 🔹 6) Close modal + refresh
      onEditClose();
      await fetchC();
      setSelected([]);
    } catch (err) {
      console.error("Update advance error:", err);

      toast({
        title: "ແກ້ໄຂບໍ່ສໍາເລັດ",
        description: err.message || "Error",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Delete advance
  const deleteAdvanceA = async (id) => {
    if (!window.confirm("ແນ່ໃຈວ່າຈະລົບລາຍການນີ້ຫຼືບໍ່?")) return;

    try {
      const response = await dispatch(deleteAdvance(id)).unwrap();

      if (!response.success) {
        toast({
          title: "ລົບສໍາເລັດ",
          description: response.message || "ບໍ່ສາມາດລົບຂໍ້ມູນໄດ້",
          status: "success",
          duration: 3000,
        });
      }
      setSelected((prev) => prev.filter((selId) => selId !== id));
      await fetchC();
      toast({
        title: "ລົບສໍາເລັດ",
        status: "success",
        duration: 3000,
      });
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
  const addTransactionA = async (
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

      const response = await dispatch(
        addTransaction({
          advanceId: advanceId,
          transaction: payload,
        })
      ).unwrap();

      if (!response.success) {
        throw new Error(json.message || "ບໍ່ສາມາດເພີ່ມລາຍການໄດ້");
      }
      toast({
        title: "ເພີ່ມລາຍການສໍາເລັດ",
        status: "success",
        duration: 3000,
      });

      setTransForm(INITIAL_TRANS_FORM);
      onTransClose();
      await fetchC();
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
  const closeAdvanceA = async (advanceId) => {
    try {
      const response = await dispatch(
        closeAdvance({
          advanceId: advanceId,
          remarks: "",
        })
      ).unwrap();

      if (!response.success) {
        throw new Error(json.message || "ບໍ່ສາມາດປິດລາຍການໄດ້");
      }
      toast({
        title: "ປິດລາຍການສໍາເລັດ",
        status: "success",
        duration: 3000,
      });
      await fetchC();
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
  const reopenAdvanceA = async (advanceId) => {
    try {
      const response = await dispatch(reopenAdvance(advanceId)).unwrap();

      if (!response.success) {
        throw new Error(json.message || "ບໍ່ສາມາດເປີດລາຍການໄດ້");
      }
      toast({
        title: "ເປີດລາຍການສໍາເລັດ",
        status: "success",
        duration: 3000,
      });

      await fetchC();
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

      await fetchC();
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
        await fetchC();
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
  const [addCategory, setAddCategory] = useState("");
  const [addSearch, setAddSearch] = useState("");

  // EDIT
  const [editCategory, setEditCategory] = useState("");
  const [editSearch, setEditSearch] = useState("");

  const addFiltered = categories.filter((c) =>
    c.name.toLowerCase().includes(addSearch.toLowerCase())
  );

  const editFiltered = categories.filter((c) =>
    c.name.toLowerCase().includes(editSearch.toLowerCase())
  );
  const addSelectedLabel =
    categories.find((c) => c._id === addCategory)?.name || "ເລືອກ";

  const editSelectedLabel =
    categories.find((c) => c._id === editCategory)?.name || "ເລືອກ";
  const laoType = {
    income: "💰 ລາຍຮັບ",
    asset: "🏦 ຊັບສິນ",
    cogs: "📦 ຕົ້ນທຶນຂາຍ",
    "selling-expense": "🛒 ຄ່າໃຊ້ຈ່າຍຈຳໜ່າຍ",
    "admin-expense": "🏢 ຄ່າໃຊ້ຈ່າຍບໍລິຫານ",
    expense: "📉 ຄ່າໃຊ້ຈ່າຍອື່ນໆ",
  };

  const bankOptions = (user?.companyId?.bankAccounts || []).map((b) => ({
    label: `${b.bankName} (${b.currency})`,
    value: b._id,
    currency: b.currency,
  }));
  const cashOptions = (user?.companyId?.cashAccounts || []).map((b) => ({
    label: `${b.name} (${b.currency})`,
    value: b._id,
    currency: b.currency,
  }));
  return (
    <Container maxW="container.xl" py={6}>
      {/* Header */}

      <PrepaidHeader
        selected={selected}
        user={user}
        onAddOpen={onAddOpen}
        onPrint={() =>
          exportPrint({
            selected,
            user,
            formatDate,
            toast,
          })
        }
      />

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
      <PrepaidSummary advances={advances} />
      {/* Filters */}
      <PrepaidFilter filters={filters} onChange={setFilters} />
      {/* Table */}
      <PrepaidTable
      handleStatus={handleStatus}
        advances={advances}
        selected={selected}
        onSelect={setSelected}
        loading={loading}
        page={page}
        setPage={setPage}
        totalPages={totalPages}
        allChecked={allChecked}
        isIndeterminate={isIndeterminate}
        handleSelectAll={handleSelectAll}
        pageData={pageData}
        STATUS_CONFIG={STATUS_CONFIG}
        TYPE_CONFIG={TYPE_CONFIG}
        formatDate={formatDate}
        shortDesc={shortDesc}
        user={user}
        handleDetail={handleDetail}
        setEditing={setEditing}
        setEditForm={setEditForm}
        onEditOpen={onEditOpen}
        setTransTarget={setTransTarget}
        onTransOpen={onTransOpen}
        closeAdvanceA={closeAdvanceA}
        reopenAdvanceA={reopenAdvanceA}
        deleteAdvanceA={deleteAdvanceA}
      />
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
                    {employees?.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.full_name}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <Menu matchWidth>
                  <MenuButton
                    as={Button}
                    rightIcon={<ChevronDownIcon />}
                    width="100%"
                  >
                    {addSelectedLabel}
                  </MenuButton>

                  <MenuList p={2}>
                    <Input
                      placeholder="ຄົ້ນຫາ..."
                      value={addSearch}
                      onChange={(e) => setAddSearch(e.target.value)}
                      mb={2}
                    />

                    <Box maxH="200px" overflowY="auto">
                      {addFiltered.map((item) => (
                        <MenuItem
                          key={item._id}
                          onClick={() => {
                            setValue(item._id);
                            setAddCategory(item._id);
                            setAddForm({ ...addForm, categoryId: item._id });
                            setAddSearch("");
                          }}
                        >
                          {item.name} - {laoType[item.type]}
                        </MenuItem>
                      ))}
                    </Box>
                  </MenuList>
                </Menu>

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
                  {addForm.amounts.map((item, index) => {
                    const accountOptions =
                      addForm.paymentMethods === "cash"
                        ? cashOptions?.filter(
                            (acc) => acc.currency === item.currency
                          )
                        : bankOptions?.filter(
                            (acc) => acc.currency === item.currency
                          );
                    return (
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
                        <Select
                          placeholder="ເລືອກ"
                          value={item.accountId}
                          onChange={(e) =>
                            updateCurrencyRow(
                              index,
                              "accountId",
                              e.target.value
                            )
                          }
                          w="120px"
                          fontFamily="Noto Sans Lao, sans-serif"
                        >
                          {accountOptions?.map((acc) => (
                            <option key={acc.value} value={acc.value}>
                              {acc.label}
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
                    );
                  })}
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
                    {editForm?.amounts?.map((item, index) => {
                      const accountOptions =
                        editForm?.paymentMethods === "cash"
                          ? cashOptions?.filter(
                              (acc) => acc.currency === item.currency
                            )
                          : bankOptions?.filter(
                              (acc) => acc.currency === item.currency
                            );
                      // แปลง ObjectId เป็น string ป้องกัน select error
                      const selectedAccount = accountOptions.filter(
                        (acc) => acc.value === item.accountId
                      );
                      console.log(editForm);
                      return (
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
                          {/* Account Select */}
                          <Select
                            placeholder="ເລືອກ"
                            value={item.accountId} // ⭐ ensure string always
                            onChange={(e) =>
                              updateEditCurrencyRow(
                                index,
                                "accountId",
                                e.target.value
                              )
                            }
                            w="120px"
                            fontFamily="Noto Sans Lao, sans-serif"
                          >
                            {accountOptions.map((acc) => (
                              <option key={acc.value} value={acc.value}>
                                {acc.label}
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
                      );
                    })}
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

                <HStack>
                  <Menu fontFamily="Noto Sans Lao, sans-serif" matchWidth>
                    <MenuButton
                      fontFamily="Noto Sans Lao, sans-serif"
                      as={Button}
                      rightIcon={<ChevronDownIcon />}
                      width="100%"
                    >
                      {editSelectedLabel}
                    </MenuButton>

                    <MenuList p={2}>
                      <Input
                        placeholder="ຄົ້ນຫາ..."
                        value={editSearch}
                        onChange={(e) => setEditSearch(e.target.value)}
                        mb={2}
                      />

                      <Box maxH="200px" overflowY="auto">
                        {editFiltered.map((item) => (
                          <MenuItem
                            key={item._id}
                            onClick={() => {
                              setEditCategory(item._id);
                              setEditForm({
                                ...editForm,
                                categoryId: item._id,
                              });
                              setEditSearch("");
                            }}
                          >
                            {item.name} - {laoType[item.type]}
                          </MenuItem>
                        ))}
                      </Box>
                    </MenuList>
                  </Menu>

                  <Box
                    minW="180px"
                    bg="gray.50"
                    border="1px solid"
                    borderColor="gray.200"
                    px={3}
                    py={2}
                    borderRadius="md"
                  >
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      fontSize="sm"
                      color="gray.600"
                      mb={1}
                    >
                      ທີ່ເລືອກ:
                    </Text>

                    <Text
                      fontWeight="bold"
                      fontFamily="Noto Sans Lao, sans-serif"
                    >
                      {editForm?.categoryId?.name} -{" "}
                      {laoType[editForm?.categoryId?.type]}
                    </Text>
                  </Box>
                </HStack>

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
                <FormControl>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ວິທີການຊຳລະ
                  </FormLabel>

                  <Select
                    placeholder="ເລືອກວິທີຊຳລະ"
                    value={editForm.paymentMethods}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        paymentMethods: e.target.value,
                      })
                    }
                    fontFamily="Noto Sans Lao, sans-serif"
                  >
                    <option value="cash">ເງິນສົດ</option>
                    <option value="bank">ເງິນໂອນ</option>
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
              onClick={() => updateAdvanceA(editing._id, editForm)}
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
                    {/* <option value="additional_request">
                      ເບີກເພີ່ມ (additional_request)
                    </option> */}
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
              onClick={() => addTransactionA(transTarget._id, transForm)}
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
              <Box mt={4}>
                <Text
                  fontWeight="800"
                  fontFamily="Noto Sans Lao, sans-serif"
                  mb={2}
                >
                  ຊຳລະຜ່ານ:
                </Text>

                <VStack align="start" spacing={3}>
                  {detail?.amount_requested?.map((a, index) => (
                    <Box
                      key={index}
                      borderWidth="1px"
                      borderRadius="lg"
                      p={3}
                      w="100%"
                      bg="gray.50"
                      _dark={{ bg: "gray.700" }}
                      boxShadow="sm"
                    >
                      <HStack justify="space-between">
                        <Box>
                          <Text
                            fontFamily="Noto Sans Lao, sans-serif"
                            fontSize="sm"
                            fontWeight="700"
                          >
                            {a?.account?.type === "bank"
                              ? "💳 ບັນຊີທະນາຄານ"
                              : "💰 ບັນຊີເງິນສົດ"}
                          </Text>

                          {/* Bank */}
                          {a?.account?.type === "bank" && (
                            <>
                              <Text
                                fontFamily="Noto Sans Lao, sans-serif"
                                fontSize="sm"
                              >
                                ທະນາຄານ: {a?.account?.bankName}
                              </Text>
                              <Text
                                fontFamily="Noto Sans Lao, sans-serif"
                                fontSize="sm"
                              >
                                ເລກບັນຊີ: {a?.account?.accountNumber}
                              </Text>
                            </>
                          )}

                          {/* Cash */}
                          {a?.account?.type === "cash" && (
                            <Text
                              fontFamily="Noto Sans Lao, sans-serif"
                              fontSize="sm"
                            >
                              ຊື່ບັນຊີ: {a?.account?.name}
                            </Text>
                          )}

                          <Text
                            fontFamily="Noto Sans Lao, sans-serif"
                            fontSize="sm"
                            mt={1}
                          >
                            ເງິນ:{" "}
                            <b>
                              {a?.amount.toLocaleString()} {a?.currency}
                            </b>
                          </Text>
                        </Box>
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              </Box>
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
