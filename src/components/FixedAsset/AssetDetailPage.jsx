import React, { useState } from "react";
import {
  ChakraProvider,
  Box,
  Container,
  Heading,
  Text,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Input,
  Select,
  HStack,
  VStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Card,
  CardBody,
  CardHeader,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Progress,
  Alert,
  AlertIcon,
  AlertDescription,
  Divider,
  IconButton,
  Checkbox,
  useDisclosure,
  Flex,
  Spacer,
  SimpleGrid,
  Tag,
  Tfoot,
} from "@chakra-ui/react";
import {
  Search,
  Plus,
  Eye,
  Edit,
  DollarSign,
  TrendingDown,
  FileText,
  Archive,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DisposalSection from "./DisposalSection";

const AssetDetailPage = ({
  setView,
  selectedAsset,
  journalEntries,
  getStatusColor,
  formatCurrency,
  schedule,
  monthlyAmount,
  totalAmount,
  handleDeleteDepreciationAndJournal,
}) => {
  const navigate = useNavigate();

  return (
    <Container maxW="container.xl" py={8}>
      <VStack align="stretch" spacing={6}>
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          alignSelf="flex-start"
          onClick={() => navigate(-1)}
          fontFamily="Noto Sans Lao, sans-serif"
        >
          ← ກັບຄືນ
        </Button>

        {/* Header */}
        <Box>
          <HStack justify="space-between" mb={2}>
            <VStack align="start" spacing={1}>
              <Heading fontFamily="Noto Sans Lao, sans-serif" size="lg">
                {selectedAsset?.name}
              </Heading>
              <Text color="gray.600">{selectedAsset?.code}</Text>
            </VStack>
            <Badge
              colorScheme={getStatusColor(selectedAsset?.status)}
              fontSize="md"
              p={2}
              fontFamily="Noto Sans Lao, sans-serif"
            >
              {selectedAsset?.status === "active" ? "ໃຊ້ງານ" : "ປິດໃຊ້ງານ"}
            </Badge>
          </HStack>
        </Box>

        {/* Tabs */}
        <Tabs colorScheme="blue">
          <TabList>
            <Tab fontFamily="Noto Sans Lao, sans-serif">ພາບລວມ</Tab>
            <Tab fontFamily="Noto Sans Lao, sans-serif">
              ລາຍການຫັກຄ່າຫລຸ້ຍຫ້ຽນ
            </Tab>
            <Tab fontFamily="Noto Sans Lao, sans-serif">ການລົງບັນຊີ</Tab>
            <Tab fontFamily="Noto Sans Lao, sans-serif">
              ຂາຍ/ຫັກຄ່າຫຼຸ້ຍຫ້ຽນ
            </Tab>
          </TabList>

          <TabPanels>
            {/* Overview Tab */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                  <Card>
                    <CardBody>
                      <Stat>
                        <StatLabel fontFamily="Noto Sans Lao, sans-serif">
                          ລາຄາຊື້
                        </StatLabel>
                        <StatNumber fontSize="2xl">
                          {formatCurrency(selectedAsset?.cost)}
                        </StatNumber>
                        <StatHelpText fontFamily="Noto Sans Lao, sans-serif">
                          ວັນທີ່ຊື້: {selectedAsset?.purchaseDate}
                        </StatHelpText>
                      </Stat>
                    </CardBody>
                  </Card>
                  <Card>
                    <CardBody>
                      <Stat>
                        <StatLabel fontFamily="Noto Sans Lao, sans-serif">
                          ຄ່າຫຼຸ້ຍຫ້ຽນສະສົມ
                        </StatLabel>
                        <StatNumber fontSize="2xl" color="orange.500">
                          {formatCurrency(totalAmount)}
                        </StatNumber>
                        <StatHelpText>
                          {((totalAmount / selectedAsset?.cost) * 100).toFixed(
                            1
                          )}
                          % depreciated
                        </StatHelpText>
                      </Stat>
                    </CardBody>
                  </Card>
                  <Card>
                    <CardBody>
                      <Stat>
                        <StatLabel fontFamily="Noto Sans Lao, sans-serif">
                          ມູນຄ່າຕາມບັນຊີ
                        </StatLabel>
                        <StatNumber fontSize="2xl" color="green.500">
                          {formatCurrency(selectedAsset?.cost - totalAmount)}
                        </StatNumber>
                        <StatHelpText fontFamily="Noto Sans Lao, sans-serif">
                          ມູນຄ່າປະຈຸບັນ
                        </StatHelpText>
                      </Stat>
                    </CardBody>
                  </Card>
                </SimpleGrid>

                <Card>
                  <CardHeader>
                    <Heading fontFamily="Noto Sans Lao, sans-serif" size="sm">
                      ຄວາມຄືບໜ້າ
                    </Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack align="stretch" spacing={4}>
                      <Progress
                        value={(totalAmount / selectedAsset?.cost) * 100}
                        colorScheme="orange"
                        size="lg"
                        borderRadius="md"
                      />
                      <SimpleGrid columns={2} spacing={4} fontSize="sm">
                        <Box>
                          <Text
                            fontFamily="Noto Sans Lao, sans-serif"
                            color="gray.600"
                          >
                            ວິທີ່ຄິດໄລ່
                          </Text>
                          <Text
                            fontFamily="Noto Sans Lao, sans-serif"
                            fontWeight="medium"
                          >
                            {selectedAsset?.depreciationMethod ==
                            "straight_line"
                              ? "ຄິດໄລ່ແບບເສັ້ນຊື່"
                              : ""}
                          </Text>
                        </Box>
                        <Box>
                          <Text
                            fontFamily="Noto Sans Lao, sans-serif"
                            color="gray.600"
                          >
                            ອາຍຸຂອງການໃຊ້ງານ
                          </Text>
                          <Text
                            fontFamily="Noto Sans Lao, sans-serif"
                            fontWeight="medium"
                          >
                            {selectedAsset?.usefulLife} ປີ
                          </Text>
                        </Box>
                        <Box>
                          <Text
                            fontFamily="Noto Sans Lao, sans-serif"
                            color="gray.600"
                          >
                            ວັນທີ່ເລີ່ມໃຊ້ງານຊັບສິນ
                          </Text>
                          <Text fontWeight="medium">
                            {selectedAsset?.startUseDate}
                          </Text>
                        </Box>
                        <Box>
                          <Text
                            fontFamily="Noto Sans Lao, sans-serif"
                            color="gray.600"
                          >
                            ມູນຄ່າຄາດວ່າຈະຂາຍ
                          </Text>
                          <Text fontWeight="medium">
                            {formatCurrency(selectedAsset?.salvageValue)}
                          </Text>
                        </Box>
                      </SimpleGrid>
                    </VStack>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <Heading fontFamily="Noto Sans Lao, sans-serif" size="sm">
                      ຂໍ້ມູນຊັບສິນ
                    </Heading>
                  </CardHeader>
                  <CardBody>
                    <SimpleGrid columns={2} spacing={4} fontSize="sm">
                      <Box>
                        <Text
                          fontFamily="Noto Sans Lao, sans-serif"
                          color="gray.600"
                        >
                          ໝວດໝູ່
                        </Text>
                        <Tag
                          fontFamily="Noto Sans Lao, sans-serif"
                          colorScheme="purple"
                          mt={1}
                        >
                          {selectedAsset?.category}
                        </Tag>
                      </Box>
                      <Box>
                        <Text
                          fontFamily="Noto Sans Lao, sans-serif"
                          color="gray.600"
                        >
                          ລະຫັດຊັບສິນ
                        </Text>
                        <Tag colorScheme="purple" mt={1}>
                          {selectedAsset?.assetCode}
                        </Tag>
                      </Box>

                      <Box>
                        <Text
                          fontFamily="Noto Sans Lao, sans-serif"
                          color="gray.600"
                        >
                          ມູນຄ່າຫັກຄ່າຫຼຸ້ຍຫ້ຽນຕໍ່ເດືອນ
                        </Text>
                        <Text fontWeight="medium" mt={1}>
                          {formatCurrency(
                            selectedAsset?.cost /
                              (selectedAsset?.usefulLife * 12)
                          )}
                        </Text>
                      </Box>

                      <Box>
                        <Text
                          fontFamily="Noto Sans Lao, sans-serif"
                          color="gray.600"
                        >
                          ວັນທີ່ສ້າງລາຍການ:
                        </Text>
                        <Text fontWeight="medium" mt={1}>
                          {selectedAsset?.createdAt}
                        </Text>
                      </Box>
                      <Box>
                        <Text
                          fontFamily="Noto Sans Lao, sans-serif"
                          color="gray.600"
                        >
                          ວັນທີ່ແກ້ໄຂລາຍການລ່າສຸດ:
                        </Text>
                        <Text fontWeight="medium" mt={1}>
                          {selectedAsset?.updatedAt}
                        </Text>
                      </Box>
                    </SimpleGrid>
                  </CardBody>
                </Card>
              </VStack>
            </TabPanel>

            {/* Depreciation Ledger Tab */}
            <TabPanel>
              <Card>
                <CardBody>
                  <Table variant="simple" size="sm">
                    <Thead>
                      <Tr>
                        <Th fontFamily="Noto Sans Lao, sans-serif">ເດືອນ-ປິ</Th>
                        <Th fontFamily="Noto Sans Lao, sans-serif" isNumeric>
                          ຈຳນວນວັນ
                        </Th>
                        <Th fontFamily="Noto Sans Lao, sans-serif" isNumeric>
                          ຄ່າຫຼຸ້ຍຫ້ຽນ
                        </Th>
                        <Th fontFamily="Noto Sans Lao, sans-serif">
                          ລະຫັດອ້າງອິງບັນຊີ
                        </Th>
                        <Th fontFamily="Noto Sans Lao, sans-serif">ສະຖານະ</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {schedule?.map((item, idx) => {
                        return (
                          <Tr key={idx}>
                            <Td>
                              {item.year} {item.month}
                            </Td>
                            <Td isNumeric>{item.usedDays}</Td>
                            <Td isNumeric>{formatCurrency(item.amount)}</Td>

                            <Td>
                              <Button
                                size="xs"
                                variant="link"
                                colorScheme="blue"
                              >
                                JE-{item.year}-
                                {String(idx + 1).padStart(3, "0")}
                              </Button>
                            </Td>
                            <Td>
                              <Badge
                                fontFamily="Noto Sans Lao, sans-serif"
                                colorScheme={
                                  item.status === "posted" ? "green" : "red"
                                }
                              >
                                {" "}
                                {item.status === "posted"
                                  ? "ບັນທຶກແລ້ວ"
                                  : "ຍັງບໍ່ບັນທຶກ"}
                              </Badge>
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                </CardBody>
              </Card>
            </TabPanel>

            {/* Journal Entries Tab */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                {journalEntries?.map((entry, index) => (
                  <Card key={index}>
                    <CardBody>
                      {/* ===== Header ===== */}
                      <HStack justify="space-between" mb={2}>
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="bold" color="blue.600">
                            {entry.reference}
                          </Text>
                          <Text fontSize="sm" color="gray.600">
                            {new Date(entry.date).toLocaleDateString()}
                          </Text>
                        </VStack>

                        <Badge
                          colorScheme={
                            entry.status === "posted" ? "green" : "orange"
                          }
                        >
                          {entry.status}
                        </Badge>
                        <Button
                          onClick={() =>
                            handleDeleteDepreciationAndJournal({
                              journalId: entry?._id,
                              DepreciationId: entry?.sourceId,
                            })
                          }
                          fontFamily="Noto Sans Lao, sans-serif"
                          colorScheme="red"
                        >
                          ລົບ
                        </Button>
                      </HStack>

                      <Text
                        fontFamily="Noto Sans Lao, sans-serif"
                        fontSize="sm"
                        mb={3}
                      >
                        {entry.description}
                      </Text>

                      {/* ===== Journal Table ===== */}
                      <Table size="sm" variant="simple">
                        <Thead bg="gray.100">
                          <Tr>
                            <Th fontFamily="Noto Sans Lao, sans-serif" w="70px">
                              Side
                            </Th>
                            <Th fontFamily="Noto Sans Lao, sans-serif">
                              Account
                            </Th>
                            <Th
                              fontFamily="Noto Sans Lao, sans-serif"
                              isNumeric
                            >
                              Debit (LAK)
                            </Th>
                            <Th
                              fontFamily="Noto Sans Lao, sans-serif"
                              isNumeric
                            >
                              Credit (LAK)
                            </Th>
                          </Tr>
                        </Thead>

                        <Tbody>
                          {entry.lines.map((line) => {
                            const isDebit = line.side === "dr";

                            return (
                              <Tr key={line._id}>
                                <Td>
                                  <Badge
                                    colorScheme={isDebit ? "green" : "red"}
                                  >
                                    {isDebit ? "DR" : "CR"}
                                  </Badge>
                                </Td>

                                <Td>
                                  <Text fontWeight="medium">
                                    {line.accountId.code}
                                  </Text>
                                  <Text
                                    fontFamily="Noto Sans Lao, sans-serif"
                                    fontSize="xs"
                                    color="gray.600"
                                  >
                                    {line.accountId.name}
                                  </Text>
                                </Td>

                                <Td isNumeric>
                                  {isDebit
                                    ? formatCurrency(line.debitLAK)
                                    : "-"}
                                </Td>

                                <Td isNumeric>
                                  {!isDebit
                                    ? formatCurrency(line.creditLAK)
                                    : "-"}
                                </Td>
                              </Tr>
                            );
                          })}
                        </Tbody>

                        {/* ===== Footer Total ===== */}
                        <Tfoot bg="gray.50">
                          <Tr>
                            <Th
                              fontFamily="Noto Sans Lao, sans-serif"
                              colSpan={2}
                              textAlign="right"
                            >
                              Total
                            </Th>
                            <Th isNumeric>
                              {formatCurrency(entry.totalDebitLAK)}
                            </Th>
                            <Th isNumeric>
                              {formatCurrency(entry.totalCreditLAK)}
                            </Th>
                          </Tr>
                        </Tfoot>
                      </Table>
                    </CardBody>
                  </Card>
                ))}
              </VStack>
            </TabPanel>

            {/* Disposal Tab */}
            <TabPanel>
              <VStack spacing={6} align="stretch">


                <Card>
                  <CardBody>
                    <DisposalSection
                      selectedAsset={selectedAsset}
                      formatCurrency={formatCurrency}
                    />
                  </CardBody>
                </Card>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Container>
  );
};

export default AssetDetailPage;
