// src/pages/reports/IncomeStatementPage.jsx
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
  Button,
  HStack,
} from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import { loadIncomeStatement } from "../store/accountingReducer/incomeSlice";
import ReportFilter from "../components/Accounting_component/ReportFilter";
import html2pdf from "html2pdf.js";
import { useAuth } from "../context/AuthContext";
import StatementOfFinancialPrint from "./PDF/StatementOfFinancialPrint";
import IncomePrint from "./PDF/IncomePrint";
import LedgerLoading from "../components/Loading";
import { exportReport } from "./PDF/excel";

/* ================= FILTER MODE (เหมือน SFP / Assets) ================= */
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
const formatNum = (n) => Number(n || 0).toLocaleString();

const DiffBadge = ({ value }) => {
  if (value === 0) return <Badge>0</Badge>;
  return (
    <Badge colorScheme={value > 0 ? "green" : "red"}>
      {value > 0 ? "+" : ""}
      {formatNum(value)}
    </Badge>
  );
};

/* ================= PAGE ================= */
const IncomeStatementPage = () => {
  const dispatch = useDispatch();
  const printRef = useRef();
  const { user } = useAuth();
  const {
    loader,
    error,
    comparable,
    currentYear,
    previousYear,
    data,
    mode,
    period,
  } = useSelector((s) => s.income || {});

  /* ================= FILTER STATE (เหมือน SFP) ================= */
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

  /* ================= BUILD PARAMS (เหมือน SFP) ================= */
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
    dispatch(loadIncomeStatement(buildParams()));
    setApplyFilter(filter);
  };

  useEffect(() => {
    handleFetch();
    // eslint-disable-next-line
  }, []);
  const normalizeIncomeData = (raw) => {
    if (!raw) return { current: null, previous: null };

    const unwrap = (obj) => {
      if (!obj) return null;
      // กรณี nested current.current
      if (obj.current && obj.current.lines) return obj.current;
      // กรณีปกติ
      if (obj.lines) return obj;
      return null;
    };

    return {
      current: unwrap(raw.current),
      previous: unwrap(raw.previous),
    };
  };

  /* ================= NORMALIZE DATA ================= */
  const { current, previous } = useMemo(() => normalizeIncomeData(data), [
    data,
  ]);

  /* ================= MERGE LINES (Income Statement) ================= */

  const mergedLines = useMemo(() => {
    if (!current?.lines && !previous?.lines) return [];

    const map = {};

    current?.lines?.forEach((l) => {
      if (!map[l.key]) {
        map[l.key] = {
          key: l.key,
          label: l.label,
          cur: l.amount || 0,
          prev: 0,
        };
      } else {
        map[l.key].cur = l.amount || 0;
      }
    });

    previous?.lines?.forEach((l) => {
      if (!map[l.key]) {
        map[l.key] = {
          key: l.key,
          label: l.label,
          cur: 0,
          prev: l.amount || 0,
        };
      } else {
        map[l.key].prev = l.amount || 0;
      }
    });

    return Object.values(map);
  }, [current, previous]);
  console.log("mergedLines", mergedLines);
  /* ================= HEADER TEXT (เหมือน SFP) ================= */
  const handleExportPDF = () => {
    html2pdf()
      .set({
        margin: [2, 2, 2, 2], // mm
        filename: "ໃບລາຍງານຜົນດຳເນີນງານ.pdf",
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

  /* ================= STATES ================= */
  if (loader) {
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
          ໃບລາຍງານຜົນດຳເນີນງານ
        </Text>
        {activeFilterLabel && <ActiveFilterBar label={activeFilterLabel} />}
      </Box>

      <Divider mb={4} />
      <Box display={"flex"} justifyContent={"flex-end"}>
        <Button m="3" colorScheme="red" onClick={handleExportPDF}>
          Export PDF
        </Button>
        <Button
          m="3"
          colorScheme="green"
          onClick={() => {
            exportReport({
              current: current,
              previous: previous,
              currentYear: currentYear,
              previousYear: previousYear,
              comparable: comparable,
              user: user,
              period: period,
              formatNum: formatNum,
              mode: mode,
              activeFilterLabel,
              mergedLines: mergedLines,
            });
          }}
        >
          Export Excel
        </Button>
      </Box>
      {/* ---------- FILTER (เหมือน SFP) ---------- */}
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
        <IncomePrint
          ref={printRef}
          current={current}
          previous={previous}
          currentYear={currentYear}
          previousYear={previousYear}
          comparable={comparable}
          user={user}
          period={period}
          formatNum={formatNum}
          mode={mode}
          mergedLines={mergedLines}
          dateText="31/12/2025"
        />
      </div>
      {/* ---------- TABLE ---------- */}
      <Box bg="white" p={6} borderRadius="lg" shadow="sm">
        <Table size="sm">
          <Thead bg="gray.100">
            <Tr>
              <Th fontFamily="Noto Sans Lao, sans-serif">ລາຍການ</Th>
              <Th fontFamily="Noto Sans Lao, sans-serif" isNumeric>
                {comparable ? currentYear : "Amount"}
              </Th>
              {comparable && (
                <>
                  <Th fontFamily="Noto Sans Lao, sans-serif" isNumeric>
                    {previousYear}
                  </Th>
                </>
              )}
            </Tr>
          </Thead>

          <Tbody>
            {mergedLines.map((l) => {
              const diff = l.cur - -(-(-l.prev));
              const boldLabels = [
                "ຜົນໄດ້ຮັບເບື້ອງຕົ້ນ",
                "ຜົນໄດ້ຮັບ ໃນການທຸລະກິດ",
                "ຜົນໄດ້ຮັບ ກ່ອນການເສຍອາກອນ",
                "ຜົນໄດ້ຮັບສຸດທິ ຈາກການດຳເນີນງານ",
                "ຜົນໄດ້ຮັບສັງລວມ ຫຼັງອາກອນ",
                "ຜົນໄດ້ຮັບສຸດທິໃນປີ",
              ];
              return (
                <Tr key={l.key}>
                  <Td fontFamily="Noto Sans Lao, sans-serif">
                    {boldLabels.includes(l.label) ? (
                      <strong
                        style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
                      >
                        {l.label}
                      </strong>
                    ) : (
                      l.label
                    )}
                  </Td>

                  <Td isNumeric>{formatNum(l.cur)}</Td>

                  {comparable && (
                    <>
                      <Td isNumeric>{formatNum(l.prev)}</Td>
                    </>
                  )}
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
};

export default IncomeStatementPage;
{
  /* <Td isNumeric>
                        <DiffBadge value={diff} />
                      </Td> */
}
{
  /* ---------- TOTAL ----------
            {current?.totals && (
              <Tr bg="gray.50" fontWeight="bold">
                <Td fontFamily="Noto Sans Lao, sans-serif">
                  ຜົນໄດ້ຮັບສຸດທິໃນປີ
                </Td>
                <Td isNumeric>{formatNum(current.totals.net)}</Td>

                {comparable && (
                  <>
                    <Td isNumeric>{formatNum(previous?.totals?.net)}</Td>
                    <Td isNumeric>
                      <DiffBadge
                        value={
                          (current.totals.net || 0) -
                          (previous?.totals?.net || 0)
                        }
                      />
                    </Td>
                  </>
                )}
              </Tr>
            )} */
}
{
  /* <Th fontFamily="Noto Sans Lao, sans-serif" isNumeric>
                    {" "}
                    ປ່ຽນແປງ +/-
                  </Th> */
}
