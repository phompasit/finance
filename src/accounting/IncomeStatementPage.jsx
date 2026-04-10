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
  Switch,
  FormControl,
  FormLabel,
  Icon,
} from "@chakra-ui/react";
import { ChevronDownIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { useDispatch, useSelector } from "react-redux";
import { loadIncomeStatement } from "../store/accountingReducer/incomeSlice";
import ReportFilter from "../components/Accounting_component/ReportFilter";
import html2pdf from "html2pdf.js";
import { useAuth } from "../context/AuthContext";
import IncomePrint from "./PDF/IncomePrint";
import LedgerLoading from "../components/Loading";
import { exportReport } from "./PDF/excel";

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

const BOLD_LABELS = [
  "ຜົນໄດ້ຮັບເບື້ອງຕົ້ນ",
  "ຜົນໄດ້ຮັບ ໃນການທຸລະກິດ",
  "ຜົນໄດ້ຮັບ ກ່ອນການເສຍອາກອນ",
  "ຜົນໄດ້ຮັບສຸດທິ ຈາກການດຳເນີນງານ",
  "ຜົນໄດ້ຮັບສັງລວມ ຫຼັງອາກອນ",
  "ຜົນໄດ້ຮັບສຸດທິໃນປີ",
];

/* ================= SUB-ROW (account detail) ================= */
const AccountSubRow = ({ account, comparable }) => {
  const curDr = account.endingDr || 0;
  const curCr = account.endingCr || 0;
  const prevDr = account.prevEndingDr || 0;
  const prevCr = account.prevEndingCr || 0;

  // ✅ ซ่อนถ้าไม่มีตัวเลขทั้ง current และ previous
  if (curDr === 0 && curCr === 0 && prevDr === 0 && prevCr === 0) return null;

  return (
    <Tr bg="blue.50">
      <Td
        pl={10}
        fontFamily="Noto Sans Lao, sans-serif"
        fontSize="xs"
        color="gray.700"
      >
        <HStack spacing={2}>
          <Badge fontSize="0.7em" colorScheme="gray" variant="outline">
            {account.code}
          </Badge>
          <Text fontFamily="Noto Sans Lao, sans-serif">{account.name}</Text>
        </HStack>
        <HStack spacing={4} mt={1} fontSize="xs" color="gray.500">
          <Text color="gray.400">|</Text>
          <Text fontFamily="Noto Sans Lao, sans-serif">
            ໜີ້: {formatNum(curDr)}
          </Text>
          <Text fontFamily="Noto Sans Lao, sans-serif">
            ມິ: {formatNum(curCr)}
          </Text>
        </HStack>
      </Td>

      <Td isNumeric fontSize="xs" color="gray.700">
        {formatNum(curDr - curCr)}
      </Td>

      {comparable && (
        <Td isNumeric fontSize="xs" color="gray.500">
          {prevDr === 0 && prevCr === 0 ? "—" : formatNum(prevDr - prevCr)}
        </Td>
      )}
    </Tr>
  );
};

/* ================= MAIN ROW ================= */
const MainRow = ({ line, comparable, isDetailed }) => {
  const [expanded, setExpanded] = useState(false);

  const isBold = BOLD_LABELS.includes(line.label);
  const hasAccounts = line.accounts && line.accounts.length > 0;

  // ✅ แก้ไข: บัญชีที่มีตัวเลข (endingDr หรือ endingCr มีค่า)
  const activeAccounts = hasAccounts
    ? line.accounts.filter((acc) => {
        const hasCur = acc.endingDr !== 0 || acc.endingCr !== 0;
        const hasPrev =
          (acc.prevEndingDr || 0) !== 0 || (acc.prevEndingCr || 0) !== 0;
        return hasCur || hasPrev; // ✅ มีตัวเลขในปีใดปีหนึ่งก็แสดง
      })
    : [];

  const hasActiveAccounts = activeAccounts.length > 0;
  const canExpand = isDetailed && hasActiveAccounts;

  // ✅ แก้ไข: ซ่อน row ที่ไม่มีบัญชีที่มีตัวเลขเลย (ยกเว้น bold rows)
  const shouldHide = isDetailed && !hasActiveAccounts && !isBold;

  React.useEffect(() => {
    if (!isDetailed) setExpanded(false);
  }, [isDetailed]);

  if (shouldHide) return null;

  return (
    <>
      <Tr
        _hover={canExpand ? { bg: "gray.50", cursor: "pointer" } : {}}
        onClick={canExpand ? () => setExpanded((v) => !v) : undefined}
        bg={isBold ? "gray.50" : "white"}
      >
        <Td fontFamily="Noto Sans Lao, sans-serif">
          <HStack spacing={1}>
            {isDetailed && (
              <Box w={4} h={4} flexShrink={0}>
                {hasActiveAccounts ? (
                  <Icon
                    as={expanded ? ChevronDownIcon : ChevronRightIcon}
                    color="blue.400"
                    boxSize={4}
                  />
                ) : null}
              </Box>
            )}
            {isBold ? (
              <strong style={{ fontFamily: "Noto Sans Lao, sans-serif" }}>
                {line.label}
              </strong>
            ) : (
              <Text fontFamily="Noto Sans Lao, sans-serif">{line.label}</Text>
            )}
            {/* ✅ Badge แสดงเฉพาะบัญชีที่มีตัวเลข */}
            {isDetailed && hasActiveAccounts && (
              <Badge ml={1} colorScheme="blue" fontSize="0.65em">
                {activeAccounts.length}
              </Badge>
            )}
          </HStack>
        </Td>

        <Td isNumeric fontWeight={isBold ? "bold" : "normal"}>
          {formatNum(line.cur)}
        </Td>

        {comparable && (
          <Td isNumeric fontWeight={isBold ? "bold" : "normal"}>
            {formatNum(line.prev)}
          </Td>
        )}
      </Tr>

      {/* sub-rows: แสดงเฉพาะบัญชีที่มีตัวเลข */}
      {expanded &&
        activeAccounts.map((acc) => (
          <AccountSubRow
            key={acc.accountId}
            account={acc}
            comparable={comparable}
          />
        ))}
    </>
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

  /* ================= FILTER STATE ================= */
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

  /* ===== NEW: detail toggle ===== */
  const [isDetailed, setIsDetailed] = useState(false);

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return [y + 1, y, y - 1, y - 2, y - 3, y - 4];
  }, []);

  /* ================= BUILD PARAMS ================= */
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

  /* ================= NORMALIZE DATA ================= */
  const normalizeIncomeData = (raw) => {
    if (!raw) return { current: null, previous: null };
    const unwrap = (obj) => {
      if (!obj) return null;
      if (obj.current && obj.current.lines) return obj.current;
      if (obj.lines) return obj;
      return null;
    };
    return { current: unwrap(raw.current), previous: unwrap(raw.previous) };
  };

  const { current, previous } = useMemo(() => normalizeIncomeData(data), [
    data,
  ]);

  /* ================= MERGE LINES ================= */
  const mergedLines = useMemo(() => {
    if (!current?.lines && !previous?.lines) return [];
    const map = {};

    current?.lines?.forEach((l) => {
      map[l.key] = {
        key: l.key,
        label: l.label,
        cur: l.amount || 0,
        prev: 0,
        // เก็บ accounts จาก current พร้อม source tag
        accounts: (l.accounts || []).map((a) => ({ ...a, _src: "cur" })),
      };
    });

    previous?.lines?.forEach((l) => {
      if (!map[l.key]) {
        map[l.key] = {
          key: l.key,
          label: l.label,
          cur: 0,
          prev: l.amount || 0,
          accounts: (l.accounts || []).map((a) => ({ ...a, _src: "prev" })),
        };
      } else {
        map[l.key].prev = l.amount || 0;

        // ✅ merge accounts จาก previous เข้าไป (ถ้า accountId ยังไม่มีใน cur)
        const existingIds = new Set(
          map[l.key].accounts.map((a) => a.accountId)
        );
        (l.accounts || []).forEach((a) => {
          if (!existingIds.has(a.accountId)) {
            map[l.key].accounts.push({ ...a, _src: "prev" });
          } else {
            // ถ้ามีอยู่แล้ว ให้อัปเดต prev ending balance
            const idx = map[l.key].accounts.findIndex(
              (x) => x.accountId === a.accountId
            );
            if (idx !== -1) {
              map[l.key].accounts[idx] = {
                ...map[l.key].accounts[idx],
                prevEndingDr: a.endingDr,
                prevEndingCr: a.endingCr,
              };
            }
          }
        });
      }
    });

    return Object.values(map);
  }, [current, previous]);

  /* ================= FILTER LABEL ================= */
  const getFilterLabel = (f) => {
    if (!f) return "";
    switch (f.mode) {
      case FILTER_MODE.YEAR:
        return `ປີບັນຊີ: ${f.year}`;
      case FILTER_MODE.MONTH:
        return `ເດືອນ: ${String(f.month).padStart(2, "0")}/${f.year}`;
      case FILTER_MODE.RANGE:
        return `ຊ່ວງວັນທີ: ${formatDate(f.startDate)} – ${formatDate(
          f.endDate
        )}`;
      case FILTER_MODE.PRESET:
        return `Preset: ${f.preset}`;
      default:
        return "";
    }
  };

  const activeFilterLabel = useMemo(() => getFilterLabel(applyFilter), [
    applyFilter,
  ]);

  /* ================= EXPORT PDF ================= */
  const handleExportPDF = () => {
    html2pdf()
      .set({
        margin: [2, 2, 2, 2],
        filename: "ໃບລາຍງານຜົນດຳເນີນງານ.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(printRef.current)
      .save();
  };

  /* ================= STATES ================= */
  if (loader) return <LedgerLoading />;
  if (error)
    return (
      <Box p={6}>
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      </Box>
    );

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
        {activeFilterLabel && (
          <Box
            px={4}
            py={2}
            border="1px solid"
            borderColor="gray.200"
            borderRadius="md"
            bg="gray.50"
            mt={2}
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
                {activeFilterLabel}
              </Badge>
            </HStack>
          </Box>
        )}
      </Box>

      <Divider mb={4} />

      {/* ---------- TOOLBAR ---------- */}
      <Flex
        justify="space-between"
        align="center"
        mb={4}
        flexWrap="wrap"
        gap={3}
      >
        {/* LEFT: detail toggle */}
        <HStack spacing={4}>
          <FormControl display="flex" alignItems="center">
            <FormLabel
              htmlFor="detail-toggle"
              mb={0}
              fontFamily="Noto Sans Lao, sans-serif"
              fontSize="sm"
              color="gray.600"
              cursor="pointer"
            >
              {isDetailed ? "ລະອຽດ" : "ບໍ່ລະອຽດ"}
            </FormLabel>
            <Switch
              id="detail-toggle"
              colorScheme="blue"
              isChecked={isDetailed}
              onChange={(e) => setIsDetailed(e.target.checked)}
            />
          </FormControl>

          {isDetailed && (
            <Badge
              colorScheme="blue"
              variant="subtle"
              fontFamily="Noto Sans Lao, sans-serif"
            >
              ກົດ row ເພື່ອ expand ບັນຊີລູກ
            </Badge>
          )}
        </HStack>

        {/* RIGHT: export buttons */}
        <HStack>
          <Button
            fontFamily="Noto Sans Lao, sans-serif"
            colorScheme="red"
            onClick={handleExportPDF}
          >
            ສົ່ງອອກ PDF
          </Button>
          <Button
            fontFamily="Noto Sans Lao, sans-serif"
            colorScheme="green"
            onClick={() =>
              exportReport({
                current,
                previous,
                currentYear,
                previousYear,
                comparable,
                user,
                period,
                formatNum,
                mode,
                activeFilterLabel,
                mergedLines,
              })
            }
          >
            ສົ່ງອອກ Excel
          </Button>
        </HStack>
      </Flex>

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

      {/* ---------- HIDDEN PRINT ---------- */}
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
                <Th fontFamily="Noto Sans Lao, sans-serif" isNumeric>
                  {previousYear}
                </Th>
              )}
            </Tr>
          </Thead>

          <Tbody>
            {mergedLines.map((l) => (
              <MainRow
                key={l.key}
                line={l}
                comparable={comparable}
                isDetailed={isDetailed}
              />
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
};

export default IncomeStatementPage;
