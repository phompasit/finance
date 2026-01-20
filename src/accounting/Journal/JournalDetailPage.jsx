import React, { useEffect } from "react";
import {
  Box,
  Flex,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button,
  HStack,
  Divider,
  IconButton,
  useToast,
  Spinner,
} from "@chakra-ui/react";
import { ArrowLeft, Edit, Trash2, Printer } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import {
  getJournalById,
  deleteJournal,
} from "../../store/accountingReducer/journalSlice";
import { useNavigate, useParams } from "react-router-dom";
import { formatDate } from "../../components/Income_Expense/formatter";
import pdfJournal from "../PDF/pdf";
import { useAuth } from "../../context/AuthContext";

const JournalDetailPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedJournal: j, loader, error } = useSelector((s) => s.journal);

  useEffect(() => {
    dispatch(getJournalById(id));
  }, [id]);

  const handleDelete = async () => {
    try {
      await dispatch(deleteJournal(j._id)).unwrap();
      toast({ title: "Journal deleted", status: "success" });
      navigate("/journal");
    } catch (err) {
      toast({ title: err || "Delete failed", status: "error" });
    }
  };

  if (loader || !j) {
    return (
      <Flex justify="center" py={20}>
        <Spinner size="xl" />
      </Flex>
    );
  }

  return (
    <Box p={8} maxW="1100px" mx="auto">
      {/* HEADER BAR */}
      <Flex justify="space-between" mb={6}>
        <Button
          leftIcon={<ArrowLeft />}
          variant="ghost"
          onClick={() => navigate("/journal")}
        >
          Back
        </Button>

        <HStack>
          <IconButton
            onClick={() =>
              pdfJournal({
                data: j,
                user: user,
              })
            }
            icon={<Printer size={16} />}
            size="md"
            colorScheme="gray"
            aria-label="print"
          />
          {/* <IconButton
            icon={<Edit size={16} />}
            size="md"
            colorScheme="blue"
            aria-label="edit"
            onClick={() => navigate(`/journal/edit/${j._id}`)}
          />
          <IconButton
            icon={<Trash2 size={16} />}
            size="md"
            colorScheme="red"
            aria-label="delete"
            onClick={handleDelete}
          /> */}
        </HStack>
      </Flex>

      {/* JOURNAL HEADER */}
      <Box
        bg="white"
        shadow="sm"
        borderRadius="md"
        p={6}
        border="1px solid #eaeaea"
      >
        <Flex justify="space-between" mb={4}>
          <Box>
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              fontSize="lg"
              fontWeight="bold"
            >
              ປື້ມບັນຊີປະຈຳວັນ
            </Text>
          </Box>

          <Badge colorScheme={j.status === "posted" ? "green" : "orange"} p={1}>
            {j.status}
          </Badge>
        </Flex>

        <Flex gap={12} mt={4}>
          <Box>
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              fontSize="sm"
              color="gray.500"
            >
              ວັນທີ່/ເດືອນ/ປີ
            </Text>
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              fontSize="md"
              fontWeight="600"
            >
              {formatDate(j.date?.slice(0, 10))}
            </Text>
          </Box>

          <Box>
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              fontSize="sm"
              color="gray.500"
            >
              ເລກທີ່ເອກະສານອ້າງອີງ
            </Text>
            <Text fontFamily="Noto Sans Lao, sans-serif" fontSize="md">
              {j.reference || "-"}
            </Text>
          </Box>
        </Flex>

        <Box mt={4}>
          <Text
            fontFamily="Noto Sans Lao, sans-serif"
            fontSize="sm"
            color="gray.500"
          >
            ຄຳອະທິບາຍ
          </Text>
          <Text fontFamily="Noto Sans Lao, sans-serif" fontSize="md">
            {j.description || "-"}
          </Text>
        </Box>
      </Box>

      {/* JOURNAL LINE TABLE */}
      <Box
        mt={8}
        bg="white"
        shadow="md"
        borderRadius="lg"
        p={6}
        border="1px solid"
        borderColor="gray.200"
      >
        <Flex justify="space-between" align="center" mb={4}>
          <Text
            fontFamily="Noto Sans Lao, sans-serif"
            fontSize="lg"
            fontWeight="bold"
          >
            ລາຍການບັນທຶກ (Journal Lines)
          </Text>

          <Text fontSize="sm" color="gray.500">
            Debit / Credit Breakdown
          </Text>
        </Flex>

        <Box overflowX="auto">
          <Table size="sm" variant="striped" colorScheme="gray">
            <Thead position="sticky" top={0} zIndex={1} bg="gray.100">
              <Tr>
                {/* Account Code */}
                <Th textAlign="center" colSpan={2}>
                  Account Code
                </Th>

                {/* Account Name */}
                <Th textAlign="center" colSpan={2}>
                  Account Name
                </Th>

                {/* LAK Amount */}
                <Th textAlign="center" colSpan={2}>
                  Amount (LAK)
                </Th>

                {/* Original */}
                <Th textAlign="center" colSpan={2}>
                  Original Amount
                </Th>

                <Th textAlign="center">Currency</Th>
                <Th textAlign="center">Rate</Th>
              </Tr>

              <Tr>
                {Array.from({ length: 4 }).map((_, i) => (
                  <>
                    <Th key={`dr-${i}`} textAlign="center" color="green.600">
                      DR
                    </Th>
                    <Th key={`cr-${i}`} textAlign="center" color="red.600">
                      CR
                    </Th>
                  </>
                ))}
                <Th />
                <Th />
              </Tr>
            </Thead>

            <Tbody>
              {j.lines.map((ln, idx) => (
                <Tr key={idx} _hover={{ bg: "blue.50" }}>
                  {/* Account Code */}
                  <Td
                    fontFamily="Noto Sans Lao, sans-serif"
                    textAlign="center"
                    fontWeight="medium"
                  >
                    {ln.side === "dr" ? ln.accountId?.code : ""}
                  </Td>
                  <Td
                    fontFamily="Noto Sans Lao, sans-serif"
                    textAlign="center"
                    fontWeight="medium"
                  >
                    {ln.side === "cr" ? ln.accountId?.code : ""}
                  </Td>

                  {/* Account Name */}
                  <Td fontFamily="Noto Sans Lao, sans-serif" textAlign="center">
                    {ln.side === "dr" ? ln.accountId?.name : ""}
                  </Td>
                  <Td fontFamily="Noto Sans Lao, sans-serif" textAlign="center">
                    {ln.side === "cr" ? ln.accountId?.name : ""}
                  </Td>

                  {/* LAK */}
                  <Td textAlign="right" color="green.700">
                    {ln.side === "dr"
                      ? Number(ln.amountLAK).toLocaleString()
                      : ""}
                  </Td>
                  <Td textAlign="right" color="red.700">
                    {ln.side === "cr"
                      ? Number(ln.amountLAK).toLocaleString()
                      : ""}
                  </Td>

                  {/* Original */}
                  <Td textAlign="right">
                    {ln.side === "dr"
                      ? Number(ln.debitOriginal).toLocaleString()
                      : "-"}
                  </Td>
                  <Td textAlign="right">
                    {ln.side === "cr"
                      ? Number(ln.creditOriginal).toLocaleString()
                      : "-"}
                  </Td>

                  {/* Currency */}
                  <Td textAlign="center" fontWeight="semibold">
                    {ln.currency}
                  </Td>

                  {/* Rate */}
                  <Td textAlign="right" color="gray.600">
                    {Number(ln.exchangeRate).toLocaleString()}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>

        {/* TOTALS */}
        <Divider my={6} />

        <Flex justify="flex-end" gap={10}>
          <Box textAlign="right">
            <Text fontSize="sm" color="gray.500">
              Total Debit (LAK)
            </Text>
            <Text fontSize="2xl" fontWeight="bold" color="green.600">
              {Number(j.totalDebitLAK).toLocaleString()}
            </Text>
          </Box>

          <Box textAlign="right">
            <Text fontSize="sm" color="gray.500">
              Total Credit (LAK)
            </Text>
            <Text fontSize="2xl" fontWeight="bold" color="red.600">
              {Number(j.totalCreditLAK).toLocaleString()}
            </Text>
          </Box>
        </Flex>
      </Box>
    </Box>
  );
};

export default JournalDetailPage;
