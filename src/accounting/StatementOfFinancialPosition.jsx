import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Flex,
  Text,
  Button,
  Select,
  Input,
  Spinner,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  HStack,
  IconButton,
} from "@chakra-ui/react";
import { Download } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { fetchStatement } from "../store/accountingReducer/reportsSlice";
import { format } from "date-fns";

const circle = (n) => String.fromCodePoint(9311 + n);
const num = (n) => Number(n || 0).toLocaleString();

const PRESETS = [
  { label: "1 ເດືອນ", value: "1" },
  { label: "3 ເດືອນ", value: "3" },
  { label: "6 ເດືອນ", value: "6" },
  { label: "12 ເດືອນ", value: "12" },
];

const EQUITY_TEMPLATE = [
  "ທຶນຈົດທະບຽນ",
  "ສ່ວນເພີ່ມມູນຄ່າຮຸ່ນ",
  "ຄັງສຳຮອງ",
  "ຜົນໄດ້ຮັບຍົກມາ",
  "ຜົນກຳໄລສຸດທິ",
  "ພູດສ່ວນ ຂອງຜົນປະໂຫຍດສ່ວນນ້ອຍ",
  "ພູດສ່ວນຂອງກຸ່ມ",
];

const LABEL_MAP = {
  "Bank overdrafts": "ເງິນເບີກເກິນບັນຊີ",
  "Trade and other payables": "ໜີ້ຕ້ອງສົ່ງການຄ້າ",
  "Financial liabilities, short-term borrowings":
    "ໜີ້ສິນໄລຍະສັ້ນ",
  "State-debts payable (Levies-taxes)": "ໜີ້ຕ້ອງສົ່ງລັດ",
  "Short-term employee benefit obligations": "ພັນທະພະນັກງານໄລຍະສັ້ນ",
  "Other current payables": "ໜີ້ຕ້ອງສົ່ງອື່ນໆ",
  "Short-term provisions": "ເງິນແຮໄລຍະສັ້ນ",

  "Financial liabilities, long-term borrowings": "ໜີ້ສິນໄລຍະຍາວ",
  "Long-term employee benefit obligations": "ພັນທະພະນັກງານໄລຍະຍາວ",
  "Other non-current payables": "ໜີ້ບໍ່ໝູນວຽນ",
  "Provisions non-current liabilities": "ເງິນແຮບໍ່ໝູນວຽນ",
  "Deferred tax": "ອາກອນເຍື່ອນຊຳລະ",

  "Share capital": "ທຶນຈົດທະບຽນ",
  "Share premium": "ມູນຄ່າເພີ່ມ",
  Reserves: "ຄັງສຳຮອງ",
  "Retained earnings": "ຜົນໄດ້ຮັບຍົກມາ",
  "Net profit": "ກຳໄລສຸດທິ",
};

const StatementOfFinancialPosition = () => {
  const dispatch = useDispatch();
  const { data, loading, error } = useSelector((s) => s.reports || {});

  const [preset, setPreset] = useState("12");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    handleFetch();
  }, []);

  const handleFetch = () => {
    const params = preset ? { preset } : { startDate, endDate };
    dispatch(fetchStatement(params));
  };

  // Group results
  const grouped = useMemo(() => {
    if (!data?.lines) return {};
    return data.lines.reduce((acc, line) => {
      if (!acc[line.section]) acc[line.section] = [];
      acc[line.section].push(line);
      return acc;
    }, {});
  }, [data]);

  // Render Equity using template
  const equityLines = useMemo(() => {
    const lines = grouped["Equity"] || [];
    return EQUITY_TEMPLATE.map((label, index) => {
      const row = lines[index];

      return {
        label,
        pattern: row?.pattern || "",
        current: row?.ending || 0,
        previous: row?.prevEnding || 0,
      };
    });
  }, [grouped]);

  /** RENDER ROWS **/
  const renderRows = (section) => {
    if (section === "Equity") {
      return equityLines.map((r, i) => (
        <Tr key={i}>
          <Td>{circle(i + 1)} {r.label}</Td>
          <Td>{r.pattern}</Td>
          <Td isNumeric>{num(r.current)}</Td>
          <Td isNumeric>{num(r.previous)}</Td>
        </Tr>
      ));
    }

    return (grouped[section] || []).map((r) => (
      <Tr key={r.key}>
        <Td>{LABEL_MAP[r.label] || r.label}</Td>
        <Td>{r.pattern}</Td>
        <Td isNumeric>{num(r.ending || 0)}</Td>
        <Td isNumeric>{num(r.prevEnding || 0)}</Td>
      </Tr>
    ));
  };

  return (
    <Box p={6}>
      <Flex justify="space-between" mb={6}>
        <Box>
          <Text fontSize="xl" fontWeight="bold">ໃບຖານະການເງິນ – ຫນີ້ສິນ & ທຶນ</Text>
          <Text fontSize="sm">ວັນທີ {format(new Date(endDate), "yyyy-MM-dd")}</Text>
        </Box>

        <HStack spacing={3}>
          <Select
            value={preset}
            onChange={(e) => {
              setPreset(e.target.value);
              setStartDate("");
            }}
            width="140px"
          >
            <option value="">ເລືອກວັນທີເອງ</option>
            {PRESETS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </Select>

          <Input
            type="date"
            value={startDate}
            onChange={(e) => {
              setPreset("");
              setStartDate(e.target.value);
            }}
          />

          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />

          <Button colorScheme="blue" onClick={handleFetch}>ສະແດງຜົນ</Button>
        </HStack>
      </Flex>

      {/* TABLE */}
      {loading ? (
        <Flex justify="center" py={20}><Spinner size="xl" /></Flex>
      ) : error ? (
        <Box p={4} bg="red.100">{error}</Box>
      ) : (
        <Box bg="white" p={6} shadow="sm" borderRadius="md" overflowX="auto">
          {["Current Liabilities", "Non-current Liabilities", "Equity"].map(
            (section) => (
              <Box key={section} mb={10}>
                <Text fontWeight="bold" fontSize="lg" mb={2}>
                  {section === "Current Liabilities" && "ໜີ້ສິນໝູນວຽນ"}
                  {section === "Non-current Liabilities" && "ໜີ້ສິນບໍ່ໝູນວຽນ"}
                  {section === "Equity" && "ທຶນຕົນເອງ"}
                </Text>

                <Table size="sm">
                  <Thead bg="gray.200">
                    <Tr>
                      <Th>ລາຍການ</Th>
                      <Th>ລະຫັດ</Th>
                      <Th isNumeric>ປະຈຸບັນ</Th>
                      <Th isNumeric>ປີກ່ອນ</Th>
                    </Tr>
                  </Thead>

                  <Tbody>
                    {renderRows(section)}

                    {/* TOTAL */}
                    <Tr bg="gray.100" fontWeight="bold">
                      <Td>
                        {section === "Current Liabilities" && "ລວມ ( I )"}
                        {section === "Non-current Liabilities" && "ລວມ ( II )"}
                        {section === "Equity" && "ລວມ ( III )"}
                      </Td>
                      <Td></Td>

                      <Td isNumeric>
                        {num(data?.sections?.[section] || 0)}
                      </Td>

                      <Td isNumeric>
                        {num(data?.sections?.[section] || 0)}
                      </Td>
                    </Tr>
                  </Tbody>
                </Table>
              </Box>
            )
          )}
        </Box>
      )}
    </Box>
  );
};

export default StatementOfFinancialPosition;
