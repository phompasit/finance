import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChakraProvider,
  Box,
  Button,
  Input,
  Select,
  Textarea,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Checkbox,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  VStack,
  HStack,
  Badge,
  IconButton,
  Flex,
  Text,
  Heading,
  Divider,
  extendTheme,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Card,
  CardBody,
  Stat,
  StatLabel,
  Grid,
} from "@chakra-ui/react";
import {
  Plus,
  FileText,
  Trash2,
  Edit,
  Download,
  ChevronRightIcon,
  ChevronLeftIcon,
} from "lucide-react";
import PropTypes from "prop-types";
import { useAuth } from "../context/AuthContext";

// Theme Configuration
const theme = extendTheme({
  fonts: {
    heading: '"Noto Sans Lao", sans-serif',
    body: '"Noto Sans Lao", sans-serif',
  },
});

// Constants
const STATUS_COLORS = {
  PENDING: "yellow",
  APPROVED: "green",
  CANCELLED: "red",
};

const STATUS_TEXTS = {
  PENDING: "ລໍຖ້າອະນຸມັດ",
  APPROVED: "ອະນຸມັດແລ້ວ",
  CANCELLED: "ຍົກເລີກ",
};
const STATUS_TEXTS_staff = {
  PENDING: "ລໍຖ້າອະນຸມັດ",
};

const PAYMENT_METHODS = {
  cash: "ເງິນສົດ",
  transfer: "ໂອນເງິນ",
};

const CURRENCIES = ["LAK", "THB", "USD", "CNY"];

const API_BASE_URL = `${import.meta.env.VITE_API_URL}/api`;
function formatDate(dateString) {
  const d = new Date(dateString);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
// Utility Functions
const groupByCurrency = (items) =>
  items.reduce((acc, item) => {
    acc[item.currency] =
      (acc[item.currency] || 0) + parseFloat(item.amount || 0);
    return acc;
  }, {});

const sanitizeInput = (input) => {
  if (!input) return "";
  return String(input).trim();
};
// Components
const OPOItem = ({ item, onRemove }) => (
  <Box p={3} bg="gray.50" borderRadius="md" mb={2}>
    <Flex justify="space-between" align="start">
      <Box flex="1">
        <Text fontWeight="bold">{item.description}</Text>
        <HStack spacing={4} mt={1} fontSize="sm" color="gray.600">
          <Text>{PAYMENT_METHODS[item.paymentMethod]}</Text>
          <Text fontWeight="bold" color="blue.600">
            {parseFloat(item.amount || 0).toLocaleString()} {item.currency}
          </Text>
        </HStack>
        {item.reason && (
          <Text fontSize="sm" mt={1}>
            ສາເຫດ: {item.reason}
          </Text>
        )}
        {item.notes && (
          <Text fontSize="sm" color="gray.500">
            ໝາຍເຫດ: {item.notes}
          </Text>
        )}
      </Box>
      <IconButton
        icon={<Trash2 size={16} />}
        size="sm"
        colorScheme="red"
        variant="ghost"
        onClick={() => onRemove(item._id)}
        aria-label="Delete item"
      />
    </Flex>
  </Box>
);

OPOItem.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.number.isRequired,
    description: PropTypes.string.isRequired,
    paymentMethod: PropTypes.string.isRequired,
    currency: PropTypes.string.isRequired,
    amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
      .isRequired,
    reason: PropTypes.string,
    notes: PropTypes.string,
  }).isRequired,
  onRemove: PropTypes.func.isRequired,
};

