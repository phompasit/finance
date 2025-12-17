import React, { useCallback, useEffect, useState } from "react";
import {
  VStack,
  SimpleGrid,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Heading,
} from "@chakra-ui/react";
import { ChevronDownIcon, DeleteIcon } from "@chakra-ui/icons";
import { Plus } from "lucide-react";
import { fetchCategories } from "../../store/reducer/partner";
import { createAdvanceA, fetchEmployees } from "../../store/reducer/advance";
import { useDispatch, useSelector } from "react-redux";
import { laoType } from "../Income_Expense/constants";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
// Initial form states as constants
const INITIAL_ADD_FORM = {
  type: "employee",
  employee_id: "",
  company: "",
  requester: "",
  account: "",
  description: "",
  amounts: [{ currency: "LAK", amount: "", accountId: "" }],
  date_from: "",
  date_to: "",
  serial: "",
  paymentMethods: "",
  date: new Date().toISOString().split("T")[0],
  note: "",
  status_payment: "",
  status_Ap: "",
};
const RenderFieldPrepaid = () => {
  const { user } = useAuth();
  const [value, setValue] = useState("");
  const navigate = useNavigate();
  const [addCategory, setAddCategory] = useState("");
  const { categoriesRedu: categories } = useSelector((state) => state.partner);
  const [addForm, setAddForm] = useState(INITIAL_ADD_FORM);
  const { employees } = useSelector((state) => state.advance);
  const [addSearch, setAddSearch] = useState("");
  const [currencies, setCurrencies] = useState(["LAK", "THB", "USD", "CNY"]);
  const dispatch = useDispatch();
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
  const addSelectedLabel =
    categories.find((c) => c._id === addCategory)?.name || "ເລືອກ";
  const addFiltered = categories.filter((c) =>
    c.name.toLowerCase().includes(addSearch.toLowerCase())
  );
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
  const addCurrencyRow = () => {
    setAddForm({
      ...addForm,
      amounts: [
        ...addForm.amounts,
        { currency: "LAK", amount: "", accountId: "" },
      ],
    });
  };

  const removeCurrencyRow = (index) => {
    if (addForm.amounts.length > 1) {
      const newAmounts = addForm.amounts.filter((_, i) => i !== index);
      setAddForm({ ...addForm, amounts: newAmounts });
    }
  };

  const updateCurrencyRow = (index, field, value) => {
    const newAmounts = [...addForm.amounts];
    newAmounts[index][field] = value;
    setAddForm({ ...addForm, amounts: newAmounts });
  };
  // Initial data fetch
  useEffect(() => {
    fetchC();
  }, [fetchC]);
  const toastWarn = (title) => {
    Swal.fire({
      title: "ກວດສອບຄືນ",
      text: title,
      icon: "error",
    });
    return false;
    ``;
  };
  const validateAddForm = () => {
    const {
      type,
      employee_id,
      description,
      amounts,
      date_from,
      date_to,
      serial,
      paymentMethods,
      date,
      note,
    } = addForm;

    // 1. description
    if (!description.trim()) {
      return toastWarn("ກະລຸນາກອກລາຍລະອຽດ");
    }

    // 2. amount
    const hasValidAmount = amounts.some(
      (a) => a.amount && parseFloat(a.amount) > 0
    );
    if (!hasValidAmount) {
      return toastWarn("ກະລຸນາກອກຈໍານວນເງິນທີ່ຖືກຕ້ອງ");
    }

    // 3. date
    if (!date) {
      return toastWarn("ກະລຸນາເລືອກວັນທີ່");
    }

    // 4. employee_id
    if (type === "employee" && !employee_id.trim()) {
      return toastWarn("ກະລຸນາເລືອກພະນັກງານ");
    }

    // 8. date_from - date_to
    if (!date_from || !date_to) {
      return toastWarn("ກະລຸນາເລືອກວັນທີ່ (From-To)");
    }

    // ถ้าอยากบังคับว่า date_from <= date_to
    if (new Date(date_from) > new Date(date_to)) {
      return toastWarn("ວັນທີ່ From ຕ້ອງນ້ອຍກວ່າ To");
    }

    // 9. serial
    if (!serial.trim()) {
      return toastWarn("ກະລຸນາກອກ Serial");
    }

    // 10. payment method
    if (!paymentMethods.trim()) {
      return toastWarn("ກະລຸນາເລືອກວິທີການຈ່າຍ");
    }

    return true;
  };
  // Toast helper
  const createAdvance = async () => {
    try {
      if (!validateAddForm()) return;

      const validAmounts = addForm.amounts
        .filter(({ amount }) => parseFloat(amount) > 0)
        .map(({ currency, amount, accountId }) => ({
          currency,
          amount: parseFloat(amount),
          accountId,
        }));

      const payload = {
        type: addForm.type,
        employee_id: addForm.employee_id || null,
        purpose: addForm.description?.trim(),
        amounts: validAmounts,
        request_date: addForm.date,
        serial: addForm.serial?.trim(),
        status_payment: addForm.status_payment,
        paymentMethods: addForm.paymentMethods,
        categoryId: value || null,
        meta: {
          company: addForm.company || "",
          account: addForm.account || "",
          date_from: addForm.date_from,
          date_to: addForm.date_to,
          requester: addForm.requester,
          note: addForm.note,
        },
      };
      // 👇 ส่งให้ Redux แทน fetch()
      const resultAction = await dispatch(createAdvanceA(payload));
      if (resultAction?.payload?.success === true) {
        Swal.fire({
          title: "ບັນທຶກສໍາເລັດ",
          icon: "success",
        });
        setAddForm(INITIAL_ADD_FORM);
      }
      if (resultAction?.payload?.success === false) {
        Swal.fire({
          title: "ບັນທຶກສໍາເລັດ",
          text: resultAction?.payload?.message || "Error",
          icon: "error",
        });
      }

      await fetchC(); // โหลดใหม่
    } catch (error) {
      // ถ้ามีอะไรผิดพลาด มันจะกระโดดมาที่นี่โดยอัตโนมัติ
      Swal.fire({
        title: "ມີບາງຢ່າງຜິດພາດ",
        text: error?.message || "Error",
        icon: "error",
      });
    }
  };
  return (
    <VStack spacing={6} align="stretch" fontFamily="Noto Sans Lao, sans-serif">
      {/* ================= BASIC INFO CARD ================= */}
      <Box
        bg="white"
        rounded="2xl"
        p={6}
        boxShadow="sm"
        border="1px solid"
        borderColor="gray.100"
      >
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
            ເພີ່ມລາຍການ
          </Heading>
        </HStack>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
          <FormControl isRequired>
            <FormLabel
              fontFamily="Noto Sans Lao, sans-serif"
              fontSize="sm"
              color="gray.600"
            >
              ເລກທີ່
            </FormLabel>
            <Input
              variant="filled"
              rounded="xl"
              bg="gray.50"
              _focus={{ bg: "white", borderColor: "blue.400" }}
              value={addForm.serial}
              onChange={(e) =>
                setAddForm({ ...addForm, serial: e.target.value })
              }
            />
          </FormControl>

          <FormControl>
            <FormLabel
              fontFamily="Noto Sans Lao, sans-serif"
              fontSize="sm"
              color="gray.600"
            >
              ພະນັກງານ
            </FormLabel>
            <Select
              variant="filled"
              rounded="xl"
              bg="gray.50"
              placeholder="ເລືອກພະນັກງານ"
              value={addForm.employee_id}
              onChange={(e) =>
                setAddForm({ ...addForm, employee_id: e.target.value })
              }
            >
              {employees?.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.full_name}
                </option>
              ))}
            </Select>
          </FormControl>

          {/* CATEGORY */}
          <FormControl>
            <FormLabel
              fontFamily="Noto Sans Lao, sans-serif"
              fontSize="sm"
              color="gray.600"
            >
              ໝວດໝູ່
            </FormLabel>
            <Menu matchWidth>
              <MenuButton
                as={Button}
                variant="outline"
                fontFamily="Noto Sans Lao, sans-serif"
                rounded="xl"
                rightIcon={<ChevronDownIcon />}
                w="100%"
                justifyContent="space-between"
              >
                {addSelectedLabel}
              </MenuButton>

              <MenuList rounded="xl" p={3}>
                <Input
                  placeholder="ຄົ້ນຫາ..."
                  variant="filled"
                  rounded="lg"
                  mb={2}
                  value={addSearch}
                  onChange={(e) => setAddSearch(e.target.value)}
                />
                <Box maxH="200px" overflowY="auto">
                  {addFiltered.map((item) => (
                    <MenuItem
                      key={item._id}
                      rounded="md"
                      onClick={() => {
                        setValue(item._id);
                        setAddCategory(item._id);
                        setAddForm({ ...addForm, categoryId: item._id });
                        setAddSearch("");
                      }}
                    >
                      {item.name} — {laoType[item.type]}
                    </MenuItem>
                  ))}
                </Box>
              </MenuList>
            </Menu>
          </FormControl>

          <FormControl>
            <FormLabel
              fontFamily="Noto Sans Lao, sans-serif"
              fontSize="sm"
              color="gray.600"
            >
              ວິທີການຊຳລະ
            </FormLabel>
            <Select
              variant="filled"
              rounded="xl"
              bg="gray.50"
              placeholder="ເລືອກວິທີການຊຳລະເງິນ"
              value={addForm.paymentMethods}
              onChange={(e) =>
                setAddForm({ ...addForm, paymentMethods: e.target.value })
              }
            >
              <option value="cash">ເງິນສົດ</option>
              <option value="bank">ເງິນໂອນ</option>
            </Select>
          </FormControl>
        </SimpleGrid>
      </Box>

      {/* ================= DATE SECTION ================= */}
      <Box bg="white" rounded="2xl" p={6} boxShadow="sm">
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={5}>
          {[
            { label: "ວັນທີ່ເບີກ", key: "date" },
            { label: "ຕັ້ງແຕ່ວັນທີ່", key: "date_from" },
            { label: "ເຖິງວັນທີ່", key: "date_to" },
          ].map((item) => (
            <FormControl key={item.key}>
              <FormLabel
                fontFamily="Noto Sans Lao, sans-serif"
                fontSize="sm"
                color="gray.600"
              >
                {item.label}
              </FormLabel>
              <Input
                type="date"
                variant="filled"
                rounded="xl"
                bg="gray.50"
                value={addForm[item.key]}
                onChange={(e) =>
                  setAddForm({ ...addForm, [item.key]: e.target.value })
                }
              />
            </FormControl>
          ))}
        </SimpleGrid>
      </Box>

      {/* ================= MULTI CURRENCY ================= */}
      <Box bg="white" rounded="2xl" p={6} boxShadow="sm">
        <Flex justify="space-between" align="center" mb={4}>
          <FormLabel
            fontFamily="Noto Sans Lao, sans-serif"
            mb={0}
            fontWeight="600"
          >
            ຈໍານວນເງິນ
          </FormLabel>
          <Button
            size="sm"
            leftIcon={<Plus size={14} />}
            rounded="full"
            variant="ghost"
            colorScheme="blue"
            onClick={addCurrencyRow}
            fontFamily="Noto Sans Lao, sans-serif"
          >
            ເພີ່ມສະກຸນ
          </Button>
        </Flex>

        <VStack spacing={3}>
          {addForm.amounts.map((item, index) => {
            const accountOptions =
              addForm?.paymentMethods === "cash"
                ? cashOptions?.filter((a) => a.currency === item.currency)
                : bankOptions?.filter((a) => a.currency === item.currency);
            return (
              <HStack key={index} w="100%" bg="gray.50" p={3} rounded="xl">
                <Select
                  w="110px"
                  rounded="lg"
                  value={item.currency}
                  onChange={(e) =>
                    updateCurrencyRow(index, "currency", e.target.value)
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
                    updateCurrencyRow(index, "accountId", e.target.value)
                  }
                >
                  {accountOptions.map((acc) => (
                    <option key={acc.value} value={acc.value}>
                      {acc.label}
                    </option>
                  ))}
                </Select>

                <Input
                  type="number"
                  rounded="lg"
                  placeholder="0.00"
                  value={item.amount}
                  onChange={(e) =>
                    updateCurrencyRow(index, "amount", e.target.value)
                  }
                />

                <IconButton
                  icon={<DeleteIcon />}
                  variant="ghost"
                  colorScheme="red"
                  rounded="full"
                  onClick={() => removeCurrencyRow(index)}
                  isDisabled={addForm.amounts.length === 1}
                />
              </HStack>
            );
          })}
        </VStack>
      </Box>

      {/* ================= DESCRIPTION ================= */}
      <Box bg="white" rounded="2xl" p={6} boxShadow="sm">
        <FormControl isRequired mb={4}>
          <FormLabel
            fontFamily="Noto Sans Lao, sans-serif"
            fontSize="sm"
            color="gray.600"
          >
            ລາຍລະອຽດ
          </FormLabel>
          <Textarea
            rows={3}
            variant="filled"
            rounded="xl"
            bg="gray.50"
            value={addForm.description}
            onChange={(e) =>
              setAddForm({ ...addForm, description: e.target.value })
            }
          />
        </FormControl>

        <FormControl>
          <FormLabel
            fontFamily="Noto Sans Lao, sans-serif"
            fontSize="sm"
            color="gray.600"
          >
            ໝາຍເຫດ
          </FormLabel>
          <Textarea
            rows={2}
            variant="filled"
            rounded="xl"
            bg="gray.50"
            value={addForm.note}
            onChange={(e) => setAddForm({ ...addForm, note: e.target.value })}
          />
        </FormControl>
      </Box>

      {/* ================= ACTION ================= */}
      <Button
        size="lg"
        rounded="2xl"
        bgGradient="linear(to-r, blue.400, cyan.400)"
        color="white"
        _hover={{ opacity: 0.9 }}
        onClick={createAdvance}
      >
        ບັນທຶກ
      </Button>
    </VStack>
  );
};

export default RenderFieldPrepaid;
