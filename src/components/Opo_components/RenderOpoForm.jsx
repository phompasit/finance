import { SimpleGrid, useToast } from "@chakra-ui/react";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Button,
  Input,
  Select,
  Textarea,
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
  Card,
  CardBody,
} from "@chakra-ui/react";
import { Plus, Trash2 } from "lucide-react";
import api from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import PropTypes from "prop-types";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
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
const RenderOpoForm = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const opo = state?.opo;
  const selectedOpo = state?.selectedOpo;
  const mode = state?.mode;
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
  useEffect(() => {
    if (!opo) return; // สำคัญมาก

    setFormData({
      id: opo._id || "",
      serial: opo.serial || opo.number || "",
      date: opo.date,
      status_Ap: opo.status_Ap,
      requester: opo.requester || "",
      manager: opo.manager || "",
      createdBy: opo.createdBy || "",
      items: opo.items || [],
      role: opo?.userId?.role || "",
      status: opo?.status || "",
    });
  }, [opo]);
  const { user } = useAuth();
  const [itemForm, setItemForm] = useState({
    description: "",
    paymentMethod: "cash",
    currency: "LAK",
    amount: "",
    notes: "",
    reason: "",
    isLocale: false,
  });
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
  };
  const toast = useToast();

  const saveOpo = useCallback(async () => {
    /* -------------------- Validation -------------------- */
    if (!formData.serial || formData.items.length === 0) {
      await Swal.fire({
        icon: "error",
        title: "ຂໍ້ມູນບໍ່ຄົບ",
        text: "ກະລຸນາປ້ອນ Serial ແລະ ລາຍການໃຫ້ຄົບ",
      });
      return;
    }

    const invalidItem = formData.items.find(
      (item) => !item.description || !item.amount || !item.reason
    );

    if (invalidItem) {
      await Swal.fire({
        icon: "error",
        title: "ລາຍການບໍ່ຄົບ",
        text: "ທຸກລາຍການຕ້ອງມີ ລາຍລະອຽດ, ຈຳນວນເງິນ, ແລະ ສາເຫດ",
      });
      return;
    }

    /* -------------------- Confirm -------------------- */
    const confirm = await Swal.fire({
      icon: "question",
      title: mode === "update" ? "ຢືນຢັນການອັບເດດ" : "ຢືນຢັນການບັນທຶກ",
      text: "ທ່ານແນ່ໃຈວ່າຈະດຳເນີນການ?",
      showCancelButton: true,
      confirmButtonText: "ຢືນຢັນ",
      cancelButtonText: "ຍົກເລີກ",
      reverseButtons: true,
    });

    if (!confirm.isConfirmed) return;

    /* -------------------- Sanitize -------------------- */
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
        amount: Number(item.amount) || 0,
      })),
      id: selectedOpo?._id,
      createdAt: selectedOpo?.createdAt || new Date().toISOString(),
    };

    const url = mode === "update" ? `/api/opo/${sanitizedData.id}` : `/api/opo`;

    try {
      /* -------------------- Loading -------------------- */
      Swal.fire({
        title: "ກຳລັງບັນທຶກ...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const response =
        mode === "update"
          ? await api.put(url, sanitizedData)
          : await api.post(url, sanitizedData);

      Swal.fire({
        icon: "success",
        title: mode === "update" ? "ອັບເດດສຳເລັດ" : "ບັນທຶກສຳເລັດ",
        timer: 1500,
        showConfirmButton: false,
      });

      if (!selectedOpo) resetForm();
      navigate(-1);

      return response.data;
    } catch (error) {
      console.error("Save OPO error:", error);

      Swal.fire({
        icon: "error",
        title: "ເກີດຂໍ້ຜິດພາດ",
        text: error?.response?.data?.message || "ບໍ່ສາມາດບັນທຶກຂໍ້ມູນໄດ້",
      });
    }
  }, [formData, selectedOpo, mode, navigate]);

  const addItem = () => {
    if (!itemForm.description || !itemForm.amount || !itemForm.reason) {
      Swal.fire({
        icon: "warning",
        title: "ຂໍ້ມູນບໍ່ຄົບ",
        text: "ກະລຸນາລະບຸ: ລາຍລະອຽດ, ຈຳນວນເງິນ, ແລະ ສາເຫດ",
      });
      return;
    }

    const amount = Number(itemForm.amount);
    if (isNaN(amount) || amount <= 0) {
      Swal.fire({
        icon: "warning",
        title: "ຈຳນວນເງິນບໍ່ຖືກຕ້ອງ",
        text: "ກະລຸນາປ້ອນຈຳນວນເງິນຫຼາຍກວ່າ 0",
      });
      return;
    }

    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          ...itemForm,
          amount,
          id: crypto.randomUUID(),
          isLocale: true,
        },
      ],
    }));

    setItemForm({
      description: "",
      paymentMethod: "cash",
      currency: "LAK",
      amount: "",
      notes: "",
      reason: "",
    });

    Swal.fire({
      icon: "success",
      title: "ເພີ່ມລາຍການສຳເລັດ",
      timer: 1000,
      showConfirmButton: false,
    });
  };
  const removeItem = async (item) => {
    const result = await Swal.fire({
      title: "ຢືນຢັນການລຶບ",
      text: "ທ່ານແນ່ໃຈວ່າຈະລຶບລາຍການນີ້?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ລຶບ",
      cancelButtonText: "ຍົກເລີກ",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      // ✅ กรณี item ยังไม่ถูก save (local)
      if (item.isLocale) {
        setFormData((prev) => ({
          ...prev,
          items: prev.items.filter((i) => i.id !== item.id),
        }));

        Swal.fire({
          icon: "success",
          title: "ລຶບສຳເລັດ",
          timer: 1200,
          showConfirmButton: false,
        });

        return;
      }

      // ✅ กรณีลบจาก backend
      const endpoint = `/api/opo/opoId/${formData.id}/item/${item._id}`;
      await api.delete(endpoint);

      setFormData((prev) => ({
        ...prev,
        items: prev.items.filter((i) => i._id !== item._id),
      }));

      Swal.fire({
        icon: "success",
        title: "ລຶບລາຍການສຳເລັດ",
        timer: 1500,
        showConfirmButton: false,
      });

      navigate(-1);
    } catch (error) {
      console.error("Remove item error:", error);

      Swal.fire({
        icon: "error",
        title: "ຜິດພາດ",
        text: error?.response?.data?.message || "ບໍ່ສາມາດລຶບລາຍການໄດ້",
      });
    }
  };
  // Components
  const OPOItem = ({ item, onRemove, formData }) => (
    <Box
      w="full"
      p={4}
      bg="white"
      borderRadius="xl"
      border="1px solid"
      borderColor="gray.200"
      _hover={{ bg: "gray.50" }}
      transition="all 0.2s"
    >
      <Flex justify="space-between" align="flex-start" gap={4}>
        {/* ===== LEFT : DETAILS ===== */}
        <Box flex="1">
          <Text
            fontFamily="Noto Sans Lao"
            fontWeight="semibold"
            fontSize="md"
            noOfLines={2}
          >
            {item.description}
          </Text>

          <HStack spacing={3} mt={2} wrap="wrap">
            <Badge fontFamily="Noto Sans Lao" colorScheme="gray" fontSize="xs">
              ວິທີຊຳລະ {PAYMENT_METHODS[item.paymentMethod]}
            </Badge>

            {item.reason && (
              <Badge
                fontFamily="Noto Sans Lao"
                colorScheme="purple"
                fontSize="xs"
              >
                ສາເຫດ: {item.reason}
              </Badge>
            )}

            {item.notes && (
              <Badge
                fontFamily="Noto Sans Lao"
                colorScheme="yellow"
                fontSize="xs"
              >
                ໝາຍເຫດ
              </Badge>
            )}
          </HStack>
        </Box>

        {/* ===== RIGHT : AMOUNT & ACTION ===== */}
        <VStack align="flex-end" spacing={1}>
          <Text
            fontFamily="Noto Sans Lao"
            fontWeight="bold"
            fontSize="lg"
            color="blue.600"
            whiteSpace="nowrap"
          >
            {Number(item.amount || 0).toLocaleString()} {item.currency}
          </Text>

          <IconButton
            icon={<Trash2 size={16} />}
            size="sm"
            variant="ghost"
            colorScheme="red"
            onClick={() => onRemove(item)}
            aria-label="Delete item"
          />
        </VStack>
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
  return (
    <VStack spacing={8} align="stretch">
      <HStack justifyContent={"space-between"}>
        <Button
          fontFamily="Noto Sans Lao, sans-serif"
          mt={4}
          variant="ghost"
          onClick={() => navigate(-1)}
        >
          ⬅ ກັບຄືນ
        </Button>
        <Heading
          fontFamily="Noto Sans Lao, sans-serif"
          size="xl"
          bgGradient="linear(to-r, teal.400, blue.500)"
          bgClip="text"
        >
          {mode === "create" ? "ເພີ່ມລາຍການ" : "ແກ້ໄຂລາຍການ"}-{opo?.serial || ""}
        </Heading>
      </HStack>
      {/* ================= PO INFORMATION ================= */}
      <Card variant="outline" borderRadius="2xl">
        <CardBody>
          <Heading size="md" mb={6} fontFamily="Noto Sans Lao">
            ຂໍ້ມູນ PO
          </Heading>

          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
            <FormControl isRequired>
              <FormLabel fontFamily="Noto Sans Lao">ເລກທີ PO</FormLabel>
              <Input
                fontFamily="Noto Sans Lao"
                placeholder="PO-2025-001"
                value={formData.serial}
                onChange={(e) =>
                  setFormData({ ...formData, serial: e.target.value })
                }
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel fontFamily="Noto Sans Lao">ວັນທີ</FormLabel>
              <Input
                fontFamily="Noto Sans Lao"
                type="date"
                value={new Date(formData.date).toISOString().split("T")[0]}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel fontFamily="Noto Sans Lao">ສະຖານະ</FormLabel>
              <Select
                bg="gray.50"
                value={formData.status_Ap}
                onChange={(e) =>
                  setFormData({ ...formData, status_Ap: e.target.value })
                }
              >
                {Object.entries(
                  user?.role === "admin" ? STATUS_TEXTS : STATUS_TEXTS_staff
                ).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormControl>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* ================= PAYMENT & PEOPLE ================= */}
      <Card variant="outline" borderRadius="2xl">
        <CardBody>
          <Heading fontFamily="Noto Sans Lao" size="sm" mb={4}>
            ຂໍ້ມູນການຊຳລະ & ຜູ້ກ່ຽວຂ້ອງ
          </Heading>

          <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
            <FormControl isRequired>
              <FormLabel fontFamily="Noto Sans Lao">ສະຖານະການຊຳລະ</FormLabel>
              <Select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
              >
                <option value="unpaid">ຍັງບໍ່ຊຳລະ</option>
                <option value="paid">ຊຳລະແລ້ວ</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel fontFamily="Noto Sans Lao">ຜູ້ຮ້ອງຂໍ</FormLabel>
              <Input
                fontFamily="Noto Sans Lao"
                value={formData.requester}
                onChange={(e) =>
                  setFormData({ ...formData, requester: e.target.value })
                }
              />
            </FormControl>

            <FormControl>
              <FormLabel fontFamily="Noto Sans Lao">ຜູ້ຈັດການ</FormLabel>
              <Input
                fontFamily="Noto Sans Lao"
                value={formData.manager}
                onChange={(e) =>
                  setFormData({ ...formData, manager: e.target.value })
                }
              />
            </FormControl>

            <FormControl>
              <FormLabel fontFamily="Noto Sans Lao">ຜູ້ສ້າງ</FormLabel>
              <Input
                fontFamily="Noto Sans Lao"
                value={formData.createdBy}
                onChange={(e) =>
                  setFormData({ ...formData, createdBy: e.target.value })
                }
              />
            </FormControl>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* ================= ADD ITEM ================= */}
      <Card bg="gray.50" borderRadius="2xl">
        <CardBody>
          <Heading fontFamily="Noto Sans Lao" size="sm" mb={4}>
            ➕ ເພີ່ມລາຍການ
          </Heading>

          <VStack spacing={4}>
            <Textarea
              fontFamily="Noto Sans Lao"
              placeholder="ລາຍລະອຽດການຈ່າຍເງິນ..."
              value={itemForm.description}
              onChange={(e) =>
                setItemForm({ ...itemForm, description: e.target.value })
              }
            />

            <SimpleGrid
              justifyContent={"flex-start"}
              columns={{ base: 1, md: 3 }}
              spacing={4}
            >
              <Select
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

              <Select
                value={itemForm.currency}
                onChange={(e) =>
                  setItemForm({ ...itemForm, currency: e.target.value })
                }
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>

              <Input
                fontFamily="Noto Sans Lao"
                type="number"
                placeholder="0.00"
                value={itemForm.amount}
                onChange={(e) =>
                  setItemForm({ ...itemForm, amount: e.target.value })
                }
              />
            </SimpleGrid>

            <Input
              fontFamily="Noto Sans Lao"
              placeholder="ສາເຫດການຈ່າຍ"
              value={itemForm.reason}
              onChange={(e) =>
                setItemForm({ ...itemForm, reason: e.target.value })
              }
            />

            <Textarea
              fontFamily="Noto Sans Lao"
              placeholder="ໝາຍເຫດ (ຖ້າມີ)"
              value={itemForm.notes}
              onChange={(e) =>
                setItemForm({ ...itemForm, notes: e.target.value })
              }
            />

            <Button
              fontFamily="Noto Sans Lao"
              alignSelf="flex-end"
              colorScheme="green"
              leftIcon={<Plus size={18} />}
              onClick={addItem}
            >
              ເພີ່ມລາຍການ
            </Button>
          </VStack>
        </CardBody>
      </Card>

      {/* ================= ITEMS & SUMMARY ================= */}
      {formData.items.length > 0 && (
        <Card variant="outline" borderRadius="2xl">
          <CardBody>
            <Heading fontFamily="Noto Sans Lao" size="sm" mb={4}>
              ລາຍການທັງໝົດ ({formData.items.length})
            </Heading>

            <VStack spacing={3}>
              {formData.items.map((item) => (
                <OPOItem key={item._id} item={item} onRemove={removeItem} />
              ))}
            </VStack>

            <Divider my={4} />

            <Box bg="blue.50" p={4} borderRadius="lg">
              <Text fontFamily="Noto Sans Lao" fontWeight="bold" mb={2}>
                ຍອດລວມ
              </Text>
              {Object.entries(groupByCurrency(formData.items)).map(
                ([currency, amount]) => (
                  <Text
                    fontFamily="Noto Sans Lao"
                    key={currency}
                    fontSize="lg"
                    fontWeight="bold"
                    color="blue.700"
                  >
                    {amount.toLocaleString()} {currency}
                  </Text>
                )
              )}
            </Box>
          </CardBody>
        </Card>
      )}

      {/* ================= ACTION ================= */}
      <Flex justify="flex-end">
        <Button
          size="lg"
          colorScheme="blue"
          onClick={saveOpo}
          fontFamily="Noto Sans Lao"
          isDisabled={!formData.serial || formData.items.length === 0}
        >
          ບັນທຶກ
        </Button>
      </Flex>
    </VStack>
  );
};

export default RenderOpoForm;
