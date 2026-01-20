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
  clearSelectedJournal,
} from "../../store/accountingReducer/journalSlice";
import { getAccounts } from "../../store/accountingReducer/chartAccounting";
import Select from "react-select";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { ArrowBackIcon } from "@chakra-ui/icons";

const CURRENCIES = ["LAK", "USD", "THB", "CNY"];

/* ================== LINE MODEL ================== */
const blankLine = () => ({
  accountId: "",
  debitOriginal: 0,
  creditOriginal: 0,
  currency: "LAK",
  exchangeRate: 1,
  amountLAK: 0,
});

export default function JournalModal() {
  const dispatch = useDispatch();
  const toast = useToast();
  const { state } = useLocation();
  const editingId = state?.editingId;
  const isReadOnlyYear = state?.isReadOnlyYear;
  const { accounts } = useSelector((s) => s.chartAccount || {});
  const { selectedJournal } = useSelector((s) => s.journal || {});
  const navigate = useNavigate();
  const [header, setHeader] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: "",
    reference: "",
  });

  const [lines, setLines] = useState([blankLine()]);
  const [saving, setSaving] = useState(false);
  /* ================== LOAD DATA ================== */
  useEffect(() => {
    dispatch(getAccounts());
    if (editingId) {
      dispatch(getJournalById(editingId));
    } else {
      dispatch(clearSelectedJournal());
    }
  }, [dispatch, editingId]);
  /////

  useEffect(() => {
    if (!editingId) {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const random4 = Math.floor(1000 + Math.random() * 9000);
      setHeader((h) => ({
        ...h,
        reference: `GL-${today}-${random4}`,
      }));
    }
  }, []);
  /* ================== EDIT MODE ================== */
  useEffect(() => {
    if (editingId && selectedJournal) {
      setHeader({
        date: selectedJournal.date?.slice(0, 10),
        description: selectedJournal.description || "",
        reference: selectedJournal.reference || "",
      });

      setLines(
        selectedJournal.lines.map((l) => ({
          accountId: l.accountId?._id || l.accountId,
          debitOriginal: l.debitOriginal > 0 ? l.debitOriginal : 0,
          creditOriginal: l.creditOriginal > 0 ? l.creditOriginal : 0,
          currency: l.currency || "LAK",
          exchangeRate: l.exchangeRate || 1,
          amountLAK: l.amountLAK || 0,
        }))
      );
    }
  }, [editingId, selectedJournal]);

  /* ================== LINE UPDATE ================== */
  const updateLine = (index, patch) => {
    setLines((prev) => {
      const next = [...prev];
      const line = { ...next[index], ...patch };

      // 🔒 FIX DR / CR LOGIC
      if ("debitOriginal" in patch && Number(patch.debitOriginal) > 0) {
        line.creditOriginal = 0;
      }
      if ("creditOriginal" in patch && Number(patch.creditOriginal) > 0) {
        line.debitOriginal = 0;
      }

      const baseAmount = Number(line.debitOriginal || line.creditOriginal || 0);
      line.amountLAK = baseAmount * Number(line.exchangeRate || 1);

      next[index] = line;
      return next;
    });
  };

  const addLine = () => setLines((prev) => [...prev, blankLine()]);
  const removeLine = (i) =>
    setLines((prev) => prev.filter((_, idx) => idx !== i));

  /* ================== TOTALS ================== */
  const totals = useMemo(() => {
    return lines.reduce(
      (acc, l) => {
        acc.dr += Number(l.debitOriginal || 0) * l.exchangeRate;
        acc.cr += Number(l.creditOriginal || 0) * l.exchangeRate;
        return acc;
      },
      { dr: 0, cr: 0 }
    );
  }, [lines]);

  /* ================== VALIDATION WITH SWAL ================== */
  const validate = () => {
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.accountId) {
        Swal.fire({
          icon: "warning",
          title: "Account Required",
          text: `Line ${i + 1}: Please select an account`,
          confirmButtonColor: "#3182ce",
          customClass: {
            popup: "swal-rounded",
          },
        });
        return false;
      }
      if (
        (l.debitOriginal > 0 && l.creditOriginal > 0) ||
        (l.debitOriginal === 0 && l.creditOriginal === 0)
      ) {
        Swal.fire({
          icon: "warning",
          title: "Invalid Entry",
          text: `Line ${i + 1}: Must fill either Debit or Credit (not both)`,
          confirmButtonColor: "#3182ce",
          customClass: {
            popup: "swal-rounded",
          },
        });
        return false;
      }
    }

    if (Math.round(totals.dr) !== Math.round(totals.cr)) {
      Swal.fire({
        icon: "error",
        title: "Unbalanced Entry",
        html: `
          <div style="text-align: left; padding: 10px;">
            <p style="margin-bottom: 10px;">Total Debit and Credit must be equal:</p>
            <div style="display: flex; justify-content: space-between; padding: 10px; background: #f7fafc; border-radius: 8px;">
              <span><strong>Total Debit:</strong> ${Math.round(
                totals.dr
              ).toLocaleString()} LAK</span>
              <span><strong>Total Credit:</strong> ${Math.round(
                totals.cr
              ).toLocaleString()} LAK</span>
            </div>
            <p style="margin-top: 10px; color: #e53e3e;"><strong>Difference:</strong> ${Math.abs(
              Math.round(totals.dr) - Math.round(totals.cr)
            ).toLocaleString()} LAK</p>
          </div>
        `,
        confirmButtonColor: "#e53e3e",
        customClass: {
          popup: "swal-rounded",
        },
      });
      return false;
    }

    return true;
  };

  /* ================== SAVE WITH SWAL ================== */
  const handleSave = async () => {
    if (!validate()) return;

    const result = await Swal.fire({
      title: editingId ? "Update Journal Entry?" : "Create Journal Entry?",
      html: `
        <div style="text-align: left; padding: 10px;">
          <p><strong>Date:</strong> ${header.date}</p>
          <p><strong>Reference:</strong> ${header.reference || "N/A"}</p>
          <p><strong>Description:</strong> ${header.description || "N/A"}</p>
          <div style="margin-top: 15px; padding: 10px; background: #f7fafc; border-radius: 8px;">
            <p><strong>Total Lines:</strong> ${lines.length}</p>
            <p><strong>Total Amount:</strong> ${Math.round(
              totals.dr
            ).toLocaleString()} LAK</p>
          </div>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#38a169",
      cancelButtonColor: "#e53e3e",
      confirmButtonText: editingId ? "Yes, Update it!" : "Yes, Create it!",
      cancelButtonText: "Cancel",
      customClass: {
        popup: "swal-rounded",
      },
    });

    if (!result.isConfirmed) return;

    setSaving(true);

    const payload = {
      ...header,
      totalDebitLAK: totals.dr,
      totalCreditLAK: totals.cr,
      lines: lines.map((l) => ({
        accountId: l.accountId,
        currency: l.currency,
        exchangeRate: l.exchangeRate,
        debitOriginal: l.debitOriginal,
        creditOriginal: l.creditOriginal,
        debitLAK: l.debitOriginal > 0 ? l.debitOriginal * l.exchangeRate : 0,
        creditLAK: l.creditOriginal > 0 ? l.creditOriginal * l.exchangeRate : 0,
        amountLAK: l.amountLAK,
      })),
    };

    try {
      let response;

      if (editingId) {
        response = await dispatch(
          updateJournal({ id: editingId, payload })
        ).unwrap();
      } else {
        response = await dispatch(createJournal(payload)).unwrap(); // ✅ unwrap
      }

      // ✅ แสดง message จาก backend
      await Swal.fire({
        icon: "success",
        title: "Success!",
        text: response?.message || "บันทึกสำเร็จ",
        confirmButtonColor: "#38a169",
        timer: 2000,
        customClass: {
          popup: "swal-rounded",
        },
      });

      setSaving(false);
    } catch (error) {
      // ✅ ดึง error จาก backend
      const errorMessage = error || "เกิดข้อผิดพลาด กรุณาลองใหม่";
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: errorMessage,
        confirmButtonColor: "#e53e3e",
        customClass: {
          popup: "swal-rounded",
        },
      });

      setSaving(false);
    }
  };

  /* ================== DELETE CONFIRMATION WITH SWAL ================== */
  const handleDeleteLine = async (i) => {
    if (lines.length === 1) {
      Swal.fire({
        icon: "warning",
        title: "Cannot Delete",
        text: "At least one line is required",
        confirmButtonColor: "#3182ce",
        customClass: {
          popup: "swal-rounded",
        },
      });
      return;
    }

    const result = await Swal.fire({
      title: "ແນ່ໃຈບໍ່ຈະລົບ?",
      text: "ການກະທຳນີ້ບໍ່ສາມາດຍ້ອນກັບໄດ້",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e53e3e",
      cancelButtonColor: "#718096",
      confirmButtonText: "ແມ່ນ, ຕ້ອງການລົບ!",
      cancelButtonText: "ຍົກເລີກ",
      customClass: {
        popup: "swal-rounded",
      },
    });

    if (result.isConfirmed) {
      removeLine(i);
      toast({
        title: "ລົບແຖວສຳເລັດ",
        status: "info",
        duration: 2000,
      });
    }
  };

  /* ================== OPTIONS ================== */
  const accountOptions = accounts
    ?.filter((a) => a.parentCode)
    .map((a) => ({
      value: a._id,
      label: `${a.code} - ${a.name}`,
    }));
  const currencyOptions = CURRENCIES.map((c) => ({
    value: c,
    label: c,
  }));
  /* ================== UI WITH ENHANCED STYLING ================== */
  return (
    <>
      <style>
        {`
          .swal-rounded {
            border-radius: 15px !important;
            font-family: inherit;
          }
        `}
      </style>

      <VStack spacing={6} align="stretch" p={6} bg="gray.50" borderRadius="xl">
        {/* HEADER SECTION */}
        <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
          <Button
            leftIcon={<ArrowBackIcon />}
            colorScheme="red"
            onClick={() => navigate(-1)}
            fontFamily="Noto Sans Lao, sans-serif"
          >
            ກັບຄືນ
          </Button>
          <Text
            paddingTop={"20px"}
            fontFamily="Noto Sans Lao, sans-serif"
            fontSize="lg"
            fontWeight="bold"
            mb={4}
            color="gray.700"
          >
            {editingId ? "✏️ ແກ້ໄຂປື້ມປະຈຳວັນ" : "➕ ເພີ່ມປື້ມປະຈຳວັນໃໝ່"}
          </Text>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel
                fontFamily="Noto Sans Lao, sans-serif"
                fontSize="sm"
                fontWeight="medium"
              >
                ວັນທີ່/ເດືອນ/ປີ
              </FormLabel>
              <Input
                fontFamily="Noto Sans Lao, sans-serif"
                type="date"
                value={header.date}
                isDisabled={isReadOnlyYear}
                onChange={(e) =>
                  setHeader((h) => ({ ...h, date: e.target.value }))
                }
                bg="gray.50"
                borderColor="gray.300"
                _hover={{ borderColor: "blue.400" }}
                _focus={{
                  borderColor: "blue.500",
                  boxShadow: "0 0 0 1px #3182ce",
                }}
              />
            </FormControl>
            <FormControl>
              <FormLabel
                fontFamily="Noto Sans Lao, sans-serif"
                fontSize="sm"
                fontWeight="medium"
              >
                ເລກທີ່ເອກະສານອ້າງອີງ
              </FormLabel>
              <Input
                isDisabled={isReadOnlyYear}
                fontFamily="Noto Sans Lao, sans-serif"
                placeholder="ກະລຸນາລະບຸເລກທີ່ເອກະສານອ້າງອີງ"
                value={header.reference}
                onChange={(e) =>
                  setHeader((h) => ({ ...h, reference: e.target.value }))
                }
                bg="gray.50"
                borderColor="gray.300"
                _hover={{ borderColor: "blue.400" }}
                _focus={{
                  borderColor: "blue.500",
                  boxShadow: "0 0 0 1px #3182ce",
                }}
              />
            </FormControl>
            <FormControl>
              <FormLabel
                fontFamily="Noto Sans Lao, sans-serif"
                fontSize="sm"
                fontWeight="medium"
              >
                ຄຳອະທິບາຍ
              </FormLabel>
              <Input
                fontFamily="Noto Sans Lao, sans-serif"
                placeholder="ກະລຸນາລະບຸຄຳອະທິບາຍ"
                value={header.description}
                isDisabled={isReadOnlyYear}
                onChange={(e) =>
                  setHeader((h) => ({ ...h, description: e.target.value }))
                }
                bg="gray.50"
                borderColor="gray.300"
                _hover={{ borderColor: "blue.400" }}
                _focus={{
                  borderColor: "blue.500",
                  boxShadow: "0 0 0 1px #3182ce",
                }}
              />
            </FormControl>
          </VStack>
        </Box>
        <Divider />
        {/* LINES SECTION */}
        <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
          <Text
            fontFamily="Noto Sans Lao, sans-serif"
            fontSize="lg"
            fontWeight="bold"
            mb={4}
            color="gray.700"
          >
            📋 ບັນທຶກບັນຊີ
          </Text>

          {/* Column Headers */}
          <HStack mb={3} px={2} spacing={2}>
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              w="35%"
              fontSize="xs"
              fontWeight="bold"
              color="gray.600"
            >
              ເລກໝາຍບັນຊີ/ACCOUNT
            </Text>
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              w="12%"
              fontSize="xs"
              fontWeight="bold"
              color="gray.600"
            >
              ໜີ້/DEBIT
            </Text>
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              w="12%"
              fontSize="xs"
              fontWeight="bold"
              color="gray.600"
            >
              ມີ/CREDIT
            </Text>
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              w="10%"
              fontSize="xs"
              fontWeight="bold"
              color="gray.600"
            >
              ສະກຸນເງິນ/CURRENCY
            </Text>
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              w="10%"
              fontSize="xs"
              fontWeight="bold"
              color="gray.600"
            >
              ອັດຕາແລກປ່ຽນ/RATE
            </Text>
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              w="12%"
              fontSize="xs"
              fontWeight="bold"
              color="gray.600"
              textAlign="right"
            >
              ຈຳນວນເງິນ/AMOUNT (LAK)
            </Text>
            <Box w="40px"></Box>
          </HStack>

          {lines.map((l, i) => (
            <Box
              key={i}
              p={3}
              mb={2}
              bg={i % 2 === 0 ? "gray.50" : "white"}
              borderRadius="md"
              border="1px solid"
              borderColor="gray.200"
              _hover={{ borderColor: "blue.300", boxShadow: "sm" }}
              transition="all 0.2s"
            >
              <HStack spacing={2}>
                <Box w="35%">
                  <Select
                    isDisabled={isReadOnlyYear}
                    isSearchable
                    options={accountOptions}
                    value={accountOptions?.find((o) => o.value === l.accountId)}
                    onChange={(opt) => updateLine(i, { accountId: opt.value })}
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderColor: "#cbd5e0",
                        "&:hover": { borderColor: "#3182ce" },
                      }),
                    }}
                  />
                </Box>

                <NumberInput
                  w="12%"
                  value={l.debitOriginal}
                  isDisabled={l.creditOriginal > 0 || isReadOnlyYear}
                  onChange={(v) => updateLine(i, { debitOriginal: Number(v) })}
                >
                  <NumberInputField
                    isDisabled={isReadOnlyYear}
                    placeholder="0.00"
                    bg={l.creditOriginal > 0 ? "gray.100" : "white"}
                    borderColor="gray.300"
                    _hover={{ borderColor: "blue.400" }}
                  />
                </NumberInput>

                <NumberInput
                  w="12%"
                  value={l.creditOriginal}
                  isDisabled={l.debitOriginal > 0 || isReadOnlyYear}
                  onChange={(v) => updateLine(i, { creditOriginal: Number(v) })}
                >
                  <NumberInputField
                    isDisabled={isReadOnlyYear}
                    placeholder="0.00"
                    bg={l.debitOriginal > 0 ? "gray.100" : "white"}
                    borderColor="gray.300"
                    _hover={{ borderColor: "blue.400" }}
                  />
                </NumberInput>

                <Select
                  isDisabled={isReadOnlyYear}
                  isSearchable={true}
                  options={currencyOptions}
                  value={currencyOptions.find((o) => o.value === l.currency)}
                  onChange={(opt) =>
                    updateLine(i, {
                      currency: opt.value,
                      exchangeRate: opt.value === "LAK" ? 1 : l.exchangeRate,
                    })
                  }
                  styles={{
                    control: (base) => ({
                      ...base,
                      borderColor: "#cbd5e0",
                      minHeight: "38px",
                    }),
                  }}
                />

                <NumberInput
                  isDisabled={isReadOnlyYear}
                  w="10%"
                  value={l.exchangeRate}
                  onChange={(v) => updateLine(i, { exchangeRate: Number(v) })}
                >
                  <NumberInputField
                    isDisabled={isReadOnlyYear}
                    bg="white"
                    borderColor="gray.300"
                    _hover={{ borderColor: "blue.400" }}
                  />
                </NumberInput>

                <Box w="12%">
                  <Text
                    fontFamily="Noto Sans Lao, sans-serif"
                    textAlign="right"
                    fontWeight="medium"
                    bg="blue.50"
                    p={2}
                    borderRadius="md"
                    fontSize="sm"
                  >
                    {l.amountLAK.toLocaleString()}
                  </Text>
                </Box>

                <IconButton
                  icon={<Trash2 size={16} />}
                  onClick={() => handleDeleteLine(i)}
                  colorScheme="red"
                  variant="ghost"
                  size="sm"
                  _hover={{ bg: "red.50" }}
                />
              </HStack>
            </Box>
          ))}
          <HStack justify="space-between" align="center">
            <Button
              leftIcon={<Plus size={16} />}
              onClick={addLine}
              variant="outline"
              colorScheme="blue"
              mt={3}
               fontFamily="Noto Sans Lao, sans-serif"
              size="sm"
              _hover={{ bg: "blue.50" }}
            >
             ເພີ່ມແຖວໃໝ່
            </Button>

            <HStack spacing={8}>
              <Box
                textAlign="center"
                p={4}
                bg="green.50"
                borderRadius="lg"
                borderWidth="2px"
                borderColor={
                  Math.round(totals.dr) !== Math.round(totals.cr)
                    ? "red.300"
                    : "green.300"
                }
              >
                <Text
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontSize="xs"
                  color="gray.600"
                  fontWeight="medium"
                >
                  ຍອດລວມເບື້ອງໜີ້
                </Text>
                <Text
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontSize="2xl"
                  fontWeight="bold"
                  color={
                    Math.round(totals.dr) !== Math.round(totals.cr)
                      ? "red.600"
                      : "green.600"
                  }
                >
                  {Math.round(totals.dr).toLocaleString()}
                </Text>
                <Text
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontSize="xs"
                  color="gray.500"
                >
                  LAK
                </Text>
              </Box>

              <Box
                textAlign="center"
                p={4}
                bg="blue.50"
                borderRadius="lg"
                borderWidth="2px"
                borderColor={
                  Math.round(totals.dr) !== Math.round(totals.cr)
                    ? "red.300"
                    : "blue.300"
                }
              >
                <Text
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontSize="xs"
                  color="gray.600"
                  fontWeight="medium"
                >
                  ຍອດລວມເບື້ອງມິ
                </Text>
                <Text
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontSize="2xl"
                  fontWeight="bold"
                  color={
                    Math.round(totals.dr) !== Math.round(totals.cr)
                      ? "red.600"
                      : "blue.600"
                  }
                >
                  {Math.round(totals.cr).toLocaleString()}
                </Text>
                <Text
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontSize="xs"
                  color="gray.500"
                >
                  LAK
                </Text>
              </Box>

              {Math.round(totals.dr) !== Math.round(totals.cr) && (
                <Box
                  textAlign="center"
                  p={4}
                  bg="red.50"
                  borderRadius="lg"
                  borderWidth="2px"
                  borderColor="red.300"
                >
                  <Text
                    fontFamily="Noto Sans Lao, sans-serif"
                    fontSize="xs"
                    color="red.600"
                    fontWeight="medium"
                  >
                    ຜິດດ່ຽງ
                  </Text>
                  <Text
                    fontFamily="Noto Sans Lao, sans-serif"
                    fontSize="2xl"
                    fontWeight="bold"
                    color="red.600"
                  >
                    {Math.abs(
                      Math.round(totals.dr) - Math.round(totals.cr)
                    ).toLocaleString()}
                  </Text>
                  <Text
                    fontFamily="Noto Sans Lao, sans-serif"
                    fontSize="xs"
                    color="red.500"
                  >
                    LAK
                  </Text>
                </Box>
              )}
            </HStack>
          </HStack>
          {Math.round(totals.dr) !== Math.round(totals.cr) && (
            <Box
              mt={4}
              p={3}
              bg="red.50"
              borderRadius="md"
              borderLeft="4px solid"
              borderColor="red.500"
            >
              <Text
                fontFamily="Noto Sans Lao, sans-serif"
                fontSize="sm"
                color="red.700"
                fontWeight="medium"
              >
                ⚠️ ກະລຸນາລະບຸຈຳນວນເງິນໃຫ້ດຸນດ່ຽງທັງສອງເບື້ອງ ກ່ອນບັນທຶກ.
              </Text>
            </Box>
          )}
        </Box>
        <Divider />
        {/* TOTAL SECTION */}
        <Box bg="white" p={6} borderRadius="lg" boxShadow="md">
          <HStack justify="space-between" align="center">
            <Button
              colorScheme={
                Math.round(totals.dr) === Math.round(totals.cr)
                  ? "green"
                  : "gray"
              }
              onClick={handleSave}
              isDisabled={
                saving ||
                Math.round(totals.dr) !== Math.round(totals.cr) ||
                isReadOnlyYear
              }
              isLoading={saving}
              size="lg"
              px={8}
              fontFamily="Noto Sans Lao, sans-serif"
              boxShadow="lg"
              _hover={{ transform: "translateY(-2px)", boxShadow: "xl" }}
              transition="all 0.2s"
            >
              {saving
                ? "ກຳລັງບັນທຶກ..."
                : editingId
                ? "💾 ອັບເດດຂໍ້ມູນ"
                : "💾 ບັນທຶກຂໍ້ມູນ"}
            </Button>
          </HStack>
        </Box>
      </VStack>
    </>
  );
}
