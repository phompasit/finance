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
} from "@chakra-ui/react";
import Select from "react-select";
import { AddIcon, CloseIcon } from "@chakra-ui/icons";
import { InfoIcon } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

// ✅ สร้าง MemoSelect นอก component - สร้างครั้งเดียว
const MemoSelect = React.memo(Select);

// ✅ แยก AmountField component + Memoize
const AmountField = React.memo(
  ({
    index,
    amount,
    accountOptions,
    currencyOptions,
    onUpdate,
    onRemove,
    canRemove,
    cardBg,
    borderClr,
    id,
  }) => {
    // ✅ Memoize selected values เพื่อไม่ให้ find ซ้ำ
    const selectedCurrency = useMemo(
      () => currencyOptions.find((i) => i.value === amount.currency),
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
        w="full"
        p={4}
        bg={cardBg}
        borderWidth="1px"
        borderRadius="lg"
        borderColor={borderClr}
      >
        <VStack spacing={3} align="stretch">
          <HStack spacing={3}>
            {/* Currency */}
            <FormControl>
              <FormLabel fontFamily="Noto Sans Lao, sans-serif" fontSize="sm">
                ສະກຸນເງິນ
              </FormLabel>
              <MemoSelect
                value={selectedCurrency}
                onChange={(v) => onUpdate(index, "currency", v.value)}
                options={currencyOptions}
              />
            </FormControl>

            {/* Account */}
            <FormControl>
              <FormLabel fontFamily="Noto Sans Lao, sans-serif" fontSize="sm">
                ບັນຊີ
              </FormLabel>
              <MemoSelect
                value={selectedAccount}
                onChange={(v) => onUpdate(index, "accountId", v?.value || "")}
                options={accountOptions}
                isClearable
              />
            </FormControl>
          </HStack>

          {/* Amount */}
          <FormControl isRequired>
            <FormLabel fontFamily="Noto Sans Lao, sans-serif" fontSize="sm">
              ຈຳນວນ
            </FormLabel>
            <InputGroup>
              <Input
                fontFamily="Noto Sans Lao, sans-serif"
                type="number"
                value={amountLocal}
                onChange={(e) => setAmountLocal(e.target.value)} // 🔥 เร็ว (local only)
                onBlur={() => {
                  if (amountLocal !== amount.amount) {
                    onUpdate(index, "amount", amountLocal); // ✅ sync ทีเดียว
                  }
                }}
                placeholder="0.00"
              />

              <InputRightElement fontFamily="Noto Sans Lao, sans-serif">
                <Icon as={InfoIcon} boxSize={4} color="gray.400" />
              </InputRightElement>
            </InputGroup>
          </FormControl>

          {/* Remove */}
          {canRemove && (
            <IconButton
              icon={<CloseIcon />}
              colorScheme="red"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(index, id)}
              alignSelf="flex-end"
            />
          )}
        </VStack>
      </Box>
    );
  }
);

AmountField.displayName = "AmountField";

