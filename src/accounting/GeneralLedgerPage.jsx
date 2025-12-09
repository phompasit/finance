import React, { useEffect, useState } from "react";
import {
  Box,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  HStack,
  useToast,
  Spinner,
  Input,
} from "@chakra-ui/react";
import Select from "react-select";
import { useDispatch, useSelector } from "react-redux";
import { getAccounts } from "../store/accountingReducer/chartAccounting";
import { loadGeneralLedger } from "../store/accountingReducer/generalLedgerSlice";

const GeneralLedgerPage = () => {
  const dispatch = useDispatch();
  const toast = useToast();

  const { accounts } = useSelector((s) => s.chartAccount);
  const { data, loading, error } = useSelector((s) => s.ledger);

  const [accountId, setAccountId] = useState(null);
  const [range, setRange] = useState({
    start: new Date().getFullYear() + "-01-01",
    end: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    dispatch(getAccounts());
  }, []);

  const loadLedger = () => {
    if (!accountId)
      return toast({ title: "Select Account", status: "warning" });
    dispatch(
      loadGeneralLedger({
        accountId,
        startDate: range.start,
        endDate: range.end,
      })
    );
  };

  const accountOptions = accounts
    ?.filter((acc) => acc.parentCode) // only sub-accounts
    .map((acc) => ({ value: acc._id, label: `${acc.code} - ${acc.name}` }));

  return (
    <Box p={6}>
      <Text fontSize="2xl" fontWeight="bold">
        General Ledger
      </Text>

      <HStack mt={4} spacing={4}>
        <Box w="300px">
          <Select
            options={accountOptions}
            placeholder="Choose Account"
            onChange={(v) => setAccountId(v?.value)}
          />
        </Box>

        <Input
          type="date"
          value={range.start}
          onChange={(e) => setRange({ ...range, start: e.target.value })}
        />

        <Input
          type="date"
          value={range.end}
          onChange={(e) => setRange({ ...range, end: e.target.value })}
        />

        <Button colorScheme="blue" onClick={loadLedger}>
          Load
        </Button>
      </HStack>

      <Box mt={6}>
        {loading && <Spinner size="lg" />}

        {data && (
          <>
            <Text fontSize="lg" mb={3}>
              {data.account.code} – {data.account.name}
            </Text>

            <Table>
              <Thead bg="gray.100">
                <Tr>
                  <Th>Date</Th>
                  <Th>Description</Th>
                  <Th>Ref</Th>
                  <Th isNumeric>DR</Th>
                  <Th isNumeric>CR</Th>
                  <Th isNumeric>Balance</Th>
                </Tr>
              </Thead>

              <Tbody>
                {data.rows.map((r, i) => (
                  <Tr key={i}>
                    <Td>{r.date}</Td>
                    <Td>{r.description}</Td>
                    <Td>{r.reference}</Td>
                    <Td isNumeric>{r.dr.toLocaleString()}</Td>
                    <Td isNumeric>{r.cr.toLocaleString()}</Td>
                    <Td isNumeric>{r.balance.toLocaleString()}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>

            <Box mt={4} fontWeight="bold">
              Total DR: {data.totals.dr.toLocaleString()} | Total CR:{" "}
              {data.totals.cr.toLocaleString()} | Ending:{" "}
              {data.totals.ending.toLocaleString()}
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

export default GeneralLedgerPage;
