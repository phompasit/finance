"use client";

import { Card, CardBody, Text, Flex } from "@chakra-ui/react";

export default function StatsCard({ currency, data }) {
  const symbolMap = {
    LAK: "₭",
    USD: "$",
    THB: "฿",
    CNY: "¥",
    EUR: "€",
  };

  const symbol = symbolMap[currency] || currency;
  const colorBalance = data.balance >= 0 ? "blue.500" : "orange.500";

  return (
    <Card
      bg="white"
      rounded="lg"
      shadow="sm"
      border="1px solid"
      borderColor="gray.200"
      fontFamily="Noto Sans Lao, sans-serif"
      transition="all 0.2s"
      _hover={{ shadow: "md" }}
    >
      <CardBody>
        <Text
          fontFamily="Noto Sans Lao, sans-serif"
          fontWeight="bold"
          fontSize="md"
          mb={2}
        >
          {currency}
        </Text>

        {/* Income */}
        <Flex justify="space-between" mb={1}>
          <Text fontFamily="Noto Sans Lao, sans-serif" color="green.500">
            ລາຍຮັບ
          </Text>
          <Text fontFamily="Noto Sans Lao, sans-serif">
            {symbol}
            {data.income.toLocaleString()}
          </Text>
        </Flex>

        {/* Expense */}
        <Flex justify="space-between" mb={1}>
          <Text fontFamily="Noto Sans Lao, sans-serif" color="red.500">
            ລາຍຈ່າຍ
          </Text>
          <Text fontFamily="Noto Sans Lao, sans-serif">
            {symbol}
            {data.expense.toLocaleString()}
          </Text>
        </Flex>

        {/* Balance */}
        <Flex justify="space-between">
          <Text
            fontFamily="Noto Sans Lao, sans-serif"
            color={colorBalance}
            fontWeight="semibold"
          >
            ຄົງເຫຼືອ
          </Text>
          <Text
            fontFamily="Noto Sans Lao, sans-serif"
            color={colorBalance}
            fontWeight="semibold"
          >
            {symbol}
            {data.balance.toLocaleString()}
          </Text>
        </Flex>
      </CardBody>
    </Card>
  );
}
