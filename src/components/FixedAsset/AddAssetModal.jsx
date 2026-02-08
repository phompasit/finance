import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Input,
  HStack,
  VStack,
  FormControl,
  FormLabel,
  Alert,
  AlertIcon,
  AlertDescription,
  Flex,
  Badge,
  Card,
  CardBody,
  Icon,
  useColorModeValue,
  FormErrorMessage,
  Spinner,
  Center,
  Tooltip,
  FormHelperText,
} from "@chakra-ui/react";
import {
  Edit,
  DollarSign,
  Package,
  Calendar,
  TrendingUp,
  Settings,
  Save,
  AlertCircle,
  Lock,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import Swal from "sweetalert2";

import { getAccounts } from "../../store/accountingReducer/chartAccounting";
import {
  createAsset,
  getAssetById,
  updateAsset,
} from "../../store/assetService/assetThunk";
import { useNavigate, useParams } from "react-router-dom";

// Constants
const INITIAL_FORM_STATE = {
  assetCode: "",
  name: "",
  category: "",
  purchaseDate: "",
  startUseDate: "",
  original: 0,
  exchangeRate: 1,
  currency: "LAK",
  cost: 0,
  salvageValue: 0,
  usefulLife: "",
  assetAccountId: "",
  depreciationExpenseAccountId: "",
  accumulatedDepreciationAccountId: "",
  paidAccountId: "",
  getMoneyId: "",
  incomeAssetId: "",
  expenseId: "",
};

const CURRENCY_OPTIONS = [
  { value: "LAK", label: "LAK - Lao Kip" },
  { value: "THB", label: "THB - Thai Baht" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "CNY", label: "CNY - Chinese Yuan" },
];

// Custom Hooks
const useAssetForm = (id, isNew) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [isEditMode, setIsEditMode] = useState(isNew);
  const [errors, setErrors] = useState({});
  const [isInitialLoading, setIsInitialLoading] = useState(!isNew);

  const { accounts } = useSelector((s) => s.chartAccount || {});
  const { current, loading, success, error } = useSelector(
    (s) => s.fixedAsset || {}
  );

  // Load accounts on mount
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        await dispatch(getAccounts());
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Failed to load accounts",
          text: "Please refresh the page and try again",
          confirmButtonColor: "#d33",
        });
      }
    };
    loadAccounts();
  }, [dispatch]);

  // Load asset data if editing
  useEffect(() => {
    const loadAsset = async () => {
      if (!isNew) {
        setIsInitialLoading(true);
        try {
          await dispatch(getAssetById(id));
        } catch (err) {
          await Swal.fire({
            icon: "error",
            title: "Failed to load asset",
            text: "The asset could not be loaded. Please try again.",
            confirmButtonColor: "#d33",
          });
          navigate("/assets");
        } finally {
          setIsInitialLoading(false);
        }
      }
    };
    loadAsset();
  }, [id, isNew, dispatch, navigate]);

  // Populate form with current asset data
  useEffect(() => {
    if (current && !isNew) {
      setForm({
        assetCode: current.assetCode || "",
        name: current.name || "",
        category: current.category || "",
        purchaseDate: current.purchaseDate || "",
        startUseDate: current.startUseDate || "",
        original: Number(current.original) || 0,
        exchangeRate: current.exchangeRate || 1,
        currency: current.currency || "LAK",
        cost: Number(current.cost) || 0,
        salvageValue: Number(current.salvageValue) || 0,
        usefulLife: current.usefulLife || "",
        assetAccountId: current.assetAccountId || "",
        depreciationExpenseAccountId:
          current.depreciationExpenseAccountId || "",
        accumulatedDepreciationAccountId:
          current.accumulatedDepreciationAccountId || "",
        paidAccountId: current.paidAccountId || "",
        getMoneyId: current.getMoneyId,
        incomeAssetId: current.incomeAssetId,
        expenseId: current.expenseId,
      });
      setIsEditMode(false);
    }
  }, [current, isNew]);

  // Auto-calculate cost when original amount or exchange rate changes
  useEffect(() => {
    const original = Number(form.original || 0);
    const rate = Number(form.exchangeRate || 1);
    const calculatedCost = original * rate;

    setForm((prev) => ({
      ...prev,
      cost: calculatedCost > 0 ? calculatedCost : "",
    }));
  }, [form.original, form.exchangeRate]);

  return {
    form,
    setForm,
    isEditMode,
    setIsEditMode,
    errors,
    setErrors,
    isInitialLoading,
    accounts,
    current,
    loading,
  };
};

