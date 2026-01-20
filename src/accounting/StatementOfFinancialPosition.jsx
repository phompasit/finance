// src/pages/reports/StatementOfFinancialPosition.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Flex,
  Text,
  Spinner,
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

/* ================= FILTER MODE (เหมือน AssetsPage) ================= */
const FILTER_MODE = {
  YEAR: "YEAR",
  MONTH: "MONTH",
  PRESET: "PRESET",
  RANGE: "RANGE",
};
const formatDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date)) return d;
  return date.toLocaleDateString("en-GB");
};
/* ================= HELPERS ================= */
const num = (n) => Number(n || 0).toLocaleString();

const DiffBadge = ({ value }) => {
  if (value === 0) return <Badge>0</Badge>;
  return (
    <Badge colorScheme={value > 0 ? "green" : "red"}>
      {value > 0 ? "+" : ""}
      {num(value)}
    </Badge>
  );
};

/* ================= PAGE ================= */
const StatementOfFinancialPosition = () => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const printRef = useRef();
  const {
    loading,
    error,
    data,
    comparable,
    currentYear,
    previousYear,
    mode,
    period,
  } = useSelector((s) => s.reports || {});

  /* ================= PRODUCTION FILTER STATE (เหมือน AssetsPage) ================= */
  const [filter, setFilter] = useState({
    mode: FILTER_MODE.YEAR,
    year: new Date().getFullYear(),
    month: null,
    preset: null,
    startDate: null,
    endDate: null,
  });
  const [applyFilter, setApplyFilter] = useState();
  const [search, setSearch] = useState("");

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return [y + 1, y, y - 1, y - 2, y - 3, y - 4];
  }, []);

  /* ================= BUILD PARAMS (เหมือน AssetsPage) ================= */
  const buildParams = () => {
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

      case FILTER_MODE.YEAR:
      default:
        break;
    }

    return params;
  };

  /* ================= FETCH ================= */
  const handleFetch = () => {
    dispatch(fetchStatement(buildParams()));
    setApplyFilter(filter);
  };

  useEffect(() => {
    handleFetch();
    // eslint-disable-next-line
  }, []);

  /* ================= DATA ================= */
  const current = data?.current || [];
  const previous = data?.previous || [];

  /* ================= MERGE DATA (SFP) ================= */
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
      (s, x) => ({
        cur: s.cur + x.cur,
        prev: s.prev + x.prev,
      }),
      { cur: 0, prev: 0 }
    );

    return { grouped: groups, sectionTotals: totals, grandTotal: grand };
  }, [current, previous]);
  /* ================= HEADER TEXT (เหมือน AssetsPage) ================= */
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
  const activeFilterLabel = useMemo(() => getFilterLabel(applyFilter), [
    applyFilter,
  ]);
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
            <HStack spacing={1}>
              <span
                style={{
                  fontFamily: "Noto Sans Lao, sans-serif",
                }}
              >
                {label}
              </span>
            </HStack>
          </Badge>
        </HStack>
      </Box>
    );
  };

  /* ================= EXPORT PDF ================= */
  const handleExportPDF = () => {
    html2pdf()
      .set({
        margin: [2, 2, 2, 2], // mm
        filename: "ໃບລາຍການໜີ້ສິນ.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait", // ✅ ต้องเป็น portrait
        },
      })
      .from(printRef.current)
      .save();
  };
  /* ================= STATES ================= */
  if (loading) {
    return <LedgerLoading />;
  }

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
  console.log(activeFilterLabel)
  /* ================= UI ================= */
  return (
    <Box p={6}>
      {/* ---------- HEADER ---------- */}
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
      <Box display={"flex"} justifyContent={"flex-end"}>
        <Button m="3" colorScheme="red" onClick={handleExportPDF}>
          Export PDF
        </Button>
        <Button
          onClick={() => {
            exportBalanceSheetExcel({
              current: current,
              previous: previous,
              currentYear: currentYear,
              previousYear: previousYear,
              comparable: comparable,
              user: user,
              period: period,
              activeFilterLabel,
              sectionTotals,
              mode: mode,
              dateText: "31/12/2025",
            });
          }}
          m="3"
          colorScheme="green"
        >
          Export Excel
        </Button>
      </Box>
      {/* ---------- FILTER (ใช้ตัวเดียวกับ AssetsPage) ---------- */}
      <ReportFilter
        filter={filter}
        setFilter={setFilter}
        FILTER_MODE={FILTER_MODE}
        search={search}
        setSearch={setSearch}
        yearOptions={yearOptions}
        onApply={handleFetch}
      />
      <div style={{ display: "none" }}>
        <StatementOfFinancialPrint
          ref={printRef}
          current={current}
          previous={previous}
          currentYear={currentYear}
          previousYear={previousYear}
          comparable={comparable}
          user={user}
          period={period}
          mode={mode}
          activeFilterLabel={activeFilterLabel}
          dateText="31/12/2025"
        />
      </div>
      {/* ---------- CONTENT ---------- */}
      <Box bg="white" p={6} borderRadius="lg" shadow="sm">
        {Object.keys(grouped).map(
          (section) =>
            section !== "Total" && (
              <Box key={section} mb={8}>
                <Flex justify="space-between" mb={2}>
                  <Text
                    fontFamily="Noto Sans Lao, sans-serif"
                    fontWeight="bold"
                    fontSize="lg"
                  >
                    {section === "Current_Liabilities"
                      ? "ໜີ້ສິນໝູນວຽນ I"
                      : section === "Equity"
                      ? "ທຶນ III"
                      : "ໜີ້ສິນບໍ່ໝູນວຽນ II"}
                  </Text>
                  <Box>
                    <Badge
                      fontFamily="Noto Sans Lao, sans-serif"
                      colorScheme="blue"
                    >
                      {" "}
                      ສະກຸນເງິນ LAK
                    </Badge>
                  </Box>
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
                        <>
                          <Th fontFamily="Noto Sans Lao, sans-serif" isNumeric>
                            {previousYear}
                          </Th>
                          {/* <Th fontFamily="Noto Sans Lao, sans-serif" isNumeric>
                            ປ່ຽນແປງ +/-
                          </Th> */}
                        </>
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
                          {r.pattern}
                        </Td>
                        <Td fontFamily="Noto Sans Lao, sans-serif" isNumeric>
                          {num(r.ending)}
                        </Td>

                        {comparable && (
                          <>
                            <Td
                              fontFamily="Noto Sans Lao, sans-serif"
                              isNumeric
                            >
                              {num(r.prevEnding)}
                            </Td>
                            {/* <Td
                              fontFamily="Noto Sans Lao, sans-serif"
                              isNumeric
                            >
                              <DiffBadge value={r.diff} />
                            </Td> */}
                          </>
                        )}
                      </Tr>
                    ))}

                    {/* SUBTOTAL */}
                    <Tr bg="gray.50" fontWeight="bold">
                      <Td fontFamily="Noto Sans Lao, sans-serif" colSpan={2}>
                        ຍອດລວມ{" "}
                        {section === "Current_Liabilities"
                          ? "ໜີ້ສິນໝູນວຽນ I"
                          : section === "Equity"
                          ? "ທຶນ III"
                          : "ໜີ້ສິນບໍ່ໝູນວຽນ II"}
                      </Td>
                      <Td fontFamily="Noto Sans Lao, sans-serif" isNumeric>
                        {num(sectionTotals[section].cur)}
                      </Td>
                      {comparable && (
                        <>
                          <Td fontFamily="Noto Sans Lao, sans-serif" isNumeric>
                            {num(sectionTotals[section].prev)}
                          </Td>
                          {/* <Td fontFamily="Noto Sans Lao, sans-serif" isNumeric>
                            <DiffBadge
                              value={
                                sectionTotals[section].cur -
                                sectionTotals[section].prev
                              }
                            />
                          </Td> */}
                        </>
                      )}
                    </Tr>
                  </Tbody>
                </Table>
              </Box>
            )
        )}

        {/* ---------- GRAND TOTAL ---------- */}
        <Divider my={6} />
        <Flex justify="space-between" bg="blue.50" p={4} borderRadius="md">
          <Text
            fontFamily="Noto Sans Lao, sans-serif"
            fontWeight="bold"
            fontSize="lg"
          >
            ລວມຍອດ ໜີ້ສິນ + ທຶນ (I + II + III )
          </Text>
          <HStack spacing={8}>
            <Text fontFamily="Noto Sans Lao, sans-serif" fontWeight="bold">
              {comparable ? currentYear : "Total"}: {num(grandTotal.cur)}
            </Text>

            {comparable && (
              <Text
                fontFamily="Noto Sans Lao, sans-serif"
                fontWeight="bold"
                color="gray.600"
              >
                {previousYear}: {num(grandTotal.prev)}
              </Text>
            )}
          </HStack>
        </Flex>
      </Box>
    </Box>
  );
};

export default StatementOfFinancialPosition;
