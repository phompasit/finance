import {
  Card,
  CardHeader,
  CardBody,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Icon,
  VStack,
  Box,
} from "@chakra-ui/react";
import { FileBox } from "lucide-react/dist/cjs/lucide-react";

const num = (n) =>
  n !== null && n !== undefined ? Number(n).toLocaleString() : "-";

const LedgerTable = ({ accounts }) => {
  if (!accounts.length) {
    return (
      <Box
        py={12}
        border="1px dashed"
        borderColor="gray.300"
        borderRadius="md"
        bg="gray.50"
      >
        <VStack spacing={3}>
          <Icon as={FileBox} boxSize={8} color="gray.400" />
          <Text
            fontFamily="Noto Sans Lao, sans-serif"
            fontSize="sm"
            color="gray.500"
          >
            ບໍ່ພົບຂໍ້ມູນ
          </Text>
        </VStack>
      </Box>
    );
  }
  /* ================= Styles ================= */
  const th = {
    border: "1px solid #333",
    padding: "12px 8px",
    background: "#d4d4d4",
    textAlign: "center",
    fontWeight: "bold",
    fontFamily: "'Noto Sans Lao', sans-serif",
    fontSize: 12,
    verticalAlign: "middle",
    lineHeight: 1.4,
  };

  const thSub = {
    border: "1px solid #333",
    padding: "10px 8px",
    background: "#e8e8e8",
    textAlign: "center",
    fontWeight: "bold",
    fontFamily: "'Noto Sans Lao', sans-serif",
    fontSize: 11,
  };

  const td = {
    border: "1px solid #999",
    padding: "8px 6px",
    textAlign: "center",
    fontFamily: "'Noto Sans Lao', sans-serif",
    fontSize: 11,
    verticalAlign: "middle",
    lineHeight: 1.4,
  };

  const formatDate = (d) => {
    if (!d) return "";
    const date = new Date(d);
    if (isNaN(date)) return d;
    return date.toLocaleDateString("en-GB");
  };
  return accounts.map((acc) => (
    <Card key={acc.accountId} mb={6}>
      <CardHeader bg="blue.50">
        <Text fontFamily="Noto Sans Lao, sans-serif" fontWeight="bold">
          {acc.accountCode} – {acc.accountName}
        </Text>
      </CardHeader>

      <CardBody p={0}>
        <Table size="sm">
          <Thead>
            <Tr>
              <Th rowSpan={2} style={th}>
                #
              </Th>

              <Th colSpan={2} style={{ ...th, background: "#e8e8e8" }}>
                ໃບຢັ້ງຢືນ
              </Th>

              <Th rowSpan={2} style={th}>
                ເນື່ອໃນລາຍການ
              </Th>
              <Th rowSpan={2} style={th}>
                ມູນຄ່າເດີມ
              </Th>
              <Th rowSpan={2} style={th}>
                ອັດຕາແລກປ່ຽນ
              </Th>

              <Th colSpan={2} style={{ ...th, background: "#e8e8e8" }}>
                ການເຄື່ອນໄຫວ
              </Th>

              <Th rowSpan={2} style={th}>
                ຍອດເຫຼືອ
              </Th>
            </Tr>

            <Tr>
              <Th style={thSub}>ວັນທີ່</Th>
              <Th style={thSub}>ອ້າງອີງ</Th>

              <Th style={thSub}>ໜີ້</Th>
              <Th style={thSub}>ມີ</Th>
            </Tr>
          </Thead>

          <Tbody>
            {acc.rows.map((r, i) => (
              <Tr key={i}>
                <Td style={td}>1</Td>
                <Td style={td}>{formatDate(r.date)}</Td>
                <Td style={td}>{r.reference}</Td>

                <Td style={td}>{r.description}</Td>
                <Td style={td}>
                  {num(
                    r.debitOriginal > 0 ? r.debitOriginal : r.creditOriginal
                  )}
                </Td>
                <Td style={td}>{r.exchangeRate}</Td>
                <Td style={td} isNumeric>
                  {num(r.dr)}
                </Td>
                <Td style={td} isNumeric>
                  {num(r.cr)}
                </Td>
                <Td style={td} isNumeric>
                  {num(r.balance)}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </CardBody>
    </Card>
  ));
};

export default LedgerTable;
