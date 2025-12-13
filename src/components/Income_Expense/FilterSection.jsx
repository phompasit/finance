"use client";

import {
  Card,
  CardBody,
  VStack,
  Flex,
  HStack,
  Text,
  InputGroup,
  InputLeftElement,
  Input,
  Collapse,
  FormControl,
  FormLabel,
  SimpleGrid,
  Select,
  Button,
  Icon,
} from "@chakra-ui/react";

import { SearchIcon, ChevronDownIcon } from "@chakra-ui/icons";

export default function FilterSection({
  filters,
  setFilters,
  showFilters,
  setShowFilters,
  cardBg,
  borderClr,
  labelClr,
  hoverBg,
  paymentMethodLabels,
}) {
  return (
    <Card
      bg={cardBg}
      rounded="2xl"
      shadow="md"
      border="1px"
      borderColor={borderClr}
      mb={6}
    >
      <CardBody>
        <VStack spacing={4} align="stretch">
          {/* Header */}
          <Flex justify="space-between" align="center">
            <HStack>
              <Icon as={SearchIcon} color="teal.500" />
              <Text
                fontFamily="Noto Sans Lao, sans-serif"
                fontWeight="600"
                color={labelClr}
              >
                ຄົ້ນຫາ ແລະ ກັ່ນຕອງ
              </Text>
            </HStack>

            <Button
              size="sm"
              fontFamily="Noto Sans Lao, sans-serif"
              variant="ghost"
              onClick={() => setShowFilters(!showFilters)}
              rightIcon={
                <ChevronDownIcon
                  transform={showFilters ? "rotate(180deg)" : ""}
                  transition="0.2s"
                />
              }
            >
              {showFilters ? "ເຊື່ອງ" : "ສະແດງ"}ຕົວກັ່ນຕອງ
            </Button>
          </Flex>

          {/* Search Bar */}
          <InputGroup size="lg">
            <InputLeftElement>
              <Icon as={SearchIcon} color="gray.400" />
            </InputLeftElement>
            <Input
              fontFamily="Noto Sans Lao, sans-serif"
              placeholder="ຄົ້ນຫາລາຍລະອຽດ ຫຼື ໝາຍເຫດ..."
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              rounded="xl"
              bg={hoverBg}
            />
          </InputGroup>

          {/* Collapse Filter */}
          <Collapse in={showFilters}>
            <VStack spacing={4} pt={4}>
              {/* Date Filters */}
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="full">
                <FormControl>
                  <FormLabel
                    fontFamily="Noto Sans Lao, sans-serif"
                    color={labelClr}
                    fontSize="sm"
                  >
                    ວັນທີເລີ່ມຕົ້ນ
                  </FormLabel>
                  <Input
                    type="date"
                    value={filters.dateStart}
                    onChange={(e) =>
                      setFilters({ ...filters, dateStart: e.target.value })
                    }
                    rounded="lg"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel
                    fontFamily="Noto Sans Lao, sans-serif"
                    color={labelClr}
                    fontSize="sm"
                  >
                    ວັນທີ່ສິ້ນສຸດ
                  </FormLabel>
                  <Input
                    type="date"
                    fontFamily="Noto Sans Lao, sans-serif"
                    value={filters.dateEnd}
                    onChange={(e) =>
                      setFilters({ ...filters, dateEnd: e.target.value })
                    }
                    rounded="lg"
                  />
                </FormControl>
              </SimpleGrid>

              {/* Multi Filters */}
              <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} w="full">
                {/* Type */}
                <FormControl>
                  <FormLabel
                    fontFamily="Noto Sans Lao, sans-serif"
                    color={labelClr}
                    fontSize="sm"
                  >
                    ປະເພດ
                  </FormLabel>
                  <Select
                    fontFamily="Noto Sans Lao, sans-serif"
                    value={filters.type}
                    onChange={(e) =>
                      setFilters({ ...filters, type: e.target.value })
                    }
                    rounded="lg"
                  >
                    <option value="">ທັງໝົດ</option>
                    <option value="income">ລາຍຮັບ</option>
                    <option value="expense">ລາຍຈ່າຍ</option>
                  </Select>
                </FormControl>

                {/* Status_AP */}
                <FormControl>
                  <FormLabel
                    fontFamily="Noto Sans Lao, sans-serif"
                    color={labelClr}
                    fontSize="sm"
                  >
                    ເລືອກສະຖານະ
                  </FormLabel>
                  <Select
                    fontFamily="Noto Sans Lao, sans-serif"
                    value={filters.status_Ap}
                    onChange={(e) =>
                      setFilters({ ...filters, status_Ap: e.target.value })
                    }
                    rounded="lg"
                  >
                    <option value="">ທັງໝົດ</option>
                    <option value="approve">ອະນຸມັດ</option>
                    <option value="cancel">ຍົກເລີກ</option>
                    <option value="pending">ລໍຖ້າ</option>
                  </Select>
                </FormControl>

                {/* Currency */}
                <FormControl>
                  <FormLabel
                    fontFamily="Noto Sans Lao, sans-serif"
                    color={labelClr}
                    fontSize="sm"
                  >
                    ສະກຸນເງິນ
                  </FormLabel>
                  <Select
                    fontFamily="Noto Sans Lao, sans-serif"
                    value={filters.currency}
                    onChange={(e) =>
                      setFilters({ ...filters, currency: e.target.value })
                    }
                    rounded="lg"
                  >
                    <option value="">ທັງໝົດ</option>
                    <option value="LAK">LAK</option>
                    <option value="THB">THB</option>
                    <option value="USD">USD</option>
                  </Select>
                </FormControl>

                {/* Payment Method */}
                <FormControl>
                  <FormLabel
                    fontFamily="Noto Sans Lao, sans-serif"
                    color={labelClr}
                    fontSize="sm"
                  >
                    ວິທີຊຳລະ
                  </FormLabel>
                  <Select
                    fontFamily="Noto Sans Lao, sans-serif"
                    value={filters.paymentMethod}
                    onChange={(e) =>
                      setFilters({ ...filters, paymentMethod: e.target.value })
                    }
                    rounded="lg"
                  >
                    <option value="">ທັງໝົດ</option>
                    {Object.entries(paymentMethodLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                {/* Status */}
                <FormControl>
                  <FormLabel
                    fontFamily="Noto Sans Lao, sans-serif"
                    color={labelClr}
                    fontSize="sm"
                  >
                    ສະຖານະ
                  </FormLabel>
                  <Select
                    fontFamily="Noto Sans Lao, sans-serif"
                    value={filters.status}
                    onChange={(e) =>
                      setFilters({ ...filters, status: e.target.value })
                    }
                    rounded="lg"
                  >
                    <option value="">ທັງໝົດ</option>
                    <option value="paid">ຊຳລະແລ້ວ</option>
                    <option value="unpaid">ຍັງບໍ່ຊຳລະ</option>
                  </Select>
                </FormControl>
              </SimpleGrid>

              {/* Clear Button */}
              <HStack justify="flex-end" w="full">
                <Button
                  fontFamily="Noto Sans Lao, sans-serif"
                  variant="ghost"
                  onClick={() =>
                    setFilters({
                      search: "",
                      dateStart: "",
                      dateEnd: "",
                      type: "",
                      currency: "",
                      paymentMethod: "",
                      status: "",
                      status_Ap: "",
                    })
                  }
                >
                  ລ້າງຕົວກັ່ນ
                </Button>
              </HStack>
            </VStack>
          </Collapse>
        </VStack>
      </CardBody>
    </Card>
  );
}
