"use client";

import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Select,
  Button,
  Spinner,
  Center,
  useToast,
  Modal,
  Flex,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  useColorModeValue,
  HStack,
  FormLabel,
  Input,
  useDisclosure,
  VStack,
  IconButton,
  Text,
  Icon,
  Image,
  Grid,
  Card,
  CardBody,
  Stack,
  Divider,
  Tooltip,
  Avatar,
  Badge,
  Container,
  Switch,
} from "@chakra-ui/react";
import { useAuth } from "../context/AuthContext";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  Shield,
  Plus,
  Edit2,
  Trash2,
  Wallet,
} from "lucide-react";
import api from "../api/api";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

// ─── Constants ────────────────────────────────────────────────────────────────

const TOAST_DURATION = 3000;

const INITIAL_USER_STATE = {
  username: "",
  email: "",
  password: "",
  role: "user",
  companyId: {
    name: "",
    address: "",
    phone: "",
    email: "",
    logo: "",
  },
};

const INITIAL_BANK_STATE = {
  bankName: "",
  accountNumber: "",
  currency: "LAK",
  balance: 0,
};

const INITIAL_CASH_STATE = {
  name: "",
  currency: "LAK",
  balance: 0,
};

const CURRENCY_OPTIONS = ["LAK", "THB", "USD", "CNY"];

// ─── Pure helpers (defined once, never recreated) ─────────────────────────────

/**
 * Validates user form input.
 * @param {object} user
 * @param {boolean} isEdit  – when true, password is optional
 * @throws {Error} with a Lao-language message on invalid input
 */
function validateUserInput(user, isEdit = false) {
  if (!user.username?.trim()) throw new Error("ກະລຸນາປ້ອນຊື່ຜູ້ໃຊ້");
  if (!user.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
    throw new Error("ກະລຸນາປ້ອນອີເມວທີ່ຖືກຕ້ອງ");
  }
  if (!isEdit && !user.password?.trim()) {
    throw new Error("ກະລຸນາປ້ອນລະຫັດຜ່ານ");
  }
}

function showLoading(title) {
  Swal.fire({
    title,
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });
}

function showSuccess(title, text) {
  Swal.fire({
    icon: "success",
    title,
    text,
    timer: 2000,
    showConfirmButton: false,
  });
}

function showError(title, error) {
  Swal.fire({
    icon: "error",
    title,
    text: error?.response?.data?.message || error?.message || "ກະລຸນາລອງໃໝ່",
  });
}

