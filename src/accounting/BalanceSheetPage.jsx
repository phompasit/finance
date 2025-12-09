// src/pages/reports/BalanceSheetPage.jsx
import React, { useEffect, useMemo, useState } from "react";
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
} from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import { fetchDetailedBalance } from "../store/accountingReducer/balanceSlice";
import { Download, ChevronDown, ChevronRight } from "lucide-react";

const presets = [
  { label: "1 month", value: "1" },
  { label: "3 months", value: "3" },
  { label: "6 months", value: "6" },
  { label: "12 months", value: "12" },
];

const formatNum = (n) => Number(n || 0).toLocaleString();

const BalanceSheetPage = () => {
  const dispatch = useDispatch();
  const toast = useToast();

  const { list, totals, loader, error } = useSelector((s) => s.balance || {});

  const [preset, setPreset] = useState("12");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState({}); // expand map by code (or accountId)

  useEffect(() => {
    handleFetch();
  }, []);

  useEffect(() => {
    if (error) toast({ title: error, status: "error" });
  }, [error]);

  const handleFetch = () => {
    const params = {};
    if (preset) params.preset = preset;
    else {
      if (startDate) params.startDate = startDate;
      params.endDate = endDate;
    }
    params.endDate = endDate;
    dispatch(fetchDetailedBalance(params));
  };

  // Build tree from list using parentCode
  const tree = useMemo(() => {
    const map = {};
    (list || []).forEach((r) => {
      // ensure parentCode present on item (backend provides parentCode)
      map[r.code] = { ...r, children: [] };
    });

    const roots = [];
    (list || []).forEach((r) => {
      const node = map[r.code];
      const pcode = r.parentCode || null;
      if (pcode && map[pcode]) {
        map[pcode].children.push(node);
      } else {
        roots.push(node);
      }
    });

    // optional: sort children by code
    const sortTree = (nodes) => {
      nodes.sort((a, b) => (a.code > b.code ? 1 : -1));
      nodes.forEach((n) => n.children && sortTree(n.children));
    };
    sortTree(roots);
    return roots;
  }, [list]);

  // filter by search - we want to keep parents if any child matches
  const filteredTree = useMemo(() => {
    if (!search) return tree;

    const q = search.toLowerCase();
    const filterNode = (node) => {
      const match = (node.code || "").toLowerCase().includes(q) || (node.name || "").toLowerCase().includes(q);
      const children = (node.children || []).map(filterNode).filter(Boolean);
      if (match || children.length) {
        return { ...node, children };
      }
      return null;
    };

    return tree.map(filterNode).filter(Boolean);
  }, [tree, search]);

  // Toggle expand
  const toggle = (code) => {
    setExpanded((p) => ({ ...p, [code]: !p[code] }));
  };

  // CSV export (flatten visible rows in filteredTree order)
  const exportCSV = () => {
    const header = [
      "Account Number",
      "Account Name",
      "Opening DR",
      "Opening CR",
      "Movement DR",
      "Movement CR",
      "Ending DR",
      "Ending CR",
    ];

    const rows = [];
    const walk = (node, level = 0) => {
      rows.push([
        node.code,
        "  ".repeat(level) + node.name,
        node.openingDr,
        node.openingCr,
        node.movementDr,
        node.movementCr,
        node.endingDr,
        node.endingCr,
      ]);
      (node.children || []).forEach((c) => walk(c, level + 1));
    };

    filteredTree.forEach((root) => walk(root, 0));

    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `balance-summary-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // render a node row and optionally children
 const renderNode = (node, level = 0) => {
  const isParent = (node.children || []).length > 0;
  const isExpanded = expanded[node.code];

  return (
    <React.Fragment key={node.code}>

      {/* PARENT ROW */}
      <Tr fontWeight={isParent ? "bold" : "normal"} bg={isParent ? "gray.50" : undefined}>
        <Td>
          <Flex align="center" gap={2}>
            {isParent ? (
              <IconButton
                size="xs"
                variant="ghost"
                aria-label="toggle"
                icon={isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                onClick={() => toggle(node.code)}
              />
            ) : (
              // preserve space alignment
              <Box width="20px" />
            )}

            <Text ml={level * 6} fontFamily="mono">
              {node.code}
            </Text>
          </Flex>
        </Td>

        <Td>
          <Text ml={level * 6}>{node.name}</Text>
        </Td>

        <Td textAlign="right">{formatNum(node.openingDr)}</Td>
        <Td textAlign="right">{formatNum(node.openingCr)}</Td>
        <Td textAlign="right">{formatNum(node.movementDr)}</Td>
        <Td textAlign="right">{formatNum(node.movementCr)}</Td>
        <Td textAlign="right">{formatNum(node.endingDr)}</Td>
        <Td textAlign="right">{formatNum(node.endingCr)}</Td>
      </Tr>

      {/* CHILDREN (NO NEW TABLE!!) */}
      {isParent && isExpanded &&
        node.children.map((child) => renderNode(child, level + 1))
      }
    </React.Fragment>
  );
};
  return (
    <Box p={6}>
      {/* Header */}
      <Flex justify="space-between" align="center" mb={4}>
        <Box>
          <Text fontSize="2xl" fontWeight="bold">
            Balance Summary / Trial Balance
          </Text>
          <Text color="gray.500">
            Opening | Movement Period | Ending (parent shows aggregated totals)
          </Text>
        </Box>

        <Button onClick={exportCSV} leftIcon={<Download />}>Export CSV</Button>
      </Flex>

      {/* Filters */}
      <HStack mb={4} spacing={3}>
        <Input
          placeholder="Search account..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          width="250px"
        />

        <Select
          value={preset}
          onChange={(e) => {
            setPreset(e.target.value);
            setStartDate("");
          }}
          width="160px"
        >
          <option value="">Custom Range</option>
          {presets.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>

        <Input
          type="date"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            setPreset("");
          }}
        />

        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />

        <Button colorScheme="blue" onClick={handleFetch}>
          Apply
        </Button>
      </HStack>

      {/* Table */}
      {loader ? (
        <Flex justify="center" py={20}>
          <Spinner size="xl" />
        </Flex>
      ) : (
        <Box bg="white" p={4} borderRadius="md" overflowX="auto">
          <Table size="sm" variant="simple">
            <Thead bg="gray.50">
              <Tr>
                <Th>Account Number</Th>
                <Th>Account Name</Th>
                <Th textAlign="center">Opening DR</Th>
                <Th textAlign="center">Opening CR</Th>
                <Th textAlign="center">Movement DR</Th>
                <Th textAlign="center">Movement CR</Th>
                <Th textAlign="center">Ending DR</Th>
                <Th textAlign="center">Ending CR</Th>
              </Tr>
            </Thead>

            <Tbody>
              {filteredTree.map((root) => renderNode(root, 0))}

              {/* SUMMARY ROW */}
              <Tr bg="gray.100" fontWeight="bold">
                <Td colSpan={2}>TOTAL</Td>

                <Td textAlign="right">{formatNum(totals.openingDr)}</Td>
                <Td textAlign="right">{formatNum(totals.openingCr)}</Td>

                <Td textAlign="right">{formatNum(totals.movementDr)}</Td>
                <Td textAlign="right">{formatNum(totals.movementCr)}</Td>

                <Td textAlign="right">{formatNum(totals.endingDr)}</Td>
                <Td textAlign="right">{formatNum(totals.endingCr)}</Td>
              </Tr>
            </Tbody>
          </Table>
        </Box>
      )}
    </Box>
  );
};

export default BalanceSheetPage;