// ✅ Main Component - Wrapped with React.memo
const RenderFields = React.memo(
  ({
    labelClr,
    cardBg,
    borderClr,

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

    typeOptions,
    paymentOptions,
    statusOptions,
    categoryOptions,
    currencyOptions,
    cashOptions,
    bankOptions,

    amounts,
    addCurrency,
    removeCurrency,
    updateCurrency,
    id,
  }) => {
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

    return (
      <VStack spacing={5} align="stretch">
        {/* ========= Row 1 ============= */}
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <FormControl isRequired>
            <FormLabel
              fontFamily="Noto Sans Lao, sans-serif"
              color={labelClr}
              fontSize="sm"
              fontWeight="600"
            >
              ເລກທີ່
            </FormLabel>
            <Input
              onChange={(e) => setSerialLocal(e.target.value)}
              onBlur={() => {
                if (serialLocal !== serial) {
                  setSerial(serialLocal);
                }
              }}
              value={serialLocal}
              placeholder="INV-001"
              rounded="lg"
            />
          </FormControl>
          <FormControl isRequired>
            <FormLabel
              fontFamily="Noto Sans Lao, sans-serif"
              color={labelClr}
              fontSize="sm"
              fontWeight="600"
            >
              ປະເພດ
            </FormLabel>
            <MemoSelect
              value={selectedType}
              onChange={(v) => setType(v.value)}
              options={typeOptions}
            />
          </FormControl>
          <FormControl isRequired>
            <FormLabel
              fontFamily="Noto Sans Lao, sans-serif"
              color={labelClr}
              fontSize="sm"
              fontWeight="600"
            >
              ວິທີຊຳລະ
            </FormLabel>
            <MemoSelect
              value={selectedPayment}
              onChange={(v) => setPaymentMethod(v.value)}
              options={paymentOptions}
            />
          </FormControl>
        </SimpleGrid>

        {/* ========= Row 2 ============= */}
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <FormControl isRequired>
            <FormLabel
              fontFamily="Noto Sans Lao, sans-serif"
              color={labelClr}
              fontSize="sm"
              fontWeight="600"
            >
              ລາຍລະອຽດ
            </FormLabel>
            <Input
              value={descriptionLocal}
              onChange={(e) => setDescriptionLocal(e.target.value)}
              onBlur={() => {
                if (descriptionLocal !== description) {
                  setDescription(descriptionLocal);
                }
              }}
              placeholder="ຂາຍສິນຄ້າ..."
              rounded="lg"
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel
              fontFamily="Noto Sans Lao, sans-serif"
              color={labelClr}
              fontSize="sm"
              fontWeight="600"
            >
              ວັນທີ່
            </FormLabel>
            <Input
              type="date"
              value={dateLocal}
              onChange={(e) => setDateLocal(e.target.value)}
              onBlur={() => {
                if (dateLocal !== date) setDate(dateLocal);
              }}
              rounded="lg"
            />
          </FormControl>
        </SimpleGrid>

        {/* ========= Status ============= */}
        <FormControl isRequired>
          <FormLabel
            fontFamily="Noto Sans Lao, sans-serif"
            color={labelClr}
            fontSize="sm"
            fontWeight="600"
          >
            ສະຖານະ
          </FormLabel>
          <MemoSelect
            value={selectedStatus}
            onChange={(v) => setStatus(v.value)}
            options={statusOptions}
            placeholder="ເລືອກສະຖານະ"
          />
        </FormControl>

        {/* ========= Category ============= */}
        <FormControl>
          <FormLabel
            fontFamily="Noto Sans Lao, sans-serif"
            color={labelClr}
            fontSize="sm"
            fontWeight="600"
          >
            ໝວດໝູ່
          </FormLabel>
          <MemoSelect
            value={selectedCategory}
            onChange={(v) => setCategoryId(v?.value || null)}
            options={categoryOptions}
            isClearable
          />
        </FormControl>

        <Divider />

        {/* ========= Amounts Section ============= */}
        <Box>
          <HStack justify="space-between" mb={3}>
            <FormLabel
              fontFamily="Noto Sans Lao, sans-serif"
              color={labelClr}
              fontSize="sm"
              fontWeight="600"
              mb={0}
            >
              ຈຳນວນເງິນ
            </FormLabel>
            <Button
              size="sm"
              fontFamily="Noto Sans Lao, sans-serif"
              onClick={addCurrency}
              colorScheme="teal"
              rounded="full"
              leftIcon={<AddIcon boxSize={3} />}
            >
              ເພີ່ມສະກຸນ
            </Button>
          </HStack>

          <VStack spacing={3}>
            {amounts?.map((amt, currencyIndex) => {
              // ✅ ดึงจาก Map - O(1) lookup แทน filter ทุกครั้ง
              const accountOptions = accountOptionsMap.get(amt.currency) || [];

              return (
                <AmountField
                  key={currencyIndex}
                  index={currencyIndex}
                  amount={amt}
                  accountOptions={accountOptions}
                  currencyOptions={currencyOptions}
                  onUpdate={updateCurrency}
                  onRemove={removeCurrency}
                  canRemove={amounts.length > 1}
                  cardBg={cardBg}
                  borderClr={borderClr}
                  id={id}
                />
              );
            })}
          </VStack>
        </Box>

        {/* Note */}
        <FormControl isRequired>
          <FormLabel
            fontFamily="Noto Sans Lao, sans-serif"
            color={labelClr}
            fontSize="sm"
            fontWeight="600"
          >
            ໝາຍເຫດ
          </FormLabel>
          <Textarea
            value={noteLocal}
            onChange={(e) => setNoteLocal(e.target.value)}
            onBlur={() => {
              if (noteLocal !== note) setNote(noteLocal);
            }}
            placeholder="ໝາຍເຫດ..."
            rows={3}
            rounded="lg"
          />
        </FormControl>

        {/* Status Approval */}
        <FormControl>
          <FormLabel
            fontFamily="Noto Sans Lao, sans-serif"
            color={labelClr}
            fontSize="sm"
          >
            ສະຖານະອະນຸມັດ
          </FormLabel>
          <Input value={status_Ap} isDisabled rounded="lg" />
        </FormControl>
      </VStack>
    );
  }
);

RenderFields.displayName = "RenderFields";

export default RenderFields;
