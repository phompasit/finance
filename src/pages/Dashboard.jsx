import React, { useState, useEffect } from "react";
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
  Alert,
  AlertIcon,
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
} from "@chakra-ui/react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const ReportsPage = () => {
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [totalPerCurrency, setTotalPerCurrency] = useState({});
  const [summary, setSummary] = useState([]);
  const [summaryReport, setSummaryReport] = useState();
  const toast = useToast();

  // Filters
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    debtType: "",
    type: "",
    paymentMethod: "",
    currency: "",
    status: "",
  });

  // Fetch reports data
  const fetchReports = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        if (filters[key]) queryParams.append(key, filters[key]);
      });
      const token = localStorage.getItem("token");
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/report?${queryParams}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      console.log(data);
      if (data.success) {
        setReports(data.data);
        setSummaryReport(data);
        setTotalPerCurrency(data.summary.byCurrency);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: "ເກີດຂໍ້ຜິດພາດ",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch summary for charts
  const fetchSummary = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.startDate) queryParams.append("startDate", filters.startDate);
      if (filters.endDate) queryParams.append("endDate", filters.endDate);
      queryParams.append("groupBy", "month");
      const token = localStorage.getItem("token");
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/report/summary?${queryParams}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response;

      if (data.success) {
        setSummary(data.data);
      }
    } catch (error) {
      console.error("Summary fetch error:", error);
    }
  };

  useEffect(() => {
    fetchReports();
    fetchSummary();
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    fetchReports();
    fetchSummary();
  };

  const handleReset = () => {
    setFilters({
      startDate: "",
      endDate: "",
      debtType: "",
      type: "",
      paymentMethod: "",
      currency: "",
      status: "",
    });
    setTimeout(() => {
      fetchReports();
      fetchSummary();
    }, 100);
  };

  // Format payment method
  const formatPaymentMethod = (method) => {
    if (method === "cash") return "ເງິນສົດ";
    if (method === "transfer" || method === "ban_transfer") return "ເງິນໂອນ";
    return method;
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("lo-LA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // Truncate description
  const truncateText = (text, maxLength = 30) => {
    if (!text) return "-";
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "green";
      case "pending":
        return "yellow";
      case "cancelled":
        return "red";
      case "approved":
        return "blue";
      default:
        return "gray";
    }
  };

  // Format currency amount
  const formatAmount = (amount, currency) => {
    return new Intl.NumberFormat("lo-LA").format(amount) + " " + currency;
  };
  console.log("summary", summary);
  // Prepare chart data
const prepareChartDataFromSummary = () => {
  const trendByDate = summaryReport?.summary?.trendByDate;
  
  if (!trendByDate) return [];
  
  return Object.entries(trendByDate).map(([date, data]) => {
    return {
      date,
      // รายรับ แยกตามสกุลเงิน
      ລາຍຮັບ_LAK: data.ລາຍຮັບ?.LAK || 0,
      ລາຍຮັບ_USD: data.ລາຍຮັບ?.USD || 0,
      ລາຍຮັບ_THB: data.ລາຍຮັບ?.THB || 0,
      
      // รายจ่าย แยกตามสกุลเงิน
      ລາຍຈ່າຍ_LAK: data.ລາຍຈ່າຍ?.LAK || 0,
      ລາຍຈ່າຍ_USD: data.ລາຍຈ່າຍ?.USD || 0,
      ລາຍຈ່າຍ_THB: data.ລາຍຈ່າຍ?.THB || 0,
      
      // OPO แยกตามสกุลเงิน
      OPO_LAK: data.OPO?.LAK || 0,
      OPO_USD: data.OPO?.USD || 0,
      OPO_THB: data.OPO?.THB || 0,
      
      // ลูกหนี้ แยกตามสกุลเงิน
      ໜີ້ຕ້ອງຮັບ_LAK: data.ໜີ້ຕ້ອງຮັບ?.LAK || 0,
      ໜີ້ຕ້ອງຮັບ_USD: data.ໜີ້ຕ້ອງຮັບ?.USD || 0,
      ໜີ້ຕ້ອງຮັບ_THB: data.ໜີ້ຕ້ອງຮັບ?.THB || 0,
      
      // เจ้าหนี้ แยกตามสกุลเงิน
      ໜີ້ຕ້ອງສົ່ງ_LAK: data.ໜີ້ຕ້ອງສົ່ງ?.LAK || 0,
      ໜີ້ຕ້ອງສົ່ງ_USD: data.ໜີ້ຕ້ອງສົ່ງ?.USD || 0,
      ໜີ້ຕ້ອງສົ່ງ_THB: data.ໜີ້ຕ້ອງສົ່ງ?.THB || 0,
    };
  });
};
  const getTypeBadgePrint = (sourceType) => {
    const labels = {
      income: "ລາຍຮັບ",
      expense: "ລາຍຈ່າຍ",
      receivable: "ໜີ້ຕ້ອງຮັບ",
      payable: "ໜີ້ຕ້ອງສົ່ງ",
      OPO: "OPO",
    };

    const key = sourceType;

    return labels[key] || sourceType;
  };

  // Prepare pie chart data
  const preparePieData = () => {
    const typeSum = {};
    reports.forEach((record) => {
      if (!typeSum[record.type]) typeSum[record.type] = 0;
      typeSum[record.type] += parseFloat(record.amount);
    });

    return Object.keys(typeSum).map((key) => ({
      name: key,
      value: typeSum[key],
    }));
  };

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Heading
          fontFamily="Noto Sans Lao, sans-serif"
          size="lg"
          color="blue.600"
        >
          📊 ສະຫຼຸບຜົນ
        </Heading>

        {/* Filters */}
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Grid templateColumns="repeat(4, 1fr)" gap={4}>
                <GridItem>
                  <Text
                    fontFamily="Noto Sans Lao, sans-serif"
                    mb={2}
                    fontWeight="medium"
                  >
                    ວັນທີເລີ່ມຕົ້ນ
                  </Text>
                  <Input
                    fontFamily="Noto Sans Lao, sans-serif"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) =>
                      handleFilterChange("startDate", e.target.value)
                    }
                  />
                </GridItem>
                <GridItem>
                  <Text
                    fontFamily="Noto Sans Lao, sans-serif"
                    mb={2}
                    fontWeight="medium"
                  >
                    ວັນທີສິ້ນສຸດ
                  </Text>
                  <Input
                    fontFamily="Noto Sans Lao, sans-serif"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) =>
                      handleFilterChange("endDate", e.target.value)
                    }
                  />
                </GridItem>
                <GridItem>
                  <Text
                    fontFamily="Noto Sans Lao, sans-serif"
                    mb={2}
                    fontWeight="medium"
                  >
                    ປະເພດໜີ້
                  </Text>
                  <Select
                    fontFamily="Noto Sans Lao, sans-serif"
                    value={filters.debtType}
                    onChange={(e) =>
                      handleFilterChange("debtType", e.target.value)
                    }
                  >
                    <option value="">ທັງໝົດ</option>
                    <option value="payable">ໜີ້ຈ່າຍ</option>
                    <option value="receivable">ໜີ້ຮັບ</option>
                  </Select>
                </GridItem>
                <GridItem>
                  <Text
                    fontFamily="Noto Sans Lao, sans-serif"
                    mb={2}
                    fontWeight="medium"
                  >
                    ປະເພດ
                  </Text>
                  <Select
                    fontFamily="Noto Sans Lao, sans-serif"
                    value={filters.type}
                    onChange={(e) => handleFilterChange("type", e.target.value)}
                  >
                    <option value="">ທັງໝົດ</option>
                    <option value="income">ລາຍຮັບ</option>
                    <option value="expense">ລາຍຈ່າຍ</option>
                  </Select>
                </GridItem>
                <GridItem>
                  <Text
                    fontFamily="Noto Sans Lao, sans-serif"
                    mb={2}
                    fontWeight="medium"
                  >
                    ວິທີຊຳລະເງິນ
                  </Text>
                  <Select
                    fontFamily="Noto Sans Lao, sans-serif"
                    value={filters.paymentMethod}
                    onChange={(e) =>
                      handleFilterChange("paymentMethod", e.target.value)
                    }
                  >
                    <option value="">ທັງໝົດ</option>
                    <option value="cash">ເງິນສົດ</option>
                    <option value="transfer">ເງິນໂອນ</option>
                    <option value="ban_transfer">ເງິນໂອນ</option>
                  </Select>
                </GridItem>
                <GridItem>
                  <Text mb={2} fontWeight="medium">
                    ສະກຸນເງິນ
                  </Text>
                  <Select
                    value={filters.currency}
                    onChange={(e) =>
                      handleFilterChange("currency", e.target.value)
                    }
                    fontFamily="Noto Sans Lao, sans-serif"
                  >
                    <option value="">ທັງໝົດ</option>
                    <option value="LAK">LAK</option>
                    <option value="THB">THB</option>
                    <option value="USD">USD</option>
                  </Select>
                </GridItem>
                <GridItem>
                  <Text
                    fontFamily="Noto Sans Lao, sans-serif"
                    mb={2}
                    fontWeight="medium"
                  >
                    ສະຖານະ
                  </Text>
                  <Select
                    fontFamily="Noto Sans Lao, sans-serif"
                    value={filters.status}
                    onChange={(e) =>
                      handleFilterChange("status", e.target.value)
                    }
                  >
                    <option value="">ທັງໝົດ</option>
                    <option value="completed">ສຳເລັດ</option>
                    <option value="pending">ລໍຖ້າ</option>
                    <option value="approved">ອະນຸມັດ</option>
                    <option value="cancelled">ຍົກເລີກ</option>
                  </Select>
                </GridItem>
                <GridItem display="flex" alignItems="flex-end">
                  <HStack spacing={2} w="full">
                    <Button
                      fontFamily="Noto Sans Lao, sans-serif"
                      colorScheme="blue"
                      onClick={handleSearch}
                      flex={1}
                    >
                      ຄົ້ນຫາ
                    </Button>
                    <Button
                      fontFamily="Noto Sans Lao, sans-serif"
                      onClick={handleReset}
                      flex={1}
                    >
                      ລ້າງ
                    </Button>
                  </HStack>
                </GridItem>
              </Grid>
            </VStack>
          </CardBody>
        </Card>
        {/* Summary by Type */}
        <Card w="full">
          <CardBody>
            <Heading fontFamily="Noto Sans Lao, sans-serif" size="md" mb={4}>
              📑 ສະຫຼຸບຕາມປະເພດ
            </Heading>
            <Grid
              fontFamily="Noto Sans Lao, sans-serif"
              templateColumns="repeat(auto-fit, minmax(180px, 1fr))"
              gap={4}
            >
              {["income", "expense", "receivable", "payable", "OPO"].map(
                (type) => {
                  const typeData = summaryReport?.summary?.byType[type] || {
                    count: 0,
                    total: {},
                  };
                  const bgColor =
                    type === "ລາຍຮັບ"
                      ? "green.50"
                      : type === "ລາຍຈ່າຍ"
                      ? "red.50"
                      : type === "ໜີ້ຮັບ"
                      ? "blue.50"
                      : type === "ໜີ້ຈ່າຍ"
                      ? "orange.50"
                      : "purple.50";

                  return (
                    <Card key={type} bg={bgColor}>
                      <CardBody>
                        <Stat>
                          <StatLabel
                            fontFamily="Noto Sans Lao, sans-serif"
                            fontSize="sm"
                          >
                            {getTypeBadgePrint(type)}
                          </StatLabel>
                          {/* <StatNumber fontSize="lg">
                                    {Object.entries(typeData.total).map(
                                      ([currency, amount]) => (
                                        <Text key={currency} fontSize="sm">
                                          {new Intl.NumberFormat(
                                            "lo-LA"
                                          ).format(amount)}{" "}
                                          {currency}
                                        </Text>
                                      )
                                    )}
                                  </StatNumber> */}
                          <Text
                            fontFamily="Noto Sans Lao, sans-serif"
                            fontSize="xs"
                            mt={1}
                          >
                            {typeData.count} ລາຍການ
                          </Text>
                        </Stat>
                      </CardBody>
                    </Card>
                  );
                }
              )}
            </Grid>
          </CardBody>
        </Card>
        {/* Summary Cards */}
        <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
          {Object.keys(totalPerCurrency)?.map((currency) => (
            <Card key={currency} bg="blue.50">
              <CardBody>
                <Stat>
                  <StatLabel
                    fontFamily="Noto Sans Lao, sans-serif"
                    fontSize="sm"
                    fontWeight="bold"
                  >
                    ຍອດລວມ ({currency})
                  </StatLabel>
                  {/* <StatNumber fontSize="2xl" color="blue.600">
                    {formatAmount(totalPerCurrency[currency].totalAmount, "")}
                  </StatNumber> */}

                  <VStack align="start" mt={2} spacing={1} fontSize="xs">
                    <Text fontFamily="Noto Sans Lao, sans-serif">
                      ລາຍຮັບ:{" "}
                      {formatAmount(totalPerCurrency[currency].income, "")}
                    </Text>
                    <Text fontFamily="Noto Sans Lao, sans-serif">
                      ລາຍຈ່າຍ:{" "}
                      {formatAmount(totalPerCurrency[currency].expense, "")}
                    </Text>
                    <Text fontFamily="Noto Sans Lao, sans-serif">
                      ໜີ້ຕ້ອງຮັບ:{" "}
                      {formatAmount(totalPerCurrency[currency].receivable, "")}
                    </Text>
                    <Text fontFamily="Noto Sans Lao, sans-serif">
                      ໜີ້ຕ້ອງຈ່າຍ:{" "}
                      {formatAmount(totalPerCurrency[currency].payable, "")}
                    </Text>
                    <Text fontFamily="Noto Sans Lao, sans-serif">
                      OPO: {formatAmount(totalPerCurrency[currency].opo, "")}
                    </Text>
                  </VStack>
                </Stat>
              </CardBody>
            </Card>
          ))}
        </Grid>

        {/* Tabs for Table and Charts */}
        <Tabs colorScheme="blue">
          <TabList>
            <Tab fontFamily="Noto Sans Lao, sans-serif">📈 ກາຟສະແດງຜົນ</Tab>
          </TabList>

          <TabPanels>
            {/* Table Tab */}

            {/* Charts Tab */}
            <TabPanel px={0}>
              <VStack spacing={6}>
                {/* Line Chart */}
                <Card w="full">
                  <CardBody>
                    <Heading
                      fontFamily="Noto Sans Lao, sans-serif"
                      size="md"
                      mb={4}
                    >
                      📈 ແນວໂນ້ມລາຍຮັບ-ລາຍຈ່າຍຕາມເວລາ
                    </Heading>
                  <ResponsiveContainer width="100%" height={300}>
  <LineChart data={prepareChartDataFromSummary()}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="date" />
    <YAxis />
    <Tooltip />

    
    {/* รายรับ */}
    <Line dataKey="ລາຍຮັບ_LAK" stroke="#38A169" strokeWidth={2} name="ລາຍຮັບ (LAK)" />
    <Line dataKey="ລາຍຮັບ_USD" stroke="#48BB78" strokeWidth={2} name="ລາຍຮັບ (USD)" />
    <Line dataKey="ລາຍຮັບ_THB" stroke="#68D391" strokeWidth={2} name="ລາຍຮັບ (THB)" />
    
    {/* รายจ่าย */}
    <Line dataKey="ລາຍຈ່າຍ_LAK" stroke="#E53E3E" strokeWidth={2} name="ລາຍຈ່າຍ (LAK)" />
    <Line dataKey="ລາຍຈ່າຍ_USD" stroke="#FC8181" strokeWidth={2} name="ລາຍຈ່າຍ (USD)" />
    <Line dataKey="ລາຍຈ່າຍ_THB" stroke="#F56565" strokeWidth={2} name="ລາຍຈ່າຍ (THB)" />
    
    {/* OPO */}
    <Line dataKey="OPO_LAK" stroke="#3182CE" strokeWidth={2} name="OPO (LAK)" />
    <Line dataKey="OPO_USD" stroke="#4299E1" strokeWidth={2} name="OPO (USD)" />
    <Line dataKey="OPO_THB" stroke="#63B3ED" strokeWidth={2} name="OPO (THB)" />
    
    {/* ลูกหนี้ */}
    <Line dataKey="ໜີ້ຕ້ອງຮັບ_LAK" stroke="#805AD5" strokeWidth={2} name="ໜີ້ຕ້ອງຮັບ (LAK)" />
    <Line dataKey="ໜີ້ຕ້ອງຮັບ_USD" stroke="#9F7AEA" strokeWidth={2} name="ໜີ້ຕ້ອງຮັບ (USD)" />
    
    {/* เจ้าหนี้ */}
    <Line dataKey="ໜີ້ຕ້ອງສົ່ງ_LAK" stroke="#D69E2E" strokeWidth={2} name="ໜີ້ຕ້ອງສົ່ງ (LAK)" />
    <Line dataKey="ໜີ້ຕ້ອງສົ່ງ_USD" stroke="#F6AD55" strokeWidth={2} name="ໜີ້ຕ້ອງສົ່ງ (USD)" />
  </LineChart>
</ResponsiveContainer>
                  </CardBody>
                </Card>
{/* 
                <Grid templateColumns="repeat(2, 1fr)" gap={6} w="full">
                  <Card>
                    <CardBody>
                      <Heading
                        fontFamily="Noto Sans Lao, sans-serif"
                        size="md"
                        mb={4}
                      >
                        📊 ປຽບທຽບລາຍການ
                      </Heading>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={prepareChartDataFromSummary(summary)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="ລາຍຮັບ" fill="#38A169" />
                          <Bar dataKey="ລາຍຈ່າຍ" fill="#E53E3E" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardBody>
                  </Card>
                </Grid> */}
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Container>
  );
};

export default ReportsPage;