const OPOTable = ({
  toast,
  opos,
  onEdit,
  onDelete,
  onExportPDF,
  user,
  fetchOPOs,
  setPage,
  totalPages,
  page,
}) => {
  if (opos.length === 0) {
    return (
      <Box bg="white" borderRadius="lg" shadow="sm" p={8} textAlign="center">
        <Text color="gray.500" fontSize="lg">
          ບໍ່ມີຂໍ້ມູນ OPO
        </Text>
      </Box>
    );
  }
  const handleStatus = async (data, status) => {
    const endpoint = `${import.meta.env.VITE_API_URL}/api/opo/status/${
      data._id
    }`;

    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ status_Ap: status }),
      });

      const result = await response.json();

      if (!response.ok) {
        return toast({
          title: "ກະລຸນາກວດສອບອີກຄັ້ງ",
          description: result.message || "Error occurred",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }

      fetchOPOs();
      toast({
        title: "ສຳເລັດ",
        description: `${status} ສຳເລັດແລ້ວ`,
        status: "success",
        duration: 2500,
        isClosable: true,
      });
      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Box bg="white" borderRadius="lg" shadow="sm" overflow="auto">
      <Table>
        <Thead bg="blue.50">
          <Tr>
            <Th>ເລກທີ</Th>
            <Th>ວັນທີ</Th>
            <Th>ຈຳນວນລາຍການ</Th>
            <Th>ຍອດລວມ</Th>
            <Th>ສະຖານະການຊຳລະເງິນ</Th>
            <Th>ສະຖານະ</Th>
            <Th>ຜູ້ສ້າງ</Th>
            <Th>ຈັດການ</Th>
          </Tr>
        </Thead>
        <Tbody>
          {opos.map((opo) => {
            const totals = groupByCurrency(opo.items || []);
            return (
              <Tr key={opo._id} _hover={{ bg: "gray.50" }}>
                <Td fontFamily="Noto Sans Lao, sans-serif" fontWeight="bold">
                  {opo.serial || opo.number}
                </Td>
                <Td fontFamily="Noto Sans Lao, sans-serif">
                  {formatDate(opo.date)}
                </Td>
                <Td fontFamily="Noto Sans Lao, sans-serif">
                  {(opo.items || []).length}
                </Td>
                <Td>
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="flex-end"
                    gap={0.5}
                    justifyContent="center"
                    minW="120px"
                  >
                    {Object.entries(totals).map(([currency, amount], index) => (
                      <Box
                        key={currency}
                        display="flex"
                        justifyContent="space-between"
                        w="full"
                        borderBottom={
                          index !== Object.entries(totals).length - 1
                            ? "1px dashed #CBD5E0"
                            : "none"
                        }
                        pb={
                          index !== Object.entries(totals).length - 1 ? 0.5 : 0
                        }
                      >
                        <Text
                          fontFamily="Noto Sans Lao, sans-serif"
                          fontSize="sm"
                          fontWeight="600"
                          color="gray.800"
                        >
                          {amount.toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                          })}
                        </Text>
                        <Text
                          fontFamily="Noto Sans Lao, sans-serif"
                          fontSize="sm"
                          fontWeight="600"
                          color="gray.500"
                          pl={2}
                        >
                          {currency}
                        </Text>
                      </Box>
                    ))}
                  </Box>
                </Td>

                <Td>
                  <Badge
                    fontFamily={"Noto Sans Lao, sans-serif"}
                    colorScheme={opo.status === "paid" ? "green" : "red"}
                    rounded="md"
                    fontSize="14px"
                    fontWeight="bold"
                  >
                    {opo.status === "paid" ? "ຊຳລະແລ້ວ" : "ຍັງບໍ່ຊຳລະ"}
                  </Badge>
                </Td>
                <Td>
                  <Badge
                    rounded="lg"
                    colorScheme={STATUS_COLORS[opo.status_Ap] || opo.status_Ap}
                    fontFamily={"Noto Sans Lao, sans-serif"}
                    px={4}
                    py={2}
                    fontWeight="bold"
                    fontSize={"22px"}
                    textTransform="capitalize"
                    variant="solid" // ใช้แบบทึบจะเด่นกว่า outline
                    boxShadow="0px 2px 10px rgba(0,0,0,0.25)" // เพิ่มเงาให้ลอยขึ้น
                    border="1px solid rgba(255,255,255,0.6)" // ขอบจาง ๆ ให้ดูมีชั้น
                    letterSpacing="0.5px"
                  >
                    {STATUS_TEXTS[opo.status_Ap] || opo.status_Ap}
                  </Badge>
                </Td>
                <Td>
                  <Badge fontFamily="Noto Sans Lao, sans-serif">
                    {opo?.staff?.username}
                  </Badge>
                </Td>
                <Td>
                  <HStack spacing={2}>
                    {(user?.role === "admin" || user?.role === "master") && (
                      <HStack spacing={2}>
                        <Button
                          fontSize={"20"}
                          size="sm"
                          rounded="lg"
                          fontFamily="Noto Sans Lao, sans-serif"
                          colorScheme={
                            opo?.status_Ap === "PENDING" ? "yellow" : "gray"
                          }
                          variant={
                            opo?.status_Ap === "PENDING" ? "solid" : "outline"
                          }
                          onClick={() => handleStatus(opo, "PENDING")}
                        >
                          ລໍຖ້າ
                        </Button>

                        <Button
                          fontSize={"20"}
                          size="sm"
                          rounded="lg"
                          fontFamily="Noto Sans Lao, sans-serif"
                          colorScheme={
                            opo?.status_Ap === "APPROVED" ? "green" : "gray"
                          }
                          variant={
                            opo?.status_Ap === "APPROVED" ? "solid" : "outline"
                          }
                          onClick={() => handleStatus(opo, "APPROVED")}
                        >
                          ອະນຸມັດ
                        </Button>

                        <Button
                          fontSize={"20"}
                          size="sm"
                          rounded="lg"
                          fontFamily="Noto Sans Lao, sans-serif"
                          colorScheme={
                            opo?.status_Ap === "CANCELLED" ? "red" : "gray"
                          }
                          variant={
                            opo?.status_Ap === "CANCELLED" ? "solid" : "outline"
                          }
                          onClick={() => handleStatus(opo, "CANCELLED")}
                        >
                          ຍົກເລີກ
                        </Button>
                      </HStack>
                    )}
                    <IconButton
                      icon={<FileText size={18} />}
                      size="sm"
                      colorScheme="green"
                      onClick={() => onExportPDF(opo)}
                      aria-label="Export PDF"
                    />
                    {(user?.role === "admin" ||
                      (user?.role === "staff" &&
                        opo?.status_Ap !== "APPROVED")) && (
                      <IconButton
                        icon={<Edit size={18} />}
                        size="sm"
                        colorScheme="blue"
                        onClick={() => onEdit(opo)}
                        aria-label="Edit OPO"
                      />
                    )}
                    {(user?.role === "admin" ||
                      (user?.role === "staff" &&
                        opo?.status_Ap !== "APPROVED")) && (
                      <IconButton
                        icon={<Trash2 size={18} />}
                        size="sm"
                        colorScheme="red"
                        onClick={() => onDelete(opo._id)}
                        aria-label="Delete OPO"
                      />
                    )}
                  </HStack>
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
      <HStack paddingTop={"60px"} spacing={2} justify="center">
        <IconButton
          icon={<ChevronLeftIcon />}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          isDisabled={page === 1}
          colorScheme="purple"
          variant="outline"
          borderRadius="full"
          aria-label="Previous page"
          _hover={{
            transform: "scale(1.1)",
          }}
        />

        <Badge
          colorScheme="purple"
          fontSize="md"
          px={4}
          py={2}
          borderRadius="full"
        >
          {page} / {totalPages}
        </Badge>

        <IconButton
          icon={<ChevronRightIcon />}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          isDisabled={page === totalPages}
          colorScheme="purple"
          variant="outline"
          borderRadius="full"
          aria-label="Next page"
          _hover={{
            transform: "scale(1.1)",
          }}
        />
      </HStack>
    </Box>
  );
};

OPOTable.propTypes = {
  opos: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      serial: PropTypes.string,
      number: PropTypes.string,
      date: PropTypes.string.isRequired,
      status_Ap: PropTypes.string.isRequired,
      items: PropTypes.arrayOf(PropTypes.object),
    })
  ).isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onExportPDF: PropTypes.func.isRequired,
};

