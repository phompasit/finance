import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  Box,
  Spinner,
  Flex,
  Button,
  HStack,
  Tabs,
  TabList,
  Tab,
  Badge,
  Text,
} from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import html2pdf from "html2pdf.js";
import { Download, FileChartLine, Filter, Icon } from "lucide-react";

/* ================= Redux ================= */
import { getAccounts } from "../store/accountingReducer/chartAccounting";
import { loadGeneralLedger } from "../store/accountingReducer/generalLedgerSlice";

/* ================= Components ================= */
import LedgerFilterBar from "../components/ledger/LedgerFilterBar";
import LedgerTable from "../components/ledger/LedgerTable";
import LedgerPagination from "../components/ledger/LedgerPagination";
import LedgerPdfWrapper from "../components/ledger/LedgerPdfWrapper";
import LedgerLoading from "../components/Loading";
import { exportGeneralLedgerToExcel } from "./PDF/excel";
import { useAuth } from "../context/AuthContext";

/* ================= Constants ================= */
const TAB_KEYS = ["CASH", "BANK", "ALL"];

const FILTER_MODE = {
  YEAR: "YEAR",
  MONTH: "MONTH",
  PRESET: "PRESET",
  RANGE: "RANGE",
};

const DEFAULT_FILTER = {
  mode: FILTER_MODE.YEAR,
  year: new Date().getFullYear(),
  month: null,
  preset: null,
  startDate: null,
  endDate: null,
};
const formatDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date)) return d;
  return date.toLocaleDateString("en-GB");
};

