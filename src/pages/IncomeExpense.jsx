"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Box,
  Button,
  VStack,
  HStack,
  SimpleGrid,
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
  useColorModeValue,
  Icon,
  useDisclosure,
  Badge,
  Text,
  Container,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from "@chakra-ui/react";
import {
  AddIcon,
  DeleteIcon,
  EditIcon,
  DownloadIcon,
  ViewIcon,
} from "@chakra-ui/icons";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  FileText,
  CreditCard,
} from "lucide-react";
import Select from "react-select";
import { useAuth } from "../context/AuthContext";
import { useDispatch, useSelector } from "react-redux";
import { fetchCategories } from "../store/reducer/partner";
import {
  createIncomeExpense,
  deleteIncomeExpense,
  fetchTransaction,
  removeCurrencyFromServer,
  updateIncomeExpense,
  updateStatusIncomeExpense,
} from "../store/reducer/incomeExpense";
import PaymentCard from "../components/Income_Expense/PaymentCard";
import TransactionTable from "../components/Income_Expense/TransactionTable";
import StatsCard from "../components/Income_Expense/StatsCard";
import FilterSection from "../components/Income_Expense/FilterSection";
import exportPDF from "../components/Income_Expense/exportPrint";
import useStats from "../components/Income_Expense/useStats";
import {
  currencyOptions,
  laoType,
  PAYMENT_METHOD_LABELS,
  status_access,
  statusOptions,
  statusOptions2,
  typeOptions,
} from "../components/Income_Expense/constants";
import { formatDate, shortDesc } from "../components/Income_Expense/formatter";
import Pagination from "../components/Income_Expense/Pagination";
import RenderFields from "../components/Income_Expense/FormFieldsAdd";

// Custom debounce hook
function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