const useFormValidation = (form) => {
  const validateForm = useCallback(() => {
    const newErrors = {};

    // Required field validations
    const requiredFields = [
      { field: "assetCode", message: "Asset code is required" },
      { field: "name", message: "Asset name is required" },
      { field: "category", message: "Category is required" },
      { field: "purchaseDate", message: "Purchase date is required" },
      { field: "startUseDate", message: "Start use date is required" },
      { field: "assetAccountId", message: "Asset account is required" },
      { field: "paidAccountId", message: "Paid account is required" },
      {
        field: "depreciationExpenseAccountId",
        message: "Depreciation expense account is required",
      },
      {
        field: "accumulatedDepreciationAccountId",
        message: "Accumulated depreciation account is required",
      },
    ];

    requiredFields.forEach(({ field, message }) => {
      if (
        !form[field] ||
        (typeof form[field] === "string" && !form[field].trim())
      ) {
        newErrors[field] = message;
      }
    });
    // Date validation
    if (form.startUseDate && form.purchaseDate) {
      if (new Date(form.startUseDate) < new Date(form.purchaseDate)) {
        newErrors.startUseDate =
          "Start use date cannot be before purchase date";
      }
    }

    // Numeric validations
    if (!form.original || Number(form.original) <= 0) {
      newErrors.original = "Original amount must be greater than 0";
    }

    if (!form.cost || Number(form.cost) <= 0) {
      newErrors.cost = "Cost must be greater than 0";
    }

    if (!form.usefulLife || Number(form.usefulLife) <= 0) {
      newErrors.usefulLife = "Useful life must be greater than 0";
    }

    if (
      Number(form.salvageValue) &&
      Number(form.salvageValue) >= Number(form.cost)
    ) {
      newErrors.salvageValue = "Salvage value must be less than cost";
    }

    return { isValid: Object.keys(newErrors).length === 0, errors: newErrors };
  }, [form]);

  return validateForm;
};

// Components
const SectionHeader = ({ icon, title, subtitle }) => {
  const iconColor = useColorModeValue("blue.500", "blue.300");
  const mutedColor = useColorModeValue("gray.600", "gray.400");

  return (
    <VStack align="start" spacing={1} mb={5}>
      <HStack spacing={3}>
        <Icon as={icon} boxSize={5} color={iconColor} />
        <Heading
          fontFamily="Noto Sans Lao, sans-serif"
          size="md"
          fontWeight="600"
        >
          {title}
        </Heading>
      </HStack>
      {subtitle && (
        <Text
          fontFamily="Noto Sans Lao, sans-serif"
          fontSize="sm"
          color={mutedColor}
          ml={8}
        >
          {subtitle}
        </Text>
      )}
    </VStack>
  );
};

