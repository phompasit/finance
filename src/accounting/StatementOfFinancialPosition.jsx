// src/pages/reports/StatementOfFinancialPosition.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Box,
  Flex,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Divider,
  Alert,
  AlertIcon,
  HStack,
  Button,
} from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import { fetchStatement } from "../store/accountingReducer/reportsSlice";
import ReportFilter from "../components/Accounting_component/ReportFilter";
import html2pdf from "html2pdf.js";
import StatementOfFinancialPrint from "./PDF/StatementOfFinancialPrint";
import { useAuth } from "../context/AuthContext";
import LedgerLoading from "../components/Loading";
import { exportBalanceSheetExcel } from "./PDF/excel";
import { formatNum } from "../ีีutils/useAccountTree";

// ─── FILTER MODE ──────────────────────────────────────
const FILTER_MODE = {
  YEAR: "YEAR",
  MONTH: "MONTH",
  PRESET: "PRESET",
  RANGE: "RANGE",
};

// ─── SECTION LABELS ───────────────────────────────────
// แก้: เคยซ้ำ 2 จุด (header + subtotal) → ใช้ map แทน
const SECTION_LABELS = {
  Current_Liabilities: "ໜີ້ສິນໝູນວຽນ I",
  Non_current_Liabilities: "ໜີ້ສິນບໍ່ໝູນວຽນ II",
  Equity: "ທຶນ III",
};

// ─── HELPERS ──────────────────────────────────────────
const formatDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date)) return d;
  return date.toLocaleDateString("en-GB");
};

const getFilterLabel = (filter) => {
  if (!filter) return "";
  switch (filter.mode) {
    case FILTER_MODE.YEAR:
      return `ປີບັນຊີ: ${filter.year}`;
    case FILTER_MODE.MONTH:
      return `ເດືອນ: ${String(filter.month).padStart(2, "0")}/${filter.year}`;
    case FILTER_MODE.RANGE:
      return `ຊ່ວງວັນທີ: ${formatDate(filter.startDate)} – ${formatDate(
        filter.endDate
      )}`;
    case FILTER_MODE.PRESET:
      return `Preset: ${filter.preset}`;
    default:
      return "";
  }
};

// ─── ActiveFilterBar ───────────────────────────────────
// แก้: ย้ายออกจาก component body → ไม่ถูก recreate ทุก render
const ActiveFilterBar = ({ label }) => {
  if (!label) return null;
  return (
    <Box
      px={4}
      py={2}
      border="1px solid"
      borderColor="gray.200"
      borderRadius="md"
      bg="gray.50"
    >
      <HStack spacing={3}>
        <Text
          fontFamily="Noto Sans Lao, sans-serif"
          fontSize="sm"
          color="gray.600"
        >
          ກຳລັງສະແດງຂໍ້ມູນ
        </Text>
        <Badge
          colorScheme="blue"
          px={3}
          py={1}
          borderRadius="full"
          fontFamily="Noto Sans Lao, sans-serif"
          fontSize="0.9em"
        >
          {label}
        </Badge>
      </HStack>
    </Box>
  );
};

