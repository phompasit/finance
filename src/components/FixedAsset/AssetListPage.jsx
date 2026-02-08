// components/FixedAsset/AssetListPage.jsx
import React, { useMemo, useRef } from "react";
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  HStack,
  VStack,
  Card,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  IconButton,
  Flex,
  SimpleGrid,
  Tag,
} from "@chakra-ui/react";
import {
  Plus,
  Eye,
  Edit,
  TrendingDown,
  Archive,
  BadgeX,
  Download,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { formatDate } from "../Income_Expense/formatter";
import ReportFilter from "../Accounting_component/ReportFilter";
import html2pdf from "html2pdf.js";
import AssetPrintReport from "./AssetPrintReport";
import { useAuth } from "../../context/AuthContext";

const AssetListPage = ({
  assets = [],
  loading = false,
  activeFilterLabel,
  /* ===== filter props (from parent) ===== */
  filter,
  setFilter,
  yearOptions,
  search,
  setSearch,
  onApplyFilter,
  ActiveFilterBar,
  FILTER_MODE,
  depreciationAmount,
  depreciationThisYearAmount,
  depreciationBeforeYearAmount,
  /* ===== helpers ===== */
  formatCurrency,
  getStatusColor,
  onView,
  handleRollback,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const printRef = useRef();
  /* ================= STATS (MEMOIZED) ================= */
  const stats = useMemo(() => {
    return {
      total: assets.length,
      active: assets.filter((a) => a.status === "active").length,
      totalCost: assets.reduce((s, a) => s + (a.cost || 0), 0),
      accDep: assets.reduce((s, a) => s + (a.accumulatedDepreciation || 0), 0),
      nbv: assets.reduce((s, a) => s + (a.netBookValue || 0), 0),
    };
  }, [assets]);
  const handleExportPDF = async () => {
    html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename: "asset.pdf",
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

  return (
    <Container maxW="container.xl" py={8}>
      <VStack align="stretch" spacing={6}>
        {/* ================= HEADER ================= */}
        <Box>
          <Heading fontFamily="Noto Sans Lao, sans-serif" size="lg">
            ຊັບສົມບັດຄົງທີ່ (Fixed Assets)
          </Heading>
          <Text
            fontFamily="Noto Sans Lao, sans-serif"
            fontSize="sm"
            color="gray.600"
          >
            ຫັກຄ່າເສື່ອມມູນຄ່າແບບ (Straight-line)
          </Text>
          {activeFilterLabel && <ActiveFilterBar label={activeFilterLabel} />}
        </Box>

        {/* ================= TOOLBAR ================= */}
        <Card>
          <CardBody>
            <Flex gap={4} wrap="wrap" justify="space-between">
              {/* ===== FILTER PANEL ===== */}
              <ReportFilter
                filter={filter}
                setFilter={setFilter}
                yearOptions={yearOptions}
                search={search}
                setSearch={setSearch}
                onApply={onApplyFilter}
                FILTER_MODE={FILTER_MODE}
              />

              <Button
                fontFamily="Noto Sans Lao, sans-serif"
                leftIcon={<Plus size={18} />}
                colorScheme="blue"
                onClick={() => navigate("/fixed-add/new")}
              >
                ເພີ່ມຊັບສິນ
              </Button>

              <HStack>
                <Box display="none">
                  <AssetPrintReport
                    ref={printRef}
                    assets={assets}
                    depreciationBeforeYearAmount={depreciationBeforeYearAmount}
                    depreciationThisYearAmount={depreciationThisYearAmount}
                    depreciationAmount={depreciationAmount}
                    filter={filter}
                    activeFilterLabel={activeFilterLabel}
                    company={{
                      name: user?.companyId.name,
                      address: user?.companyId?.address,
                      phone: user?.companyId?.phone,
                    }}
                  />
                </Box>
                <Button
                  fontFamily="Noto Sans Lao, sans-serif"
                  leftIcon={<Download />}
                  colorScheme="blue"
                  variant="outline"
                  onClick={handleExportPDF}
                >
                  ສົ່ງອອກ PDF
                </Button>
                <Button
                  fontFamily="Noto Sans Lao, sans-serif"
                  leftIcon={<Download />}
                  colorScheme="blue"
                  variant="outline"
                >
                  ສົ່ງອອກ Excel
                </Button>
              </HStack>
            </Flex>
          </CardBody>
        </Card>

        {/* ================= STATS ================= */}
        <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel fontFamily="Noto Sans Lao, sans-serif">
                  ລວມຊັບສິນ
                </StatLabel>
                <StatNumber>{stats.total}</StatNumber>
                <StatHelpText>Active: {stats.active}</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel fontFamily="Noto Sans Lao, sans-serif">
                  ລວມຕົ້ນທຶນ
                </StatLabel>
                <StatNumber>{formatCurrency(stats.totalCost)}</StatNumber>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel fontFamily="Noto Sans Lao, sans-serif">
                  ຄ່າຫຼູ້ຍຫ້ຽນສະສົມ
                </StatLabel>
                <StatNumber color="orange.500">
                  {formatCurrency(depreciationAmount)}
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel fontFamily="Noto Sans Lao, sans-serif">
                  ມູນຄ່າຕາມບັນຊີ
                </StatLabel>
                <StatNumber color="green.600">
                  {formatCurrency(stats.totalCost - depreciationAmount)}
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* ================= TABLE ================= */}
        <Card>
          <CardBody overflowX="auto">
            {loading ? (
              <Text>Loading...</Text>
            ) : assets.length > 0 ? (
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th fontFamily="Noto Sans Lao, sans-serif">ລະຫັດຊັບສິນ</Th>
                    <Th fontFamily="Noto Sans Lao, sans-serif">ຊື່ຊັບສິນ</Th>
                    <Th fontFamily="Noto Sans Lao, sans-serif">ໝວດໝູ່</Th>
                    <Th fontFamily="Noto Sans Lao, sans-serif">ວັນເລີ່ມໃຊ້</Th>
                    <Th fontFamily="Noto Sans Lao, sans-serif" isNumeric>
                      ຕົ້ນທຶນ
                    </Th>
                    <Th fontFamily="Noto Sans Lao, sans-serif">ສະຖານະ</Th>
                    <Th fontFamily="Noto Sans Lao, sans-serif">Action</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {assets.map((a) => (
                    <Tr key={a._id}>
                      <Td>{a.assetCode}</Td>
                      <Td>{a.name}</Td>
                      <Td>
                        <Tag size="sm">{a.category}</Tag>
                      </Td>
                      <Td>{formatDate(a.startUseDate?.slice(0, 10))}</Td>
                      <Td isNumeric>{formatCurrency(a.cost)}</Td>
                      <Td>
                        <Badge colorScheme={getStatusColor(a.status)}>
                          {a.status}
                        </Badge>
                      </Td>
                      <Td>
                        <HStack>
                          <IconButton
                            size="sm"
                            icon={<Eye size={16} />}
                            onClick={() => onView(a)}
                          />
                          <IconButton
                            size="sm"
                            icon={<Edit size={16} />}
                            onClick={() => navigate(`/fixed-add/${a._id}`)}
                          />
                          <IconButton
                            onClick={() => handleRollback(a._id)}
                            size="sm"
                            icon={<BadgeX size={16} />}
                          />
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            ) : (
              <VStack py={10}>
                <Archive size={40} />
                <Text>No assets found</Text>
              </VStack>
            )}
          </CardBody>
        </Card>
      </VStack>
    </Container>
  );
};

export default AssetListPage;
