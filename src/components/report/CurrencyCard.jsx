import {
  Box,
  Heading,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Badge,
  HStack,
} from "@chakra-ui/react";

export default function CurrencyCard({ currency, data }) {
  return (
    <Box p={6} borderRadius="2xl" bg="white" boxShadow="md">
      <Heading size="md" mb={4}>
        {currency}
      </Heading>

      <Stat>
        <StatLabel>Today Net</StatLabel>
        <StatNumber color={data?.today?.net >= 0 ? "green.600" : "red.600"}>
          {data?.today?.net?.toLocaleString()}
        </StatNumber>
        <StatHelpText>
          <StatArrow
            type={data?.changePercent >= 0 ? "increase" : "decrease"}
          />
          {data?.changePercent?.toFixed(1)}%
        </StatHelpText>
      </Stat>

      <HStack mt={4}>
        <Badge colorScheme="yellow">Pending {data?.status?.pending}</Badge>
        <Badge colorScheme="red">Unpaid {data?.status?.unpaid}</Badge>
        <Badge colorScheme="green">Paid {data?.status?.paid}</Badge>
      </HStack>
    </Box>
  );
}
