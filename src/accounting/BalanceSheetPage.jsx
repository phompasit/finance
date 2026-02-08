// src/pages/reports/BalanceSheetPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Flex,
  Text,
  Button,
  useToast,
  HStack,
  Badge,
} from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import { Download } from "lucide-react";
import html2pdf from "html2pdf.js";

import { fetchDetailedBalance } from "../store/accountingReducer/balanceSlice";
import ReportFilter from "../components/Accounting_component/ReportFilter";
import AccountTreeTable from "../components/Accounting_component/AccountTreeTable";
import { useAccountTree } from "../ีีutils/useAccountTree";
import BalanceSheetPrint from "./PDF/BalanceSheetPrint";
import { useAuth } from "../context/AuthContext";
import LedgerLoading from "../components/Loading";
import { exportBalanceToExcel } from "./PDF/excel";
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
const BalanceSheetPage = () => {
  const dispatch = useDispatch();
  const toast = useToast();
  const printRef = useRef();
  const { user } = useAuth();
  const { list = [], totals = {}, error, loader } = useSelector(
    (s) => s.balance || {}
  );

  /* ================= PRODUCTION FILTER STATE ================= */
  const [filter, setFilter] = useState({
    mode: FILTER_MODE.YEAR,
    year: new Date().getFullYear(),
    month: null,
    preset: null,
    startDate: null,
    endDate: null,
  });
  const [search, setSearch] = useState("");
  const [applyFilter, setApplyFilter] = useState();
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

  /* ================= FETCH ================= */
  const handleFetch = () => {
    dispatch(fetchDetailedBalance(buildParams()));
    setApplyFilter(filter);
  };

  useEffect(() => {
    handleFetch();
  }, []);
  useEffect(() => {
    if (error) toast({ title: error, status: "error" });
  }, [error]);

  /* ================= TREE ================= */
  const { tree, expanded, toggle } = useAccountTree(list, search);

  if (loader) {
    return <LedgerLoading />;
  }
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
  const flattenAccountTree = (tree) => {
    const rows = [];

    const walk = (node, level = 0) => {
      const isParent = node.children && node.children.length > 0;

      rows.push({
        code: node.code,
        name: node.name,
        level,
        isParent,

        openingDr: node.openingDr || 0,
        openingCr: node.openingCr || 0,
        movementDr: node.movementDr || 0,
        movementCr: node.movementCr || 0,
        endingDr: node.endingDr || 0,
        endingCr: node.endingCr || 0,
      });

      if (isParent) {
        node.children.forEach((c) => walk(c, level + 1));
      }
    };

    tree.forEach((root) => walk(root, 0));
    return rows;
  };

  return (
    <Box p={6}>
      {/* ================= HEADER ================= */}
      <Flex
        justify="space-between"
        align="center"
        mb={6}
        p={6}
        bg="white"
        borderRadius="xl"
        boxShadow="sm"
      >
        <Box>
          <Text
            fontFamily="Noto Sans Lao, sans-serif"
            fontSize="2xl"
            fontWeight="bold"
          >
            ໃບດຸ່ນດຽງທົ່ວໄປ
          </Text>
          {activeFilterLabel && <ActiveFilterBar label={activeFilterLabel} />}
        </Box>

        {/* PRINT (HIDDEN) */}
        <Box display="none">
          <BalanceSheetPrint
            ref={printRef}
            tree={tree}
            totals={totals}
            filter={filter}
            user={user}
            activeFilterLabel={activeFilterLabel}
            name={"ໃບດຸ່ນດຽງທົ່ວໄປ"}
          />
        </Box>
        <HStack>
          <Button
            leftIcon={<Download />}
            variant="outline"
            colorScheme="blue"
            fontFamily="Noto Sans Lao, sans-serif"
            onClick={handleExportPDF}
          >
            ສົ່ງອອກ PDF
          </Button>
          <Button
            leftIcon={<Download />}
            variant="outline"
            fontFamily="Noto Sans Lao, sans-serif"
            colorScheme="blue"
            onClick={() => {
              const flatData = flattenAccountTree(tree);

              exportBalanceToExcel({
                user,
                data: flatData, // ✅ ส่ง array ที่ flatten แล้ว
                activeFilterLabel,
                heading: "ໃບດຸນດ່ຽງທົ່ວໄປ",
                totals: totals,
              });
            }}
          >
            ສົ່ງອອກ Excel
          </Button>
        </HStack>
      </Flex>

      {/* ================= FILTER ================= */}
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
    </Box>
  );
};

export default BalanceSheetPage;
