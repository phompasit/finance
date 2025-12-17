"use client";

import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  VStack,
  HStack,
  SimpleGrid,
  IconButton,
  Divider,
  InputGroup,
  InputRightElement,
  Icon,
  useColorModeValue,
  Flex,
  Text,
} from "@chakra-ui/react";
import Select from "react-select";
import { AddIcon, CloseIcon } from "@chakra-ui/icons";
import { InfoIcon } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import {
  currencyOptions,
  laoType,
  PAYMENT_METHOD_LABELS,
  statusOptions,
  typeOptions,
} from "./constants";
import { useAuth } from "../../context/AuthContext";
import { fetchCategories } from "../../store/reducer/partner";
import { useDispatch, useSelector } from "react-redux";

// ✅ สร้าง MemoSelect นอก component - สร้างครั้งเดียว
const MemoSelect = React.memo(Select);

// ✅ แยก AmountField component + Memoize
const AmountField = React.memo(
  ({
    index,
    amount,
    accountOptions,
    onUpdate,
    onRemove,
    canRemove,
    cardBg,
    borderClr,
    id,
  }) => {
    // ✅ Memoize selected values เพื่อไม่ให้ find ซ้ำ
    const selectedCurrency = useMemo(
      () => currencyOptions?.find((i) => i.value === amount.currency),
      [currencyOptions, amount.currency]
    );

    const selectedAccount = useMemo(
      () =>
        accountOptions?.find((acc) => acc.value === amount.accountId) || null,
      [accountOptions, amount.accountId]
    );
    const [amountLocal, setAmountLocal] = useState(amount.amount);

    useEffect(() => setAmountLocal(amount.amount), [amount.amount]);
    return (
      <Box
        w="1200px"
        bg="whiteAlpha.800"
        backdropFilter="blur(14px)"
        border="1px solid"
        borderColor="whiteAlpha.400"
        rounded="3xl"
        p={5}
        shadow="xl"
        position="relative"
      >
        {/* Remove Button */}
        {canRemove && (
          <IconButton
            icon={<CloseIcon />}
            size="xs"
            variant="ghost"
            colorScheme="red"
            position="absolute"
            top={3}
            right={3}
            onClick={() => onRemove(index, id)}
            _hover={{ bg: "red.50" }}
          />
        )}

        <VStack spacing={4} align="stretch">
          {/* ===== Currency & Account ===== */}
          <SimpleGrid columns={2} spacing={3}>
            <FormControl>
              <FormLabel fontSize={12}  fontFamily="Noto Sans Lao, sans-serif"  opacity={0.7}>
                💱 ສະກຸນເງິນ
              </FormLabel>
              <MemoSelect
                value={selectedCurrency}
                onChange={(v) => onUpdate(index, "currency", v.value)}
                options={currencyOptions}
              />
            </FormControl>

            <FormControl>
              <FormLabel   fontFamily="Noto Sans Lao, sans-serif" fontSize="xs" opacity={0.7}>
                🏦 ບັນຊີ
              </FormLabel>
              <MemoSelect
                value={selectedAccount}
                onChange={(v) => onUpdate(index, "accountId", v?.value || "")}
                options={accountOptions}
                isClearable
              />
            </FormControl>
          </SimpleGrid>

          {/* ===== Amount ===== */}
          <FormControl isRequired>
            <FormLabel   fontFamily="Noto Sans Lao, sans-serif" fontSize="xs" opacity={0.7}>
              💸 ຈຳນວນ
            </FormLabel>

            <InputGroup>
              <Input
                type="number"
                value={amountLocal}
                onChange={(e) => setAmountLocal(e.target.value)}
                onBlur={() => {
                  if (amountLocal !== amount.amount) {
                    onUpdate(index, "amount", amountLocal);
                  }
                }}
                placeholder="0.00"
                rounded="2xl"
                bg="white"
                fontWeight="600"
                _focus={{
                  borderColor: "teal.400",
                  boxShadow: "0 0 0 2px rgba(56,178,172,.25)",
                }}
              />

              <InputRightElement>
                <Icon as={InfoIcon} boxSize={4} color="gray.400" />
              </InputRightElement>
            </InputGroup>
          </FormControl>
        </VStack>
      </Box>
    );
  }
);

AmountField.displayName = "AmountField";

