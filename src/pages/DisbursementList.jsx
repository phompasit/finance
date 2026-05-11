import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Card,
  CardBody,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  HStack,
  VStack,
  Flex,
  Heading,
  Text,
  Input,
  Spinner,
  Alert,
  AlertIcon,
  AlertDescription,
  SimpleGrid,
} from "@chakra-ui/react";
import { Plus, Trash2, FileText, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/api";
import Swal from "sweetalert2";

function formatDate(d) {
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()}`;
}

const DisbursementList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await api.get("/api/disbursement", {
        params: { page, limit: 20, search: search || undefined },
      });
      setData(res.data);
      setTotalPages(res.pagination.totalPages);
    } catch (err) {
      setError(err?.response?.data?.message || "ໂຫລດຂໍ້ມູນບໍ່ສຳເລັດ");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id) => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "ຢືນຢັນການລຶບ",
      text: "ການລຶບຈະຄືນສະຖານະ OPO ເປັນ unpaid",
      showCancelButton: true,
      confirmButtonText: "ລຶບ",
      cancelButtonText: "ຍົກເລີກ",
      confirmButtonColor: "#E53E3E",
      reverseButtons: true,
    });
    if (!confirm.isConfirmed) return;

    try {
      Swal.fire({
        title: "ກຳລັງລຶບ...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      await api.delete(`/api/disbursement/${id}`);
      Swal.fire({
        icon: "success",
        title: "ລຶບສຳເລັດ",
        timer: 1500,
        showConfirmButton: false,
      });
      fetchData();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "ຜິດພາດ",
        text: err?.response?.data?.message || "ລຶບບໍ່ສຳເລັດ",
      });
    }
  };
  const generatePDF = (row) => {
    const opo = row.opoId;
    const items = opo?.items || [];

    const totals = items.reduce((acc, item) => {
      const currency = item.currency || "LAK";
      acc[currency] = (acc[currency] || 0) + parseFloat(item.amount || 0);
      return acc;
    }, {});

    const PAYMENT_METHODS = { cash: "ເງິນສົດ", transfer: "ໂອນເງິນ" };

    function formatDate(d) {
      const date = new Date(d);
      return `${String(date.getDate()).padStart(2, "0")}/${String(
        date.getMonth() + 1
      ).padStart(2, "0")}/${date.getFullYear()}`;
    }

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
<!DOCTYPE html>
<html lang="lo">
<head>
  <meta charset="UTF-8">
  <title>ໃບເບີກຈ່າຍ - ${row.serial}</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4 landscape; margin: 8mm 10mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Noto Sans Lao', sans-serif; font-size: 9pt; color: #000; background: #fff; }
    .toolbar { padding: 12px 24px; display: flex; justify-content: flex-end; position: absolute; top: 0; right: 0; z-index: 999; }
    .btn-print { background: #10b981; color: white; border: none; padding: 10px 24px; border-radius: 6px; cursor: pointer; font-family: 'Noto Sans Lao', sans-serif; font-size: 14px; font-weight: 600; }
    .document { width: 100%; background: white; padding-top: 10px; }
    .header-band { height: 4px; background: linear-gradient(90deg, #1a202c, #4a5568, #1a202c); margin-bottom: 8px; }
    .national-header { text-align: center; font-weight: 700; font-size: 16px; margin-bottom: 6px; border-bottom: 2px solid #1a202c; padding-bottom: 6px; }
    .company-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .company-section { display: flex; align-items: center; gap: 12px; }
    .company-logo { width: 65px; height: 65px; object-fit: cover; }
    .doc-title { text-align: center; }
    .doc-title h1 { font-size: 18pt; font-weight: 700; }
    .doc-title p { font-size: 10pt; color: #4a5568; }
    .date-box { text-align: right; font-size: 11px; font-weight: 700; }
    .date-box input { border: none; border-bottom: 1px dotted #000; padding: 2px 6px; font-family: 'Noto Sans Lao', sans-serif; font-size: 11px; font-weight: 700; background: transparent; width: 130px; }
    .doc-info { background: #f7fafc; border: 2px solid #1a202c; border-radius: 4px; padding: 8px 10px; margin-bottom: 8px; }
    .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px 10px; }
    .info-row { display: flex; gap: 6px; padding: 3px 6px; background: white; border: 1px solid #cbd5e0; border-radius: 2px; font-size: 11px; }
    .info-label { color: #4a5568; white-space: nowrap; }
    .info-value { font-weight: 700; }
    .section-title { font-size: 9pt; font-weight: 700; margin: 6px 0 4px; padding: 4px 8px; background: #1a202c; color: white; border-radius: 3px; }
    table { width: 100%; border-collapse: collapse; border: 2px solid #1a202c; }
    thead { background: #e2e8f0; }
    th { padding: 5px 4px; border: 1px solid #1a202c; font-size: 10px; }
    td { padding: 4px; border: 1px solid #2d3748; font-size: 11px; }
    tbody tr:nth-child(even) { background: #f7fafc; }
    .total-section { display: flex; justify-content: flex-end; gap: 8px; margin: 6px 0; }
    .total-item { padding: 6px 12px; border: 1px solid #1a202c; border-radius: 3px; min-width: 150px; }
    .total-title { font-size: 10px; color: #4a5568; }
    .total-amount { font-weight: 700; font-size: 13px; }
    .note-section { margin-top: 4px; font-size: 11px; color: red; border-top: 1px dashed #cbd5e0; padding-top: 4px; display: flex; justify-content: flex-end; }
    .signatures { background: #f7fafc; border: 2px solid #1a202c; border-radius: 4px; padding: 8px; text-align: center; margin-top: 8px; }
    .signature-title { font-weight: 700; margin-bottom: 6px; }
    .signature-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .signature-cell { background: white; border: 1.5px solid #cbd5e0; border-radius: 3px; min-height: 110px; display: flex; flex-direction: column; justify-content: space-between; padding: 6px; }
    .signature-label { font-weight: 700; font-size: 11px; }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .toolbar { display: none !important; }
      thead { display: table-header-group; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button class="btn-print" onclick="window.print()">ພິມລາຍງານ</button>
  </div>
  <div class="document">
    <div class="header-band"></div>

    <div class="national-header">
      ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ<br>
      <span style="font-size:13px">ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ</span>
    </div>

    <div class="company-info">
      <div class="company-section">
        <img class="company-logo" src="${
          user?.companyId?.logo || "/default-logo.png"
        }" alt="Logo"/>
        <div>
          <div style="font-weight:700;font-size:13px">${
            user?.companyId?.name || ""
          }</div>
          <div style="font-size:10px">${user?.companyId?.address || ""}</div>
          <div style="font-size:10px">${user?.companyId?.phone || ""}</div>
        </div>
      </div>
      <div class="doc-title">
        <h1>ໃບເບີກຈ່າຍ</h1>
        <p>Disbursement</p>
      </div>
      <div class="date-box">
        ວັນທີ: <input type="text" value="${formatDate(new Date())}" readonly>
      </div>
    </div>

    <div class="doc-info">
      <div class="info-grid">
        <div class="info-row">
          <span class="info-label">ເລກທີໃບເບີກ:</span>
          <span class="info-value">${row.serial}</span>
        </div>
        <div class="info-row">
          <span class="info-label">ເລກທີ OPO:</span>
          <span class="info-value">${opo?.serial || opo?.number || "-"}</span>
        </div>
        <div class="info-row">
          <span class="info-label">ຜູ້ສະໜອງ:</span>
          <span class="info-value">${opo?.partnerId?.name || "-"}</span>
        </div>
        <div class="info-row">
          <span class="info-label">ວັນທີເບີກ:</span>
          <span class="info-value">${formatDate(row.disbursedAt)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">ຜູ້ຮ້ອງຂໍ:</span>
          <span class="info-value">${opo?.requester || "-"}</span>
        </div>
        <div class="info-row">
          <span class="info-label">ຜູ້ຈັດການ:</span>
          <span class="info-value">${opo?.createdBy || "-"}</span>
        </div>
        ${
          row.note
            ? `
        <div class="info-row" style="grid-column: span 3">
          <span class="info-label">ໝາຍເຫດ:</span>
          <span class="info-value">${row.note}</span>
        </div>`
            : ""
        }
      </div>
    </div>

    <div class="section-title">ລາຍການຈ່າຍເງິນ / Payment Items</div>
    <table>
      <thead>
        <tr>
          <th style="width:4%">ລຳດັບ</th>
          <th style="width:30%">ລາຍລະອຽດ</th>
          <th style="width:14%">ວິທີຊຳລະ</th>
          <th style="width:10%">ສະກຸນເງິນ</th>
          <th style="width:18%">ຈຳນວນເງິນ</th>
          <th style="width:24%">ໝາຍເຫດ</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item, i) => `
        <tr>
          <td style="text-align:center"><strong>${i + 1}</strong></td>
          <td>${item.description || "-"}</td>
          <td>${
            PAYMENT_METHODS[item.paymentMethod] || item.paymentMethod || "-"
          }</td>
          <td style="text-align:center"><strong>${
            item.currency || "LAK"
          }</strong></td>
          <td>${parseFloat(item.amount || 0).toLocaleString()}</td>
          <td>${item.notes || "-"}</td>
        </tr>`
          )
          .join("")}
      </tbody>
    </table>

    <div class="total-section">
      ${Object.entries(totals)
        .map(
          ([currency, amount]) => `
      <div class="total-item">
        <div class="total-title">ຍອດລວມ / Total (${currency}):</div>
        <div class="total-amount">${amount.toLocaleString()} ${currency}</div>
      </div>`
        )
        .join("")}
    </div>

    <div class="note-section"></div>

    <div class="signatures">
      <div class="signature-title">ລາຍເຊັນຜູ້ກ່ຽວຂ້ອງ / Authorized Signatures</div>
      <div class="signature-grid">
        <div class="signature-cell">
          <span class="signature-label">ຜູ້ຮ້ອງຂໍ<br>Requester</span>
          <div style="margin-top:auto;padding-top:8px;border-top:1px solid #cbd5e0">
            ${opo?.requester || ""}
          </div>
        </div>
        <div class="signature-cell">
          <span class="signature-label">ພະແນກບັນຊີ-ການເງິນ<br>A&F Dept.</span>
          <div style="margin-top:auto;padding-top:8px;border-top:1px solid #cbd5e0">
            ${opo?.manager || ""}
          </div>
        </div>
        <div class="signature-cell">
          <span class="signature-label">ຜູ້ຈັດການ<br>Manager</span>
          <div style="margin-top:auto;padding-top:8px;border-top:1px solid #cbd5e0">
            ${opo?.createdBy || ""}
          </div>
        </div>
        <div class="signature-cell">
          <span class="signature-label">ປະທານ/ຮອງປະທານ<br>Approved By</span>
          <div style="margin-top:auto;padding-top:8px;border-top:1px solid #cbd5e0"></div>
        </div>
      </div>
    </div>

    <div class="note-section">
      
    </div>
  </div>
</body>
</html>`);

    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 300);
    };
  };
  return (
    <Box py={8} px={6}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Flex justify="space-between" align="center">
          <Box>
            <Heading
              fontFamily="Noto Sans Lao, sans-serif"
              size="lg"
              color="gray.700"
            >
              ໃບເບີກຈ່າຍ
            </Heading>
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              fontSize="sm"
              color="gray.500"
            >
              Disbursement
            </Text>
          </Box>
          {user?.role === "admin" && (
            <Button
              fontFamily="Noto Sans Lao, sans-serif"
              leftIcon={<Plus size={18} />}
              colorScheme="blue"
              onClick={() => navigate("/disbursement_form/create")}
            >
              ສ້າງໃບເບີກຈ່າຍ
            </Button>
          )}
        </Flex>

        {/* Search */}
        <Card borderRadius="xl">
          <CardBody>
            <Input
              fontFamily="Noto Sans Lao, sans-serif"
              placeholder="ຄົ້ນຫາເລກທີ..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              maxW="300px"
            />
          </CardBody>
        </Card>

        {/* Error */}
        {error && (
          <Alert status="error" borderRadius="lg">
            <AlertIcon />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Table */}
        <Card borderRadius="xl">
          <CardBody>
            {loading ? (
              <Flex justify="center" py={10}>
                <Spinner size="xl" color="blue.500" />
              </Flex>
            ) : data.length === 0 ? (
              <Text
                fontFamily="Noto Sans Lao, sans-serif"
                textAlign="center"
                color="gray.400"
                py={8}
              >
                ບໍ່ມີຂໍ້ມູນ
              </Text>
            ) : (
              <Box overflowX="auto">
                <Table>
                  <Thead bg="blue.50">
                    <Tr>
                      <Th fontFamily="Noto Sans Lao, sans-serif">ເລກທີ</Th>
                      <Th fontFamily="Noto Sans Lao, sans-serif">OPO</Th>
                      <Th fontFamily="Noto Sans Lao, sans-serif">ຜູ້ສະໜອງ</Th>
                      <Th fontFamily="Noto Sans Lao, sans-serif">ວັນທີເບີກ</Th>
                      <Th fontFamily="Noto Sans Lao, sans-serif">ຜູ້ສ້າງ</Th>
                      <Th fontFamily="Noto Sans Lao, sans-serif">ຈັດການ</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {data.map((row) => (
                      <Tr key={row._id} _hover={{ bg: "gray.50" }}>
                        <Td
                          fontFamily="Noto Sans Lao, sans-serif"
                          fontWeight="bold"
                        >
                          {row.serial}
                        </Td>
                        <Td fontFamily="Noto Sans Lao, sans-serif">
                          <Badge colorScheme="blue">
                            {row.opoId?.serial || row.opoId?.number}
                          </Badge>
                        </Td>
                        <Td fontFamily="Noto Sans Lao, sans-serif">
                          {row.opoId?.partnerId?.name || "-"}
                        </Td>
                        <Td fontFamily="Noto Sans Lao, sans-serif">
                          {formatDate(row.disbursedAt)}
                        </Td>
                        <Td>
                          <Badge fontFamily="Noto Sans Lao, sans-serif">
                            {row.createdBy?.username}
                          </Badge>
                        </Td>
                        <Td>
                          <HStack spacing={2}>
                            <IconButton
                              icon={<FileText size={16} />}
                              size="sm"
                              colorScheme="green"
                              onClick={() => generatePDF(row)}
                              aria-label="Print PDF"
                            />
                            {user?.role === "admin" && (
                              <IconButton
                                icon={<Trash2 size={16} />}
                                size="sm"
                                colorScheme="red"
                                onClick={() => handleDelete(row._id)}
                                aria-label="Delete"
                              />
                            )}
                          </HStack>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            )}
          </CardBody>
        </Card>

        {/* Pagination */}
        <HStack justify="center" spacing={2}>
          <Button
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            isDisabled={page === 1}
          >
            ←
          </Button>
          <Badge colorScheme="purple" px={4} py={2} borderRadius="full">
            {page} / {totalPages}
          </Badge>
          <Button
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            isDisabled={page === totalPages}
          >
            →
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};

export default DisbursementList;
