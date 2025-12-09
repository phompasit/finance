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

const JournalDetailPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const toast = useToast();
  const navigate = useNavigate();

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
            icon={<Printer size={16} />}
            size="md"
            colorScheme="gray"
            aria-label="print"
          />
          <IconButton
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
          />
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
            <Text fontSize="lg" fontWeight="bold">
              Journal Entry
            </Text>
            <Text fontSize="sm" color="gray.600">
              #{j._id}
            </Text>
          </Box>

          <Badge colorScheme={j.status === "posted" ? "green" : "orange"} p={1}>
            {j.status}
          </Badge>
        </Flex>

        <Flex gap={12} mt={4}>
          <Box>
            <Text fontSize="sm" color="gray.500">
              Date
            </Text>
            <Text fontSize="md" fontWeight="600">
              {j.date?.slice(0, 10)}
            </Text>
          </Box>

          <Box>
            <Text fontSize="sm" color="gray.500">
              Reference
            </Text>
            <Text fontSize="md">{j.reference || "-"}</Text>
          </Box>
        </Flex>

        <Box mt={4}>
          <Text fontSize="sm" color="gray.500">
            Description
          </Text>
          <Text fontSize="md">{j.description || "-"}</Text>
        </Box>
      </Box>

      {/* JOURNAL LINE TABLE */}
      <Box
        mt={8}
        bg="white"
        shadow="sm"
        borderRadius="md"
        p={6}
        border="1px solid #eaeaea"
      >
        <Text fontSize="lg" fontWeight="bold" mb={4}>
          Journal Lines
        </Text>

        <Table size="md" variant="simple">
          <Thead bg="gray.50">
            <Tr>
              <Th textAlign="center">DR</Th>
              <Th textAlign="center">CR</Th>
              <Th textAlign="center">DR</Th>
              <Th textAlign="center">CR</Th>
              <Th textAlign="center">DR</Th>
              <Th textAlign="center">CR</Th>

              <Th textAlign="center">Original</Th>
              <Th textAlign="center">Currency</Th>
              <Th textAlign="center">Rate</Th>
            </Tr>
          </Thead>

          <Tbody>
            {j.lines.map((ln, idx) => (
              <Tr key={idx}>
                {/* ------- คอลัมน์ชุด 1: เลขบัญชี ------- */}
                <Td textAlign="center">
                  {ln.side === "dr" ? ln.accountId?.code : ""}
                </Td>
                <Td textAlign="center">
                  {ln.side === "cr" ? ln.accountId?.code : ""}
                </Td>

                {/* ------- คอลัมน์ชุด 2: ชื่อบัญชี ------- */}
                <Td textAlign="center">
                  {ln.side === "dr" ? ln.accountId?.name : ""}
                </Td>
                <Td textAlign="center">
                  {ln.side === "cr" ? ln.accountId?.name : ""}
                </Td>

                {/* ------- คอลัมน์ชุด 3: มูลค่า LAK ------- */}
                <Td textAlign="center">
                  {ln.side === "dr"
                    ? Number(ln.amountLAK).toLocaleString()
                    : ""}
                </Td>
                <Td textAlign="center">
                  {ln.side === "cr"
                    ? Number(ln.amountLAK).toLocaleString()
                    : ""}
                </Td>

                {/* ------- คอลัมน์ 4: Original Amount ------- */}
                <Td textAlign="center">
                  {Number(ln.amountOriginal).toLocaleString()}
                </Td>

                {/* ------- คอลัมน์ 5: Currency ------- */}
                <Td textAlign="center">{ln.currency}</Td>

                {/* ------- คอลัมน์ 6: Rate ------- */}
                <Td textAlign="center">
                  {Number(ln.exchangeRate).toLocaleString()}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>

        {/* TOTALS */}
        <Divider my={5} />

        <Flex justify="flex-end" gap={12}>
          <Box textAlign="right">
            <Text fontSize="sm" color="gray.500">
              Total Debit (LAK)
            </Text>
            <Text fontSize="xl" fontWeight="bold" color="green.600">
              {Number(j.totalDebitLAK).toLocaleString()}
            </Text>
          </Box>

          <Box textAlign="right">
            <Text fontSize="sm" color="gray.500">
              Total Credit (LAK)
            </Text>
            <Text fontSize="xl" fontWeight="bold" color="green.600">
              {Number(j.totalCreditLAK).toLocaleString()}
            </Text>
          </Box>
        </Flex>
      </Box>
    </Box>
  );
};

export default JournalDetailPage;