// ✅ Main Component - Wrapped with React.memo
const RenderFields = React.memo(
  ({
    serial,
    setSerial,
    type,
    setType,
    paymentMethod,
    setPaymentMethod,
    description,
    setDescription,
    date,
    setDate,
    status,
    setStatus,
    categoryId,
    setCategoryId,
    note,
    setNote,
    status_Ap,
    handleEdit,
    amounts,
    addCurrency,
    removeCurrency,
    updateCurrency,
    id,
  }) => {
    const { user } = useAuth();
    const { categoriesRedu: categories } = useSelector(
      (state) => state.partner
    );
    const dispatch = useDispatch();
    const bankOptions = useMemo(
      () =>
        (user?.companyId?.bankAccounts || []).map((b) => ({
          label: `${b.bankName} (${b.currency})`,
          value: b._id,
          currency: b.currency,
        })),
      [user?.companyId?.bankAccounts]
    );
    const cashOptions = useMemo(
      () =>
        (user?.companyId?.cashAccounts || []).map((b) => ({
          label: `${b.name} (${b.currency})`,
          value: b._id,
          currency: b.currency,
        })),
      [user?.companyId?.cashAccounts]
    );

    const categoryOptions = useMemo(
      () =>
        categories?.map((c) => ({
          value: c._id,
          label: `${c.name} (${laoType[c.type] || c.type})`,
        })),
      [categories]
    );
    const paymentOptions = useMemo(
      () =>
        Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => ({
          value: key,
          label: label,
        })),
      [PAYMENT_METHOD_LABELS]
    );

    // ✅ Memoize selected values สำหรับ top-level selects
    const selectedType = useMemo(
      () => typeOptions?.find((i) => i.value === type),
      [typeOptions, type]
    );

    const selectedPayment = useMemo(
      () => paymentOptions?.find((i) => i.value === paymentMethod),
      [paymentOptions, paymentMethod]
    );
    const selectedStatus = useMemo(
      () => statusOptions?.find((i) => i.value === status) || null,
      [statusOptions, status]
    );

    const selectedCategory = useMemo(
      () => categoryOptions?.find((c) => c.value === categoryId) || null,
      [categoryOptions, categoryId]
    );

    // ✅ Pre-compute account options Map - คำนวณครั้งเดียว
    const accountOptionsMap = useMemo(() => {
      const options = paymentMethod === "cash" ? cashOptions : bankOptions;
      // สร้าง Map เพื่อ O(1) lookup
      const map = new Map();
      currencyOptions?.forEach((curr) => {
        const filtered =
          options?.filter((acc) => acc.currency === curr.value) || [];
        map.set(curr.value, filtered);
      });
      return map;
    }, [paymentMethod, cashOptions, bankOptions, currencyOptions]);
    const [serialLocal, setSerialLocal] = useState(serial);
    const [descriptionLocal, setDescriptionLocal] = useState(description);
    const [dateLocal, setDateLocal] = useState(date);
    const [noteLocal, setNoteLocal] = useState(note);

    useEffect(() => setSerialLocal(serial), [serial]);
    useEffect(() => setDescriptionLocal(description), [description]);
    useEffect(() => setDateLocal(date), [date]);
    useEffect(() => setNoteLocal(note), [note]);
    useEffect(() => {
      dispatch(fetchCategories());
    }, []); // ลบ dispatch ออกจาก dependencies - fetch ครั้งเดียวตอน mount

    return (
      <VStack spacing={8} align="stretch">
        {/* ================= Top Section ================= */}
        <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={6}>
          {/* ==== Card: Basic Info ==== */}
          <Box
            bg="whiteAlpha.700"
            backdropFilter="blur(12px)"
            border="1px solid"
            borderColor="whiteAlpha.400"
            rounded="3xl"
            p={6}
            shadow="lg"
          >
            <Text   fontFamily="Noto Sans Lao, sans-serif" fontSize="sm" fontWeight="700" mb={4} opacity={0.8}>
              ✨ ຂໍ້ມູນພື້ນຖານ
            </Text>

            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              <FormControl   fontFamily="Noto Sans Lao, sans-serif" isRequired>
                <FormLabel fontSize="xs" opacity={0.7}>
                  ເລກທີ່
                </FormLabel>
                <Input
                  value={serialLocal}
                  onChange={(e) => setSerialLocal(e.target.value)}
                  onBlur={() =>
                    serialLocal !== serial && setSerial(serialLocal)
                  }
                  placeholder="INV-001"
                  rounded="2xl"
                  bg="white"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel   fontFamily="Noto Sans Lao, sans-serif" fontSize="xs" opacity={0.7}>
                  ປະເພດ
                </FormLabel>
                <MemoSelect
                  value={selectedType}
                  onChange={(v) => setType(v.value)}
                  options={typeOptions}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel   fontFamily="Noto Sans Lao, sans-serif" fontSize="xs" opacity={0.7}>
                  ວິທີຊຳລະ
                </FormLabel>
                <MemoSelect
                  value={selectedPayment}
                  onChange={(v) => setPaymentMethod(v.value)}
                  options={paymentOptions}
                />
              </FormControl>
            </SimpleGrid>
          </Box>

          {/* ==== Card: Details ==== */}
          <Box
            bgGradient="linear(to-br, teal.50, purple.50)"
            border="1px solid"
            borderColor="whiteAlpha.400"
            rounded="3xl"
            p={6}
            shadow="lg"
          >
            <Text   fontFamily="Noto Sans Lao, sans-serif" fontSize="sm" fontWeight="700" mb={4} opacity={0.8}>
              📝 ລາຍລະອຽດ
            </Text>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <FormControl isRequired>
                <FormLabel    fontFamily="Noto Sans Lao, sans-serif" fontSize="xs" opacity={0.7}>
                  ຄຳອະທິບາຍ
                </FormLabel>
                <Input
                  value={descriptionLocal}
                  onChange={(e) => setDescriptionLocal(e.target.value)}
                  onBlur={() =>
                    descriptionLocal !== description &&
                    setDescription(descriptionLocal)
                  }
                  placeholder="ຂາຍສິນຄ້າ..."
                  rounded="2xl"
                  bg="white"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel   fontFamily="Noto Sans Lao, sans-serif" fontSize="xs" opacity={0.7}>
                  ວັນທີ່
                </FormLabel>
                <Input
                  type="date"
                  value={dateLocal}
                  onChange={(e) => setDateLocal(e.target.value)}
                  onBlur={() => dateLocal !== date && setDate(dateLocal)}
                  rounded="2xl"
                  bg="white"
                />
              </FormControl>
            </SimpleGrid>

            <SimpleGrid mt={4} columns={{ base: 1, md: 2 }} spacing={4}>
              <FormControl isRequired>
                <FormLabel    fontFamily="Noto Sans Lao, sans-serif" fontSize="xs" opacity={0.7}>
                  ສະຖານະ
                </FormLabel>
                <MemoSelect
                  value={selectedStatus}
                  onChange={(v) => setStatus(v.value)}
                  options={statusOptions}
                />
              </FormControl>

              <FormControl>
                <FormLabel   fontFamily="Noto Sans Lao, sans-serif" fontSize="xs" opacity={0.7}>
                  ໝວດໝູ່
                </FormLabel>
                <MemoSelect
                  value={selectedCategory}
                  onChange={(v) => setCategoryId(v?.value || null)}
                  options={categoryOptions}
                  isClearable
                />
              </FormControl>
            </SimpleGrid>
          </Box>
        </SimpleGrid>

        {/* ================= Amount Section ================= */}
        <Box
          bg="whiteAlpha.800"
          backdropFilter="blur(14px)"
          rounded="3xl"
          p={6}
          shadow="xl"
        >
          <HStack justify="space-between" mb={4}>
            <Text fontFamily="Noto Sans Lao, sans-serif" fontWeight="800">💸 ຈຳນວນເງິນ</Text>
            <Button
              fontFamily="Noto Sans Lao, sans-serif"
              size="sm"
              rounded="full"
              bgGradient="linear(to-r, teal.400, cyan.400)"
              color="white"
              leftIcon={<AddIcon boxSize={3} />}
              onClick={addCurrency}
              _hover={{ opacity: 0.9 }}
            >
              ເພີ່ມ
            </Button>
          </HStack>

          <VStack spacing={4}>
            {amounts?.map((amt, i) => {
              const accountOptions = accountOptionsMap.get(amt.currency) || [];
              return (
                <AmountField
                  key={i}
                  index={i}
                  amount={amt}
                  accountOptions={accountOptions}
                  currencyOptions={currencyOptions}
                  onUpdate={updateCurrency}
                  onRemove={removeCurrency}
                  canRemove={amounts.length > 1}
                  cardBg="transparent"
                  borderClr="transparent"
                  id={id}
                />
              );
            })}
          </VStack>
        </Box>

        {/* ================= Notes ================= */}
        <Box
          bgGradient="linear(to-br, gray.50, white)"
          rounded="3xl"
          p={6}
          shadow="md"
        >
          <FormControl mb={4}>
            <FormLabel   fontFamily="Noto Sans Lao, sans-serif" fontSize="xs" opacity={0.7}>
              🗒 ໝາຍເຫດ
            </FormLabel>
            <Textarea
              fontFamily="Noto Sans Lao, sans-serif"
              value={noteLocal}
              onChange={(e) => setNoteLocal(e.target.value)}
              onBlur={() => noteLocal !== note && setNote(noteLocal)}
              rows={3}
              rounded="2xl"
              bg="white"
            />
          </FormControl>

          <FormControl>
            <FormLabel   fontFamily="Noto Sans Lao, sans-serif" fontSize="xs" opacity={0.7}>
              🔒 ສະຖານະອະນຸມັດ
            </FormLabel>
            <Input value={status_Ap} isDisabled rounded="2xl" />
          </FormControl>
        {/* ================= CTA ================= */}
        <Flex justify="flex-end" pt={2}>
          <Button
            size="lg"
              fontFamily="Noto Sans Lao, sans-serif"
            px={14}
            rounded="full"
            fontWeight="800"
            bgGradient="linear(to-r, teal.500, purple.500)"
            color="white"
            shadow="xl"
            _hover={{ transform: "translateY(-2px)", shadow: "2xl" }}
            onClick={handleEdit}
          >
            🚀 ບັນທຶກ
          </Button>
        </Flex>
        </Box>

      </VStack>
    );
  }
);

RenderFields.displayName = "RenderFields";

export default RenderFields;
