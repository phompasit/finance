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
  SimpleGrid,
  StatNumber,
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
import Swal from "sweetalert2";
import api from "../api/api";
import { useNavigate } from "react-router-dom";

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
const STATUS_LABELS = {
  approved: "ອະນຸມັດ",
  rejected: "ປະຕິເສດ",
  pending: "ຕັ້ງລໍຖ້າ",
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
          ບໍ່ມີຂໍ້ມູນ PO
        </Text>
      </Box>
    );
  }
  const handleStatus = async (opo, status) => {
    const label = STATUS_LABELS[status] || status;

    // 1️⃣ Confirm
    const confirm = await Swal.fire({
      icon: "question",
      title: "ຢືນຢັນການດຳເນີນການ",
      text: `ທ່ານຕ້ອງການ ${label} ໃບ PO ນີ້ຫຼືບໍ່?`,
      showCancelButton: true,
      confirmButtonText: "ຢືນຢັນ",
      cancelButtonText: "ຍົກເລີກ",
      reverseButtons: true,
    });

    if (!confirm.isConfirmed) return;

    try {
      // 2️⃣ Loading
      Swal.fire({
        title: "ກຳລັງດຳເນີນການ...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      // 3️⃣ API
      await api.patch(`/api/opo/status/${opo._id}`, {
        status_Ap: status,
      });

      // 4️⃣ Success
      Swal.fire({
        icon: "success",
        title: "ສຳເລັດ",
        text: `${label} ສຳເລັດແລ້ວ`,
        timer: 1500,
        showConfirmButton: false,
      });

      await fetchOPOs();
    } catch (error) {
      console.error("Update status error:", error);

      Swal.fire({
        icon: "error",
        title: "ເກີດຂໍ້ຜິດພາດ",
        text:
          error?.response?.data?.message ||
          error?.message ||
          "ບໍ່ສາມາດປ່ຽນສະຖານະໄດ້",
      });
    }
  };

  return (
    <Box bg="white" borderRadius="lg" shadow="sm" overflow="auto">
      <Table>
        <Thead bg="blue.50">
          <Tr>
            <Th fontFamily="Noto Sans Lao, sans-serif">ເລກທີ</Th>
            <Th fontFamily="Noto Sans Lao, sans-serif">ວັນທີ</Th>
            <Th fontFamily="Noto Sans Lao, sans-serif">ຈຳນວນລາຍການ</Th>
            <Th fontFamily="Noto Sans Lao, sans-serif">ຍອດລວມ</Th>
            <Th fontFamily="Noto Sans Lao, sans-serif">ສະຖານະການຊຳລະເງິນ</Th>
            <Th fontFamily="Noto Sans Lao, sans-serif">ສະຖານະ</Th>
            <Th fontFamily="Noto Sans Lao, sans-serif">ຜູ້ສ້າງ</Th>
            <Th fontFamily="Noto Sans Lao, sans-serif">ຈັດການ</Th>
          </Tr>
        </Thead>
        <Tbody>
          {opos.map((opo) => {
            const totals = groupByCurrency(opo.items || []);
            return (
              <Tr key={opo._id} _hover={{ bg: "gray.50" }}>
                <Td  fontFamily="Noto Sans Lao, sans-serif" fontWeight="bold">
                  {opo.serial || opo.number}
                </Td>
                <Td  fontFamily="Noto Sans Lao, sans-serif">
                  {formatDate(opo.date)}
                </Td>
                <Td  fontFamily="Noto Sans Lao, sans-serif">
                  {(opo.items || []).length}
                </Td>
                <Td >
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
                    {user?.role === "admin" && (
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
                          isDisabled={!opo?.items || opo?.items?.length === 0}
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
                        opo?.status_Ap !== "APPROVED") ||
                      (user?.role === "master" &&
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
                        opo?.status_Ap !== "APPROVED") ||
                      (user?.role === "master" &&
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
  const {
    isOpen: isPdfOpen,
    onOpen: onPdfOpen,
    onClose: onPdfClose,
  } = useDisclosure();
  const toast = useToast();
  const pageSize = 100;
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  // API Functions with improved error handling
  const fetchOPOs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await api.get("/api/opo");

      const sorted = Array.isArray(data)
        ? data.sort((a, b) => new Date(b.date) - new Date(a.date))
        : [];

      setOpos(sorted);
    } catch (error) {
      console.error("Fetch OPOs error:", error);

      setError(
        error?.response?.data?.message || error?.message || "ດຶງຂໍ້ມູນບໍ່ສຳເລັດ"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteOpo = useCallback(
    async (id) => {
      // 1️⃣ Confirm
      const confirm = await Swal.fire({
        icon: "warning",
        title: "ຢືນຢັນການລຶບ",
        text: "ທ່ານແນ່ໃຈວ່າຈະລຶບ OPO ນີ້? ການດຳເນີນການນີ້ບໍ່ສາມາດກູ້ຄືນໄດ້",
        showCancelButton: true,
        confirmButtonText: "ລຶບ",
        cancelButtonText: "ຍົກເລີກ",
        confirmButtonColor: "#E53E3E",
        reverseButtons: true,
      });

      if (!confirm.isConfirmed) return;

      try {
        // 2️⃣ Loading
        Swal.fire({
          title: "ກຳລັງລຶບ...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });

        // 3️⃣ API
        await api.delete(`/api/opo/${id}`);

        // 4️⃣ Refresh data
        await fetchOPOs();

        // 5️⃣ Success
        Swal.fire({
          icon: "success",
          title: "ລຶບສຳເລັດ",
          text: "ລຶບລາຍການສຳເລັດແລ້ວ",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error("Delete OPO error:", error);

        Swal.fire({
          icon: "error",
          title: "ລຶບບໍ່ສຳເລັດ",
          text:
            error?.response?.data?.message ||
            error?.message ||
            "ບໍ່ສາມາດລຶບຂໍ້ມູນໄດ້",
        });
      }
    },
    [fetchOPOs]
  );

  const editOpo = (opo) => {
    navigate("/opo_form", {
      state: {
        mode: "update",
        opo: opo,
        selectedOpo: opo,
      },
    });
  };

  const filteredOpos = useMemo(() => {
    return opos.filter((opo) => {
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

      // ✅ Normalize วันที่: เปรียบเทียบแค่ yyyy-mm-dd
      const opoDateOnly = new Date(opo.date).toISOString().split("T")[0];
      const fromDateOnly = filterDateFrom
        ? new Date(filterDateFrom).toISOString().split("T")[0]
        : null;
      const toDateOnly = filterDateTo
        ? new Date(filterDateTo).toISOString().split("T")[0]
        : null;

      const matchDate =
        (!fromDateOnly || opoDateOnly >= fromDateOnly) &&
        (!toDateOnly || opoDateOnly <= toDateOnly);

      return matchSearch && matchStatus && matchDate;
    });
  }, [opos, searchTerm, filterStatus, filterDateFrom, filterDateTo]);

  const totalPages = Math.ceil(filteredOpos.length / pageSize);
  const pageData = useMemo(() => {
    const s = (page - 1) * pageSize;
    return filteredOpos.slice(s, s + pageSize);
  }, [filteredOpos, page]);
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
  .note-section {
      margin-top: 6px;
      font-size: 12px;
      color: red;
      border-top: 1px dashed #cbd5e0;
      padding-top: 4px;
        display: flex;
      justify-content: flex-end;
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
      padding-left:20px;
      border-bottom: 2px solid #1a202c;
    }
      .company-info {
 display: flex;
    justify-content: space-between; /* จัดให้อยู่ตรงกลางแนวนอน */
    align-items: center;     /* จัดให้อยู่ตรงกลางแนวตั้ง */
    gap: 20px;               /* ระยะห่างระหว่างแต่ละช่อง */
  text-align: left;
  margin-bottom: 15px;
  line-height: 1.8;
    font-weight: 700;
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
  background-color: #1a202c;       /* เผื่อไม่มีรูป */
  background-size: cover;           /* ทำให้รูปไม่บี้ */
  background-position: center;      /* เอากลางภาพ */
  background-repeat: no-repeat;     /* ไม่ซ้ำรูป */

  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: white;
  font-weight: bold;
}


    .company-details {
      flex: 1;
    }

    .company-name {
      font-size: 12px
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
      font-weight:700;
      font-size:18px;
    }

    .doc-reference {
      flex: 1;
      text-align: right;
      font-size: 7pt;
      padding-right:10px;
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
      font-size: 12px
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
      font-size: 12px
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
/* Toolbar */
.toolbar {
  padding: 15px 30px;
  display: flex;
  position: absolute;             /* 👈 แก้จาก comma เป็น semicolon */
  justify-content: space-between; /* จัดระยะซ้าย-ขวา */
  align-items: center;            /* จัดกึ่งกลางแนวตั้ง */
  width: 100%;                    /* ให้ toolbar กว้างเต็มหน้าจอ */
  top: 0;                         /* อยู่ติดขอบบน */
  left: 0;                        /* อยู่ชิดซ้าย */
  color: white;                   /* สีตัวอักษร */
  z-index: 1000;                  /* ซ้อนอยู่บนสุด */
}

.toolbar h2 {
  color: white;
  font-size: 16px;
  font-weight: 600;
}

.btn-print {
  background: #10b981;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-family: 'Noto Sans Lao', sans-serif;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.3s;
}

.btn-print:hover {
  background: #059669;
}
  .date-section {
  text-align: right;
  margin-bottom: 15px;
  font-size: 12px;
  color: #000;
   font-weight: 700;
}

.date-section input {
  border: none;
  border-bottom: 1px dotted #000;
  padding: 4px 8px;
  font-family: 'Noto Sans Lao', sans-serif;
  text-align: center;
  width: 140px;
  background: transparent;
  font-size: 12px;
   font-weight: 700;
}

 .total-item {
  padding: 6px 12px;
  border-radius: 3px;
  min-width: 150px;
  border: 1px solid #1a202c; /* 👈 ขอบสีเทาอ่อนแบบ Tailwind gray-300 */
}

    .signatures {
      background: #f7fafc;
      border: 2px solid #1a202c;
      border-radius: 4px;
      padding: 8px;
      text-align: center;
      margin-top: 6px;
      page-break-before: auto;
      page-break-inside: avoid;
      font-weight:700
    }


    .signature-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
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
  .toolbar {
    display: none !important;
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
 <div class="toolbar">
      <button class="btn-print" onclick="window.print()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        ພິມລາຍງານ
      </button>
    </div>
  <div class="document">
    <div class="header-band"></div>
    
    <!-- Header -->
    <div class="document-header">

      <div class="national-header">
        <div class="header-line1">
          ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ
        </div>
        <div class="header-line2">
          ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ
        </div>
      </div>
    </div>

    <!-- Title -->
    <div class="company-info">
         <div class="company-section">
       <img 
  class="company-logo" 
  src="${user?.companyId?.logo || "/default-logo.png"}" 
  alt="Company Logo"
/>

        <div class="company-details">
        <div class="contact-section">
        <div class="company-name">${
          user?.companyId?.name || "Company Name"
        }</div>
        <div>${user?.companyId?.address || ""}</div>
         <div>${user?.companyId?.phone || ""}</div>
          </div>
        </div>
      </div>
          <div>
    <div class="document-title">ໃບສັ່ງຊື້</div>
    <div class="document-subtitle">Purchase Order(PO)</div>
    
    </div>

      <div class="doc-reference">
      <div class="date-section">
            ວັນທີ: <input type="text" value="${formatDate(
              new Date()
            )}" readonly>
          </div>
      </div>
    
    </div>


    <!-- Document Info -->
    <div class="doc-info">
      <div class="info-grid">
        <div class="info-row">
          <div class="info-label">ເລກທີ /No:</div>
          <div class="info-value"><strong>${
            selectedOpo.serial || selectedOpo.number
          }</strong></div>
        </div>
        <div class="info-row">
          <div class="info-label">ຜູ້ຮ້ອງຂໍ:</div>
          <div class="info-value">${selectedOpo.requester || "-"}</div>
        </div>
        <div class="info-row">
          <div class="info-label">ວັນທີ/Date:</div>
          <div class="info-value">${formatDate(selectedOpo.date)}</div>
        </div>
        <div class="info-row">
          <div class="info-label">ພະແນກບັນຊີ-ການເງິນສ່ວນກາງ:</div>
          <div class="info-value">${selectedOpo.manager || "-"}</div>
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
<div class="note-section" style="color:red">ບິນຮັບໃບ PO ອາທິດໜຶ່ງເທື່ອໜຶ່ງເທົ່ານັ້ນ-ວັນພຸດ 3 ໂມງ</div>
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
          <span class="signature-label">ພະແນກບັນຊີ-ການເງິນສ່ວນກາງ<br>A&F Dept.</span>
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
          <span class="signature-label">ປະທານ ບໍລິສັດ ${
            user?.companyId?.name
          }/ຮອງປະທານ<br>Approved By</span>
          <div class="signature-area">
            <div class="signature-line">
              <div class="signature-name"></div>

            </div>
          </div>
        </div>
        <div class="signature-cell">
          <span class="signature-label">ປະທານບໍລິສັດ MY/ຮອງປະທານ<br>Approved By</span>
          <div class="signature-area">
            <div class="signature-line">
              <div class="signature-name"></div>

            </div>
          </div>
        </div>
      </div>
    </div>
<div  class="note-section"  style="color:red">ໝາຍເຫດ: ກຳນົດ 15 ວັນ ໃນການເບີກຈ່າຍນັບຈາກມື້ອະນຸມັດ PO ເອກະສານຕິດຄັດ:ໃບສະເໜີລາຄາ ,ໃບແຈ້ງໜີ້,ໃບຮັບສິນຄ້າຈາກຜູ້ຂາຍ ແລະ ເອກະສານອື່ນໆທີ່ຕິດພັນ ມາພ້ອມທຸກຄັ້ງ</div>
    <!-- Footer -->

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
    <Box theme={theme}>
      <Box py={8}>
        <Box px={6}>
          <VStack spacing={6} align="stretch">
            {/* ================= HEADER ================= */}
            <Flex justify="space-between" align="center">
              <Box>
                <Heading
                  fontFamily="Noto Sans Lao, sans-serif"
                  size="lg"
                  color="gray.700"
                >
                  Outgoing Payment Order
                </Heading>
                <Text
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontSize="sm"
                  color="gray.500"
                >
                  ລະບົບຈັດການໃບ PO ແລະການຊຳລະເງິນ
                </Text>
              </Box>

              <Button
                fontFamily="Noto Sans Lao, sans-serif"
                leftIcon={<Plus size={18} />}
                colorScheme="blue"
                onClick={() =>
                  navigate("/opo_form", {
                    state: { mode: "create", data: opos },
                  })
                }
              >
                ສ້າງ PO ໃໝ່
              </Button>
            </Flex>

            {/* ================= ERROR ================= */}
            {error && (
              <Alert status="error" borderRadius="lg">
                <AlertIcon />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* ================= LOADING ================= */}
            {loading && (
              <Flex justify="center" py={10}>
                <Spinner size="xl" color="blue.500" />
              </Flex>
            )}

            {/* ================= FILTER TOOLBAR ================= */}
            <Card borderRadius="xl">
              <CardBody>
                <SimpleGrid columns={{ base: 1, md: 6 }} spacing={4}>
                  <Input
                    fontFamily="Noto Sans Lao, sans-serif"
                    placeholder="ຄົ້ນຫາເລກທີ, ລາຍລະອຽດ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />

                  <Select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    {Object.entries(
                      user?.role === "admin" ? STATUS_TEXTS : STATUS_TEXTS_staff
                    ).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>

                  <Input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                  />

                  <Input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                  />

                  <Button
                    fontFamily="Noto Sans Lao, sans-serif"
                    variant="outline"
                  >
                    Reset
                  </Button>
                </SimpleGrid>
              </CardBody>
            </Card>

            {/* ================= SUMMARY ================= */}
            <Card borderRadius="xl">
              <CardBody>
                <Heading
                  fontFamily="Noto Sans Lao, sans-serif"
                  size="sm"
                  mb={4}
                >
                  ສະຫຼຸບຕາມສະຖານະ
                </Heading>

                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                  {Object.keys(STATUS_TEXTS).map((statusKey) => {
                    const data = summaryOPO[statusKey];

                    return (
                      <Card
                        key={statusKey}
                        borderRadius="lg"
                        border="1px solid"
                        borderColor="gray.200"
                      >
                        <CardBody>
                          <Stat>
                            <StatLabel
                              fontFamily="Noto Sans Lao, sans-serif"
                              color="gray.600"
                            >
                              {STATUS_TEXTS[statusKey]}
                            </StatLabel>
                            <StatNumber
                              fontFamily="Noto Sans Lao, sans-serif"
                              color="blue.600"
                            >
                              {data?.count || 0}
                            </StatNumber>
                            <Text
                              fontFamily="Noto Sans Lao, sans-serif"
                              fontSize="xs"
                              color="gray.500"
                            >
                              ລາຍການ
                            </Text>
                          </Stat>
                        </CardBody>
                      </Card>
                    );
                  })}
                </SimpleGrid>
              </CardBody>
            </Card>

            {/* ================= TABLE ================= */}
            <Card borderRadius="xl">
              <CardBody>
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
              </CardBody>
            </Card>

            {/* ================= PDF MODAL ================= */}
            {selectedOpo && (
              <Modal isOpen={isPdfOpen} onClose={onPdfClose} size="6xl">
                <ModalOverlay />
                <ModalContent borderRadius="xl">
                  <ModalHeader>
                    PDF Preview — {selectedOpo.serial || selectedOpo.number}
                  </ModalHeader>
                  <ModalCloseButton />

                  <ModalBody bg="gray.50">
                    {/* เนื้อหา PDF ใช้ของเดิมคุณได้เลย */}
                  </ModalBody>

                  <ModalFooter>
                    <Button variant="ghost" onClick={onPdfClose}>
                      ປິດ
                    </Button>
                    <Button
                      leftIcon={<Download size={18} />}
                      colorScheme="blue"
                      onClick={generatePDF}
                    >
                      Print
                    </Button>
                  </ModalFooter>
                </ModalContent>
              </Modal>
            )}
          </VStack>
        </Box>
      </Box>

      {selectedOpo && (
        <Modal isOpen={isPdfOpen} onClose={onPdfClose} size="6xl">
          {" "}
          <ModalOverlay />{" "}
          <ModalContent maxH="90vh" overflow="auto">
            <ModalHeader fontFamily="Noto Sans Lao, sans-serif">
              {" "}
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
                  {" "}
                  ເລືອກລາຍການທີ່ຕ້ອງການສົ່ງອອກ:{" "}
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
                    {" "}
                    {item.description} -{" "}
                    {parseFloat(item.amount || 0).toLocaleString()}{" "}
                    {item.currency}{" "}
                  </Checkbox>
                ))}{" "}
                <Button
                  fontFamily="Noto Sans Lao, sans-serif"
                  size="sm"
                  mt={2}
                  colorScheme="blue"
                  variant="outline"
                  onClick={() => {
                    if (
                      selectedItems.length === (selectedOpo.items || []).length
                    ) {
                      setSelectedItems([]);
                    } else {
                      setSelectedItems(
                        (selectedOpo.items || []).map((i) => i._id)
                      );
                    }
                  }}
                >
                  {" "}
                  {selectedItems.length === (selectedOpo.items || []).length
                    ? "ຍົກເລີກທັງໝົດ"
                    : "ເລືອກທັງໝົດ"}{" "}
                </Button>{" "}
              </Box>{" "}
              <Box id="pdf-preview" bg="white" p={8} border="1px solid #e2e8f0">
                {" "}
                {/* Info */}{" "}
                <Flex
                  justify="space-between"
                  mb={6}
                  pb={4}
                  borderBottom="2px solid #e2e8f0"
                >
                  {" "}
                  <Box>
                    {" "}
                    <HStack fontFamily="Noto Sans Lao, sans-serif" mb={1}>
                      {" "}
                      <Text fontFamily="Noto Sans Lao, sans-serif">
                        {" "}
                        ເລກທີ:{" "}
                      </Text>{" "}
                      <Text fontFamily="Noto Sans Lao, sans-serif">
                        {" "}
                        {selectedOpo.serial || selectedOpo.number}{" "}
                      </Text>{" "}
                    </HStack>{" "}
                    <HStack fontFamily="Noto Sans Lao, sans-serif">
                      {" "}
                      <Text
                        fontFamily="Noto Sans Lao, sans-serif"
                        fontWeight="bold"
                      >
                        {" "}
                        ວັນທີ:{" "}
                      </Text>{" "}
                      <Text fontFamily="Noto Sans Lao, sans-serif">
                        {" "}
                        {new Date(selectedOpo.date).toLocaleDateString(
                          "lo-LA"
                        )}{" "}
                      </Text>{" "}
                    </HStack>{" "}
                  </Box>{" "}
                  <Box textAlign="right">
                    {" "}
                    <Badge
                      fontFamily="Noto Sans Lao, sans-serif"
                      colorScheme={STATUS_COLORS[selectedOpo.status_Ap]}
                      fontSize="md"
                      p={2}
                      borderRadius="md"
                    >
                      {" "}
                      {STATUS_TEXTS[selectedOpo.status_Ap]}{" "}
                    </Badge>{" "}
                  </Box>{" "}
                </Flex>{" "}
                {/* Items */}{" "}
                <Box mb={6}>
                  {" "}
                  <Heading
                    fontFamily="Noto Sans Lao, sans-serif"
                    size="md"
                    mb={3}
                    color="blue.700"
                  >
                    {" "}
                    ລາຍການຈ່າຍເງິນ{" "}
                  </Heading>{" "}
                  <Table variant="simple" size="sm">
                    {" "}
                    <Thead bg="gray.100">
                      {" "}
                      <Tr>
                        {" "}
                        <Th fontFamily="Noto Sans Lao, sans-serif">
                          ລຳດັບ
                        </Th>{" "}
                        <Th fontFamily="Noto Sans Lao, sans-serif">
                          {" "}
                          ລາຍລະອຽດ{" "}
                        </Th>{" "}
                        <Th fontFamily="Noto Sans Lao, sans-serif">
                          ວິທີຊຳລະ{" "}
                        </Th>{" "}
                        <Th fontFamily="Noto Sans Lao, sans-serif">
                          {" "}
                          ສະກຸນເງິນ{" "}
                        </Th>
                        <Th fontFamily="Noto Sans Lao, sans-serif" isNumeric>
                          {" "}
                          ຈຳນວນເງິນ{" "}
                        </Th>
                        <Th fontFamily="Noto Sans Lao, sans-serif">
                          ສາເຫດ
                        </Th>{" "}
                        <Th fontFamily="Noto Sans Lao, sans-serif">ໝາຍເຫດ</Th>{" "}
                      </Tr>{" "}
                    </Thead>
                    <Tbody>
                      {" "}
                      {(selectedItems.length > 0
                        ? (selectedOpo.items || []).filter((item) =>
                            selectedItems.includes(item._id)
                          )
                        : selectedOpo.items || []
                      )
                        .slice()
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map((item, index) => (
                          <Tr key={item.id}>
                            {" "}
                            <Td fontFamily="Noto Sans Lao, sans-serif">
                              {" "}
                              {index + 1}{" "}
                            </Td>{" "}
                            <Td fontFamily="Noto Sans Lao, sans-serif">
                              {" "}
                              <Text>{item.description}</Text>{" "}
                            </Td>{" "}
                            <Td fontFamily="Noto Sans Lao, sans-serif">
                              {" "}
                              {PAYMENT_METHODS[item.paymentMethod]}{" "}
                            </Td>{" "}
                            <Td fontFamily="Noto Sans Lao, sans-serif">
                              {" "}
                              {item.currency}{" "}
                            </Td>{" "}
                            <Td
                              fontFamily="Noto Sans Lao, sans-serif"
                              isNumeric
                              fontWeight="bold"
                            >
                              {" "}
                              {parseFloat(
                                item.amount || 0
                              ).toLocaleString()}{" "}
                            </Td>{" "}
                            <Td fontFamily="Noto Sans Lao, sans-serif">
                              {" "}
                              {item.reason}{" "}
                            </Td>{" "}
                            <Td fontFamily="Noto Sans Lao, sans-serif">
                              {" "}
                              {item.notes}{" "}
                            </Td>{" "}
                          </Tr>
                        ))}{" "}
                    </Tbody>{" "}
                  </Table>{" "}
                </Box>{" "}
                {/* Total */}{" "}
                <Box mb={6} bg="blue.50" p={4} borderRadius="md">
                  {" "}
                  <Heading
                    fontFamily="Noto Sans Lao, sans-serif"
                    size="sm"
                    mb={2}
                    color="blue.700"
                  >
                    {" "}
                    ຍອດລວມທັງໝົດ{" "}
                  </Heading>{" "}
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
                      {" "}
                      {amount.toLocaleString()} {currency}{" "}
                    </Text>
                  ))}{" "}
                </Box>{" "}
              </Box>{" "}
            </ModalBody>{" "}
            <ModalFooter>
              {" "}
              <Button
                fontFamily="Noto Sans Lao, sans-serif"
                variant="ghost"
                mr={3}
                onClick={onPdfClose}
              >
                {" "}
                ປິດ{" "}
              </Button>{" "}
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
                {" "}
                Print{" "}
              </Button>{" "}
            </ModalFooter>{" "}
          </ModalContent>{" "}
        </Modal>
      )}
    </Box>
  );
};

export default OPOSystem;
