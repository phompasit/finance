import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Flex,
  Text,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useDisclosure,
  useToast,
  HStack,
  SimpleGrid,
  IconButton,
  Select,
  Badge,
  Tooltip,
} from "@chakra-ui/react";
import { Plus, Edit, Trash, Wallet } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";

import {
  loadOpeningBalance,
  deleteOpening,
  clearMessage,
} from "../store/accountingReducer/openingBalanceSlice";

import OpeningModal from "./OpeningModal";
import LedgerLoading from "../components/Loading";

const OpeningBalancePage = () => {
  const dispatch = useDispatch();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const {
    list = [],
    meta,
    success,
    error,
    loader,
  } = useSelector((s) => s.openingBalance);
  const [editing, setEditing] = useState(null);
  const [year, setYear] = useState(null);

  /* ================= INIT YEAR ================= */
  useEffect(() => {
    if (!year && meta?.defaultYear) {
      setYear(meta.defaultYear);
    }
  }, [meta?.defaultYear, year]);

  /* ================= LOAD ================= */
  useEffect(() => {
    if (year) {
      dispatch(loadOpeningBalance(year));
    }
  }, [year, dispatch]);

  /* ================= TOAST ================= */
  useEffect(() => {
    if (success) {
      toast({ title: success, status: "success" });
      dispatch(clearMessage());
    }
    if (error) {
      toast({ title: error, status: "error" });
      dispatch(clearMessage());
    }
  }, [success, error, toast, dispatch]);

  /* ================= YEAR OPTIONS ================= */
  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => current + 1 - i);
  }, []);

  /* ================= TOTAL ================= */
  const totals = useMemo(() => {
    return list.reduce(
      (acc, i) => {
        acc.dr += Number(i.debit || 0);
        acc.cr += Number(i.credit || 0);
        return acc;
      },
      { dr: 0, cr: 0 }
    );
  }, [list]);

  const diff = totals.dr - totals.cr;

  /* ================= DELETE ================= */
  const handleDelete = async (item) => {
    const result = await Swal.fire({
      title: "ຢືນຢັນການລຶບ",
      text: `${item.accountId.code} - ${item.accountId.name}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e53e3e",
      confirmButtonText: "ລຶບ",
      cancelButtonText: "ຍົກເລີກ",
    });

    if (result.isConfirmed) {
      dispatch(deleteOpening(item._id));
    }
  };

  if (loader) return <LedgerLoading />;

  return (
    <Box p={{ base: 4, md: 6 }} bg="gray.50" minH="100vh">
      {/* ================= HEADER ================= */}
      <Flex
        bg="white"
        p={5}
        borderRadius="2xl"
        mb={6}
        align="center"
        justify="space-between"
        boxShadow="sm"
      >
        <HStack spacing={4}>
          <Box bg="blue.50" p={3} borderRadius="xl">
            <Wallet color="#3182ce" />
          </Box>

          <Box>
            <Text fontFamily="Noto Sans Lao, sans-serif" fontSize="lg" fontWeight="bold">
              ຍອດຍົກມາ
            </Text>

            <HStack>
              <Badge fontFamily="Noto Sans Lao, sans-serif" colorScheme="blue">ປີ {year}</Badge>
              <Badge fontFamily="Noto Sans Lao, sans-serif" colorScheme={diff === 0 ? "green" : "red"}>
                {diff === 0 ? "ຍອດສົມດຸນ" : "ບໍ່ສົມດຸນ"}
              </Badge>
            </HStack>
          </Box>
        </HStack>

        <HStack>
          <Select
            size="sm"
            w="120px"
            value={year || ""}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {yearOptions.map((y) => (
              <option
                key={y}
                value={y}
                disabled={meta?.closedYears?.includes(y)}
              >
                {y}
                {meta?.closedYears?.includes(y) ? " (ປິດແລ້ວ)" : ""}
              </option>
            ))}
          </Select>

          <Button
          fontFamily="Noto Sans Lao, sans-serif"
            leftIcon={<Plus size={16} />}
            colorScheme="blue"
            borderRadius="xl"
            isDisabled={!meta?.editable}
            onClick={() => {
              setEditing(null);
              onOpen();
            }}
          >
            ເພີ່ມລາຍການ
          </Button>
        </HStack>
      </Flex>

      {/* ================= SUMMARY ================= */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={5} mb={6}>
        <SummaryCard label="ໜີ້" value={totals.dr} color="blue.600" />
        <SummaryCard label="ມີ" value={totals.cr} color="orange.500" />
        <SummaryCard
        fontFamily="Noto Sans Lao, sans-serif"
          label="ຜິດດ່ຽງ"
          value={diff}
          color={diff === 0 ? "green.600" : "red.600"}
          bg={diff === 0 ? "green.50" : "red.50"}
        />
      </SimpleGrid>

      {/* ================= TABLE ================= */}
      <Box bg="white" borderRadius="2xl" boxShadow="sm">
        <Table size="sm">
          <Thead bg="gray.100">
            <Tr>
              <Th fontFamily="Noto Sans Lao, sans-serif">ເລກບັນຊີ</Th>
              <Th fontFamily="Noto Sans Lao, sans-serif">ຊື່ບັນຊີ</Th>
              <Th fontFamily="Noto Sans Lao, sans-serif" isNumeric>ໜີ້</Th>
              <Th fontFamily="Noto Sans Lao, sans-serif" isNumeric>ມີ</Th>
              <Th fontFamily="Noto Sans Lao, sans-serif" textAlign="center">ກະທຳ</Th>
            </Tr>
          </Thead>

          <Tbody>
            {list.map((item) => (
              <Tr key={item._id}>
                <Td fontFamily="Noto Sans Lao, sans-serif" fontWeight="bold">{item.accountId.code}</Td>
                <Td fontFamily="Noto Sans Lao, sans-serif">{item.accountId.name}</Td>
                <Td isNumeric>{item.debit?.toLocaleString() || "-"}</Td>
                <Td isNumeric>{item.credit?.toLocaleString() || "-"}</Td>
                <Td>
                  <HStack justify="center">
                    <IconButton
                      size="sm"
                      icon={<Edit size={14} />}
                      isDisabled={!meta?.editable}
                      onClick={() => {
                        setEditing(item);
                        onOpen();
                      }}
                    />
                    <IconButton
                      size="sm"
                      colorScheme="red"
                      icon={<Trash size={14} />}
                      isDisabled={!meta?.editable}
                      onClick={() => handleDelete(item)}
                    />
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      <OpeningModal
        isOpen={isOpen}
        onClose={onClose}
        editing={editing}
        year={year}
      />
    </Box>
  );
};

export default OpeningBalancePage;

/* ================= SMALL COMPONENT ================= */
const SummaryCard = ({ label, value, color, bg = "white" }) => (
  <Box bg={bg} p={5} borderRadius="2xl" boxShadow="sm">
    <Text fontFamily="Noto Sans Lao, sans-serif" color="gray.500">{label}</Text>
    <Text fontFamily="Noto Sans Lao, sans-serif" fontSize="2xl" fontWeight="bold" color={color}>
      {value.toLocaleString()}
    </Text>
  </Box>
);
