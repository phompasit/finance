import { Box, Skeleton, SkeletonText, VStack } from "@chakra-ui/react";

const LedgerLoading = () => (
  <Box p={6}>
    <VStack spacing={4} align="stretch">
      {/* Header */}
      <Skeleton height="20px" width="200px" />

      {/* Filter bar */}
      <Skeleton height="36px" borderRadius="md" />

      {/* Table header */}
      <Skeleton height="40px" borderRadius="md" />

      {/* Table rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton
          key={i}
          height="32px"
          borderRadius="md"
          startColor="gray.100"
          endColor="gray.200"
        />
      ))}
    </VStack>
  </Box>
);

export default LedgerLoading;
