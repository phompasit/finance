// src/components/journal/JournalModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Select,
  NumberInput,
  NumberInputField,
  HStack,
  IconButton,
  Text,
  Box,
  Divider,
  useToast,
} from "@chakra-ui/react";
import { Plus, Trash2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import {
  createJournal,
  updateJournal,
  getJournalById,
  clearMessage,
  clearSelectedJournal,
} from "../../store/accountingReducer/journalSlice";
import { getAccounts } from "../../store/accountingReducer/chartAccounting"; // adjust if your path differs
import SelectReact from "react-select";
const CURRENCIES = ["LAK", "USD", "THB", "CNY"];

const blankLine = (accounts = []) => ({
  accountId: accounts.length ? accounts[0]._id : "",
  amountOriginal: 0,
  currency: "LAK",
  exchangeRate: 1,
  side: "dr", // 'dr' or 'cr'
  amountLAK: 0,
});

const JournalModal = ({ isOpen, onClose, editingId }) => {
  const dispatch = useDispatch();
  const toast = useToast();

  const { accounts } = useSelector((s) => s.chartAccount || { accounts: [] });
  const { selectedJournal, success, error } = useSelector(
    (s) => s.journal || {}
  );

  const [header, setHeader] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: "",
    reference: "",
  });

  const [lines, setLines] = useState([blankLine(accounts)]);
  const [saving, setSaving] = useState(false);

  // load accounts and selected journal if editing
  useEffect(() => {
    dispatch(getAccounts());
    if (editingId) {
      dispatch(getJournalById(editingId));
    } else {
      dispatch(clearSelectedJournal());
    }
  }, [dispatch, editingId]);

  // when selectedJournal loads, populate form
  useEffect(() => {
    if (selectedJournal && editingId) {
      const j = selectedJournal;
      setHeader({
        date: j.date
          ? j.date.slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        description: j.description || "",
        reference: j.reference || "",
      });

      if (j.lines && j.lines.length) {
        setLines(
          j.lines.map((ln) => ({
            accountId: ln.accountId?._id || ln.accountId,
            amountOriginal: ln.amountOriginal || 0,
            currency: ln.currency || "LAK",
            exchangeRate: ln.exchangeRate || (ln.currency === "LAK" ? 1 : 0),
            side: ln.side || (ln.debitLAK > 0 ? "dr" : "cr"),
            amountLAK:
              ln.amountLAK ?? ln.amountOriginal * (ln.exchangeRate || 1),
          }))
        );
      } else {
        setLines([blankLine(accounts)]);
      }
    } else if (!editingId) {
      setHeader({
        date: new Date().toISOString().slice(0, 10),
        description: "",
        reference: "",
      });
      setLines([blankLine(accounts)]);
    }
  }, [selectedJournal, editingId, accounts]);

  // recalc amountLAK each change
  useEffect(
    () => {
      setLines((prev) =>
        prev.map((l) => ({
          ...l,
          amountLAK:
            Number(l.amountOriginal || 0) * Number(l.exchangeRate || 1),
        }))
      );
    },
    [
      /* left empty intentionally to avoid loops; manual updates below */
    ]
  );

  const updateLine = (index, patch) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      // recalc amountLAK immediately after patch
      next[index].amountLAK =
        Number(next[index].amountOriginal || 0) *
        Number(next[index].exchangeRate || 1);
      return next;
    });
  };

  const addLine = () => {
    setLines((prev) => [...prev, blankLine(accounts)]);
  };

  const removeLine = (i) => {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  };

  // totals in LAK
  const totals = useMemo(() => {
    const total = { dr: 0, cr: 0 };
    lines.forEach((l) => {
      const v = Number(l.amountLAK || 0);
      if (l.side === "dr") total.dr += v;
      else total.cr += v;
    });
    return total;
  }, [lines]);

  const currencySummary = useMemo(() => {
    const counts = {};
    lines.forEach((l) => {
      counts[l.currency] = (counts[l.currency] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([c, n]) => `${n} ${c}`)
      .join(", ");
  }, [lines]);

  // validation
  const validate = () => {
    if (!header.date) {
      toast({ title: "Please set Date", status: "warning" });
      return false;
    }
    if (!lines.length) {
      toast({ title: "Add at least one journal line", status: "warning" });
      return false;
    }

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.accountId) {
        toast({ title: `Line ${i + 1}: select account`, status: "warning" });
        return false;
      }
      if (!l.amountOriginal || Number(l.amountOriginal) <= 0) {
        toast({
          title: `Line ${i + 1}: amount must be > 0`,
          status: "warning",
        });
        return false;
      }
      if (
        l.currency !== "LAK" &&
        (!l.exchangeRate || Number(l.exchangeRate) <= 0)
      ) {
        toast({
          title: `Line ${i + 1}: exchangeRate must be > 0 for ${l.currency}`,
          status: "warning",
        });
        return false;
      }
      if (l.side !== "dr" && l.side !== "cr") {
        toast({ title: `Line ${i + 1}: select DR or CR`, status: "warning" });
        return false;
      }
    }

    if (Math.round(totals.dr) !== Math.round(totals.cr)) {
      toast({
        title: "Total Debit (LAK) must equal Total Credit (LAK)",
        status: "warning",
      });
      return false;
    }

    return true;
  };

  // Save
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    // build payload: use amountLAK as real value for accounting
    const payload = {
      date: header?.date,
      description: header?.description,
      reference: header?.reference,
      totalDebitLAK: totals?.dr,
      totalCreditLAK: totals?.cr,
      lines: lines.map((l) => ({
        accountId: l.accountId,
        amountOriginal: Number(l.amountOriginal),
        currency: l.currency,
        exchangeRate: Number(l.exchangeRate),
        amountLAK: Number(l.amountLAK),
        side: l.side,
        debitLAK: l.side === "dr" ? Number(l.amountLAK) : 0,
        creditLAK: l.side === "cr" ? Number(l.amountLAK) : 0,
      })),
    };

    try {
      if (editingId) {
        await dispatch(updateJournal({ id: editingId, payload })).unwrap();
        toast({ title: "Journal updated", status: "success", duration: 2500 });
      } else {
        await dispatch(createJournal(payload)).unwrap();
        toast({ title: "Journal created", status: "success", duration: 2500 });
      }
      dispatch(clearMessage());
      onClose();
    } catch (err) {
      toast({ title: err || "Server error", status: "error", duration: 4000 });
      // keep modal open for correction
    } finally {
      setSaving(false);
    }
  };

  // react to global success/error (optional)
  useEffect(() => {
    if (success) {
      toast({ title: success, status: "success", duration: 2000 });
      dispatch(clearMessage());
    }
    if (error) {
      toast({ title: error, status: "error", duration: 3000 });
      dispatch(clearMessage());
    }
  }, [success, error]);
  const accountOptions = useMemo(() => {
    return accounts
      ?.filter((acc) => acc.parentCode) // แสดงเฉพาะบัญชีย่อยเท่านั้น
      .map((acc) => ({
        value: acc._id,
        label: `${acc.code} - ${acc.name}`,
      }));
  }, [accounts]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        dispatch(clearSelectedJournal());
      }}
      size="4xl"
      scrollBehavior="inside"
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {editingId ? "Edit Journal Entry" : "Create Journal Entry"}
        </ModalHeader>
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <HStack spacing={4}>
              <FormControl>
                <FormLabel>Date</FormLabel>
                <Input
                  type="date"
                  value={header.date}
                  onChange={(e) =>
                    setHeader((h) => ({ ...h, date: e.target.value }))
                  }
                />
              </FormControl>

              <FormControl>
                <FormLabel>Reference</FormLabel>
                <Input
                  value={header.reference}
                  onChange={(e) =>
                    setHeader((h) => ({ ...h, reference: e.target.value }))
                  }
                  placeholder="Ref no."
                />
              </FormControl>

              <FormControl flex="2">
                <FormLabel>Description</FormLabel>
                <Input
                  value={header.description}
                  onChange={(e) =>
                    setHeader((h) => ({ ...h, description: e.target.value }))
                  }
                  placeholder="Optional description"
                />
              </FormControl>
            </HStack>

            <Divider />

            {/* Lines header */}
            <HStack fontWeight="semibold" px={2}>
              <Box w="40%">Account</Box>
              <Box w="12%">Amount</Box>
              <Box w="10%">Currency</Box>
              <Box w="12%">Rate</Box>
              <Box w="8%">DR/CR</Box>
              <Box w="18%" textAlign="right">
                Amount (LAK)
              </Box>
              <Box w="5%" />
            </HStack>

            {/* Lines */}
            {lines.map((ln, i) => {
              const acc = accounts.find((a) => a._id === ln.accountId) || {};
              return (
                <HStack key={i} spacing={2} align="center">
                  {/* Account */}
                  <FormControl w="40%">
              
                      <SelectReact
                        options={accountOptions}
                        value={
                          accountOptions.find(
                            (o) => o.value === ln.accountId
                          ) || null
                        }
                        onChange={(opt) =>
                          updateLine(i, { accountId: opt?.value })
                        }
                        placeholder="Choose account..."
                        isSearchable
                        styles={{
                          container: (base) => ({ ...base, width: "100%" }),
                        }}
                      />
                 
                  </FormControl>

                  {/* Amount Original */}
                  <FormControl w="12%">
                    <NumberInput
                      min={0}
                      value={ln.amountOriginal}
                      onChange={(v) =>
                        updateLine(i, { amountOriginal: Number(v) })
                      }
                    >
                      <NumberInputField />
                    </NumberInput>
                  </FormControl>

                  {/* Currency */}
                  <FormControl w="10%">
                    <Select
                      value={ln.currency}
                      onChange={(e) =>
                        updateLine(i, {
                          currency: e.target.value,
                          exchangeRate:
                            e.target.value === "LAK" ? 1 : ln.exchangeRate,
                        })
                      }
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Exchange Rate */}
                  <FormControl w="12%">
                    <NumberInput
                      min={0}
                      value={ln.exchangeRate}
                      onChange={(v) =>
                        updateLine(i, { exchangeRate: Number(v) })
                      }
                    >
                      <NumberInputField />
                    </NumberInput>
                  </FormControl>

                  {/* DR/CR */}
                  <FormControl w="8%">
                    <Select
                      value={ln.side}
                      onChange={(e) => updateLine(i, { side: e.target.value })}
                    >
                      <option value="dr">DR</option>
                      <option value="cr">CR</option>
                    </Select>
                  </FormControl>

                  {/* Amount LAK */}
                  <Box w="18%" textAlign="right">
                    <Text fontWeight="semibold">
                      {(Number(ln.amountLAK) || 0).toLocaleString()}
                    </Text>
                  </Box>

                  {/* Remove */}
                  <Box w="5%">
                    <IconButton
                      aria-label="remove"
                      icon={<Trash2 size={14} />}
                      size="sm"
                      onClick={() => removeLine(i)}
                    />
                  </Box>
                </HStack>
              );
            })}

            <Button
              leftIcon={<Plus size={14} />}
              onClick={addLine}
              alignSelf="flex-start"
              variant="ghost"
            >
              Add line
            </Button>

            <Divider />

            {/* Totals & summary */}
            <HStack justify="space-between" align="center">
              <Box>
                <Text fontSize="sm">Currency summary: {currencySummary}</Text>
              </Box>

              <HStack spacing={6}>
                <Box textAlign="right">
                  <Text fontSize="sm">Total Debit (LAK)</Text>
                  <Text
                    fontWeight="bold"
                    color={
                      Math.round(totals.dr) !== Math.round(totals.cr)
                        ? "red.600"
                        : "green.600"
                    }
                  >
                    {Math.round(totals.dr).toLocaleString()}
                  </Text>
                </Box>

                <Box textAlign="right">
                  <Text fontSize="sm">Total Credit (LAK)</Text>
                  <Text
                    fontWeight="bold"
                    color={
                      Math.round(totals.dr) !== Math.round(totals.cr)
                        ? "red.600"
                        : "green.600"
                    }
                  >
                    {Math.round(totals.cr).toLocaleString()}
                  </Text>
                </Box>
              </HStack>
            </HStack>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button
            mr={3}
            onClick={() => {
              onClose();
              dispatch(clearSelectedJournal());
            }}
          >
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSave}
            isDisabled={
              Math.round(totals.dr) !== Math.round(totals.cr) || saving
            }
          >
            {editingId ? "Update" : "Save"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default JournalModal;
