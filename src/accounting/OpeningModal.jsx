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
  useToast,
  HStack,
  Box,
  Text,
} from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import {
  createOpening,
  updateOpening,
  clearMessage,
} from "../store/accountingReducer/openingBalanceSlice";
import React, { useEffect, useMemo } from "react";
import {
  getAccounts,
  getAccountTree,
} from "../store/accountingReducer/chartAccounting";
import SelectReact from "react-select";
const OpeningModal = ({ isOpen, onClose, editing, year }) => {
  const dispatch = useDispatch();
  const toast = useToast();

  const { accounts } = useSelector((state) => state.chartAccount);
  const { success, error } = useSelector((state) => state.openingBalance);

  const [form, setForm] = React.useState({
    accountId: "",
    debit: 0,
    credit: 0,
    year: 0,
  });

  /* --------------------- Load Account for Dropdown --------------------- */
  useEffect(() => {
    dispatch(getAccounts());
    dispatch(getAccountTree());
  }, [dispatch]);

  /* ---------------- Fill form when editing ---------------- */
  useEffect(() => {
    if (editing) {
      setForm({
        accountId: editing.accountId._id,
        debit: editing.debit,
        credit: editing.credit,
        year: editing?.year,
      });
    } else {
      setForm({ accountId: "", debit: 0, credit: 0, year: 0 });
    }
  }, [editing]);

  /* ---------------- Listen to Redux toast messages ---------------- */
  useEffect(() => {
    if (success) {
      toast({ title: success, status: "success", duration: 3000 });
      dispatch(clearMessage());
      onClose();
    }

    if (error) {
      toast({ title: error, status: "error", duration: 3000 });
      dispatch(clearMessage());
    }
  }, [success, error]);

  /* --------------------- Validation before save --------------------- */
  const validateForm = () => {
    if (!form.accountId) {
      toast({
        title: "ກະລຸນາເລືອກບັນຊີ",
        status: "warning",
      });
      return false;
    }

    const d = Number(form.debit);
    const c = Number(form.credit);

    if (isNaN(d) || isNaN(c)) {
      toast({
        title: "Debit/credit ຕ້ອງເປັນຕົວເລກ",
        status: "warning",
      });
      return false;
    }

    if (d < 0 || c < 0) {
      toast({
        title: "Debit/credit ຕ້ອງເປັນບວກ",
        status: "warning",
      });
      return false;
    }

    if (d > 0 && c > 0) {
      toast({
        title: "ກະລຸນາໃສ່ພຽງແຕ່ Debit ຫຼື Credit ແຕ່ຢ່າງໃດໜຶ່ງ",
        status: "warning",
      });
      return false;
    }

    if (d === 0 && c === 0) {
      toast({
        title: "ກະລຸນາໃສ່ຢ່າງໜຶ່ງ Debit ຫຼື Credit",
        status: "warning",
      });
      return false;
    }

    return true;
  };

  /* --------------------- Save Handler --------------------- */
  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      if (editing) {
        // ❗ unwrap ทำให้สามารถ catch error จาก backend ได้
        await dispatch(
          updateOpening({ id: editing._id, formData: form })
        ).unwrap();

        toast({
          title: "ແກ້ໄຂສຳເລັດ",
          status: "success",
          duration: 3000,
        });
      } else {
        await dispatch(createOpening({ ...form })).unwrap();

        toast({
          title: "ເພີ່ມສຳເລັດ",
          status: "success",
          duration: 3000,
        });
      }

      onClose(); // ✔ ปิด modal เฉพาะตอน success
    } catch (err) {
      // ❗ Error มาจาก backend โดยตรง เช่น
      // "Account does not belong to your company"
      toast({
        title: err || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์",
        status: "error",
        duration: 4000,
      });
    }
  };

  const openingAccountOptions = useMemo(() => {
    return accounts
      ?.filter((acc) => acc.parentCode) // ✔ บัญชีย่อยเท่านั้น
      .map((acc) => ({
        value: acc._id,
        label: `${acc.code} - ${acc.name}`,
      }));
  }, [accounts]);
  const summary = useMemo(() => {
    const d = Number(form.debit) || 0;
    const c = Number(form.credit) || 0;

    return {
      debit: d,
      credit: c,
      balance: d - c,
    };
  }, [form.debit, form.credit]);
  const yearGroups = useMemo(() => {
    const current = new Date().getFullYear();

    return {
      current,
      future: Array.from({ length: 3 }, (_, i) => current + (i + 1)),
      past: Array.from({ length: 6 }, (_, i) => current - (i + 1)),
    };
  }, []);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontFamily="Noto Sans Lao, sans-serif">
          {editing ? "ແກ້ໄຂຍອດຍົກມາ" : "ເພີ່ມຍອດຍົກມາ"}
        </ModalHeader>

        <ModalBody>
          <VStack spacing={4}>
            {/* Account Selection */}
            <FormControl isRequired>
              <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                ໝາຍເລກບັນຊີ
              </FormLabel>
              <SelectReact
                options={openingAccountOptions}
                value={
                  openingAccountOptions.find(
                    (o) => o.value === form.accountId
                  ) || null
                }
                onChange={(opt) =>
                  setForm({ ...form, accountId: opt?.value || "" })
                }
                placeholder="-- Select Account --"
                isSearchable
                isClearable
                styles={{
                  container: (base) => ({ ...base, width: "100%" }),
                }}
              />
            </FormControl>

            {/* Debit */}
            <FormControl>
              <FormLabel fontFamily="Noto Sans Lao, sans-serif">ໜີ້</FormLabel>
              <Input
                fontFamily="Noto Sans Lao, sans-serif"
                type="number"
                value={form.debit}
                onChange={(e) =>
                  setForm({ ...form, debit: Number(e.target.value) })
                }
              />
            </FormControl>

            {/* Credit */}
            <FormControl>
              <FormLabel fontFamily="Noto Sans Lao, sans-serif">ມີ</FormLabel>
              <Input
                fontFamily="Noto Sans Lao, sans-serif"
                type="number"
                value={form.credit}
                onChange={(e) =>
                  setForm({ ...form, credit: Number(e.target.value) })
                }
              />
            </FormControl>

            <FormControl>
              <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                ປີງວດ
              </FormLabel>

              <Select
                value={form.year}
                onChange={(e) =>
                  setForm({ ...form, year: Number(e.target.value) })
                }
              >
                <option value={2030}>2030</option>
                <option value={2029}>2029</option>
                <option value={2028}>2028</option>
                <option value={2027}>2027</option>
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
              </Select>
            </FormControl>
          </VStack>
          <Box
            w="100%"
            p={3}
            bg="gray.50"
            borderRadius="md"
            border="1px solid #eee"
            mt={4}
          >
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              fontWeight="bold"
              mb={2}
            >
              ຍອດລວມ
            </Text>

            <HStack justify="space-between">
              <Text fontFamily="Noto Sans Lao, sans-serif">
                ຍອດລວມເບື້ອງໜີ້:
              </Text>
              <Text
                fontFamily="Noto Sans Lao, sans-serif"
                fontWeight="bold"
                color="blue.600"
              >
                {summary.debit.toLocaleString()}
              </Text>
            </HStack>

            <HStack justify="space-between">
              <Text fontFamily="Noto Sans Lao, sans-serif">
                ຍອດລວມເບື້ອງມີ:
              </Text>
              <Text
                fontFamily="Noto Sans Lao, sans-serif"
                fontWeight="bold"
                color="orange.600"
              >
                {summary.credit.toLocaleString()}
              </Text>
            </HStack>

            <HStack justify="space-between">
              <Text fontFamily="Noto Sans Lao, sans-serif">
                ຜົນລວມ (Dr - Cr):
              </Text>
              <Text
                fontFamily="Noto Sans Lao, sans-serif"
                fontWeight="bold"
                color={summary.balance >= 0 ? "green.600" : "red.600"}
              >
                {summary.balance.toLocaleString()}
              </Text>
            </HStack>
          </Box>
        </ModalBody>

        <ModalFooter>
          <Button
            fontFamily="Noto Sans Lao, sans-serif"
            variant="ghost"
            mr={3}
            onClick={onClose}
          >
            ຍົກເລີກ
          </Button>
          <Button
            fontFamily="Noto Sans Lao, sans-serif"
            colorScheme="blue"
            onClick={handleSave}
          >
            ບັນທຶກ
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default OpeningModal;
