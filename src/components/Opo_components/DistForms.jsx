import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardBody,
  FormControl,
  FormLabel,
  VStack,
  HStack,
  Flex,
  Heading,
  Text,
  Textarea,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Input,
  Divider,
  Select,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/api";

const PAYMENT_METHODS = { cash: "ເງິນສົດ", bank_transfer: "ໂອນເງິນ" };

function formatDate(d) {
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()}`;
}

const groupByCurrency = (items) =>
  items.reduce((acc, item) => {
    acc[item.currency] =
      (acc[item.currency] || 0) + parseFloat(item.amount || 0);
    return acc;
  }, {});

const DisbursementForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [opoSearch, setOpoSearch] = useState("");
  const [opoList, setOpoList] = useState([]);
  const [opoLoading, setOpoLoading] = useState(false);
  const [selectedOpo, setSelectedOpo] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // ✅ เพิ่ม state สำหรับข้อมูลที่ต้องส่ง backend
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [accounts, setAccounts] = useState({ cash: [], bank: [] });
  const [amounts, setAmounts] = useState([]); // [{ currency, amount, accountId }]
  // โหลด OPO
  useEffect(() => {
    const fetchOpos = async () => {
      setOpoLoading(true);
      try {
        const { data } = await api.get("/api/opo", {
          params: { status: "APPROVED", limit: 50 },
        });
        setOpoList(data.data.filter((o) => o.status !== "paid"));
      } catch (err) {
        console.error(err);
      } finally {
        setOpoLoading(false);
      }
    };
    fetchOpos();
  }, []);

  // ✅ โหลด categories และ accounts ของ company
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const catRes = await api.get("/api/category/get-category", {
          params: { type: "expense" },
        });

        setCategories(catRes.data?.data || catRes.data || []);

        // ✅ ดึงจาก user โดยตรง — ปรับ field name ให้ตรงกับที่ console.log เห็น
        setAccounts({
          cash: user?.companyId?.cashAccounts || user?.cashAccounts || [],
          bank: user?.companyId?.bankAccounts || user?.bankAccounts || [],
        });
      } catch (err) {
        console.error("fetchMeta error:", err);
      }
    };
    fetchMeta();
  }, [user]); // ✅ dependency user ด้วย

  // ✅ เมื่อเลือก OPO → สร้าง amounts อัตโนมัติจาก items
  const handleSelectOpo = (opo) => {
    setSelectedOpo(opo);

    // รวม amount ตาม currency จาก OPO items
    const grouped = groupByCurrency(opo.items || []);
    const initialAmounts = Object.entries(grouped).map(
      ([currency, amount]) => ({
        currency,
        amount,
        accountId: "", // ให้ user เลือก account
      })
    );
    setAmounts(initialAmounts);
  };

  // ✅ เปลี่ยน accountId ของแต่ละ currency
  const handleAccountChange = (currency, accountId) => {
    setAmounts((prev) =>
      prev.map((a) => (a.currency === currency ? { ...a, accountId } : a))
    );
  };

  const currentAccounts =
    paymentMethod === "cash" ? accounts.cash : accounts.bank;

  const filteredOpos = opoList.filter((o) => {
    const q = opoSearch.toLowerCase();
    return (
      (o.serial || o.number || "").toLowerCase().includes(q) ||
      (o.partnerId?.name || "").toLowerCase().includes(q)
    );
  });

  const handleSave = async () => {
    if (!selectedOpo) {
      Swal.fire({ icon: "warning", title: "ກະລຸນາເລືອກ OPO" });
      return;
    }
    if (!categoryId) {
      Swal.fire({ icon: "warning", title: "ກະລຸນາເລືອກໝວດໝູ່" });
      return;
    }
    const missingAccount = amounts.find((a) => !a.accountId);
    if (missingAccount) {
      Swal.fire({
        icon: "warning",
        title: `ກະລຸນາເລືອກບັນຊີສຳລັບ ${missingAccount.currency}`,
      });
      return;
    }

    const confirm = await Swal.fire({
      icon: "question",
      title: "ຢືນຢັນການສ້າງໃບເບີກຈ່າຍ",
      text: `OPO: ${selectedOpo.serial || selectedOpo.number}`,
      showCancelButton: true,
      confirmButtonText: "ຢືນຢັນ",
      cancelButtonText: "ຍົກເລີກ",
      reverseButtons: true,
    });
    if (!confirm.isConfirmed) return;

    setSaving(true);
    Swal.fire({
      title: "ກຳລັງບັນທຶກ...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      await api.post("/api/disbursement", {
        opoId: selectedOpo._id,
        note,
        categoryId, // ✅
        paymentMethod, // ✅
        amounts, // ✅
      });
      Swal.fire({
        icon: "success",
        title: "ສ້າງໃບເບີກຈ່າຍສຳເລັດ",
        timer: 1500,
        showConfirmButton: false,
      });
      navigate("/disbursement");
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "ຜິດພາດ",
        text: err?.response?.data?.message || "ບໍ່ສຳເລັດ",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box py={8} px={6}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <Button
            fontFamily="Noto Sans Lao, sans-serif"
            variant="ghost"
            onClick={() => navigate(-1)}
          >
            ⬅ ກັບຄືນ
          </Button>
          <Heading
            fontFamily="Noto Sans Lao, sans-serif"
            size="lg"
            bgGradient="linear(to-r, teal.400, blue.500)"
            bgClip="text"
          >
            ສ້າງໃບເບີກຈ່າຍ
          </Heading>
        </HStack>

        {/* Step 1 — เลือก OPO */}
        <Card variant="outline" borderRadius="2xl">
          <CardBody>
            <Heading fontFamily="Noto Sans Lao, sans-serif" size="sm" mb={4}>
              1. ເລືອກໃບສັ່ງຊື້ (OPO ທີ່ອະນຸມັດແລ້ວ)
            </Heading>
            <Input
              fontFamily="Noto Sans Lao, sans-serif"
              placeholder="ຄົ້ນຫາ OPO..."
              value={opoSearch}
              onChange={(e) => setOpoSearch(e.target.value)}
              mb={3}
            />
            {opoLoading ? (
              <Flex justify="center" py={4}>
                <Spinner color="blue.500" />
              </Flex>
            ) : filteredOpos.length === 0 ? (
              <Text
                fontFamily="Noto Sans Lao, sans-serif"
                color="gray.400"
                textAlign="center"
                py={4}
              >
                ບໍ່ມີ OPO ທີ່ພ້ອມເບີກຈ່າຍ
              </Text>
            ) : (
              <Box overflowX="auto">
                <Table size="sm">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th fontFamily="Noto Sans Lao, sans-serif">ເລືອກ</Th>
                      <Th fontFamily="Noto Sans Lao, sans-serif">ເລກທີ</Th>
                      <Th fontFamily="Noto Sans Lao, sans-serif">ຜູ້ສະໜອງ</Th>
                      <Th fontFamily="Noto Sans Lao, sans-serif">ວັນທີ</Th>
                      <Th fontFamily="Noto Sans Lao, sans-serif">ລາຍການ</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredOpos.map((opo) => (
                      <Tr
                        key={opo._id}
                        cursor="pointer"
                        bg={selectedOpo?._id === opo._id ? "blue.50" : "white"}
                        _hover={{ bg: "blue.50" }}
                        onClick={() => handleSelectOpo(opo)} // ✅ ใช้ handleSelectOpo
                      >
                        <Td>
                          <Box
                            w={4}
                            h={4}
                            borderRadius="full"
                            border="2px solid"
                            borderColor={
                              selectedOpo?._id === opo._id
                                ? "blue.500"
                                : "gray.300"
                            }
                            bg={
                              selectedOpo?._id === opo._id
                                ? "blue.500"
                                : "white"
                            }
                          />
                        </Td>
                        <Td
                          fontFamily="Noto Sans Lao, sans-serif"
                          fontWeight="bold"
                        >
                          {opo.serial || opo.number}
                        </Td>
                        <Td fontFamily="Noto Sans Lao, sans-serif">
                          {opo.partnerId?.name || "-"}
                        </Td>
                        <Td fontFamily="Noto Sans Lao, sans-serif">
                          {formatDate(opo.date)}
                        </Td>
                        <Td fontFamily="Noto Sans Lao, sans-serif">
                          {(opo.items || []).length} ລາຍການ
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            )}
          </CardBody>
        </Card>

        {/* Step 2 — รายละเอียด OPO */}
        {selectedOpo && (
          <Card variant="outline" borderRadius="2xl" borderColor="blue.200">
            <CardBody>
              <Heading
                fontFamily="Noto Sans Lao, sans-serif"
                size="sm"
                mb={4}
                color="blue.600"
              >
                2. ລາຍລະອຽດ OPO ທີ່ເລືອກ
              </Heading>
              <HStack mb={4} spacing={6}>
                <Box>
                  <Text
                    fontFamily="Noto Sans Lao, sans-serif"
                    fontSize="xs"
                    color="gray.500"
                  >
                    ເລກທີ
                  </Text>
                  <Text
                    fontFamily="Noto Sans Lao, sans-serif"
                    fontWeight="bold"
                  >
                    {selectedOpo.serial || selectedOpo.number}
                  </Text>
                </Box>
                <Box>
                  <Text
                    fontFamily="Noto Sans Lao, sans-serif"
                    fontSize="xs"
                    color="gray.500"
                  >
                    ຜູ້ສະໜອງ
                  </Text>
                  <Text
                    fontFamily="Noto Sans Lao, sans-serif"
                    fontWeight="bold"
                  >
                    {selectedOpo.partnerId?.name || "-"}
                  </Text>
                </Box>
                <Box>
                  <Text
                    fontFamily="Noto Sans Lao, sans-serif"
                    fontSize="xs"
                    color="gray.500"
                  >
                    ວັນທີ
                  </Text>
                  <Text fontFamily="Noto Sans Lao, sans-serif">
                    {formatDate(selectedOpo.date)}
                  </Text>
                </Box>
              </HStack>

              <Table size="sm" mb={4}>
                <Thead bg="gray.50">
                  <Tr>
                    <Th fontFamily="Noto Sans Lao, sans-serif">#</Th>
                    <Th fontFamily="Noto Sans Lao, sans-serif">ລາຍລະອຽດ</Th>
                    <Th fontFamily="Noto Sans Lao, sans-serif">ຈຳນວນ</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {(selectedOpo.items || []).map((item, i) => (
                    <Tr key={item._id || i}>
                      <Td fontFamily="Noto Sans Lao, sans-serif">{i + 1}</Td>
                      <Td fontFamily="Noto Sans Lao, sans-serif">
                        {item.description}
                      </Td>
                      <Td
                        fontFamily="Noto Sans Lao, sans-serif"
                        fontWeight="bold"
                      >
                        {Number(item.amount).toLocaleString()} {item.currency}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>

              <Divider mb={3} />
              <Flex justify="flex-end" gap={4} flexWrap="wrap">
                {Object.entries(groupByCurrency(selectedOpo.items || [])).map(
                  ([currency, amount]) => (
                    <Box
                      key={currency}
                      bg="blue.50"
                      px={4}
                      py={2}
                      borderRadius="md"
                      border="1px solid"
                      borderColor="blue.200"
                    >
                      <Text
                        fontFamily="Noto Sans Lao, sans-serif"
                        fontSize="xs"
                        color="gray.500"
                      >
                        ຍອດລວມ
                      </Text>
                      <Text
                        fontFamily="Noto Sans Lao, sans-serif"
                        fontWeight="bold"
                        fontSize="lg"
                        color="blue.600"
                      >
                        {amount.toLocaleString()} {currency}
                      </Text>
                    </Box>
                  )
                )}
              </Flex>
            </CardBody>
          </Card>
        )}

        {/* ✅ Step 3 — ໝວດໝູ່ + ວິທີຊຳລະ + ບັນຊີ */}
        {selectedOpo && (
          <Card variant="outline" borderRadius="2xl">
            <CardBody>
              <Heading fontFamily="Noto Sans Lao, sans-serif" size="sm" mb={4}>
                3. ຂໍ້ມູນການຊຳລະ
              </Heading>
              <VStack spacing={4} align="stretch">
                {/* Category */}
                <FormControl isRequired>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ໝວດໝູ່ລາຍຈ່າຍ
                  </FormLabel>
                  <Select
                    fontFamily="Noto Sans Lao, sans-serif"
                    placeholder="ເລືອກໝວດໝູ່..."
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                {/* Payment Method */}
                <FormControl isRequired>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ວິທີຊຳລະ
                  </FormLabel>
                  <Select
                    fontFamily="Noto Sans Lao, sans-serif"
                    value={paymentMethod}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value);
                      // reset accountId ทุก currency เมื่อเปลี่ยน method
                      setAmounts((prev) =>
                        prev.map((a) => ({ ...a, accountId: "" }))
                      );
                    }}
                  >
                    <option value="cash">ເງິນສົດ</option>
                    <option value="bank_transfer">ໂອນເງິນ</option>
                  </Select>
                </FormControl>

                {/* Account per currency */}
                {amounts.map((a) => (
                  <FormControl key={a.currency} isRequired>
                    <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                      ບັນຊີສຳລັບ {a.currency}{" "}
                      <Text as="span" fontWeight="bold">
                        ({a.amount.toLocaleString()} {a.currency})
                      </Text>
                    </FormLabel>
                    <Select
                      fontFamily="Noto Sans Lao, sans-serif"
                      placeholder="ເລືອກບັນຊີ..."
                      value={a.accountId}
                      onChange={(e) =>
                        handleAccountChange(a.currency, e.target.value)
                      }
                    >
                      {currentAccounts
                        .filter((acc) => acc.currency === a.currency)
                        .map((acc) => (
                          <option key={acc._id} value={acc._id}>
                            {acc.name} ({acc.currency})
                          </option>
                        ))}
                    </Select>
                  </FormControl>
                ))}
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Step 4 — หมายเหตุ */}
        <Card variant="outline" borderRadius="2xl">
          <CardBody>
            <Heading fontFamily="Noto Sans Lao, sans-serif" size="sm" mb={3}>
              4. ໝາຍເຫດ (ຖ້າມີ)
            </Heading>
            <Textarea
              fontFamily="Noto Sans Lao, sans-serif"
              placeholder="ໝາຍເຫດເພີ່ມເຕີມ..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </CardBody>
        </Card>

        {/* Save */}
        <Flex justify="flex-end">
          <Button
            size="lg"
            colorScheme="blue"
            fontFamily="Noto Sans Lao, sans-serif"
            isDisabled={!selectedOpo || saving}
            isLoading={saving}
            onClick={handleSave}
          >
            ສ້າງໃບເບີກຈ່າຍ
          </Button>
        </Flex>
      </VStack>
    </Box>
  );
};

export default DisbursementForm;