/* ================= Page ================= */
const GeneralLedgerPage = () => {
  const dispatch = useDispatch();
  const printRef = useRef(null);
  const { user } = useAuth();
  const { accounts } = useSelector((s) => s.chartAccount);
  const { data, loadingLedger } = useSelector((s) => s.ledger);

  /* ---------- State ---------- */
  const [activeTab, setActiveTab] = useState("ALL");
  const [page, setPage] = useState(1);
  const [accountId, setAccountId] = useState("ALL");
  const [filter, setFilter] = useState(DEFAULT_FILTER);
  const [appliedFilter, setAppliedFilter] = useState(DEFAULT_FILTER);
  const [loadingPdf, setLoadingPdf] = useState(false);

  /* ---------- Load Accounts ---------- */
  useEffect(() => {
    dispatch(getAccounts());
  }, [dispatch]);

  /* ---------- Account Options ---------- */
  const accountOptions = useMemo(
    () => [
      { value: "ALL", label: "📘 ທັງໝົດ (All Accounts)" },
      ...(accounts || [])
        .filter((i) => i.parentCode !== null)
        .map((a) => ({
          value: a._id,
          label: `${a.code} - ${a.name}`,
        })),
    ],
    [accounts]
  );

  /* ---------- Build API Params ---------- */
  const buildParams = useCallback(
    (override = {}) => {
      const params = {
        page,
        limit: 10,
        accountId,
      };

      if (activeTab === "CASH") params.accountGroup = "cash";
      if (activeTab === "BANK") params.accountGroup = "bank";

      if (appliedFilter.mode === FILTER_MODE.MONTH) {
        params.year = appliedFilter.year;
        params.month = appliedFilter.month;
      } else if (appliedFilter.mode === FILTER_MODE.RANGE) {
        params.startDate = appliedFilter.startDate;
        params.endDate = appliedFilter.endDate;
      } else {
        params.year = appliedFilter.year;
      }

      return { ...params, ...override };
    },
    [page, activeTab, appliedFilter, accountId]
  );

  /* ---------- Load Ledger ---------- */
  const loadLedger = useCallback(
    async (override = {}) => {
      await dispatch(loadGeneralLedger(buildParams(override)));
    },
    [dispatch, buildParams]
  );

  useEffect(() => {
    loadLedger();
  }, [page, activeTab, loadLedger]);

  /* ---------- Apply Filter ---------- */
  const handleApplyFilter = () => {
    setPage(1);
    setAppliedFilter(filter);
    loadLedger({ page: 1 });
  };

  /* ---------- Tab Change ---------- */
  const handleTabChange = (index) => {
    setActiveTab(TAB_KEYS[index]);
    setFilter(DEFAULT_FILTER);
    setAppliedFilter(DEFAULT_FILTER);
    setAccountId("ALL");
    setPage(1);
  };

  /* ---------- Export PDF ---------- */
  const waitForDOM = () =>
    new Promise((resolve) => requestAnimationFrame(resolve));
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
  const activeFilterLabel = useMemo(() => getFilterLabel(appliedFilter), [
    appliedFilter,
  ]);
  const handleExportPDF = async () => {
    if (!data) return;

    setLoadingPdf(true);

    // Load full data for PDF
    await loadLedger({ page: 1, limit: 100000, forPdf: true });
    await waitForDOM();

    if (!printRef.current) {
      setLoadingPdf(false);
      return;
    }

    await html2pdf()
      .set({
        margin: [5, 5, 5, 5], // top, right, bottom, left (mm)
        filename: "general-ledger.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 1.5, // ลด scale ลง ถ้า 2 แล้วล้น
          useCORS: true,
          scrollX: 0,
          scrollY: 0,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "landscape", // ✅ ถูกต้องแล้ว
        },
      })
      .from(printRef.current)
      .save();

    setLoadingPdf(false);
  };
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

  /* ---------- Loading ---------- */
  if (loadingLedger && !loadingPdf) {
    return <LedgerLoading />;
  }

  const tabIndex = TAB_KEYS.indexOf(activeTab);
  /* ================= Render ================= */
  return (
    <Box p={6}>
      <Tabs
        index={tabIndex}
        onChange={handleTabChange}
        variant="enclosed"
        mb={4}
      >
        <TabList>
          {/* <Tab fontFamily="Noto Sans Lao, sans-serif">📕 ປື້ມບັນຊີເງິນສົດ</Tab>
          <Tab fontFamily="Noto Sans Lao, sans-serif">📘 ປື້ມບັນຊີເງິນຝາກ</Tab> */}
          <Tab fontFamily="Noto Sans Lao, sans-serif">
            📙 ປື້ມບັນຊີໃຫຍ່ແຍກປະເພດ
          </Tab>
        </TabList>
      </Tabs>

      {/* ===== Action Bar ===== */}
      <HStack justify="flex-end" mb={4}>
        {activeFilterLabel && <ActiveFilterBar label={activeFilterLabel} />}
        {activeTab === "ALL" && (
          <Box fontFamily="Noto Sans Lao, sans-serif" minW="260px">
            <Select
              options={accountOptions}
              value={accountOptions.find((o) => o.value === accountId)}
              onChange={(v) => setAccountId(v.value)}
            />
          </Box>
        )}

        <Button
          fontFamily="Noto Sans Lao, sans-serif"
          onClick={handleExportPDF}
          leftIcon={<Download />}
          colorScheme="blue"
          variant="outline"
          isLoading={loadingPdf}
        >
          ສົ່ງອອກ PDF
        </Button>

        <Button
          fontFamily="Noto Sans Lao, sans-serif"
          leftIcon={<Download />}
          colorScheme="green"
          variant="outline"
          onClick={() =>
            exportGeneralLedgerToExcel({
              data: data?.accounts,
              user,
              dateRange: activeFilterLabel,
              activeTab,
            })
          }
        >
          ສົ່ງອອກ Excel
        </Button>
      </HStack>

      {/* ===== Filter ===== */}
      <LedgerFilterBar
        filter={filter}
        setFilter={setFilter}
        onApply={handleApplyFilter}
      />

      {/* ===== Table ===== */}
      <LedgerTable accounts={data?.accounts || []} />

      {/* ===== Pagination ===== */}
      <LedgerPagination
        page={data?.page || 1}
        totalPages={data?.totalPages || 1}
        onChange={setPage}
        disabled={activeTab === "ALL"}
      />

      {/* ===== PDF Hidden Render ===== */}
      <LedgerPdfWrapper
        ref={printRef}
        activeTab={activeTab}
        filter={filter}
        data={data?.accounts || []}
      />
    </Box>
  );
};

export default GeneralLedgerPage;
