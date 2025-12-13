"use client";

import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Divider,
  Icon,
  useColorModeValue,
  Flex,
} from "@chakra-ui/react";
import { TrendingUp, TrendingDown, Wallet, CreditCard } from "lucide-react";

export default function PaymentCard({ amount, views }) {
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const labelColor = useColorModeValue("gray.600", "gray.400");
  const accountBg = useColorModeValue("gray.50", "gray.700");
  const hoverBg = useColorModeValue("gray.50", "gray.750");

  const isIncome = views?.type === "income";
  const isCash =
    amount?.account?.type === "cash" || !amount?.account?.accountNumber;

  const amountColor = isIncome ? "green.500" : "red.500";
  const iconColor = isIncome ? "green.400" : "red.400";
  const badgeColor = isIncome ? "green" : "red";
  const accountIcon = isCash ? Wallet : CreditCard;
  const accountTypeLabel = isCash ? "ເງິນສົດ" : "ບັນຊີທະນາຄານ";

  return (
    <Box
      p={5}
      bg={bgColor}
      rounded="xl"
      border="1px solid"
      borderColor={borderColor}
      shadow="sm"
      transition="all 0.2s"
      _hover={{
        shadow: "md",
        bg: hoverBg,
        transform: "translateY(-2px)",
      }}
    >
      <VStack align="stretch" spacing={4}>
        {/* Header */}
        <Flex justify="space-between" align="center">
          <HStack spacing={2}>
            <Box fontFamily="Noto Sans Lao, sans-serif" p={2} bg={accountBg} rounded="md">
              <Icon as={accountIcon} boxSize={5} color={iconColor} />
            </Box>
            <VStack spacing={0} align="start">
              <Text fontFamily="Noto Sans Lao, sans-serif" fontSize="xs" color={labelColor} fontWeight="medium">
                {accountTypeLabel}
              </Text>
              <Badge
              fontFamily="Noto Sans Lao, sans-serif"
                colorScheme={badgeColor}
                fontSize="xs"
                px={2}
                py={0.5}
                rounded="md"
              >
                {isIncome ? "ລາຍຮັບ" : "ລາຍຈ່າຍ"}
              </Badge>
            </VStack>
          </HStack>

          <Icon
            as={isIncome ? TrendingUp : TrendingDown}
            boxSize={6}
            color={amountColor}
          />
        </Flex>

        <Divider />

        {/* Account Info */}
        <VStack spacing={2} align="stretch">
          <HStack justify="space-between">
            <Text fontFamily="Noto Sans Lao, sans-serif" fontSize="sm" color={labelColor}>
              ຊຳລະຜ່ານ:
            </Text>
            <Text fontFamily="Noto Sans Lao, sans-serif" fontSize="sm" fontWeight="semibold">
              {amount?.account?.name || amount?.account?.bankName}
            </Text>
          </HStack>

          {!isCash && amount?.account?.accountNumber && (
            <HStack justify="space-between">
              <Text fontFamily="Noto Sans Lao, sans-serif" fontSize="sm" color={labelColor}>
                ເລກບັນຊີ:
              </Text>
              <Text fontFamily="Noto Sans Lao, sans-serif" fontSize="sm" >
                {amount?.account?.accountNumber}
              </Text>
            </HStack>
          )}

          <HStack justify="space-between">
            <Text fontFamily="Noto Sans Lao, sans-serif" fontSize="sm" color={labelColor}>
              ສະກຸນເງິນ:
            </Text>
            <Badge fontFamily="Noto Sans Lao, sans-serif" colorScheme="blue" fontSize="sm">
              {amount?.account?.currency || amount.currency}
            </Badge>
          </HStack>
        </VStack>

        <Divider />

        {/* Amount */}
        <HStack justify="space-between" align="baseline">
          <Text fontFamily="Noto Sans Lao, sans-serif" fontSize="sm" fontWeight="medium" color={labelColor}>
            ຈຳນວນເງິນ:
          </Text>

          <HStack spacing={2} align="baseline">
            <Text fontFamily="Noto Sans Lao, sans-serif" fontSize="2xl" fontWeight="bold" color={amountColor}>
              {amount.amount.toLocaleString("lo-LA")}
            </Text>
            <Text fontFamily="Noto Sans Lao, sans-serif" fontSize="lg" fontWeight="semibold" color={labelColor}>
              {amount?.currency}
            </Text>
          </HStack>
        </HStack>
      </VStack>
    </Box>
  );
}
