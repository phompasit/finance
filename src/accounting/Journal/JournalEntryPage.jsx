// src/pages/journal/JournalEntryPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  Flex,
  Text,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Badge,
  Collapse,
  useToast,
  Select,
  HStack,
  SimpleGrid,
  useColorModeValue,
  Tooltip,
  Divider,
  Spinner,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import {
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Eye,
  FileSpreadsheet,
  FileText,
  Search,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import {
  clearMessage,
  getJournals,
  deleteJournal,
} from "../../store/accountingReducer/journalSlice";
import { useNavigate } from "react-router-dom";
import {
  formatDate,
  shortDesc,
} from "../../components/Income_Expense/formatter";
import JournalFilterModal from "./JournalFilterModal";
import JournalPrintModal from "./JournalPrintModal";
import { useAuth } from "../../context/AuthContext";
import journalPdfTemplate from "./journalPdfTemplate";
import journalExcelTemplate from "./journalExcelTemplate";
import LedgerLoading from "../../components/Loading";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const PAGE_SIZES = [10, 25, 50, 100];

const MONTH_LABELS = [
  "ມັງກອນ", "ກຸມພາ", "ມີນາ", "ເມສາ",
  "ພຶດສະພາ", "ມິຖຸນາ", "ກໍລະກົດ", "ສິງຫາ",
  "ກັນຍາ", "ຕຸລາ", "ພະຈິກ", "ທັນວາ",
];

// ─────────────────────────────────────────────────────────────
// Sub-component: Journal Line Detail Table
// ─────────────────────────────────────────────────────────────
const JournalLineTable = ({ lines = [] }) => {
  const thStyle = { fontFamily: "Noto Sans Lao, sans-serif", fontSize: "xs" };
  return (
    <Box p={4} bg="gray.50" borderRadius="md">
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th {...thStyle}>ເລກໝາຍບັນຊີ</Th>
            <Th {...thStyle} isNumeric>ມູນຄ່າ (ໜີ້)</Th>
            <Th {...thStyle} isNumeric>ມູນຄ່າ (ມີ)</Th>
            <Th {...thStyle}>ສ.ງ.</Th>
            <Th {...thStyle} isNumeric>ອັດຕາ</Th>
            <Th {...thStyle} isNumeric>LAK (ໜີ້)</Th>
            <Th {...thStyle} isNumeric>LAK (ມີ)</Th>
          </Tr>
        </Thead>
        <Tbody>
          {lines.map((ln, idx) => {
            const lakAmt =
              ln.amountLAK || ln.amountOriginal * (ln.exchangeRate || 1);
            return (
              <Tr key={idx} _hover={{ bg: "blue.50" }}>
                <Td fontFamily="Noto Sans Lao, sans-serif" fontSize="sm">
                  <Text fontWeight="semibold" color="blue.700">
                    {ln.accountId?.code || ln.accountId}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {ln.accountId?.name || ""}
                  </Text>
                </Td>
                <Td isNumeric fontSize="sm" color="blue.600">
                  {ln.side === "dr"
                    ? Number(ln.debitOriginal || 0).toLocaleString()
                    : "—"}
                </Td>
                <Td isNumeric fontSize="sm" color="green.600">
                  {ln.side === "cr"
                    ? Number(ln.creditOriginal || 0).toLocaleString()
                    : "—"}
                </Td>
                <Td fontSize="sm">
                  <Badge
                    colorScheme={ln.currency === "LAK" ? "gray" : "purple"}
                    size="sm"
                  >
                    {ln.currency}
                  </Badge>
                </Td>
                <Td isNumeric fontSize="sm" color="gray.600">
                  {Number(ln.exchangeRate || 1).toLocaleString()}
                </Td>
                <Td isNumeric fontSize="sm" fontWeight="semibold" color="blue.700">
                  {ln.side === "dr"
                    ? Number(ln.debitLAK || lakAmt || 0).toLocaleString()
                    : "—"}
                </Td>
                <Td isNumeric fontSize="sm" fontWeight="semibold" color="green.700">
                  {ln.side === "cr"
                    ? Number(ln.creditLAK || lakAmt || 0).toLocaleString()
                    : "—"}
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
const JournalEntryPage = () => {
  const dispatch = useDispatch();
  const toast = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const {
    journals = [],
    loader,
    success,
    error,
    pagination,
    activeYear,
  } = useSelector((s) => s.journal || {});

  // ── Year / Month state ──────────────────────────────────────
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);

  const displayYear = useMemo(
    () => selectedYear || activeYear || new Date().getFullYear(),
    [selectedYear, activeYear]
  );
  const isPastYear   = selectedYear && selectedYear < activeYear;
  const isFutureYear = selectedYear && selectedYear > activeYear;
  const isReadOnlyYear = isPastYear;

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [
      current + 1,
      current,
      ...Array.from({ length: 6 }, (_, i) => current - (i + 1)),
    ];
  }, []);

  // ── Pagination & Filter state ───────────────────────────────
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters]   = useState({
    search: "",
    startDate: "",
    endDate: "",
    currency: "",
    status: "",
  });

  // ── UI state ────────────────────────────────────────────────
  const [openId,        setOpenId]        = useState(null);
  const [isFilterOpen,  setIsFilterOpen]  = useState(false);
  const [printModalOpen,setPrintModalOpen]= useState(false);
  const [exporting,     setExporting]     = useState(false);
  const [exportingPdf,  setExportingPdf]  = useState(false);

  const bg         = useColorModeValue("white", "gray.800");
  const borderColor= useColorModeValue("gray.200", "gray.600");
  const headerBg   = useColorModeValue("gray.50", "gray.900");

  // ── Helpers ─────────────────────────────────────────────────
  const getMonthRange = useCallback((year, month) => {
    const lastDay   = new Date(year, month, 0).getDate();
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate   = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return { startDate, endDate };
  }, []);

  const fetchJournals = useCallback(
    (overrides = {}) => {
      dispatch(
        getJournals({
          ...filters,
          page,
          limit: pageSize,
          ...overrides,
        })
      );
    },
    [dispatch, filters, page, pageSize]
  );

  // ── Initial load ────────────────────────────────────────────
  useEffect(() => {
    dispatch(getJournals({ page: 1, limit: pageSize }));
  }, [dispatch]);

  // ── Reload when page / pageSize changes ────────────────────
  useEffect(() => {
    fetchJournals();
  }, [page, pageSize]); // eslint-disable-line

  // ── Toast notifications ─────────────────────────────────────
  useEffect(() => {
    if (success) {
      toast({ title: success, status: "success", duration: 3000, isClosable: true });
      dispatch(clearMessage());
    }
    if (error) {
      toast({ title: error, status: "error", duration: 4000, isClosable: true });
      dispatch(clearMessage());
    }
  }, [success, error]); // eslint-disable-line

  // ── Handlers ────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await dispatch(deleteJournal(id)).unwrap();
      toast({ title: "ລຶບສຳເລັດ", status: "success", duration: 2000 });
      fetchJournals();
    } catch (err) {
      toast({ title: err || "ລຶບບໍ່ສຳເລັດ", status: "error" });
    }
  };

  const handleSelectYear = (y) => {
    setSelectedYear(y);
    setSelectedMonth(null);
    const newFilters = {
      ...filters,
      year: y,
      startDate: `${y}-01-01`,
      endDate: `${y}-12-31`,
    };
    setFilters(newFilters);
    setPage(1);
    dispatch(getJournals({ ...newFilters, page: 1, limit: pageSize }));
  };

  const handleSelectMonth = (month) => {
    if (selectedMonth === month) {
      // Deselect → show whole year
      setSelectedMonth(null);
      const newFilters = {
        ...filters,
        startDate: `${displayYear}-01-01`,
        endDate:   `${displayYear}-12-31`,
      };
      setFilters(newFilters);
      setPage(1);
      dispatch(getJournals({ ...newFilters, page: 1, limit: pageSize }));
      return;
    }
    const { startDate, endDate } = getMonthRange(displayYear, month);
    setSelectedMonth(month);
    const newFilters = { ...filters, startDate, endDate, year: displayYear, month };
    setFilters(newFilters);
    setPage(1);
    dispatch(getJournals({ ...newFilters, page: 1, limit: pageSize }));
  };

  const handleApplyFilter = (newFilter) => {
    setFilters(newFilter);
    setSelectedMonth(null);
    setPage(1);
    dispatch(getJournals({ ...newFilter, page: 1, limit: pageSize }));
  };

  const handleRefresh = () => {
    fetchJournals();
    toast({ title: "ໂຫຼດຂໍ້ມູນໃໝ່ແລ້ວ", status: "info", duration: 1500 });
  };

  // ── Export helpers: fetch ALL data ignoring pagination ──────
  const fetchAllJournals = async () => {
    try {
      // Attempt 1: use Redux thunk and unwrap the result
      const result = await dispatch(
        getJournals({ ...filters, page: 1, limit: 999999 })
      ).unwrap();

      // Handle different API response shapes
      const all =
        result?.journals ||
        result?.data     ||
        result?.items    ||
        (Array.isArray(result) ? result : null);

      if (all && all.length > 0) return all;

      // Attempt 2: fall back to current loaded journals
      // (acceptable when total ≤ current pageSize)
      if (journals.length > 0) return journals;

      return [];
    } catch {
      // Fall back gracefully
      return journals.length > 0 ? journals : [];
    } finally {
      // Restore the user's current view
      dispatch(getJournals({ ...filters, page, limit: pageSize }));
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const allData = await fetchAllJournals();
      if (allData.length === 0) {
        toast({ title: "ບໍ່ມີຂໍ້ມູນສຳລັບ Export", status: "warning" });
        return;
      }
      await journalExcelTemplate({ data: allData, user });
      toast({
        title: `Export Excel ສຳເລັດ (${allData.length} ລາຍການ)`,
        status: "success",
        duration: 3000,
      });
    } catch (err) {
      console.error("Excel export error:", err);
      toast({ title: "Export Excel ບໍ່ສຳເລັດ", status: "error" });
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const allData = await fetchAllJournals();
      if (allData.length === 0) {
        toast({ title: "ບໍ່ມີຂໍ້ມູນສຳລັບ Print", status: "warning" });
        return;
      }
      journalPdfTemplate({ data: allData, user });
      toast({
        title: `Print PDF ສຳເລັດ (${allData.length} ລາຍການ)`,
        status: "success",
        duration: 3000,
      });
    } catch (err) {
      console.error("PDF export error:", err);
      toast({ title: "Print PDF ບໍ່ສຳເລັດ", status: "error" });
    } finally {
      setExportingPdf(false);
    }
  };

  // ── Derived values ──────────────────────────────────────────
  const totalPages = pagination?.totalPages || 1;
  const totalItems = pagination?.total || 0;

  // ── Render ──────────────────────────────────────────────────
  if (loader && journals.length === 0) return <LedgerLoading />;

  return (
    <Box p={{ base: 3, md: 6 }} maxW="100%" overflowX="hidden">

      {/* ═══════════════════════════════════════════════════════
          HEADER
      ═══════════════════════════════════════════════════════ */}
      <Flex
        justify="space-between"
        align="flex-start"
        mb={5}
        wrap="wrap"
        gap={3}
      >
        <Box>
          <Text
            fontFamily="Noto Sans Lao, sans-serif"
            fontSize={{ base: "xl", md: "2xl" }}
            fontWeight="bold"
            color="gray.800"
          >
            ປື້ມບັນຊີປະຈຳວັນ
          </Text>
          <Text
            fontFamily="Noto Sans Lao, sans-serif"
            fontSize="sm"
            color="gray.500"
          >
            ຈັດການບັນຊີຢ່າງເປັນລະບຽບ ແລະ ທັນສະໄໝ
          </Text>
        </Box>

        <HStack spacing={2} flexWrap="wrap">
          {/* Refresh */}
          <Tooltip label="ໂຫຼດຂໍ້ມູນໃໝ່" hasArrow>
            <IconButton
              icon={<RefreshCw size={15} />}
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              isLoading={loader}
              aria-label="refresh"
            />
          </Tooltip>

          {/* Search / Filter */}
          <Button
            leftIcon={<Search size={14} />}
            variant="outline"
            colorScheme="gray"
            size="sm"
            fontFamily="Noto Sans Lao, sans-serif"
            onClick={() => setIsFilterOpen(true)}
          >
            ຄົ້ນຫາ
          </Button>

          {/* Export PDF — all data */}
          <Tooltip
            label={`Print ທັງໝົດ (${totalItems} ລາຍການ)`}
            hasArrow
          >
            <Button
              leftIcon={<FileText size={14} />}
              colorScheme="green"
              size="sm"
              isLoading={exportingPdf}
              loadingText="ກຳລັງດຶງ..."
              onClick={handleExportPdf}
            >
              Print PDF
            </Button>
          </Tooltip>

          {/* Export Excel — all data */}
          <Tooltip
            label={`Export ທັງໝົດ (${totalItems} ລາຍການ)`}
            hasArrow
          >
            <Button
              leftIcon={<FileSpreadsheet size={14} />}
              colorScheme="teal"
              size="sm"
              isLoading={exporting}
              loadingText="ກຳລັງດຶງ..."
              onClick={handleExportExcel}
            >
              Export Excel
            </Button>
          </Tooltip>

          {/* Add new */}
          <Button
            leftIcon={<Plus size={14} />}
            colorScheme="blue"
            size="sm"
            fontFamily="Noto Sans Lao, sans-serif"
            onClick={() => navigate("/journal_add&edit")}
          >
            ເພີ່ມບັນຊີ
          </Button>
        </HStack>
      </Flex>

      {/* ═══════════════════════════════════════════════════════
          YEAR + MONTH SELECTOR
      ═══════════════════════════════════════════════════════ */}
      <Box
        bg={headerBg}
        p={4}
        mb={4}
        borderRadius="lg"
        border="1px solid"
        borderColor={borderColor}
      >
        {/* Year row */}
        <Flex align="center" gap={3} wrap="wrap" mb={3}>
          <Text
            fontFamily="Noto Sans Lao, sans-serif"
            fontSize="sm"
            fontWeight="medium"
            color="gray.600"
            minW="60px"
          >
            ເລືອກປີ:
          </Text>
          <Select
            w="130px"
            size="sm"
            value={selectedYear || activeYear}
            borderRadius="md"
            onChange={(e) => handleSelectYear(Number(e.target.value))}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>

          <HStack spacing={2} flexWrap="wrap">
            <Badge colorScheme="blue" fontFamily="Noto Sans Lao, sans-serif">
              ກຳລັງໃຊ້: {displayYear}
            </Badge>
            {isPastYear && (
              <Badge colorScheme="orange" fontFamily="Noto Sans Lao, sans-serif">
                ຂໍ້ມູນຍ້ອນຫຼັງ
              </Badge>
            )}
            {isFutureYear && (
              <Badge colorScheme="purple" fontFamily="Noto Sans Lao, sans-serif">
                ປີອະນາຄົດ
              </Badge>
            )}
            {(filters.search || filters.currency || filters.status) && (
              <Badge colorScheme="red" fontFamily="Noto Sans Lao, sans-serif">
                ກຳລັງ Filter
              </Badge>
            )}
          </HStack>
        </Flex>

        <Divider mb={3} />

        {/* Month buttons */}
        <Flex align="center" gap={3} wrap="wrap">
          <Text
            fontFamily="Noto Sans Lao, sans-serif"
            fontSize="sm"
            fontWeight="medium"
            color="gray.600"
            minW="60px"
          >
            ເດືອນ:
          </Text>
          <SimpleGrid columns={[4, 6, 12]} spacing={1.5} flex="1">
            {MONTH_LABELS.map((label, i) => {
              const month = i + 1;
              const isSelected = selectedMonth === month;
              return (
                <Button
                  key={month}
                  size="xs"
                  variant={isSelected ? "solid" : "outline"}
                  colorScheme={isSelected ? "blue" : "gray"}
                  onClick={() => handleSelectMonth(month)}
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontSize="10px"
                  h="28px"
                  title={label}
                >
                  {month}
                </Button>
              );
            })}
          </SimpleGrid>
          {selectedMonth && (
            <Text fontSize="xs" color="blue.500" fontFamily="Noto Sans Lao, sans-serif" whiteSpace="nowrap">
              {MONTH_LABELS[selectedMonth - 1]}
            </Text>
          )}
        </Flex>
      </Box>

      {/* ═══════════════════════════════════════════════════════
          SUMMARY BAR
      ═══════════════════════════════════════════════════════ */}
      <Flex
        justify="space-between"
        align="center"
        mb={3}
        px={1}
        flexWrap="wrap"
        gap={2}
      >
        <HStack spacing={3}>
          <Text fontSize="sm" color="gray.600" fontFamily="Noto Sans Lao, sans-serif">
            ທັງໝົດ{" "}
            <Text as="span" fontWeight="bold" color="blue.600">
              {totalItems.toLocaleString()}
            </Text>{" "}
            ລາຍການ
          </Text>
          {loader && <Spinner size="xs" color="blue.400" />}
        </HStack>

        {/* Page size selector */}
        <HStack spacing={2}>
          <Text fontSize="xs" color="gray.500" fontFamily="Noto Sans Lao, sans-serif">
            ສະແດງ:
          </Text>
          <Select
            size="xs"
            w="85px"
            value={pageSize}
            borderRadius="md"
            onChange={(e) => {
              const newSize = Number(e.target.value);
              setPageSize(newSize);
              setPage(1);
              dispatch(getJournals({ ...filters, page: 1, limit: newSize }));
            }}
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>{s} / ໜ້າ</option>
            ))}
          </Select>
        </HStack>
      </Flex>

      {/* ═══════════════════════════════════════════════════════
          TABLE
      ═══════════════════════════════════════════════════════ */}
      <Box
        bg={bg}
        borderRadius="lg"
        border="1px solid"
        borderColor={borderColor}
        overflow="hidden"
        shadow="sm"
      >
        <Box overflowX="auto">
          <Table variant="simple" size="sm">
            <Thead bg={headerBg}>
              <Tr>
                <Th w="36px" />
                <Th
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontSize="xs"
                  w="44px"
                  textAlign="center"
                >
                  #
                </Th>
                <Th fontFamily="Noto Sans Lao, sans-serif" fontSize="xs" w="100px">
                  ວັນທີ
                </Th>
                <Th fontFamily="Noto Sans Lao, sans-serif" fontSize="xs">
                  ລາຍລະອຽດ / ເລກທີ
                </Th>
                <Th fontFamily="Noto Sans Lao, sans-serif" fontSize="xs" isNumeric w="130px">
                  ໜີ້ (LAK)
                </Th>
                <Th fontFamily="Noto Sans Lao, sans-serif" fontSize="xs" isNumeric w="130px">
                  ມີ (LAK)
                </Th>
                <Th fontFamily="Noto Sans Lao, sans-serif" fontSize="xs" w="80px" textAlign="center">
                  ສະຖານະ
                </Th>
                <Th fontFamily="Noto Sans Lao, sans-serif" fontSize="xs" w="110px" textAlign="center">
                  ກະທຳ
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {journals.length === 0 && !loader ? (
                <Tr>
                  <Td colSpan={8} py={12} textAlign="center">
                    <Flex direction="column" align="center" gap={2} color="gray.400">
                      <AlertCircle size={32} />
                      <Text fontFamily="Noto Sans Lao, sans-serif" fontSize="sm">
                        ບໍ່ມີຂໍ້ມູນ
                      </Text>
                    </Flex>
                  </Td>
                </Tr>
              ) : (
                journals.map((j, index) => {
                  const isOpen = openId === j._id;
                  const totalDebit =
                    j.totalDebitLAK ||
                    (j.lines || []).reduce(
                      (s, ln) => s + (ln.side === "dr" ? ln.debitLAK || ln.amountLAK || 0 : 0),
                      0
                    );
                  const totalCredit =
                    j.totalCreditLAK ||
                    (j.lines || []).reduce(
                      (s, ln) => s + (ln.side === "cr" ? ln.creditLAK || ln.amountLAK || 0 : 0),
                      0
                    );
                  const rowBg = index % 2 === 0 ? "transparent" : "gray.50";

                  return (
                    <React.Fragment key={j._id}>
                      {/* ── Main row ── */}
                      <Tr
                        bg={rowBg}
                        _hover={{ bg: "blue.50", transition: "background 0.15s" }}
                        cursor="pointer"
                      >
                        {/* Expand toggle */}
                        <Td p={1} textAlign="center">
                          <IconButton
                            aria-label="toggle"
                            size="xs"
                            variant="ghost"
                            colorScheme={isOpen ? "blue" : "gray"}
                            icon={
                              isOpen
                                ? <ChevronDown size={13} />
                                : <ChevronRight size={13} />
                            }
                            onClick={() => setOpenId(isOpen ? null : j._id)}
                          />
                        </Td>

                        {/* Row number */}
                        <Td textAlign="center" fontSize="xs" color="gray.400">
                          {(page - 1) * pageSize + index + 1}
                        </Td>

                        {/* Date */}
                        <Td fontSize="sm" fontFamily="Noto Sans Lao, sans-serif" whiteSpace="nowrap">
                          {formatDate(j.date ? j.date.slice(0, 10) : "")}
                        </Td>

                        {/* Description + Reference */}
                        <Td>
                          <Text
                            fontWeight="semibold"
                            fontSize="sm"
                            fontFamily="Noto Sans Lao, sans-serif"
                            color="gray.800"
                            noOfLines={1}
                          >
                            {shortDesc(j.description)}
                          </Text>
                          {j.reference && (
                            <Text fontSize="xs" color="blue.500" fontWeight="medium">
                              {j.reference}
                            </Text>
                          )}
                        </Td>

                        {/* Debit */}
                        <Td isNumeric fontSize="sm" color="blue.700" fontWeight="semibold">
                          {Number(totalDebit).toLocaleString()}
                        </Td>

                        {/* Credit */}
                        <Td isNumeric fontSize="sm" color="green.700" fontWeight="semibold">
                          {Number(totalCredit).toLocaleString()}
                        </Td>

                        {/* Status */}
                        <Td textAlign="center">
                          <Badge
                            colorScheme={j.status === "posted" ? "green" : "orange"}
                            fontFamily="Noto Sans Lao, sans-serif"
                            fontSize="10px"
                            borderRadius="full"
                            px={2}
                          >
                            {j.status === "posted" ? "ອະນຸມັດ" : j.status || "draft"}
                          </Badge>
                        </Td>

                        {/* Actions */}
                        <Td textAlign="center">
                          <HStack spacing={1} justify="center">
                            <Tooltip label="ແກ້ໄຂ" hasArrow>
                              <IconButton
                                aria-label="edit"
                                icon={<Edit size={13} />}
                                size="xs"
                                variant="ghost"
                                colorScheme="blue"
                                onClick={() =>
                                  navigate("/journal_add&edit", {
                                    state: { editingId: j._id, isReadOnlyYear },
                                  })
                                }
                              />
                            </Tooltip>
                            <Tooltip label="ລາຍລະອຽດ" hasArrow>
                              <IconButton
                                aria-label="details"
                                icon={<Eye size={13} />}
                                size="xs"
                                variant="ghost"
                                colorScheme="purple"
                                onClick={() => navigate(`/journal/${j._id}`)}
                              />
                            </Tooltip>
                            <Tooltip label="ລຶບ" hasArrow>
                              <IconButton
                                aria-label="delete"
                                icon={<Trash2 size={13} />}
                                size="xs"
                                variant="ghost"
                                colorScheme="red"
                                onClick={() => handleDelete(j._id)}
                              />
                            </Tooltip>
                          </HStack>
                        </Td>
                      </Tr>

                      {/* ── Detail row (expandable) ── */}
                      <Tr>
                        <Td colSpan={8} p={0} border="none">
                          <Collapse in={isOpen} animateOpacity>
                            <JournalLineTable lines={j.lines || []} />
                          </Collapse>
                        </Td>
                      </Tr>
                    </React.Fragment>
                  );
                })
              )}
            </Tbody>
          </Table>
        </Box>
      </Box>

      {/* ═══════════════════════════════════════════════════════
          PAGINATION
      ═══════════════════════════════════════════════════════ */}
      <Flex justify="space-between" align="center" mt={4} flexWrap="wrap" gap={3}>
        {/* Info */}
        <Text fontSize="sm" color="gray.500" fontFamily="Noto Sans Lao, sans-serif">
          ໜ້າ{" "}
          <Text as="span" fontWeight="bold" color="gray.700">{page}</Text>
          {" "}/ {totalPages}
          {" "}·{" "}
          ສະແດງ {((page - 1) * pageSize) + 1}–
          {Math.min(page * pageSize, totalItems)}{" "}
          ຈາກ {totalItems.toLocaleString()} ລາຍການ
        </Text>

        {/* Page buttons */}
        <HStack spacing={1}>
          <Button
            size="xs"
            variant="outline"
            onClick={() => setPage(1)}
            isDisabled={page === 1}
          >
            «
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            isDisabled={page === 1}
            fontFamily="Noto Sans Lao, sans-serif"
          >
            ກ່ອນ
          </Button>

          {/* Page number pills */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const start = Math.max(1, Math.min(page - 2, totalPages - 4));
            const p = start + i;
            if (p > totalPages) return null;
            return (
              <Button
                key={p}
                size="xs"
                variant={p === page ? "solid" : "outline"}
                colorScheme={p === page ? "blue" : "gray"}
                onClick={() => setPage(p)}
                minW="28px"
              >
                {p}
              </Button>
            );
          })}

          <Button
            size="xs"
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            isDisabled={page >= totalPages}
            fontFamily="Noto Sans Lao, sans-serif"
          >
            ຕໍ່ໄປ
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={() => setPage(totalPages)}
            isDisabled={page >= totalPages}
          >
            »
          </Button>
        </HStack>
      </Flex>

      {/* ═══════════════════════════════════════════════════════
          MODALS
      ═══════════════════════════════════════════════════════ */}
      <JournalPrintModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        journals={journals}
        filters={filters}
      />
      <JournalFilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={handleApplyFilter}
        initialFilter={filters}
      />
    </Box>
  );
};

export default JournalEntryPage;