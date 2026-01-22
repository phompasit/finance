// components/FixedAsset/AssetListPage.jsx
import React, { useMemo } from "react";
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
import { Plus, Eye, Edit, TrendingDown, Archive } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { formatDate } from "../Income_Expense/formatter";
import ReportFilter from "../Accounting_component/ReportFilter";

const AssetListPage = ({
  assets = [],
  loading = false,

  /* ===== filter props (from parent) ===== */
  filter,
  setFilter,
  yearOptions,
  search,
  setSearch,
  onApplyFilter,
  FILTER_MODE,
  depreciationAmount,
  /* ===== helpers ===== */
  formatCurrency,
  getStatusColor,
  onView,
  handleRollback,
}) => {
  const navigate = useNavigate();

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

  return (
    <Container maxW="container.xl" py={8}>
      <VStack align="stretch" spacing={6}>
        {/* ================= HEADER ================= */}
        <Box>
          <Heading fontFamily="Noto Sans Lao, sans-serif" size="lg">
            ຊັບສົມບັດຄົງທີ່ (Fixed Assets)
          </Heading>
          <Text fontSize="sm" color="gray.600">
            Monthly depreciation (Straight-line)
          </Text>
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
                leftIcon={<Plus size={18} />}
                colorScheme="blue"
                onClick={() => navigate("/fixed-add/new")}
              >
                Add Asset
              </Button>
            </Flex>
          </CardBody>
        </Card>

        {/* ================= STATS ================= */}
        <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total Assets</StatLabel>
                <StatNumber>{stats.total}</StatNumber>
                <StatHelpText>Active: {stats.active}</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total Cost</StatLabel>
                <StatNumber>{formatCurrency(stats.totalCost)}</StatNumber>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Accumulated Dep.</StatLabel>
                <StatNumber color="orange.500">
                  {formatCurrency(depreciationAmount)}
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Net Book Value</StatLabel>
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
                    <Th>Code</Th>
                    <Th>Name</Th>
                    <Th>Category</Th>
                    <Th>Start Date</Th>
                    <Th isNumeric>Cost</Th>
                    <Th isNumeric>Acc. Dep</Th>
                    <Th isNumeric>NBV</Th>
                    <Th>Status</Th>
                    <Th>Action</Th>
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
                      <Td isNumeric color="orange.500">
                        {formatCurrency(a.accumulatedDepreciation)}
                      </Td>
                      <Td isNumeric color="green.600">
                        {formatCurrency(a.netBookValue)}
                      </Td>
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
                            icon={<TrendingDown size={16} />}
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