// ─── PAGE ─────────────────────────────────────────────
const StatementOfFinancialPosition = () => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const printRef = useRef();

  // แก้: ลบ || {} เพื่อไม่ซ่อน type error → ให้ Redux slice มี initialState ครบ
  const {
    loading,
    error,
    data,
    comparable,
    currentYear,
    previousYear,
    mode,
    start,
    end,
    period,
  } = useSelector((s) => s.reports);

  // ─── Filter state ──────────────────────────────────
  const [filter, setFilter] = useState({
    mode: FILTER_MODE.YEAR,
    year: new Date().getFullYear(),
    month: null,
    preset: null,
    startDate: null,
    endDate: null,
  });
  const [applyFilter, setApplyFilter] = useState(null);
  const [search, setSearch] = useState("");

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return [y + 1, y, y - 1, y - 2, y - 3, y - 4];
  }, []);

  // ─── Build params ──────────────────────────────────
  const buildParams = useCallback(() => {
    const params = { year: filter.year };
    switch (filter.mode) {
      case FILTER_MODE.MONTH:
        params.month = filter.month;
        break;
      case FILTER_MODE.PRESET:
        params.preset = filter.preset;
        break;
      case FILTER_MODE.RANGE:
        if (filter.startDate && filter.endDate) {
          params.startDate = filter.startDate;
          params.endDate = filter.endDate;
        }
        break;
      default:
        break;
    }
    return params;
  }, [filter]);

  // ─── Fetch ─────────────────────────────────────────
  const handleFetch = useCallback(() => {
    dispatch(fetchStatement(buildParams()));
    setApplyFilter(filter);
  }, [dispatch, buildParams, filter]);

  // mount-only fetch — intent ชัดเจน ไม่ต้องใส่ handleFetch ใน deps
  useEffect(() => {
    handleFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Data ──────────────────────────────────────────
  const current = data?.current || [];
  const previous = data?.previous || [];

  // ─── Merge & group ─────────────────────────────────
  const { grouped, sectionTotals, grandTotal } = useMemo(() => {
    const prevMap = {};
    previous.forEach((i) => {
      prevMap[i.key] = i.ending || 0;
    });

    const groups = {};
    const totals = {};

    current.forEach((item) => {
      if (!groups[item.section]) {
        groups[item.section] = [];
        totals[item.section] = { cur: 0, prev: 0 };
      }
      const prevEnding = prevMap[item.key] || 0;
      groups[item.section].push({
        ...item,
        prevEnding,
        diff: item.ending - prevEnding,
      });
      totals[item.section].cur += item.ending || 0;
      totals[item.section].prev += prevEnding;
    });

    const grand = Object.values(totals).reduce(
      (s, x) => ({ cur: s.cur + x.cur, prev: s.prev + x.prev }),
      { cur: 0, prev: 0 }
    );

    return { grouped: groups, sectionTotals: totals, grandTotal: grand };
  }, [current, previous]);

  // ─── Filter label ──────────────────────────────────
  const activeFilterLabel = useMemo(() => getFilterLabel(applyFilter), [
    applyFilter,
  ]);

  // ─── dateText derive จาก filter จริง ──────────────
  // แก้: เคย hardcode "31/12/2025" ทั้ง 2 จุด
  const dateText = useMemo(() => {
    if (!applyFilter) return formatDate(new Date());
    if (applyFilter.mode === FILTER_MODE.YEAR)
      return `31/12/${applyFilter.year}`;
    if (applyFilter.mode === FILTER_MODE.RANGE && applyFilter.endDate)
      return formatDate(applyFilter.endDate);
    return formatDate(new Date());
  }, [applyFilter]);

  // ─── Export PDF ────────────────────────────────────
  const handleExportPDF = useCallback(() => {
    html2pdf()
      .set({
        margin: [2, 2, 2, 2],
        filename: "ໃບລາຍການໜີ້ສິນ.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(printRef.current)
      .save();
  }, []);

  // ─── Export Excel ──────────────────────────────────
  const handleExportExcel = useCallback(() => {
    exportBalanceSheetExcel({
      current,
      previous,
      currentYear,
      previousYear,
      comparable,
      user,
      period,
      activeFilterLabel,
      sectionTotals,
      mode,
      dateText,
    });
  }, [
    current,
    previous,
    currentYear,
    previousYear,
    comparable,
    user,
    period,
    activeFilterLabel,
    sectionTotals,
    mode,
    dateText,
  ]);

  // ─── States ────────────────────────────────────────
  if (loading) return <LedgerLoading />;

  if (error) {
    return (
      <Box p={6}>
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      </Box>
    );
  }

  // ─── UI ────────────────────────────────────────────
  return (
    <Box p={6}>
      {/* HEADER */}
      <Box mb={4}>
        <Text
          fontFamily="Noto Sans Lao, sans-serif"
          fontSize="2xl"
          fontWeight="bold"
        >
          ໃບລາຍງານຖານະ ໜີ້ສິນ
        </Text>
        <Text fontFamily="Noto Sans Lao, sans-serif" color="gray.600">
          ໜີ້ສິນ & ທຶນ
        </Text>
      </Box>

      {activeFilterLabel && <ActiveFilterBar label={activeFilterLabel} />}

      <Divider mb={4} />

      {/* EXPORT BUTTONS */}
      <Box display="flex" justifyContent="flex-end">
        <Button
          fontFamily="Noto Sans Lao, sans-serif"
          m="3"
          colorScheme="red"
          onClick={handleExportPDF}
        >
          ສົ່ງອອກ PDF
        </Button>
        <Button
          fontFamily="Noto Sans Lao, sans-serif"
          m="3"
          colorScheme="green"
          onClick={handleExportExcel}
        >
          ສົ່ງອອກ Excel
        </Button>
      </Box>

      {/* FILTER */}
      <ReportFilter
        filter={filter}
        setFilter={setFilter}
        FILTER_MODE={FILTER_MODE}
        search={search}
        setSearch={setSearch}
        yearOptions={yearOptions}
        onApply={handleFetch}
      />

      {/* HIDDEN PRINT TARGET */}
      <div style={{ display: "none" }}>
        <StatementOfFinancialPrint
          ref={printRef}
          current={current}
          previous={previous}
          currentYear={currentYear}
          previousYear={previousYear}
          start={start}
          end={end}
          comparable={comparable}
          user={user}
          period={period}
          mode={mode}
          activeFilterLabel={activeFilterLabel}
          dateText={dateText}
        />
      </div>

      {/* CONTENT */}
      <Box bg="white" p={6} borderRadius="lg" shadow="sm">
        {Object.keys(grouped)
          .filter((section) => section !== "Total")
          .map((section) => {
            const label = SECTION_LABELS[section] ?? section;
            return (
              <Box key={section} mb={8}>
                <Flex justify="space-between" mb={2}>
                  <Text
                    fontFamily="Noto Sans Lao, sans-serif"
                    fontWeight="bold"
                    fontSize="lg"
                  >
                    {label}
                  </Text>
                  <Badge
                    fontFamily="Noto Sans Lao, sans-serif"
                    colorScheme="blue"
                    px={3}
                    py={1}
                    borderRadius="full"
                    fontSize="0.9em"
                  >
                    ສະກຸນເງິນ LAK
                  </Badge>
                </Flex>

                <Divider mb={3} />

                <Table size="sm">
                  <Thead bg="gray.100">
                    <Tr>
                      <Th fontFamily="Noto Sans Lao, sans-serif">ລາຍການ</Th>
                      <Th fontFamily="Noto Sans Lao, sans-serif">
                        ເລກໝາຍບັນຊີ
                      </Th>
                      <Th fontFamily="Noto Sans Lao, sans-serif" isNumeric>
                        {comparable ? currentYear : "Amount"}
                      </Th>
                      {comparable && (
                        <Th fontFamily="Noto Sans Lao, sans-serif" isNumeric>
                          {previousYear}
                        </Th>
                      )}
                    </Tr>
                  </Thead>

                  <Tbody>
                    {grouped[section].map((r) => (
                      <Tr key={r.key}>
                        <Td fontFamily="Noto Sans Lao, sans-serif">
                          {r.label}
                        </Td>
                        <Td
                          fontFamily="Noto Sans Lao, sans-serif"
                          color="gray.500"
                        >
                          -
                        </Td>
                        <Td fontFamily="Noto Sans Lao, sans-serif" isNumeric>
                          {formatNum(r.ending)}
                        </Td>
                        {comparable && (
                          <Td fontFamily="Noto Sans Lao, sans-serif" isNumeric>
                            {formatNum(r.prevEnding)}
                          </Td>
                        )}
                      </Tr>
                    ))}

                    {/* SUBTOTAL ROW */}
                    <Tr bg="gray.50" fontWeight="bold">
                      <Td fontFamily="Noto Sans Lao, sans-serif" colSpan={2}>
                        ຍອດລວມ {label}
                      </Td>
                      <Td fontFamily="Noto Sans Lao, sans-serif" isNumeric>
                        {formatNum(sectionTotals[section].cur)}
                      </Td>
                      {comparable && (
                        <Td fontFamily="Noto Sans Lao, sans-serif" isNumeric>
                          {formatNum(sectionTotals[section].prev)}
                        </Td>
                      )}
                    </Tr>
                  </Tbody>
                </Table>
              </Box>
            );
          })}

        {/* GRAND TOTAL */}
        <Divider my={6} />
        <Flex justify="space-between" bg="blue.50" p={4} borderRadius="md">
          <Text
            fontFamily="Noto Sans Lao, sans-serif"
            fontWeight="bold"
            fontSize="lg"
          >
            ລວມຍອດ ໜີ້ສິນ + ທຶນ (I + II + III)
          </Text>
          <HStack spacing={8}>
            <Text fontFamily="Noto Sans Lao, sans-serif" fontWeight="bold">
              {comparable ? currentYear : "Total"}: {formatNum(grandTotal.cur)}
            </Text>
            {comparable && (
              <Text
                fontFamily="Noto Sans Lao, sans-serif"
                fontWeight="bold"
                color="gray.600"
              >
                {previousYear}: {formatNum(grandTotal.prev)}
              </Text>
            )}
          </HStack>
        </Flex>
      </Box>
    </Box>
  );
};

export default StatementOfFinancialPosition;
