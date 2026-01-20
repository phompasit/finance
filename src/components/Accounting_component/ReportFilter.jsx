// src/components/Accounting_component/ReportFilter.jsx
import React from "react";
import {
  Box,
  Flex,
  Text,
  Input,
  Select,
  Button,
  HStack,
  SimpleGrid,
} from "@chakra-ui/react";

const presets = [
  { label: "1 month", value: "1" },
  { label: "3 months", value: "3" },
  { label: "6 months", value: "6" },
  { label: "12 months", value: "12" },
];

const ReportFilter = ({
  filter,
  setFilter,
  yearOptions,
  search,
  setSearch,
  onApply,
  FILTER_MODE,
}) => {
  return (
    <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" mb={6}>
      <Flex wrap="wrap" gap={4} align="end">
        {/* Search */}
        <Box>
          <Text fontFamily="Noto Sans Lao, sans-serif"   fontSize="sm" mb={1}>
            ຄົ້ນຫາ
          </Text>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            width="240px"
          />
        </Box>

        {/* Year */}
        <Box>
          <Text fontFamily="Noto Sans Lao, sans-serif"   fontSize="sm" mb={1}>
            ປີ
          </Text>
          <Select
            value={filter?.year}
            onChange={(e) =>
              setFilter({
                mode: FILTER_MODE.YEAR,
                year: Number(e.target.value),
                month: null,
                preset: null,
                startDate: null,
                endDate: null,
              })
            }
            width="130px"
          >
            {yearOptions?.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </Box>

        {/* Preset */}
        {/* <Box>
          <Text fontFamily="Noto Sans Lao, sans-serif"   fontSize="sm" mb={1}>
            ຊ່ວງເວລາ
          </Text>
          <Select
            value={filter?.preset || ""}
            onChange={(e) =>
              setFilter((prev) => ({
                ...prev,
                mode: FILTER_MODE.PRESET,
                preset: e.target.value,
                month: null,
                startDate: null,
                endDate: null,
              }))
            }
            width="200px"
          >
            <option value="">Custom</option>
            {presets.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        </Box> */}

        {/* Start Date */}
        <Box>
          <Text fontFamily="Noto Sans Lao, sans-serif"   fontSize="sm" mb={1}>
            ວັນເລີ່ມ
          </Text>
          <Input
            type="date"
            value={filter?.startDate || ""}
            onChange={(e) =>
              setFilter((prev) => ({
                ...prev,
                mode: FILTER_MODE.RANGE,
                startDate: e.target.value,
                preset: null,
                month: null,
              }))
            }
          />
        </Box>

        {/* End Date */}
        <Box>
          <Text fontFamily="Noto Sans Lao, sans-serif"   fontSize="sm" mb={1}>
            ວັນສິ້ນສຸດ
          </Text>
          <Input
            type="date"
            value={filter?.endDate || ""}
            onChange={(e) =>
              setFilter((prev) => ({
                ...prev,
                mode: FILTER_MODE.RANGE,
                endDate: e.target.value,
                preset: null,
                month: null,
              }))
            }
          />
        </Box>

        <Button fontFamily="Noto Sans Lao, sans-serif" colorScheme="blue" onClick={onApply}>
          ຄົ້ນຫາ
        </Button>
      </Flex>

      {/* Month Selector */}
      <Box mt={5}>
        <Text fontFamily="Noto Sans Lao, sans-serif"   mb={2}>ເລືອກເດືອນ</Text>
        <SimpleGrid columns={12} spacing={2}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <Button
            
              key={m}
              size="sm"
              variant={filter?.month === m ? "solid" : "outline"}
              colorScheme="blue"
              onClick={() =>
                setFilter((prev) => ({
                  ...prev,
                  mode: FILTER_MODE.MONTH,
                  month: m,
                  preset: null,
                  startDate: null,
                  endDate: null,
                }))
              }
            >
              {m}
            </Button>
          ))}
        </SimpleGrid>
      </Box>
    </Box>
  );
};

export default ReportFilter;