async function confirmDelete(text) {
  const result = await Swal.fire({
    title: "ຢືນຢັນການລົບ?",
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#e53e3e",
    confirmButtonText: "ລົບ",
    cancelButtonText: "ຍົກເລີກ",
  });
  return result.isConfirmed;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const RoleBadge = memo(({ role }) => {
  const map = {
    admin: { color: "purple", label: "Admin" },
    master: { color: "blue", label: "Master" },
    staff: { color: "green", label: "Staff" },
  };
  const { color, label } = map[role] ?? { color: "gray", label: role };
  return (
    <Badge
      colorScheme={color}
      variant="subtle"
      px={2.5}
      py={1}
      borderRadius="md"
      fontSize="11px"
      fontWeight="600"
      textTransform="uppercase"
    >
      {label}
    </Badge>
  );
});

const InfoRow = memo(
  ({ icon, label, value, badge, iconColor, textSecondary }) => (
    <HStack spacing={3} align="start">
      <Icon as={icon} boxSize={5} color={iconColor} mt={0.5} />
      <VStack align="start" spacing={0} flex={1}>
        <Text
          fontFamily="'Noto Sans Lao', sans-serif"
          fontSize="xs"
          color={textSecondary}
          fontWeight="500"
        >
          {label}
        </Text>
        <HStack>
          <Text
            fontSize="sm"
            fontWeight="500"
            fontFamily="'Noto Sans Lao', sans-serif"
          >
            {value}
          </Text>
          {badge && (
            <Badge
              fontFamily="'Noto Sans Lao', sans-serif"
              colorScheme="blue"
              fontSize="xs"
            >
              {badge}
            </Badge>
          )}
        </HStack>
      </VStack>
    </HStack>
  )
);

// ─── CompanyAdminDashboard – proper React component (fixes Rules-of-Hooks) ────

const CompanyAdminDashboard = memo(
  ({
    company,
    admin,
    authUser,
    onOpenBank,
    onOpenCash,
    openEditBank,
    openEditCash,
    deleteBankAccount,
    deleteCashAccount,
    navigate,
    fetchUsers, // ✅ เพิ่มตรงนี้
    fetchUser
  }) => {
    // ✅ Hooks called at top level of component, not inside a function
    const cardBg = useColorModeValue("white", "gray.800");
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const iconColor = useColorModeValue("blue.500", "blue.300");
    const textSecondary = useColorModeValue("gray.600", "gray.400");
    const pageBg = useColorModeValue("gray.50", "gray.900");

    if (!company || !admin) return null;
    return (
      <Box minH="100vh" bg={pageBg} py={8}>
        <Container maxW="container.xl">
          <VStack spacing={6} align="stretch">
            <Box>
              <Heading
                size="lg"
                fontFamily="'Noto Sans Lao', sans-serif"
                bgGradient="linear(to-r, blue.500, purple.500)"
                bgClip="text"
              >
                ຂໍ້ມູນບໍລິສັດ & Admin
              </Heading>
              <Text
                color={textSecondary}
                mt={2}
                fontFamily="'Noto Sans Lao', sans-serif"
              >
                ຈັດການຂໍ້ມູນແລະການຕັ້ງຄ່າຂອງທ່ານ
              </Text>
            </Box>

            <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={6}>
              {/* ── Company Info ── */}
              <Card
                bg={cardBg}
                shadow="lg"
                borderRadius="2xl"
                border="1px"
                borderColor={borderColor}
                transition="all 0.3s"
                _hover={{ shadow: "xl", transform: "translateY(-2px)" }}
              >
                <CardBody p={6}>
                  <VStack spacing={5} align="stretch">
                    <HStack justify="space-between" align="start">
                      <VStack align="start" spacing={1}>
                        <HStack>
                          <Icon as={Building2} boxSize={5} color={iconColor} />
                          <Heading
                            size="md"
                            fontFamily="'Noto Sans Lao', sans-serif"
                          >
                            ຂໍ້ມູນບໍລິສັດ
                          </Heading>
                        </HStack>
                        <Text
                          fontSize="xs"
                          color={textSecondary}
                          fontFamily="'Noto Sans Lao', sans-serif"
                        >
                          ລາຍລະອຽດທົ່ວໄປ
                        </Text>
                      </VStack>
                      <Image
                        src={company.logo}
                        alt="company logo"
                        boxSize="64px"
                        borderRadius="lg"
                        objectFit="cover"
                        border="2px"
                        borderColor={borderColor}
                      />
                    </HStack>
                    <Divider />
                    <VStack spacing={4} align="stretch">
                      <Box>
                        <Text
                          fontFamily="'Noto Sans Lao', sans-serif"
                          fontSize="xs"
                          color={textSecondary}
                          mb={1}
                        >
                          ຊື່ບໍລິສັດ
                        </Text>
                        <Text
                          fontSize="lg"
                          fontWeight="600"
                          fontFamily="'Noto Sans Lao', sans-serif"
                        >
                          {company.name}
                        </Text>
                      </Box>
                      <InfoRow
                        icon={Mail}
                        label="ອີເມວ"
                        value={company.email}
                        iconColor={iconColor}
                        textSecondary={textSecondary}
                      />
                      <InfoRow
                        icon={Phone}
                        label="ເບີໂທ"
                        value={company.phone}
                        iconColor={iconColor}
                        textSecondary={textSecondary}
                      />
                      <InfoRow
                        icon={MapPin}
                        label="ທີ່ຢູ່"
                        value={company.address}
                        iconColor={iconColor}
                        textSecondary={textSecondary}
                      />
                      <InfoRow
                        icon={Calendar}
                        label="ເລີ່ມໃຊ້ລະບົບ"
                        value={company.createdAt}
                        iconColor={iconColor}
                        textSecondary={textSecondary}
                      />
                    </VStack>
                  </VStack>
                </CardBody>
              </Card>

              {/* ── Admin Info ── */}
              <Card
                bg={cardBg}
                shadow="lg"
                borderRadius="2xl"
                border="1px"
                borderColor={borderColor}
                transition="all 0.3s"
                _hover={{ shadow: "xl", transform: "translateY(-2px)" }}
              >
                <CardBody p={6}>
                  <VStack spacing={5} align="stretch">
                    <VStack align="start" spacing={1}>
                      <HStack>
                        <Icon as={Shield} boxSize={5} color={iconColor} />
                        <Heading
                          size="md"
                          fontFamily="'Noto Sans Lao', sans-serif"
                        >
                          ຂໍ້ມູນ Admin
                        </Heading>
                      </HStack>
                      <Text
                        fontSize="xs"
                        color={textSecondary}
                        fontFamily="'Noto Sans Lao', sans-serif"
                      >
                        ຂໍ້ມູນຜູ້ດູແລລະບົບ
                      </Text>
                    </VStack>
                    <Divider />
                    <VStack spacing={4} align="stretch">
                      <InfoRow
                        icon={User}
                        label="Username"
                        value={admin.username}
                        iconColor={iconColor}
                        textSecondary={textSecondary}
                      />
                      <HStack spacing={3} align="start">
                        <Icon
                          as={Shield}
                          boxSize={5}
                          color={iconColor}
                          mt={0.5}
                        />
                        <VStack align="start" spacing={0} flex={1}>
                          <Text
                            fontSize="xs"
                            color={textSecondary}
                            fontWeight="500"
                            fontFamily="'Noto Sans Lao', sans-serif"
                          >
                            ສິດການເຂົ້າໃຊ້
                          </Text>
                          <Badge
                            colorScheme="purple"
                            fontSize="sm"
                            px={3}
                            py={1}
                            borderRadius="full"
                            fontWeight="600"
                          >
                            {admin.role}
                          </Badge>
                        </VStack>
                      </HStack>
                      <InfoRow
                        icon={Mail}
                        label="ອີເມວ"
                        value={admin.email}
                        iconColor={iconColor}
                        textSecondary={textSecondary}
                      />
                    </VStack>
                    <HStack spacing={5} align="start">
                      <Icon
                        as={Shield}
                        boxSize={5}
                        color={iconColor}
                        mt={0.5}
                      />
                      <VStack align="start" spacing={0} flex={1}>
                        <Text
                          fontFamily="'Noto Sans Lao', sans-serif"
                          fontSize="xs"
                          color={textSecondary}
                          fontWeight="500"
                        >
                          ເປີດໃຊ້ງານ 2FA
                        </Text>
                        <FormControl display="flex" alignItems="center" gap={3}>
                          <Switch
                            isChecked={authUser?.twoFactorEnabled}
                            onChange={() => {
                              if (authUser?.twoFactorEnabled) {
                                // ถ้าเปิดอยู่ → ถามยืนยันก่อนปิด
                                Swal.fire({
                                  title: "ປິດ 2FA",
                                  html: `<input id="swal-2fa-code" class="swal2-input" 
                  placeholder="ກະລຸນາກວດ 6-digit code ຈາກ app"
                  maxlength="6" inputmode="numeric" style="letter-spacing:0.3em;font-size:1.2rem">`,
                                  confirmButtonText: "ຢືນຢັນປິດ",
                                  confirmButtonColor: "#e53e3e",
                                  showCancelButton: true,
                                  cancelButtonText: "ຍົກເລີກ",
                                  preConfirm: () => {
                                    const code = document.getElementById(
                                      "swal-2fa-code"
                                    ).value;
                                    if (!/^\d{6}$/.test(code)) {
                                      Swal.showValidationMessage(
                                        "ກະລຸນາກວດ 6 ຕົວເລກ"
                                      );
                                      return false;
                                    }
                                    return code;
                                  },
                                }).then(async (result) => {
                                  if (!result.isConfirmed) return;
                                  try {
                                    showLoading("ກຳລັງປິດ 2FA...");
                                    await api.post(
                                      "/api/auth/user/2fa/disable",
                                      { token: result.value }
                                    );
                                    showSuccess("ປິດ 2FA ສຳເລັດ");
                                    await fetchUser(); // ✅ ตอนนี้ทำงานได้แล้วหลังเพิ่ม prop
                                  } catch (err) {
                                    showError("ປິດ 2FA ບໍ່ສຳເລັດ", err);
                                  }
                                });
                              } else {
                                // ถ้าปิดอยู่ → ไป setup
                                navigate("/2fa-setup");
                              }
                            }}
                            id="2fa-switch"
                          />
                          <Text
                            fontSize="sm"
                            color={textSecondary}
                            fontFamily="'Noto Sans Lao', sans-serif"
                          >
                            {authUser?.twoFactorEnabled ? "ເປີດຢູ່" : "ປິດຢູ່"}
                          </Text>
                        </FormControl>
                      </VStack>
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>

              {/* ── Bank Accounts ── */}
              <Card
                bg={cardBg}
                shadow="lg"
                borderRadius="2xl"
                border="1px"
                borderColor={borderColor}
                transition="all 0.3s"
                _hover={{ shadow: "xl", transform: "translateY(-2px)" }}
              >
                <CardBody p={6}>
                  <VStack spacing={5} align="stretch">
                    <Flex justify="space-between">
                      <HStack>
                        <Icon as={Building2} boxSize={5} color={iconColor} />
                        <Heading
                          size="md"
                          fontFamily="'Noto Sans Lao', sans-serif"
                        >
                          ບັນຊີທະນາຄານ
                        </Heading>
                      </HStack>
                      <Button
                        size="sm"
                        leftIcon={<Plus size={16} />}
                        colorScheme="blue"
                        onClick={onOpenBank}
                        fontFamily="'Noto Sans Lao', sans-serif"
                      >
                        ເພີ່ມບັນຊີ
                      </Button>
                    </Flex>
                    <Divider />
                    {!authUser?.companyId?.bankAccounts?.length ? (
                      <Text
                        fontFamily="'Noto Sans Lao', sans-serif"
                        fontSize="sm"
                        color="gray.500"
                      >
                        - ບໍ່ມີຂໍ້ມູນ -
                      </Text>
                    ) : (
                      authUser.companyId.bankAccounts?.map((acc) => (
                        <Box
                          key={acc._id}
                          p={3}
                          borderRadius="lg"
                          border="1px"
                          borderColor={borderColor}
                        >
                          <VStack align="start" spacing={2}>
                            <HStack justify="space-between" w="100%">
                              <HStack spacing={2}>
                                <Badge
                                  fontFamily="'Noto Sans Lao', sans-serif"
                                  colorScheme="blue"
                                >
                                  {acc.bankName}
                                </Badge>
                                <Badge
                                  fontFamily="'Noto Sans Lao', sans-serif"
                                  colorScheme="green"
                                >
                                  {acc.currency}
                                </Badge>
                              </HStack>
                              <HStack>
                                <IconButton
                                  size="sm"
                                  colorScheme="blue"
                                  icon={<Edit2 size={14} />}
                                  onClick={() => openEditBank(acc)}
                                  aria-label="ແກ້ໄຂ"
                                />
                                <IconButton
                                  size="sm"
                                  colorScheme="red"
                                  icon={<Trash2 size={14} />}
                                  onClick={() => deleteBankAccount(acc._id)}
                                  aria-label="ລົບ"
                                />
                              </HStack>
                            </HStack>
                            <Text
                              fontFamily="'Noto Sans Lao', sans-serif"
                              fontSize="sm"
                            >
                              ເລກບັນຊີ: {acc.accountNumber}
                            </Text>
                            <Text
                              fontFamily="'Noto Sans Lao', sans-serif"
                              fontWeight="600"
                            >
                              ຍອດເງິນ: {acc.balance.toLocaleString()}
                            </Text>
                          </VStack>
                        </Box>
                      ))
                    )}
                  </VStack>
                </CardBody>
              </Card>

              {/* ── Cash Accounts ── */}
              <Card
                bg={cardBg}
                shadow="lg"
                borderRadius="2xl"
                border="1px"
                borderColor={borderColor}
                transition="all 0.3s"
                _hover={{ shadow: "xl", transform: "translateY(-2px)" }}
              >
                <CardBody p={6}>
                  <VStack spacing={5} align="stretch">
                    <Flex justify="space-between">
                      <HStack>
                        <Icon as={Wallet} boxSize={5} color={iconColor} />
                        <Heading
                          size="md"
                          fontFamily="'Noto Sans Lao', sans-serif"
                        >
                          ບັນຊີເງິນສົດ
                        </Heading>
                      </HStack>
                      <Button
                        size="sm"
                        leftIcon={<Plus size={16} />}
                        colorScheme="green"
                        onClick={onOpenCash}
                        fontFamily="'Noto Sans Lao', sans-serif"
                      >
                        ເພີ່ມເງິນສົດ
                      </Button>
                    </Flex>
                    <Divider />
                    {!authUser?.companyId?.cashAccounts?.length ? (
                      <Text
                        fontFamily="'Noto Sans Lao', sans-serif"
                        fontSize="sm"
                        color="gray.500"
                      >
                        - ບໍ່ມີຂໍ້ມູນ -
                      </Text>
                    ) : (
                      authUser.companyId.cashAccounts.map((acc) => (
                        <Box
                          key={acc._id}
                          p={3}
                          borderRadius="lg"
                          border="1px"
                          borderColor={borderColor}
                        >
                          <VStack align="start" spacing={2}>
                            <HStack w="100%" justify="space-between">
                              <HStack>
                                <Badge
                                  fontFamily="'Noto Sans Lao', sans-serif"
                                  colorScheme="purple"
                                >
                                  {acc.name}
                                </Badge>
                                <Badge
                                  fontFamily="'Noto Sans Lao', sans-serif"
                                  colorScheme="green"
                                >
                                  {acc.currency}
                                </Badge>
                              </HStack>
                              <HStack>
                                <IconButton
                                  size="sm"
                                  colorScheme="blue"
                                  icon={<Edit2 size={14} />}
                                  onClick={() => openEditCash(acc)}
                                  aria-label="ແກ້ໄຂ"
                                />
                                <IconButton
                                  size="sm"
                                  colorScheme="red"
                                  icon={<Trash2 size={14} />}
                                  onClick={() => deleteCashAccount(acc._id)}
                                  aria-label="ລົບ"
                                />
                              </HStack>
                            </HStack>
                            <Text
                              fontFamily="'Noto Sans Lao', sans-serif"
                              fontWeight="600"
                            >
                              ຍອດເງິນ: {acc.balance.toLocaleString()}
                            </Text>
                          </VStack>
                        </Box>
                      ))
                    )}
                  </VStack>
                </CardBody>
              </Card>
            </Grid>
          </VStack>
        </Container>
      </Box>
    );
  }
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Users() {
  const { user: authUser ,fetchUser} = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  // ── State ──────────────────────────────────────────────────────────────────
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState(INITIAL_USER_STATE);
  const [editUser, setEditUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newBank, setNewBank] = useState(INITIAL_BANK_STATE);
  const [editBank, setEditBank] = useState(null);
  const [newCash, setNewCash] = useState(INITIAL_CASH_STATE);
  const [editCash, setEditCash] = useState(null);

  // ── Disclosures ────────────────────────────────────────────────────────────
  const { isOpen, onOpen, onClose } = useDisclosure(); // Add user
  const {
    isOpen: isEditOpen,
    onOpen: onEditOpen,
    onClose: onEditClose,
  } = useDisclosure();
  const {
    isOpen: isBankOpen,
    onOpen: onOpenBank,
    onClose: onCloseBank,
  } = useDisclosure();
  const {
    isOpen: isCashOpen,
    onOpen: onOpenCash,
    onClose: onCloseCash,
  } = useDisclosure();
  const {
    isOpen: isEditBankOpen,
    onOpen: onOpenEditBank,
    onClose: onCloseEditBank,
  } = useDisclosure();
  const {
    isOpen: isEditCashOpen,
    onOpen: onOpenEditCash,
    onClose: onCloseEditCash,
  } = useDisclosure();

  // ── Theme values (called once at top level, not in loops) ─────────────────
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const iconColor = useColorModeValue("blue.500", "blue.300");
  const headerBg = useColorModeValue("blue.50", "blue.900");
  const hoverBg = useColorModeValue("gray.50", "gray.700");
  const headingColor = useColorModeValue("gray.700", "gray.100");
  const subTextColor = useColorModeValue("gray.600", "gray.400");
  const selectBg = useColorModeValue("gray.50", "gray.700");
  const thColor = useColorModeValue("gray.700", "gray.200");

  // ── Derived ────────────────────────────────────────────────────────────────
  // ✅ Fixed: include both role AND isSuperAdmin in the dependency array
  const isAdmin = useMemo(
    () => authUser?.role === "admin" && authUser?.isSuperAdmin === true,
    [authUser?.role, authUser?.isSuperAdmin]
  );

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/auth/users");
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      toast({
        title: "ບໍ່ສາມາດດືງຂໍ້ມູນຜູ້ໃຊ້ງານ",
        description: error?.response?.data?.message || "ກະລຸນາລອງໃໝ່",
        status: "error",
        duration: TOAST_DURATION,
        isClosable: true,
      });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ── User handlers ──────────────────────────────────────────────────────────
  const handleRoleChange = useCallback(
    async (userId, newRole) => {
      if (!userId || !newRole) return;
      showLoading("ກຳລັງອັບເດດບົດບາດ...");
      try {
        await api.patch(`/api/auth/users/${userId}/role`, { role: newRole });
        await fetchUsers();
        showSuccess("ອັບເດດບົດບາດສຳເລັດ");
      } catch (error) {
        showError("ບໍ່ສາມາດອັບເດດບົດບາດໄດ້", error);
      }
    },
    [fetchUsers]
  );

  const handleDeleteUser = useCallback(
    async (userId) => {
      if (!userId) return;
      const confirmed = await Swal.fire({
        title: "ຢືນຢັນການລົບຜູ້ໃຊ້?",
        html: `<p>ການລົບຈະສົ່ງຜົນກະທົບຕໍ່ຂໍ້ມູນທັງໝົດ</p><strong style="color:red">ບໍ່ສາມາດກູ້ຄືນໄດ້</strong>`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#e53e3e",
        confirmButtonText: "ລົບ",
        cancelButtonText: "ຍົກເລີກ",
      });
      if (!confirmed.isConfirmed) return;

      showLoading("ກຳລັງລົບ...");
      try {
        await api.delete(`/api/auth/users/${userId}`);
        await fetchUsers();
        showSuccess("ລົບຜູ້ໃຊ້ສຳເລັດ");
      } catch (error) {
        showError("ບໍ່ສາມາດລົບຜູ້ໃຊ້ໄດ້", error);
      }
    },
    [fetchUsers]
  );

  const handleAddUser = useCallback(async () => {
    try {
      validateUserInput(newUser, false); // ✅ uses stable helper, not inline arrow
      setIsSubmitting(true);
      showLoading("ກຳລັງເພີ່ມຜູ້ໃຊ້...");
      await api.post("/api/auth/register", newUser);
      showSuccess("ເພີ່ມຜູ້ໃຊ້ສຳເລັດ");
      await fetchUsers();
      setNewUser(INITIAL_USER_STATE);
      onClose();
    } catch (error) {
      showError("ບໍ່ສາມາດເພີ່ມຜູ້ໃຊ້", error);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }, [newUser, fetchUsers, onClose]);

  const handleOpenEdit = useCallback(
    (user) => {
      if (!user) return;
      setEditUser({
        _id: user._id,
        username: user.username || "",
        email: user.email || "",
        password: "",
        role: user.role || "user",
        companyId: {
          _id: user.companyId?._id,
          name: user.companyId?.name || "",
          address: user.companyId?.address || "",
          phone: user.companyId?.phone || "",
          email: user.companyId?.email || "",
          logo: user.companyId?.logo || "",
          taxId: user.companyId?.taxId ?? null,
          information: user.companyId?.information || "",
        },
      });
      onEditOpen();
    },
    [onEditOpen]
  );

  const handleUpdateUser = useCallback(async () => {
    try {
      validateUserInput(editUser, true); // ✅ isEdit = true → password optional
      setIsSubmitting(true);
      showLoading("ກຳລັງອັບເດດ...");

      const formData = new FormData();
      formData.append("username", editUser.username);
      formData.append("email", editUser.email);
      if (editUser.role) formData.append("role", editUser.role);
      if (editUser.password) formData.append("password", editUser.password);
      if (editUser.companyId)
        formData.append("companyId", JSON.stringify(editUser.companyId));
      if (editUser.companyId?.logo instanceof File)
        formData.append("logo", editUser.companyId.logo);
      if (editUser.companyId?.taxId)
        formData.append("taxId", editUser.companyId.taxId);
      if (editUser.companyId?.information)
        formData.append("information", editUser.companyId.information);

      await api.patch(`/api/auth/user/${editUser._id}`, formData);
      await fetchUsers();
      await fetchUser()
      showSuccess("ອັບເດດສຳເລັດ", "ຂໍ້ມູນຜູ້ໃຊ້ຖືກອັບເດດແລ້ວ");
      onEditClose();
    } catch (error) {
      showError("ອັບເດດບໍ່ສຳເລັດ", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [editUser, fetchUsers, onEditClose]);

  // ── Bank handlers ──────────────────────────────────────────────────────────
  const openEditBank = useCallback(
    (acc) => {
      setEditBank({ ...acc });
      onOpenEditBank();
    },
    [onOpenEditBank]
  );

  const addBankAccount = useCallback(async () => {
    showLoading("ກຳລັງເພີ່ມບັນຊີ...");
    try {
      await api.patch(
        `/api/company/${authUser.companyId._id}/add-bank`,
        newBank
      );
      showSuccess("ເພີ່ມບັນຊີສຳເລັດ");
      onCloseBank();
      await fetchUsers();
      setNewBank(INITIAL_BANK_STATE);
    } catch (error) {
      showError("ເກີດຂໍ້ຜິດພາດ", error);
    }
  }, [newBank, authUser, fetchUsers, onCloseBank]);

  const updateBankAccount = useCallback(async () => {
    showLoading("ກຳລັງອັບເດດ...");
    try {
      await api.patch(`/api/company/update-bank/${editBank._id}`, editBank);
      showSuccess("ອັບເດດບັນຊີສຳເລັດ");
      await fetchUsers();
      onCloseEditBank();
    } catch (error) {
      showError("ອັບເດດບໍ່ສຳເລັດ", error);
    }
  }, [editBank, fetchUsers, onCloseEditBank]);

  const deleteBankAccount = useCallback(
    async (bankId) => {
      if (!(await confirmDelete("ບັນຊີນີ້ຈະຖືກລົບຖາວອນ"))) return;
      Swal.fire({ didOpen: () => Swal.showLoading() });
      try {
        await api.patch(`/api/company/remove-bank/${bankId}`);
        showSuccess("ລົບບັນຊີສຳເລັດ");
        await fetchUsers();
      } catch (error) {
        showError("ລົບບໍ່ສຳເລັດ", error);
      }
    },
    [fetchUsers]
  );

  // ── Cash handlers ──────────────────────────────────────────────────────────
  const openEditCash = useCallback(
    (acc) => {
      setEditCash({ ...acc });
      onOpenEditCash();
    },
    [onOpenEditCash]
  );

  const addCashAccount = useCallback(async () => {
    showLoading("ກຳລັງເພີ່ມບັນຊີເງິນສົດ...");
    try {
      await api.patch(
        `/api/company/${authUser.companyId._id}/add-cash`,
        newCash
      );
      showSuccess("ເພີ່ມບັນຊີເງິນສົດສຳເລັດ");
      await fetchUsers();
      onCloseCash();
      setNewCash(INITIAL_CASH_STATE);
    } catch (error) {
      showError("ເກີດຂໍ້ຜິດພາດ", error);
    }
  }, [newCash, authUser, fetchUsers, onCloseCash]);

  const updateCashAccount = useCallback(async () => {
    showLoading("ກຳລັງອັບເດດ...");
    try {
      // ✅ Fixed: use authUser.companyId._id (company state was never populated)
      await api.patch(
        `/api/company/${authUser.companyId._id}/update-cash/${editCash._id}`,
        editCash
      );
      showSuccess("ອັບເດດບັນຊີເງິນສົດສຳເລັດ");
      await fetchUsers();
      onCloseEditCash();
    } catch (error) {
      showError("ເກີດຂໍ້ຜິດພາດ", error);
    }
  }, [editCash, authUser, fetchUsers, onCloseEditCash]);

  const deleteCashAccount = useCallback(
    async (cashId) => {
      if (!(await confirmDelete("ບັນຊີເງິນສົດນີ້ຈະຖືກລົບຖາວອນ"))) return;
      Swal.fire({ didOpen: () => Swal.showLoading() });
      try {
        await api.patch(`/api/company/remove-cash/${cashId}`);
        showSuccess("ລົບບັນຊີເງິນສົດສຳເລັດ");
        await fetchUsers();
      } catch (error) {
        showError("ລົບບໍ່ສຳເລັດ", error);
      }
    },
    [fetchUsers]
  );

  // ── Derived counts ─────────────────────────────────────────────────────────
  const adminCount = useMemo(
    () => users.filter((u) => u.role === "admin").length,
    [users]
  );
  const masterCount = useMemo(
    () => users.filter((u) => u.role === "master").length,
    [users]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <Box p={6} fontFamily="'Noto Sans Lao', sans-serif">
      <Box minH="100vh" bg={useColorModeValue("gray.50", "gray.900")} py={8}>
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
            <VStack align="start" spacing={1}>
              <Heading
                size="lg"
                fontFamily="'Noto Sans Lao', sans-serif"
                color={headingColor}
              >
                ຈັດການຜູ້ໃຊ້ງານ
              </Heading>
              <Text
                fontSize="sm"
                color={subTextColor}
                fontFamily="'Noto Sans Lao', sans-serif"
              >
                ຄຸ້ມຄອງສະມາຊິກແລະສິດທິການເຂົ້າໃຊ້
              </Text>
            </VStack>
            <Button
              leftIcon={<Plus size={18} />}
              colorScheme="blue"
              size="md"
              fontFamily="'Noto Sans Lao', sans-serif"
              onClick={onOpen}
              shadow="md"
              _hover={{ transform: "translateY(-2px)", shadow: "lg" }}
              transition="all 0.2s"
            >
              ເພີ່ມສະມາຊິກໃໝ່
            </Button>
          </Flex>
        </VStack>

        {/* Stat cards */}
        <HStack mt={4}>
          {[
            { count: adminCount, label: "ຜູ້ດູແລລະບົບ", scheme: "green" },
            { count: masterCount, label: "master(ລະດັບ2)", scheme: "green" },
            { count: 1, label: "ບໍລິສັດ", scheme: "purple" },
          ].map(({ count, label, scheme }) => (
            <Card
              key={label}
              bg={cardBg}
              flex={1}
              minW="200px"
              border="1px"
              borderColor={borderColor}
            >
              <CardBody>
                <HStack spacing={3}>
                  <Box p={3} bg={`${scheme}.100`} borderRadius="lg">
                    <Icon
                      as={scheme === "purple" ? Building2 : Shield}
                      boxSize={6}
                      color={`${scheme}.600`}
                    />
                  </Box>
                  <VStack align="start" spacing={0}>
                    <Text fontSize="2xl" fontWeight="bold">
                      {count}
                    </Text>
                    <Text
                      fontSize="xs"
                      color="gray.600"
                      fontFamily="'Noto Sans Lao', sans-serif"
                    >
                      {label}
                    </Text>
                  </VStack>
                </HStack>
              </CardBody>
            </Card>
          ))}
        </HStack>

        {/* Users table */}
        <Card
          bg={cardBg}
          shadow="lg"
          borderRadius="xl"
          border="1px"
          borderColor={borderColor}
          overflow="hidden"
          mt={4}
        >
          <Box overflowX="auto">
            <Table variant="simple">
              <Thead bg={headerBg}>
                <Tr>
                  {["ຜູ້ໃຊ້ງານ", "ອີເມວ", "ບໍລິສັດ", "ບົດບາດ"].map((h) => (
                    <Th
                      key={h}
                      fontFamily="'Noto Sans Lao', sans-serif"
                      textTransform="none"
                      fontSize="sm"
                      color={thColor}
                    >
                      {h}
                    </Th>
                  ))}
                  {isAdmin && (
                    <Th
                      fontFamily="'Noto Sans Lao', sans-serif"
                      textTransform="none"
                      fontSize="sm"
                      textAlign="center"
                      color={thColor}
                    >
                      ການດຳເນີນການ
                    </Th>
                  )}
                </Tr>
              </Thead>
              <Tbody>
                {loading ? (
                  <Tr>
                    <Td colSpan={5}>
                      <Center py={10}>
                        <VStack spacing={3}>
                          <Spinner size="lg" color="green.400" />
                          <Text fontSize="sm" color="gray.500">
                            ກຳລັງໂຫຼດຂໍ້ມູນ...
                          </Text>
                        </VStack>
                      </Center>
                    </Td>
                  </Tr>
                ) : users.length === 0 ? (
                  <Tr>
                    <Td colSpan={5}>
                      <Center py={10}>
                        <Text color="gray.500">ບໍ່ພົບຂໍ້ມູນຜູ້ໃຊ້</Text>
                      </Center>
                    </Td>
                  </Tr>
                ) : (
                  users.map((user) => {
                    const isMe = user._id === authUser?._id;
                    return (
                      <Tr
                        key={user._id}
                        _hover={{ bg: hoverBg }}
                        bg={isMe ? "green.50" : "white"}
                        borderLeft={
                          isMe ? "4px solid #38A169" : "4px solid transparent"
                        }
                        transition="all 0.2s"
                      >
                        <Td>
                          <HStack spacing={3}>
                            <Avatar
                              size="sm"
                              name={user.username}
                              src={user.avatar}
                            />
                            <Text
                              fontFamily="'Noto Sans Lao', sans-serif"
                              fontWeight="500"
                            >
                              {user.username}
                            </Text>
                          </HStack>
                        </Td>
                        <Td>
                          <HStack spacing={2}>
                            <Icon as={Mail} boxSize={4} color="gray.400" />
                            <Text fontSize="sm">{user.email}</Text>
                          </HStack>
                        </Td>
                        <Td fontFamily="'Noto Sans Lao', sans-serif">
                          {user.companyId?.name || "-"}
                        </Td>
                        <Td>
                          {isAdmin ? (
                            <Select
                              value={user.role}
                              onChange={(e) =>
                                handleRoleChange(user._id, e.target.value)
                              }
                              size="sm"
                              bg={selectBg}
                              borderRadius="md"
                              maxW="120px"
                              fontFamily="'Noto Sans Lao', sans-serif"
                            >
                              <option value="staff">Staff</option>
                              <option value="admin">Admin</option>
                              <option value="master">Master</option>
                            </Select>
                          ) : (
                            <RoleBadge role={user.role} />
                          )}
                        </Td>
                        {isAdmin && (
                          <Td textAlign="center">
                            <HStack spacing={2} justify="center">
                              <Tooltip label="ແກ້ໄຂ" placement="top">
                                <IconButton
                                  icon={<Edit2 size={16} />}
                                  colorScheme="blue"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenEdit(user)}
                                  aria-label="ແກ້ໄຂ"
                                />
                              </Tooltip>
                              <Tooltip label="ລົບ" placement="top">
                                <IconButton
                                  icon={<Trash2 size={16} />}
                                  colorScheme="red"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteUser(user._id)}
                                  aria-label="ລົບ"
                                />
                              </Tooltip>
                            </HStack>
                          </Td>
                        )}
                      </Tr>
                    );
                  })
                )}
              </Tbody>
            </Table>
          </Box>
        </Card>

        {/* ✅ CompanyAdminDashboard is now a real component, not a function call */}
        <CompanyAdminDashboard
          company={authUser?.companyId}
          admin={authUser}
          authUser={authUser}
          onOpenBank={onOpenBank}
          onOpenCash={onOpenCash}
          openEditBank={openEditBank}
          openEditCash={openEditCash}
          deleteBankAccount={deleteBankAccount}
          deleteCashAccount={deleteCashAccount}
          navigate={navigate}
          fetchUsers={fetchUsers}
          fetchUser={fetchUser}
        />
      </Box>

      {/* ── Add User Modal ──────────────────────────────────────────────────── */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader fontFamily="Noto Sans Lao, sans-serif">
            ເພີ່ມສະມາຊິກໃໝ່
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                  ຊື່ຜູ້ໃຊ້
                </FormLabel>
                <Input
                  value={newUser.username}
                  placeholder="Username"
                  onChange={(e) =>
                    setNewUser((p) => ({ ...p, username: e.target.value }))
                  }
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                  ອີເມວ
                </FormLabel>
                <Input
                  type="email"
                  value={newUser.email}
                  placeholder="Email"
                  onChange={(e) =>
                    setNewUser((p) => ({ ...p, email: e.target.value }))
                  }
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                  ລະຫັດຜ່ານ
                </FormLabel>
                <Input
                  type="password"
                  value={newUser.password}
                  placeholder="Password"
                  autoComplete="new-password"
                  onChange={(e) =>
                    setNewUser((p) => ({ ...p, password: e.target.value }))
                  }
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                  ບົດບາດ
                </FormLabel>
                <Select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser((p) => ({ ...p, role: e.target.value }))
                  }
                >
                  <option value="staff">Staff (ພະນັກງານ)</option>
                  <option value="admin">Admin (ຜູ້ເບີງລະບົບ)</option>
                  <option value="master">Master (ຜູ້ເບີງລະບົບ ລະດັບ 2)</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              fontFamily="Noto Sans Lao, sans-serif"
              colorScheme="green"
              mr={3}
              onClick={handleAddUser}
              isLoading={isSubmitting}
              loadingText="ກຳລັງບັນທຶກ..."
            >
              ບັນທຶກ
            </Button>
            <Button
              fontFamily="Noto Sans Lao, sans-serif"
              variant="ghost"
              onClick={onClose}
              isDisabled={isSubmitting}
            >
              ຍົກເລີກ
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── Edit User Modal ─────────────────────────────────────────────────── */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader fontFamily="Noto Sans Lao, sans-serif">
            ແກ້ໄຂຂໍ້ມູນຜູ້ໃຊ້
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              {[
                {
                  label: "ຊື່ຜູ້ໃຊ້",
                  field: "username",
                  type: "text",
                  ph: "Username",
                },
                { label: "ອີເມວ", field: "email", type: "email", ph: "Email" },
                {
                  label: "ລະຫັດຜ່ານໃໝ່ (ປ່ອຍວ່າງຖ້າບໍ່ຕ້ອງການປ່ຽນ)",
                  field: "password",
                  type: "password",
                  ph: "ລະຫັດຜ່ານໃໝ່",
                },
              ].map(({ label, field, type, ph }) => (
                <FormControl key={field} isRequired={field !== "password"}>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    {label}
                  </FormLabel>
                  <Input
                    type={type}
                    value={editUser?.[field] || ""}
                    placeholder={ph}
                    autoComplete={
                      field === "password" ? "new-password" : undefined
                    }
                    onChange={(e) =>
                      setEditUser((p) => ({ ...p, [field]: e.target.value }))
                    }
                  />
                </FormControl>
              ))}
              {/* Company fields */}
              {[
                {
                  label: "ຊື່ບໍລິສັດ",
                  key: "name",
                  type: "text",
                  ph: "Company Name",
                },
                {
                  label: "ທີ່ຢູ່",
                  key: "address",
                  type: "text",
                  ph: "Address",
                },
                {
                  label: "ເບີໂທລະສັບ",
                  key: "phone",
                  type: "text",
                  ph: "Phone",
                },
                {
                  label: "ອີເມວບໍລິສັດ",
                  key: "email",
                  type: "email",
                  ph: "Company Email",
                },
                {
                  label: "ເລກປະຈຳຕົວຜູ້ເສຍອາກອນ",
                  key: "taxId",
                  type: "number",
                  ph: "Tax ID",
                },
                {
                  label: "ທີ່",
                  key: "information",
                  type: "text",
                  ph: "ທີ່ ນະຄອນຫລວງ...",
                },
              ].map(({ label, key, type, ph }) => (
                <FormControl key={key}>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    {label}
                  </FormLabel>
                  <Input
                    type={type}
                    value={editUser?.companyId?.[key] ?? ""}
                    placeholder={ph}
                    onChange={(e) =>
                      // ✅ Fixed: always spread editUser.companyId (not editUser.taxId / editUser.information)
                      setEditUser((p) => ({
                        ...p,
                        companyId: { ...p.companyId, [key]: e.target.value },
                      }))
                    }
                  />
                </FormControl>
              ))}
              <FormControl>
                <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                  ໂລໂກ້
                </FormLabel>
                <Input
                  type="file"
                  onChange={(e) =>
                    setEditUser((p) => ({
                      ...p,
                      companyId: { ...p.companyId, logo: e.target.files[0] },
                    }))
                  }
                />
                {editUser?.companyId?.logo &&
                  typeof editUser.companyId.logo === "string" && (
                    <Image
                      src={editUser.companyId.logo}
                      alt="Company Logo"
                      objectFit="contain"
                      w="90%"
                      h="90%"
                      mt={2}
                    />
                  )}
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              fontFamily="Noto Sans Lao, sans-serif"
              colorScheme="blue"
              mr={3}
              onClick={handleUpdateUser}
              isLoading={isSubmitting}
              loadingText="ກຳລັງອັບເດດ..."
            >
              ອັບເດດ
            </Button>
            <Button
              fontFamily="Noto Sans Lao, sans-serif"
              variant="ghost"
              onClick={onEditClose}
              isDisabled={isSubmitting}
            >
              ຍົກເລີກ
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── Add Bank Modal ──────────────────────────────────────────────────── */}
      <Modal isOpen={isBankOpen} onClose={onCloseBank}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader fontFamily="'Noto Sans Lao', sans-serif">
            ເພີ່ມບັນຊີທະນາຄານ
          </ModalHeader>
          <ModalBody>
            <VStack spacing={3}>
              <Input
                placeholder="ຊື່ທະນາຄານ"
                onChange={(e) =>
                  setNewBank((p) => ({ ...p, bankName: e.target.value }))
                }
              />
              <Input
                placeholder="ເລກບັນຊີ"
                onChange={(e) =>
                  setNewBank((p) => ({ ...p, accountNumber: e.target.value }))
                }
              />
              <Select
                value={newBank.currency}
                onChange={(e) =>
                  setNewBank((p) => ({ ...p, currency: e.target.value }))
                }
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
              <Input
                type="number"
                placeholder="ຈຳນວນເງິນ"
                onChange={(e) =>
                  setNewBank((p) => ({ ...p, balance: Number(e.target.value) }))
                }
              />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={addBankAccount} colorScheme="blue">
              ບັນທຶກ
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── Add Cash Modal ──────────────────────────────────────────────────── */}
      <Modal isOpen={isCashOpen} onClose={onCloseCash}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader fontFamily="'Noto Sans Lao', sans-serif">
            ເພີ່ມບັນຊີເງິນສົດ
          </ModalHeader>
          <ModalBody>
            <VStack spacing={3}>
              <Input
                placeholder="ຊື່ກອງເງິນ"
                onChange={(e) =>
                  setNewCash((p) => ({ ...p, name: e.target.value }))
                }
              />
              <Select
                value={newCash.currency}
                onChange={(e) =>
                  setNewCash((p) => ({ ...p, currency: e.target.value }))
                }
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
              <Input
                type="number"
                placeholder="ຈຳນວນເງິນ"
                onChange={(e) =>
                  setNewCash((p) => ({ ...p, balance: Number(e.target.value) }))
                }
              />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={addCashAccount} colorScheme="green">
              ບັນທຶກ
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── Edit Bank Modal ─────────────────────────────────────────────────── */}
      <Modal isOpen={isEditBankOpen} onClose={onCloseEditBank}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>ແກ້ໄຂບັນຊີທະນາຄານ</ModalHeader>
          <ModalBody>
            <VStack spacing={3}>
              <Input
                value={editBank?.bankName || ""}
                placeholder="ຊື່ທະນາຄານ"
                onChange={(e) =>
                  setEditBank((p) => ({ ...p, bankName: e.target.value }))
                }
              />
              <Input
                value={editBank?.accountNumber || ""}
                placeholder="ເລກບັນຊີ"
                onChange={(e) =>
                  setEditBank((p) => ({ ...p, accountNumber: e.target.value }))
                }
              />
              <Select
                value={editBank?.currency || "LAK"}
                onChange={(e) =>
                  setEditBank((p) => ({ ...p, currency: e.target.value }))
                }
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
              <Input
                type="number"
                value={editBank?.balance ?? 0}
                placeholder="ຈຳນວນເງິນ"
                onChange={(e) =>
                  setEditBank((p) => ({
                    ...p,
                    balance: Number(e.target.value),
                  }))
                }
              />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" onClick={updateBankAccount}>
              ອັບເດດ
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── Edit Cash Modal ─────────────────────────────────────────────────── */}
      <Modal isOpen={isEditCashOpen} onClose={onCloseEditCash}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>ແກ້ໄຂບັນຊີເງິນສົດ</ModalHeader>
          <ModalBody>
            <VStack spacing={3}>
              <Input
                value={editCash?.name || ""}
                placeholder="ຊື່ກອງເງິນ"
                onChange={(e) =>
                  setEditCash((p) => ({ ...p, name: e.target.value }))
                }
              />
              <Select
                value={editCash?.currency || "LAK"}
                onChange={(e) =>
                  setEditCash((p) => ({ ...p, currency: e.target.value }))
                }
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
              <Input
                type="number"
                value={editCash?.balance ?? 0}
                placeholder="ຈຳນວນເງິນ"
                onChange={(e) =>
                  setEditCash((p) => ({
                    ...p,
                    balance: Number(e.target.value),
                  }))
                }
              />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" onClick={updateCashAccount}>
              ອັບເດດ
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
