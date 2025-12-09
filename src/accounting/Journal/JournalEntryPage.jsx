// src/pages/journal/JournalEntryPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Flex,
  Text,
  Button,
  Input,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Badge,
  Collapse,
  useToast,
  Select,
  HStack,
} from "@chakra-ui/react";
import {
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Eye,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import {
  createJournal,
  updateJournal,
  getJournalById,
  clearMessage,
  clearSelectedJournal,
  getJournals,
  deleteJournal,
} from "../../store/accountingReducer/journalSlice";
import { getAccounts } from "../../store/accountingReducer/chartAccounting"; // adjust if your path differs
import JournalModal from "./JournalModal";
import { useNavigate } from "react-router-dom";

const PAGE_SIZES = [10, 25, 50];

const JournalEntryPage = () => {
  const dispatch = useDispatch();
  const toast = useToast();

  const { journals = [], loader, success, error, pagination } = useSelector(
    (s) => s.journal || {}
  );
  const navigate = useNavigate();
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [filterCurrency, setFilterCurrency] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    dispatch(getJournals());
  }, [dispatch]);

  useEffect(() => {
    if (success) {
      toast({ title: success, status: "success" });
      dispatch(clearMessage());
    }
    if (error) {
      toast({ title: error, status: "error" });
      dispatch(clearMessage());
    }
  }, [success, error]);

  const filtered = useMemo(() => {
    let list = [...journals];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((j) =>
        `${j.description || ""} ${j.reference || ""}`.toLowerCase().includes(q)
      );
    }
    if (filterCurrency) {
      list = list.filter((j) =>
        (j.lines || []).some((ln) => ln.currency === filterCurrency)
      );
    }
    if (filterStatus) {
      list = list.filter((j) => (j.status || "draft") === filterStatus);
    }
    return list;
  }, [journals, search, filterCurrency, filterStatus]);

  // pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleDelete = async (id) => {
    try {
      await dispatch(deleteJournal(id)).unwrap();
      // refresh
      dispatch(getJournals());
    } catch (err) {
      toast({ title: err || "Delete failed", status: "error" });
    }
  };

  const currencySummary = (j) => {
    const counts = {};
    (j.lines || []).forEach((ln) => {
      counts[ln.currency] = (counts[ln.currency] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([c, n]) => `${n} ${c}`)
      .join(", ");
  };
console.log("j.lines",pageData)
  return (
    <Box p={6}>
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Text fontSize="2xl" fontWeight="bold">
            Journal Entries
          </Text>
          <Text color="gray.500">Create, edit and review journal entries</Text>
        </Box>

        <HStack spacing={3}>
          <Button colorScheme="green" onClick={() => setPrintModalOpen(true)}>
            Print Journals
          </Button>
          <Button
            leftIcon={<Plus size={16} />}
            colorScheme="blue"
            onClick={() => {
              setEditingId(null);
              setModalOpen(true);
            }}
          >
            Create Journal
          </Button>
        </HStack>
      </Flex>

      <Flex gap={3} mb={4}>
        <Input
          placeholder="Search description or reference..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Select
          placeholder="Filter by currency"
          value={filterCurrency}
          onChange={(e) => {
            setFilterCurrency(e.target.value);
            setPage(1);
          }}
          width="180px"
        >
          <option value="LAK">LAK</option>
          <option value="USD">USD</option>
          <option value="THB">THB</option>
          <option value="CNY">CNY</option>
        </Select>
        <Select
          placeholder="Filter by status"
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
          width="140px"
        >
          <option value="draft">draft</option>
          <option value="posted">posted</option>
        </Select>
      </Flex>

      <Table variant="simple" bg="white" borderRadius="md" overflow="hidden">
        <Thead bg="gray.50">
          <Tr>
            <Th />
            <Th>Date</Th>
            <Th>Description</Th>
            <Th>Debit (LAK)</Th>
            <Th>Credit (LAK)</Th>
            <Th>Currency Summary</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {pageData.map((j) => {
            const isOpen = openId === j._id;
            const totalDebit =
              j.totalDebitLAK ||
              (j.lines || []).reduce(
                (s, ln) => s + (ln.side === "dr" ? ln.amountLAK || 0 : 0),
                0
              );
            const totalCredit =
              j.totalCreditLAK ||
              (j.lines || []).reduce(
                (s, ln) => s + (ln.side === "cr" ? ln.amountLAK || 0 : 0),
                0
              );
            return (
              <React.Fragment key={j._id}>
                <Tr>
                  <Td>
                    <IconButton
                      aria-label="toggle"
                      size="sm"
                      icon={
                        isOpen ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )
                      }
                      onClick={() => setOpenId(isOpen ? null : j._id)}
                    />
                  </Td>
                  <Td>{j.date ? j.date.slice(0, 10) : ""}</Td>
                  <Td>
                    <Text fontWeight="semibold">{j.description}</Text>
                    <Text fontSize="sm" color="gray.500">
                      {j?.reference}
                    </Text>
                  </Td>
                  <Td>{Number(totalDebit)?.toLocaleString()}</Td>
                  <Td>{Number(totalCredit)?.toLocaleString()}</Td>
                  <Td>
                    <Badge colorScheme="gray">{currencySummary(j)}</Badge>
                  </Td>
                  <Td>
                    <Badge
                      colorScheme={j.status === "posted" ? "green" : "orange"}
                    >
                      {j?.status || "draft"}
                    </Badge>
                  </Td>
                  <Td>
                    <HStack>
                      <IconButton
                        aria-label="edit"
                        icon={<Edit size={14} />}
                        size="sm"
                        onClick={() => {
                          setEditingId(j._id);
                          setModalOpen(true);
                        }}
                      />
                      <IconButton
                        aria-label="details"
                        icon={<Eye size={14} />}
                        size="sm"
                        colorScheme="blue"
                        onClick={() => navigate(`/journal/${j._id}`)}
                      />

                      <IconButton
                        aria-label="delete"
                        icon={<Trash2 size={14} />}
                        size="sm"
                        colorScheme="red"
                        onClick={() => handleDelete(j._id)}
                      />
                    </HStack>
                  </Td>
                </Tr>

                <Tr>
                  <Td colSpan={8} p={0}>
                    <Collapse in={isOpen} animateOpacity>
                      <Box p={4} bg="gray.50">
                        <Table size="sm" variant="simple">
                          <Thead>
                            <Tr>
                              <Th>Account</Th>
                              <Th>Original</Th>
                              <Th>Currency</Th>
                              <Th>Rate</Th>
                              <Th isNumeric>Amount (LAK)</Th>
                              <Th>DR (LAK)</Th>
                              <Th>CR (LAK)</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {(j.lines || []).map((ln, idx) => (
                              <Tr key={idx}>
                                <Td>
                                  {ln.accountId?.code || ln.accountId} -{" "}
                                  {ln.accountId?.name || ""}
                                </Td>
                                <Td>
                                  {Number(
                                    ln.amountOriginal || 0
                                  ).toLocaleString()}
                                </Td>
                                <Td>{ln.currency}</Td>
                                <Td>
                                  {Number(
                                    ln.exchangeRate || 1
                                  ).toLocaleString()}
                                </Td>
                                <Td isNumeric>
                                  {Number(
                                    ln.amountLAK ||
                                      ln.amountOriginal * (ln.exchangeRate || 1)
                                  ).toLocaleString()}
                                </Td>
                                <Td isNumeric>
                                  {ln.side === "dr"
                                    ? Number(ln.amountLAK).toLocaleString()
                                    : "-"}
                                </Td>
                                <Td isNumeric>
                                  {ln.side === "cr"
                                    ? Number(ln.amountLAK).toLocaleString()
                                    : "-"}
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </Box>
                    </Collapse>
                  </Td>
                </Tr>
              </React.Fragment>
            );
          })}
        </Tbody>
      </Table>

      {/* Pagination controls */}
      <Flex justify="space-between" align="center" mt={4}>
        <Box>
          <Text>
            Page {page} / {totalPages}
          </Text>
        </Box>

        <HStack>
          <Select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s} / page
              </option>
            ))}
          </Select>
          <Button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Prev
          </Button>
          <Button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </HStack>
      </Flex>

      <JournalModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        editingId={editingId}
      />
    </Box>
  );
};

export default JournalEntryPage;
