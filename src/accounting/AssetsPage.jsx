// src/pages/reports/AssetsPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  Box, Flex, Text, Button, Select, Input, Spinner, Table, Thead, Tbody, Tr, Th, Td, HStack, IconButton, useToast
} from "@chakra-ui/react";
import { Download } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { loadAssets, clearMessage } from "../store/accountingReducer/assetsSlice";

const PRESETS = [
  { label: "1 month", value: "1" },
  { label: "3 months", value: "3" },
  { label: "6 months", value: "6" },
  { label: "12 months", value: "12" },
];

function formatNum(n) {
  return Number(n || 0).toLocaleString();
}

const AssetsPage = () => {
  const dispatch = useDispatch();
  const toast = useToast();
  const { data, loader, error } = useSelector((s) => s.assets || {});

  const [preset, setPreset] = useState("12");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (error) {
      toast({ title: error, status: "error" });
      dispatch(clearMessage());
    }
  }, [error]);

  const fetch = () => {
    const params = {};
    if (preset) params.preset = preset;
    else if (startDate) params.startDate = startDate;
    params.endDate = endDate;
    dispatch(loadAssets(params));
  };

  const grouped = data?.groups || {};
  const totalAssets = data?.totalAssets || 0;

  const exportCSV = () => {
    const rows = [];
    rows.push(["Group","Item","Amount"]);
    Object.keys(grouped).forEach((g) => {
      grouped[g].items.forEach((it) => {
        rows.push([g, it.label, it.amount]);
      });
      rows.push([g, "TOTAL", grouped[g].total]);
    });
    rows.push(["Total Assets", "", totalAssets]);
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `assets-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const filteredGroups = useMemo(() => {
    if (!search) return grouped;
    const out = {};
    Object.keys(grouped).forEach((g) => {
      const filteredItems = grouped[g].items.filter(it => it.label.toLowerCase().includes(search.toLowerCase()) || (it.key || "").toLowerCase().includes(search.toLowerCase()));
      if (filteredItems.length) out[g] = { items: filteredItems, total: filteredItems.reduce((s, x) => s + (Number(x.amount)||0), 0) };
    });
    return out;
  }, [grouped, search]);

  return (
    <Box p={6}>
      <Flex justify="space-between" mb={4}>
        <Box>
          <Text fontSize="2xl" fontWeight="bold">Statement of Financial Position — Assets</Text>
          <Text color="gray.500">As of period</Text>
        </Box>

        <HStack>
          <Input placeholder="Search label..." value={search} onChange={e => setSearch(e.target.value)} />
          <Select value={preset} onChange={(e) => { setPreset(e.target.value); setStartDate(""); }} width="160px">
            <option value="">Custom range</option>
            {PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </Select>
          <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPreset(""); }} />
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <Button colorScheme="blue" onClick={fetch}>Apply</Button>
          <IconButton aria-label="export" icon={<Download />} onClick={exportCSV} />
          <Button onClick={() => window.print()}>Print</Button>
        </HStack>
      </Flex>

      {loader ? <Flex justify="center" py={10}><Spinner size="xl" /></Flex> : (
        <Box bg="white" p={4} borderRadius="md" shadow="sm" overflowX="auto">
          {Object.keys(filteredGroups).length === 0 && <Text>No results</Text>}
          {Object.keys(filteredGroups).map(groupName => {
            const grp = filteredGroups[groupName];
            return (
              <Box key={groupName} mb={6}>
                <Text fontSize="lg" fontWeight="bold" mb={2}>{groupName}</Text>
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Item</Th>
                      <Th textAlign="right">Amount (LAK)</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {grp.items.map(it => (
                      <Tr key={it.key}>
                        <Td>{it.label}</Td>
                        <Td textAlign="right">{formatNum(it.amount)}</Td>
                      </Tr>
                    ))}
                    <Tr bg="gray.50" fontWeight="bold">
                      <Td>TOTAL {groupName}</Td>
                      <Td textAlign="right">{formatNum(grp.total)}</Td>
                    </Tr>
                  </Tbody>
                </Table>
              </Box>
            );
          })}

          <Box mt={4} textAlign="right">
            <Text fontSize="xl" fontWeight="bold">Total Assets: {formatNum(totalAssets)}</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default AssetsPage;
