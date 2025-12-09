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
  Divider,
} from "@chakra-ui/react";
import { Plus, Edit, Trash } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";

import {
  loadOpeningBalance,
  deleteOpening,
  clearMessage,
} from "../store/accountingReducer/openingBalanceSlice";

import OpeningModal from "./OpeningModal";

const OpeningBalancePage = () => {
  const dispatch = useDispatch();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const { list, success, error } = useSelector((s) => s.openingBalance);

  const [editing, setEditing] = useState(null);

  const year = new Date().getFullYear();

  useEffect(() => {
    dispatch(loadOpeningBalance(year));
  }, []);

  useEffect(() => {
    if (success) toast({ title: success, status: "success" });
    if (error) toast({ title: error, status: "error" });
    dispatch(clearMessage());
  }, [success, error]);

  const handleAdd = () => {
    setEditing(null);
    onOpen();
  };

  const handleEdit = (item) => {
    setEditing(item);
    onOpen();
  };

  const handleDelete = (id) => {
    dispatch(deleteOpening(id));
  };

  /* ---------------------- SUMMARY (TOTALS) ---------------------- */
  const totals = useMemo(() => {
    let dr = 0;
    let cr = 0;

    list?.forEach((i) => {
      dr += Number(i.debit || 0);
      cr += Number(i.credit || 0);
    });

    return { dr, cr, diff: dr - cr };
  }, [list]);

  return (
    <Box p={6}>
      {/* Header */}
      <Flex justify="space-between" mb={6}>
        <Box>
          <Text fontSize="2xl" fontWeight="bold">
            ຍອດຍົກມາ (Opening Balance)
          </Text>
          <Text color="gray.500">ປີ {year}</Text>
        </Box>

        <Button leftIcon={<Plus size={18} />} colorScheme="blue" onClick={handleAdd}>
          ເພີ່ມຍອດຍົກມາ
        </Button>
      </Flex>

      {/* Table */}
      <Table variant="simple">
        <Thead bg="gray.100">
          <Tr>
            <Th>Code</Th>
            <Th>Account</Th>
            <Th isNumeric>DR</Th>
            <Th isNumeric>CR</Th>
            <Th>Action</Th>
          </Tr>
        </Thead>
        <Tbody>
          {list?.map((item) => (
            <Tr key={item._id}>
              <Td>{item.accountId.code}</Td>
              <Td>{item.accountId.name}</Td>
              <Td isNumeric>{item.debit.toLocaleString()}</Td>
              <Td isNumeric>{item.credit.toLocaleString()}</Td>
              <Td>
                <Flex gap={3}>
                  <Button size="sm" onClick={() => handleEdit(item)}>
                    <Edit size={14} />
                  </Button>
                  <Button
                    size="sm"
                    colorScheme="red"
                    onClick={() => handleDelete(item._id)}
                  >
                    <Trash size={14} />
                  </Button>
                </Flex>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      {/* ------------------------ TOTALS SUMMARY ------------------------ */}
      <Box
        mt={6}
        p={4}
        borderWidth="1px"
        borderRadius="md"
        bg="gray.50"
        maxW="400px"
      >
        <Text fontSize="lg" fontWeight="bold" mb={2}>
          Summary
        </Text>

        <HStack justify="space-between">
          <Text>Total Debit:</Text>
          <Text fontWeight="bold" color="blue.600">
            {totals.dr.toLocaleString()}
          </Text>
        </HStack>

        <HStack justify="space-between">
          <Text>Total Credit:</Text>
          <Text fontWeight="bold" color="orange.600">
            {totals.cr.toLocaleString()}
          </Text>
        </HStack>

        <Divider my={2} />

        <HStack justify="space-between">
          <Text>Balance (DR - CR):</Text>
          <Text fontWeight="bold" color={totals.diff >= 0 ? "green.600" : "red.600"}>
            {totals.diff.toLocaleString()}
          </Text>
        </HStack>
      </Box>

      {/* Modal */}
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