const IncomeExpense = () => {
  const [showFilters, setShowFilters] = useState(false);
  const [views, setViews] = useState(null);
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState(null);

  // Edit state - BUG FIX: Added missing id state
  const [id, setId] = useState(null);

  // Form states
  const [serial, setSerial] = useState("");
  const [type, setType] = useState("income");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("paid");
  const [categoryId, setCategoryId] = useState(null);
  const [note, setNote] = useState("");
  const [status_Ap, setStatusAp] = useState("pending");
  const [amounts, setAmounts] = useState([
    { currency: "LAK", amount: "", accountId: "" },
  ]);

  const [filters, setFilters] = useState({
    search: "",
    dateStart: "",
    dateEnd: "",
    type: "",
    currency: "",
    paymentMethod: "",
    categoryId: "",
    status: "",
    status_Ap: "",
  });

  const { user } = useAuth();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isEdit,
    onOpen: onEditOpen,
    onClose: onEditClose,
  } = useDisclosure();
  const {
    isOpen: isViews,
    onOpen: onOpenViews,
    onClose: onCloseViews,
  } = useDisclosure();
  const {
    isOpen: isWarningIsOpen,
    onOpen: onWarningOpen,
    onClose: onWarningClose,
  } = useDisclosure();

  const cancelRef = useRef();
  const dispatch = useDispatch();
  const toast = useToast();

  // Selectors
  const { categoriesRedu: categories } = useSelector((state) => state.partner);

  const { transactionsRedu: transactionData, loader: Loading } = useSelector(
    (state) => state.incomeExpense
  );
  const {
    records = [],
    total = 0,
    totalPages = 1,
    page: backendPage = 1,
  } = transactionData;

  // Theme colors
  const cardBg = useColorModeValue("white", "gray.800");
  const borderClr = useColorModeValue("gray.200", "gray.700");
  const labelClr = useColorModeValue("gray.700", "gray.300");
  const hoverBg = useColorModeValue("gray.50", "gray.700");
  const tableHeaderBg = useColorModeValue("teal.600", "teal.700");

  const statusColors = {
    pending: "yellow",
    approve: "green",
    cancel: "red",
    reject: "gray",
  };

  const pageSize = 15;
  const debouncedSearch = useDebounce(filters.search, 300);

  // Memoized filter parameters
  const filterParams = useMemo(() => {
    return Object.fromEntries(
      Object.entries({
        page,
        pageSize,
        search: debouncedSearch,
        startDate: filters.dateStart,
        endDate: filters.dateEnd,
        type: filters.type,
        currency: filters.currency,
        status: filters.status,
        status_Ap: filters.status_Ap,
      }).filter(([_, v]) => v !== "" && v !== null && v !== undefined)
    );
  }, [
    page,
    debouncedSearch,
    filters.dateStart,
    filters.dateEnd,
    filters.type,
    filters.currency,
    filters.status,
    filters.status_Ap,
  ]);

  useEffect(() => {
    dispatch(fetchCategories());
  }, []); // ลบ dispatch ออกจาก dependencies - fetch ครั้งเดียวตอน mount

  useEffect(() => {
    dispatch(fetchTransaction(filterParams));
  }, [dispatch, filterParams]); // ใช้ filterParams โดยตรง ไม่ต้อง stringify

  // Memoized options

  const paymentOptions = useMemo(
    () =>
      Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => ({
        value: key,
        label: label,
      })),
    [PAYMENT_METHOD_LABELS]
  );

  const status_income_expense = useMemo(
    () => ({
      income: "ລາຍຮັບ",
      expense: "ລາຍຈ່າຍ",
    }),
    []
  );

  const bankOptions = useMemo(
    () =>
      (user?.companyId?.bankAccounts || []).map((b) => ({
        label: `${b.bankName} (${b.currency})`,
        value: b._id,
        currency: b.currency,
      })),
    [user?.companyId?.bankAccounts]
  );

  const cashOptions = useMemo(
    () =>
      (user?.companyId?.cashAccounts || []).map((b) => ({
        label: `${b.name} (${b.currency})`,
        value: b._id,
        currency: b.currency,
      })),
    [user?.companyId?.cashAccounts]
  );

  const categoryOptions = useMemo(
    () =>
      categories?.map((c) => ({
        value: c._id,
        label: `${c.name} (${laoType[c.type] || c.type})`,
      })),
    [categories]
  );
  // Format date
  const formatDateString = useCallback((dateString) => {
    return formatDate(dateString);
  }, []);

  const offset = (page - 1) * pageSize;
  const pageData = records || [];
  const stats = useStats(pageData);

  // Reset form function
  const resetForm = useCallback(() => {
    setId(null);
    setSerial("");
    setType("income");
    setPaymentMethod("cash");
    setDescription("");
    setDate("");
    setStatus("paid");
    setCategoryId(null);
    setNote("");
    setStatusAp("pending");
    setAmounts([{ currency: "LAK", amount: "", accountId: "" }]);
  }, []);
 
  // Currency operations - BUG FIX: Simplified logic
  const addCurrency = useCallback(() => {
    setAmounts((prev) => [
      ...prev,
      { currency: "LAK", amount: "", accountId: "" },
    ]);
  }, []);

  const removeCurrency = useCallback(
    async (currencyIndex, transactionId = null) => {
      if (transactionId) {
        try {
          await dispatch(
            removeCurrencyFromServer({
              currencyIndex: currencyIndex,
              index: transactionId,
            })
          ).unwrap();
        } catch (error) {
          toast({
            title: "ເກີດຂໍ້ຜິດພາດ",
            description: error?.message || "ບໍ່ສາມາດລົບສະກຸນເງິນ",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
          return;
        }
      }
      setAmounts((prev) => prev.filter((_, i) => i !== currencyIndex));
    },
    [dispatch, toast]
  );

  const updateCurrency = useCallback((currencyIndex, field, value) => {
    setAmounts((prev) => {
      const newArr = [...prev];
      newArr[currencyIndex] = {
        ...newArr[currencyIndex],
        [field]: value,
      };
      return newArr;
    });
  }, []);

  // Validation
  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!serial) newErrors.serial = "ກະລຸນາປ້ອນເລກທີ່";
    if (!description) newErrors.description = "ກະລຸນາປ້ອນລາຍລະອຽດ";
    if (!type) newErrors.type = "ກະລຸນາເລືອກປະເພດ";
    if (!paymentMethod) newErrors.paymentMethod = "ກະລຸນາເລືອກວິທີຈ່າຍ";
    if (!date) newErrors.date = "ກະລຸນາເລືອກວັນທີ";
    if (!note) newErrors.note = "ກະລຸນາປ້ອນໝາຍເຫດ";

    const hasValidAmount = amounts.some((item) => parseFloat(item.amount) > 0);
    if (!hasValidAmount) {
      newErrors.amounts = "ຈຳນວນເງິນຕ້ອງຫຼາຍກວ່າ 0";
    }

    return newErrors;
  }, [serial, description, type, paymentMethod, date, note, amounts]);

  // Submit handler
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      const errors = validateForm();
      if (Object.keys(errors).length > 0) {
        toast({
          title: "ກະລຸນາລະບຸຂໍ້ມູນໃຫ້ຄົບຖ້ວນ",
          description: Object.values(errors).join(", "),
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      try {
        const response = await dispatch(
          createIncomeExpense({
            transactions: {
              serial,
              description,
              type,
              paymentMethod,
              date,
              amounts,
              note,
              status,
              status_Ap: "pending",
              categoryId,
            },
          })
        ).unwrap();

        if (response?.success) {
          toast({
            title: "ສຳເລັດ",
            description: "ບັນທຶກລາຍການສຳເລັດ",
            status: "success",
            duration: 3000,
            isClosable: true,
          });

          resetForm();
          onClose();
          setSelectedTransactions([]);
        } else {
          toast({
            title: "ກະລຸນາກວດສອບຄືນ",
            description: response?.message || "ເກີດຂໍ້ຜິດພາດ",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
        }
      } catch (error) {
        toast({
          title: "ເກີດຂໍ້ຜິດພາດ",
          description: error?.message || "Server error",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    },
    [
      validateForm,
      dispatch,
      onClose,
      toast,
      resetForm,
      serial,
      description,
      type,
      paymentMethod,
      date,
      amounts,
      note,
      status,
      categoryId,
    ]
  );

  // Edit handler - BUG FIX: Added proper edit data population
  const handleEditClick = useCallback(
    (transaction) => {
      setId(transaction._id);
      setSerial(transaction.serial || "");
      setType(transaction.type || "income");
      setPaymentMethod(transaction.paymentMethod || "cash");
      setDescription(transaction.description || "");
      setDate(transaction.date ? transaction.date.split("T")[0] : "");
      setStatus(transaction.status || "paid");
      setCategoryId(transaction.categoryId?._id || null);
      setNote(transaction.note || "");
      setStatusAp(transaction.status_Ap || "pending");
      setAmounts(
        transaction.amounts || [{ currency: "LAK", amount: "", accountId: "" }]
      );
      onEditOpen();
    },
    [onEditOpen]
  );

  const handleEdit = useCallback(async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      toast({
        title: "ກະລຸນາລະບຸຂໍ້ມູນໃຫ້ຄົບຖ້ວນ",
        description: Object.values(errors).join(", "),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const response = await dispatch(
        updateIncomeExpense({
          id,
          Editdata: {
            serial,
            description,
            type,
            paymentMethod,
            date,
            amounts,
            note,
            status,
            status_Ap: "pending",
            categoryId,
          },
        })
      ).unwrap();

      if (response?.success) {
        toast({
          title: "ສຳເລັດ",
          description: "ແກ້ໄຂລາຍການສຳເລັດ",
          status: "success",
          duration: 3000,
          isClosable: true,
        });

        resetForm();
        onEditClose();
        setSelectedTransactions([]);
      } else {
        toast({
          title: "ເກີດຂໍ້ຜິດພາດ",
          description: response.message || "ບໍ່ສາມາດແກ້ໄຂຂໍ້ມູນ",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: "ເກີດຂໍ້ຜິດພາດ",
        description: error?.message || "Server Error",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  }, [
    validateForm,
    dispatch,
    id,
    serial,
    description,
    type,
    paymentMethod,
    date,
    amounts,
    note,
    status,
    categoryId,
    toast,
    resetForm,
    onEditClose,
  ]);

  // Delete handlers
  const handleDelete = useCallback(
    async (transactionId) => {
      try {
        await dispatch(deleteIncomeExpense(transactionId)).unwrap();

        toast({
          title: "ສຳເລັດ",
          description: "ລຶບລາຍການສຳເລັດ",
          status: "success",
          duration: 3000,
          isClosable: true,
        });

        await dispatch(fetchTransaction(filterParams));
      } catch (error) {
        toast({
          title: "ເກີດຂໍ້ຜິພາດ",
          description: error?.message || "ບໍ່ສາມາດລົບລາຍການ",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    },
    [dispatch, filterParams, toast]
  );

  const onDeleteClick = useCallback(
    (transactionId) => {
      setDeleteId(transactionId);
      onWarningOpen();
    },
    [onWarningOpen]
  );

  const confirmDelete = useCallback(() => {
    if (deleteId) {
      handleDelete(deleteId);
      onWarningClose();
    }
  }, [deleteId, handleDelete, onWarningClose]);

  // View handler
  const handleViews = useCallback(
    (data) => {
      setViews(data);
      onOpenViews();
    },
    [onOpenViews]
  );

  // Status update handler
  const handleStatus = useCallback(
    async (data, newStatus) => {
      try {
        if (data.type === "income") return;

        await dispatch(
          updateStatusIncomeExpense({
            id: data._id,
            status: newStatus,
          })
        ).unwrap();

        toast({
          title: "ສຳເລັດ",
          description: `${newStatus} ສຳເລັດແລ້ວ`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });

        await dispatch(fetchTransaction(filterParams));
      } catch (error) {
        toast({
          title: "ເກີດຂໍ້ຜິພາດ",
          description: error?.message || "ກະລຸນາລອງໃໝ່",
          status: "error",
          duration: 2000,
          isClosable: true,
        });
      }
    },
    [dispatch, filterParams, toast]
  );

  // Modal close handlers with reset
  const handleModalClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleEditModalClose = useCallback(() => {
    resetForm();
    onEditClose();
  }, [resetForm, onEditClose]);
  return (
    <Box>
      <Container maxW="container.xl">
        {/* Header */}
        <Flex justify="space-between" align="center" mb={8}>
          <HStack spacing={4}>
            <Icon as={DollarSign} boxSize={8} color="teal.500" />
            <Heading
              fontFamily="Noto Sans Lao, sans-serif"
              size="xl"
              bgGradient="linear(to-r, teal.400, blue.500)"
              bgClip="text"
            >
              ລາຍຮັບ-ລາຍຈ່າຍ
            </Heading>
          </HStack>
          <HStack spacing={3}>
            <Button
              fontFamily="Noto Sans Lao, sans-serif"
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
          {Object.entries(stats).map(([currency, data]) => (
            <StatsCard key={currency} currency={currency} data={data} />
          ))}
        </SimpleGrid>

        {/* Search and Filter */}
        <FilterSection
          filters={filters}
          setFilters={setFilters}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          cardBg={cardBg}
          borderClr={borderClr}
          labelClr={labelClr}
          hoverBg={hoverBg}
          paymentMethodLabels={PAYMENT_METHOD_LABELS}
        />

        {/* Export Buttons */}
        <HStack mb={4} spacing={3}>
          <Button
            leftIcon={<DownloadIcon />}
            colorScheme="teal"
            variant="outline"
            onClick={() =>
              exportPDF({
                selectedTransactions,
                user,
                formatDate,
                status_income_expense,
                toast,
              })
            }
            isDisabled={selectedTransactions.length === 0}
            rounded="lg"
          >
            Print ({selectedTransactions.length})
          </Button>

          <Text
            fontFamily="Noto Sans Lao, sans-serif"
            fontSize="sm"
            color={labelClr}
          >
            ເລືອກ {selectedTransactions.length} ລາຍການ
          </Text>
        </HStack>

        {/* Transactions Table */}
        <Box overflowX="auto">
          {!Loading && (
            <TransactionTable
              tableHeaderBg={tableHeaderBg}
              hoverBg={hoverBg}
              labelClr={labelClr}
              pageData={pageData}
              offset={offset}
              selectedTransactions={selectedTransactions}
              setSelectedTransactions={setSelectedTransactions}
              paymentMethodLabels={PAYMENT_METHOD_LABELS}
              status_Ap={status_access}
              statusColors={statusColors}
              shortDesc={shortDesc}
              formatDate={formatDateString}
              user={user}
              handleStatus={handleStatus}
              handleViews={handleViews}
              onDeleteClick={onDeleteClick}
              handleEditClick={handleEditClick}
              EditIcon={EditIcon}
              ViewIcon={ViewIcon}
              DeleteIcon={DeleteIcon}
              FileText={FileText}
              Calendar={Calendar}
            />
          )}
        </Box>

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
            fontFamily="Noto Sans Lao, sans-serif"
            fontSize="sm"
            color={labelClr}
          >
            ສະແດງ {pageData.length} ລາຍການຈາກທັງໝົດ {total} ລາຍການ
          </Text>
          <Pagination
            page={page}
            totalPages={totalPages}
            setPage={(p) => setPage(p)}
          />
          <Text
            fontFamily="Noto Sans Lao, sans-serif"
            fontSize="sm"
            color={labelClr}
          >
            ອັບເດດລ່າສຸດ: {new Date().toLocaleString("lo-LA")}
          </Text>
        </Flex>
      </Container>

      {/* Add Modal */}
      <Modal
        isOpen={isOpen}
        onClose={handleModalClose}
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
                fontFamily="Noto Sans Lao, sans-serif"
                size="md"
                bgGradient="linear(to-r, teal.400, blue.500)"
                bgClip="text"
              >
                ເພີ່ມລາຍຮັບ / ລາຍຈ່າຍ
              </Heading>
            </HStack>
          </ModalHeader>
          <ModalCloseButton rounded="full" top={4} right={4} />

          <ModalBody fontFamily="Noto Sans Lao, sans-serif" py={6}>
            {isOpen && (
              <RenderFields
                labelClr={labelClr}
                cardBg={cardBg}
                borderClr={borderClr}
                serial={serial}
                setSerial={setSerial}
                type={type}
                setType={setType}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                description={description}
                setDescription={setDescription}
                date={date}
                setDate={setDate}
                status={status}
                setStatus={setStatus}
                categoryId={categoryId}
                setCategoryId={setCategoryId}
                note={note}
                setNote={setNote}
                status_Ap={status_Ap}
                typeOptions={typeOptions}
                paymentOptions={paymentOptions}
                statusOptions={statusOptions}
                categoryOptions={categoryOptions}
                currencyOptions={currencyOptions}
                cashOptions={cashOptions}
                bankOptions={bankOptions}
                amounts={amounts}
                addCurrency={addCurrency}
                removeCurrency={removeCurrency}
                updateCurrency={updateCurrency}
                id={id}
              />
            )}
          </ModalBody>

          <ModalFooter borderTop="1px" borderColor={borderClr}>
            <Button
              fontFamily="Noto Sans Lao, sans-serif"
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
              fontFamily="Noto Sans Lao, sans-serif"
              variant="ghost"
              onClick={handleModalClose}
              rounded="xl"
            >
              ຍົກເລີກ
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEdit}
        onClose={handleEditModalClose}
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
                fontFamily="Noto Sans Lao, sans-serif"
                size="md"
                bgGradient="linear(to-r, teal.400, blue.500)"
                bgClip="text"
              >
                ແກ້ໄຂລາຍຮັບ / ລາຍຈ່າຍ
              </Heading>
            </HStack>
          </ModalHeader>
          <ModalCloseButton rounded="full" top={4} right={4} />

          <ModalBody fontFamily="Noto Sans Lao, sans-serif" py={6}>
            <RenderFields
              labelClr={labelClr}
              cardBg={cardBg}
              borderClr={borderClr}
              serial={serial}
              setSerial={setSerial}
              type={type}
              setType={setType}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              description={description}
              setDescription={setDescription}
              date={date}
              setDate={setDate}
              status={status}
              setStatus={setStatus}
              categoryId={categoryId}
              setCategoryId={setCategoryId}
              note={note}
              setNote={setNote}
              status_Ap={status_Ap}
              typeOptions={typeOptions}
              paymentOptions={paymentOptions}
              statusOptions={statusOptions}
              categoryOptions={categoryOptions}
              currencyOptions={currencyOptions}
              cashOptions={cashOptions}
              bankOptions={bankOptions}
              amounts={amounts}
              addCurrency={addCurrency}
              removeCurrency={removeCurrency}
              updateCurrency={updateCurrency}
              id={id}
            />
          </ModalBody>

          <ModalFooter borderTop="1px" borderColor={borderClr}>
            <Button
              fontFamily="Noto Sans Lao, sans-serif"
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
              fontFamily="Noto Sans Lao, sans-serif"
              variant="ghost"
              onClick={handleEditModalClose}
              rounded="xl"
            >
              ຍົກເລີກ
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={isViews}
        onClose={onCloseViews}
        size="4xl"
        isCentered
        motionPreset="slideInBottom"
      >
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(10px)" />
        <ModalContent>
          <ModalCloseButton rounded="full" top={4} right={4} />
          <ModalBody fontFamily="Noto Sans Lao, sans-serif" py={6}>
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
                <HStack spacing={2}>
                  <Icon
                    as={views?.type === "income" ? TrendingUp : TrendingDown}
                    color={views?.type === "income" ? "green.500" : "red.500"}
                  />
                  <Badge
                    fontFamily="Noto Sans Lao, sans-serif"
                    px={3}
                    py={1}
                    rounded="full"
                    colorScheme={views?.type === "income" ? "green" : "red"}
                    fontSize="sm"
                  >
                    {views?.type === "income" ? "📈 ລາຍຮັບ" : "📉 ລາຍຈ່າຍ"}
                  </Badge>
                </HStack>

                <Divider orientation="vertical" />

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
                      : views?.paymentMethod === "bank_transfer"
                      ? "🏦 ໂອນເງິນ"
                      : views?.paymentMethod}
                  </Badge>
                </VStack>

                <Divider orientation="vertical" />

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
                    {views?.date ? formatDateString(views.date) : "-"}
                  </Text>
                </VStack>

                {views?.categoryId && (
                  <>
                    <Divider orientation="vertical" />
                    <VStack spacing={1} align="start">
                      <HStack spacing={1}>
                        <Icon as={FileText} boxSize={4} color="blue.500" />
                        <Text
                          fontFamily="Noto Sans Lao, sans-serif"
                          fontSize="sm"
                          color="gray.500"
                        >
                          ໝວດໝູ່
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
                        {views?.categoryId?.name} -{" "}
                        {laoType[views?.categoryId?.type]}
                      </Badge>
                    </VStack>
                  </>
                )}
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

              <VStack spacing={1} align="start" flex={1}>
                <Text
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontSize="sm"
                  color="gray.500"
                >
                  ສະຖານະການຊຳລະເງິນ
                </Text>
                <Badge colorScheme={statusColors[views?.status] || "gray"}>
                  {statusOptions2[views?.status] || views?.status}
                </Badge>
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
                    <PaymentCard key={index} amount={amount} index={index} />
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
                  {views?.createdAt
                    ? new Date(views.createdAt).toLocaleString("lo-LA")
                    : "-"}
                </Text>
              </Box>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isWarningIsOpen}
        leastDestructiveRef={cancelRef}
        onClose={onWarningClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader
              fontFamily="Noto Sans Lao, sans-serif"
              fontSize="lg"
              fontWeight="bold"
            >
              ຢືນຢັນການລົບ
            </AlertDialogHeader>

            <AlertDialogBody fontFamily="Noto Sans Lao, sans-serif">
              ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບລາຍການນີ້? ການກະທຳນີ້ບໍ່ສາມາດຍົກເລີກໄດ້.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button
                fontFamily="Noto Sans Lao, sans-serif"
                ref={cancelRef}
                onClick={onWarningClose}
              >
                ຍົກເລີກ
              </Button>
              <Button
                fontFamily="Noto Sans Lao, sans-serif"
                colorScheme="red"
                onClick={confirmDelete}
                ml={3}
              >
                ລົບ
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default IncomeExpense;
