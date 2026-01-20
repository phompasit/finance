import { HStack, Button, Text } from "@chakra-ui/react";

const LedgerPagination = ({ page, totalPages, onChange, disabled }) => {
  if (totalPages <= 1 || disabled) return null;

  return (
    <HStack justify="center" mt={6}>
      <Button onClick={() => onChange(page - 1)} isDisabled={page <= 1}>
        Prev
      </Button>
      <Text>
        Page {page} / {totalPages}
      </Text>
      <Button
        onClick={() => onChange(page + 1)}
        isDisabled={page >= totalPages}
      >
        Next
      </Button>
    </HStack>
  );
};

export default LedgerPagination;
