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
import { Plus, FileText, Trash2, Edit, Download } from "lucide-react";
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

const CURRENCIES = ["LAK", "THB", "USD"];

const API_BASE_URL = "https://a93e81e5545a.ngrok-free.app/api";
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

// Storage utilities with error handling
const storage = {
  async get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Storage get error:", error);
      return null;
    }
  },
  async set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("Storage set error:", error);
      return false;
    }
  },
  async delete(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error("Storage delete error:", error);
      return false;
    }
  },
  async list(prefix) {
    try {
      const keys = Object.keys(localStorage).filter((key) =>
        key.startsWith(prefix)
      );
      return keys;
    } catch (error) {
      console.error("Storage list error:", error);
      return [];
    }
  },
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

const OPOTable = ({ opos, onEdit, onDelete, onExportPDF, user }) => {
  if (opos.length === 0) {
    return (
      <Box bg="white" borderRadius="lg" shadow="sm" p={8} textAlign="center">
        <Text color="gray.500" fontSize="lg">
          ບໍ່ມີຂໍ້ມູນ OPO
        </Text>
      </Box>
    );
  }

  return (
    <Box bg="white" borderRadius="lg" shadow="sm" overflow="hidden">
      <Table>
        <Thead bg="blue.50">
          <Tr>
            <Th>ເລກທີ</Th>
            <Th>ວັນທີ</Th>
            <Th>ຈຳນວນລາຍການ</Th>
            <Th>ຍອດລວມ</Th>
            <Th>ສະຖານະ</Th>
            <Th>ຜູ້ສ້າງ</Th>
            <Th>ຈັດການ</Th>
          </Tr>
        </Thead>
        <Tbody>
          {opos.map((opo) => {
            console.log("opo", opo);
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
                  {(opo.items || []).length} ລາຍການ
                </Td>
                <Td>
                  {Object.entries(totals).map(([currency, amount]) => (
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      key={currency}
                      fontSize="sm"
                    >
                      {amount.toLocaleString()} {currency}
                    </Text>
                  ))}
                </Td>
                <Td>
                  <Badge
                    fontFamily="Noto Sans Lao, sans-serif"
                    colorScheme={STATUS_COLORS[opo.status] || "gray"}
                  >
                    {STATUS_TEXTS[opo.status] || opo.status}
                  </Badge>
                </Td>
                <Td>
                  <Badge fontFamily="Noto Sans Lao, sans-serif">
                    {opo?.staff?.username}
                  </Badge>
                </Td>
                <Td>
                  <HStack spacing={2}>
                    <IconButton
                      icon={<FileText size={18} />}
                      size="sm"
                      colorScheme="green"
                      onClick={() => onExportPDF(opo)}
                      aria-label="Export PDF"
                    />
                    {(user?.role === "admin" ||
                      (user?.role === "staff" &&
                        opo?.status !== "APPROVED")) && (
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
                        opo?.status !== "APPROVED")) && (
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
      status: PropTypes.string.isRequired,
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
  console.log(user);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isPdfOpen,
    onOpen: onPdfOpen,
    onClose: onPdfClose,
  } = useDisclosure();
  const toast = useToast();

  const shortDesc = (desc) => {
    if (!desc) return "-"; // ถ้าไม่มีค่า ให้คืนเครื่องหมายขีด
    return desc.length > 7 ? desc.substring(0, 7) + "..." : desc;
  };
  // Form state
  const [formData, setFormData] = useState({
    id: null,
    serial: "",
    date: new Date().toISOString().split("T")[0],
    status: "PENDING",
    requester: "",
    manager: "",
    createdBy: "",
    items: [],
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
      console.log(data);
      setOpos(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (error) {
      console.error("Fetch error:", error);

      // Fallback to local storage
      try {
        const keys = await storage.list("opo:");
        const allOpos = await Promise.all(
          keys.map(async (key) => {
            const data = await storage.get(key);
            return data;
          })
        );

        const validOpos = allOpos.filter((o) => o !== null);
        setOpos(validOpos.sort((a, b) => new Date(b.date) - new Date(a.date)));

        if (validOpos.length > 0) {
          toast({
            title: "ໃຊ້ຂໍ້ມູນທ້ອງຖິ່ນ",
            description: "ບໍ່ສາມາດເຊື່ອມຕໍ່ເຊີເວີໄດ້, ກຳລັງໃຊ້ຂໍ້ມູນທ້ອງຖິ່ນ",
            status: "warning",
            duration: 3000,
          });
        }
      } catch (storageError) {
        console.error("Storage error:", storageError);
        setError("ບໍ່ສາມາດໂຫຼດຂໍ້ມູນໄດ້");
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const saveOpo = useCallback(async () => {
    if (!formData.serial || formData.items.length === 0) {
      toast({
        title: "ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບຖ້ວນ",
        description: "ຕ້ອງມີເລກທີ ແລະ ລາຍການຢ່າງໜ້ອຍ 1 ລາຍການ",
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
        throw new Error(errorData.message || "Failed to save OPO");
      }

      await fetchOPOs();
      onClose();
      resetForm();
      toast({
        title: selectedOpo ? "ອັບເດດສຳເລັດ" : "ບັນທຶກສຳເລັດ",
        status: "success",
        duration: 2000,
      });
    } catch (error) {
      console.error("Save error:", error);

      // Fallback to local storage
      await storage.set(`opo:${sanitizedData.id}`, sanitizedData);
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

        // Fallback to local storage
        await storage.delete(`opo:${id}`);
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
      status: "PENDING",
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
  console.log(formData);
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
      const endpoint = `https://a93e81e5545a.ngrok-free.app/api/opo/opoId/${formData.id}/item/${id}`;
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
    console.log("opos", opo);
    setSelectedOpo(opo);
    setFormData({
      id: opo._id || "",
      serial: opo.serial || opo.number || "",
      date: opo.date,
      status: opo.status,
      requester: opo.requester || "",
      manager: opo.manager || "",
      createdBy: opo.createdBy || "",
      items: opo.items || [],
      role: opo.userId.role || "",
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
          filterStatus === "all" || opo.status === filterStatus;
        const matchDate =
          (!filterDateFrom || opo.date >= filterDateFrom) &&
          (!filterDateTo || opo.date <= filterDateTo);
        return matchSearch && matchStatus && matchDate;
      }),
    [opos, searchTerm, filterStatus, filterDateFrom, filterDateTo]
  );

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
          STATUS_TEXTS[opo.status] || opo.status,
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
  // สรุป OPO ตามสถานะ
  const summaryOPO = {
    PENDING: {
      count: opos.filter((item) => item.status === "PENDING").length,
      total: opos
        .filter((item) => item.status === "PENDING")
        .reduce((sum, item) => sum + item.amount, 0),
    },
    APPROVED: {
      count: opos.filter((item) => item.status === "APPROVED").length,
      total: opos
        .filter((item) => item.status === "APPROVED")
        .reduce((sum, item) => sum + item.amount, 0),
    },
    CANCELLED: {
      count: opos.filter((item) => item.status === "CANCELLED").length,
      total: opos
        .filter((item) => item.status === "CANCELLED")
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
        <title>ໃບສັ່ງຈ່າຍເງິນ (OPO) - ${
          selectedOpo.serial || selectedOpo.number
        }</title>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm 12mm;
          }

          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Noto Sans Lao', 'Phetsarath OT', sans-serif;
            font-size: 10pt;
            line-height: 1.3;
            color: #000;
            background: #fff;
          }

          .document {
            max-width: 100%;
            margin: 0 auto;
            background: white;
          }

          /* Header - ແບບທາງການ */
          .header {
            text-align: center;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 2px solid #1a202c;
          }

          .company-name {
            font-size: 16pt;
            font-weight: bold;
            margin-bottom: 3px;
            text-transform: uppercase;
            color: #1a202c;
            letter-spacing: 0.5px;
          }

          .document-title {
            font-size: 14pt;
            font-weight: bold;
            margin: 5px 0 2px 0;
            text-transform: uppercase;
            color: #1a202c;
            text-decoration: underline;
            text-underline-offset: 3px;
          }

          .document-subtitle {
            font-size: 10pt;
            color: #4a5568;
            font-weight: 500;
          }

          /* Document Info - ກະທັດຮັດ */
          .doc-info {
            margin: 10px 0;
            border: 2px solid #1a202c;
            padding: 8px 10px;
            background: #f7fafc;
          }

          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 6px;
          }

          .info-row {
            display: flex;
            padding: 3px 0;
            border-bottom: 1px solid #cbd5e0;
          }

          .info-row:last-child {
            border-bottom: none;
          }

          .info-label {
            font-weight: 600;
            width: 130px;
            color: #2d3748;
            font-size: 9pt;
          }

          .info-value {
            flex: 1;
            color: #1a202c;
            font-size: 9pt;
          }

          .status-badge {
            display: inline-block;
            padding: 2px 10px;
            border: 1.5px solid #1a202c;
            font-weight: 600;
            background: #e2e8f0;
            font-size: 8.5pt;
          }

          /* Items Table - ກະທັດຮັດ */
          .section-title {
            font-size: 10pt;
            font-weight: bold;
            margin: 10px 0 6px 0;
            padding: 6px 10px;
            background: #1a202c;
            color: #fff;
            text-transform: uppercase;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0;
            border: 2px solid #1a202c;
            font-size: 9pt;
          }

          thead {
            background: #e2e8f0;
          }

          th {
            font-weight: 600;
            padding: 6px 5px;
            text-align: left;
            font-size: 8.5pt;
            border: 1px solid #1a202c;
            color: #1a202c;
            line-height: 1.2;
          }

          tbody tr {
            background: white;
          }

          tbody tr:nth-child(even) {
            background: #f7fafc;
          }

          td {
            padding: 5px;
            border: 1px solid #2d3748;
            font-size: 8.5pt;
            vertical-align: top;
            color: #1a202c;
          }

          td.number {
            text-align: right;
            font-weight: 600;
          }

          td.center {
            text-align: center;
          }

          /* Total Section - ກະທັດຮັດ */
          .total-section {
            margin: 8px 0 10px 0;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
          }

          .total-item {
            padding: 8px 12px;
            border: 2px solid #1a202c;
            background: #e2e8f0;
            min-width: 180px;
          }

          .total-title {
            font-size: 9pt;
            font-weight: bold;
            margin-bottom: 4px;
            color: #1a202c;
          }

          .total-amount {
            font-size: 12pt;
            font-weight: bold;
            color: #1a202c;
          }

          /* Signatures - ກະທັດຮັດ */
          .signatures {
            margin-top: 12px;
            page-break-inside: avoid;
            border: 2px solid #1a202c;
            padding: 12px;
            background: white;
          }

          .signature-title {
            font-size: 10pt;
            font-weight: bold;
            margin-bottom: 12px;
            text-align: center;
            text-transform: uppercase;
            color: #1a202c;
            padding-bottom: 6px;
            border-bottom: 2px solid #1a202c;
          }

          .signature-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-top: 12px;
          }

          .signature-cell {
            text-align: center;
            padding: 10px 6px;
            border: 1px solid #2d3748;
            background: #f7fafc;
            min-height: 150px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          .signature-label {
            font-weight: 600;
            font-size: 9pt;
            color: #1a202c;
            margin-bottom: 70px;
            display: block;
            text-transform: uppercase;
            line-height: 1.3;
          }

          .signature-area {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
          }

          .signature-line {
            border-top: 1.5px solid #1a202c;
            margin: 0 auto 6px auto;
            width: 95%;
            padding-top: 5px;
          }

          .signature-name {
            font-size: 8.5pt;
            font-weight: 600;
            min-height: 16px;
            color: #1a202c;
          }

          .signature-date {
            font-size: 7.5pt;
            color: #4a5568;
            margin-top: 5px;
            font-weight: 500;
          }

          /* Footer */
          .footer {
            margin-top: 8px;
            padding-top: 6px;
            border-top: 1px solid #1a202c;
            text-align: center;
            font-size: 7.5pt;
            color: #718096;
          }

          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }

            .document {
              box-shadow: none;
            }

            /* ກັນບໍ່ໃຫ້ແບ່ງຫນ້າ */
            .header {
              page-break-after: avoid;
              break-after: avoid;
            }

            .doc-info {
              page-break-after: avoid;
              break-after: avoid;
            }

            table { 
              page-break-inside: auto;
            }
            
            tr { 
              page-break-inside: avoid;
              page-break-after: auto;
            }
            
            thead { 
              display: table-header-group;
            }
            
            .signatures {
              page-break-before: avoid;
              page-break-inside: avoid;
            }

            .total-section {
              page-break-before: avoid;
              page-break-after: avoid;
            }

            /* ບັງຄັບໃຫ້ມີສີຕອນພິມ */
            thead {
              background: #e2e8f0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            tbody tr:nth-child(even) {
              background: #f7fafc !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .section-title {
              background: #1a202c !important;
              color: #fff !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .total-item {
              background: #e2e8f0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .signature-cell {
              background: #f7fafc !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .doc-info {
              background: #f7fafc !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="document">
          <!-- Header -->
          <div class="header">
               <div class="document-title">
     ${user?.companyInfo?.name}
    </div>
            <div class="document-title">ໃບສັ່ງຈ່າຍເງິນ</div>
            <div class="document-subtitle">OUTGOING PAYMENT ORDER (OPO)</div>
          </div>

          <!-- Document Info -->
          <div class="doc-info">
            <div class="info-grid">
              <div>
                <div class="info-row">
                  <div class="info-label">ເລກທີ / No.:</div>
                  <div class="info-value"><strong>${
                    selectedOpo.serial || selectedOpo.number
                  }</strong></div>
                </div>
                <div class="info-row">
                  <div class="info-label">ວັນທີ / Date:</div>
                  <div class="info-value">${new Date(
                    selectedOpo.date
                  ).toLocaleDateString("lo-LA")}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">ສະຖານະ / Status:</div>
                  <div class="info-value">
                    <span class="status-badge">${
                      STATUS_TEXTS[selectedOpo.status] || selectedOpo.status
                    }</span>
                  </div>
                </div>
              </div>
              <div>
                <div class="info-row">
                  <div class="info-label">ຜູ້ຮ້ອງຂໍ / Requester:</div>
                  <div class="info-value">${selectedOpo.requester || "-"}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">ຜູ້ຈັດການ / Manager:</div>
                  <div class="info-value">${selectedOpo.manager || "-"}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">ຜູ້ສ້າງ / Created By:</div>
                  <div class="info-value">${selectedOpo.createdBy || "-"}</div>
                </div>
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
                    PAYMENT_METHODS[item.paymentMethod] ||
                    item.paymentMethod ||
                    "-"
                  }</td>
                  <td class="center"><strong>${
                    item.currency || "LAK"
                  }</strong></td>
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
            <div class="signature-title">ລາຍເຊັນຜູ້ກ່ຽວຂ້ອງ / Signatures</div>
            <div class="signature-grid">
              <div class="signature-cell">
                <span class="signature-label">ຜູ້ຮ້ອງຂໍ<br>Requester</span>
                <div class="signature-area">
                  <div class="signature-line">
                    <div class="signature-name">${
                      selectedOpo.requester || ""
                    }</div>
                    <div class="signature-date">ວັນທີ / Date:<br>${formatDate(
                      new Date()
                    )}</div>
                  </div>
                </div>
              </div>
              <div class="signature-cell">
                <span class="signature-label">ຜູ້ຈັດການພະແນກ<br>Dept. Manager</span>
                <div class="signature-area">
                  <div class="signature-line">
                    <div class="signature-name">${
                      selectedOpo.manager || ""
                    }</div>
                    <div class="signature-date">ວັນທີ / Date:<br>${formatDate(
                      new Date()
                    )}</div>
                  </div>
                </div>
              </div>
              <div class="signature-cell">
                <span class="signature-label">ຜູ້ສ້າງ OPO<br>OPO Creator</span>
                <div class="signature-area">
                  <div class="signature-line">
                    <div class="signature-name">${
                      selectedOpo.createdBy || ""
                    }</div>
                    <div class="signature-date">ວັນທີ / Date:<br>${formatDate(
                      new Date()
                    )}
                    )}</div>
                  </div>
                </div>
              </div>
              <div class="signature-cell">
                <span class="signature-label">CEO & CFO<br>Approved By</span>
                <div class="signature-area">
                  <div class="signature-line">
                    <div class="signature-name"></div>
                     <div class="signature-date">ວັນທີ / Date:<br>${formatDate(
                       new Date()
                     )}
                    )}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            ເອກະສານນີ້ຖືກສ້າງໂດຍລະບົບ OPO | Generated by OPO System - ${formatDate(
              new Date()
            )} ${formatDate(new Date())}
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
                  value={formData.status} // สมมติ user มี field status
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
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
              </FormControl>
            ) : (
              <Select
                value={formData.status} // สมมติ user มี field status
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
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
                          {data.count} ລາຍການ
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
            user={user}
            opos={filteredOpos}
            onEdit={editOpo}
            onDelete={deleteOpo}
            onExportPDF={exportPDF}
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
                        value={formData.status} // สมมติ user มี field status
                        onChange={(e) =>
                          setFormData({ ...formData, status: e.target.value })
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
                        value={formData.status} // สมมติ user มี field status
                        onChange={(e) =>
                          setFormData({ ...formData, status: e.target.value })
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
                  {/* Header */}
                  <Box textAlign="center" mb={6}>
                    <Box
                      h="80px"
                      bg="blue.600"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      mb={4}
                      borderRadius="md"
                    >
                      <Text
                        fontFamily="Noto Sans Lao, sans-serif"
                        color="white"
                        fontSize="2xl"
                        fontWeight="bold"
                      >
                        {user?.companyInfo?.name}
                      </Text>
                    </Box>
                    <Heading
                      fontFamily="Noto Sans Lao, sans-serif"
                      size="lg"
                      color="blue.700"
                    >
                      ໃບສັ່ງຈ່າຍເງິນ (OPO)
                    </Heading>
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      fontSize="lg"
                      fontWeight="bold"
                      mt={2}
                      color="gray.600"
                    >
                      Outgoing Payment Order
                    </Text>
                  </Box>

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
                        colorScheme={STATUS_COLORS[selectedOpo.status]}
                        fontSize="md"
                        p={2}
                        borderRadius="md"
                      >
                        {STATUS_TEXTS[selectedOpo.status]}
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

                  {/* Signatures */}
                  <Box mt={8}>
                    <Heading
                      fontFamily="Noto Sans Lao, sans-serif"
                      size="sm"
                      mb={4}
                      color="blue.700"
                    >
                      ລາຍເຊັນຜູ້ກ່ຽວຂ້ອງ
                    </Heading>
                    <Flex justify="space-between" gap={4}>
                      {[
                        { label: "ຜູ້ຮ້ອງຂໍ", value: selectedOpo.requester },
                        { label: "ຜູ້ຈັດການພະແນກ", value: selectedOpo.manager },
                        { label: "ຜູ້ສ້າງ OPO", value: selectedOpo.createdBy },
                        { label: "CEO & CFO", value: "" },
                      ].map((sign, index) => (
                        <Box key={index} flex="1" textAlign="center">
                          <Text
                            fontFamily="Noto Sans Lao, sans-serif"
                            fontWeight="bold"
                            mb={16}
                          >
                            {sign.label}
                          </Text>
                          <Box
                            borderTop="2px solid"
                            borderColor="gray.400"
                            pt={2}
                          >
                            <Text
                              fontFamily="Noto Sans Lao, sans-serif"
                              fontSize="sm"
                            >
                              {sign.value || "___________________"}
                            </Text>
                            <Text
                              fontFamily="Noto Sans Lao, sans-serif"
                              fontSize="xs"
                              color="gray.500"
                              mt={1}
                            >
                              ວັນທີ: ___/___/______
                            </Text>
                          </Box>
                        </Box>
                      ))}
                    </Flex>
                  </Box>

                  {/* Footer */}
                  <Box
                    mt={8}
                    pt={4}
                    borderTop="1px solid #e2e8f0"
                    textAlign="center"
                  >
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      fontSize="xs"
                      color="gray.500"
                    >
                      ເອກະສານນີ້ຖືກສ້າງໂດຍລະບົບ OPO -{" "}
                      {new Date().toLocaleDateString("lo-LA")}
                    </Text>
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
                  ດາວໂຫລດ PDF
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
