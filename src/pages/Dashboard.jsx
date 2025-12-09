// ProfessionalReportsSingleFileDashboard.jsx
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  Activity,
} from "react";
import {
  Box,
  Container,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Input,
  Select,
  Button,
  HStack,
  VStack,
  Text,
  Spinner,
  useToast,
  Grid,
  GridItem,
  Card,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Divider,
  SimpleGrid,
  IconButton,
  Tooltip,
  Skeleton,
  Icon,
  Flex,
  useColorModeValue,
} from "@chakra-ui/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { DownloadIcon, RepeatIcon } from "@chakra-ui/icons";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  CylinderIcon,
  DollarSign,
  FileChartColumnIcon,
  FileClock,
  FileTerminalIcon,
  FileText,
  FileTextIcon,
  TrendingUp,
  XCircle,
} from "lucide-react/dist/cjs/lucide-react";
import { FiDollarSign, FiFileText } from "react-icons/fi";
import { FiChevronLeft, FiTrendingUp ,FiClock , FiFilter,FiLayers,FiCreditCard,FiCheck,FiRefreshCw, FiCalendar,FiAlertCircle, FiChevronRight, FiEye } from "react-icons/fi";
const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#E53E3E",
];

// Glass style helper
export default function ProfessionalReportsSingleFileDashboard() {
  const toast = useToast();
    const cardBg = useColorModeValue('white', 'gray.800');
  const bgCard = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const hoverBg = useColorModeValue("gray.50", "gray.700");
  // Core data
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]); // raw items
  const [summaryReport, setSummaryReport] = useState(null); // full envelope from /api/report
  const [summary, setSummary] = useState(null); // data from /api/report/summary
  const [timestamp, setTimestamp] = useState(null);

  // UI state
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    type: "",
    paymentMethod: "",
    currency: "",
    status: "",
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [exporting, setExporting] = useState(false);

  // ---------- Utilities ----------
  const formatDate = useCallback((d) => {
    if (!d) return "-";
    try {
      return new Date(d).toLocaleDateString("lo-LA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return d;
    }
  }, []);

  const formatAmount = useCallback((amount, currency) => {
    if (amount === undefined || amount === null) return "-";
    try {
      return (
        new Intl.NumberFormat("lo-LA").format(Number(amount)) +
        (currency ? ` ${currency}` : "")
      );
    } catch {
      return `${amount} ${currency || ""}`;
    }
  }, []);

  // ---------- Fetching ----------
  const fetchReports = useCallback(
    async (opts = {}) => {
      setLoading(true);
      try {
        const qp = new URLSearchParams();
        Object.keys(filters).forEach((k) => {
          if (filters[k]) qp.append(k, filters[k]);
        });
        qp.append("page", opts.page || page);
        qp.append("pageSize", opts.pageSize || pageSize);

        const token = localStorage.getItem("token");
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/report?${qp.toString()}`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        if (data && data.success) {
          setReports(Array.isArray(data.data) ? data.data : []);
          setSummaryReport(data);
          setTimestamp(data.timestamp || new Date().toISOString());
        } else {
          throw new Error(data?.message || "Failed to fetch reports");
        }
      } catch (err) {
        console.error("fetchReports error", err);
        toast({
          title: "ການເອົາຂໍ້ມູນລົ້ມເຫຼວ",
          description: String(err),
          status: "error",
          duration: 4000,
        });
      } finally {
        setLoading(false);
      }
    },
    [filters, page, pageSize, toast]
  );

  const fetchSummary = useCallback(async () => {
    try {
      const qp = new URLSearchParams();
      if (filters.startDate) qp.append("startDate", filters.startDate);
      if (filters.endDate) qp.append("endDate", filters.endDate);
      qp.append("groupBy", "day");
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/report/summary?${qp.toString()}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      const extracted = data?.data || data?.summary || data;
      setSummary(extracted);
    } catch (err) {
      console.error("fetchSummary error", err);
    }
  }, [filters]);

  // Initial load
  useEffect(() => {
    fetchReports({ page: 1, pageSize });
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when filters change
  useEffect(() => {
    setPage(1);
    fetchReports({ page: 1, pageSize });
    fetchSummary();
  }, [filters]);

  // ---------- Derived aggregations (useMemo) ----------
  // totals per currency from summary.byCurrency or fallback from reports
  const totalsByCurrency = useMemo(() => {
    const byCurrency = {};
    const sb =
      summaryReport?.summary?.byCurrency || summary?.byCurrency || null;
    if (sb) {
      // copy directly
      Object.entries(sb).forEach(([cur, val]) => {
        byCurrency[cur] = val;
      });
      return byCurrency;
    }
    // fallback compute
    (reports || []).forEach((r) => {
      (r.listAmount || []).forEach((la) => {
        if (!byCurrency[la.currency])
          byCurrency[la.currency] = {
            count: 0,
            totalAmount: 0,
            income: 0,
            expense: 0,
            payable: 0,
            receivable: 0,
            opo: 0,
          };
        byCurrency[la.currency].count += 1;
        byCurrency[la.currency].totalAmount += Number(la.amount || 0);
        const t = r.type || (r.sourceType && r.sourceType.toLowerCase());
        if (t === "expense")
          byCurrency[la.currency].expense += Number(la.amount || 0);
        if (t === "payable")
          byCurrency[la.currency].payable += Number(la.amount || 0);
        if (t === "receivable")
          byCurrency[la.currency].receivable += Number(la.amount || 0);
        if (t === "opo" || r.type === "OPO")
          byCurrency[la.currency].opo += Number(la.amount || 0);
        if (t === "income")
          byCurrency[la.currency].income += Number(la.amount || 0);
      });
    });
    return byCurrency;
  }, [summaryReport, summary, reports]);

  // Trend chart data (map summary.trendByDate to friendly array)
  const trendSeries = useMemo(() => {
    const trend =
      summary?.trendByDate || summaryReport?.summary?.trendByDate || {};
    const arr = Object.entries(trend).map(([date, payload]) => {
      const flat = { date };
      Object.entries(payload || {}).forEach(([groupKey, groupVal]) => {
        if (groupVal && typeof groupVal === "object") {
          Object.entries(groupVal).forEach(([cur, val]) => {
            flat[`${groupKey}_${cur}`] = val;
          });
        }
      });
      if (payload.total && typeof payload.total === "object") {
        Object.entries(payload.total).forEach(([cur, val]) => {
          flat[`total_${cur}`] = val;
        });
      }
      return flat;
    });
    arr.sort((a, b) => new Date(a.date) - new Date(b.date));
    return arr;
  }, [summaryReport, summary]);

  // pie: expense by category (sum amounts per category per currency separately)
  const pieByCategory = useMemo(() => {
    const map = {};
    (reports || []).forEach((r) => {
      if ((r.type || r.sourceType) === "expense" || r.type === "expense") {
        const cat =
          (r.categoryId && r.categoryId.name) || r.category || "ລາຍຈ່າຍ";
        (r.listAmount || []).forEach((la) => {
          const key = `${cat} (${la.currency})`;
          if (!map[key]) map[key] = 0;
          map[key] += Number(la.amount || 0);
        });
      }
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [reports]);

  // payment method breakdown
  const paymentMethodBreakdown = useMemo(() => {
    const map = {};
    (reports || []).forEach((r) => {
      const method =
        r.paymentMethod ||
        (r.listAmount && r.listAmount[0] && r.listAmount[0].paymentMethod) ||
        "ບໍ່ຮູ້";
      (r.listAmount || []).forEach((la) => {
        const key = `${method} (${la.currency})`;
        if (!map[key]) map[key] = 0;
        map[key] += Number(la.amount || 0);
      });
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [reports]);

  // detect spikes in trendSeries using per-currency totals if available: compute total per day (sum of total_* keys)
  const spikeDetection = useMemo(() => {
    const days = trendSeries.map((d) => {
      let total = 0;
      Object.keys(d).forEach((k) => {
        if (k.startsWith("total_")) {
          total += Number(d[k] || 0);
        }
      });
      return { date: d.date, total };
    });
    if (days.length === 0) return { spikes: [], mean: 0, std: 0, top: null };
    const vals = days.map((d) => d.total);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance =
      vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length;
    const std = Math.sqrt(variance);
    const spikes = days.filter((d) => d.total > mean + 2 * std);
    const top = days.slice().sort((a, b) => b.total - a.total)[0];
    return { spikes, mean, std, top };
  }, [trendSeries]);

  // overdue installments list
  const overdueInstallments = useMemo(() => {
    const now = Date.now();
    const FIVE_DAYS = 5 * 24 * 60 * 60 * 1000;

    const list = [];
    (reports || []).forEach((r) => {
      (r.installments || []).forEach((ins) => {
        const due = new Date(ins.dueDate).getTime();
        const fiveDaysBefore = due - FIVE_DAYS;

        if (!ins.isPaid && now >= fiveDaysBefore) {
          list.push({ parent: r, ins });
        }
      });
    });

    return list;
  }, [reports]);

  // payable & receivable aging (simple)
  const agingBuckets = useMemo(() => {
    const now = Date.now();
    const buckets = {
      current: [],
      "1-30": [],
      "31-60": [],
      "61-90": [],
      "90+": [],
    };
    (reports || []).forEach((r) => {
      if (
        r.type === "payable" ||
        r.type === "receivable" ||
        String(r.sourceType || "")
          .toLowerCase()
          .includes("payable") ||
        String(r.sourceType || "")
          .toLowerCase()
          .includes("receivable")
      ) {
        (r.installments || []).forEach((ins) => {
          const due = new Date(ins.dueDate).getTime();
          const days = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
          const abs = Math.abs(days);
          if (days >= 0 && abs <= 30) buckets.current.push({ r, ins });
          else if (abs <= 30) buckets["1-30"].push({ r, ins });
          else if (abs <= 60) buckets["31-60"].push({ r, ins });
          else if (abs <= 90) buckets["61-90"].push({ r, ins });
          else buckets["90+"].push({ r, ins });
        });
      }
    });
    return buckets;
  }, [reports]);

  // quick counts
  const counts = useMemo(() => {
    const byStatus = {};
    (summaryReport?.summary?.byStatus
      ? Object.entries(summaryReport.summary.byStatus)
      : []
    ).forEach(([k, v]) => {
      byStatus[k] = v.count;
    });
    return {
      totalRecords: summaryReport?.summary?.totalRecords ?? reports.length,
      pending: byStatus.pending ?? byStatus["ລໍຖ້າ"] ?? 0,
      unpaid: byStatus.unpaid ?? 0,
      paid: byStatus.paid ?? 0,
      completed: byStatus.completed ?? 0,
    };
  }, [summaryReport, reports]);

  // ---------- Actions ----------
  const exportCSV = useCallback(() => {
    setExporting(true);
    try {
      const rows = [];
      const header = [
        "serial",
        "date",
        "type",
        "category",
        "paymentMethod",
        "status",
        "currency",
        "amount",
        "notes",
      ];
      rows.push(header.join(","));
      (reports || []).forEach((r) => {
        (r.listAmount || []).forEach((la) => {
          const row = [
            `"${(r.serial || "").replace(/"/g, '""')}"`,
            `"${(r.date || "").replace(/"/g, '""')}"`,
            `"${(r.type || r.sourceType || "").replace(/"/g, '""')}"`,
            `"${(r.category || "").replace(/"/g, '""')}"`,
            `"${(r.paymentMethod || la.paymentMethod || "").replace(
              /"/g,
              '""'
            )}"`,
            `"${(r.status || r.status_Ap || "").replace(/"/g, '""')}"`,
            `"${(la.currency || "").replace(/"/g, '""')}"`,
            `${la.amount || 0}`,
            `"${(r.notes || "").replace(/"/g, '""')}"`,
          ];
          rows.push(row.join(","));
        });
      });
      const csv = rows.join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reports_export_${new Date().toISOString()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "ນໍາອອກ CSV ແລ້ວ", status: "success", duration: 3000 });
    } catch (err) {
      console.error("exportCSV", err);
      toast({
        title: "ການນໍາອອກລົ້ມເຫຼວ",
        description: String(err),
        status: "error",
        duration: 4000,
      });
    } finally {
      setExporting(false);
    }
  }, [reports, toast]);
  const laoType = {
    income: "💰 ລາຍຮັບ",
    asset: "🏦 ຊັບສິນ",
    cogs: "📦 ຕົ້ນທຶນຂາຍ",
    "selling-expense": "🛒 ຄ່າໃຊ້ຈ່າຍຈຳໜ່າຍ",
    "admin-expense": "🏢 ຄ່າໃຊ້ຈ່າຍບໍລິຫານ",
    expense: "📉 ຄ່າໃຊ້ຈ່າຍອື່ນໆ",
  };

  const statusOptions = {
    ຊຳລະບາງສ່ວນ: "ຊຳລະບາງສ່ວນ",
    ຄ້າງຊຳລະ: "ຄ້າງຊຳລະ",
    ຊຳລະຄົບ: "ຊຳລະຄົບ",
    unpaid: "ຍັງບໍ່ຈ່າຍ",
    paid: "ຈ່າຍແລ້ວ",
    color: "green",
  };
  const StatusCard = ({ icon: Icon, label, value, colorScheme }) => (
    <Card
      bg={`${colorScheme}.50`}
      borderLeft="4px"
      borderLeftColor={`${colorScheme}.500`}
      _hover={{
        transform: "translateY(-2px)",
        boxShadow: "md",
      }}
      transition="all 0.2s"
    >
      <CardBody p={4}>
        <HStack spacing={3}>
          <Box bg={`${colorScheme}.100`} p={2} borderRadius="md">
            <Icon size={20} color={`var(--chakra-colors-${colorScheme}-600)`} />
          </Box>
          <Box flex={1}>
            <Text
              fontSize="xs"
              color="gray.600"
              fontFamily="Noto Sans Lao, sans-serif"
              mb={1}
            >
              {label}
            </Text>
            <Text
              fontSize="2xl"
              fontWeight="bold"
              color={`${colorScheme}.700`}
              fontFamily="Noto Sans Lao, sans-serif"
            >
              {value}
            </Text>
          </Box>
        </HStack>
      </CardBody>
    </Card>
  );
  const StatCard = ({ label, icon, iconColor, bgGradient, children }) => (
    <Box
      bgGradient={bgGradient}
      borderRadius="xl"
      p={5}
      boxShadow="md"
      transition="all 0.3s"
      position="relative"
      overflow="hidden"
      _hover={{
        boxShadow: "lg",
        transform: "translateY(-4px)",
      }}
      _before={{
        content: '""',
        position: "absolute",
        top: 0,
        right: 0,
        width: "100px",
        height: "100px",
        bgGradient: "radial(circle, whiteAlpha.200, transparent)",
        borderRadius: "full",
        transform: "translate(30%, -30%)",
      }}
    >
      <Flex justify="space-between" align="start" mb={3}>
        <Text
          fontSize="sm"
          fontWeight="semibold"
          color="whiteAlpha.900"
          fontFamily="Noto Sans Lao, sans-serif"
        >
          {label}
        </Text>
        <Box bg="whiteAlpha.300" borderRadius="lg" p={2}>
          <Icon as={icon} boxSize={4} color={iconColor} />
        </Box>
      </Flex>
      <VStack align="start" spacing={1.5}>
        {children}
      </VStack>
    </Box>
  );

  const CurrencyText = ({ currency, amount }) => (
    <Flex
      justify="space-between"
      w="full"
      bg="whiteAlpha.200"
      px={3}
      py={2}
      borderRadius="md"
      _hover={{ bg: "whiteAlpha.300" }}
      transition="all 0.2s"
    >
      <Text
        fontSize="xs"
        fontWeight="bold"
        color="white"
        fontFamily="Noto Sans Lao, sans-serif"
      >
        {currency}:
      </Text>
      <Text
        fontSize="xs"
        fontWeight="semibold"
        color="whiteAlpha.900"
        fontFamily="Noto Sans Lao, sans-serif"
      >
        {formatAmount(amount, currency)}
      </Text>
    </Flex>
  );
  const total = counts.pending + counts.unpaid + counts.paid;
  const hasSpikes = spikeDetection.spikes.length > 0;
  // ---------- Render UI ----------
   const inputBg = useColorModeValue('gray.50', 'gray.900');

  const FilterInput = ({ label, icon, children }) => (
    <GridItem>
      <VStack align="stretch" spacing={2}>
        <HStack spacing={2}>
          <Icon as={icon} boxSize={4} color="blue.500" />
          <Text
            fontSize="sm"
            fontWeight="semibold"
            fontFamily="Noto Sans Lao, sans-serif"
            color={useColorModeValue('gray.700', 'gray.300')}
          >
            {label}
          </Text>
        </HStack>
        {children}
      </VStack>
    </GridItem>
  );
  return (
    <Container
      maxW="container.xl"
      py={6}
      style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
    >
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between" align="center">
          <VStack align="start" spacing={0}>
            <Box px={4} py={2}>
              <Heading
                size="lg"
                style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
              >
                📊 ແຜງຄວບຄຸມການເງິນ — ສະຫຼຸບລວມ & ວິເຄາະ
              </Heading>
            </Box>
            <Text
              fontSize="sm"
              color="gray.300"
              style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
            >
              ສະຖານະໃນເວລາ: {timestamp ? formatDate(timestamp) : "-"}
            </Text>
          </VStack>

          <HStack>
            <Tooltip label="ນຳອອກທຸລະກຳທີ່ເຫຼືອເບິ່ງໄດ້ເປັນ CSV" hasArrow>
              <IconButton
                aria-label="export"
                icon={<DownloadIcon />}
                onClick={exportCSV}
                isLoading={exporting}
              />
            </Tooltip>
            <Tooltip label="ອັບເດດຂໍ້ມູນ" hasArrow>
              <IconButton
                aria-label="refresh"
                icon={<RepeatIcon />}
                onClick={() => {
                  fetchReports({ page, pageSize });
                  fetchSummary();
                }}
              />
            </Tooltip>
            <Button
              onClick={() => {
                fetchReports({ page, pageSize });
                fetchSummary();
              }}
            >
              <Text style={{ fontFamily: "Noto Sans Lao, sans-serif" }}>
                ອັບເດດ
              </Text>
            </Button>
          </HStack>
        </HStack>

        {/* Filters */}
        <Box 
      w="full" 
      bg={bgCard}
      borderRadius="2xl"
      p={6}
      boxShadow="xl"
      border="1px"
      borderColor={borderColor}
    >
      {/* Header */}
      <Flex align="center" mb={6}>
        <Box
          bgGradient="linear(135deg, blue.400, blue.600)"
          p={3}
          borderRadius="xl"
          mr={3}
        >
          <Icon as={FiFilter} boxSize={5} color="white" />
        </Box>
        <Box>
          <Text
            fontSize="xl"
            fontWeight="bold"
            fontFamily="Noto Sans Lao, sans-serif"
          >
            ຕົວກອງຂໍ້ມູນ
          </Text>
          <Text
            fontSize="xs"
            color="gray.500"
            fontFamily="Noto Sans Lao, sans-serif"
          >
            ເລືອກເງື່ອນໄຂເພື່ອຄົ້ນຫາຂໍ້ມູນ
          </Text>
        </Box>
      </Flex>

      <Divider mb={6} />

      <Grid 
        templateColumns={{ 
          base: "1fr", 
          md: "repeat(2, 1fr)", 
          lg: "repeat(3, 1fr)",
          xl: "repeat(6, 1fr)" 
        }} 
        gap={5}
      >
        {/* Start Date */}
        <FilterInput label="ເລີ່ມວັນທີ" icon={FiCalendar}>
          <Input
            type="date"
            value={filters.startDate}
            onChange={(e) =>
              setFilters((p) => ({ ...p, startDate: e.target.value }))
            }
            bg={inputBg}
            borderRadius="lg"
            border="2px"
            borderColor={borderColor}
            _hover={{ borderColor: 'blue.400' }}
            _focus={{ 
              borderColor: 'blue.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)'
            }}
            fontFamily="Noto Sans Lao, sans-serif"
          />
        </FilterInput>

        {/* End Date */}
        <FilterInput label="ສິ້ນສຸດວັນທີ" icon={FiCalendar}>
          <Input
            type="date"
            value={filters.endDate}
            onChange={(e) =>
              setFilters((p) => ({ ...p, endDate: e.target.value }))
            }
            bg={inputBg}
            borderRadius="lg"
            border="2px"
            borderColor={borderColor}
            _hover={{ borderColor: 'blue.400' }}
            _focus={{ 
              borderColor: 'blue.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)'
            }}
            fontFamily="Noto Sans Lao, sans-serif"
          />
        </FilterInput>

        {/* Type */}
        <FilterInput label="ປະເພດ" icon={FiLayers}>
          <Select
            value={filters.type}
            onChange={(e) =>
              setFilters((p) => ({ ...p, type: e.target.value }))
            }
            bg={inputBg}
            borderRadius="lg"
            border="2px"
            borderColor={borderColor}
            _hover={{ borderColor: 'blue.400' }}
            _focus={{ 
              borderColor: 'blue.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)'
            }}
            fontFamily="Noto Sans Lao, sans-serif"
            fontWeight="medium"
          >
            <option value="">ທັງໝົດ</option>
            <option value="income">ລາຍຮັບ</option>
            <option value="expense">ລາຍຈ່າຍ</option>
            <option value="payable">ໜີ້ຕ້ອງຈ່າຍ</option>
            <option value="receivable">ໜີ້ຕ້ອງໄດ້</option>
            <option value="OPO">OPO</option>
          </Select>
        </FilterInput>

        {/* Payment Method */}
        <FilterInput label="ວິທີການຈ່າຍ" icon={FiCreditCard}>
          <Select
            value={filters.paymentMethod}
            onChange={(e) =>
              setFilters((p) => ({ ...p, paymentMethod: e.target.value }))
            }
            bg={inputBg}
            borderRadius="lg"
            border="2px"
            borderColor={borderColor}
            _hover={{ borderColor: 'blue.400' }}
            _focus={{ 
              borderColor: 'blue.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)'
            }}
            fontFamily="Noto Sans Lao, sans-serif"
            fontWeight="medium"
          >
            <option value="">ທັງໝົດ</option>
            <option value="cash">ເງິນສົດ</option>
            <option value="transfer">ໂອນເງິນທະນາຄານ</option>
            <option value="ban_transfer">ໂອນທະນາຄານ (ແບບອື່ນ)</option>
          </Select>
        </FilterInput>

        {/* Currency */}
        <FilterInput label="ເງິນຕາ" icon={FiDollarSign}>
          <Select
            value={filters.currency}
            onChange={(e) =>
              setFilters((p) => ({ ...p, currency: e.target.value }))
            }
            bg={inputBg}
            borderRadius="lg"
            border="2px"
            borderColor={borderColor}
            _hover={{ borderColor: 'blue.400' }}
            _focus={{ 
              borderColor: 'blue.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)'
            }}
            fontFamily="Noto Sans Lao, sans-serif"
            fontWeight="medium"
          >
            <option value="">ທັງໝົດ</option>
            {Object.keys(totalsByCurrency).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </FilterInput>

        {/* Action Buttons */}
        <GridItem display="flex" alignItems="flex-end">
          <HStack w="full" spacing={3}>
            <Button
              leftIcon={<FiCheck />}
              colorScheme="blue"
              size="md"
              w="full"
              borderRadius="lg"
              onClick={() => {
                fetchReports({ page: 1 });
                fetchSummary();
              }}
              bgGradient="linear(to-r, blue.400, blue.600)"
              _hover={{
                bgGradient: "linear(to-r, blue.500, blue.700)",
                transform: "translateY(-2px)",
                boxShadow: "lg"
              }}
              transition="all 0.3s"
            >
              <Text fontFamily="Noto Sans Lao, sans-serif" fontWeight="bold">
                ນຳໃຊ້
              </Text>
            </Button>
            <Button
              leftIcon={<FiRefreshCw />}
              variant="outline"
              size="md"
              w="full"
              borderRadius="lg"
              borderWidth="2px"
              onClick={() =>
                setFilters({
                  startDate: "",
                  endDate: "",
                  type: "",
                  paymentMethod: "",
                  currency: "",
                  status: "",
                })
              }
              _hover={{
                bg: useColorModeValue('gray.100', 'gray.700'),
                transform: "translateY(-2px)",
                boxShadow: "md"
              }}
              transition="all 0.3s"
            >
              <Text fontFamily="Noto Sans Lao, sans-serif" fontWeight="bold">
                ຣີເຊັດ
              </Text>
            </Button>
          </HStack>
        </GridItem>
      </Grid>

      {/* Active Filters Display */}
      {(filters.startDate || filters.endDate || filters.type || filters.paymentMethod || filters.currency) && (
        <Box mt={6}>
          <Divider mb={4} />
          <HStack spacing={2} flexWrap="wrap">
            <Text 
              fontSize="xs" 
              fontWeight="semibold" 
              color="gray.500"
              fontFamily="Noto Sans Lao, sans-serif"
            >
              ຕົວກອງທີ່ເລືອກ:
            </Text>
            {filters.startDate && (
              <Box
                bg={useColorModeValue('blue.50', 'blue.900')}
                px={3}
                py={1}
                borderRadius="full"
                fontSize="xs"
                fontFamily="Noto Sans Lao, sans-serif"
                color={useColorModeValue('blue.700', 'blue.200')}
                fontWeight="semibold"
              >
                ເລີ່ມ: {filters.startDate}
              </Box>
            )}
            {filters.endDate && (
              <Box
                bg={useColorModeValue('blue.50', 'blue.900')}
                px={3}
                py={1}
                borderRadius="full"
                fontSize="xs"
                fontFamily="Noto Sans Lao, sans-serif"
                color={useColorModeValue('blue.700', 'blue.200')}
                fontWeight="semibold"
              >
                ສິ້ນສຸດ: {filters.endDate}
              </Box>
            )}
            {filters.type && (
              <Box
                bg={useColorModeValue('purple.50', 'purple.900')}
                px={3}
                py={1}
                borderRadius="full"
                fontSize="xs"
                fontFamily="Noto Sans Lao, sans-serif"
                color={useColorModeValue('purple.700', 'purple.200')}
                fontWeight="semibold"
              >
                ປະເພດ: {filters.type}
              </Box>
            )}
            {filters.paymentMethod && (
              <Box
                bg={useColorModeValue('green.50', 'green.900')}
                px={3}
                py={1}
                borderRadius="full"
                fontSize="xs"
                fontFamily="Noto Sans Lao, sans-serif"
                color={useColorModeValue('green.700', 'green.200')}
                fontWeight="semibold"
              >
                ການຈ່າຍ: {filters.paymentMethod}
              </Box>
            )}
            {filters.currency && (
              <Box
                bg={useColorModeValue('orange.50', 'orange.900')}
                px={3}
                py={1}
                borderRadius="full"
                fontSize="xs"
                fontFamily="Noto Sans Lao, sans-serif"
                color={useColorModeValue('orange.700', 'orange.200')}
                fontWeight="semibold"
              >
                ເງິນຕາ: {filters.currency}
              </Box>
            )}
          </HStack>
        </Box>
      )}
    </Box>
        {/* Executive KPIs */}
        <Box w="full" p={6}>
          <SimpleGrid columns={{ base: 1, md: 3, lg: 5 }} spacing={5}>
            {/* Income Card */}
            <StatCard
              label="ລາຍຮັບ (ຕາມເງິນຕາ)"
              icon={FileTerminalIcon}
              iconColor="white"
              bgGradient="linear(135deg, green.400, green.600)"
            >
              {Object.keys(totalsByCurrency).length === 0 ? (
                <Skeleton height="40px" borderRadius="md" />
              ) : (
                Object.entries(totalsByCurrency).map(([cur, info]) => (
                  <CurrencyText
                    key={cur}
                    currency={cur}
                    amount={info.income ?? 0}
                  />
                ))
              )}
              <Text
                fontSize="2xs"
                color="whiteAlpha.700"
                mt={2}
                fontFamily="Noto Sans Lao, sans-serif"
              >
                (ລາຍຮັບຈະເປັນ 0 ຖ້າ API ບໍ່ມີຂໍ້ມູນ)
              </Text>
            </StatCard>

            {/* Expense Card */}
            <StatCard
              label="ລາຍຈ່າຍລວມ (ຕາມເງິນຕາ)"
              icon={FileTextIcon}
              iconColor="white"
              bgGradient="linear(135deg, red.400, red.600)"
            >
              {Object.keys(totalsByCurrency).length === 0 ? (
                <Skeleton height="40px" borderRadius="md" />
              ) : (
                Object.entries(totalsByCurrency).map(([cur, info]) => (
                  <CurrencyText
                    key={cur}
                    currency={cur}
                    amount={info.expense ?? info.totalAmount ?? 0}
                  />
                ))
              )}
            </StatCard>

            {/* Payable Card */}
            <StatCard
              label="ໜີ້ຕ້ອງຈ່າຍ (Payable)"
              icon={FileChartColumnIcon}
              iconColor="white"
              bgGradient="linear(135deg, orange.400, orange.600)"
            >
              {Object.keys(totalsByCurrency).length === 0 ? (
                <Skeleton height="40px" borderRadius="md" />
              ) : (
                Object.entries(totalsByCurrency).map(([cur, info]) => (
                  <CurrencyText
                    key={cur}
                    currency={cur}
                    amount={info.payable ?? 0}
                  />
                ))
              )}
            </StatCard>

            {/* Receivable Card */}
            <StatCard
              label="ໜີ້ຕ້ອງໄດ້ (Receivable)"
              icon={FiDollarSign}
              iconColor="white"
              bgGradient="linear(135deg, blue.400, blue.600)"
            >
              {Object.keys(totalsByCurrency).length === 0 ? (
                <Skeleton height="40px" borderRadius="md" />
              ) : (
                Object.entries(totalsByCurrency).map(([cur, info]) => (
                  <CurrencyText
                    key={cur}
                    currency={cur}
                    amount={info.receivable ?? 0}
                  />
                ))
              )}
            </StatCard>

            {/* OPO / PO Card */}
            <StatCard
              label="OPO / PO (ຕາມເງິນຕາ)"
              icon={FiFileText}
              iconColor="white"
              bgGradient="linear(135deg, purple.400, purple.600)"
            >
              {Object.keys(totalsByCurrency).length === 0 ? (
                <Skeleton height="40px" borderRadius="md" />
              ) : (
                Object.entries(totalsByCurrency).map(([cur, info]) => (
                  <CurrencyText
                    key={cur}
                    currency={cur}
                    amount={info.opo ?? 0}
                  />
                ))
              )}
            </StatCard>
          </SimpleGrid>
        </Box>
        {/* Quick summary row */}
        <Box w="full" maxW="6xl" mx="auto" p={6}>
          <Grid templateColumns="repeat(3, 1fr)" gap={6}>
            {/* Card 1 - ທຸລະກຳທັງໝົດ */}
            <GridItem>
              <Box
                bgGradient="linear(to-br, blue.500, blue.600)"
                borderRadius="2xl"
                p={6}
                boxShadow="lg"
                transition="all 0.3s"
                _hover={{
                  boxShadow: "xl",
                  transform: "scale(1.05)",
                }}
              >
                <Flex justify="space-between" align="start">
                  <Box flex={1}>
                    <Text
                      color="blue.100"
                      fontSize="sm"
                      fontWeight="medium"
                      mb={2}
                      fontFamily="Noto Sans Lao, sans-serif"
                    >
                      ຈຳນວນທຸລະກຳທັງໝົດ
                    </Text>
                    <Text
                      color="white"
                      fontSize="4xl"
                      fontWeight="bold"
                      fontFamily="Noto Sans Lao, sans-serif"
                    >
                      {counts.totalRecords.toLocaleString()}
                    </Text>
                  </Box>
                  <Box bg="whiteAlpha.200" borderRadius="full" p={3}>
                    <Icon as={FileText} boxSize={6} color="white" />
                  </Box>
                </Flex>
              </Box>
            </GridItem>

            {/* Card 2 - ລໍຖ້າ / ບໍ່ທັນຈ່າຍ */}
            <GridItem>
              <Box
                bgGradient="linear(to-br, orange.400, orange.600)"
                borderRadius="2xl"
                p={6}
                boxShadow="lg"
                transition="all 0.3s"
                _hover={{
                  boxShadow: "xl",
                  transform: "scale(1.05)",
                }}
              >
                <Flex justify="space-between" align="start">
                  <Box flex={1}>
                    <Text
                      color="orange.100"
                      fontSize="sm"
                      fontWeight="medium"
                      mb={2}
                      fontFamily="Noto Sans Lao, sans-serif"
                    >
                      ລໍຖ້າ / ບໍ່ທັນຈ່າຍ
                    </Text>
                    <Text
                      color="white"
                      fontSize="4xl"
                      fontWeight="bold"
                      fontFamily="Noto Sans Lao, sans-serif"
                    >
                      {counts.pending} / {counts.unpaid}
                    </Text>
                  </Box>
                  <Box bg="whiteAlpha.200" borderRadius="full" p={3}>
                    <Icon as={FileClock} boxSize={6} color="white" />
                  </Box>
                </Flex>
              </Box>
            </GridItem>

            {/* Card 3 - ງວດຄ້າງຊໍາລະ */}
            <GridItem>
              <Box
                bgGradient="linear(to-br, red.500, red.600)"
                borderRadius="2xl"
                p={6}
                boxShadow="lg"
                transition="all 0.3s"
                _hover={{
                  boxShadow: "xl",
                  transform: "scale(1.05)",
                }}
              >
                <Flex justify="space-between" align="start">
                  <Box flex={1}>
                    <Text
                      color="red.100"
                      fontSize="sm"
                      fontWeight="medium"
                      mb={2}
                      fontFamily="Noto Sans Lao, sans-serif"
                    >
                      ງວດຄ້າງຊໍາລະ
                    </Text>
                    <Text
                      color="white"
                      fontSize="4xl"
                      fontWeight="bold"
                      fontFamily="Noto Sans Lao, sans-serif"
                    >
                      {overdueInstallments.length}
                    </Text>
                  </Box>
                  <Box bg="whiteAlpha.200" borderRadius="full" p={3}>
                    <Icon as={CylinderIcon} boxSize={6} color="white" />
                  </Box>
                </Flex>
              </Box>
            </GridItem>
          </Grid>
        </Box>

        {/* Analyst: Charts + Insights */}
        <Tabs colorScheme="blue">
          <TabList>
            <Tab style={{ fontFamily: "Noto Sans Lao, sans-serif" }}>
              ແນວໂນ້ມ & ຂໍ້ວິເຄາະ
            </Tab>
            <Tab style={{ fontFamily: "Noto Sans Lao, sans-serif" }}>
              ລາຍຈ່າຍຕາມປະເພດ
            </Tab>
            <Tab style={{ fontFamily: "Noto Sans Lao, sans-serif" }}>
              ວິທີການຈ່າຍ
            </Tab>
            <Tab style={{ fontFamily: "Noto Sans Lao, sans-serif" }}>
              ສູນຄວາມສ່ຽງ
            </Tab>
          </TabList>

          <TabPanels>
            {/* Trend & Insights */}
            <TabPanel>
              <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={4}>
                <GridItem>
                  <Box>
                    <Heading
                      size="md"
                      mb={3}
                      style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
                    >
                      ແນວໂນ້ມປະຈຳວັນ (ຕາມເງິນຕາ)
                    </Heading>
                    {trendSeries.length === 0 ? (
                      <Text style={{ fontFamily: "Noto Sans Lao, sans-serif" }}>
                        ບໍ່ມີຂໍ້ມູນແນວໂນ້ມ
                      </Text>
                    ) : (
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={trendSeries}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <ReTooltip />
                          <Legend />
                          {(() => {
                            const sample = trendSeries[0] || {};
                            const keys = Object.keys(sample).filter((k) =>
                              k.startsWith("total_")
                            );
                            return keys.map((k, idx) => {
                              const cur = k.split("_")[1];
                              return (
                                <Bar
                                  key={k}
                                  dataKey={k}
                                  name={`ລວມ (${cur})`}
                                  fill={COLORS[idx % COLORS.length]}
                                />
                              );
                            });
                          })()}
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </Box>
                </GridItem>

                <GridItem>
                  <Box>
                    <Heading
                      size="md"
                      mb={3}
                      style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
                    >
                      ຂໍ້ວິເຄາະ
                    </Heading>
                    <VStack align="start" spacing={3}>
                      {/* Spike Detection Section */}
                      <Card
                        borderLeft="4px"
                        borderLeftColor={hasSpikes ? "orange.500" : "blue.500"}
                      >
                        <CardBody p={5}>
                          <HStack spacing={2} mb={4} justify="space-between">
                            <HStack spacing={2}>
                              <TrendingUp
                                size={20}
                                color={
                                  hasSpikes
                                    ? "var(--chakra-colors-orange-500)"
                                    : "var(--chakra-colors-blue-500)"
                                }
                              />
                              <Text
                                fontSize="lg"
                                fontWeight="bold"
                                color="gray.700"
                                fontFamily="Noto Sans Lao, sans-serif"
                              >
                                ການກວດພົບການຜັນຜວນ
                              </Text>
                            </HStack>
                            {hasSpikes && (
                              <Badge
                                colorScheme="orange"
                                fontSize="xs"
                                px={2}
                                borderRadius="full"
                              >
                                <HStack spacing={1}>
                                  <AlertCircle size={12} />
                                  <Text>
                                    {spikeDetection.spikes.length} ການແຈ້ງເຕືອນ
                                  </Text>
                                </HStack>
                              </Badge>
                            )}
                          </HStack>

                          <SimpleGrid
                            columns={{ base: 1, md: 2 }}
                            spacing={4}
                            mb={4}
                          >
                            <Stat
                              p={3}
                              bg="blue.50"
                              borderRadius="md"
                              border="1px"
                              borderColor="blue.100"
                            >
                              <StatLabel
                                fontSize="xs"
                                color="gray.600"
                                fontFamily="Noto Sans Lao, sans-serif"
                              >
                                ຄ່າສະເລ່ຍ (Mean)
                              </StatLabel>
                              <StatNumber
                                fontSize="xl"
                                color="blue.700"
                                fontFamily="Noto Sans Lao, sans-serif"
                              >
                                {Math.round(
                                  spikeDetection.mean
                                ).toLocaleString()}
                              </StatNumber>
                            </Stat>

                            <Stat
                              p={3}
                              bg="purple.50"
                              borderRadius="md"
                              border="1px"
                              borderColor="purple.100"
                            >
                              <StatLabel
                                fontSize="xs"
                                color="gray.600"
                                fontFamily="Noto Sans Lao, sans-serif"
                              >
                                ຄ່າບ່ຽງເບນມາດຕະຖານ (Std)
                              </StatLabel>
                              <StatNumber
                                fontSize="xl"
                                color="purple.700"
                                fontFamily="Noto Sans Lao, sans-serif"
                              >
                                {Math.round(
                                  spikeDetection.std
                                ).toLocaleString()}
                              </StatNumber>
                            </Stat>
                          </SimpleGrid>

                          {spikeDetection.top && (
                            <Box
                              p={4}
                              bg="green.50"
                              borderRadius="md"
                              border="1px"
                              borderColor="green.200"
                            >
                              <HStack justify="space-between" align="start">
                                <Box>
                                  <Text
                                    fontSize="xs"
                                    color="gray.600"
                                    fontFamily="Noto Sans Lao, sans-serif"
                                    mb={1}
                                  >
                                    ວັນທີ່ມີມູນຄ່າສູງສຸດ
                                  </Text>
                                  <Text
                                    fontSize="md"
                                    fontWeight="semibold"
                                    color="gray.700"
                                    fontFamily="Noto Sans Lao, sans-serif"
                                  >
                                    {spikeDetection.top.date}
                                  </Text>
                                </Box>
                                <Box textAlign="right">
                                  <Text
                                    fontSize="xs"
                                    color="gray.600"
                                    fontFamily="Noto Sans Lao, sans-serif"
                                    mb={1}
                                  >
                                    ມູນຄ່າ
                                  </Text>
                                  <Text
                                    fontSize="2xl"
                                    fontWeight="bold"
                                    color="green.700"
                                    fontFamily="Noto Sans Lao, sans-serif"
                                  >
                                    {spikeDetection.top.total.toLocaleString()}
                                  </Text>
                                </Box>
                              </HStack>
                            </Box>
                          )}

                          {hasSpikes && (
                            <Box mt={4}>
                              <Divider mb={3} />
                              <Flex
                                p={3}
                                bg="orange.50"
                                borderRadius="md"
                                border="1px"
                                borderColor="orange.200"
                                align="center"
                                gap={3}
                              >
                                <AlertCircle
                                  size={20}
                                  color="var(--chakra-colors-orange-500)"
                                />
                                <Box flex={1}>
                                  <Text
                                    fontSize="sm"
                                    fontWeight="semibold"
                                    color="orange.800"
                                    fontFamily="Noto Sans Lao, sans-serif"
                                  >
                                    ພົບການກະຕຸ້ນ:{" "}
                                    {spikeDetection?.spikes?.length} ຄັ້ງ
                                  </Text>
                                  <Text
                                    fontSize="xs"
                                    color="orange.700"
                                    fontFamily="Noto Sans Lao, sans-serif"
                                    mt={1}
                                  >
                                    ມີການຜັນຜວນທີ່ສູງກວ່າປົກກະຕິ
                                  </Text>
                                </Box>
                              </Flex>
                            </Box>
                          )}
                        </CardBody>
                      </Card>
                      <VStack spacing={5} align="stretch">
                        <Card>
                          <CardBody p={5}>
                            <HStack spacing={2} mb={4}>
                              <Activity
                                size={20}
                                color="var(--chakra-colors-blue-500)"
                              />
                              <Text
                                fontSize="lg"
                                fontWeight="bold"
                                color="gray.700"
                                fontFamily="Noto Sans Lao, sans-serif"
                              >
                                ສະຫຼຸບຕາມສະຖານະ
                              </Text>
                            </HStack>

                            <SimpleGrid
                              columns={{ base: 1, md: 2 }}
                              spacing={4}
                            >
                              <StatusCard
                                icon={Clock}
                                label="ລໍຖ້າ"
                                value={counts.pending}
                                colorScheme="orange"
                              />
                              <StatusCard
                                icon={XCircle}
                                label="ບໍ່ທັນຈ່າຍ"
                                value={counts.unpaid}
                                colorScheme="red"
                              />
                              <StatusCard
                                icon={CheckCircle}
                                label="ຈ່າຍແລ້ວ"
                                value={counts.paid}
                                colorScheme="green"
                              />
                            </SimpleGrid>
                          </CardBody>
                        </Card>
                        <Card
                          borderRadius="lg"
                          boxShadow="sm"
                          border="1px"
                          borderColor={
                            overdueInstallments.length > 0
                              ? "red.100"
                              : "gray.200"
                          }
                          bg={
                            overdueInstallments.length > 0 ? "red.50" : "white"
                          }
                        >
                          <CardBody p={5}>
                            <HStack spacing={3} mb={4} align="center">
                              <Icon
                                as={AlertTriangle}
                                w={5}
                                h={5}
                                color={
                                  overdueInstallments.length > 0
                                    ? "red.500"
                                    : "gray.400"
                                }
                              />
                              <Text
                                fontSize="lg"
                                fontWeight="bold"
                                color={
                                  overdueInstallments.length > 0
                                    ? "red.700"
                                    : "gray.700"
                                }
                                fontFamily="Noto Sans Lao, sans-serif"
                              >
                                ແຈ້ງກ່ຽວກັບຄວາມສ່ຽງ
                              </Text>
                              {overdueInstallments.length > 0 && (
                                <Badge
                                  colorScheme="red"
                                  ml="auto"
                                  borderRadius="full"
                                  px={2}
                                >
                                  {overdueInstallments.length}
                                </Badge>
                              )}
                            </HStack>

                            <Divider mb={4} />

                            {overdueInstallments.length > 0 ? (
                              <VStack spacing={3} align="stretch">
                                {overdueInstallments.slice(0, 3).map((o, i) => (
                                  <Box
                                    key={i}
                                    p={3}
                                    bg="white"
                                    borderRadius="md"
                                    border="1px"
                                    borderColor="red.200"
                                    _hover={{
                                      borderColor: "red.300",
                                      boxShadow: "sm",
                                    }}
                                    transition="all 0.2s"
                                  >
                                    <HStack justify="space-between" mb={2}>
                                      <Text
                                        fontSize="sm"
                                        fontWeight="semibold"
                                        color="gray.700"
                                        fontFamily="Noto Sans Lao, sans-serif"
                                      >
                                        ເລກທີ: {o.parent.serial}
                                      </Text>
                                      <Badge colorScheme="red" fontSize="xs">
                                        ຄ້າງຊໍາລະ
                                      </Badge>
                                    </HStack>

                                    <VStack spacing={1.5} align="stretch">
                                      <HStack spacing={2}>
                                        <Icon
                                          as={DollarSign}
                                          w={4}
                                          h={4}
                                          color="red.500"
                                        />
                                        <Text
                                          fontSize="sm"
                                          fontWeight="medium"
                                          color="red.600"
                                          fontFamily="Noto Sans Lao, sans-serif"
                                        >
                                          {formatAmount(
                                            o.ins.amount,
                                            o.ins.currency
                                          )}
                                        </Text>
                                      </HStack>

                                      <HStack spacing={2}>
                                        <Icon
                                          as={Calendar}
                                          w={4}
                                          h={4}
                                          color="gray.500"
                                        />
                                        <Text
                                          fontSize="xs"
                                          color="gray.600"
                                          fontFamily="Noto Sans Lao, sans-serif"
                                        >
                                          ວັນທີ່ຄົບກຳນົດ:{" "}
                                          {formatDate(o.ins.dueDate)}
                                        </Text>
                                      </HStack>
                                    </VStack>
                                  </Box>
                                ))}

                                {overdueInstallments.length > 3 && (
                                  <Text
                                    fontSize="xs"
                                    color="gray.500"
                                    textAlign="center"
                                    mt={2}
                                    fontFamily="Noto Sans Lao, sans-serif"
                                  >
                                    ແລະອີກ {overdueInstallments.length - 3}{" "}
                                    ລາຍການ
                                  </Text>
                                )}
                              </VStack>
                            ) : (
                              <Box textAlign="center" py={4}>
                                <Icon
                                  as={AlertTriangle}
                                  w={8}
                                  h={8}
                                  color="green.400"
                                  mb={2}
                                />
                                <Text
                                  fontSize="sm"
                                  color="gray.600"
                                  fontFamily="Noto Sans Lao, sans-serif"
                                >
                                  ບໍ່ມີລາຍການຄ້າງຊໍາລະ
                                </Text>
                                <Text
                                  fontSize="xs"
                                  color="gray.500"
                                  mt={1}
                                  fontFamily="Noto Sans Lao, sans-serif"
                                >
                                  ການຊໍາລະຂອງທ່ານເປັນປົກກະຕິ
                                </Text>
                              </Box>
                            )}
                          </CardBody>
                        </Card>
                      </VStack>
                    </VStack>
                  </Box>
                </GridItem>
              </Grid>
            </TabPanel>

            {/* Expense breakdown */}
            <TabPanel>
              <Box>
                <Heading
                  size="md"
                  mb={3}
                  style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
                >
                  ລາຍຈ່າຍຕາມປະເພດ (ແຍກຕາມເງິນຕາ)
                </Heading>
                {pieByCategory.length === 0 ? (
                  <Text style={{ fontFamily: "Noto Sans Lao, sans-serif" }}>
                    ບໍ່ມີຂໍ້ມູນລາຍຈ່າຍ
                  </Text>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        dataKey="value"
                        data={pieByCategory}
                        nameKey="name"
                        outerRadius={100}
                        label
                      >
                        {pieByCategory.map((entry, idx) => (
                          <Cell
                            key={`c-${idx}`}
                            fill={COLORS[idx % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <ReTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </TabPanel>

            {/* Payment Methods */}
            <TabPanel>
              <Box>
                <Heading
                  size="md"
                  mb={3}
                  style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
                >
                  ການແຍກຕາມວິທີຈ່າຍ (ຕາມເງິນຕາ)
                </Heading>
                {paymentMethodBreakdown.length === 0 ? (
                  <Text style={{ fontFamily: "Noto Sans Lao, sans-serif" }}>
                    ບໍ່ມີຂໍ້ມູນ
                  </Text>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={paymentMethodBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ReTooltip />
                      <Bar dataKey="value" fill={COLORS[1]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </TabPanel>

            {/* Risk Center */}
            <TabPanel>
             <Box w="full" p={6}>
      <Grid templateColumns={{ base: "1fr", lg: "3fr 1fr" }} gap={6}>
        {/* Aging Analysis Section */}
        <GridItem>
          <Box
            bg={cardBg}
            borderRadius="2xl"
            p={6}
            boxShadow="xl"
            border="1px"
            borderColor={borderColor}
          >
            <HStack spacing={3} mb={6}>
              <Box
                bgGradient="linear(135deg, purple.400, purple.600)"
                p={3}
                borderRadius="xl"
              >
                <Icon as={FiTrendingUp} boxSize={6} color="white" />
              </Box>
              <Heading
                size="lg"
                fontFamily="Noto Sans Lao, sans-serif"
              >
                ການວິເຄາະໜີ້ Payable & Receivable
              </Heading>
            </HStack>

            <SimpleGrid columns={{ base: 1, sm: 4, md: 4, lg: 5 }} spacing={4}>
              {Object.keys(agingBuckets).map((bucket) => {
                const count = agingBuckets[bucket].length;
                const hasItems = count > 0;
                
                return (
                  <Box
                    key={bucket}
                    bg={hasItems 
                      ? useColorModeValue('orange.50', 'orange.900') 
                      : useColorModeValue('gray.50', 'gray.900')
                    }
                    p={4}
                    borderRadius="xl"
                    border="2px solid"
                    borderColor={hasItems 
                      ? useColorModeValue('orange.200', 'orange.700') 
                      : borderColor
                    }
                    transition="all 0.3s"
                    _hover={{
                      transform: 'translateY(-4px)',
                      boxShadow: 'lg'
                    }}
                  >
                    <HStack justify="space-between" mb={2}>
                      <Text
                        fontWeight="bold"
                        fontSize="sm"
                        fontFamily="Noto Sans Lao, sans-serif"
                        color={hasItems 
                          ? useColorModeValue('orange.700', 'orange.200') 
                          : 'gray.500'
                        }
                      >
                        {bucket}
                      </Text>
                      {hasItems && (
                        <Badge 
                          colorScheme="orange" 
                          borderRadius="full"
                          px={2}
                        >
                          {count}
                        </Badge>
                      )}
                    </HStack>
                    
                    <Flex align="center" mb={3}>
                      <Icon 
                        as={FiClock} 
                        mr={2} 
                        color={hasItems ? 'orange.500' : 'gray.400'}
                      />
                      <Text
                        fontSize="lg"
                        fontWeight="bold"
                        fontFamily="Noto Sans Lao, sans-serif"
                        color={hasItems 
                          ? useColorModeValue('orange.600', 'orange.300') 
                          : 'gray.400'
                        }
                      >
                        {count} ລາຍການ
                      </Text>
                    </Flex>

                    {hasItems && (
                      <VStack align="stretch" spacing={1.5}>
                        {agingBuckets[bucket].slice(0, 2).map((item, idx) => (
                          <Box
                            key={idx}
                            bg={useColorModeValue('white', 'gray.800')}
                            p={2}
                            borderRadius="md"
                            fontSize="xs"
                            fontFamily="Noto Sans Lao, sans-serif"
                          >
                            <Text   fontFamily="Noto Sans Lao, sans-serif" fontWeight="semibold" color="blue.600">
                            ເລກທີ່  {item.r.serial}
                            </Text>
                            <Text   fontFamily="Noto Sans Lao, sans-serif" color="green.600">
                              {formatAmount(item.ins.amount, item.ins.currency)}
                            </Text>
                          </Box>
                        ))}
                      </VStack>
                    )}
                  </Box>
                );
              })}
            </SimpleGrid>
          </Box>
        </GridItem>

        {/* Overdue Items Section */}
        <GridItem>
          <Box
            bg={cardBg}
            borderRadius="2xl"
            p={6}
            boxShadow="xl"
            border="1px"
            borderColor={borderColor}
            h="full"
          >
            <HStack spacing={3} mb={6}>
              <Box
                bgGradient="linear(135deg, red.400, red.600)"
                p={3}
                borderRadius="xl"
              >
                <Icon as={FiAlertCircle} boxSize={6} color="white" />
              </Box>
              <Box>
                <Heading
                  size="lg"
                  fontFamily="Noto Sans Lao, sans-serif"
                >
                  ລາຍການຄ້າງ
                </Heading>
                {overdueInstallments.length > 0 && (
                  <Badge 
                    colorScheme="red" 
                    fontSize="xs"
                    mt={1}
                  >
                    {overdueInstallments.length} ລາຍການຄ້າງຊໍາລະ
                  </Badge>
                )}
              </Box>
            </HStack>

            {overdueInstallments.length === 0 ? (
              <Flex
                direction="column"
                align="center"
                justify="center"
                py={10}
                bg={useColorModeValue('green.50', 'green.900')}
                borderRadius="xl"
              >
                <Icon 
                  as={FiDollarSign} 
                  boxSize={12} 
                  color="green.500"
                  mb={3}
                />
                <Text 
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontSize="lg"
                  fontWeight="semibold"
                  color="green.600"
                >
                  ບໍ່ມີລາຍການຄ້າງ
                </Text>
              </Flex>
            ) : (
              <VStack align="stretch" spacing={3}>
                {overdueInstallments.slice(0, 6).map((item, idx) => (
                  <Box
                    key={idx}
                    bg={useColorModeValue('red.50', 'red.900')}
                    p={4}
                    borderRadius="xl"
                    border="2px solid"
                    borderColor={useColorModeValue('red.200', 'red.700')}
                    transition="all 0.2s"
                    _hover={{
                      bg: useColorModeValue('red.100', 'red.800'),
                      transform: 'translateX(4px)',
                      boxShadow: 'md'
                    }}
                  >
                    <HStack justify="space-between" mb={2}>
                      <Text
                        fontSize="md"
                        fontWeight="bold"
                        fontFamily="Noto Sans Lao, sans-serif"
                        color={useColorModeValue('red.700', 'red.200')}
                      >
                       ເລກທີ່ {item.parent.serial}
                      </Text>
                      <Badge   fontFamily="Noto Sans Lao, sans-serif" colorScheme="red" fontSize="2xs">
                        ຄ້າງ
                      </Badge>
                    </HStack>
                    
                    <Text
                      fontSize="sm"
                      fontFamily="Noto Sans Lao, sans-serif"
                      color={useColorModeValue('gray.600', 'gray.300')}
                      mb={2}
                    >
                      {item.parent.category}
                    </Text>

                    <HStack 
                      spacing={3} 
                      fontSize="xs"
                      fontFamily="Noto Sans Lao, sans-serif"
                    >
                      <Flex align="center">
                        <Icon as={FiDollarSign} mr={1} color="green.500" />
                        <Text fontWeight="semibold" color="green.600">
                          {formatAmount(item.ins.amount, item.ins.currency)}
                        </Text>
                      </Flex>
                      <Text color="gray.500">•</Text>
                      <Flex align="center">
                        <Icon as={FiClock} mr={1} color="red.500" />
                        <Text color={useColorModeValue('red.600', 'red.300')}>
                          {formatDate(item.ins.dueDate)}
                        </Text>
                      </Flex>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            )}
          </Box>
        </GridItem>
      </Grid>
    </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>

        {/* Transactions Table */}
        <Box
          w="full"
          bg={bgCard}
          borderRadius="2xl"
          p={6}
          boxShadow="xl"
          border="1px"
          borderColor={borderColor}
        >
          {/* Header Section */}
          <Flex
            justify="space-between"
            align="center"
            mb={6}
            flexWrap="wrap"
            gap={4}
          >
            <HStack spacing={3}>
              <Box bg="blue.500" p={2} borderRadius="lg">
                <Icon as={FiFileText} boxSize={5} color="white" />
              </Box>
              <Heading size="lg" fontFamily="Noto Sans Lao, sans-serif">
                ທຸລະກຳ
              </Heading>
            </HStack>

            {/* Pagination Controls */}
            <HStack spacing={3} flexWrap="wrap">
              <HStack
                bg={useColorModeValue("gray.100", "gray.700")}
                borderRadius="lg"
                p={1}
              >
                <IconButton
                  size="sm"
                  icon={<FiChevronLeft />}
                  onClick={() => {
                    if (page > 1) {
                      setPage((p) => p - 1);
                      fetchReports({ page: page - 1 });
                    }
                  }}
                  isDisabled={page <= 1}
                  variant="ghost"
                  _hover={{ bg: "blue.500", color: "white" }}
                />
                <Box
                  px={4}
                  py={1}
                  bg={useColorModeValue("white", "gray.800")}
                  borderRadius="md"
                >
                  <Text
                    fontFamily="Noto Sans Lao, sans-serif"
                    fontSize="sm"
                    fontWeight="semibold"
                  >
                    ໜ້າ {page}
                  </Text>
                </Box>
                <IconButton
                  size="sm"
                  icon={<FiChevronRight />}
                  onClick={() => {
                    setPage((p) => p + 1);
                    fetchReports({ page: page + 1 });
                  }}
                  isDisabled={reports.length < pageSize}
                  variant="ghost"
                  _hover={{ bg: "blue.500", color: "white" }}
                />
              </HStack>

              <Select
                size="sm"
                width="140px"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  fetchReports({ page: 1, pageSize: Number(e.target.value) });
                }}
                borderRadius="lg"
                fontFamily="Noto Sans Lao, sans-serif"
                fontWeight="medium"
              >
                <option value={10}>10 / ຫນ້າ</option>
                <option value={20}>20 / ຫນ້າ</option>
                <option value={50}>50 / ຫນ້າ</option>
              </Select>
            </HStack>
          </Flex>

          {/* Table Section */}
          {loading ? (
            <VStack align="stretch" spacing={3}>
              <Skeleton height="60px" borderRadius="lg" />
              <Skeleton height="60px" borderRadius="lg" />
              <Skeleton height="60px" borderRadius="lg" />
            </VStack>
          ) : (
            <Box
              overflowX="auto"
              borderRadius="xl"
              border="1px"
              borderColor={borderColor}
            >
              <Table variant="simple">
                <Thead bg={useColorModeValue("gray.50", "gray.900")}>
                  <Tr>
                    <Th
                      fontFamily="Noto Sans Lao, sans-serif"
                      fontSize="xs"
                      textTransform="none"
                      color={useColorModeValue("gray.700", "gray.300")}
                      py={4}
                    >
                      ເລກທຸລະກຳ
                    </Th>
                    <Th
                      fontFamily="Noto Sans Lao, sans-serif"
                      fontSize="xs"
                      textTransform="none"
                      color={useColorModeValue("gray.700", "gray.300")}
                    >
                      ວັນທີ
                    </Th>
                    <Th
                      fontFamily="Noto Sans Lao, sans-serif"
                      fontSize="xs"
                      textTransform="none"
                      color={useColorModeValue("gray.700", "gray.300")}
                    >
                      ໝວດໝູ່
                    </Th>
                    <Th
                      fontFamily="Noto Sans Lao, sans-serif"
                      fontSize="xs"
                      textTransform="none"
                      color={useColorModeValue("gray.700", "gray.300")}
                    >
                      ປະເພດ
                    </Th>
                    <Th
                      fontFamily="Noto Sans Lao, sans-serif"
                      fontSize="xs"
                      textTransform="none"
                      color={useColorModeValue("gray.700", "gray.300")}
                    >
                      ຈຳນວນ
                    </Th>
                    <Th
                      fontFamily="Noto Sans Lao, sans-serif"
                      fontSize="xs"
                      textTransform="none"
                      color={useColorModeValue("gray.700", "gray.300")}
                    >
                      ສະຖານະ
                    </Th>
                    <Th
                      fontFamily="Noto Sans Lao, sans-serif"
                      fontSize="xs"
                      textTransform="none"
                      color={useColorModeValue("gray.700", "gray.300")}
                    >
                      ຈັດການ
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {(reports || []).map((r) => (
                    <Tr
                      key={r._id}
                      _hover={{
                        bg: hoverBg,
                        cursor: "pointer",
                        transform: "scale(1.01)",
                      }}
                      transition="all 0.2s"
                      onClick={() => setSelectedRecord(r)}
                    >
                      <Td
                        fontFamily="Noto Sans Lao, sans-serif"
                        fontWeight="semibold"
                        color="blue.600"
                        py={4}
                      >
                        {r.serial}
                      </Td>
                      <Td fontFamily="Noto Sans Lao, sans-serif">
                        {formatDate(r.date)}
                      </Td>
                      <Td>
                        <Badge
                          colorScheme={
                            r.type === "expense"
                              ? "red"
                              : r.type === "payable"
                              ? "orange"
                              : "purple"
                          }
                          px={3}
                          py={1}
                          borderRadius="full"
                          fontSize="xs"
                        >
                          <Text fontFamily="Noto Sans Lao, sans-serif">
                            {laoType[r.categoryId && r.categoryId.type]}
                          </Text>
                        </Badge>
                      </Td>
                      <Td fontFamily="Noto Sans Lao, sans-serif">
                        {r.category}
                      </Td>
                      <Td>
                        <VStack align="start" spacing={1}>
                          {(r.listAmount || []).map((la) => (
                            <Box
                              key={la._id}
                              bg={useColorModeValue("green.50", "green.900")}
                              px={2}
                              py={1}
                              borderRadius="md"
                            >
                              <Text
                                fontFamily="Noto Sans Lao, sans-serif"
                                fontSize="sm"
                                fontWeight="semibold"
                                color={useColorModeValue(
                                  "green.700",
                                  "green.200"
                                )}
                              >
                                {formatAmount(la.amount, la.currency)}
                              </Text>
                            </Box>
                          ))}
                        </VStack>
                      </Td>
                      <Td>
                        <Badge
                          colorScheme={
                            r.status === "paid"
                              ? "green"
                              : r.status === "pending"
                              ? "yellow"
                              : "red"
                          }
                          px={3}
                          py={1}
                          borderRadius="full"
                          fontSize="xs"
                        >
                          <Text fontFamily="Noto Sans Lao, sans-serif">
                            {statusOptions[r.status]}
                          </Text>
                        </Badge>
                      </Td>
                      <Td>
                        <Button
                          size="sm"
                          leftIcon={<FiEye />}
                          colorScheme="blue"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRecord(r);
                          }}
                          _hover={{
                            bg: "blue.500",
                            color: "white",
                          }}
                        >
                          <Text fontFamily="Noto Sans Lao, sans-serif">
                            ເບິ່ງ
                          </Text>
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </Box>
        {/* Drilldown Modal */}
        <Modal
          isOpen={!!selectedRecord}
          onClose={() => setSelectedRecord(null)}
          size="xl"
        >
          <ModalOverlay />
          <ModalContent>
            <ModalHeader style={{ fontFamily: "Noto Sans Lao, sans-serif" }}>
              ລາຍລະອຽດທຸລະກຳ
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              {selectedRecord && (
                <VStack align="start" spacing={3}>
                  <Text style={{ fontFamily: "Noto Sans Lao, sans-serif" }}>
                    <b>ເລກທຸລະກຳ:</b> {selectedRecord.serial}
                  </Text>
                  <Text style={{ fontFamily: "Noto Sans Lao, sans-serif" }}>
                    <b>ວັນທີ:</b> {formatDate(selectedRecord.date)}
                  </Text>
                  <Text style={{ fontFamily: "Noto Sans Lao, sans-serif" }}>
                    <b>ປະເພດ:</b>{" "}
                    {selectedRecord.type || selectedRecord.sourceType}
                  </Text>
                  <Text style={{ fontFamily: "Noto Sans Lao, sans-serif" }}>
                    <b>ປະເພດ:</b>{" "}
                    {selectedRecord.category ||
                      (selectedRecord.categoryId &&
                        selectedRecord.categoryId.name)}
                  </Text>
                  <Text style={{ fontFamily: "Noto Sans Lao, sans-serif" }}>
                    <b>ວິທີຈ່າຍ:</b>{" "}
                    {selectedRecord.paymentMethod ||
                      (selectedRecord.listAmount &&
                        selectedRecord.listAmount[0] &&
                        selectedRecord.listAmount[0].paymentMethod)}
                  </Text>
                  <Divider />
                  <Text
                    fontWeight="semibold"
                    style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
                  >
                    ຈຳນວນເງິນ:
                  </Text>
                  {(selectedRecord.listAmount || []).map((la) => (
                    <Box key={la._id}>
                      <Text
                        fontSize="sm"
                        style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
                      >
                        {formatAmount(la.amount, la.currency)}{" "}
                        {la.description ? `— ${la.description}` : ""}
                      </Text>
                    </Box>
                  ))}
                  <Divider />
                  <Text
                    fontWeight="semibold"
                    style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
                  >
                    ງວດ:
                  </Text>
                  {(selectedRecord.installments || []).length === 0 ? (
                    <Text style={{ fontFamily: "Noto Sans Lao, sans-serif" }}>
                      -
                    </Text>
                  ) : (
                    selectedRecord.installments.map((ins) => (
                      <Box key={ins._id}>
                        <Text
                          fontSize="sm"
                          style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
                        >
                          ກ່ອນ: {formatDate(ins.dueDate)} • ຈໍານວນ:{" "}
                          {formatAmount(ins.amount, ins.currency)} • ຈ່າຍແລ້ວ:{" "}
                          {ins.isPaid ? formatDate(ins.paidDate) : "ບໍ່"}
                        </Text>
                      </Box>
                    ))
                  )}
                  <Divider />
                  <Text style={{ fontFamily: "Noto Sans Lao, sans-serif" }}>
                    <b>ບັນທึก:</b> {selectedRecord.notes || "-"}
                  </Text>
                </VStack>
              )}
            </ModalBody>
          </ModalContent>
        </Modal>
      </VStack>
    </Container>
  );
}
