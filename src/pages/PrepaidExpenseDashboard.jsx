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
import api from "../api/api";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    dateFrom: "",
    dateTo: "",
  });
  // Modal states
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
  const [transTarget, setTransTarget] = useState(null);
  const [transForm, setTransForm] = useState(INITIAL_TRANS_FORM);
  const [detail, setDetail] = useState();
  // Computed values with useMemo
  const dispatch = useDispatch();
  const { advancesList: advances } = useSelector((state) => state.advance);
  const filteredAdvances = advances;
  const [page, setPage] = useState(1);
  const { pagination } = useSelector((s) => s.advance);
  const totalPages = pagination?.totalPages || 1;
  const pageData = advances;
  // API calls

  const fetchC = useCallback(async () => {
    try {
      setLoading(true);

      await Promise.all([
        dispatch(fetchCategories()).unwrap(),
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
  const deleteAdvanceA = async (id) => {
    const result = await Swal.fire({
      title: "ຢືນຢັນການລົບ",
      text: "ທ່ານແນ່ໃຈວ່າຈະລົບລາຍການນີ້?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e53e3e",
      cancelButtonColor: "#718096",
      confirmButtonText: "ລົບ",
      cancelButtonText: "ຍົກເລີກ",
    });

    if (!result.isConfirmed) return;

    try {
      // optional: loading popup
      Swal.fire({
        title: "ກໍາລັງລົບ...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const response = await dispatch(deleteAdvance(id)).unwrap();

      if (!response?.success) {
        throw new Error(response?.message || "ບໍ່ສາມາດລົບຂໍ້ມູນໄດ້");
      }

      // update local state
      setSelected((prev) => prev.filter((selId) => selId !== id));
      await fetchC();

      Swal.fire({
        title: "ລົບສໍາເລັດ",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Delete advance error:", err);

      Swal.fire({
        title: "ລົບບໍ່ສໍາເລັດ",
        text: err.message || "ເກີດຂໍ້ຜິດພາດ",
        icon: "error",
      });
    }
  };

  // Add transaction
  const addTransactionA = async (
    advanceId,
    { type, amount, note, currency }
  ) => {
    if (!amount || parseFloat(amount) <= 0) {
      Swal.fire({
        title: "ກະລຸນາກອກຈໍານວນເງິນທີ່ຖືກຕ້ອງ",
        icon: "error",
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
        Swal.fire({
          title: "ເກີດຂໍ້ຜິດພາດ",
          text: json.message || "ບໍ່ສາມາດເພີ່ມລາຍການໄດ້",
          icon: "error",
        });
      }
      Swal.fire({
        title: "ເພີ່ມລາຍການສໍາເລັດ",
        text: "ສຳເລັດ",
        icon: "success",
      });
      setTransForm(INITIAL_TRANS_FORM);
      onTransClose();
      await fetchC();
      setSelected([]);
    } catch (err) {
      console.error("Add transaction error:", err);
      Swal.fire({
        title: "ບໍ່ສາມາດເພີ່ມລາຍການໄດ້",
        text: err.message || "ບໍ່ສາມາດປິດລາຍການໄດ້",
        icon: "error",
      });
    }
  };

  // Close advance
  const closeAdvanceA = async (advanceId) => {
    // 1️⃣ Confirm
    const result = await Swal.fire({
      title: "ຢືນຢັນການປິດລາຍການ",
      text: "ທ່ານແນ່ໃຈວ່າຈະປິດລາຍການນີ້?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e53e3e",
      cancelButtonColor: "#718096",
      confirmButtonText: "ປິດລາຍການ",
      cancelButtonText: "ຍົກເລີກ",
    });

    if (!result.isConfirmed) return;

    try {
      // 2️⃣ Loading
      Swal.fire({
        title: "ກໍາລັງປິດລາຍການ...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const response = await dispatch(
        closeAdvance({
          advanceId,
          remarks: "",
        })
      ).unwrap();

      if (!response?.success) {
        throw new Error(response?.message || "ບໍ່ສາມາດປິດລາຍການໄດ້");
      }

      await fetchC();

      // 3️⃣ Success
      Swal.fire({
        title: "ປິດລາຍການສໍາເລັດ",
        text: "ລາຍການຖືກປິດແລ້ວ",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Close advance error:", err);

      // 4️⃣ Error
      Swal.fire({
        title: "ປິດລາຍການບໍ່ສໍາເລັດ",
        text: err?.message || "ມີບາງຢ່າງຜິດພາດ",
        icon: "error",
      });
    }
  };

  // Reopen advance
  const reopenAdvanceA = async (advanceId) => {
    const result = await Swal.fire({
      title: "ຢືນຢັນການເປີດຄືນ",
      text: "ທ່ານແນ່ໃຈວ່າຈະເປີດລາຍການນີ້ຄືນ?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3182ce",
      cancelButtonColor: "#718096",
      confirmButtonText: "ເປີດຄືນ",
      cancelButtonText: "ຍົກເລີກ",
    });

    if (!result.isConfirmed) return;

    try {
      // Loading
      Swal.fire({
        title: "ກໍາລັງເປີດຄືນ...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const response = await dispatch(reopenAdvance(advanceId)).unwrap();

      if (!response?.success) {
        throw new Error(response?.message || "ບໍ່ສາມາດເປີດລາຍການໄດ້");
      }

      await fetchC();

      Swal.fire({
        title: "ເປີດລາຍການສໍາເລັດ",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Reopen advance error:", err);

      Swal.fire({
        title: "ເກີດຂໍ້ຜິດພາດ",
        text: err?.message || err?.response?.data?.message || "ມີບາງຢ່າງຜິດພາດ",
        icon: "error",
      });
    }
  };

  // Selection handlers

  // เช็คว่าถูกเลือกหมดไหม
  const allChecked = selected.length === filteredAdvances.length;
  const isIndeterminate = selected.length > 0 && !allChecked;
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
    const result = await Swal.fire({
      title: "ຢືນຢັນການລົບ",
      text: `ທ່ານແນ່ໃຈວ່າຈະລົບລາຍການ "${getTransactionTypeText(item.type)}" ?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e53e3e",
      cancelButtonColor: "#718096",
      confirmButtonText: "ລົບ",
      cancelButtonText: "ຍົກເລີກ",
    });

    if (!result.isConfirmed) return;

    try {
      // Loading
      Swal.fire({
        title: "ກໍາລັງລົບ...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const { data } = await api.patch(
        `/api/advances/transation/${id}/${item._id}`
      );

      if (!data) {
        throw new Error(data?.message || "ບໍ່ສາມາດລົບລາຍການໄດ້");
      }

      await fetchC();
      onTransClose();

      Swal.fire({
        title: "ລົບສໍາເລັດ",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Delete transaction error:", err);

      Swal.fire({
        title: "ລົບບໍ່ສໍາເລັດ",
        text: err.response.data.message ||  "ມີບາງຢ່າງຜິດພາດ",
        icon: "error",
      });
    }
  };
  const handleStatus = async (id, status) => {
    const result = await Swal.fire({
      title: "ຢືນຢັນການປ່ຽນສະຖານະ",
      text: `ທ່ານແນ່ໃຈວ່າຈະປ່ຽນສະຖານະເປັນ "${status}" ?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3182ce",
      cancelButtonColor: "#718096",
      confirmButtonText: "ຢືນຢັນ",
      cancelButtonText: "ຍົກເລີກ",
    });

    if (!result.isConfirmed) return;

    try {
      // Loading state
      Swal.fire({
        title: "ກໍາລັງດໍາເນີນການ...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const endpoint = `/api/advances/advance/${id}`;
      const { data } = await api.patch(endpoint, { status_Ap: status });
      if (!data) {
        throw new Error(data?.message || "ປ່ຽນສະຖານະບໍ່ສໍາເລັດ");
      }

      await fetchC();

      Swal.fire({
        title: "ສໍາເລັດ",
        text: `ປ່ຽນສະຖານະເປັນ "${status}" ສໍາເລັດແລ້ວ`,
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Update status error:", error);

      Swal.fire({
        title: "ປ່ຽນສະຖານະບໍ່ສໍາເລັດ",
        text:
          error?.response?.data?.message ||
          error.message ||
          "ບໍ່ສາມາດປ່ຽນສະຖານະໄດ້",
        icon: "error",
      });
    }
  };
  const navigate = useNavigate();
  const handleSend = useCallback(() => {
    navigate("/form_prepaid_add");
  }, [navigate]);
  const handleSendEdit = useCallback(
    (data) => {
      navigate("/prepaid_form_edit", {
        state: {
          data: data,
        },
      });
    },
    [navigate]
  );

  return (
    <Container maxW="container.xl" py={6}>
      {/* Header */}

      <PrepaidHeader
        selected={selected}
        user={user}
        onAddOpen={handleSend}
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
        handleSendEdit={handleSendEdit}
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
        onEditOpen={onEditOpen}
        setTransTarget={setTransTarget}
        onTransOpen={onTransOpen}
        closeAdvanceA={closeAdvanceA}
        reopenAdvanceA={reopenAdvanceA}
        deleteAdvanceA={deleteAdvanceA}
      />
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