const CurrencyInput = ({ form, setForm, errors, isEditMode }) => {
  const mutedColor = useColorModeValue("gray.600", "gray.400");

  const customSelectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: "48px",
      borderColor: state.isFocused ? "#3182ce" : "#E2E8F0",
      boxShadow: state.isFocused ? "0 0 0 1px #3182ce" : "none",
      "&:hover": { borderColor: "#3182ce" },
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? "#3182ce"
        : state.isFocused
        ? "#EBF8FF"
        : "white",
      color: state.isSelected ? "white" : "#2D3748",
    }),
  };

  return (
    <HStack spacing={4} w="full" align="start">
      <FormControl isRequired flex={1} isInvalid={!!errors.currency}>
        <FormLabel
          fontFamily="Noto Sans Lao, sans-serif"
          fontSize="sm"
          fontWeight="600"
          color={mutedColor}
        >
          ສະກຸນເງິນ
        </FormLabel>
        <Select
          isDisabled={!isEditMode}
          options={CURRENCY_OPTIONS}
          value={CURRENCY_OPTIONS.find((o) => o.value === form.currency)}
          onChange={(opt) => setForm({ ...form, currency: opt.value })}
          styles={customSelectStyles}
        />
      </FormControl>

      <FormControl isRequired flex={2} isInvalid={!!errors.original}>
        <FormLabel
          fontFamily="Noto Sans Lao, sans-serif"
          fontSize="sm"
          fontWeight="600"
          color={mutedColor}
        >
          ມູນຄ່າເດິມ
        </FormLabel>
        <Input
          type="number"
          step="0.00"
          isDisabled={!isEditMode}
          value={form.original}
          onChange={(e) => setForm({ ...form, original: e.target.value })}
          size="lg"
          placeholder="0.00"
        />
        <FormErrorMessage>{errors.original}</FormErrorMessage>
      </FormControl>

      {form.currency !== "LAK" && (
        <FormControl flex={1}>
          <FormLabel
            fontFamily="Noto Sans Lao, sans-serif"
            fontSize="sm"
            fontWeight="600"
            color={mutedColor}
          >
            ອັດຕາແລກປ່ຽນ
          </FormLabel>
          <Input
            type="number"
            step="0.01"
            value={form.exchangeRate}
            onChange={(e) => setForm({ ...form, exchangeRate: e.target.value })}
            isDisabled={!isEditMode}
            size="lg"
            placeholder="1.00"
          />
          <FormHelperText fontSize="xs">
            Rate to LAK (1 {form.currency} = X LAK)
          </FormHelperText>
        </FormControl>
      )}
    </HStack>
  );
};

const AccountSelector = ({
  label,
  field,
  form,
  setForm,
  errors,
  setErrors,
  options,
  isEditMode,
  isRequired = true,
  isLocked = false,
}) => {
  const mutedColor = useColorModeValue("gray.600", "gray.400");

  const customSelectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: "48px",
      borderColor: state.isFocused ? "#3182ce" : "#E2E8F0",
      boxShadow: state.isFocused ? "0 0 0 1px #3182ce" : "none",
      "&:hover": { borderColor: "#3182ce" },
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? "#3182ce"
        : state.isFocused
        ? "#EBF8FF"
        : "white",
      color: state.isSelected ? "white" : "#2D3748",
    }),
  };

  return (
    <FormControl isRequired={isRequired} isInvalid={!!errors[field]}>
      <FormLabel fontSize="sm" fontWeight="600" color={mutedColor}>
        <HStack spacing={2}>
          <Text fontFamily="Noto Sans Lao, sans-serif">{label}</Text>
          {isLocked && (
            <Tooltip label="Locked after depreciation posting">
              <span>
                <Icon as={Lock} boxSize={3} color="orange.500" />
              </span>
            </Tooltip>
          )}
        </HStack>
      </FormLabel>
      <Select
        isDisabled={!isEditMode || isLocked}
        options={options}
        value={options.find((o) => o.value === form[field])}
        onChange={(opt) => {
          setForm({ ...form, [field]: opt.value });
          setErrors((prev) => ({ ...prev, [field]: undefined }));
        }}
        styles={customSelectStyles}
        placeholder={`Select ${label.toLowerCase()}...`}
      />
      <FormErrorMessage>{errors[field]}</FormErrorMessage>
    </FormControl>
  );
};

