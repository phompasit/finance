"use client";
import {
  Box,
  Grid,
  GridItem,
  Input,
  Select,
  Button,
  HStack,
  VStack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { useState } from "react";

/* ======================================================
  CONSTANTS
====================================================== */
const TYPE_OPTIONS = [
  { value: "income", label: "ລາຍຮັບ" },
  { value: "expense", label: "ລາຍຈ່າຍ" },
  { value: "debt_receivable", label: "ໜີ້ຕ້ອງຮັບ" },
  { value: "debt_payable", label: "ໜີ້ຕ້ອງສົ່ງ" },
  { value: "opo", label: "OPO (Approve)" },
];

const CURRENCY_OPTIONS = ["LAK", "THB", "USD", "CNY"];
const PAYMENT_OPTIONS = [
  { value: "cash", label: "ເງິນສົດ" },
  { value: "transfer", label: "ໂອນ" },
];
const STATUS_OPTIONS = [
  { value: "pending", label: "ລໍຖ້າ" },
  { value: "unpaid", label: "ຍັງບໍ່ຈ່າຍ" },
  { value: "paid", label: "ຈ່າຍແລ້ວ" },
];

/* ======================================================
  COMPONENT
====================================================== */
export default function FilterBar({ onApply }) {
  const bg = useColorModeValue("white", "gray.800");

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    type: [],
    currency: [],
    paymentMethod: "",
    status: "",
  });

  /* ================= HANDLERS ================= */
  const update = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleArray = (key, value) => {
    setFilters((prev) => {
      const exists = prev[key].includes(value);
      return {
        ...prev,
        [key]: exists
          ? prev[key].filter((v) => v !== value)
          : [...prev[key], value],
      };
    });
  };

  const apply = () => {
    // 🔑 ส่งเฉพาะ field ที่มีค่า
    const cleaned = Object.fromEntries(
      Object.entries(filters)
        .filter(([, v]) =>
          Array.isArray(v) ? v.length > 0 : Boolean(v)
        )
        .map(([k, v]) => [
          k,
          Array.isArray(v) ? v.join(",") : v,
        ])
    );

    onApply(cleaned);
  };

  const reset = () => {
    setFilters({
      startDate: "",
      endDate: "",
      type: [],
      currency: [],
      paymentMethod: "",
      status: "",
    });
    onApply({});
  };

  /* ================= RENDER ================= */
  return (
    <Box bg={bg} p={5} borderRadius="xl" boxShadow="md">
      <Grid
        templateColumns={{
          base: "1fr",
          md: "repeat(3, 1fr)",
          xl: "repeat(6, 1fr)",
        }}
        gap={4}
      >
        {/* Start Date */}
        <GridItem>
          <VStack align="stretch" spacing={1}>
            <Text fontSize="sm">ເລີ່ມວັນທີ</Text>
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => update("startDate", e.target.value)}
            />
          </VStack>
        </GridItem>

        {/* End Date */}
        <GridItem>
          <VStack align="stretch" spacing={1}>
            <Text fontSize="sm">ສິ້ນສຸດວັນທີ</Text>
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => update("endDate", e.target.value)}
            />
          </VStack>
        </GridItem>

        {/* Type */}
        <GridItem>
          <VStack align="stretch" spacing={1}>
            <Text fontSize="sm">ປະເພດ</Text>
            <Box>
              {TYPE_OPTIONS.map((t) => (
                <Button
                  key={t.value}
                  size="xs"
                  mr={1}
                  mb={1}
                  variant={
                    filters.type.includes(t.value)
                      ? "solid"
                      : "outline"
                  }
                  onClick={() => toggleArray("type", t.value)}
                >
                  {t.label}
                </Button>
              ))}
            </Box>
          </VStack>
        </GridItem>

        {/* Currency */}
        <GridItem>
          <VStack align="stretch" spacing={1}>
            <Text fontSize="sm">ສະກຸນເງິນ</Text>
            <Box>
              {CURRENCY_OPTIONS.map((c) => (
                <Button
                  key={c}
                  size="xs"
                  mr={1}
                  mb={1}
                  variant={
                    filters.currency.includes(c)
                      ? "solid"
                      : "outline"
                  }
                  onClick={() => toggleArray("currency", c)}
                >
                  {c}
                </Button>
              ))}
            </Box>
          </VStack>
        </GridItem>

        {/* Payment */}
        <GridItem>
          <VStack align="stretch" spacing={1}>
            <Text fontSize="sm">ວິທີຈ່າຍ</Text>
            <Select
              value={filters.paymentMethod}
              onChange={(e) =>
                update("paymentMethod", e.target.value)
              }
            >
              <option value="">ທັງໝົດ</option>
              {PAYMENT_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </VStack>
        </GridItem>

        {/* Status */}
        <GridItem>
          <VStack align="stretch" spacing={1}>
            <Text fontSize="sm">ສະຖານະ</Text>
            <Select
              value={filters.status}
              onChange={(e) => update("status", e.target.value)}
            >
              <option value="">ທັງໝົດ</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </VStack>
        </GridItem>

        {/* Actions */}
        <GridItem alignSelf="flex-end">
          <HStack>
            <Button colorScheme="blue" onClick={apply}>
              Apply
            </Button>
            <Button variant="outline" onClick={reset}>
              Reset
            </Button>
          </HStack>
        </GridItem>
      </Grid>
    </Box>
  );
}
