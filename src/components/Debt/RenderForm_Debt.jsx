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
  IconButton,
  VStack,
  HStack,
  FormErrorMessage,
  Textarea,
  useToast,
  Menu,
  MenuList,
  MenuButton,
  MenuItem,
  Heading,
} from "@chakra-ui/react";
import { AddIcon, DeleteIcon } from "@chakra-ui/icons";
import { ChevronDownIcon } from "lucide-react";
import { fetchCategories } from "../../store/reducer/partner";
import api from "../../api/api";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const RenderForm_Debt = () => {
  const [formData, setFormData] = useState({
    serial: "",
    description: "",
    debtType: "payable",
    paymentMethod: "",
    date: "",
    amounts: [{ currency: "THB", amount: "", installments: [], accountId: "" }],
    note: "",
    reason: "",
    partnerId: null,
  });
  const navigate = useNavigate();
  const { state } = useLocation();
  const debt = state?.debt;
  const mode = state?.mode;
  const { user } = useAuth();
  const [errors, setErrors] = useState({});
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const toast = useToast();
  const [value, setValue] = useState("");
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
  const { categoriesRedu: categories } = useSelector((state) => state.partner);
  const dispatch = useDispatch();
  const statusOptions = ["ຄ້າງຊຳລະ", "ຊຳລະບາງສ່ວນ", "ຊຳລະຄົບ"];

  const fetchC = async () => {
    try {
      await Promise.all([dispatch(fetchCategories()).unwrap()]);
    } catch (error) {
      console.error("Fetch failed:", error);
    }
  };
  const fetchPartners = async () => {
    try {
      const { data } = await api.get("/api/debt/partners");

      // แยก supplier / customer
      const suppliersData = data?.data?.filter((p) => p.type === "supplier");
      const customersData = data?.data?.filter((p) => p.type === "customer");

      setSuppliers(suppliersData);
      setCustomers(customersData);
    } catch (error) {
      toast({
        title: "ມີບາງຢ່າງຜິດພາດກະລຸນາລອງໃໝ່ ພາຍຫລັງ",
        description: error?.response?.data?.message || "ບໍ່ສາມາດໂຫລດຂໍ້ມູນໄດ້",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };
  const partnersOptions =
    formData.debtType === "payable"
      ? suppliers
      : formData.debtType === "receivable"
      ? customers
      : [];
  const validateForm = () => {
    const newErrors = {};
    if (!formData.serial.trim()) newErrors.serial = "ກະລຸນາປ້ອນເລກທີ່";

    if (!formData?.partnerId) {
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
      if (!curr.accountId) {
        newErrors[`amount_${index}`] = "ກະລຸນາເລືອກກະເປົາເງິນ ຫຼືບັນຊີ";
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
  const resetForm = () => {
    setFormData({
      serial: "",
      description: "",
      debtType: "payable",
      paymentMethod: "",
      date: "",
      amounts: [
        { currency: "THB", amount: "", installments: [], accountId: "" },
      ],
      note: "",
      reason: "",
    });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    // 1️⃣ Confirm ก่อนบันทึก
    const confirm = await Swal.fire({
      icon: "question",
      title: mode === "update" ? "ຢືນຢັນການແກ້ໄຂ" : "ຢືນຢັນການບັນທຶກ",
      text:
        mode === "update"
          ? "ທ່ານຕ້ອງການແກ້ໄຂຂໍ້ມູນນີ້ຫຼືບໍ່?"
          : "ທ່ານຕ້ອງການບັນທຶກຂໍ້ມູນນີ້ຫຼືບໍ່?",
      showCancelButton: true,
      confirmButtonText: "ຢືນຢັນ",
      cancelButtonText: "ຍົກເລີກ",
      reverseButtons: true,
    });

    if (!confirm.isConfirmed) return;

    try {
      // 2️⃣ Loading
      Swal.fire({
        title: "ກຳລັງບັນທຶກ...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const allInstallments = formData.amounts.flatMap((amt) =>
        (amt.installments || []).map((inst) => ({
          dueDate: inst.dueDate,
          amount: parseFloat(inst.amount),
          currency: amt.currency,
          isPaid: inst.isPaid || false,
          paidDate: inst.paidDate || null,
          _id: inst._id || undefined,
        }))
      );

      const submitData = {
        ...formData,
        amounts: formData.amounts.map((amt) => ({
          currency: amt.currency,
          amount: parseFloat(amt.amount),
          accountId: amt.accountId,
        })),
        installments: allInstallments,
      };

      const url = mode === "update" ? `/api/debt/${debt._id}` : `/api/debt`;
      const method = mode === "update" ? "put" : "post";

      await api[method](url, submitData);

      // 3️⃣ Success
      Swal.fire({
        icon: "success",
        title: mode === "update" ? "ແກ້ໄຂສຳເລັດ" : "ບັນທຶກສຳເລັດ",
        timer: 1500,
        showConfirmButton: false,
      });

      if (mode === "update") {
        navigate(-1);
      } else {
        resetForm();
      }
    } catch (error) {
      console.error("Submit error:", error);

      // 4️⃣ Error
      Swal.fire({
        icon: "error",
        title: "ເກີດຂໍ້ຜິດພາດ",
        text:
          error?.response?.data?.message ||
          "ບໍ່ສາມາດບັນທຶກໜີ້ສິນໄດ້. ກະລຸນາລອງໃໝ່.",
      });
    }
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
      _id: undefined,
    };

    newAmounts[currencyIndex].installments = [
      ...currentInstallments,
      newInstallment,
    ];

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
  const [addCategory, setAddCategory] = useState("");
  const [addSearch, setAddSearch] = useState("");

  const addFiltered = categories.filter((c) =>
    c.name.toLowerCase().includes(addSearch.toLowerCase())
  );
  const addSelectedLabel =
    categories.find((c) => c._id === addCategory)?.name || "ເລືອກ";
  const laoType = {
    income: "💰 ລາຍຮັບ",
    asset: "🏦 ຊັບສິນ",
    cogs: "📦 ຕົ້ນທຶນຂາຍ",
    "selling-expense": "🛒 ຄ່າໃຊ້ຈ່າຍຈຳໜ່າຍ",
    "admin-expense": "🏢 ຄ່າໃຊ້ຈ່າຍບໍລິຫານ",
    expense: "📉 ຄ່າໃຊ້ຈ່າຍອື່ນໆ",
  };
  const bankOptions = (user?.companyId?.bankAccounts || []).map((b) => ({
    label: `${b.bankName} (${b.currency})`,
    value: b._id,
    currency: b.currency,
  }));
  const cashOptions = (user?.companyId?.cashAccounts || []).map((b) => ({
    label: `${b.name} (${b.currency})`,
    value: b._id,
    currency: b.currency,
  }));

  useEffect(() => {
    fetchPartners();
    fetchC();
  }, []);
  useEffect(() => {
    if (mode === "update") {
      const amountsWithInstallments = debt?.amounts?.map((amt) => ({
        currency: amt.currency,
        amount: amt.amount.toString(),
        accountId: amt.accountId,
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
            _id: inst._id || undefined,
          })),
      }));

      setFormData({
        serial: debt?.serial,
        categoryId: debt?.categoryId,
        description: debt?.description,
        debtType: debt?.debtType,
        paymentMethod: debt?.paymentMethod,
        date: debt?.date
          ? new Date(debt?.date).toISOString().split("T")[0]
          : "",
        amounts: amountsWithInstallments,
        note: debt?.note || "",
        reason: debt?.reason || "",
        partnerId: debt?.partnerId?._id || debt?.partnerId?.name || "",
      });
    }
  }, []);
  return (
    <Box bg="white" borderRadius="xl" boxShadow="lg" p={8}>
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
          {mode === "create" ? "ເພີ່ມລາຍການ" : "ແກ້ໄຂລາຍການ"}-
          {debt?.serial || ""}
        </Heading>
      </HStack>
      <form onSubmit={handleSubmit}>
        <VStack spacing={6}>
          {/* Document Info Section   */}
          <Box
            w="full"
            bg="blue.50"
            p={4}
            borderRadius="lg"
            borderLeft="4px"
            borderLeftColor="blue.500"
          >
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              fontWeight="bold"
              fontSize="lg"
              mb={3}
              color="blue.700"
            >
              ຂໍ້ມູນເອກະສານ
            </Text>
            <HStack w="full" spacing={4}>
              <FormControl isInvalid={errors.serial} isRequired flex={1}>
                <FormLabel
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontSize="sm"
                  fontWeight="semibold"
                >
                  ເລກທີ່ເອກະສານ
                </FormLabel>
                <Input
                  bg="white"
                  value={formData.serial}
                  onChange={(e) =>
                    setFormData({ ...formData, serial: e.target.value })
                  }
                  borderRadius="md"
                  _focus={{
                    borderColor: "blue.400",
                    boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
                  }}
                />
                <FormErrorMessage fontFamily="Noto Sans Lao, sans-serif">
                  {errors.serial}
                </FormErrorMessage>
              </FormControl>
              <FormControl isInvalid={errors.date} isRequired flex={1}>
                <FormLabel
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontSize="sm"
                  fontWeight="semibold"
                >
                  ວັນທີ່
                </FormLabel>
                <Input
                  bg="white"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  borderRadius="md"
                  _focus={{
                    borderColor: "blue.400",
                    boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
                  }}
                />
                <FormErrorMessage fontFamily="Noto Sans Lao, sans-serif">
                  {errors.date}
                </FormErrorMessage>
              </FormControl>
            </HStack>
          </Box>

          {/* Category Section */}
          <Box
            w="full"
            bg="purple.50"
            p={4}
            borderRadius="lg"
            borderLeft="4px"
            borderLeftColor="purple.500"
          >
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              fontWeight="bold"
              fontSize="lg"
              mb={3}
              color="purple.700"
            >
              ໝວດໝູ່ ແລະ ລາຍລະອຽດ
            </Text>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontSize="sm"
                  fontWeight="semibold"
                >
                  ໝວດໝູ່
                </FormLabel>
                <Menu matchWidth>
                  <MenuButton
                    as={Button}
                    rightIcon={<ChevronDownIcon />}
                    width="100%"
                    bg="white"
                    borderRadius="md"
                    textAlign="left"
                    _hover={{ bg: "gray.50" }}
                  >
                    {addSelectedLabel}
                  </MenuButton>

                  <MenuList p={2} borderRadius="lg" boxShadow="xl">
                    <Input
                      placeholder="ຄົ້ນຫາ..."
                      value={addSearch}
                      onChange={(e) => setAddSearch(e.target.value)}
                      mb={2}
                      borderRadius="md"
                    />

                    <Box maxH="200px" overflowY="auto">
                      {addFiltered.map((item) => (
                        <MenuItem
                          key={item._id}
                          onClick={() => {
                            setValue(item._id);
                            setAddCategory(item._id);
                            setFormData({
                              ...formData,
                              categoryId: item._id,
                            });
                            setAddSearch("");
                          }}
                          borderRadius="md"
                          _hover={{ bg: "purple.50" }}
                        >
                          {item.name} - {laoType[item.type]}
                        </MenuItem>
                      ))}
                    </Box>
                  </MenuList>
                </Menu>
                <Box
                  mt={3}
                  bg="white"
                  border="2px dashed"
                  borderColor="purple.200"
                  px={4}
                  py={3}
                  borderRadius="lg"
                >
                  <Text
                    fontFamily="Noto Sans Lao, sans-serif"
                    fontSize="xs"
                    color="purple.600"
                    mb={1}
                    fontWeight="semibold"
                  >
                    ທີ່ເລືອກ:
                  </Text>

                  <Text
                    fontWeight="bold"
                    fontFamily="Noto Sans Lao, sans-serif"
                    color="purple.800"
                  >
                    {addSelectedLabel === "ເລືອກ"
                      ? formData?.categoryId?.name -
                          laoType[formData?.categoryId?.type] || "-"
                      : addSelectedLabel}
                  </Text>
                </Box>
              </FormControl>

              <FormControl isInvalid={errors.description} isRequired>
                <FormLabel
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontSize="sm"
                  fontWeight="semibold"
                >
                  ລາຍລະອຽດ
                </FormLabel>
                <Input
                  bg="white"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      description: e.target.value,
                    })
                  }
                  borderRadius="md"
                  _focus={{
                    borderColor: "purple.400",
                    boxShadow: "0 0 0 1px var(--chakra-colors-purple-400)",
                  }}
                />
                <FormErrorMessage fontFamily="Noto Sans Lao, sans-serif">
                  {errors.description}
                </FormErrorMessage>
              </FormControl>
            </VStack>
          </Box>

          {/* Debt Info Section */}
          <Box
            w="full"
            bg="orange.50"
            p={4}
            borderRadius="lg"
            borderLeft="4px"
            borderLeftColor="orange.500"
          >
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              fontWeight="bold"
              fontSize="lg"
              mb={3}
              color="orange.700"
            >
              ຂໍ້ມູນໜີ້ສິນ
            </Text>
            <VStack spacing={4}>
              <HStack w="full" spacing={4}>
                <FormControl flex={1}>
                  <FormLabel
                    fontFamily="Noto Sans Lao, sans-serif"
                    fontSize="sm"
                    fontWeight="semibold"
                  >
                    ປະເພດໜີ້ສິນ
                  </FormLabel>
                  <Select
                    bg="white"
                    fontFamily="Noto Sans Lao, sans-serif"
                    value={formData.debtType}
                    onChange={(e) =>
                      setFormData({ ...formData, debtType: e.target.value })
                    }
                    borderRadius="md"
                    _focus={{
                      borderColor: "orange.400",
                      boxShadow: "0 0 0 1px var(--chakra-colors-orange-400)",
                    }}
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
                <FormControl isInvalid={errors.partnerId} isRequired flex={1}>
                  <FormLabel
                    fontFamily="Noto Sans Lao, sans-serif"
                    fontSize="sm"
                    fontWeight="semibold"
                  >
                    ລູກໜີ້/ຜູ້ສະໜອງ
                  </FormLabel>

                  <Select
                    bg="white"
                    value={formData.partnerId || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        partnerId: e.target.value,
                      })
                    }
                    fontFamily="Noto Sans Lao, sans-serif"
                    placeholder="ເລືອກ ລູກໜີ້/ຜູ້ສະໜອງ"
                    borderRadius="md"
                    _focus={{
                      borderColor: "orange.400",
                      boxShadow: "0 0 0 1px var(--chakra-colors-orange-400)",
                    }}
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

                <FormControl
                  isInvalid={errors.paymentMethod}
                  isRequired
                  flex={1}
                >
                  <FormLabel
                    fontFamily="Noto Sans Lao, sans-serif"
                    fontSize="sm"
                    fontWeight="semibold"
                  >
                    ວິທີການຊຳລະເງຶນ
                  </FormLabel>
                  <Select
                    bg="white"
                    fontFamily="Noto Sans Lao, sans-serif"
                    value={formData.paymentMethod}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paymentMethod: e.target.value,
                      })
                    }
                    borderRadius="md"
                    _focus={{
                      borderColor: "orange.400",
                      boxShadow: "0 0 0 1px var(--chakra-colors-orange-400)",
                    }}
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
                <FormLabel
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontSize="sm"
                  fontWeight="semibold"
                >
                  ສາເຫດ
                </FormLabel>
                <Input
                  bg="white"
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  borderRadius="md"
                  _focus={{
                    borderColor: "orange.400",
                    boxShadow: "0 0 0 1px var(--chakra-colors-orange-400)",
                  }}
                />
                <FormErrorMessage fontFamily="Noto Sans Lao, sans-serif">
                  {errors.reason}
                </FormErrorMessage>
              </FormControl>
            </VStack>
          </Box>

          {/* Amount Section */}
          <Box
            w="full"
            bg="green.50"
            p={4}
            borderRadius="lg"
            borderLeft="4px"
            borderLeftColor="green.500"
          >
            <Flex justify="space-between" align="center" mb={4}>
              <Text
                fontFamily="Noto Sans Lao, sans-serif"
                fontWeight="bold"
                fontSize="lg"
                color="green.700"
              >
                ຈຳນວນເງິນ
              </Text>
              <Button
                fontFamily="Noto Sans Lao, sans-serif"
                size="sm"
                leftIcon={<AddIcon />}
                colorScheme="green"
                onClick={addCurrency}
                borderRadius="full"
                px={4}
              >
                ເພີ່ມສະກຸນເງິນ
              </Button>
            </Flex>

            {formData.amounts.map((curr, currIndex) => {
              const accountOptions =
                formData.paymentMethod === "ເງິນສົດ"
                  ? cashOptions?.filter((acc) => acc.currency === curr.currency)
                  : bankOptions?.filter(
                      (acc) => acc.currency === curr.currency
                    );
              return (
                <Box
                  key={currIndex}
                  p={5}
                  borderWidth={2}
                  borderColor="green.200"
                  rounded="xl"
                  bg="white"
                  mb={4}
                  boxShadow="md"
                >
                  <HStack spacing={3} mb={4}>
                    <Select
                      placeholder="ເລືອກ"
                      value={curr.accountId}
                      onChange={(e) =>
                        updateAmount(currIndex, "accountId", e.target.value)
                      }
                      w="140px"
                      fontFamily="Noto Sans Lao, sans-serif"
                      borderRadius="md"
                    >
                      {accountOptions?.map((acc) => (
                        <option key={acc.value} value={acc.value}>
                          {acc.label}
                        </option>
                      ))}
                    </Select>
                    <Select
                      fontFamily="Noto Sans Lao, sans-serif"
                      value={curr.currency}
                      onChange={(e) =>
                        updateAmount(currIndex, "currency", e.target.value)
                      }
                      w="150px"
                      borderRadius="md"
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
                      flex={1}
                    >
                      <Input
                        type="number"
                        step="0.01"
                        value={curr.amount}
                        onChange={(e) =>
                          updateAmount(currIndex, "amount", e.target.value)
                        }
                        placeholder="ຈຳນວນເງິນທັງໝົດ"
                        borderRadius="md"
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
                        borderRadius="md"
                      />
                    )}
                  </HStack>

                  <Box ml={2} p={4} bg="gray.50" borderRadius="lg">
                    <Flex justify="space-between" align="center" mb={3}>
                      <Text
                        fontFamily="Noto Sans Lao, sans-serif"
                        fontSize="md"
                        fontWeight="semibold"
                        color="gray.700"
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
                        borderRadius="full"
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
                        bg="red.50"
                        p={2}
                        borderRadius="md"
                      >
                        {errors[`installment_total_${currIndex}`]}
                      </Text>
                    )}

                    {curr.installments?.length > 0 ? (
                      <VStack spacing={3}>
                        {curr.installments.map((inst, instIndex) => {
                          return (
                            <HStack
                              key={instIndex}
                              spacing={3}
                              p={3}
                              bg="white"
                              rounded="lg"
                              borderWidth={1}
                              borderColor="gray.200"
                              w="full"
                              boxShadow="sm"
                            >
                              <VStack align="start" spacing={1} flex={1}>
                                <FormLabel
                                  fontFamily={"Noto Sans Lao, sans-serif"}
                                  fontSize="xs"
                                  mb={0}
                                  color="gray.600"
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
                                    size="sm"
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
                                    placeholder="ວັນຄົບກຳນົດ"
                                    borderRadius="md"
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

                              <VStack align="start" spacing={1} flex={1}>
                                <FormLabel
                                  fontFamily={"Noto Sans Lao, sans-serif"}
                                  fontSize="xs"
                                  mb={0}
                                  color="gray.600"
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
                                    size="sm"
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
                                    placeholder="ວັນຄົບກຳນົດ"
                                    borderRadius="md"
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

                              <VStack align="start" spacing={1} flex={1}>
                                <FormLabel
                                  fontFamily={"Noto Sans Lao, sans-serif"}
                                  fontSize="xs"
                                  mb={0}
                                  color="gray.600"
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
                                    size="sm"
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
                                    borderRadius="md"
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

                              <VStack spacing={2}>
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
                                  colorScheme="green"
                                >
                                  <Text
                                    fontFamily={"Noto Sans Lao, sans-serif"}
                                    fontSize="sm"
                                  >
                                    ຊຳລະແລ້ວ
                                  </Text>
                                </Checkbox>

                                <IconButton
                                  size="sm"
                                  icon={<DeleteIcon />}
                                  colorScheme="red"
                                  variant="ghost"
                                  onClick={() =>
                                    removeInstallment(currIndex, instIndex)
                                  }
                                  aria-label="ລົບງວດ"
                                  borderRadius="md"
                                />
                              </VStack>
                            </HStack>
                          );
                        })}
                        <Box
                          bg="blue.50"
                          p={3}
                          rounded="lg"
                          w="full"
                          borderWidth={1}
                          borderColor="blue.200"
                        >
                          <HStack justify="space-between">
                            <Text
                              fontFamily="Noto Sans Lao, sans-serif"
                              fontSize="sm"
                              fontWeight="semibold"
                            >
                              ຍອດລວມງວດ:{" "}
                              <Text as="span" color="blue.600">
                                {curr.installments
                                  .reduce(
                                    (sum, inst) =>
                                      sum + parseFloat(inst.amount || 0),
                                    0
                                  )
                                  .toFixed(2)}{" "}
                                {curr.currency}
                              </Text>
                            </Text>
                            <Text
                              fontFamily="Noto Sans Lao, sans-serif"
                              fontSize="sm"
                              fontWeight="semibold"
                            >
                              ຍອດທັງໝົດ:{" "}
                              <Text as="span" color="green.600">
                                {curr.amount} {curr.currency}
                              </Text>
                            </Text>
                          </HStack>
                        </Box>
                        <Box
                          bg="orange.50"
                          p={3}
                          rounded="lg"
                          w="full"
                          borderWidth={1}
                          borderColor="orange.200"
                        >
                          <Text
                            fontFamily="Noto Sans Lao, sans-serif"
                            fontWeight="semibold"
                            fontSize="sm"
                          >
                            ຍອດເຫຼືອ(ຍັງບໍ່ຊຳລະ):{" "}
                            <Text as="span" color="orange.600">
                              {reminingBalance(currIndex)}
                            </Text>
                          </Text>
                        </Box>
                      </VStack>
                    ) : (
                      <Box
                        bg="white"
                        p={4}
                        borderRadius="lg"
                        borderWidth={1}
                        borderColor="gray.200"
                        textAlign="center"
                      >
                        <Text
                          fontFamily="Noto Sans Lao, sans-serif"
                          fontSize="sm"
                          color="gray.500"
                          fontStyle="italic"
                        >
                          ບໍ່ມີການແບ່ງຊຳລະເງິນເປັນງວດ (ຊຳລະຄັ້ງດຽວ)
                        </Text>
                      </Box>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>

          {/* Note Section */}
          <Box
            w="full"
            bg="gray.50"
            p={4}
            borderRadius="lg"
            borderLeft="4px"
            borderLeftColor="gray.400"
          >
            <FormControl>
              <FormLabel
                fontFamily="Noto Sans Lao, sans-serif"
                fontSize="sm"
                fontWeight="semibold"
              >
                ໝາຍເຫດ
              </FormLabel>
              <Textarea
                bg="white"
                fontFamily="Noto Sans Lao, sans-serif"
                value={formData.note}
                onChange={(e) =>
                  setFormData({ ...formData, note: e.target.value })
                }
                rows={3}
                borderRadius="md"
                _focus={{
                  borderColor: "gray.400",
                  boxShadow: "0 0 0 1px var(--chakra-colors-gray-400)",
                }}
              />
            </FormControl>
          </Box>
        </VStack>
      </form>

      {/* Submit Button */}
      <Box mt={6} pt={4} borderTop="2px solid" borderColor="gray.200">
        <Button
          fontFamily="Noto Sans Lao, sans-serif"
          colorScheme="blue"
          size="lg"
          w="full"
          type="submit"
          onClick={handleSubmit}
          aria-label="ເພີ່ມລາຍການ"
          borderRadius="xl"
          boxShadow="lg"
          _hover={{ transform: "translateY(-2px)", boxShadow: "xl" }}
          transition="all 0.2s"
        >
          {mode === "update" ? "ອັບເດດລາຍການ" : "ເພີ່ມລາຍການ"}
        </Button>
      </Box>
    </Box>
  );
};

export default RenderForm_Debt;
