import React, { useEffect, useCallback, useMemo, useState } from "react";
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Button,
  Spinner,
  Flex,
  HStack,
} from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import { loadBook } from "../store/accountingReducer/generalLedgerSlice";
import LedgerFilterBar from "../components/ledger/LedgerFilterBar";

/* ================= Helpers ================= */
const num = (n) =>
  n !== null && n !== undefined
    ? Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 })
    : "-";

const FILTER_MODE = {
  YEAR: "YEAR",
  MONTH: "MONTH",
  PRESET: "PRESET",
  RANGE: "RANGE",
};

/* ================= Component ================= */
const CashBooks = () => {
  const dispatch = useDispatch();

  /* ===== Redux State ===== */
  const { data_book, loading, page, totalPages } = useSelector(
    (s) => s.ledger
  );

  /* ===== Local Filter ===== */
  const [filter, setFilter] = useState({
    mode: FILTER_MODE.YEAR,
    year: new Date().getFullYear(),
    month: null,
    preset: null,
    startDate: null,
    endDate: null,
  });

  const [appliedFilter, setAppliedFilter] = useState(filter);

  /* ================= Build Params ================= */
  const buildParams = useCallback(
    (override = {}) => {
      const params = {
        page: override.page ?? page ?? 1,
        limit: 10,
      };

      switch (appliedFilter.mode) {
        case FILTER_MODE.MONTH:
          params.year = appliedFilter.year;
          params.month = appliedFilter.month;
          break;

        case FILTER_MODE.RANGE:
          params.startDate = appliedFilter.startDate;
          params.endDate = appliedFilter.endDate;
          break;

        default:
          params.year = appliedFilter.year;
      }

      return params;
    },
    [page, appliedFilter]
  );

  /* ================= Fetch ================= */
  const fetchCashBook = useCallback(
    (override = {}) => {
      dispatch(loadBook(buildParams(override)));
    },
    [dispatch, buildParams]
  );

  /* ================= Initial Load ================= */
  useEffect(() => {
    fetchCashBook({ page: 1 });
  }, [fetchCashBook]);

  /* ================= Apply Filter ================= */
  const handleApplyFilter = () => {
    setAppliedFilter(filter);
    fetchCashBook({ page: 1 });
  };

  const hasData = useMemo(
    () => Array.isArray(data_book) && data_book.length > 0,
    [data_book]
  );

  /* ================= Loading ================= */
  if (loading) {
    return (
      <Flex justify="center" align="center" minH="400px">
        <Spinner size="xl" />
      </Flex>
    );
  }

  return (
    <Box p={6}>
      <Text fontSize="xl" fontWeight="bold" mb={4}>
        📕 ปื้มเงินสด (Cash Book)
      </Text>

      <LedgerFilterBar
        filter={filter}
        setFilter={setFilter}
        onApply={handleApplyFilter}
      />

      <Table size="sm" mt={4}>
        <Thead bg="gray.100">
          <Tr>
            <Th>Date</Th>
            <Th>Description</Th>
            <Th>Counter Account</Th>
            <Th isNumeric>Dr</Th>
            <Th isNumeric>Cr</Th>
            <Th isNumeric>Balance</Th>
          </Tr>
        </Thead>

        <Tbody>
          {!hasData && (
            <Tr>
              <Td colSpan={6} textAlign="center" py={6}>
                <Text color="gray.500">ไม่มีข้อมูล</Text>
              </Td>
            </Tr>
          )}

          {hasData &&
            data_book.map((row, i) => {
              if (row.isOpening) {
                return (
                  <Tr key={`opening-${i}`} bg="yellow.50">
                    <Td>{row.date}</Td>
                    <Td fontWeight="bold">{row.description}</Td>
                    <Td />
                    <Td isNumeric>{num(row.dr)}</Td>
                    <Td isNumeric>{num(row.cr)}</Td>
                    <Td isNumeric fontWeight="bold">
                      {num(row.balance)}
                    </Td>
                  </Tr>
                );
              }

              const counters =
                row.counterAccounts?.length > 0
                  ? row.counterAccounts
                  : [null];

              return counters.map((c, idx) => (
                <Tr key={`${i}-${idx}`}>
                  <Td>{idx === 0 ? row.date : ""}</Td>
                  <Td>{idx === 0 ? row.description : ""}</Td>
                  <Td>{c ? `${c.code} – ${c.name}` : "-"}</Td>
                  <Td isNumeric>
                    {c?.side === "dr" ? num(c.amount) : "-"}
                  </Td>
                  <Td isNumeric>
                    {c?.side === "cr" ? num(c.amount) : "-"}
                  </Td>
                  <Td isNumeric fontWeight="bold">
                    {idx === 0 ? num(row.balance) : ""}
                  </Td>
                </Tr>
              ));
            })}
        </Tbody>
      </Table>

      {/* ================= Pagination ================= */}
      {totalPages > 1 && (
        <HStack justify="center" mt={6}>
          <Button
            size="sm"
            onClick={() => fetchCashBook({ page: page - 1 })}
            isDisabled={page <= 1}
          >
            Prev
          </Button>

          <Text>
            Page {page} / {totalPages}
          </Text>

          <Button
            size="sm"
            onClick={() => fetchCashBook({ page: page + 1 })}
            isDisabled={page >= totalPages}
          >
            Next
          </Button>
        </HStack>
      )}
    </Box>
  );
};

export default CashBooks;
