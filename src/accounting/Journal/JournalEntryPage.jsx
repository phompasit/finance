// src/pages/journal/JournalEntryPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Flex,
  Text,
  Button,
  Input,
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
} from "@chakra-ui/react";
import {
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Eye,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import {
  createJournal,
  updateJournal,
  getJournalById,
  clearMessage,
  clearSelectedJournal,
  getJournals,
  deleteJournal,
} from "../../store/accountingReducer/journalSlice";
import { getAccounts } from "../../store/accountingReducer/chartAccounting"; // adjust if your path differs
import JournalModal from "./JournalModal";
import { useNavigate } from "react-router-dom";
import {
  formatDate,
  shortDesc,
} from "../../components/Income_Expense/formatter";
import JournalFilterModal from "./JournalFilterModal";
import JournalPrintModal from "./JournalPrintModal";
import pdfJournal from "../PDF/pdf";
import { useAuth } from "../../context/AuthContext";
import journalPdfTemplate from "./journalPdfTemplate";
import LedgerLoading from "../../components/Loading";

const PAGE_SIZES = [10, 25, 50];

const JournalEntryPage = () => {
  const dispatch = useDispatch();
  const toast = useToast();
  const { user } = useAuth();
  const {
    journals = [],
    loader,
    success,
    error,
    pagination,
    activeYear,
  } = useSelector((s) => s.journal || {});
  const navigate = useNavigate();

  const [selectedMonth, setSelectedMonth] = useState(null); // 1-12
  // year ที่กำลังดู
  const [selectedYear, setSelectedYear] = useState(null);
  const displayYear = useMemo(
    () => selectedYear || activeYear || new Date().getFullYear(),
    [selectedYear, activeYear]
  );
  const isPastYear = selectedYear && selectedYear < activeYear;
  const isFutureYear = selectedYear && selectedYear > activeYear;

  const isReadOnlyYear = isPastYear; // ✅ อ่านอย่างเดียวเฉพาะอดีต

  ////
  //  const isReadOnlyYear = selectedYear === activeYear;
  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [
      current + 1, // ปีหน้า
      current,
      ...Array.from({ length: 6 }, (_, i) => current - (i + 1)),
    ];
  }, []);

  const getMonthRange = (year, month) => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // วันสุดท้ายของเดือน

    return {
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
    };
  };

  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [filters, setFilters] = useState({
    search: "",
    startDate: "",
    endDate: "",
    currency: "",
    status: "",
  });
  useEffect(() => {
    dispatch(getJournals());
  }, [dispatch]);

  useEffect(() => {
    if (success) {
      toast({ title: success, status: "success" });
      dispatch(clearMessage());
    }
    if (error) {
      toast({ title: error, status: "error" });
      dispatch(clearMessage());
    }
  }, [success, error]);
  // pagination
  const handleDelete = async (id) => {
    try {
      await dispatch(deleteJournal(id)).unwrap();
      // refresh
      dispatch(getJournals());
    } catch (err) {
      toast({ title: err || "Delete failed", status: "error" });
    }
  };

  const handleSelectMonth = (month) => {
    if (selectedMonth === month) {
      setSelectedMonth(null);
      setFilters((prev) => ({ ...prev, startDate: "", endDate: "" }));

      dispatch(
        getJournals({
          ...filters,
          year: displayYear,
          month: month,
          startDate: "",
          endDate: "",
          page: 1,
          limit: pageSize,
        })
      );
      return;
    }
    // ✅ ใช้ displayYear แทน currentYear
    const { startDate, endDate } = getMonthRange(displayYear, month);

    setSelectedMonth(month);
    const newFilter = {
      ...filters,
      startDate,
      endDate,
      year: displayYear,
      month: month,
    };

    setFilters(newFilter);
    setPage(1);

    dispatch(
      getJournals({
        ...newFilter,
        page: 1,
        year: displayYear,
        month: month,
        limit: pageSize,
      })
    );
  };

  const handleApplyFilter = (newFilter) => {
    setFilters(newFilter);
    setPage(1);

    dispatch(
      getJournals({
        ...newFilter,
        page: 1,
        limit: pageSize,
      })
    );
  };
  if (loader) {
    return <LedgerLoading />;
  }
  return (
    <Box p={6}>
      {/* ================= HEADER ================= */}
      <Flex
        justify="space-between"
        align="flex-start"
        mb={6}
        wrap="wrap"
        gap={4}
      >
        <Box>
          <Text
            fontFamily="Noto Sans Lao, sans-serif"
            fontSize="2xl"
            fontWeight="bold"
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

        <HStack spacing={3}>
          <Button
            fontFamily="Noto Sans Lao, sans-serif"
            variant="outline"
            colorScheme="gray"
            onClick={() => setIsFilterOpen(true)}
          >
            ຄົ້ນຫາ
          </Button>

          <Button
            colorScheme="green"
            onClick={() => journalPdfTemplate({ data: journals, user })}
          >
            Print
          </Button>

          <Button
            leftIcon={<Plus size={16} />}
            colorScheme="blue"
            isDisabled={isReadOnlyYear}
            fontFamily="Noto Sans Lao, sans-serif"
            onClick={() => navigate("/journal_add&edit")}
          >
            ເພີ່ມບັນຊີ
          </Button>
        </HStack>
      </Flex>

      {/* ================= YEAR SELECT ================= */}
      <Box
        bg="white"
        p={4}
        mb={4}
        borderRadius="md"
        border="1px solid"
        borderColor="gray.200"
      >
        <Flex align="center" gap={4} wrap="wrap">
          <Text
            fontFamily="Noto Sans Lao, sans-serif"
            fontSize="sm"
            color="gray.600"
          >
            ເລືອກປີ:
          </Text>

          <Select
            w="140px"
            value={selectedYear || activeYear}
            size="sm"
            onChange={(e) => {
              const y = Number(e.target.value);
              setSelectedYear(y);
              setSelectedMonth(null);

              dispatch(
                getJournals({
                  ...filters,
                  year: y,
                  startDate: `${y}-01-01`,
                  endDate: `${y}-12-31`,
                  page: 1,
                  limit: pageSize,
                })
              );
            }}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>

          <HStack mb={2}>
            <Badge fontFamily="Noto Sans Lao, sans-serif" colorScheme="blue">
              ໃຊ້ງານໃນປີ: {displayYear}
            </Badge>
            {isPastYear && (
              <Badge
                fontFamily="Noto Sans Lao, sans-serif"
                colorScheme="orange"
              >
                ຂໍ້ມູນຍ້ອນຫຼັງ
              </Badge>
            )}

            {isFutureYear && (
              <Badge
                fontFamily="Noto Sans Lao, sans-serif"
                colorScheme="purple"
              >
                ປີອະນາຄົດ
              </Badge>
            )}
          </HStack>
        </Flex>
      </Box>

      {/* ================= MONTH SELECT ================= */}
      <Box
        bg="white"
        p={4}
        borderRadius="md"
        border="1px solid"
        borderColor="gray.200"
      >
        <Text
          fontFamily="Noto Sans Lao, sans-serif"
          fontSize="sm"
          color="gray.600"
          mb={3}
        >
          ເລືອກເດືອນ:
        </Text>

        <SimpleGrid columns={[4, 6, 12]} spacing={2}>
          {Array.from({ length: 12 }, (_, i) => {
            const month = i + 1;
            return (
              <Button
                key={month}
                size="sm"
                variant={selectedMonth === month ? "solid" : "outline"}
                colorScheme={selectedMonth === month ? "blue" : "gray"}
                onClick={() => handleSelectMonth(month)}
              >
                {month}
              </Button>
            );
          })}
        </SimpleGrid>
      </Box>

      <Table variant="simple" bg="white" borderRadius="md" overflow="hidden">
        <Thead bg="gray.50">
          <Tr>
            <Th />
            <Th fontFamily="Noto Sans Lao, sans-serif">ລຳດັບ</Th>
            <Th fontFamily="Noto Sans Lao, sans-serif">ວັນທີ/ເດືອນ/ປີ</Th>
            <Th fontFamily="Noto Sans Lao, sans-serif">ຄຳອະທິບາຍ</Th>
            <Th fontFamily="Noto Sans Lao, sans-serif">ເບື້ອງໜີ້ (LAK)</Th>
            <Th fontFamily="Noto Sans Lao, sans-serif">ເບື້ອງມີ (LAK)</Th>

            <Th fontFamily="Noto Sans Lao, sans-serif">ສະຖານະ</Th>
            <Th fontFamily="Noto Sans Lao, sans-serif">ກະທຳ</Th>
          </Tr>
        </Thead>
        <Tbody>
          {journals?.map((j, index) => {
            const isOpen = openId === j._id;
            const totalDebit =
              j.totalDebitLAK ||
              (j.lines || []).reduce(
                (s, ln) => s + (ln.side === "dr" ? ln.amountLAK || 0 : 0),
                0
              );
            const totalCredit =
              j.totalCreditLAK ||
              (j.lines || []).reduce(
                (s, ln) => s + (ln.side === "cr" ? ln.amountLAK || 0 : 0),
                0
              );
            return (
              <React.Fragment key={j._id}>
                <Tr>
                  <Td>{index + 1}</Td>
                  <Td>
                    <IconButton
                      aria-label="toggle"
                      size="sm"
                      icon={
                        isOpen ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )
                      }
                      onClick={() => setOpenId(isOpen ? null : j._id)}
                    />
                  </Td>
                  <Td>{formatDate(j.date ? j.date.slice(0, 10) : "")}</Td>
                  <Td>
                    <Text fontWeight="semibold">
                      {shortDesc(j.description)}
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      {j?.reference}
                    </Text>
                  </Td>
                  <Td>{Number(totalDebit)?.toLocaleString()}</Td>
                  <Td>{Number(totalCredit)?.toLocaleString()}</Td>
                  <Td>
                    <Badge
                      colorScheme={j.status === "posted" ? "green" : "orange"}
                    >
                      {j?.status || "draft"}
                    </Badge>
                  </Td>
                  <Td>
                    <HStack>
                      <IconButton
                        aria-label="edit"
                        icon={<Edit size={14} />}
                        isDisabled={isReadOnlyYear}
                        size="sm"
                        onClick={() => {
                          navigate("/journal_add&edit", {
                            state: {
                              editingId: j._id,
                              isReadOnlyYear,
                            },
                          });
                        }}
                      />
                      <IconButton
                        aria-label="details"
                        icon={<Eye size={14} />}
                        size="sm"
                        colorScheme="blue"
                        onClick={() => navigate(`/journal/${j._id}`)}
                      />

                      <IconButton
                        aria-label="delete"
                        icon={<Trash2 size={14} />}
                        isDisabled={isReadOnlyYear}
                        size="sm"
                        colorScheme="red"
                        onClick={() => handleDelete(j._id)}
                      />
                    </HStack>
                  </Td>
                </Tr>

                <Tr>
                  <Td colSpan={8} p={0}>
                    <Collapse in={isOpen} animateOpacity>
                      <Box p={4} bg="gray.50">
                        <Table size="sm" variant="simple">
                          <Thead>
                            <Tr>
                              <Th fontFamily="Noto Sans Lao, sans-serif">
                                ເລກໝາຍບັນຊີ
                              </Th>
                              <Th fontFamily="Noto Sans Lao, sans-serif">
                                ມູນຄ່າເດິມ (ເບື້ອງໜີ້)
                              </Th>
                              <Th fontFamily="Noto Sans Lao, sans-serif">
                                ມູນຄ່າເດິມ (ເບື້ອງມີ)
                              </Th>
                              <Th fontFamily="Noto Sans Lao, sans-serif">
                                ສະກຸນເງິນ
                              </Th>
                              <Th fontFamily="Noto Sans Lao, sans-serif">
                                ອັດຕາແລກປ່ຽນ
                              </Th>
                              <Th
                                fontFamily="Noto Sans Lao, sans-serif"
                                isNumeric
                              >
                                ຈຳນວນເງິນ (LAK)
                              </Th>
                              <Th fontFamily="Noto Sans Lao, sans-serif">
                                ເບື້ອງໜີ້ (LAK)
                              </Th>
                              <Th fontFamily="Noto Sans Lao, sans-serif">
                                ເບື້ອງມີ (LAK)
                              </Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {(j.lines || []).map((ln, idx) => (
                              <Tr key={idx}>
                                <Td fontFamily="Noto Sans Lao, sans-serif">
                                  {ln.accountId?.code || ln.accountId} -{" "}
                                  {ln.accountId?.name || ""}
                                </Td>
                                <Td isNumeric>
                                  {ln.side === "dr"
                                    ? Number(ln.debitOriginal).toLocaleString()
                                    : "-"}
                                </Td>
                                <Td isNumeric>
                                  {ln.side === "cr"
                                    ? Number(ln.creditOriginal).toLocaleString()
                                    : "-"}
                                </Td>

                                <Td>{ln.currency}</Td>
                                <Td>
                                  {Number(
                                    ln.exchangeRate || 1
                                  ).toLocaleString()}
                                </Td>
                                <Td isNumeric>
                                  {Number(
                                    ln.amountLAK ||
                                      ln.amountOriginal * (ln.exchangeRate || 1)
                                  ).toLocaleString()}
                                </Td>
                                <Td isNumeric>
                                  {ln.side === "dr"
                                    ? Number(ln.amountLAK).toLocaleString()
                                    : "-"}
                                </Td>
                                <Td isNumeric>
                                  {ln.side === "cr"
                                    ? Number(ln.amountLAK).toLocaleString()
                                    : "-"}
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </Box>
                    </Collapse>
                  </Td>
                </Tr>
              </React.Fragment>
            );
          })}
        </Tbody>
      </Table>

      {/* Pagination controls */}
      <Flex justify="space-between" align="center" mt={4}>
        <Box>
          <Text>
            Page {page} / {pagination?.totalPages}
          </Text>
        </Box>

        <HStack>
          <Select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s} / page
              </option>
            ))}
          </Select>
          <Button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Prev
          </Button>
          <Button
            onClick={() =>
              setPage((p) => Math.min(pagination.totalPages, p + 1))
            }
            disabled={page === pagination.totalPages}
          >
            Next
          </Button>
        </HStack>
      </Flex>
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
