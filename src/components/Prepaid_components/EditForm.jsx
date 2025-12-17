import { useAuth } from "../../context/AuthContext";
import { useDispatch, useSelector } from "react-redux";
import { fetchEmployees, updateAdvance } from "../../store/reducer/advance";
import { fetchCategories } from "../../store/reducer/partner";
// PrepaidExpenseDashboard.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Heading,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Text,
  VStack,
  HStack,
  SimpleGrid,
} from "@chakra-ui/react";
import { AddIcon, ChevronDownIcon, DeleteIcon } from "@chakra-ui/icons";
import { Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
const EditForm = () => {
  const { state } = useLocation();
  const editData = state?.data;
  const [currencies, setCurrencies] = useState(["LAK", "THB", "USD", "CNY"]);
  console.log("EDIT DATA:", editData);
  const [selectedEmployee, setSelectedEmployee] = useState();
  if (!editData) {
    return <div>ບໍ່ພົບຂໍ້ມູນ</div>;
  }
  const navigate = useNavigate();
  const [editForm, setEditForm] = useState(editData);
  const { user } = useAuth();
  // Edit form multi-currency handlers\
  const [editCategory, setEditCategory] = useState("");
  const [editSearch, setEditSearch] = useState("");
  const dispatch = useDispatch();
  const { categoriesRedu: categories } = useSelector((state) => state.partner);
  const { advancesList: advances, employees } = useSelector(
    (state) => state.advance
  );
  const addEditCurrencyRow = () => {
    setEditForm({
      ...editForm,
      amounts: [
        ...(editForm.amounts || []),
        { currency: "LAK", amount: "", accountId: "" },
      ],
    });
  };

  const removeEditCurrencyRow = (index) => {
    if (editForm.amounts && editForm.amounts.length > 1) {
      const newAmounts = editForm.amounts.filter((_, i) => i !== index);
      setEditForm({ ...editForm, amounts: newAmounts });
    }
  };

  const updateEditCurrencyRow = (index, field, value) => {
    setEditForm((prev) => {
      const newAmounts = prev.amounts.map((row, i) =>
        i === index ? { ...row, [field]: value } : row
      );

      return { ...prev, amounts: newAmounts };
    });
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

  const editSelectedLabel =
    categories.find((c) => c._id === editCategory)?.name || "ເລືອກ";
  const laoType = {
    income: "💰 ລາຍຮັບ",
    asset: "🏦 ຊັບສິນ",
    cogs: "📦 ຕົ້ນທຶນຂາຍ",
    "selling-expense": "🛒 ຄ່າໃຊ້ຈ່າຍຈຳໜ່າຍ",
    "admin-expense": "🏢 ຄ່າໃຊ້ຈ່າຍບໍລິຫານ",
    expense: "📉 ຄ່າໃຊ້ຈ່າຍອື່ນໆ",
  };
  const editFiltered = categories.filter((c) =>
    c.name.toLowerCase().includes(editSearch.toLowerCase())
  );
  const fetchC = useCallback(async () => {
    try {
      await Promise.all([
        dispatch(fetchCategories()).unwrap(),
        dispatch(fetchEmployees()).unwrap(),
      ]);
    } catch (err) {
      console.error(err);
    }
  }, [dispatch]);

  // Update advance
  const updateAdvanceA = async (id, data) => {
    try {
      // 🔹 1) Validate amounts
      const validAmounts = (data.amounts || [])
        .filter((a) => !!a.amount && parseFloat(a.amount) > 0)
        .map((a) => ({
          currency: a.currency,
          amount: parseFloat(a.amount),
          accountId: a.accountId,
        }));

      // 🔹 2) Build payload
      const payload = {
        amounts: validAmounts,
        request_date: data.request_date || null,
        purpose: data.purpose?.trim() || "",
        serial: data.serial?.trim() || "",
        status_payment: data.status_payment || "",
        employee_id: data.employee_id || null,
        paymentMethods: data.paymentMethods || "",
        categoryId: data.categoryId || null,
      };
      console.log("payload", payload);
      // 🔹 3) Dispatch Redux Thunk
      const response = await dispatch(
        updateAdvance({ id, data: payload })
      ).unwrap();

      // 🔹 4) Check success
      if (!response?.success) {
        throw new Error(response?.message || "ບໍ່ສາມາດແກ້ໄຂຂໍ້ມູນໄດ້");
      }

      // 🔹 5) Toast success
      Swal.fire({
        title: "ແກ້ໄຂສໍາເລັດ",
        text: `ແກ້ໄຂ ລາຍການ ເລກທີ່ ${data.serial} ສຳເລັດ`,
        icon: "success",
      });
      // 🔹 6) Close modal + refresh
      await fetchC();
    } catch (err) {
      console.error("Update advance error:", err);
      Swal.fire({
        title: "ແກ້ໄຂບໍ່ສໍາເລັດ",
        text: err.message || "Error",
        icon: "error",
      });
    }
  };
  // Initial data fetch
  useEffect(() => {
    fetchC();
  }, [fetchC]);

  return (
    <VStack spacing={6} align="stretch" fontFamily="Noto Sans Lao, sans-serif">
      {/* ================= HEADER ================= */}
      <Flex justify="space-between" align="center">
        <Button
          fontFamily="Noto Sans Lao, sans-serif"
          variant="ghost"
          onClick={() => navigate(-1)}
        >
          ← ກັບຄືນ
        </Button>

        <Heading fontFamily="Noto Sans Lao, sans-serif" size="lg" fontWeight="600">
          ແກ້ໄຂລາຍການ #{editData.serial || ""}
        </Heading>
      </Flex>

      {/* ================= MULTI CURRENCY ================= */}
      <Box
        bg="white"
        p={6}
        borderRadius="lg"
        border="1px solid"
        borderColor="gray.200"
      >
        <Flex justify="space-between" align="center" mb={4}>
          <Text fontWeight="600">ຈໍານວນເງິນ</Text>
          <Button
            fontFamily="Noto Sans Lao, sans-serif"
            size="sm"
            leftIcon={<Plus size={14} />}
            variant="outline"
            onClick={addEditCurrencyRow}
          >
            ເພີ່ມສະກຸນ
          </Button>
        </Flex>

        <VStack spacing={3}>
          {editForm?.amounts?.map((item, index) => {
            const accountOptions =
              editForm?.paymentMethods === "cash"
                ? cashOptions?.filter((a) => a.currency === item.currency)
                : bankOptions?.filter((a) => a.currency === item.currency);

            return (
              <HStack key={index} w="100%" spacing={3}>
                <Select
                  w="120px"
                  value={item.currency}
                  onChange={(e) =>
                    updateEditCurrencyRow(index, "currency", e.target.value)
                  }
                >
                  {currencies.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>

                <Select
                  w="160px"
                  placeholder="ບັນຊີ"
                  value={item.accountId}
                  onChange={(e) =>
                    updateEditCurrencyRow(index, "accountId", e.target.value)
                  }
                >
                  {accountOptions.map((acc) => (
                    <option key={acc.value} value={acc.value}>
                      {acc.label}
                    </option>
                  ))}
                </Select>

                <Input
                  fontFamily="Noto Sans Lao, sans-serif"
                  type="number"
                  placeholder="0.00"
                  value={item.amount}
                  onChange={(e) =>
                    updateEditCurrencyRow(index, "amount", e.target.value)
                  }
                />

                <IconButton
                  icon={<DeleteIcon />}
                  variant="ghost"
                  colorScheme="red"
                  isDisabled={editForm.amounts?.length === 1}
                  onClick={() => removeEditCurrencyRow(index)}
                />
              </HStack>
            );
          })}
        </VStack>
      </Box>

      {/* ================= BASIC INFO ================= */}
      <Box
        bg="white"
        p={6}
        borderRadius="lg"
        border="1px solid"
        borderColor="gray.200"
      >
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
          <FormControl isRequired>
            <FormLabel fontFamily="Noto Sans Lao, sans-serif">
              ພະນັກງານ
            </FormLabel>
            <Select
              value={editForm.employee_id || ""}
              placeholder="ເລືອກພະນັກງານ"
              onChange={(e) => {
                const id = e.target.value;
                const emp = employees.find((x) => x._id === id);
                setEditForm({ ...editForm, employee_id: id });
                setSelectedEmployee(emp || null);
              }}
            >
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.full_name}
                </option>
              ))}
            </Select>
          </FormControl>

          <FormControl>
            <FormLabel fontFamily="Noto Sans Lao, sans-serif">
              ຜູ້ເບີກ
            </FormLabel>
            <Input
              readOnly
              value={
                selectedEmployee?.full_name ||
                editForm?.employee_id?.full_name ||
                ""
              }
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel fontFamily="Noto Sans Lao, sans-serif">ເລກທີ່</FormLabel>
            <Input
              value={editForm.serial}
              onChange={(e) =>
                setEditForm({ ...editForm, serial: e.target.value })
              }
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel fontFamily="Noto Sans Lao, sans-serif">ວັນທີ່</FormLabel>
            <Input
              type="date"
              value={
                editForm.request_date
                  ? new Date(editForm.request_date).toISOString().slice(0, 10)
                  : ""
              }
              onChange={(e) =>
                setEditForm({ ...editForm, request_date: e.target.value })
              }
            />
          </FormControl>
        </SimpleGrid>
      </Box>

      {/* ================= CATEGORY ================= */}
      <Box
        bg="white"
        p={6}
        borderRadius="lg"
        border="1px solid"
        borderColor="gray.200"
      >
        <FormLabel fontFamily="Noto Sans Lao, sans-serif">ໝວດໝູ່</FormLabel>
        <Menu matchWidth>
          <MenuButton
            fontFamily="Noto Sans Lao, sans-serif"
            as={Button}
            rightIcon={<ChevronDownIcon />}
            w="100%"
          >
            {editSelectedLabel}
          </MenuButton>

          <MenuList>
            <Input
              placeholder="ຄົ້ນຫາ..."
              value={editSearch}
              onChange={(e) => setEditSearch(e.target.value)}
              m={2}
            />
            {editFiltered.map((item) => (
              <MenuItem
                key={item._id}
                onClick={() => {
                  setEditCategory(item._id);
                  setEditForm({ ...editForm, categoryId: item._id });
                  setEditSearch("");
                }}
              >
                {item.name} — {laoType[item.type]}
              </MenuItem>
            ))}
          </MenuList>
        </Menu>
      </Box>

      {/* ================= PAYMENT ================= */}
      <Box
        bg="white"
        p={6}
        borderRadius="lg"
        border="1px solid"
        borderColor="gray.200"
      >
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
          <FormControl>
            <FormLabel fontFamily="Noto Sans Lao, sans-serif">
              ສະຖານະການຊຳລະ
            </FormLabel>
            <Select
              value={editForm.status_payment}
              onChange={(e) =>
                setEditForm({ ...editForm, status_payment: e.target.value })
              }
            >
              <option value="paid">ຊຳລະແລ້ວ</option>
              <option value="unpaid">ຍັງບໍ່ຊຳລະ</option>
            </Select>
          </FormControl>

          <FormControl>
            <FormLabel fontFamily="Noto Sans Lao, sans-serif">
              ວິທີການຊຳລະ
            </FormLabel>
            <Select
              value={editForm.paymentMethods}
              onChange={(e) =>
                setEditForm({ ...editForm, paymentMethods: e.target.value })
              }
            >
              <option value="cash">ເງິນສົດ</option>
              <option value="bank">ເງິນໂອນ</option>
            </Select>
          </FormControl>
        </SimpleGrid>
      </Box>

      {/* ================= DESCRIPTION ================= */}
      <Box
        bg="white"
        p={6}
        borderRadius="lg"
        border="1px solid"
        borderColor="gray.200"
      >
        <FormControl isRequired>
          <FormLabel fontFamily="Noto Sans Lao, sans-serif">ລາຍລະອຽດ</FormLabel>
          <Textarea
            rows={4}
            value={editForm.purpose || ""}
            onChange={(e) =>
              setEditForm({ ...editForm, purpose: e.target.value })
            }
          />
        </FormControl>
      </Box>

      {/* ================= ACTION ================= */}
      <Flex justify="flex-end">
        <Button
          fontFamily="Noto Sans Lao, sans-serif"
          colorScheme="blue"
          leftIcon={<AddIcon />}
          onClick={() => updateAdvanceA(editData._id, editForm)}
        >
          ບັນທຶກການແກ້ໄຂ
        </Button>
      </Flex>
    </VStack>
  );
};

export default EditForm;
