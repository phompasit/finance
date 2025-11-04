import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Select,
  Text,
  useDisclosure,
  Card,
  CardBody,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  SimpleGrid,
  Stack,
  ModalCloseButton,
  VStack,
  HStack,
  FormErrorMessage,
  Textarea,
  Badge,
  useToast,
  InputGroup,
  InputLeftElement,
  Icon,
} from "@chakra-ui/react";
import { SearchIcon, AddIcon, DeleteIcon, EditIcon } from "@chakra-ui/icons";
import { FaFileCsv, FaFilePdf } from "react-icons/fa";
import { DownloadIcon, FilterXIcon, ViewIcon } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import { useAuth } from "../context/AuthContext";

// Reusable component for the Details Modal
const DebtDetailsModal = ({ isOpen, onClose, documentData }) => {
  // Format date from timestamp
  function formatDate(dateString) {
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  // Format currency amount
  const formatAmount = (amount, currency) => {
    try {
      const formatter = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
      });
      return formatter.format(amount);
    } catch {
      return `${amount} ${currency}`;
    }
  };

  if (!documentData) return null;
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={{ base: "full", md: "xl" }}
      isCentered
    >
      <ModalOverlay bg="blackAlpha.600" />
      <ModalContent
        borderRadius="lg"
        bg="white"
        boxShadow="2xl"
        maxH={{ base: "100vh", md: "90vh" }}
        overflowY="auto"
      >
        <ModalHeader
          fontFamily="Noto Sans Lao, sans-serif"
          fontSize={{ base: "lg", md: "xl" }}
          fontWeight="bold"
          color="gray.800"
          py={4}
          px={6}
          bg="gray.50"
          borderBottom="1px solid"
          borderColor="gray.200"
        >
          ລາຍລະອຽດເອກະສານ (ເລກທີ່: {documentData.serial})
        </ModalHeader>
        <ModalCloseButton
          color="gray.600"
          _hover={{ color: "gray.800", bg: "gray.100" }}
          aria-label="ປິດປ່ອງຢ້ຽມ"
        />
        <ModalBody p={{ base: 4, md: 6 }}>
          <Stack spacing={6}>
            {/* General Information */}
            <Card
              bg="white"
              border="1px solid"
              borderColor="gray.200"
              borderRadius="md"
              boxShadow="sm"
              _hover={{ boxShadow: "md" }}
              transition="all 0.2s"
            >
              <CardBody>
                <Text
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontSize="lg"
                  fontWeight="semibold"
                  color="gray.700"
                  mb={3}
                >
                  ຂໍ້ມູນທົ່ວໄປ
                </Text>
                <Stack spacing={3}>
                  <Flex justify="space-between" align="center">
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      color="gray.600"
                      fontSize="sm"
                    >
                      ເລກທີ່:
                    </Text>
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      fontWeight="medium"
                    >
                      {documentData.serial}
                    </Text>
                  </Flex>
                  <Text
                    fontFamily="Noto Sans Lao, sans-serif"
                    color="gray.600"
                    fontSize="sm"
                  >
                    ລາຍລະອຽດ:
                  </Text>
                  <Flex justify="space-between" align="center">
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      fontWeight="medium"
                    >
                      {documentData.description}
                    </Text>
                  </Flex>
                  <Flex justify="space-between" align="center">
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      color="gray.600"
                      fontSize="sm"
                    >
                      ປະເພດໜີ້:
                    </Text>
                    <Badge
                      fontFamily="Noto Sans Lao, sans-serif"
                      colorScheme={
                        documentData.debtType === "payable" ? "red" : "green"
                      }
                      px={2}
                      py={1}
                      borderRadius="full"
                    >
                      {documentData.debtType === "payable"
                        ? "ໜີ້ຕ້ອງສົ່ງ"
                        : "ໜີ້ຕ້ອງຮັບ"}
                    </Badge>
                  </Flex>
                  <Flex justify="space-between" align="center">
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      color="gray.600"
                      fontSize="sm"
                    >
                      ປະເພດລູກໜີ້/ຜູ້ສະໜອງ:
                    </Text>
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      fontWeight="medium"
                    >
                      {documentData?.partnerId?.name}
                    </Text>
                  </Flex>
                  <Flex justify="space-between" align="center">
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      color="gray.600"
                      fontSize="sm"
                    >
                      ວິທີການຊຳລະ:
                    </Text>
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      fontWeight="medium"
                    >
                      {documentData.paymentMethod}
                    </Text>
                  </Flex>
                  <Flex justify="space-between" align="center">
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      color="gray.600"
                      fontSize="sm"
                    >
                      ວັນທີ່:
                    </Text>
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      fontWeight="medium"
                    >
                      {formatDate(documentData.date)}
                    </Text>
                  </Flex>
                  <Flex justify="space-between" align="center">
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      color="gray.600"
                      fontSize="sm"
                    >
                      ສະຖານະ:
                    </Text>
                    <Badge
                      fontFamily="Noto Sans Lao, sans-serif"
                      colorScheme={
                        documentData.status === "ຊຳລະບາງສ່ວນ"
                          ? "yellow"
                          : "green"
                      }
                      px={2}
                      py={1}
                      borderRadius="full"
                    >
                      {documentData.status}
                    </Badge>
                  </Flex>
                  <Flex justify="space-between" align="center">
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      color="gray.600"
                      fontSize="sm"
                    >
                      ສ້າງເມື່ອ:
                    </Text>
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      fontWeight="medium"
                    >
                      {formatDate(documentData.createdAt)}
                    </Text>
                  </Flex>
                  <Flex justify="space-between" align="center">
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      color="gray.600"
                      fontSize="sm"
                    >
                      ອັບເດດເມື່ອ:
                    </Text>
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      fontWeight="medium"
                    >
                      {formatDate(documentData.updatedAt)}
                    </Text>
                  </Flex>
                </Stack>
              </CardBody>
            </Card>

            {/* Amounts Section */}
            <Card
              bg="white"
              border="1px solid"
              borderColor="gray.200"
              borderRadius="md"
              boxShadow="sm"
              _hover={{ boxShadow: "md" }}
              transition="all 0.2s"
            >
              <CardBody>
                <Text
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontSize="lg"
                  fontWeight="semibold"
                  color="gray.700"
                  mb={3}
                >
                  ຈຳນວນເງິນ
                </Text>
                <Table variant="simple" size="sm">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th
                        fontFamily="Noto Sans Lao, sans-serif"
                        color="gray.600"
                        fontSize="xs"
                        textTransform="none"
                      >
                        ສະກຸນເງິນ
                      </Th>
                      <Th
                        fontFamily="Noto Sans Lao, sans-serif"
                        color="gray.600"
                        fontSize="xs"
                        textTransform="none"
                        isNumeric
                      >
                        ຈຳນວນ
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {documentData.amounts?.map((amt) => (
                      <Tr
                        key={amt._id}
                        _hover={{ bg: "gray.50" }}
                        transition="background 0.2s"
                      >
                        <Td
                          fontFamily="Noto Sans Lao, sans-serif"
                          fontSize="sm"
                        >
                          {amt.currency}
                        </Td>
                        <Td
                          fontFamily="Noto Sans Lao, sans-serif"
                          fontSize="sm"
                          isNumeric
                          fontWeight="medium"
                        >
                          {formatAmount(amt.amount, amt.currency)}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </CardBody>
            </Card>

            {/* Installments Section */}
            <Card
              bg="white"
              border="1px solid"
              borderColor="gray.200"
              borderRadius="md"
              boxShadow="sm"
              _hover={{ boxShadow: "md" }}
              transition="all 0.2s"
            >
              <CardBody>
                <Text
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontSize="lg"
                  fontWeight="semibold"
                  color="gray.700"
                  mb={3}
                >
                  ງວດການຊຳລະ (ແຍກຕາມສະກຸນເງິນ)
                </Text>

                {(() => {
                  // 🧮 จัดกลุ่ม installments ตามสกุลเงิน
                  const groupedByCurrency = documentData.installments?.reduce(
                    (acc, inst) => {
                      if (!acc[inst.currency]) acc[inst.currency] = [];
                      acc[inst.currency].push(inst);
                      return acc;
                    },
                    {}
                  );

                  return Object.entries(groupedByCurrency || {}).map(
                    ([currency, installments]) => {
                      // คำนวณยอดรวมทั้งหมดของสกุลนี้
                      const totalAmount = installments.reduce(
                        (sum, i) => sum + Number(i.amount || 0),
                        0
                      );
                      // คำนวณยอดที่ชำระแล้ว
                      const totalPaid = installments
                        .filter((i) => i.isPaid)
                        .reduce((sum, i) => sum + Number(i.amount || 0), 0);

                      // คำนวณยอดคงเหลือ
                      const remaining = Math.max(0, totalAmount - totalPaid);
                      return (
                        <Box key={currency} mb={6}>
                          {/* 🔹 หัวข้อของแต่ละสกุลเงิน */}
                          <Text
                            fontFamily="Noto Sans Lao, sans-serif"
                            fontWeight="bold"
                            fontSize="md"
                            color="blue.600"
                            mb={2}
                          >
                            💱 ສະກຸນເງິນ: {currency}
                          </Text>

                          {/* 🔹 ตารางของแต่ละสกุลเงิน */}
                          <Table variant="simple" size="sm">
                            <Thead bg="gray.50">
                              <Tr>
                                <Th
                                  fontFamily="Noto Sans Lao, sans-serif"
                                  color="gray.600"
                                  fontSize="xs"
                                  textTransform="none"
                                >
                                  ວັນຄົບກຳນົດ
                                </Th>
                                <Th
                                  fontFamily="Noto Sans Lao, sans-serif"
                                  color="gray.600"
                                  fontSize="xs"
                                  textTransform="none"
                                >
                                  ວັນທີ່ຊຳລະ
                                </Th>
                                <Th
                                  fontFamily="Noto Sans Lao, sans-serif"
                                  color="gray.600"
                                  fontSize="xs"
                                  textTransform="none"
                                  isNumeric
                                >
                                  ຈຳນວນ
                                </Th>
                                <Th
                                  fontFamily="Noto Sans Lao, sans-serif"
                                  color="gray.600"
                                  fontSize="xs"
                                  textTransform="none"
                                >
                                  ສະຖານະ
                                </Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {installments?.map((inst, index) => (
                                <Tr
                                  key={inst._id || index}
                                  _hover={{ bg: "gray.50" }}
                                  transition="background 0.2s"
                                >
                                  <Td
                                    fontFamily="Noto Sans Lao, sans-serif"
                                    fontSize="sm"
                                  >
                                    {formatDate(inst.dueDate)}
                                  </Td>

                                  <Td
                                    fontFamily="Noto Sans Lao, sans-serif"
                                    fontSize="sm"
                                  >
                                    {inst.paidDate
                                      ? formatDate(inst.paidDate)
                                      : "ຍັງບໍ່ຊຳລະ"}
                                  </Td>

                                  <Td
                                    isNumeric
                                    fontFamily="Noto Sans Lao, sans-serif"
                                    fontSize="sm"
                                    fontWeight="medium"
                                  >
                                    {formatAmount(inst.amount, inst.currency)}
                                  </Td>

                                  <Td
                                    fontFamily="Noto Sans Lao, sans-serif"
                                    fontSize="sm"
                                  >
                                    <Badge
                                      fontFamily="Noto Sans Lao, sans-serif"
                                      colorScheme={
                                        inst.isPaid ? "green" : "red"
                                      }
                                      px={2}
                                      py={1}
                                      borderRadius="full"
                                    >
                                      {inst.isPaid ? "ຊຳລະແລ້ວ" : "ຍັງບໍ່ຊຳລະ"}
                                    </Badge>
                                  </Td>
                                </Tr>
                              ))}

                              {/* 🔹 แสดงยอดรวมและยอดคงเหลือ */}
                              <Tr bg="gray.50">
                                <Td
                                  colSpan={4}
                                  fontFamily="Noto Sans Lao, sans-serif"
                                  fontWeight="bold"
                                  color="gray.700"
                                  px={4}
                                  py={2}
                                >
                                  <VStack align="center" spacing={1}>
                                    <Text fontFamily="Noto Sans Lao, sans-serif">
                                      ລວມທັງໝົດ :{" "}
                                      <Text
                                        fontFamily="Noto Sans Lao, sans-serif"
                                        as="span"
                                        color="blue.700"
                                      >
                                        {formatAmount(
                                          installments.reduce(
                                            (sum, i) =>
                                              sum + Number(i.amount || 0),
                                            0
                                          ),
                                          currency
                                        )}
                                      </Text>
                                    </Text>
                                  </VStack>
                                </Td>
                              </Tr>

                              <Tr bg="gray.50">
                                <Td
                                  colSpan={4}
                                  fontFamily="Noto Sans Lao, sans-serif"
                                  fontWeight="bold"
                                  color="gray.700"
                                  px={4}
                                  py={2}
                                >
                                  <VStack align="center" spacing={1}>
                                    <Text fontFamily="Noto Sans Lao, sans-serif">
                                      ຍອດເຫຼືອ (ຍັງບໍ່ຊຳລະ) :{" "}
                                      <Text
                                        fontFamily="Noto Sans Lao, sans-serif"
                                        as="span"
                                        color="blue.700"
                                      >
                                        {formatAmount(remaining, currency)}
                                      </Text>
                                    </Text>
                                  </VStack>
                                </Td>
                              </Tr>
                            </Tbody>
                          </Table>
                        </Box>
                      );
                    }
                  );
                })()}
              </CardBody>
            </Card>

            {/* Notes and Reason */}
            <Card
              bg="white"
              border="1px solid"
              borderColor="gray.200"
              borderRadius="md"
              boxShadow="sm"
              _hover={{ boxShadow: "md" }}
              transition="all 0.2s"
            >
              <CardBody>
                <Text
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontSize="lg"
                  fontWeight="semibold"
                  color="gray.700"
                  mb={3}
                >
                  ຂໍ້ມູນເພີ່ມເຕີມ
                </Text>
                <Stack spacing={3}>
                  <Flex justify="space-between" align="center">
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      color="gray.600"
                      fontSize="sm"
                    >
                      ໝາຍເຫດ:
                    </Text>
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      fontWeight="medium"
                    >
                      {documentData.note || "ບໍ່ມີ"}
                    </Text>
                  </Flex>
                  <Flex justify="space-between" align="center">
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      color="gray.600"
                      fontSize="sm"
                    >
                      ເຫດຜົນ:
                    </Text>
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      fontWeight="medium"
                    >
                      {documentData.reason || "ບໍ່ມີ"}
                    </Text>
                  </Flex>
                </Stack>
              </CardBody>
            </Card>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button
            colorScheme="teal"
            onClick={onClose}
            fontFamily="Noto Sans Lao, sans-serif"
            aria-label="ປິດ"
          >
            ປິດ
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

const DebtManagementSystem = () => {
  const [debts, setDebts] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [selectedDebts, setSelectedDebts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const { user } = useAuth();
  const [selectedDebt, setSelectedDebt] = useState(null); // State for selected debt in details modal
  const {
    isOpen: isDetailsOpen,
    onOpen: onDetailsOpen,
    onClose: onDetailsClose,
  } = useDisclosure();
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    debtType: "",
    currency: "",
    paymentMethod: "",
    status: "",
  });
  const [formData, setFormData] = useState({
    serial: "",
    description: "",
    debtType: "payable",
    paymentMethod: "",
    date: "",
    amounts: [{ currency: "THB", amount: "", installments: [] }],
    note: "",
    reason: "",
    partnerId: null,
  });
  const [errors, setErrors] = useState({});
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const toast = useToast();
  function formatDate(dateString) {
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  const currencies = ["THB", "USD", "LAK", "EUR", "CNY"];
  const paymentMethods = ["ເງິນສົດ", "ໂອນ"];
  const debtTypes = [
    { value: "payable", label: "ໜີ້ຕ້ອງສົ່ງ" },
    { value: "receivable", label: "ໜີ້ຕ້ອງຮັບ" },
  ];
  const debtTypeLabels = {
    payable: "ໜີ້ຕ້ອງສົ່ງ",
    receivable: "ໜີ້ຕ້ອງຮັບ",
  };

  const statusOptions = ["ຄ້າງຊຳລະ", "ຊຳລະບາງສ່ວນ", "ຊຳລະຄົບ"];

  useEffect(() => {
    fetchDebts();
    fetchPartners();
  }, []);
  const fetchPartners = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/debt/partners`,
        {
          method: "GET",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const result = await res.json();
      if (!result.success) throw new Error(result.message);

      // แยก supplier / customer
      const suppliersData = result.data.filter((p) => p.type === "supplier");
      const customersData = result.data.filter((p) => p.type === "customer");

      setSuppliers(suppliersData);
      setCustomers(customersData);
    } catch (err) {
      console.error(err);
      alert("ไม่สามารถโหลดข้อมูล Partner ได้: " + err.message);
    }
  };
  const partnersOptions =
    formData.debtType === "payable"
      ? suppliers
      : formData.debtType === "receivable"
      ? customers
      : [];
  const fetchDebts = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/debt`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setDebts(data);
      } else {
        throw new Error("Failed to fetch debts");
      }
    } catch (error) {
      toast({
        title: "ຂໍ້ຜິດພາດ",
        description: "ບໍ່ສາມາດດຶງຂໍ້ມູນໜີ້ສິນໄດ້. ກະລຸນາລອງໃໝ່.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.serial.trim()) newErrors.serial = "ກະລຸນາປ້ອນເລກທີ່";
    else if (
      debts.some(
        (d) => d.serial === formData.serial && d._id !== editingDebt?._id
      )
    ) {
      newErrors.serial = "ເລກທີ່ເອກະສານຊໍາລະ ກະລຸນາໃຊ້ເລກທີ່ອື່ນ";
    }
    if (!formData?.partnerId?.name) {
      newErrors.partnerId = "ກະລຸນາເລືອກລູກໜີ້/ຜູ້ສະໜອງ";
    }
    if (!formData.description.trim())
      newErrors.description = "ກະລຸນາປ້ອນລາຍລະອຽດ";
    if (!formData.date) newErrors.date = "ກະລຸນາເລືອກວັນທີ";
    if (!formData.paymentMethod)
      newErrors.paymentMethod = "ກະລຸນາເລືອກວິທີການຊຳລະເງຶນ";
    if (!formData.reason.trim()) newErrors.reason = "ກະລຸນາປ້ອນສາເຫດ";

    formData.amounts.forEach((curr, index) => {
      if (!curr.amount || parseFloat(curr.amount) <= 0) {
        newErrors[`amount_${index}`] = "ຈຳນວນເງິນຕ້ອງຫຼາຍກວ່າ 0";
      }

      if (curr.installments?.length > 0) {
        const totalInstallments = curr.installments.reduce(
          (sum, inst) => sum + parseFloat(inst.amount || 0),
          0
        );
        const mainAmount = parseFloat(curr.amount || 0);

        if (Math.abs(totalInstallments - mainAmount) > 0.01) {
          newErrors[
            `installment_total_${index}`
          ] = `ຍອດງວດລວມຕ້ອງເທົ່າກັບ ${mainAmount.toFixed(2)} ${curr.currency}`;
        }

        curr.installments.forEach((inst, instIndex) => {
          if (!inst.dueDate) {
            newErrors[`installment_date_${index}_${instIndex}`] =
              "ກະລຸນາເລືອກວັນຄົບກຳນົດ";
          }
          if (!inst.amount || parseFloat(inst.amount) <= 0) {
            newErrors[`installment_amount_${index}_${instIndex}`] =
              "ຈຳນວນເງິນຕ້ອງຫຼາຍກວ່າ 0";
          }
        });
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const allInstallments = formData.amounts.flatMap((amt) =>
        (amt.installments || []).map((inst) => ({
          dueDate: inst.dueDate,
          amount: parseFloat(inst.amount),
          currency: amt.currency,
          isPaid: inst.isPaid || false,
          paidDate: inst.paidDate || null,
        }))
      );

      const submitData = {
        ...formData,
        amounts: formData.amounts.map((amt) => ({
          currency: amt.currency,
          amount: parseFloat(amt.amount),
        })),
        installments: allInstallments,
      };

      const url = editingDebt
        ? `${import.meta.env.VITE_API_URL}/api/debt/${editingDebt._id}`
        : `${import.meta.env.VITE_API_URL}/api/debt`;
      const method = editingDebt ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        await fetchDebts();
        setIsOpen(false);
        resetForm();
        setSelectedDebt([]);
        setSelectedDebts([]);
        toast({
          title: editingDebt ? "ການແກ້ໄຂສຳເລັດ" : "ເພີ່ມລາຍການສຳເລັດ",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "ບໍ່ສາມາດບັນທຶກຂໍ້ມູນໄດ້");
      }
    } catch (error) {
      console.log("error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("ທ່ານແນ່ໃຈບໍ່ວ່າຈະລົບລາຍການນີ້?")) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/debt/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (response.ok) {
        await fetchDebts();
       
        toast({
          title: "ລົບສຳເລັດ",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error("Failed to delete debt");
      }
    } catch (error) {
      toast({
        title: "ຂໍ້ຜິດພາດ",
        description: "ບໍ່ສາມາດລົບໜີ້ສິນໄດ້. ກະລຸນາລອງໃໝ່.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleEdit = (debt) => {
    setEditingDebt(debt);

    const amountsWithInstallments = debt.amounts.map((amt) => ({
      currency: amt.currency,
      amount: amt.amount.toString(),
      installments: (debt.installments || [])
        .filter((inst) => inst.currency === amt.currency)
        .map((inst) => ({
          dueDate: inst.dueDate
            ? new Date(inst.dueDate).toISOString().split("T")[0]
            : "",
          amount: inst.amount.toString(),
          isPaid: inst.isPaid || false,
          paidDate: inst.paidDate
            ? new Date(inst.paidDate).toISOString().split("T")[0]
            : null,
        })),
    }));

    setFormData({
      serial: debt?.serial,
      description: debt?.description,
      debtType: debt?.debtType,
      paymentMethod: debt?.paymentMethod,
      date: debt?.date ? new Date(debt?.date).toISOString().split("T")[0] : "",
      amounts: amountsWithInstallments,
      note: debt?.note || "",
      reason: debt?.reason || "",
      partnerId: debt?.partnerId?._id || debt?.partnerId?.name || "",
    });
    setIsOpen(true);
  };

  const handleViews = (debt) => {
    console.log(debt);
    setSelectedDebt(debt);
    onDetailsOpen();
  };

  const resetForm = () => {
    setFormData({
      serial: "",
      description: "",
      debtType: "payable",
      paymentMethod: "",
      date: "",
      amounts: [{ currency: "THB", amount: "", installments: [] }],
      note: "",
      reason: "",
    });
    setEditingDebt(null);
    setErrors({});
  };

  const addCurrency = () => {
    setFormData({
      ...formData,
      amounts: [
        ...formData.amounts,
        { currency: "USD", amount: "", installments: [] },
      ],
    });
  };
  ///ລົບສະກຸນເງິນ
  const removeCurrency = (index) => {
    setFormData({
      ...formData,
      amounts: formData.amounts.filter((_, i) => i !== index),
    });
  };
  //ເພີ່ມງວດ
  const updateAmount = (index, field, value) => {
    const newAmounts = [...formData.amounts];
    newAmounts[index][field] = value;
    setFormData({ ...formData, amounts: newAmounts });
  };
  ///ເພີ່ມງວດແລະຄຳນວນຍອດທີ່ຈະຈ່າຍໃນງວດຖັດໄປ
  const addInstallment = (currencyIndex) => {
    const newAmounts = [...formData.amounts];

    // ดึงข้อมูลงวดปัจจุบันของสกุลเงินนี้
    const currentInstallments = newAmounts[currencyIndex].installments || [];
    // ดึงยอดรวม past ของสกุลเงินนี้
    const totalAmount = Number(newAmounts[currencyIndex].amount || 0);

    // รวมยอดที่ชำระแล้วของงวดก่อนหน้า
    const totalPaid = currentInstallments.reduce(
      (sum, i) => sum + Number(i.amount || 0),
      0
    );

    // คำนวณยอดคงเหลือ
    const remaining = Math.max(0, totalAmount - totalPaid);
    // สร้างงวดใหม่ โดย ถ้ามีงวดก่อนหน้าแล้ว ให้ใส่ยอดคงเหลืออัตโนมัติ
    const newInstallment = {
      dueDate: "",
      amount: currentInstallments.length > 0 ? remaining.toFixed(2) : "",
      isPaid: false,
      paidDate: null,
    };

    newAmounts[currencyIndex].installments = [
      ...currentInstallments,
      newInstallment,
    ];
    console.log(" newAmounts", newAmounts);
    setFormData({ ...formData, amounts: newAmounts });
  };
  ///ຄິດໄລ່ຍອດເຫູືອຍິງບໍ່ຊຳລະ
  const reminingBalance = (currencyIndex) => {
    const currentCurrency = formData.amounts[currencyIndex];
    if (!currentCurrency) return 0;

    // งวดทั้งหมดของสกุลเงินนี้
    const currentInstallments = currentCurrency.installments || [];

    // รวมยอดที่ "จ่ายแล้ว"
    const totalPaid = currentInstallments
      .filter((item) => item.isPaid === true)
      .reduce((sum, i) => sum + Number(i.amount || 0), 0);

    // รวมยอดของทุกงวด (ถ้ามี)
    const totalAmountInstallment = currentInstallments.reduce(
      (sum, i) => sum + Number(i.amount || 0),
      0
    );

    // ยอดทั้งหมดที่ต้องชำระ (อาจเก็บใน currentCurrency.total หรือ currentCurrency.amount)
    const totalAmount = Number(
      currentCurrency.total || currentCurrency.amount || 0
    );

    // คำนวณยอดคงเหลือ
    const remaining = Math.max(0, totalAmount - totalPaid);
    return (
      <strong>
        {remaining.toLocaleString()} {currentCurrency.currency}
      </strong>
    );
  };

  const removeInstallment = (currencyIndex, instIndex) => {
    const newAmounts = [...formData.amounts];
    newAmounts[currencyIndex].installments = newAmounts[
      currencyIndex
    ].installments.filter((_, i) => i !== instIndex);
    setFormData({ ...formData, amounts: newAmounts });
  };

  const updateInstallment = (currencyIndex, instIndex, field, value) => {
    const newAmounts = [...formData.amounts];
    newAmounts[currencyIndex].installments[instIndex][field] = value;
    setFormData({ ...formData, amounts: newAmounts });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "ຄ້າງຊຳລະ":
        return "red";
      case "ຊຳລະບາງສ່ວນ":
        return "yellow";
      case "ຊຳລະຄົບ":
        return "green";
      default:
        return "gray";
    }
  };

  const filteredDebts = debts.filter((debt) => {
    const matchesSearch =
      searchTerm === "" ||
      debt.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (debt.note &&
        debt.note.toLowerCase().includes(searchTerm.toLowerCase())) ||
      debt.serial.toLowerCase().includes(searchTerm.toLowerCase());

    return (
      matchesSearch &&
      (!filters.dateFrom ||
        new Date(debt.date) >= new Date(filters.dateFrom).getTime()) &&
      (!filters.dateTo ||
        new Date(debt.date) <= new Date(filters.dateTo).getTime()) &&
      (!filters.debtType || debt.debtType === filters.debtType) &&
      (!filters.paymentMethod ||
        debt.paymentMethod === filters.paymentMethod) &&
      (!filters.currency ||
        debt.amounts?.some((c) => c.currency === filters.currency)) &&
      (!filters.status || debt.status === filters.status)
    );
  });

  const toggleSelectDebt = (id) => {
    const newSet = new Set(selectedDebts); // สร้าง copy ของ Set
    if (newSet.has(id)) {
      newSet.delete(id); // ถ้าเลือกแล้ว → ลบ
    } else {
      newSet.add(id); // ถ้ายังไม่ได้เลือก → เพิ่ม
    }
    setSelectedDebts(newSet); // อัปเดต state
  };

  const shortDesc = (desc) => {
    if (!desc) return "-"; // ถ้าไม่มีค่า ให้คืนเครื่องหมายขีด
    return desc.length > 7 ? desc.substring(0, 7) + "..." : desc;
  };
  const exportPDF = () => {
    // -----------------------------------------------------------------
    // 1. PREPARE DATA (you already have `selectedDebts`, `user`, etc.)

    // totals per currency

    const totals = selectedDebts.reduce(
      (acc, item) => {
        item.amounts?.forEach((a) => {
          if (a.currency === "LAK") acc.LAK += a.amount;
          if (a.currency === "THB") acc.THB += a.amount;
          if (a.currency === "USD") acc.USD += a.amount;
          if (a.currency === "CNY") acc.CNY += a.amount;
        });
        return acc;
      },
      { LAK: 0, THB: 0, USD: 0, CNY: 0 }
    );
    // ฟังก์ชัน group by currency
    function groupInstallmentsByCurrency(installments) {
      return installments.reduce((acc, inst) => {
        const curr = inst.currency || "UNKNOWN";
        if (!acc[curr]) acc[curr] = [];
        acc[curr].push(inst);
        return acc;
      }, {});
    }
    // -----------------------------------------------------------------
    // 2. BUILD HTML STRING (pure HTML + CSS)
    // -----------------------------------------------------------------
    const html = `
<!DOCTYPE html>
<html lang="lo">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ລາຍງານການເງິນ</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
  /* --------------------------------------------------------------
   Global reset & base
   -------------------------------------------------------------- */
*, *::before, *::after { 
  box-sizing: border-box; 
  margin: 0; 
  padding: 0; 
}

body {
  font-family: 'Noto Sans Lao', sans-serif;
  background: #f5f5f5;
  color: #000;
  line-height: 1.6;
  padding: 20px;
}

.container { 
  max-width: 1200px; 
  margin: auto; 
  background: #fff; 
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

/* --------------------------------------------------------------
   Toolbar (visible only on screen)
   -------------------------------------------------------------- */
.toolbar {
  background: #374151;
  color: #fff;
  padding: 15px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 8px 8px 0 0;
}

.toolbar h2 { 
  font-size: 16px; 
  font-weight: 600;
}

.btn-print {
  background: #10b981;
  color: #fff;
  font-family: 'Noto Sans Lao', sans-serif;
  border: none;
  padding: 10px 24px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
}

.btn-print:hover { 
  background: #059669; 
  transform: translateY(-2px); 
}

/* --------------------------------------------------------------
   Report header
   -------------------------------------------------------------- */
.report-header {
  text-align: center;
  border-bottom: 3px double #000;
  padding-bottom: 12px;
  margin-bottom: 15px;
     font-weight: 700;
     font-size:18px,
}

.report-header .gov {
  font-weight: 700;
  color: #000;
  margin-bottom: 5px;
   font-size:18px,
}

.report-header .motto { 
 font-size:18px,
  color: #000;
}
.company-address{
      font-weight: 700;
}
.company-info {
 display: flex;
    justify-content: space-between; /* จัดให้อยู่ตรงกลางแนวนอน */
    align-items: center;     /* จัดให้อยู่ตรงกลางแนวตั้ง */
    gap: 20px;               /* ระยะห่างระหว่างแต่ละช่อง */
  text-align: left;
      font-weight: 700;
  line-height: 1.8;
  font-size:12px;
}

.report-title {    
  text-align: center; 
  font-weight: 700; 
  color: #000;
  margin: 15px 0; 
  text-decoration: underline;
  text-underline-offset: 4px;
}

.report-big {  
  font-size: 14px; 
  font-weight: 700; 
  color: #000;
  margin: 12px 0; 
}

.date-section {
  text-align: right;
  font-size: 12px;
  color: #000;
   font-weight: 700;
  margin-bottom: 15px;
      font-weight: 700;
}

.date-section input {
  border: none;
  border-bottom: 1px dotted #000;
  width: 150px;
  text-align: center;
  font-family: inherit;
   font-weight: 700;
  font-size: 12px;
      font-weight: 700;
  background: transparent;
}

/* --------------------------------------------------------------
   Card & Info Layout
   -------------------------------------------------------------- */
.card {
  border: 1.5px solid #000;
  border-radius: 0;
  padding: 15px;
  margin-top: 15px;
  margin-bottom: 15px;
  background-color: #fff;
  page-break-inside: avoid;
}

.card-header {
  margin-bottom: 10px;
}

.card-date {
  font-size: 12px;
  color: #333;
  font-weight: 600;
}

.info-row {
  display: flex;

  padding: 8px 0;
  border-bottom: 1px solid #e5e7eb;
}

.info-label {
  font-weight: 700;
  color: #000;
  font-size: 12px;
  min-width: 150px;
}

  .info-value {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start; /* หรือ flex-end ตาม layout */
    gap: 10px; /* 👈 ระยะห่างระหว่างกล่อง */
    font-family: "Noto Sans Lao", sans-serif;
  }

  .info-value span {
    background: #fef2f2;       /* พื้นหลังแดงอ่อน */
    color: #b91c1c;            /* ตัวอักษรแดงเข้ม */
    border: 1px solid #fecaca; /* เส้นขอบอ่อน */
    padding: 6px 12px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 15px;
    white-space: nowrap;
  }
.badge {
  background: #f3f4f6;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  border: 1px solid #d1d5db;
}

.info-grid {
  margin-top: 10px;
}
  .info-item.info-row {
    display: flex;
    align-items: center;
    margin: 10px 0;
    font-family: "Noto Sans Lao", sans-serif;
  }

  .info-label {
    font-weight: 600;
    color: #374151;                   /* สีเทาเข้ม */
    font-size: 16px;
  }



/* --------------------------------------------------------------
   Table
   -------------------------------------------------------------- */
.table-wrapper { 
  overflow: visible; 
  margin: 20px 0; 
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  border: 1.5px solid #000;
  margin: 15px 0;
}

th {
  background: #fff;
  color: #000;
  padding: 8px 6px;
  text-align: center;
  font-weight: 700;
  border: 1px solid #000;
  white-space: normal;
  word-break: break-word;
  line-height: 1.4;
}

td {
  padding: 6px 8px;
  border: 1px solid #000;
  vertical-align: top;
  font-size: 12px;
  color: #000;
  line-height: 1.5;
}

/* Installments sub-table */
.installments table { 
  font-size: 10px; 
  margin-top: 10px; 
  border: 1px solid #000;
}

.installments th { 
  background: #f3f4f6; 
  color: #000;
  border: 1px solid #000;
}

.installments td { 
  padding: 6px 8px;
  border: 1px solid #000;
   font-size:12px,
}

/* Summary row */
.summary-row td {
  background: #e5e7eb;
  font-weight: 700;
 font-size:12px,
  border: 1.5px solid #000;
}

/* Grand total */
.grand-total td {
  background: #d1d5db;
  font-weight: 700;
   font-size:12px,
  font-size: 11px;
  border: 1.5px solid #000;
}

/* --------------------------------------------------------------
   Signature
   -------------------------------------------------------------- */
.signature-section {
  display: flex;
  justify-content: flex-end;
  margin-top: 40px;
  padding-top: 20px;
  border-top: 2px solid #000;
  page-break-inside: avoid;
}

.signature-box { 
  min-width: 220px; 
  text-align: center; 
}

.signature-label { 
  font-weight: 600; 
  margin-top: 50px;
  font-size: 13px;
  color: #000;
}

/* --------------------------------------------------------------
   Print styles
   -------------------------------------------------------------- */
@media print {
  @page {
    size: A4 landscape;
    margin: 12mm 10mm;
  }

  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body {
    background: white !important;
    padding: 0;
    margin: 0;
  }

  .container {
    box-shadow: none;
    max-width: 100%;
    padding: 0;
  }

  .toolbar {
    display: none !important;
  }

  .card {
    border: 1.5px solid #000 !important;
    page-break-inside: avoid;
    margin-bottom: 15px;
  }

  table {
    page-break-inside: auto;
    border: 1.5px solid #000 !important;
  }

  tr {
    page-break-inside: avoid;
    page-break-after: auto;
  }

  thead {
    display: table-header-group;
  }

  th {
    background: #ffffff !important;
    color: #000 !important;
    border: 1px solid #000 !important;
    padding: 6px 5px !important;
    font-size: 10px !important;
  }

  td {
    border: 1px solid #000 !important;
    padding: 5px 6px !important;
    font-size: 12px !important;
    line-height: 1.4;

  }

  .summary-row td,
  .grand-total td {
    background: #d1d5db !important;
    font-weight: 700 !important;
    border: 1.5px solid #000 !important;
     font-size:12px,
  }

  .signature-section {
    page-break-inside: avoid;
    border-top: 2px solid #000 !important;
  }

  input {
    border: none !important;
    border-bottom: 1px dotted #000 !important;
  }

  .info-row {
  border-bottom: 1px dotted #d1d5db !important; /* เส้นจุดๆ */
  }
}

/* Remove hover effects in print */
@media screen {
  tr:hover td { 
    background: #f9fafb; 
  }
}
  </style>
</head>
<body>
  <div class="container">
    <!-- Toolbar (screen only) -->
    <div class="toolbar">
      <h2>📄 ແບບລາຍງານ</h2>
      <button class="btn-print" style={} onclick="window.print()" aria-label="ພິມລາຍງານ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        ພິມລາຍງານ
      </button>
    </div>

    <!-- Report content -->
    <div class="report-header">
      <div class="gov">ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ</div>
      <div class="motto">ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ</div>
    </div>

      <div class="company-info">
      <div>
        <div class="">${user?.companyInfo?.name || ""}</div>
        <div class="">${user?.companyInfo?.address || ""}</div>
          <div class="">${user?.companyInfo?.phone || ""}</div>
      </div>
          <div class="topHeader">ລາຍງານການເງິນ</div>
          <!-- Date Section -->
          <div class="date-section">
            ວັນທີ: <input type="text" value="${formatDate(
              new Date()
            )}" readonly>
          </div>
      </div>
    <div class="table-wrapper">
   ${
     selectedDebts.length === 0
       ? `<tr><td colspan="10" style="text-align:center;color:#a0aec0;padding:2rem;">ບໍ່ມີຂໍ້ມູນ</td></tr>`
       : selectedDebts
           .slice()
           .sort(
             (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
           )
           .map((item, idx) => {
             const hasInstallments = item.installments?.length > 0;
             const remaining = item.amounts?.map((amt) => {
               const currency = amt.currency; // เช่น "LAK", "THB", "USD"

               // งวดทั้งหมดของสกุลนี้
               const currentInstallments =
                 item.installments?.filter((i) => i.currency === currency) ||
                 [];

               // รวมยอดที่ "ชำระแล้ว"
               const totalPaid = currentInstallments
                 .filter((i) => i.isPaid)
                 .reduce((sum, i) => sum + Number(i.amount || 0), 0);

               // ยอดทั้งหมดของสกุลนี้
               const totalAmount = Number(amt.amount || 0);

               // คำนวณยอดคงเหลือ (ถ้วน)
               const remaining = Math.max(
                 0,
                 Math.round(totalAmount - totalPaid)
               );
               console.log(currency, remaining);
               return {
                 currency,
                 remaining,
                 //  totalAmount: Math.round(totalAmount),
                 //  totalPaid: Math.round(totalPaid),
               };
             });
             const mainRow = `
       <div> 

       <div class="card">
       <div class="report-big ">ຂໍ້ມູນເບື່ອງຕົ້ນ ເລກທີ່ ${
         item.serial || "-"
       }</div>
    <div class="card-header">
      <div class="card-date">ວັນທີ:${formatDate(item.date)}</div>
    </div>

    <div class="serial-section info-row">
      <div class="info-label">ເລກທີ່</div>
      <div class="info-value">${item.serial || "-"}</div>
    </div>

    <div class="description-section info-row">
      <div class="info-label">ເນື້ອໃນລາຍການ</div>
      <div class="info-value">${item.description || "-"}</div>
    </div>

    <div class="info-grid">
      <div class="info-item info-row">
        <div class="info-label">ປະເພດ</div>
        <div class="info-value">
          <span class="badge">${debtTypeLabels[item.debtType] || "-"}</span>
        </div>
      </div>

      <div class="info-item info-row">
        <div class="info-label">ລູກໜີ້/ຜູ້ສະໜອງ</div>
        <div class="info-value">${item?.partnerId?.name || "-"}</div>
      </div>
 <div class="info-item info-row">
        <div class="info-label">ຍອດເຫຼືອທີ່ຍັງບໍ່ຊຳລະ</div>
      <div className="info-value">
  ${remaining?.map(
    (info, index) =>
      `<span key=${index} style="  color:#ff0000 ">
      <span style="color:#ff0000">
        ●
      </span>
      ${info.remaining.toLocaleString()} ${info.currency}
    </span>`
  )}
</div>
      </div>

      
    </div>
  </div>
</div>
`;

             // installments sub-table
             let installmentsHTML = "";
             if (hasInstallments) {
               const grouped = groupInstallmentsByCurrency(item.installments);
               installmentsHTML = Object.entries(grouped)
                 .map(([currency, list]) => {
                   const rows = list
                     .map((inst, i) => {
                       const paid = inst?.isPaid
                         ? `<span style="background:#d1fae5;color:#065f46;padding:0.1rem 0.35rem;border-radius:4px;font-size:0.625rem;">✓ ຊຳລະແລ້ວ</span>`
                         : `<span style="background:#fef3c7;color:#92400e;padding:0.1rem 0.35rem;border-radius:4px;font-size:0.625rem;">⏳ ຍັງບໍ່ໄດ້ຊຳລະ</span>`;
                       return `
<tr>
  <td style="border:1px solid #93c5fd;text-align:center;">${i + 1}</td>
  <td style="border:1px solid #93c5fd;text-align:center;">${formatDate(
    inst?.dueDate
  )}</td>
  <td style="border:1px solid #93c5fd;text-align:left;">${inst?.amount?.toLocaleString(
    "lo-LA"
  )}</td>
  <td style="border:1px solid #93c5fd;text-align:center;">${inst?.currency}</td>
  <td style="border:1px solid #93c5fd;text-align:center;">${paid}</td>
  <td style="border:1px solid #93c5fd;text-align:center;">${
    inst?.paidDate ? formatDate(inst?.paidDate) : "-"
  }</td>
</tr>`;
                     })
                     .join("");

                   const total = list?.reduce((s, i) => s + i.amount, 0);
                   const paidCount = list?.filter((i) => i.isPaid).length;

                   return `
<table style="width:100%;margin:0.5rem 0;border-collapse:collapse;">
  <thead>
  <div class="info-label">ສະກຸນເງິນ :${currency}</div>
    <tr style="background:#363636;">
      <th>ງວດທີ່</th>
      <th>ວັນກຳນົດ</th>
      <th>ຈຳນວນ</th>
      <th>ສະກຸນ</th>
      <th>ສະຖານະ</th>
      <th>ວັນທີ່ຊຳລະ</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
    <tr style="font-weight:bold">
      <td colspan="2" style="text-align:right;">ລວມຍອດທັງໝົດ:</td>
      <td style="text-align:left;">${total.toLocaleString("lo-LA")}</td>
      <td style="text-align:center;">${currency}</td>
      <td colspan="2" style="text-align:center;">ຊຳລະແລ້ວ: ${paidCount}/${
                     list.length
                   } ງວດ</td>
    </tr>


  </tbody>
</table>`;
                 })
                 .join("");
               installmentsHTML = `<tr><td colspan="10" style="padding:0;">${installmentsHTML}</td></tr>`;
             }

             return mainRow + installmentsHTML;
           })
           .join("")
   }
    </div>

    <!-- Signature -->
    <div class="signature-section">
      <div class="signature-box">
        <div>ນະຄອນຫຼວງວຽງຈັນ, ວັນທີ ${formatDate(new Date())}</div>
        <div class="signature-label">ຜູ້ສັງລວມ</div>
        <div style="margin-top:3rem;border-top:1px solid #4a5568;width:180px;"></div>
      </div>
    </div>
  </div>
</body>
</html>`;

    // -----------------------------------------------------------------
    // 3. OPEN NEW WINDOW & WRITE
    // -----------------------------------------------------------------
    const printWin = window.open("", "_blank", "width=1200,height=900");
    if (!printWin) {
      toast({ title: "ບໍ່ສາມາດເປີດປ່ອງຢ້ຽມໃໝ່", status: "error" });
      return;
    }
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();

    // optional: show a toast while the user decides to print
    toast({
      title: "ກຳລັງສ້າງ PDF",
      description: "ກົດປຸ່ມພິມເພື່ອບັນທຶກເປັນ PDF",
      status: "info",
      duration: 4000,
      isClosable: true,
      position: "top-right",
    });
  };
  console.log("filteredDebts", filteredDebts);
  return (
    <Box minH="100vh" bg="gray.50" p={4}>
      <Box maxW="7xl" mx="auto">
        <Box bg="white" rounded="lg" shadow="md" p={6} mb={6}>
          <Flex justify="space-between" align="center" mb={6}>
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              fontSize="3xl"
              fontWeight="bold"
            >
              ຈັດການໜີ້ສິນ
            </Text>

            <Button
              fontFamily="Noto Sans Lao, sans-serif"
              colorScheme="blue"
              leftIcon={<AddIcon />}
              onClick={() => {
                resetForm();
                setIsOpen(true);
              }}
            >
              ເພີ່ມລາຍການໃໝ່
            </Button>
          </Flex>

          <Flex gap={4} mb={4}>
            <InputGroup flex={1}>
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.400" />
              </InputLeftElement>
              <Input
                fontFamily="Noto Sans Lao, sans-serif"
                placeholder="ຄົ້ນຫາ (ລາຍລະອຽດ)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                pl={10}
              />
            </InputGroup>
            <Button
              fontFamily="Noto Sans Lao, sans-serif"
              leftIcon={<FilterXIcon />}
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              ຕົວກຣອງ
            </Button>
          </Flex>

          {showFilters && (
            <Box
              p={5}
              bg="gray.50"
              rounded="xl"
              mb={5}
              boxShadow="sm"
              border="1px solid"
              borderColor="gray.200"
            >
              <Text
                fontFamily="Noto Sans Lao, sans-serif"
                fontWeight="semibold"
                fontSize="md"
                mb={4}
                color="gray.700"
              >
                🔍 ຄົ້ນຫາ / ກອງຂໍ້ມູນ
              </Text>

              <SimpleGrid columns={{ base: 1, md: 3, lg: 4 }} spacing={4}>
                {/* 🗓 ວັນທີເລີ່ມຕົ້ນ */}
                <FormControl>
                  <FormLabel
                    fontFamily="Noto Sans Lao, sans-serif"
                    fontSize="sm"
                  >
                    ວັນທີ່ເລີ່ມຕົ້ນ
                  </FormLabel>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) =>
                      setFilters({ ...filters, dateFrom: e.target.value })
                    }
                  />
                </FormControl>

                {/* 🗓 ວັນທີ່ສິ້ນສຸດ */}
                <FormControl>
                  <FormLabel
                    fontFamily="Noto Sans Lao, sans-serif"
                    fontSize="sm"
                  >
                    ວັນທີ່ສິ້ນສຸດ
                  </FormLabel>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) =>
                      setFilters({ ...filters, dateTo: e.target.value })
                    }
                  />
                </FormControl>

                {/* 💼 ປະເພດໜີ້ສິນ */}
                <FormControl>
                  <FormLabel
                    fontFamily="Noto Sans Lao, sans-serif"
                    fontSize="sm"
                  >
                    ປະເພດໜີ້ສິນ
                  </FormLabel>
                  <Select
                    fontFamily="Noto Sans Lao, sans-serif"
                    value={filters.debtType}
                    onChange={(e) =>
                      setFilters({ ...filters, debtType: e.target.value })
                    }
                  >
                    <option value="">ທັງໝົດ</option>
                    {debtTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                {/* 💱 ສະກຸນເງິນ */}
                <FormControl>
                  <FormLabel
                    fontFamily="Noto Sans Lao, sans-serif"
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
                  >
                    <option value="">ທັງໝົດ</option>
                    {currencies.map((curr) => (
                      <option key={curr} value={curr}>
                        {curr}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                {/* 💳 ວິທີການຊຳລະເງຶນ */}
                <FormControl>
                  <FormLabel
                    fontFamily="Noto Sans Lao, sans-serif"
                    fontSize="sm"
                  >
                    ວິທີການຊຳລະເງິນ
                  </FormLabel>
                  <Select
                    fontFamily="Noto Sans Lao, sans-serif"
                    value={filters.paymentMethod}
                    onChange={(e) =>
                      setFilters({ ...filters, paymentMethod: e.target.value })
                    }
                  >
                    <option value="">ທັງໝົດ</option>
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                {/* ⚙️ ສະຖານະ */}
                <FormControl>
                  <FormLabel
                    fontFamily="Noto Sans Lao, sans-serif"
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
                  >
                    <option value="">ທັງໝົດ</option>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </SimpleGrid>

              {/* 🔘 Action Buttons */}
              <Flex justify="flex-end" mt={5} gap={3}>
                <Button
                  variant="outline"
                  colorScheme="gray"
                  fontFamily="Noto Sans Lao, sans-serif"
                  onClick={() =>
                    setFilters({
                      dateFrom: "",
                      dateTo: "",
                      debtType: "",
                      currency: "",
                      paymentMethod: "",
                      status: "",
                    })
                  }
                >
                  ລ້າງຄ່າກອງ
                </Button>
              </Flex>
            </Box>
          )}

          <HStack mb={4} spacing={3}>
            <Button
              leftIcon={<DownloadIcon />}
              colorScheme="teal"
              variant="outline"
              onClick={exportPDF}
              isDisabled={selectedDebts?.length === 0}
              rounded="lg"
            >
              Print ({selectedDebts?.length})
            </Button>
            <Box mb={4} p={3} bg="blue.50" rounded="lg">
              <Text fontFamily="Noto Sans Lao, sans-serif" color="blue.700">
                ເລືອກແລ້ວ {selectedDebts?.length} ລາຍການ
              </Text>
              {/* <Button
                  fontFamily="Noto Sans Lao, sans-serif"
                  variant="link"
                  colorScheme="blue"
                  onClick={() => setSelectedDebts()}
                >
                  ຍົກເລີກການເລືອກ
                </Button> */}
            </Box>
          </HStack>

          <Box overflowX="auto">
            <Table variant="simple" minW="900px">
              <Thead bg="gray.100">
                <Tr>
                  <Th>
                    <Checkbox
                      isChecked={
                        selectedDebts?.length === filteredDebts?.length
                      }
                      onChange={(e) =>
                        setSelectedDebts(e.target.checked ? filteredDebts : [])
                      }
                    />
                  </Th>
                  <Th
                    fontFamily="Noto Sans Lao, sans-serif"
                    whiteSpace="nowrap"
                  >
                    ເລກທີ່
                  </Th>
                  <Th
                    fontFamily="Noto Sans Lao, sans-serif"
                    whiteSpace="nowrap"
                  >
                    ວັນທີເດືອນປິ
                  </Th>
                  <Th
                    fontFamily="Noto Sans Lao, sans-serif"
                    whiteSpace="normal"
                    minW="200px"
                  >
                    ລາຍລະອຽດ
                  </Th>
                  <Th
                    fontFamily="Noto Sans Lao, sans-serif"
                    whiteSpace="nowrap"
                  >
                    ປະເພດໜີ້ສິນ
                  </Th>
                  <Th
                    fontFamily="Noto Sans Lao, sans-serif"
                    whiteSpace="nowrap"
                  >
                    ລູກໜີ້/ຜູ້ສະໜອງ
                  </Th>
                  <Th
                    fontFamily="Noto Sans Lao, sans-serif"
                    whiteSpace="nowrap"
                  >
                    ຈຳນວນເງິນ
                  </Th>
                  <Th
                    fontFamily="Noto Sans Lao, sans-serif"
                    whiteSpace="nowrap"
                  >
                    ວິທີການຊຳລະເງຶນ
                  </Th>
                  <Th
                    fontFamily="Noto Sans Lao, sans-serif"
                    whiteSpace="nowrap"
                  >
                    ສະຖານະ
                  </Th>
                  <Th
                    fontFamily="Noto Sans Lao, sans-serif"
                    whiteSpace="nowrap"
                  >
                    ຈັດການ
                  </Th>
                </Tr>
              </Thead>

              <Tbody>
                {filteredDebts.map((debt) => (
                  <Tr key={debt._id} _hover={{ bg: "gray.50" }}>
                    <Td>
                      <Checkbox
                        colorScheme="teal"
                        isChecked={selectedDebts.includes(debt)}
                        onChange={(e) =>
                          setSelectedDebts(
                            e.target.checked
                              ? [...selectedDebts, debt]
                              : selectedDebts?.filter((t) => t._id !== debt._id)
                          )
                        }
                      />
                    </Td>
                    <Td
                      fontFamily="Noto Sans Lao, sans-serif"
                      whiteSpace="nowrap"
                    >
                      {debt.serial}
                    </Td>
                    <Td
                      fontFamily="Noto Sans Lao, sans-serif"
                      whiteSpace="nowrap"
                    >
                      {formatDate(debt.date) || "N/A"}
                    </Td>
                    <Td
                      fontFamily="Noto Sans Lao, sans-serif"
                      whiteSpace="normal"
                      minW="200px"
                    >
                      {shortDesc(debt.description)}
                    </Td>
                    <Td>
                      <Badge
                        fontFamily="Noto Sans Lao, sans-serif"
                        colorScheme={
                          debt.debtType === "payable" ? "red" : "green"
                        }
                      >
                        {debt.debtType === "payable"
                          ? "ໜີ້ຕ້ອງສົ່ງ"
                          : "ໜີ້ຕ້ອງຮັບ"}
                      </Badge>
                    </Td>
                    <Td
                      fontFamily="Noto Sans Lao, sans-serif"
                      whiteSpace="nowrap"
                    >
                      {debt?.partnerId?.name}
                    </Td>
                    <Td
                      fontFamily="Noto Sans Lao, sans-serif"
                      whiteSpace="nowrap"
                    >
                      {debt.amounts?.map((c, i) => (
                        <Box key={i}>
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: c.currency,
                          }).format(c.amount)}
                        </Box>
                      ))}
                    </Td>
                    <Td
                      fontFamily="Noto Sans Lao, sans-serif"
                      whiteSpace="nowrap"
                    >
                      {debt.paymentMethod}
                    </Td>
                    <Td>
                      <Badge
                        fontFamily="Noto Sans Lao, sans-serif"
                        colorScheme={getStatusColor(debt.status)}
                      >
                        {debt.status}
                      </Badge>
                    </Td>
                    <Td>
                      <HStack spacing={2}>
                        <IconButton
                          icon={<EditIcon />}
                          colorScheme="blue"
                          variant="ghost"
                          onClick={() => handleEdit(debt)}
                        />
                        <IconButton
                          icon={<ViewIcon />}
                          colorScheme="blue"
                          variant="ghost"
                          onClick={() => handleViews(debt)}
                        />
                        <IconButton
                          icon={<DeleteIcon />}
                          colorScheme="red"
                          variant="ghost"
                          onClick={() => handleDelete(debt._id)}
                        />
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>

            {filteredDebts.length === 0 && (
              <Text
                fontFamily="Noto Sans Lao, sans-serif"
                textAlign="center"
                py={8}
                color="gray.500"
              >
                ບໍ່ພົບຂໍ້ມູນ
              </Text>
            )}
          </Box>
        </Box>

        {/* Add/Edit Modal */}
        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} size="2xl">
          <ModalOverlay />
          <ModalContent maxH="90vh" overflowY="auto">
            <ModalHeader fontFamily="Noto Sans Lao, sans-serif">
              {editingDebt ? "ແກ້ໄຂລາຍການໜີ້ສິນ" : "ເພີ່ມລາຍການໜີ້ສິນໃໝ່"}
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <form onSubmit={handleSubmit}>
                <VStack spacing={4}>
                  <HStack w="full" spacing={4}>
                    <FormControl isInvalid={errors.serial} isRequired>
                      <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                        ເລກທີ່ເອກະສານ
                      </FormLabel>
                      <Input
                        value={formData.serial}
                        onChange={(e) =>
                          setFormData({ ...formData, serial: e.target.value })
                        }
                      />
                      <FormErrorMessage fontFamily="Noto Sans Lao, sans-serif">
                        {errors.serial}
                      </FormErrorMessage>
                    </FormControl>
                    <FormControl isInvalid={errors.date} isRequired>
                      <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                        ວັນທີ່
                      </FormLabel>
                      <Input
                        type="date"
                        value={formData.date}
                        onChange={(e) =>
                          setFormData({ ...formData, date: e.target.value })
                        }
                      />
                      <FormErrorMessage fontFamily="Noto Sans Lao, sans-serif">
                        {errors.date}
                      </FormErrorMessage>
                    </FormControl>
                  </HStack>

                  <FormControl isInvalid={errors.description} isRequired>
                    <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                      ລາຍລະອຽດ
                    </FormLabel>
                    <Input
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                    />
                    <FormErrorMessage fontFamily="Noto Sans Lao, sans-serif">
                      {errors.description}
                    </FormErrorMessage>
                  </FormControl>

                  <HStack w="full" spacing={4}>
                    <FormControl>
                      <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                        ປະເພດໜີ້ສິນ
                      </FormLabel>
                      <Select
                        fontFamily="Noto Sans Lao, sans-serif"
                        value={formData.debtType}
                        onChange={(e) =>
                          setFormData({ ...formData, debtType: e.target.value })
                        }
                      >
                        {debtTypes.map((type) => (
                          <option
                            fontFamily="Noto Sans Lao, sans-serif"
                            key={type.value}
                            value={type.value}
                          >
                            {type.label}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl isInvalid={errors.partnerId} isRequired>
                      <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                        ລູກໜີ້/ຜູ້ສະໜອງ
                      </FormLabel>
                      <Select
                        value={formData?.partnerId?._id || ""}
                        onChange={(e) => {
                          const partner = partnersOptions.find(
                            (p) => p._id === e.target.value
                          );
                          setFormData({
                            ...formData,
                            partnerId: partner, // เก็บทั้ง object
                          });
                        }}
                        fontFamily="Noto Sans Lao, sans-serif"
                        placeholder="ເລືອກ ລູກໜີ້/ຜູ້ສະໜອງ"
                      >
                        {partnersOptions.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name}
                          </option>
                        ))}
                      </Select>

                      <FormErrorMessage fontFamily="Noto Sans Lao, sans-serif">
                        {errors.partnerId}
                      </FormErrorMessage>
                    </FormControl>
                    <FormControl isInvalid={errors.paymentMethod} isRequired>
                      <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                        ວິທີການຊຳລະເງຶນ
                      </FormLabel>
                      <Select
                        fontFamily="Noto Sans Lao, sans-serif"
                        value={formData.paymentMethod}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            paymentMethod: e.target.value,
                          })
                        }
                      >
                        <option fontFamily="Noto Sans Lao, sans-serif" value="">
                          ເລືອກວິທີການຊຳລະເງິນ
                        </option>
                        {paymentMethods.map((method) => (
                          <option
                            fontFamily="Noto Sans Lao, sans-serif"
                            key={method}
                            value={method}
                          >
                            {method}
                          </option>
                        ))}
                      </Select>
                      <FormErrorMessage fontFamily="Noto Sans Lao, sans-serif">
                        {errors.paymentMethod}
                      </FormErrorMessage>
                    </FormControl>
                  </HStack>

                  <FormControl isInvalid={errors.reason} isRequired>
                    <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                      ສາເຫດ
                    </FormLabel>
                    <Input
                      value={formData.reason}
                      onChange={(e) =>
                        setFormData({ ...formData, reason: e.target.value })
                      }
                    />
                    <FormErrorMessage fontFamily="Noto Sans Lao, sans-serif">
                      {errors.reason}
                    </FormErrorMessage>
                  </FormControl>

                  <Box w="full">
                    <Flex justify="space-between" align="center" mb={2}>
                      <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                        ຈຳນວນເງິນ
                      </FormLabel>
                      <Button
                        fontFamily="Noto Sans Lao, sans-serif"
                        size="sm"
                        leftIcon={<AddIcon />}
                        colorScheme="blue"
                        variant="outline"
                        onClick={addCurrency}
                      >
                        ເພີ່ມສະກຸນເງິນ
                      </Button>
                    </Flex>

                    {formData.amounts.map((curr, currIndex) => (
                      <Box
                        key={currIndex}
                        p={4}
                        borderWidth={1}
                        rounded="md"
                        bg="gray.50"
                        mb={4}
                      >
                        <HStack spacing={2} mb={3}>
                          <Select
                            fontFamily="Noto Sans Lao, sans-serif"
                            value={curr.currency}
                            onChange={(e) =>
                              updateAmount(
                                currIndex,
                                "currency",
                                e.target.value
                              )
                            }
                            w="150px"
                          >
                            {currencies.map((c) => (
                              <option
                                fontFamily="Noto Sans Lao, sans-serif"
                                key={c}
                                value={c}
                              >
                                {c}
                              </option>
                            ))}
                          </Select>
                          <FormControl
                            isInvalid={errors[`amount_${currIndex}`]}
                          >
                            <Input
                              type="number"
                              step="0.01"
                              value={curr.amount}
                              onChange={(e) =>
                                updateAmount(
                                  currIndex,
                                  "amount",
                                  e.target.value
                                )
                              }
                              placeholder="ຈຳນວນເງິນທັງໝົດ"
                            />
                            <FormErrorMessage fontFamily="Noto Sans Lao, sans-serif">
                              {errors[`amount_${currIndex}`]}
                            </FormErrorMessage>
                          </FormControl>
                          {formData.amounts.length > 1 && (
                            <IconButton
                              icon={<DeleteIcon />}
                              colorScheme="red"
                              variant="ghost"
                              onClick={() => removeCurrency(currIndex)}
                              aria-label="ລົບສະກຸນເງິນ"
                            />
                          )}
                        </HStack>

                        <Box ml={4}>
                          <Flex justify="space-between" align="center" mb={2}>
                            <Text
                              fontFamily="Noto Sans Lao, sans-serif"
                              fontSize="sm"
                            >
                              ການແບ່ງເປັນງວດ ({curr.currency})
                            </Text>
                            <Button
                              fontFamily="Noto Sans Lao, sans-serif"
                              size="sm"
                              leftIcon={<AddIcon />}
                              colorScheme="blue"
                              variant="outline"
                              onClick={() => addInstallment(currIndex)}
                            >
                              ເພີ່ມງວດ
                            </Button>
                          </Flex>

                          {errors[`installment_total_${currIndex}`] && (
                            <Text
                              fontFamily="Noto Sans Lao, sans-serif"
                              color="red.500"
                              fontSize="sm"
                              mb={2}
                            >
                              {errors[`installment_total_${currIndex}`]}
                            </Text>
                          )}

                          {curr.installments?.length > 0 ? (
                            <VStack spacing={2}>
                              {curr.installments.map((inst, instIndex) => (
                                <HStack
                                  key={instIndex}
                                  spacing={2}
                                  p={2}
                                  bg="white"
                                  rounded="md"
                                  borderWidth={1}
                                  w="full"
                                >
                                  <VStack>
                                    <FormLabel
                                      fontFamily={"Noto Sans Lao, sans-serif"}
                                    >
                                      ວັນທີ່ກຳນົດສົ່ງ
                                    </FormLabel>
                                    <FormControl
                                      isInvalid={
                                        errors[
                                          `installment_date_${currIndex}_${instIndex}`
                                        ]
                                      }
                                    >
                                      <Input
                                        type="date"
                                        value={inst.dueDate}
                                        onChange={(e) =>
                                          updateInstallment(
                                            currIndex,
                                            instIndex,
                                            "dueDate",
                                            e.target.value
                                          )
                                        }
                                        placeholder="ວັນຄົບກຳນົດ
"
                                      />
                                      <FormErrorMessage fontFamily="Noto Sans Lao, sans-serif">
                                        {
                                          errors[
                                            `installment_date_${currIndex}_${instIndex}`
                                          ]
                                        }
                                      </FormErrorMessage>
                                    </FormControl>
                                  </VStack>

                                  <VStack>
                                    <FormLabel
                                      fontFamily={"Noto Sans Lao, sans-serif"}
                                    >
                                      ວັນທີ່ຊຳລະ
                                    </FormLabel>
                                    <FormControl
                                      isInvalid={
                                        errors[
                                          `installment_date_${currIndex}_${instIndex}`
                                        ]
                                      }
                                    >
                                      <Input
                                        type="date"
                                        value={inst.paidDate}
                                        onChange={(e) =>
                                          updateInstallment(
                                            currIndex,
                                            instIndex,
                                            "paidDate",
                                            e.target.value
                                          )
                                        }
                                        placeholder="ວັນຄົບກຳນົດ 
"
                                      />
                                      <FormErrorMessage fontFamily="Noto Sans Lao, sans-serif">
                                        {
                                          errors[
                                            `installment_date_${currIndex}_${instIndex}`
                                          ]
                                        }
                                      </FormErrorMessage>
                                    </FormControl>
                                  </VStack>
                                  <VStack>
                                    <FormLabel
                                      fontFamily={"Noto Sans Lao, sans-serif"}
                                    >
                                      ຈຳນວນເງິນ
                                    </FormLabel>
                                    <FormControl
                                      isInvalid={
                                        errors[
                                          `installment_amount_${currIndex}_${instIndex}`
                                        ]
                                      }
                                    >
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={inst.amount}
                                        onChange={(e) =>
                                          updateInstallment(
                                            currIndex,
                                            instIndex,
                                            "amount",
                                            e.target.value
                                          )
                                        }
                                        placeholder={`ຈຳນວນ (${curr.currency})`}
                                      />
                                      <FormErrorMessage fontFamily="Noto Sans Lao, sans-serif">
                                        {
                                          errors[
                                            `installment_amount_${currIndex}_${instIndex}`
                                          ]
                                        }
                                      </FormErrorMessage>
                                    </FormControl>
                                  </VStack>

                                  <Checkbox
                                    fontFamily={"Noto Sans Lao, sans-serif"}
                                    isChecked={inst.isPaid}
                                    onChange={(e) =>
                                      updateInstallment(
                                        currIndex,
                                        instIndex,
                                        "isPaid",
                                        e.target.checked
                                      )
                                    }
                                  >
                                    <Text
                                      fontFamily={"Noto Sans Lao, sans-serif"}
                                    >
                                      ຊຳລະແລ້ວ
                                    </Text>
                                  </Checkbox>

                                  <IconButton
                                    icon={<DeleteIcon />}
                                    colorScheme="red"
                                    variant="ghost"
                                    onClick={() =>
                                      removeInstallment(currIndex, instIndex)
                                    }
                                    aria-label="ລົບງວດ"
                                  />
                                </HStack>
                              ))}
                              <Box bg="blue.50" p={2} rounded="md" w="full">
                                <Text
                                  fontFamily="Noto Sans Lao, sans-serif"
                                  fontSize="sm"
                                >
                                  ຍອດລວມງວດ:{" "}
                                  {curr.installments
                                    .reduce(
                                      (sum, inst) =>
                                        sum + parseFloat(inst.amount || 0),
                                      0
                                    )
                                    .toFixed(2)}{" "}
                                  {curr.currency} / ຍອດທັງໝົດ: {curr.amount}{" "}
                                  {curr.currency}
                                </Text>
                              </Box>
                              <Text fontFamily="Noto Sans Lao, sans-serif">
                                ຍອດເຫຼືອ(ຍັງບໍ່ຊຳລະ):{" "}
                                {reminingBalance(currIndex)}
                              </Text>
                            </VStack>
                          ) : (
                            <Text
                              fontFamily="Noto Sans Lao, sans-serif"
                              fontSize="sm"
                              color="gray.500"
                              fontStyle="italic"
                            >
                              ບໍ່ມີການແບ່ງຊຳລະເງິນເປັນງວດ (ຊຳລະຄັ້ງດຽວ)
                            </Text>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Box>

                  <FormControl>
                    <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                      ໝາຍເຫດ
                    </FormLabel>
                    <Textarea
                      fontFamily="Noto Sans Lao, sans-serif"
                      value={formData.note}
                      onChange={(e) =>
                        setFormData({ ...formData, note: e.target.value })
                      }
                      rows={3}
                    />
                  </FormControl>
                </VStack>
              </form>
            </ModalBody>
            <ModalFooter>
              <Button
                fontFamily="Noto Sans Lao, sans-serif"
                variant="outline"
                mr={3}
                onClick={() => {
                  setIsOpen(false);
                  resetForm();
                }}
                aria-label="ຍົກເລີກ"
              >
                ຍົກເລີກ
              </Button>
              <Button
                fontFamily="Noto Sans Lao, sans-serif"
                colorScheme="blue"
                type="submit"
                onClick={handleSubmit}
                aria-label={editingDebt ? "ບັນທຶກການແກ້ໄຂ" : "ເພີ່ມລາຍການ"}
              >
                {editingDebt ? "ບັນທຶກການແກ້ໄຂ" : "ເພີ່ມລາຍການ"}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Details Modal */}
        <DebtDetailsModal
          isOpen={isDetailsOpen}
          onClose={onDetailsClose}
          documentData={selectedDebt}
        />
      </Box>
    </Box>
  );
};

export default DebtManagementSystem;
