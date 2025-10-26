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
import { FilterXIcon, ViewIcon } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";

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
                        key={amt._id?.$oid}
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
                    ([currency, installments]) => (
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
                            {installments.map((inst) => (
                              <Tr
                                key={inst._id?.$oid || inst._id}
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
                                  fontFamily="Noto Sans Lao, sans-serif"
                                  fontSize="sm"
                                  isNumeric
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
                                    colorScheme={inst.isPaid ? "green" : "red"}
                                    px={2}
                                    py={1}
                                    borderRadius="full"
                                  >
                                    {inst.isPaid ? "ຊຳລະແລ້ວ" : "ຍັງບໍ່ຊຳລະ"}
                                  </Badge>
                                </Td>
                              </Tr>
                            ))}

                            {/* 🔹 แสดงยอดรวมของแต่ละสกุล */}
                            <Tr bg="gray.50">
                              <Td
                                colSpan={2}
                                textAlign="right"
                                fontFamily="Noto Sans Lao, sans-serif"
                                fontWeight="bold"
                                color="gray.700"
                              >
                                ລວມທັງໝົດ:
                              </Td>
                              <Td
                                isNumeric
                                fontFamily="Noto Sans Lao, sans-serif"
                                fontWeight="bold"
                                color="blue.700"
                              >
                                {formatAmount(
                                  installments.reduce(
                                    (sum, i) => sum + i.amount,
                                    0
                                  ),
                                  currency
                                )}
                              </Td>
                              <Td></Td>
                            </Tr>
                          </Tbody>
                        </Table>
                      </Box>
                    )
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
  const [selectedDebts, setSelectedDebts] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
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
  });
  const [errors, setErrors] = useState({});

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
  const statusOptions = ["ຄ້າງຊຳລະ", "ຊຳລະບາງສ່ວນ", "ຊຳລະຄົບ"];

  useEffect(() => {
    fetchDebts();
  }, []);

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
      toast({
        title: "ຂໍ້ຜິດພາດ",
        description: error.message || "ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກຂໍ້ມູນ",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("ທ່ານແນ່ໃຈບໍ່ວ່າຈະລົບລາຍການນີ້?")) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/debt/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.ok) {
        await fetchDebts();
        setSelectedDebts((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
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
      serial: debt.serial,
      description: debt.description,
      debtType: debt.debtType,
      paymentMethod: debt.paymentMethod,
      date: debt.date ? new Date(debt.date).toISOString().split("T")[0] : "",
      amounts: amountsWithInstallments,
      note: debt.note || "",
      reason: debt.reason || "",
    });
    setIsOpen(true);
  };

  const handleViews = (debt) => {
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

  const removeCurrency = (index) => {
    setFormData({
      ...formData,
      amounts: formData.amounts.filter((_, i) => i !== index),
    });
  };

  const updateAmount = (index, field, value) => {
    const newAmounts = [...formData.amounts];
    newAmounts[index][field] = value;
    setFormData({ ...formData, amounts: newAmounts });
  };

  const addInstallment = (currencyIndex) => {
    const newAmounts = [...formData.amounts];
    newAmounts[currencyIndex].installments = [
      ...(newAmounts[currencyIndex].installments || []),
      { dueDate: "", amount: "", isPaid: false, paidDate: null },
    ];
    setFormData({ ...formData, amounts: newAmounts });
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

  const exportToPDF = () => {
    const doc = new jsPDF();
    const debtsToExport =
      selectedDebts.size > 0
        ? filteredDebts.filter((d) => selectedDebts.has(d._id))
        : filteredDebts;

    doc.setFont("NotoSansLao", "normal"); // Ensure Noto Sans Lao font is available
    doc.text("ລາຍງານໜີ້ສິນ", 20, 20);
    let y = 30;

    debtsToExport.forEach((debt, index) => {
      doc.text(
        `${index + 1}. ເລກທີ່: ${debt.serial}, ລາຍລະອຽດ: ${
          debt.description
        }, ປະເພດ: ${
          debt.debtType === "payable" ? "ໜີ້ຕ້ອງສົ່ງ" : "ໜີ້ຕ້ອງຮັບ"
        }, ວັນທີ່: ${debt.date?.split("T")[0] || ""}, ຈຳນວນ: ${debt.amounts
          .map((c) => `${c.amount.toLocaleString()} ${c.currency}`)
          .join(", ")}, ວິທີການຊຳລະ: ${debt.paymentMethod}, ສະຖານະ: ${
          debt.status
        }`,
        20,
        y
      );
      y += 10;
    });

    doc.save(`debts_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const exportToCSV = () => {
    const debtsToExport =
      selectedDebts.size > 0
        ? filteredDebts.filter((d) => selectedDebts.has(d._id))
        : filteredDebts;

    const csv = [
      [
        "ເລກທີ່",
        "ລາຍລະອຽດ",
        "ປະເພດ",
        "ວັນທີ່",
        "ຈຳນວນເງິນ",
        "ວິທີການຊຳລະເງຶນ",
        "ສະຖານະ",
      ],
      ...debtsToExport.map((d) => [
        d.serial,
        d.description,
        d.debtType === "payable" ? "ໜີ້ຕ້ອງສົ່ງ" : "ໜີ້ຕ້ອງຮັບ",
        d.date?.$date?.$numberLong
          ? new Date(Number(d.date.$date.$numberLong))
              .toISOString()
              .split("T")[0]
          : "",
        d.amounts.map((c) => `${c.amount} ${c.currency}`).join(", "),
        d.paymentMethod,
        d.status,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `debts_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
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
      (debt.note && debt.note.toLowerCase().includes(searchTerm.toLowerCase()));

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
    setSelectedDebts((prev) => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };
 const shortDesc = (desc) => {
    if (!desc) return "-"; // ถ้าไม่มีค่า ให้คืนเครื่องหมายขีด
    return desc.length > 7 ? desc.substring(0, 7) + "..." : desc;
  };
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
        <FormLabel fontFamily="Noto Sans Lao, sans-serif" fontSize="sm">
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
        <FormLabel fontFamily="Noto Sans Lao, sans-serif" fontSize="sm">
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
        <FormLabel fontFamily="Noto Sans Lao, sans-serif" fontSize="sm">
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
        <FormLabel fontFamily="Noto Sans Lao, sans-serif" fontSize="sm">
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
        <FormLabel fontFamily="Noto Sans Lao, sans-serif" fontSize="sm">
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
        <FormLabel fontFamily="Noto Sans Lao, sans-serif" fontSize="sm">
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


          {selectedDebts.size > 0 && (
            <Box mb={4} p={3} bg="blue.50" rounded="lg">
              <Text fontFamily="Noto Sans Lao, sans-serif" color="blue.700">
                ເລືອກແລ້ວ {selectedDebts.size} ລາຍການ
              </Text>
              <Button
                fontFamily="Noto Sans Lao, sans-serif"
                variant="link"
                colorScheme="blue"
                onClick={() => setSelectedDebts(new Set())}
              >
                ຍົກເລີກການເລືອກ
              </Button>
            </Box>
          )}

          <Box overflowX="auto">
            <Table variant="simple">
              <Thead bg="gray.100">
                <Tr>
                  <Th>
                    <Checkbox
                      isChecked={
                        selectedDebts.size === filteredDebts.length &&
                        filteredDebts.length > 0
                      }
                      onChange={(e) =>
                        setSelectedDebts(
                          e.target.checked
                            ? new Set(filteredDebts.map((d) => d._id))
                            : new Set()
                        )
                      }
                    />
                  </Th>
                  <Th fontFamily="Noto Sans Lao, sans-serif">ເລກທີ່</Th>
                  <Th fontFamily="Noto Sans Lao, sans-serif">ວັນທີເດືອນປິ</Th>
                  <Th fontFamily="Noto Sans Lao, sans-serif">ລາຍລະອຽດ</Th>
                  <Th fontFamily="Noto Sans Lao, sans-serif">ປະເພດໜີ້ສິນ</Th>
                  <Th fontFamily="Noto Sans Lao, sans-serif">ວັນທີ່</Th>
                  <Th fontFamily="Noto Sans Lao, sans-serif">ຈຳນວນເງິນ</Th>
                  <Th fontFamily="Noto Sans Lao, sans-serif">
                    ວິທີການຊຳລະເງຶນ
                  </Th>
                  <Th fontFamily="Noto Sans Lao, sans-serif">ສະຖານະ</Th>
                  <Th fontFamily="Noto Sans Lao, sans-serif">ຈັດການ</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredDebts.map((debt) => (
                  <Tr key={debt._id} _hover={{ bg: "gray.50" }}>
                    <Td>
                      <Checkbox
                        isChecked={selectedDebts.has(debt._id)}
                        onChange={() => toggleSelectDebt(debt._id)}
                      />
                    </Td>
                    <Td fontFamily="Noto Sans Lao, sans-serif">
                      {debt.serial}
                    </Td>
                    <Td fontFamily="Noto Sans Lao, sans-serif">
                      {formatDate(debt.date) || "N/A"}
                    </Td>
                    <Td fontFamily="Noto Sans Lao, sans-serif">
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
                    <Td fontFamily="Noto Sans Lao, sans-serif">
                      {debt.date?.$date?.$numberLong
                        ? format(
                            new Date(Number(debt.date.$date.$numberLong)),
                            "PPP"
                          )
                        : ""}
                    </Td>
                    <Td fontFamily="Noto Sans Lao, sans-serif">
                      {debt.amounts?.map((c, i) => (
                        <Box key={i}>
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: c.currency,
                          }).format(c.amount)}
                        </Box>
                      ))}
                    </Td>
                    <Td fontFamily="Noto Sans Lao, sans-serif">
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
                          aria-label="ແກ້ໄຂ"
                        />
                        <IconButton
                          icon={<ViewIcon />}
                          colorScheme="blue"
                          variant="ghost"
                          onClick={() => handleViews(debt)}
                          aria-label="ເບິ່ງລາຍລະອຽດ"
                        />
                        <IconButton
                          icon={<DeleteIcon />}
                          colorScheme="red"
                          variant="ghost"
                          onClick={() => handleDelete(debt._id)}
                          aria-label="ລົບ"
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
                      <FormErrorMessage>{errors.serial}</FormErrorMessage>
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
                      <FormErrorMessage>{errors.date}</FormErrorMessage>
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
                    <FormErrorMessage>{errors.description}</FormErrorMessage>
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
                      <FormErrorMessage>
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
                    <FormErrorMessage>{errors.reason}</FormErrorMessage>
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
                            <FormErrorMessage>
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
                                      <FormErrorMessage>
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
                                      <FormErrorMessage>
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
                                      <FormErrorMessage>
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