// Main Component
const AddAssetModal = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = id === "new";

  const {
    form,
    setForm,
    isEditMode,
    setIsEditMode,
    errors,
    setErrors,
    isInitialLoading,
    accounts,
    current,
    loading,
  } = useAssetForm(id, isNew);

  const validateForm = useFormValidation(form);
  const dispatch = useDispatch();

  // Color mode values
  const bgColor = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const headerBg = useColorModeValue("white", "gray.800");
  const iconColor = useColorModeValue("blue.500", "blue.300");
  const mutedColor = useColorModeValue("gray.600", "gray.400");
  const readOnlyBg = useColorModeValue("gray.100", "gray.700");

  // Computed values
  // ===== PATCH: correct depreciation lock logic =====
  const isLockedAfterDepreciation = useMemo(() => {
    if (!current) return false;

    const accumulated = Number(current.accumulatedDepreciation || 0);

    return (
      accumulated > 0 ||
      current.status === "sold" ||
      current.status === "disposal"
    );
  }, [current]);

  // override usage logic (ไม่ลบของเดิม)
  const canEditGeneralFixed = !isLockedAfterDepreciation;
  const canEditGeneral = canEditGeneralFixed;
  const accountOptions = useMemo(
    () =>
      accounts
        ?.filter((a) => a.parentCode)
        .map((a) => ({
          value: a._id,
          label: `${a.code} - ${a.name}`,
        })) || [],
    [accounts]
  );

  // Handlers
  const onChange = useCallback(
    (field) => (e) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors, setForm, setErrors]
  );

  const handleSave = async () => {
    const validation = validateForm();

    if (!validation.isValid) {
      setErrors(validation.errors);
      Swal.fire({
        icon: "warning",
        title: "Validation Error",
        text: "Please fill in all required fields correctly",
        confirmButtonColor: "#3182ce",
      });
      return;
    }

    try {
      const result = await Swal.fire({
        title: isNew ? "Create Asset?" : "Save Changes?",
        text: isNew
          ? "Do you want to create this asset?"
          : "Do you want to save the changes to this asset?",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#3182ce",
        cancelButtonColor: "#718096",
        confirmButtonText: isNew ? "Create" : "Save",
        cancelButtonText: "Cancel",
      });

      if (!result.isConfirmed) return;

      Swal.fire({
        title: "Processing...",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading(),
      });

      const action = isNew
        ? await dispatch(createAsset(form))
        : await dispatch(updateAsset({ id, payload: form }));

      if (action.payload?.success) {
        await Swal.fire({
          icon: "success",
          title: "Success!",
          text: isNew
            ? "Asset created successfully"
            : "Asset updated successfully",
          confirmButtonColor: "#3182ce",
          timer: 2000,
        });

        if (isNew) {
          navigate("/fixed-assets");
        } else {
          navigate("/fixed-assets");
          setIsEditMode(false);
        }
      } else {
        throw new Error(action.payload?.message || "Operation failed");
      }
    } catch (err) {
      console.error("Save asset error:", err);
      Swal.fire({
        icon: "error",
        title: "Operation Failed",
        text: err.message || "An error occurred. Please try again.",
        confirmButtonColor: "#d33",
      });
    }
  };

  const handleCancel = useCallback(() => {
    if (isNew) {
      navigate("/assets");
    } else {
      setForm({
        assetCode: current?.assetCode || "",
        name: current?.name || "",
        category: current?.category || "",
        purchaseDate: current?.purchaseDate || "",
        startUseDate: current?.startUseDate || "",
        original: current?.original || "",
        exchangeRate: current?.exchangeRate || 1,
        currency: current?.currency || "LAK",
        cost: current?.cost || "",
        salvageValue: current?.salvageValue || "",
        usefulLife: current?.usefulLife || "",
        assetAccountId: current?.assetAccountId || "",
        depreciationExpenseAccountId:
          current?.depreciationExpenseAccountId || "",
        accumulatedDepreciationAccountId:
          current?.accumulatedDepreciationAccountId || "",
        paidAccountId: current?.paidAccountId || "",
      });
      setIsEditMode(false);
      setErrors({});
    }
  }, [isNew, current, navigate, setForm, setIsEditMode, setErrors]);

  // Loading state
  if (isInitialLoading) {
    return (
      <Center h="100vh" bg={bgColor}>
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Text color={mutedColor}>Loading asset...</Text>
        </VStack>
      </Center>
    );
  }
  function formatDateForInput(dateString) {
    if (!dateString) return "";
    return new Date(dateString).toISOString().split("T")[0];
  }
  return (
    <Box bg={bgColor} minH="100vh" py={8}>
      <Container maxW="container.xl">
        <Button
          variant="ghost"
          size="sm"
          mb={4}
          onClick={() => navigate("/assets")}
        >
          ← Back to Assets
        </Button>

        {/* Header Card */}
        <Card
          bg={headerBg}
          shadow="sm"
          mb={6}
          borderWidth="1px"
          borderColor={borderColor}
        >
          <CardBody>
            <Flex justify="space-between" align="center">
              <HStack spacing={3}>
                <Icon as={Package} boxSize={6} color={iconColor} />
                <Box>
                  <Heading
                    fontFamily="Noto Sans Lao, sans-serif"
                    size="lg"
                    fontWeight="700"
                  >
                    {isNew ? "ເພີ່ມຊັບສິນ" : "ລາຍລະອຽດຊັບສິນ"}
                  </Heading>
                  <Text fontSize="sm" color={mutedColor} mt={1}>
                    {isNew
                      ? "Add a new asset to your inventory and configure depreciation"
                      : `Viewing and managing asset information`}
                  </Text>
                </Box>
              </HStack>

              <Badge
                colorScheme={isEditMode ? "orange" : "green"}
                fontSize="sm"
                px={3}
                py={1.5}
                borderRadius="full"
                fontWeight="600"
              >
                {isEditMode ? "Edit Mode" : "View Only"}
              </Badge>
            </Flex>
          </CardBody>
        </Card>

        {/* Locked Warning */}
        {!canEditGeneral && (
          <Alert
            status="warning"
            borderRadius="lg"
            mb={6}
            bg={useColorModeValue("orange.50", "orange.900")}
            borderWidth="1px"
            borderColor={useColorModeValue("orange.200", "orange.700")}
          >
            <AlertIcon />
            <AlertDescription
              fontFamily="Noto Sans Lao, sans-serif"
              fontSize="sm"
            >
              ຊັບສິນນີ້ຖືກລັອກເນື່ອງຈາກໄດ້ບັນທຶກຄ່າເສື່ອມລາຄາແລ້ວ
              ສາມາດແກ້ໄຂໄດ້ສະເພາະການຕັ້ງຄ່າທາງບັນຊີເທົ່ານັ້ນ
            </AlertDescription>
          </Alert>
        )}

        {/* Main Form */}
        <VStack spacing={6} align="stretch">
          {/* Asset Information */}
          <Card
            bg={cardBg}
            shadow="sm"
            borderWidth="1px"
            borderColor={borderColor}
          >
            <CardBody>
              <SectionHeader
                icon={Package}
                title="ຂໍ້ມູນຊັບສິນ"
                subtitle="Basic details about the asset"
              />

              <VStack spacing={5}>
                <CurrencyInput
                  form={form}
                  setForm={setForm}
                  errors={errors}
                  isEditMode={isEditMode} // ❗ คงไว้
                  isDisabled={!isEditMode || !canEditGeneral}
                />

                <FormControl isRequired isInvalid={!!errors.assetCode}>
                  <FormLabel
                    fontFamily="Noto Sans Lao, sans-serif"
                    fontSize="sm"
                    fontWeight="600"
                    color={mutedColor}
                  >
                    ລະຫັດຊັບສິນ
                  </FormLabel>
                  <Input
                    value={form.assetCode}
                    onChange={onChange("assetCode")}
                    size="lg"
                    placeholder="e.g., AST-2024-001"
                    isEditMode={isEditMode}
                  />
                  <FormErrorMessage>{errors.assetCode}</FormErrorMessage>
                </FormControl>

                <FormControl isRequired isInvalid={!!errors.name}>
                  <FormLabel
                    fontFamily="Noto Sans Lao, sans-serif"
                    fontSize="sm"
                    fontWeight="600"
                    color={mutedColor}
                  >
                    ຊື່ຊັບສິນ
                  </FormLabel>
                  <Input
                    value={form.name}
                    onChange={onChange("name")}
                    isEditMode={isEditMode}
                    size="lg"
                    placeholder="e.g., MacBook Pro 16-inch"
                  />
                  <FormErrorMessage>{errors.name}</FormErrorMessage>
                </FormControl>

                <FormControl isRequired isInvalid={!!errors.category}>
                  <FormLabel
                    fontFamily="Noto Sans Lao, sans-serif"
                    fontSize="sm"
                    fontWeight="600"
                    color={mutedColor}
                  >
                    ໝວດໝູ່
                  </FormLabel>
                  <Input
                    value={form.category}
                    onChange={onChange("category")}
                    size="lg"
                    placeholder="e.g., Computer Equipment"
                    isEditMode={isEditMode}
                  />
                  <FormErrorMessage>{errors.category}</FormErrorMessage>
                </FormControl>

                <HStack spacing={4} w="full" align="start">
                  <FormControl
                    isRequired
                    flex={1}
                    isInvalid={!!errors.purchaseDate}
                  >
                    <FormLabel
                      fontSize="sm"
                      fontWeight="600"
                      color={mutedColor}
                    >
                      <HStack spacing={2}>
                        <Icon as={Calendar} boxSize={4} />
                        <Text fontFamily="Noto Sans Lao, sans-serif">
                          ວັນທີ່ຊື້
                        </Text>
                      </HStack>
                    </FormLabel>
                    <Input
                      type="date"
                      isEditMode={isEditMode}
                      value={formatDateForInput(form.purchaseDate)}
                      onChange={onChange("purchaseDate")}
                      size="lg"
                    />
                    <FormErrorMessage>{errors.purchaseDate}</FormErrorMessage>
                  </FormControl>

                  <FormControl
                    isRequired
                    flex={1}
                    isInvalid={!!errors.startUseDate}
                  >
                    <FormLabel
                      fontSize="sm"
                      fontWeight="600"
                      color={mutedColor}
                    >
                      <HStack spacing={2}>
                        <Icon as={Calendar} boxSize={4} />
                        <Text fontFamily="Noto Sans Lao, sans-serif">
                          ວັນທີ່ເລີ່ມໃຊ້ງານຊັບສິນ
                        </Text>
                      </HStack>
                    </FormLabel>
                    <Input
                      type="date"
                      value={formatDateForInput(form.startUseDate)}
                      onChange={onChange("startUseDate")}
                      isEditMode={isEditMode} // ❗ คงไว้
                      isDisabled={!isEditMode || !canEditGeneral}
                      size="lg"
                    />
                    <FormErrorMessage>{errors.startUseDate}</FormErrorMessage>
                  </FormControl>
                </HStack>
              </VStack>
            </CardBody>
          </Card>

          {/* Financial Information */}
          <Card
            bg={cardBg}
            shadow="sm"
            borderWidth="1px"
            borderColor={borderColor}
          >
            <CardBody>
              <SectionHeader
                icon={DollarSign}
                title="ຂໍ້ມູນທາງບັນຊີ"
                subtitle="Cost and depreciation settings"
              />

              <VStack spacing={5}>
                <FormControl isRequired isInvalid={!!errors.cost}>
                  <FormLabel
                    fontFamily="Noto Sans Lao, sans-serif"
                    fontSize="sm"
                    fontWeight="600"
                    color={mutedColor}
                  >
                    ຕົ້ນທຶນຊື້ (LAK)
                  </FormLabel>
                  <Input
                    type="number"
                    value={form.cost}
                    isReadOnly
                    size="lg"
                    placeholder="Auto-calculated"
                    bg={readOnlyBg}
                  />
                  <FormHelperText fontSize="xs">
                    Automatically calculated from original amount × exchange
                    rate
                  </FormHelperText>
                  <FormErrorMessage>{errors.cost}</FormErrorMessage>
                </FormControl>

                <HStack spacing={4} w="full" align="start">
                  <FormControl flex={1} isInvalid={!!errors.salvageValue}>
                    <FormLabel
                      fontFamily="Noto Sans Lao, sans-serif"
                      fontSize="sm"
                      fontWeight="600"
                      color={mutedColor}
                    >
                      ລາຄາຄາດຄະເນຂາຍ
                    </FormLabel>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.salvageValue}
                      onChange={onChange("salvageValue")}
                      isEditMode={isEditMode} // ❗ คงไว้
                      isDisabled={!isEditMode || !canEditGeneral}
                      size="lg"
                      placeholder="0.00"
                    />
                    <FormHelperText fontSize="xs">
                      Expected value at end of useful life
                    </FormHelperText>
                    <FormErrorMessage>{errors.salvageValue}</FormErrorMessage>
                  </FormControl>

                  <FormControl
                    isRequired
                    flex={1}
                    isInvalid={!!errors.usefulLife}
                  >
                    <FormLabel
                      fontSize="sm"
                      fontWeight="600"
                      color={mutedColor}
                    >
                      <HStack spacing={2}>
                        <Icon as={TrendingUp} boxSize={4} />
                        <Text fontFamily="Noto Sans Lao, sans-serif">
                          ອາຍຸຂອງການໃຊ້ງານ (Years)
                        </Text>
                      </HStack>
                    </FormLabel>
                    <Input
                      type="number"
                      value={form.usefulLife}
                      onChange={onChange("usefulLife")}
                      isEditMode={isEditMode} // ❗ คงไว้
                      isDisabled={!isEditMode || !canEditGeneral}
                      size="lg"
                      placeholder="5"
                    />
                    <FormHelperText fontSize="xs">
                      Expected years of use
                    </FormHelperText>
                    <FormErrorMessage>{errors.usefulLife}</FormErrorMessage>
                  </FormControl>
                </HStack>
              </VStack>
            </CardBody>
          </Card>

          {/* Accounting Configuration */}
          <Card
            bg={cardBg}
            shadow="sm"
            borderWidth="1px"
            borderColor={borderColor}
          >
            <CardBody>
              <SectionHeader
                icon={Settings}
                title="ຕັ້ງຄ່າບັນຊີ"
                subtitle="Map asset to chart of accounts"
              />

              <VStack spacing={5}>
                <AccountSelector
                  label="ບັນຊິຮັບຊັບສິນ"
                  field="assetAccountId"
                  form={form}
                  setForm={setForm}
                  errors={errors}
                  setErrors={setErrors}
                  options={accountOptions}
                  isEditMode={isEditMode} // ❗ คงไว้
                  isDisabled={!isEditMode || !canEditGeneral}
                />

                <AccountSelector
                  label="ບັນຊີຈ່າຍຊື້ຊັບສິນ"
                  field="paidAccountId"
                  form={form}
                  setForm={setForm}
                  errors={errors}
                  setErrors={setErrors}
                  options={accountOptions}
                  isEditMode={isEditMode} // ❗ คงไว้
                  isDisabled={!isEditMode || !canEditGeneral}
                />

                <AccountSelector
                  label="ບັນຊີລາຍຈ່າຍຫັກຄ່າຫຼຸ້ຍຫ້ຽນ"
                  field="depreciationExpenseAccountId"
                  form={form}
                  setForm={setForm}
                  errors={errors}
                  setErrors={setErrors}
                  options={accountOptions}
                  isEditMode={isEditMode} // ❗ คงไว้
                  isDisabled={!isEditMode || !canEditGeneral}
                />

                <AccountSelector
                  label="ບັນຊີຫັກຄ່າຫຼຸ້ຍຫ້ຽນ"
                  field="accumulatedDepreciationAccountId"
                  form={form}
                  setForm={setForm}
                  errors={errors}
                  setErrors={setErrors}
                  options={accountOptions}
                  isEditMode={isEditMode} // ❗ คงไว้
                  isDisabled={!isEditMode || !canEditGeneral}
                />

                <AccountSelector
                  label="ບັນຊີຮັບເງິນ"
                  field="getMoneyId"
                  form={form}
                  setForm={setForm}
                  errors={errors}
                  setErrors={setErrors}
                  options={accountOptions}
                  isEditMode={isEditMode}
                />
                <AccountSelector
                  label="ບັນຊີລາຍຮັບ"
                  field="incomeAssetId"
                  form={form}
                  setForm={setForm}
                  errors={errors}
                  setErrors={setErrors}
                  options={accountOptions}
                  isEditMode={isEditMode} // ❗ คงไว้
                  isDisabled={!isEditMode || !canEditGeneral}
                />
                <AccountSelector
                  label="ບັນຊີລາຍຈ່າຍ"
                  field="expenseId"
                  form={form}
                  setForm={setForm}
                  errors={errors}
                  setErrors={setErrors}
                  options={accountOptions}
                  isEditMode={isEditMode} // ❗ คงไว้
                  isDisabled={!isEditMode || !canEditGeneral}
                />
              </VStack>
            </CardBody>
          </Card>

          {/* Info Alert */}
          <Alert
            status="info"
            borderRadius="lg"
            bg={useColorModeValue("blue.50", "blue.900")}
            borderWidth="1px"
            borderColor={useColorModeValue("blue.200", "blue.700")}
          >
            <AlertIcon color={useColorModeValue("blue.500", "blue.300")} />
            <AlertDescription
              fontSize="sm"
              fontFamily="Noto Sans Lao, sans-serif"
              color={useColorModeValue("blue.800", "blue.100")}
            >
              ຄ່າເສື່ອມລາຄາ (Depreciation) ຖືກຄຳນວນອັດຕະໂນມັດເປັນລາຍເດືອນ
              ໂດຍໃຊ້ວິທີເສັ້ນຕົງ (Straight-line Method) ອີງຕາມລາຄາທຶນ,
              ມູນຄ່າຄົງເຫຼືອ ແລະ ອາຍຸການໃຊ້ງານ
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <Card
            bg={cardBg}
            shadow="sm"
            borderWidth="1px"
            borderColor={borderColor}
          >
            <CardBody>
              <Flex justify="flex-end" gap={3}>
                {!isEditMode ? (
                  <Button
                    leftIcon={<Edit size={18} />}
                    colorScheme="blue"
                    size="lg"
                    onClick={() => setIsEditMode(true)}
                    fontWeight="600"
                    px={8}
                    fontFamily="Noto Sans Lao, sans-serif"
                  >
                    ແກ້ໄຂຊັບສິນ
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleCancel}
                      fontWeight="600"
                      px={8}
                      isDisabled={loading}
                      fontFamily="Noto Sans Lao, sans-serif"
                    >
                      ຍົກເລີກ
                    </Button>

                    <Button
                      leftIcon={<Save size={18} />}
                      colorScheme="blue"
                      size="lg"
                      isLoading={loading}
                      onClick={handleSave}
                      fontWeight="600"
                      px={8}
                      fontFamily="Noto Sans Lao, sans-serif"
                    >
                      {isNew ? "ບັນທຶກ" : "ບັນທຶກແກ້ໄຂ"}
                    </Button>
                  </>
                )}
              </Flex>
            </CardBody>
          </Card>
        </VStack>
      </Container>
    </Box>
  );
};

export default AddAssetModal;
