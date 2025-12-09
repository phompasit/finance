// src/pages/journal/PrintJournalPage.jsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Text,
  Flex,
  Divider,
  Spinner,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
} from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import { getJournals } from "../../store/accountingReducer/journalSlice";
import { useLocation } from "react-router-dom";

const PrintJournalPage = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { journals = [], loader } = useSelector((s) => s.journal || {});

  const [filters, setFilters] = useState({});

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    const f = {
      startDate: params.get("startDate") || "",
      endDate: params.get("endDate") || "",
      currency: params.get("currency") || "",
      status: params.get("status") || "",
      search: params.get("search") || "",
    };

    setFilters(f);

    dispatch(getJournals(f));
  }, [location.search]);

  if (loader && journals.length === 0)
    return (
      <Flex justify="center" py={20}>
        <Spinner size="xl" />
      </Flex>
    );

  return (
    <Box p={8} maxW="900px" mx="auto" bg="white">
      {/* Header */}
      <Flex justify="space-between" mb={6}>
        <Box>
          <Text fontSize="2xl" fontWeight="bold">
            Journal Entries Report
          </Text>
          <Text fontSize="sm" color="gray.600">
            Printing Range:
          </Text>
          <Text fontSize="sm">
            {filters.startDate || "N/A"} → {filters.endDate || "N/A"}
          </Text>

          {filters.currency && (
            <Text fontSize="sm">Currency: {filters.currency}</Text>
          )}
          {filters.status && (
            <Text fontSize="sm">Status: {filters.status}</Text>
          )}
          {filters.search && (
            <Text fontSize="sm">Keyword: "{filters.search}"</Text>
          )}
        </Box>

        <Button colorScheme="blue" onClick={() => window.print()}>
          Print
        </Button>
      </Flex>

      <Divider mb={6} />

      {/* JOURNAL LOOP */}
      {journals.map((j, idx) => (
        <Box key={j._id} mb={10} pageBreakAfter="always">
          <Text fontSize="lg" fontWeight="bold">
            #{j._id}
          </Text>
          <Flex gap={10} mt={2}>
            <Box>
              <Text fontSize="sm" color="gray.600">
                Date
              </Text>
              <Text fontWeight="600">{j.date?.slice(0, 10)}</Text>
            </Box>

            <Box>
              <Text fontSize="sm" color="gray.600">
                Reference
              </Text>
              <Text>{j.reference || "-"}</Text>
            </Box>
          </Flex>

          <Box mt={2}>
            <Text fontSize="sm" color="gray.600">
              Description
            </Text>
            <Text>{j.description || "-"}</Text>
          </Box>

          {/* Table */}
          <Box mt={4}>
            <Table size="sm" variant="simple" borderWidth="1px">
              <Thead bg="gray.100">
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
                {j.lines.map((ln, lineIdx) => (
                  <Tr key={lineIdx}>
                    {/* 1) DR Account Code */}
                    <Td textAlign="center">
                      {ln.side === "dr" ? ln.accountId?.code : ""}
                    </Td>

                    {/* 1) CR Account Code */}
                    <Td textAlign="center">
                      {ln.side === "cr" ? ln.accountId?.code : ""}
                    </Td>

                    {/* 2) DR Account Name */}
                    <Td textAlign="center">
                      {ln.side === "dr" ? ln.accountId?.name : ""}
                    </Td>

                    {/* 2) CR Account Name */}
                    <Td textAlign="center">
                      {ln.side === "cr" ? ln.accountId?.name : ""}
                    </Td>

                    {/* 3) DR Amount LAK */}
                    <Td textAlign="center">
                      {ln.side === "dr"
                        ? Number(ln.amountLAK).toLocaleString()
                        : ""}
                    </Td>

                    {/* 3) CR Amount LAK */}
                    <Td textAlign="center">
                      {ln.side === "cr"
                        ? Number(ln.amountLAK).toLocaleString()
                        : ""}
                    </Td>

                    {/* Extra Columns */}
                    <Td textAlign="center">
                      {Number(ln.amountOriginal).toLocaleString()}
                    </Td>
                    <Td textAlign="center">{ln.currency}</Td>
                    <Td textAlign="center">
                      {Number(ln.exchangeRate).toLocaleString()}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>

            {/* Totals */}
            <Flex justify="flex-end" mt={3} gap={10}>
              <Box textAlign="right">
                <Text fontSize="sm" color="gray.600">
                  Total DR
                </Text>
                <Text fontWeight="bold" color="green.600">
                  {Number(j.totalDebitLAK).toLocaleString()}
                </Text>
              </Box>

              <Box textAlign="right">
                <Text fontSize="sm" color="gray.600">
                  Total CR
                </Text>
                <Text fontWeight="bold" color="green.600">
                  {Number(j.totalCreditLAK).toLocaleString()}
                </Text>
              </Box>
            </Flex>
          </Box>

          <Divider mt={6} />
        </Box>
      ))}

      {/* End text */}
      <Text textAlign="center" fontSize="sm" color="gray.500">
        End of Report
      </Text>
    </Box>
  );
};

export default PrintJournalPage;