// Main Component
const OPOSystem = () => {
  const [opos, setOpos] = useState([]);
  const [selectedOpo, setSelectedOpo] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isPdfOpen,
    onOpen: onPdfOpen,
    onClose: onPdfClose,
  } = useDisclosure();
  const toast = useToast();
  const pageSize = 30;
  const [page, setPage] = useState(1);
  const shortDesc = (desc) => {
    if (!desc) return "-"; // ถ้าไม่มีค่า ให้คืนเครื่องหมายขีด
    return desc.length > 7 ? desc.substring(0, 7) + "..." : desc;
  };
  // Form state
  const [formData, setFormData] = useState({
    id: null,
    serial: "",
    date: new Date().toISOString().split("T")[0],
    status_Ap: "PENDING",
    requester: "",
    manager: "",
    createdBy: "",
    items: [],
    status: "unpaid",
    role: "",
  });

  const [itemForm, setItemForm] = useState({
    description: "",
    paymentMethod: "cash",
    currency: "LAK",
    amount: "",
    notes: "",
    reason: "",
  });

  // API Functions with improved error handling
  const fetchOPOs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/opo`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setOpos(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [toast]);
  const saveOpo = useCallback(async () => {
    if (!formData.serial || formData.items.length === 0) {
      toast({
        title: "ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບຖ້ວນ",
        description: "ຕ້ອງລະບຸຂໍ້ມູນໃຫ້ຄົບຖ້ວນ",
        status: "warning",
        duration: 3000,
      });
      return;
    }
    if (
      formData.items.some(
        (item) => !item.description || !item.amount || !item.reason
      )
    ) {
      toast({
        title: "ກະລຸນາປ້ອນຂໍ້ມູນລາຍການໃຫ້ຄົບ",
        description: "ລາຍການທຸກລາຍການຕ້ອງມີ ລາຍລະອຽດ, ຈຳນວນເງິນ, ແລະ ສາເຫດ",
        status: "warning",
        duration: 3000,
      });
      return;
    }
    const sanitizedData = {
      ...formData,
      serial: sanitizeInput(formData.serial),
      createdBy: sanitizeInput(formData.createdBy),
      requester: sanitizeInput(formData.requester),
      manager: sanitizeInput(formData.manager),
      items: formData.items.map((item) => ({
        ...item,
        description: sanitizeInput(item.description),
        reason: sanitizeInput(item.reason),
        notes: sanitizeInput(item.notes),
        amount: parseFloat(item.amount) || 0,
      })),
      id: selectedOpo?._id,
      createdAt: selectedOpo?.createdAt || new Date().toISOString(),
    };

    try {
      const token = localStorage.getItem("token");

      const url = selectedOpo
        ? `${API_BASE_URL}/opo/${sanitizedData.id}`
        : `${API_BASE_URL}/opo`;

      const response = await fetch(url, {
        method: selectedOpo ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(sanitizedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast({
          title: "ເກີດຂໍ້ຜິດພາດ",
          description: errorData.message,
          status: "warning",
          duration: 3000,
        });
      } else {
        toast({
          title: selectedOpo ? "ອັບເດດສຳເລັດ" : "ບັນທຶກສຳເລັດ",
          status: "success",
          duration: 2000,
        });
      }

      await fetchOPOs();
      onClose();
      resetForm();
    } catch (error) {
      console.error("Save error:", error);

      await fetchOPOs();
      onClose();
      resetForm();
      toast({
        title: "ບັນທຶກໃນທ້ອງຖິ່ນ",
        description: "ບໍ່ສາມາດເຊື່ອມຕໍ່ເຊີເວີ, ບັນທຶກໄວ້ໃນທ້ອງຖິ່ນແລ້ວ",
        status: "warning",
        duration: 3000,
      });
    }
  }, [formData, selectedOpo, fetchOPOs, toast, onClose]);

  const deleteOpo = useCallback(
    async (id) => {
      if (!window.confirm("ທ່ານຕ້ອງການລຶບ OPO ນີ້ບໍ່?")) return;

      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE_URL}/opo/${id}`, {
          method: "DELETE",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error("Failed to delete");

        await fetchOPOs();
        toast({
          title: "ລຶບສຳເລັດ",
          status: "success",
          duration: 2000,
        });
      } catch (error) {
        console.error("Delete error:", error);
        await fetchOPOs();
        toast({
          title: "ລຶບສຳເລັດ",
          description: "ລຶບຈາກທ້ອງຖິ່ນ",
          status: "info",
          duration: 2000,
        });
      }
    },
    [fetchOPOs, toast]
  );

  const resetForm = () => {
    setFormData({
      serial: "",
      date: new Date().toISOString().split("T")[0],
      status_Ap: "PENDING",
      status: "paid",
      requester: "",
      manager: "",
      createdBy: "",
      items: [],
    });
    setItemForm({
      description: "",
      paymentMethod: "cash",
      currency: "LAK",
      amount: "",
      notes: "",
      reason: "",
    });
    setSelectedOpo(null);
  };

  const addItem = () => {
    if (!itemForm.description || !itemForm.amount || !itemForm.reason) {
      toast({
        title: "ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບ",
        description: "ຕ້ອງມີ: ລາຍລະອຽດ, ຈຳນວນເງິນ, ແລະ ສາເຫດ",
        status: "warning",
        duration: 2000,
      });
      return;
    }

    setFormData({
      ...formData,
      items: [...formData.items, { ...itemForm, id: Date.now() }],
    });

    setItemForm({
      description: "",
      paymentMethod: "cash",
      currency: "LAK",
      amount: "",
      notes: "",
      reason: "",
    });
  };
  const removeItem = (id) => {
    try {
      // if (formData.items.length === 1) {
      //   toast({
      //     title: "ບໍ່ສາມາດລົບລາຍການໄດ້ ຕ້ອງມີລາຍການ 1 ລາຍການຄົງໄວ້",
      //     description: "ບໍ່ອະນຸຍາດໃຫ້ລົບ",
      //     status: "warning",
      //     duration: 3000,
      //   });
      //   return;
      // }
      const endpoint = `${import.meta.env.VITE_API_URL}/api/opo/opoId/${
        formData.id
      }/item/${id}`;
      const token = localStorage.getItem("token");
      fetch(endpoint, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to delete item");
          }
          return response.json();
        })
        .then(() => {
          toast({
            title: "ລຶບລາຍການສຳເລັດ",
            status: "success",
            duration: 2000,
          });
          fetchOPOs();
          setFormData({
            ...formData,
            items: formData.items.filter((item) => item._id !== id),
          });
        })
        .catch((error) => {
          fetchOPOs();
          setFormData({
            ...formData,
            items: formData.items.filter((item) => item._id !== id),
          });
          console.error("Remove item error:", error);
        });
    } catch (error) {
      console.error("Remove item error:", error);
    }
  };

  const editOpo = (opo) => {
    setSelectedOpo(opo);
    setFormData({
      id: opo._id || "",
      serial: opo.serial || opo.number || "",
      date: opo.date,
      status_Ap: opo.status_Ap,
      requester: opo.requester || "",
      manager: opo.manager || "",
      createdBy: opo.createdBy || "",
      items: opo.items || [],
      role: opo.userId.role || "",
      status: opo?.status || "",
    });
    onOpen();
  };
  const filteredOpos = useMemo(
    () =>
      opos.filter((opo) => {
        const matchSearch =
          searchTerm === "" ||
          (opo.items || []).some(
            (item) =>
              item.description
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
              item.notes?.toLowerCase().includes(searchTerm.toLowerCase())
          ) ||
          (opo.serial || opo.number || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase());

        const matchStatus =
          filterStatus === "all" || opo.status_Ap === filterStatus;
        const matchDate =
          (!filterDateFrom || opo.date >= filterDateFrom) &&
          (!filterDateTo || opo.date <= filterDateTo);
        return matchSearch && matchStatus && matchDate;
      }),
    [opos, searchTerm, filterStatus, filterDateFrom, filterDateTo]
  );
  const totalPages = Math.ceil(filteredOpos.length / pageSize);
  const pageData = useMemo(() => {
    const s = (page - 1) * pageSize;
    return filteredOpos.slice(s, s + pageSize);
  }, [filteredOpos, page]);
  const exportToCSV = () => {
    const csvData = [
      [
        "ເລກທີ",
        "ວັນທີ",
        "ສະຖານະ",
        "ລາຍລະອຽດ",
        "ວິທີຊຳລະ",
        "ສະກຸນເງິນ",
        "ຈຳນວນເງິນ",
        "ສາເຫດ",
        "ໝາຍເຫດ",
        "ຜູ້ຮ້ອງຂໍ",
        "ຜູ້ຈັດການ",
        "ຜູ້ສ້າງ",
      ],
      ...filteredOpos.flatMap((opo) =>
        (opo.items || []).map((item) => [
          opo.serial || opo.number,
          opo.date,
          STATUS_TEXTS[opo.status_Ap] || opo.status_Ap,
          item.description,
          PAYMENT_METHODS[item.paymentMethod],
          item.currency,
          item.amount,
          item.reason || "",
          item.notes || "",
          opo.requester || "",
          opo.manager || "",
          opo.createdBy || "",
        ])
      ),
    ];

    const csvContent = csvData
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `OPO_Export_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast({
      title: "ສົ່ງອອກສຳເລັດ",
      status: "success",
      duration: 2000,
    });
  };

  const exportPDF = (opo) => {
    setSelectedOpo(opo);
    setSelectedItems([]);
    onPdfOpen();
  };
  const summaryOPO = {
    PENDING: {
      count: opos.filter((item) => item.status_Ap === "PENDING").length,
      total: opos
        .filter((item) => item.status_Ap === "PENDING")
        .reduce((sum, item) => sum + item.amount, 0),
    },
    APPROVED: {
      count: opos.filter((item) => item.status_Ap === "APPROVED").length,
      total: opos
        .filter((item) => item.status_Ap === "APPROVED")
        .reduce((sum, item) => sum + item.amount, 0),
    },
    CANCELLED: {
      count: opos.filter((item) => item.status_Ap === "CANCELLED").length,
      total: opos
        .filter((item) => item.status_Ap === "CANCELLED")
        .reduce((sum, item) => sum + item.amount, 0),
    },
  };
  const generatePDF = () => {
    const itemsToExport =
      selectedItems.length > 0
        ? selectedOpo.items.filter((item) => selectedItems.includes(item._id))
        : selectedOpo.items;

    if (itemsToExport.length === 0) {
      toast({
        title: "ກະລຸນາເລືອກລາຍການ",
        status: "warning",
        duration: 2000,
      });
      return;
    }

    // Calculate totals by currency
    const totals = {};
    itemsToExport.forEach((item) => {
      const currency = item.currency || "LAK";
      const amount = parseFloat(item.amount || 0);
      totals[currency] = (totals[currency] || 0) + amount;
    });

    // Create formatted content for PDF
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
<!DOCTYPE html>
<html lang="lo">
<head>
  <meta charset="UTF-8">
  <title>ໃບສັ່ງຊື້ (PO) - Print Template</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
   @page {
      size: A4 landscape;
      margin: 8mm 10mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Noto Sans Lao', 'Phetsarath OT', sans-serif;
      font-size: 8.5pt;
      line-height: 1.15;
      color: #000;
      background: #fff;
      padding: 0;
    }

    .document {
      width: 100%;
      margin: 0 auto;
      background: white;
    }

    .header-band {
      height: 4px;
      background: linear-gradient(90deg, #1a202c 0%, #4a5568 50%, #1a202c 100%);
      margin-bottom: 8px;
    }

    .document-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 6px;
      margin-bottom: 8px;
      border-bottom: 2px solid #1a202c;
    }

    .company-section {
      flex: 1;
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .company-logo {
      width: 55px;
      height: 55px;
      background: #1a202c;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      color: white;
      font-weight: bold;
      border: 2px solid #2d3748;
    }

    .company-details {
      flex: 1;
    }

    .company-name {
      font-size: 13pt;
      font-weight: 700;
      color: #1a202c;
      margin-bottom: 3px;
    }

    .contact-section {
      font-size: 7.5pt;
      color: #2d3748;
      line-height: 1.3;
    }

    .national-header {
      flex: 1.2;
      text-align: center;
      padding: 0 10px;
    }

    .doc-reference {
      flex: 1;
      text-align: right;
      font-size: 7pt;
      color: #4a5568;
    }

    .document-title {
      text-align: center;
      font-size: 17pt;
      font-weight: 700;
      color: #1a202c;
      margin-bottom: 2px;
    }

    .document-subtitle {
      text-align: center;
      font-size: 10pt;
      color: #4a5568;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .doc-info {
      background: #f7fafc;
      border: 2px solid #1a202c;
      border-radius: 4px;
      padding: 8px 10px;
      margin-bottom: 8px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 4px 10px;
    }

    .info-row {
      display: flex;
      align-items: center;
      padding: 3px 6px;
      background: white;
      border: 1px solid #cbd5e0;
      border-radius: 2px;
    }

    .section-title {
      font-size: 9pt;
      font-weight: 700;
      margin: 6px 0 4px 0;
      padding: 4px 8px;
      background: #1a202c;
      color: white;
      border-radius: 3px;
      text-transform: uppercase;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      border: 2px solid #1a202c;
      font-size: 7.5pt;
      page-break-inside: auto;
    }

    thead {
      background: #e2e8f0;
    }

    th {
      padding: 5px 3px;
      border: 1px solid #1a202c;
      text-align: left;
      color: #1a202c;
    }

    td {
      padding: 4px 3px;
      border: 1px solid #2d3748;
      font-size: 7pt;
    }

    tbody tr:nth-child(even) {
      background: #f7fafc;
    }

    .total-section {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 6px;
      margin-bottom: 6px;
      page-break-inside: avoid;
    }

    .total-item {
      padding: 6px 12px;
      background: #1a202c;
      color: white;
      border-radius: 3px;
      min-width: 150px;
    }

    .signatures {
      background: #f7fafc;
      border: 2px solid #1a202c;
      border-radius: 4px;
      padding: 8px;
      margin-top: 6px;
      page-break-before: auto;
      page-break-inside: avoid;
    }

    .signature-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }

    .signature-cell {
      text-align: center;
      background: white;
      border: 1.5px solid #cbd5e0;
      border-radius: 3px;
      min-height: 130px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .footer {
      margin-top: 6px;
      text-align: center;
      font-size: 6pt;
      color: #718096;
    }

    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }

      thead {
        display: table-header-group;
      }

      tr, td, th {
        page-break-inside: avoid;
      }

      .total-section, .signatures {
        page-break-before: auto !important;
        page-break-inside: avoid !important;
        page-break-after: auto !important;
      }

      tbody tr:nth-child(even) {
        background: #f7fafc !important;
        -webkit-print-color-adjust: exact !important;
      }

      .section-title,
      .total-item {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>
  <div class="document">
    <div class="header-band"></div>
    
    <!-- Header -->
    <div class="document-header">
      <div class="company-section">
        <div class="company-logo">C</div>
        <div class="company-details">
          <div class="company-name">${
            user?.companyInfo?.name || "Company Name"
          }</div>
          <div class="contact-section">
              <div>${user?.companyInfo?.address || ""}</div>
      <div>${user?.companyInfo?.phone || ""}</div>
          </div>
        </div>
      </div>

      <div class="national-header">
        <div class="header-line1">
          ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ
        </div>
        <div class="header-line2">
          ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ
        </div>
      </div>

      <div class="doc-reference">
 <div class="signature-date">ວັນທີ / Date:<br>${formatDate(new Date())}</div>
      </div>
    </div>

    <!-- Title -->
    <div class="document-title">ໃບສັ່ງຈ່າຍ</div>
    <div class="document-subtitle">Office Payment Order(OPO)</div>

    <!-- Document Info -->
    <div class="doc-info">
      <div class="info-grid">
        <div class="info-row">
          <div class="info-label">ເລກທີ / No.:</div>
          <div class="info-value"><strong>${
            selectedOpo.serial || selectedOpo.number
          }</strong></div>
        </div>
        <div class="info-row">
          <div class="info-label">ຜູ້ຮ້ອງຂໍ:</div>
          <div class="info-value">${selectedOpo.requester || "-"}</div>
        </div>
        <div class="info-row">
          <div class="info-label">ວັນທີ / Date:</div>
          <div class="info-value">${formatDate(selectedOpo.date)}</div>
        </div>
        <div class="info-row">
          <div class="info-label">ພະແນກບັນຊີສ່ວນກາງ:</div>
          <div class="info-value">${selectedOpo.manager || "-"}</div>
        </div>
        <div class="info-row">
          <div class="info-label">ສະຖານະ / Status:</div>
          <div class="info-value">
            <span class="status-badge">${
              STATUS_TEXTS[selectedOpo.status_Ap] || selectedOpo.status_Ap
            }</span>
          </div>
        </div>
        <div class="info-row">
          <div class="info-label">ຜູ້ຈັດການ:</div>
          <div class="info-value">${selectedOpo.createdBy || "-"}</div>
        </div>
      </div>
    </div>

    <!-- Items Table -->
    <div class="section-title">ລາຍການຈ່າຍເງິນ / Payment Items</div>
    <table>
      <thead>
        <tr>
          <th style="width: 4%;">ລຳດັບ<br>No.</th>
          <th style="width: 28%;">ລາຍລະອຽດ<br>Description</th>
          <th style="width: 14%;">ວິທີຊຳລະ<br>Payment Method</th>
          <th style="width: 10%;" class="center">ສະກຸນເງິນ<br>Currency</th>
          <th style="width: 20%;">ຈຳນວນເງິນ<br>Amount</th>
          <th style="width: 24%;">ໝາຍເຫດ<br>Note</th>
        </tr>
      </thead>
      <tbody>
        ${itemsToExport
          .slice()
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .map(
            (item, index) => `
        <tr>
          <td class="center"><strong>${index + 1}</strong></td>
          <td>${item.description || "-"}</td>
          <td>${
            PAYMENT_METHODS[item.paymentMethod] || item.paymentMethod || "-"
          }</td>
          <td class="center"><strong>${item.currency || "LAK"}</strong></td>
          <td class="number">${parseFloat(
            item.amount || 0
          ).toLocaleString()}</td>
          <td>${item?.notes || "-"}</td>
        </tr>
        `
          )
          .join("")}
      </tbody>
    </table>

    <!-- Total Section -->
    <div class="total-section">
      ${Object.entries(totals)
        .map(
          ([currency, amount]) => `
      <div class="total-item">
        <div class="total-title">ຍອດລວມ / Total (${currency}):</div>
        <div class="total-amount">${amount.toLocaleString()} ${currency}</div>
      </div>
      `
        )
        .join("")}
    </div>

    <!-- Signatures -->
    <div class="signatures">
      <div class="signature-title">ລາຍເຊັນຜູ້ກ່ຽວຂ້ອງ / Authorized Signatures</div>
      <div class="signature-grid">
        <div class="signature-cell">
          <span class="signature-label">ຜູ້ຮ້ອງຂໍ<br>Requester</span>
          <div class="signature-area">
            <div class="signature-line">
              <div class="signature-name">${selectedOpo.requester || ""}</div>
          
            </div>
          </div>
        </div>
        <div class="signature-cell">
          <span class="signature-label">ພະແນກບັນຊີສ່ວນກາງ<br>A&F Dept.</span>
          <div class="signature-area">
            <div class="signature-line">
              <div class="signature-name">${selectedOpo.manager || ""}</div>
            </div>
          </div>
        </div>
        <div class="signature-cell">
          <span class="signature-label">ຜູ້ຈັດການ<br>Manager</span>
          <div class="signature-area">
            <div class="signature-line">
              <div class="signature-name">${selectedOpo.createdBy || ""}</div>

            </div>
          </div>
        </div>
        <div class="signature-cell">
          <span class="signature-label">CEO & CFO<br>Approved By</span>
          <div class="signature-area">
            <div class="signature-line">
              <div class="signature-name"></div>

            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      ເອກະສານນີ້ຖືກສ້າງໂດຍລະບົບ OPO | Generated by OPO System - ${formatDate(
        new Date()
      )}
    </div>
  </div>
</body>
</html>
  `);
    printWindow.document.close();

    printWindow.onload = function () {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 300);
    };

    toast({
      title: "ກຳລັງສົ່ງອອກ PDF",
      description: "ກະລຸນາເລືອກ 'Save as PDF' ໃນໜ້າຕ່າງການພິມ",
      status: "info",
      duration: 3000,
    });
  };

  useEffect(() => {
    fetchOPOs();
  }, [fetchOPOs]);

  return (
    <ChakraProvider theme={theme}>
      <Box p={6} maxW="1400px" mx="auto" bg="gray.50" minH="100vh">
        <Heading mb={6} color="blue.600">
          ລະບົບ OPO (Outgoing Payment Order)
        </Heading>

        {error && (
          <Alert status="error" mb={4}>
            <AlertIcon />
            <AlertTitle>ຂໍ້ຜິດພາດ!</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && (
          <Flex justify="center" my={6}>
            <Spinner size="xl" color="blue.500" thickness="4px" />
          </Flex>
        )}

        {/* Search and Filter */}
        <Box bg="white" p={4} borderRadius="lg" shadow="sm" mb={6}>
          <Flex gap={4} flexWrap="wrap">
            <Input
              fontFamily="Noto Sans Lao, sans-serif"
              flex="1"
              minW="250px"
              placeholder="ຄົ້ນຫາເລກທີ, ລາຍລະອຽດ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            {user?.role === "admin" ? (
              <FormControl>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  size="sm"
                  bg="gray.50"
                >
                  {Object.entries(STATUS_TEXTS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                size="sm"
                bg="gray.50"
              >
                {Object.entries(STATUS_TEXTS_staff).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            )}
            <Input
              fontFamily="Noto Sans Lao, sans-serif"
              type="date"
              w="170px"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
            />
            <Input
              fontFamily="Noto Sans Lao, sans-serif"
              type="date"
              w="170px"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
            />
            <Button
              fontFamily="Noto Sans Lao, sans-serif"
              leftIcon={<Plus size={20} />}
              colorScheme="blue"
              onClick={() => {
                resetForm();
                onOpen();
              }}
            >
              ສ້າງ OPO ໃໝ່
            </Button>
            {/* <Button
              fontFamily="Noto Sans Lao, sans-serif"
              leftIcon={<Download size={20} />}
              colorScheme="teal"
              onClick={exportToCSV}
              isDisabled={filteredOpos.length === 0}
            >
              ສົ່ງອອກ CSV
            </Button> */}
          </Flex>
        </Box>
        <Card w="full">
          <CardBody>
            <Heading fontFamily="Noto Sans Lao, sans-serif" size="md" mb={4}>
              📑 ສະຫຼຸບຕາມປະເພດ
            </Heading>
            <Grid templateColumns="repeat(3, 1fr)" gap={4}>
              {Object.keys(STATUS_TEXTS).map((statusKey) => {
                const statusText = STATUS_TEXTS[statusKey];
                const data = summaryOPO[statusKey];

                return (
                  <Card key={statusKey} bg="blue.50">
                    <CardBody>
                      <Stat>
                        <StatLabel
                          fontFamily="Noto Sans Lao, sans-serif"
                          fontSize="sm"
                        >
                          {statusText}
                        </StatLabel>
                        <Text
                          fontFamily="Noto Sans Lao, sans-serif"
                          fontSize="xs"
                          mt={1}
                        >
                          {data?.count} ລາຍການ
                          {/* {new Intl.NumberFormat("lo-LA").format(data.total)} */}
                        </Text>
                      </Stat>
                    </CardBody>
                  </Card>
                );
              })}
            </Grid>
          </CardBody>
        </Card>
        {/* OPO List */}
        {!loading && (
          <OPOTable
            fetchOPOs={fetchOPOs}
            toast={toast}
            user={user}
            opos={pageData}
            totalPages={totalPages}
            onEdit={editOpo}
            onDelete={deleteOpo}
            onExportPDF={exportPDF}
            setPage={setPage}
            page={page}
          />
        )}

        {/* Create/Edit Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="4xl">
          <ModalOverlay />
          <ModalContent maxH="90vh" overflow="auto">
            <ModalHeader fontFamily="Noto Sans Lao, sans-serif">
              {selectedOpo ? "ແກ້ໄຂ OPO" : "ສ້າງ OPO ໃໝ່"}
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4} align="stretch">
                <HStack>
                  <FormControl isRequired>
                    <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                      ເລກທີ OPO
                    </FormLabel>
                    <Input
                      fontFamily="Noto Sans Lao, sans-serif"
                      value={formData.serial}
                      onChange={(e) =>
                        setFormData({ ...formData, serial: e.target.value })
                      }
                      placeholder="OPO-2025-001"
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                      ວັນທີ
                    </FormLabel>
                    <Input
                      fontFamily="Noto Sans Lao, sans-serif"
                      type="date"
                      value={
                        new Date(formData.date).toISOString().split("T")[0]
                      }
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                      ສະຖານະ
                    </FormLabel>
                    {user?.role === "admin" ? (
                      <Select
                        value={formData.status_Ap} // สมมติ user มี field status
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            status_Ap: e.target.value,
                          })
                        }
                        size="sm"
                        bg="gray.50"
                      >
                        {Object.entries(STATUS_TEXTS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Select
                        value={formData.status_Ap} // สมมติ user มี field status
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            status_Ap: e.target.value,
                          })
                        }
                        size="sm"
                        bg="gray.50"
                      >
                        {Object.entries(STATUS_TEXTS_staff).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          )
                        )}
                      </Select>
                    )}
                  </FormControl>
                </HStack>
                <FormControl isRequired>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ສະຖານະການຊຳລະເງິນ
                  </FormLabel>
                  <Select
                    fontFamily="Noto Sans Lao, sans-serif"
                    value={formData.status} // สมมติ user มี field status
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value,
                      })
                    }
                  >
                    <option value="unpaid">ຍັງບໍ່ຊຳລະ</option>
                    <option value="paid">ຊຳລະແລ້ວ</option>
                  </Select>
                </FormControl>
                <HStack>
                  <FormControl>
                    <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                      ຜູ້ຮ້ອງຂໍ
                    </FormLabel>
                    <Input
                      fontFamily="Noto Sans Lao, sans-serif"
                      value={formData.requester}
                      onChange={(e) =>
                        setFormData({ ...formData, requester: e.target.value })
                      }
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                      ຜູ້ຈັດການ
                    </FormLabel>
                    <Input
                      fontFamily="Noto Sans Lao, sans-serif"
                      value={formData.manager}
                      onChange={(e) =>
                        setFormData({ ...formData, manager: e.target.value })
                      }
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                      ຜູ້ສ້າງ
                    </FormLabel>
                    <Input
                      fontFamily="Noto Sans Lao, sans-serif"
                      value={formData.createdBy}
                      onChange={(e) =>
                        setFormData({ ...formData, createdBy: e.target.value })
                      }
                    />
                  </FormControl>
                </HStack>

                <Divider />
                <Heading fontFamily="Noto Sans Lao, sans-serif" size="md">
                  ເພີ່ມລາຍການ
                </Heading>

                <FormControl isRequired>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ລາຍລະອຽດ
                  </FormLabel>
                  <Textarea
                    fontFamily="Noto Sans Lao, sans-serif"
                    value={itemForm.description}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, description: e.target.value })
                    }
                    placeholder="ລາຍລະອຽດການຈ່າຍເງິນ..."
                  />
                </FormControl>

                <HStack>
                  <FormControl>
                    <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                      ວິທີຊຳລະ
                    </FormLabel>
                    <Select
                      fontFamily="Noto Sans Lao, sans-serif"
                      value={itemForm.paymentMethod}
                      onChange={(e) =>
                        setItemForm({
                          ...itemForm,
                          paymentMethod: e.target.value,
                        })
                      }
                    >
                      {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                      ສະກຸນເງິນ
                    </FormLabel>
                    <Select
                      fontFamily="Noto Sans Lao, sans-serif"
                      value={itemForm.currency}
                      onChange={(e) =>
                        setItemForm({ ...itemForm, currency: e.target.value })
                      }
                    >
                      {CURRENCIES.map((currency) => (
                        <option key={currency} value={currency}>
                          {currency}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                      ຈຳນວນເງິນ
                    </FormLabel>
                    <Input
                      fontFamily="Noto Sans Lao, sans-serif"
                      type="number"
                      step="0.01"
                      min="0"
                      value={itemForm.amount}
                      onChange={(e) =>
                        setItemForm({ ...itemForm, amount: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  </FormControl>
                </HStack>

                <FormControl isRequired>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ສາເຫດ
                  </FormLabel>
                  <Input
                    fontFamily="Noto Sans Lao, sans-serif"
                    value={itemForm.reason}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, reason: e.target.value })
                    }
                    placeholder="ສາເຫດການຈ່າຍ..."
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ໝາຍເຫດ
                  </FormLabel>
                  <Textarea
                    fontFamily="Noto Sans Lao, sans-serif"
                    value={itemForm.notes}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, notes: e.target.value })
                    }
                    placeholder="ໝາຍເຫດເພີ່ມເຕີມ..."
                  />
                </FormControl>

                <Button
                  fontFamily="Noto Sans Lao, sans-serif"
                  colorScheme="green"
                  onClick={addItem}
                  leftIcon={<Plus size={18} />}
                >
                  ເພີ່ມລາຍການ
                </Button>

                {formData.items.length > 0 && (
                  <Box>
                    <Divider my={4} />
                    <Heading
                      fontFamily="Noto Sans Lao, sans-serif"
                      size="sm"
                      mb={3}
                    >
                      ລາຍການທັງໝົດ ({formData.items.length})
                    </Heading>
                    {formData.items.map((item) => (
                      <OPOItem
                        key={item._id}
                        item={item}
                        onRemove={removeItem}
                      />
                    ))}
                    <Box mt={4} p={3} bg="blue.50" borderRadius="md">
                      <Text
                        fontFamily="Noto Sans Lao, sans-serif"
                        fontWeight="bold"
                        mb={2}
                      >
                        ຍອດລວມ:
                      </Text>
                      {Object.entries(groupByCurrency(formData.items)).map(
                        ([currency, amount]) => (
                          <Text
                            fontFamily="Noto Sans Lao, sans-serif"
                            key={currency}
                            fontSize="lg"
                            fontWeight="bold"
                            color="blue.600"
                          >
                            {amount.toLocaleString()} {currency}
                          </Text>
                        )
                      )}
                    </Box>
                  </Box>
                )}
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button
                fontFamily="Noto Sans Lao, sans-serif"
                variant="ghost"
                mr={3}
                onClick={onClose}
              >
                ຍົກເລີກ
              </Button>
              <Button
                fontFamily="Noto Sans Lao, sans-serif"
                colorScheme="blue"
                onClick={saveOpo}
                isDisabled={!formData.serial || formData.items.length === 0}
              >
                ບັນທຶກ
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* PDF Preview Modal */}
        {selectedOpo && (
          <Modal isOpen={isPdfOpen} onClose={onPdfClose} size="6xl">
            <ModalOverlay />
            <ModalContent maxH="90vh" overflow="auto">
              <ModalHeader fontFamily="Noto Sans Lao, sans-serif">
                ສົ່ງອອກ PDF - {selectedOpo.serial || selectedOpo.number}
              </ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <Box mb={4}>
                  <Text
                    fontFamily="Noto Sans Lao, sans-serif"
                    fontWeight="bold"
                    mb={2}
                  >
                    ເລືອກລາຍການທີ່ຕ້ອງການສົ່ງອອກ:
                  </Text>
                  {(selectedOpo.items || []).map((item) => (
                    <Checkbox
                      fontFamily="Noto Sans Lao, sans-serif"
                      key={item._id}
                      isChecked={selectedItems.includes(item._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems([...selectedItems, item._id]);
                        } else {
                          setSelectedItems(
                            selectedItems.filter((id) => id !== item._id)
                          );
                        }
                      }}
                      mb={2}
                      display="block"
                    >
                      {item.description} -{" "}
                      {parseFloat(item.amount || 0).toLocaleString()}{" "}
                      {item.currency}
                    </Checkbox>
                  ))}
                  <Button
                    fontFamily="Noto Sans Lao, sans-serif"
                    size="sm"
                    mt={2}
                    colorScheme="blue"
                    variant="outline"
                    onClick={() => {
                      if (
                        selectedItems.length ===
                        (selectedOpo.items || []).length
                      ) {
                        setSelectedItems([]);
                      } else {
                        setSelectedItems(
                          (selectedOpo.items || []).map((i) => i._id)
                        );
                      }
                    }}
                  >
                    {selectedItems.length === (selectedOpo.items || []).length
                      ? "ຍົກເລີກທັງໝົດ"
                      : "ເລືອກທັງໝົດ"}
                  </Button>
                </Box>

                <Box
                  id="pdf-preview"
                  bg="white"
                  p={8}
                  border="1px solid #e2e8f0"
                >
                  {/* Info */}
                  <Flex
                    justify="space-between"
                    mb={6}
                    pb={4}
                    borderBottom="2px solid #e2e8f0"
                  >
                    <Box>
                      <HStack fontFamily="Noto Sans Lao, sans-serif" mb={1}>
                        <Text fontFamily="Noto Sans Lao, sans-serif">
                          ເລກທີ:
                        </Text>{" "}
                        <Text fontFamily="Noto Sans Lao, sans-serif">
                          {selectedOpo.serial || selectedOpo.number}
                        </Text>
                      </HStack>
                      <HStack fontFamily="Noto Sans Lao, sans-serif">
                        <Text
                          fontFamily="Noto Sans Lao, sans-serif"
                          fontWeight="bold"
                        >
                          ວັນທີ:
                        </Text>{" "}
                        <Text fontFamily="Noto Sans Lao, sans-serif">
                          {new Date(selectedOpo.date).toLocaleDateString(
                            "lo-LA"
                          )}
                        </Text>
                      </HStack>
                    </Box>
                    <Box textAlign="right">
                      <Badge
                        fontFamily="Noto Sans Lao, sans-serif"
                        colorScheme={STATUS_COLORS[selectedOpo.status_Ap]}
                        fontSize="md"
                        p={2}
                        borderRadius="md"
                      >
                        {STATUS_TEXTS[selectedOpo.status_Ap]}
                      </Badge>
                    </Box>
                  </Flex>

                  {/* Items */}
                  <Box mb={6}>
                    <Heading
                      fontFamily="Noto Sans Lao, sans-serif"
                      size="md"
                      mb={3}
                      color="blue.700"
                    >
                      ລາຍການຈ່າຍເງິນ
                    </Heading>
                    <Table variant="simple" size="sm">
                      <Thead bg="gray.100">
                        <Tr>
                          <Th fontFamily="Noto Sans Lao, sans-serif">ລຳດັບ</Th>
                          <Th fontFamily="Noto Sans Lao, sans-serif">
                            ລາຍລະອຽດ
                          </Th>
                          <Th fontFamily="Noto Sans Lao, sans-serif">
                            ວິທີຊຳລະ
                          </Th>
                          <Th fontFamily="Noto Sans Lao, sans-serif">
                            ສະກຸນເງິນ
                          </Th>
                          <Th fontFamily="Noto Sans Lao, sans-serif" isNumeric>
                            ຈຳນວນເງິນ
                          </Th>
                          <Th fontFamily="Noto Sans Lao, sans-serif">ສາເຫດ</Th>
                          <Th fontFamily="Noto Sans Lao, sans-serif">ໝາຍເຫດ</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {(selectedItems.length > 0
                          ? (selectedOpo.items || []).filter((item) =>
                              selectedItems.includes(item._id)
                            )
                          : selectedOpo.items || []
                        )
                          .slice() // สร้างสำเนา array เพื่อไม่แก้ตัวต้นฉบับ
                          .sort((a, b) => new Date(b.date) - new Date(a.date)) // b - a = ใหม่ → เก่า
                          .map((item, index) => (
                            <Tr key={item.id}>
                              <Td fontFamily="Noto Sans Lao, sans-serif">
                                {index + 1}
                              </Td>
                              <Td fontFamily="Noto Sans Lao, sans-serif">
                                <Text>{item.description}</Text>
                              </Td>
                              <Td fontFamily="Noto Sans Lao, sans-serif">
                                {PAYMENT_METHODS[item.paymentMethod]}
                              </Td>
                              <Td fontFamily="Noto Sans Lao, sans-serif">
                                {item.currency}
                              </Td>
                              <Td
                                fontFamily="Noto Sans Lao, sans-serif"
                                isNumeric
                                fontWeight="bold"
                              >
                                {parseFloat(item.amount || 0).toLocaleString()}
                              </Td>
                              <Td fontFamily="Noto Sans Lao, sans-serif">
                                {item.reason}
                              </Td>
                              <Td fontFamily="Noto Sans Lao, sans-serif">
                                {item.notes}
                              </Td>
                            </Tr>
                          ))}
                      </Tbody>
                    </Table>
                  </Box>

                  {/* Total */}
                  <Box mb={6} bg="blue.50" p={4} borderRadius="md">
                    <Heading
                      fontFamily="Noto Sans Lao, sans-serif"
                      size="sm"
                      mb={2}
                      color="blue.700"
                    >
                      ຍອດລວມທັງໝົດ
                    </Heading>
                    {Object.entries(
                      groupByCurrency(
                        selectedItems.length > 0
                          ? (selectedOpo.items || []).filter((item) =>
                              selectedItems.includes(item.id)
                            )
                          : selectedOpo.items || []
                      )
                    ).map(([currency, amount]) => (
                      <Text
                        fontFamily="Noto Sans Lao, sans-serif"
                        key={currency}
                        fontSize="xl"
                        fontWeight="bold"
                        color="blue.600"
                      >
                        {amount.toLocaleString()} {currency}
                      </Text>
                    ))}
                  </Box>
                </Box>
              </ModalBody>
              <ModalFooter>
                <Button
                  fontFamily="Noto Sans Lao, sans-serif"
                  variant="ghost"
                  mr={3}
                  onClick={onPdfClose}
                >
                  ປິດ
                </Button>
                <Button
                  fontFamily="Noto Sans Lao, sans-serif"
                  leftIcon={<Download size={18} />}
                  colorScheme="blue"
                  onClick={generatePDF}
                  isDisabled={
                    selectedItems.length === 0 &&
                    (selectedOpo.items || []).length === 0
                  }
                >
                  Print
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        )}
      </Box>
    </ChakraProvider>
  );
};

export default OPOSystem;
