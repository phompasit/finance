// src/pages/reports/AssetsPage.jsx
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
import { loadAssets } from "../store/accountingReducer/assetsSlice";
import ReportFilter from "../components/Accounting_component/ReportFilter";
import AssetsPrint from "./PDF/AssetsPrint";
import html2pdf from "html2pdf.js";
import { useAuth } from "../context/AuthContext";
import LedgerLoading from "../components/Loading";
import { exportAsset, exportBalanceSheetExcel } from "./PDF/excel";
/* ================= FILTER MODE ================= */
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
const AssetsPage = () => {
  const dispatch = useDispatch();
  const printRef = useRef();
  const { user } = useAuth();
  const {
    loader,
    error,
    comparable,
    currentYear,
    previousYear,
    current,
    previous,
    period,
    mode,
  } = useSelector((s) => s.assets);

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

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return [y + 1, y, y - 1, y - 2, y - 3, y - 4];
  }, []);

  /* ================= BUILD PARAMS (SAFE) ================= */
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
    dispatch(loadAssets(buildParams()));
    setApplyFilter(filter);
  };
  const handleExportPDF = () => {
    html2pdf()
      .set({
        margin: [2, 2, 2, 2], // mm
        filename: "balance-sheet.pdf",
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
    handleFetch();
    // eslint-disable-next-line
  }, []);

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

  const curGroups = current?.groups || {};
  const prevGroups = previous?.groups || {};

  /* ================= HEADER TEXT ================= */
  /* ================= HEADER TEXT (เหมือน AssetsPage) ================= */

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
          ໃບລາຍງານຖານະຊັບສິນ
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
            exportAsset({
              current: current,
              previous: previous,
              currentYear: currentYear,
              previousYear: previousYear,
              comparable: comparable,
              user: user,
              period: period,
              activeFilterLabel,
              mode: mode,
              dateText: "31/12/2025",
            });
          }}
        >
          Export Excel
        </Button>
      </Box>

      {/* ---------- FILTER ---------- */}
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
        <AssetsPrint
          ref={printRef}
          current={current}
          previous={previous}
          currentYear={currentYear}
          previousYear={previousYear}
          comparable={comparable}
          user={user}
          period={period}
          mode={mode}
          dateText="31/12/2025"
        />
      </div>

      {/* ---------- GROUPS ---------- */}
      {Object.keys(curGroups).length === 0 && (
        <Text color="gray.500">No asset data</Text>
      )}

      {Object.keys(curGroups).map((groupName) => {
        const curGroup = curGroups[groupName];
        const prevGroup = prevGroups[groupName] || {
          items: [],
          total: 0,
        };

        const mergedItems = Array.from(
          new Set([
            ...curGroup.items.map((i) => i.key),
            ...prevGroup.items.map((i) => i.key),
          ])
        ).map((key) => {
          const curItem = curGroup.items.find((i) => i.key === key) || {};
          const prevItem = prevGroup.items.find((i) => i.key === key) || {};

          return {
            key,
            label: curItem.label || prevItem.label || key,
            curAmount: Number(curItem.amount || 0),
            prevAmount: Number(prevItem.amount || 0),
          };
        });

        return (
          <Box key={groupName} mb={8}>
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              fontSize="lg"
              fontWeight="bold"
              mb={2}
            >
              {groupName === "Current Assets"
                ? "ຊັບສິນໝູນວຽນ"
                : "ຊັບສິນບໍ່ໝູນວຽນ"}
            </Text>

            <Table size="sm">
              <Thead>
                <Tr>
                  <Th fontFamily="Noto Sans Lao, sans-serif">ລາຍການ</Th>
                  <Th fontFamily="Noto Sans Lao, sans-serif" textAlign="right">
                    {comparable ? currentYear : "Amount"}
                  </Th>
                  {comparable && (
                    <>
                      <Th
                        fontFamily="Noto Sans Lao, sans-serif"
                        textAlign="right"
                      >
                        {previousYear}
                      </Th>
                      {/* <Th
                        fontFamily="Noto Sans Lao, sans-serif"
                        textAlign="right"
                      >
                        ປ່ຽນແປງ +/-
                      </Th> */}
                    </>
                  )}
                </Tr>
              </Thead>

              <Tbody>
                {mergedItems.map((item) => {
                  const diff = item.curAmount - item.prevAmount;

                  return (
                    <Tr key={item.key}>
                      <Td fontFamily="Noto Sans Lao, sans-serif">
                        {item.label}
                      </Td>
                      <Td
                        fontFamily="Noto Sans Lao, sans-serif"
                        textAlign="right"
                      >
                        {formatNum(item.curAmount)}
                      </Td>
                      {comparable && (
                        <>
                          <Td
                            fontFamily="Noto Sans Lao, sans-serif"
                            textAlign="right"
                          >
                            {formatNum(item.prevAmount)}
                          </Td>
                          {/* <Td
                            fontFamily="Noto Sans Lao, sans-serif"
                            textAlign="right"
                          >
                            <DiffBadge value={diff} />
                          </Td> */}
                        </>
                      )}
                    </Tr>
                  );
                })}

                <Tr bg="gray.50" fontWeight="bold">
                  <Td fontFamily="Noto Sans Lao, sans-serif">
                    {groupName === "Non-current Assets"
                      ? "ລວມຍອດຊັບສິນບໍ່ໝູນວຽນ II"
                      : "ລວມຍອດຊັບສິນໝູນວຽນ I"}
                  </Td>
                  <Td fontFamily="Noto Sans Lao, sans-serif" textAlign="right">
                    {formatNum(curGroup.total)}
                  </Td>
                  {comparable && (
                    <>
                      <Td
                        fontFamily="Noto Sans Lao, sans-serif"
                        textAlign="right"
                      >
                        {formatNum(prevGroup.total)}
                      </Td>
                      {/* <Td
                        fontFamily="Noto Sans Lao, sans-serif"
                        textAlign="right"
                      >
                        <DiffBadge value={curGroup.total - prevGroup.total} />
                      </Td> */}
                    </>
                  )}
                </Tr>
              </Tbody>
            </Table>
          </Box>
        );
      })}

      {/* ---------- GRAND TOTAL ---------- */}
      <Divider my={6} />
      <Flex justify="space-between" bg="blue.50" p={4} borderRadius="md">
        <Text
          fontFamily="Noto Sans Lao, sans-serif"
          fontWeight="bold"
          fontSize="lg"
        >
          ລວມຍອດ ຊັບສິນ (I + II )
        </Text>
        <HStack spacing={8}>
          <Text fontFamily="Noto Sans Lao, sans-serif" fontWeight="bold">
            ລວມຍອດ ຊັບສິນທັງໝົດ (I + II) {formatNum(current?.totalAssets)}
          </Text>

          {comparable && (
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              fontWeight="bold"
              color="gray.600"
            >
              {previousYear}: {formatNum(previous?.totalAssets)}
            </Text>
          )}
        </HStack>
      </Flex>
    </Box>
  );
};

export default AssetsPage;
