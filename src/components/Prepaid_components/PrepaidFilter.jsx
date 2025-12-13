import { Box, SimpleGrid, Input, Button } from "@chakra-ui/react";

export default function PrepaidFilter({ filters, onChange }) {
  return (
    <Box bg="white" p={4} rounded="md" mb={4}>
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={3}>
        <Input
          placeholder="ຄົ້ນຫາ"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
        <Input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
        />
        <Input
          type="date"
          value={filters.dateTo}
          onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
        />
        <Button
          onClick={() =>
            onChange({
              search: "",
              status: "",
              dateFrom: "",
              dateTo: "",
            })
          }
        >
          ລ້າງ
        </Button>
      </SimpleGrid>
    </Box>
  );
}
