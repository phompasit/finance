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
import { useLocation } from "react-router-dom";

const DepreciationPreviewModal = () => {
  const { state } = useLocation();

  const depreciationSchedule = state?.depreciationSchedule || [];
  const formatCurrency = (amount) => {
    return (
      new Intl.NumberFormat("en-US", {
        style: "decimal",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount) + " ₭"
    );
  };

  return (
    <div>
      <VStack spacing={6} align="stretch">
        {/* Asset Summary */}
        <Card bg="blue.50">
          <CardBody>
            <VStack align="stretch" spacing={2}>
              <Heading size="sm">ຄອມພິວເຕີ Dell Latitude</Heading>
              <HStack justify="space-between" fontSize="sm">
                <Text>Cost: {formatCurrency(15000000)}</Text>
                <Text>Useful Life: 4 years</Text>
              </HStack>
              <HStack justify="space-between" fontSize="sm">
                <Text>Salvage: {formatCurrency(1500000)}</Text>
                <Text>Monthly: {formatCurrency(281250)}</Text>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Schedule Table */}
        <Box overflowX="auto" maxH="400px" overflowY="auto">
          <Table size="sm" variant="simple">
            <Thead position="sticky" top={0} bg="white">
              <Tr>
                <Th>Year</Th>
                <Th>Month</Th>
                <Th isNumeric>Depreciation</Th>
                <Th isNumeric>Accumulated</Th>
                <Th isNumeric>Net Book Value</Th>
              </Tr>
            </Thead>
            <Tbody>
              {depreciationSchedule?.map((item, idx) => (
                <Tr key={idx} bg={idx === 0 ? "yellow.50" : "white"}>
                  <Td>{item.year}</Td>
                  <Td fontWeight={idx === 0 ? "bold" : "normal"}>
                    {item.month}
                  </Td>
                  <Td isNumeric>{formatCurrency(item.amount)}</Td>
                  <Td isNumeric color="orange.600">
                    {formatCurrency(item.accumulated)}
                  </Td>
                  <Td isNumeric fontWeight="bold" color="green.600">
                    {formatCurrency(item.netBook)}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>

        <Alert status="warning" fontSize="sm">
          <AlertIcon />
          <AlertDescription>
            Posting depreciation will create journal entries for the current
            period and cannot be undone.
          </AlertDescription>
        </Alert>
      </VStack>

      <Button variant="ghost" mr={3}>
        Cancel
      </Button>
      <Button colorScheme="orange" leftIcon={<FileText size={16} />}>
        Post Depreciation
      </Button>
    </div>
  );
};

export default DepreciationPreviewModal;
