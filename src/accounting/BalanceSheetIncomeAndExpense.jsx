// src/pages/reports/BalanceSheetIncomeAndExpense.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Flex,
  Text,
  Button,
  Input,
  Select,
  Spinner,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useToast,
  HStack,
  IconButton,
  Collapse,
  SimpleGrid,
  Badge,
} from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import { fetchDetailedBalance_Income_expense } from "../store/accountingReducer/balanceSlice";
import { Download, ChevronDown, ChevronRight } from "lucide-react";
import ReportFilter from "../components/Accounting_component/ReportFilter";
import { useAccountTree } from "../ีีutils/useAccountTree";
import AccountTreeTable from "../components/Accounting_component/AccountTreeTable";
import html2pdf from "html2pdf.js";
import { useAuth } from "../context/AuthContext";
import BalanceSheetPrint from "./PDF/BalanceSheetPrint";
import { exportBalanceToExcel, flattenAccountTree } from "./PDF/excel";
/* ================= FILTER MODES ================= */
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
const BalanceSheetIncomeAndExpense = () => {
  const dispatch = useDispatch();
  const toast = useToast();
  const printRef = useRef();
  const { user } = useAuth();
  const {
    list_incomeExpense: list,
    totals_incomExpense: totals,
    balance_incomeExpense: balance,
    loader,
    error,
  } = useSelector((s) => s.balance || {});

  /* ================= PRODUCTION FILTER STATE ================= */
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

  /* ================= YEAR OPTIONS ================= */
  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [
      current + 1,
      current,
      ...Array.from({ length: 6 }, (_, i) => current - (i + 1)),
    ];
  }, []);

  /* ================= BUILD PARAMS (NO UNDEFINED) ================= */
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
        params.startDate = filter.startDate;
        params.endDate = filter.endDate;
        break;

      case FILTER_MODE.YEAR:
      default:
        break;
    }

    return params;
  };

  /* ================= FETCH ================= */
  const handleFetch = () => {
    dispatch(fetchDetailedBalance_Income_expense(buildParams()));
    setApplyFilter(filter);
  };

  useEffect(() => {
    handleFetch();
  }, []);
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

  useEffect(() => {
    if (error) toast({ title: error, status: "error" });
  }, [error]);

  /* ================= TREE ================= */
  const { tree, expanded, toggle } = useAccountTree(list, search);

  /* ================= EXPORT PDF ================= */
  const handleExportPDF = () => {
    html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename: "balance-sheet.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "landscape",
        },
      })
      .from(printRef.current)
      .save();
  };
  const formatNum = (n) => Number(n || 0).toLocaleString();
  return (
    <Box p={6} bg="gray.50" minH="100vh">
      {/* ================= HEADER ================= */}
      <Flex
        justify="space-between"
        align="center"
        mb={6}
        p={5}
        bg="white"
        borderRadius="lg"
        boxShadow="sm"
      >
        <Box>
          <Text
            fontFamily="Noto Sans Lao, sans-serif"
            fontSize="2xl"
            fontWeight="bold"
          >
            ໃບສັງລວມລາຍຮັບ - ລາຍຈ່າຍ
          </Text>
          {activeFilterLabel && <ActiveFilterBar label={activeFilterLabel} />}
        </Box>
        <HStack>
          <Box display="none">
            <BalanceSheetPrint
              ref={printRef}
              tree={tree}
              totals={totals}
              filter={filter}
              user={user}
              name={"ໃບດຸ່ນດຽງ ລາຍຮັບ-ລາຍຈ່າຍ"}
            />
          </Box>
          <Button
            onClick={handleExportPDF}
            fontFamily="Noto Sans Lao, sans-serif"
            leftIcon={<Download />}
            colorScheme="blue"
            variant="outline"
          >
            ສົ່ງອອກ PDF
          </Button>
          <Button
            fontFamily="Noto Sans Lao, sans-serif"
            leftIcon={<Download />}
            colorScheme="blue"
            variant="outline"
            onClick={() => {
              const flatData = flattenAccountTree(tree);

              exportBalanceToExcel({
                user,
                data: flatData, // ✅ ส่ง array ที่ flatten แล้ว
                activeFilterLabel,
                heading: "ໃບດຸ່ນດຽງ ລາຍຮັບ-ລາຍຈ່າຍ",
                totals: totals,
              });
            }}
          >
            ສົ່ງອອກ Excel
          </Button>
        </HStack>
      </Flex>

      {/* ================= FILTERS ================= */}
      <ReportFilter
        filter={filter}
        setFilter={setFilter}
        yearOptions={yearOptions}
        search={search}
        setSearch={setSearch}
        onApply={handleFetch}
        FILTER_MODE={FILTER_MODE}
      />
      {/* ================= TABLE ================= */}
      <AccountTreeTable
        tree={tree}
        expanded={expanded}
        toggle={toggle}
        totals={totals}
      />

      {/* ================= SUMMARY ================= */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mt={6}>
        <Box bg="white" p={5} borderRadius="lg" boxShadow="sm">
          <Text fontFamily="Noto Sans Lao, sans-serif" fontWeight="bold" mb={2}>
            ໃບສັງລວມລາຍຮັບ - ລາຍຈ່າຍ
          </Text>
          <Text
            fontFamily="Noto Sans Lao, sans-serif"
            color="gray.500"
            fontSize="sm"
          >
            ສະຫຼຸບລວມລາຍຮັບ-ລາຍຈ່າຍ
          </Text>
        </Box>

        <Box
          bg={balance === 0 ? "green.50" : "red.50"}
          p={5}
          borderRadius="lg"
          boxShadow="sm"
        >
          <Text fontFamily="Noto Sans Lao, sans-serif" fontWeight="bold" mb={1}>
            ຍອດລວມຜິດດ່ຽງ (Balance Difference)
          </Text>
          <Text
            fontFamily="Noto Sans Lao, sans-serif"
            fontSize="2xl"
            fontWeight="bold"
            color={balance === 0 ? "green.600" : "red.600"}
          >
            {formatNum(balance)}
          </Text>
        </Box>
      </SimpleGrid>
    </Box>
  );
};

export default BalanceSheetIncomeAndExpense;
