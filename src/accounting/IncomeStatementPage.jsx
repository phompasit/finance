// src/pages/reports/IncomeStatementPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  Box, Button, Flex, Text, Select, Table, Thead, Tbody, Tr, Th, Td,
  Spinner, Input, HStack, IconButton, useToast
} from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import { loadIncomeStatement } from "../store/accountingReducer/incomeSlice";
import { Download } from "lucide-react";

const presets = [
  { label: "1 month", value: "1" },
  { label: "3 months", value: "3" },
  { label: "6 months", value: "6" },
  { label: "12 months", value: "12" },
];

const formatNum = (n) => (Number(n || 0)).toLocaleString();

const IncomeStatementPage = () => {
  const dispatch = useDispatch();
  const toast = useToast();
  const { data, loader, error } = useSelector((s) => s.income || {});

  const [preset, setPreset] = useState("12");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => { handleFetch(); }, []);

  useEffect(() => { if (error) toast({ title: error, status: "error" }); }, [error]);

  const handleFetch = () => {
    const params = {};
    if (preset) params.preset = preset;
    else {
      if (startDate) params.startDate = startDate;
      params.endDate = endDate;
    }
    dispatch(loadIncomeStatement(params));
  };

  const exportCSV = () => {
    if (!data?.lines) return;
    const rows = [["Item","Amount","Account codes / notes"]];
    data.lines.forEach((l) => {
      const codes = l?.pattern || "";
      rows.push([l.label, l.amount || 0, codes]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `income-statement-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box p={6}>
      <Flex justify="space-between" align="center" mb={4}>
        <Box>
          <Text fontSize="2xl" fontWeight="bold">Statement of Performances</Text>
          <Text color="gray.500">Income Statement</Text>
        </Box>

        <HStack spacing={3}>
          <Select value={preset} onChange={(e) => { setPreset(e.target.value); setStartDate(""); }}>
            <option value="">Custom</option>
            {presets.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </Select>
          <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPreset(""); }} />
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <Button colorScheme="blue" onClick={handleFetch}>Apply</Button>
          <IconButton aria-label="export" icon={<Download />} onClick={exportCSV} />
        </HStack>
      </Flex>

      {loader ? (
        <Flex justify="center" py={20}><Spinner size="xl" /></Flex>
      ) : (
        <Box bg="white" p={4} borderRadius="md" overflowX="auto">
          <Table variant="simple">
            <Thead bg="gray.50">
              <Tr>
                <Th>Item</Th>
                <Th textAlign="right">Amount</Th>
                <Th>Notes / Codes</Th>
              </Tr>
            </Thead>
            <Tbody>
              {data?.lines?.map((l, idx) => (
                <Tr key={l?.key || idx}>
                  <Td>{l?.label}</Td>
                  <Td textAlign="right">{formatNum(l?.amount)}</Td>
                  <Td>{l?.pattern || ""}</Td>
                </Tr>
              ))}

              {/* Totals block */}
              <Tr bg="gray.100" fontWeight="bold">
                <Td>Total (Net Profit shown below)</Td>
                <Td textAlign="right">{formatNum(data?.totals?.profitBeforeTax || 0)}</Td>
                <Td>Profit Before Tax</Td>
              </Tr>

              <Tr bg="gray.100" fontWeight="bold">
                <Td>Net Profit</Td>
                <Td textAlign="right">{formatNum(data?.totals?.netProfit || data?.totals?.profitBeforeTax || 0)}</Td>
                <Td>After tax</Td>
              </Tr>
            </Tbody>
          </Table>
        </Box>
      )}
    </Box>
  );
};

export default IncomeStatementPage;
