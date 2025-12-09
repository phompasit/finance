"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Alert,
  AlertIcon,
  AlertDescription,
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
} from "@chakra-ui/react";
import { EditIcon, DeleteIcon } from "@chakra-ui/icons";
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
// Constants
const API_URL = import.meta.env.VITE_API_URL;
const TOAST_DURATION = 3000;

// Initial state for new user
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

// API utility functions
const createAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const handleApiError = (error, toast, defaultMessage) => {
  toast({
    title: "ເກີດຂໍ້ຜິດພາດ",
    description: error.message || defaultMessage,
    status: "error",
    duration: TOAST_DURATION,
    isClosable: true,
  });
};

export default function Users() {
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState(INITIAL_USER_STATE);
  const [editUser, setEditUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [company, setCompany] = useState(null);

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
  const [editBank, setEditBank] = useState(null);

  const {
    isOpen: isEditBankOpen,
    onOpen: onOpenEditBank,
    onClose: onCloseEditBank,
  } = useDisclosure();
  const [newBank, setNewBank] = useState({
    bankName: "",
    accountNumber: "",
    currency: "LAK",
    balance: 0,
  });

  const [newCash, setNewCash] = useState({
    name: "",
    currency: "LAK",
    balance: 0,
  });
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isEditOpen,
    onOpen: onEditOpen,
    onClose: onEditClose,
  } = useDisclosure();

  const [editCash, setEditCash] = useState(null);

  const {
    isOpen: isEditCashOpen,
    onOpen: onOpenEditCash,
    onClose: onCloseEditCash,
  } = useDisclosure();

  const openEditBank = (acc) => {
    setEditBank({ ...acc });
    onOpenEditBank();
  };
  const openEditCash = (acc) => {
    setEditCash({ ...acc });
    onOpenEditCash();
  };

  const headerBg = useColorModeValue("blue.50", "blue.900");
  const hoverBg = useColorModeValue("gray.50", "gray.700");
  // Fetch users with error handling
  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/users`, {
        headers: createAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      handleApiError(error, toast, "ບໍ່ສາມາດດືງຂໍ້ມູນຜູ້ໃຊ້ງານ");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle role change with optimistic updates
  const handleRoleChange = useCallback(
    async (userId, newRole) => {
      if (!userId || !newRole) return;

      try {
        const response = await fetch(
          `${API_URL}/api/auth/users/${userId}/role`,
          {
            method: "PATCH",
            headers: createAuthHeaders(),
            body: JSON.stringify({ role: newRole }),
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "ບໍ່ສາມາດອັບເດດບົດບາດໄດ້");
        }

        await fetchUsers();
        toast({
          title: "ອັບເດດສຳເລັດ",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      } catch (error) {
        handleApiError(error, toast, "ບໍ່ສາມາດອັບເດດບົດບາດໄດ້");
      }
    },
    [fetchUsers, toast]
  );

  // Handle delete user with confirmation
  const handleDeleteUser = useCallback(
    async (userId) => {
      if (!userId) return;

      const confirmed = window.confirm(
        "ເຈົ້າແນ່ໃຈບໍ່ທີ່ຈະລົບບັນຊີນີ້? ຄຳເຕືອນ:ການລົບຈະສົ່ງຜົນກະທົບຕໍ່ລາຍການທັງໝົດທີ່ຜູ້ໃຊ້ນີ້ເຄີຍບັນທຶກໄວ້ ແລະບໍ່ສາມາດກູ້ຄືນໄດ້"
      );

      if (!confirmed) return;

      try {
        const response = await fetch(`${API_URL}/api/auth/users/${userId}`, {
          method: "DELETE",
          headers: createAuthHeaders(),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "ບໍ່ສາມາດລົບຜູ້ໃຊ້ງານໄດ້");
        }

        await fetchUsers();
        toast({
          title: "ລົບຜູ້ໃຊ້ງານເຮັດສຳເລັດແລ້ວ",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      } catch (error) {
        toast({
          title: error.message || "ບໍ່ສາມາດລົບຜູ້ໃຊ້ງານໄດ້",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    },
    [fetchUsers, toast]
  );

  // Validate user input
  const validateUserInput = (user) => {
    if (!user.username?.trim()) {
      throw new Error("ກະລຸນາປ້ອນຊື່ຜູ້ໃຊ້");
    }
    if (!user.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
      throw new Error("ກະລຸນາປ້ອນອີເມວທີ່ຖືກຕ້ອງ");
    }
    if (!user.password?.trim() && !editUser) {
      throw new Error("ກະລຸນາປ້ອນລະຫັດຜ່ານ");
    }
    return true;
  };

  // Handle add user
  const handleAddUser = useCallback(async () => {
    try {
      validateUserInput(newUser);
      setIsSubmitting(true);

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: createAuthHeaders(),
        body: JSON.stringify(newUser),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "ບໍ່ສາມາດເພີ່ມຜູ້ໃຊ້ງານໄດ້");
      }

      toast({
        title: "ເພີ່ມຜູ້ໃຊ້ງານເຮັດສຳເລັດແລ້ວ",
        status: "success",
        duration: 2000,
        isClosable: true,
      });

      await fetchUsers();
      setNewUser(INITIAL_USER_STATE);
      onClose();
    } catch (error) {
      handleApiError(error, toast, "ບໍ່ສາມາດເພີ່ມຜູ້ໃຊ້ງານໄດ້");
    } finally {
      setIsSubmitting(false);
    }
  }, [newUser, fetchUsers, toast, onClose]);
  const addBankAccount = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/company/${authUser.companyId._id}/add-bank`,
        {
          method: "PATCH",
          headers: createAuthHeaders(),
          body: JSON.stringify(newBank),
        }
      );

      const result = await response.json();

      if (!result.success) throw new Error(result.message);

      toast({
        title: "ເພີ່ມບັນຊີສຳເລັດ",
        status: "success",
        duration: 2500,
        isClosable: true,
      });
      onCloseBank();
      await fetchUsers();
      setNewBank({
        bankName: "",
        accountNumber: "",
        currency: "LAK",
        balance: 0,
      });
    } catch (err) {
      toast({
        title: "ເກີດຂໍ້ຜິດພາດ",
        status: "error",
        description: err.message,
      });
    }
  };
  const addCashAccount = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/company/${authUser.companyId._id}/add-cash`,
        {
          method: "PATCH",
          headers: createAuthHeaders(),
          body: JSON.stringify(newCash),
        }
      );

      const result = await response.json();

      if (!result.success) throw new Error(result.message);

      toast({
        title: "ເພີ່ມບັນຊີເງິນສົດສຳເລັດ",
        status: "success",
        duration: 2500,
        isClosable: true,
      });

      await fetchUsers();
      onCloseCash();
      setNewCash({ name: "", currency: "LAK", balance: 0 });
    } catch (err) {
      toast({
        title: "Error",
        status: "error",
        description: err.message,
      });
    }
  };
  console.log(editBank);
  const updateBankAccount = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/company/update-bank/${editBank._id}`,
        {
          method: "PATCH",
          headers: createAuthHeaders(),
          body: JSON.stringify(editBank),
        }
      );

      const result = await response.json();

      if (!result.success) throw new Error(result.message);

      toast({
        title: "ອັບເດດບັນຊີສຳເລັດ",
        status: "success",
        duration: 2500,
      });
      await fetchUsers();
      onCloseEditBank();
    } catch (err) {
      toast({
        title: "Error",
        description: err.message,
        status: "error",
      });
    }
  };
  const deleteBankAccount = async (bankId) => {
    if (!confirm("ຢືນຢັນການລົບບັນຊີນີ້?")) return;

    try {
      const response = await fetch(
        `${API_URL}/api/company/remove-bank/${bankId}`,
        {
          method: "PATCH",
          headers: createAuthHeaders(),
        }
      );

      const result = await response.json();

      if (!result.success) throw new Error(result.message);

      toast({
        title: "ລົບບັນຊີສຳເລັດ",
        status: "success",
        duration: 2500,
      });
      await fetchUsers();
    } catch (err) {
      toast({
        title: "Error",
        description: err.message,
        status: "error",
      });
    }
  };
  const updateCashAccount = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/company/${company._id}/update-cash/${editCash._id}`,
        {
          method: "PATCH",
          headers: createAuthHeaders(),
          body: JSON.stringify(editCash),
        }
      );

      const result = await response.json();
      if (!result.success) throw new Error(result.message);

      toast({
        title: "ອັບເດດບັນຊີເງິນສົດສຳເລັດ",
        status: "success",
        duration: 2500,
      });

      await fetchUsers();
      onCloseEditCash();
    } catch (err) {
      toast({
        title: "Error",
        description: err.message,
        status: "error",
      });
    }
  };
  const deleteCashAccount = async (cashId) => {
    if (!confirm("ຢືນຢັນການລົບບັນຊີເງິນສົດນີ້?")) return;

    try {
      const response = await fetch(
        `${API_URL}/api/company/remove-cash/${cashId}`,
        {
          method: "PATCH",
          headers: createAuthHeaders(),
        }
      );
      console.log(response);
      const result = await response.json();
      if (!result.success) throw new Error(result.message);

      toast({
        title: "ລົບບັນຊີເງິນສົດສຳເລັດ",
        status: "success",
        duration: 2500,
      });

      await fetchUsers();
    } catch (err) {
      toast({
        title: "Error",
        description: err.message,
        status: "error",
      });
    }
  };

  // Handle open edit modal
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
          name: user?.companyId?.name || "",
          address: user?.companyId?.address || "",
          phone: user?.companyId?.phone || "",
          email: user?.companyId?.email || "",
          logo: user?.companyId?.logo || "",
        },
      });
      onEditOpen();
    },
    [onEditOpen]
  );

  // Handle update user (with logo upload)
  const handleUpdateUser = useCallback(async () => {
    try {
      validateUserInput(editUser);
      setIsSubmitting(true);

      const formData = new FormData();

      // ส่งข้อมูลทั่วไป
      formData.append("username", editUser.username);
      formData.append("email", editUser.email);

      if (editUser.role) {
        formData.append("role", editUser.role);
      }

      // ส่ง password ถ้ามี
      if (editUser.password) {
        formData.append("password", editUser.password);
      }

      // companyId ต้องส่งแบบ JSON string
      if (editUser.companyId) {
        formData.append("companyId", JSON.stringify(editUser.companyId));
      }

      // ส่งรูปใหม่ ถ้ามีเลือกไฟล์
      if (editUser.companyId.logo instanceof File) {
        formData.append("logo", editUser.companyId.logo);
      }
      // ดูค่าใน FormData
      const response = await fetch(`${API_URL}/api/auth/user/${editUser._id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`, // ❗ ห้ามใส่ Content-Type
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Update failed");
      }

      await fetchUsers();
      toast({
        title: "ອັບເດດຂໍ້ມູນສຳເລັດ",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
      onEditClose();
    } catch (error) {
      handleApiError(error, toast, "ບໍ່ສາມາດອັບເດດຂໍ້ມູນໄດ້");
    } finally {
      setIsSubmitting(false);
    }
  }, [editUser, fetchUsers, toast, onEditClose]);

  // Check if user is admin
  const isAdmin = useMemo(
    () => authUser?.role === "admin" && authUser?.isSuperAdmin === true,
    [authUser?.role]
  );

  if (loading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" color="green.400" />
      </Center>
    );
  }
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const iconColor = useColorModeValue("blue.500", "blue.300");
  const textSecondary = useColorModeValue("gray.600", "gray.400");
  const CompanyAdminDashboard = (company, admin) => {
    const InfoRow = ({ icon, label, value, badge }) => (
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
    );
    console.log(users?.companyId);
    return (
      <Box minH="100vh" bg={useColorModeValue("gray.50", "gray.900")} py={8}>
        <Container maxW="container.xl">
          <VStack spacing={6} align="stretch">
            {/* Header */}
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
              {/* ===================== Company Info ===================== */}
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
                      />

                      <InfoRow
                        icon={Phone}
                        label="ເບີໂທ"
                        value={company.phone}
                      />

                      <InfoRow
                        icon={MapPin}
                        label="ທີ່ຢູ່"
                        value={company.address}
                      />

                      <InfoRow
                        icon={Calendar}
                        label="ເລີ່ມໃຊ້ລະບົບ"
                        value={company.createdAt}
                      />
                    </VStack>
                  </VStack>
                </CardBody>
              </Card>

              {/* ===================== Admin Info ===================== */}
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

                      <InfoRow icon={Mail} label="ອີເມວ" value={admin.email} />
                    </VStack>
                  </VStack>
                </CardBody>
              </Card>
              {/* ===================== Bank Accounts ===================== */}
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

                    {authUser?.companyId?.bankAccounts?.length === 0 ? (
                      <Text
                        fontFamily="'Noto Sans Lao', sans-serif"
                        fontSize="sm"
                        color="gray.500"
                      >
                        - ບໍ່ມີຂໍ້ມູນ -
                      </Text>
                    ) : (
                      authUser?.companyId?.bankAccounts?.map((acc, index) => (
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

                              {/* ปุ่ม EDIT และ DELETE */}
                              <HStack>
                                <IconButton
                                  size="sm"
                                  colorScheme="blue"
                                  icon={<Edit2 size={14} />}
                                  onClick={() => openEditBank(acc)}
                                />
                                <IconButton
                                  size="sm"
                                  colorScheme="red"
                                  icon={<Trash2 size={14} />}
                                  onClick={() => deleteBankAccount(acc._id)}
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

              {/* ===================== Cash Accounts ===================== */}
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

                    {authUser?.companyId?.cashAccounts?.length === 0 ? (
                      <Text
                        fontFamily="'Noto Sans Lao', sans-serif"
                        fontSize="sm"
                        color="gray.500"
                      >
                        - ບໍ່ມີຂໍ້ມູນ -
                      </Text>
                    ) : (
                      authUser?.companyId?.cashAccounts?.map((acc) => (
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

                              {/* ปุ่ม EDIT + DELETE */}
                              <HStack>
                                <IconButton
                                  size="sm"
                                  colorScheme="blue"
                                  icon={<Edit2 size={14} />}
                                  onClick={() => openEditCash(acc)}
                                />
                                <IconButton
                                  size="sm"
                                  colorScheme="red"
                                  icon={<Trash2 size={14} />}
                                  onClick={() => deleteCashAccount(acc._id)}
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
  };

  return (
    <Box p={6} fontFamily="'Noto Sans Lao', sans-serif">
      <Box minH="100vh" bg={useColorModeValue("gray.50", "gray.900")} py={8}>
        <VStack spacing={6} align="stretch">
          <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
            <VStack align="start" spacing={1}>
              <Heading
                size="lg"
                fontFamily="'Noto Sans Lao', sans-serif"
                color={useColorModeValue("gray.700", "gray.100")}
              >
                ຈັດການຜູ້ໃຊ້ງານ
              </Heading>{" "}
              <Text
                fontSize="sm"
                color={useColorModeValue("gray.600", "gray.400")}
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
        <HStack>
          <Card
            bg={cardBg}
            flex={1}
            minW="200px"
            border="1px"
            borderColor={borderColor}
          >
            <CardBody>
              <HStack spacing={3}>
                <Box p={3} bg="green.100" borderRadius="lg">
                  <Icon as={Shield} boxSize={6} color="green.600" />
                </Box>
                <VStack align="start" spacing={0}>
                  <Text fontSize="2xl" fontWeight="bold">
                    {users.filter((u) => u.role === "admin").length}
                  </Text>
                  <Text
                    fontSize="xs"
                    color="gray.600"
                    fontFamily="'Noto Sans Lao', sans-serif"
                  >
                    ຜູ້ດູແລລະບົບ
                  </Text>
                </VStack>
              </HStack>
            </CardBody>
          </Card>
          <Card
            bg={cardBg}
            flex={1}
            minW="200px"
            border="1px"
            borderColor={borderColor}
          >
            <CardBody>
              <HStack spacing={3}>
                <Box p={3} bg="green.100" borderRadius="lg">
                  <Icon as={Shield} boxSize={6} color="green.600" />
                </Box>
                <VStack align="start" spacing={0}>
                  <Text fontSize="2xl" fontWeight="bold">
                    {users.filter((u) => u.role === "master").length}
                  </Text>
                  <Text
                    fontSize="xs"
                    color="gray.600"
                    fontFamily="'Noto Sans Lao', sans-serif"
                  >
                    master(ລະດັບ2 )
                  </Text>
                </VStack>
              </HStack>
            </CardBody>
          </Card>

          <Card
            bg={cardBg}
            flex={1}
            minW="200px"
            border="1px"
            borderColor={borderColor}
          >
            <CardBody>
              <HStack spacing={3}>
                <Box p={3} bg="purple.100" borderRadius="lg">
                  <Icon as={Building2} boxSize={6} color="purple.600" />
                </Box>
                <VStack align="start" spacing={0}>
                  <Text fontSize="2xl" fontWeight="bold">
                    1
                  </Text>
                  <Text
                    fontSize="xs"
                    color="gray.600"
                    fontFamily="'Noto Sans Lao', sans-serif"
                  >
                    ບໍລິສັດ
                  </Text>
                </VStack>
              </HStack>
            </CardBody>
          </Card>
        </HStack>
        <Card
          bg={cardBg}
          shadow="lg"
          borderRadius="xl"
          border="1px"
          borderColor={borderColor}
          overflow="hidden"
        >
          <Box overflowX="auto">
            <Table variant="simple">
              <Thead bg={headerBg}>
                <Tr>
                  <Th
                    fontFamily="'Noto Sans Lao', sans-serif"
                    textTransform="none"
                    fontSize="sm"
                    color={useColorModeValue("gray.700", "gray.200")}
                  >
                    ຜູ້ໃຊ້ງານ
                  </Th>
                  <Th
                    fontFamily="'Noto Sans Lao', sans-serif"
                    textTransform="none"
                    fontSize="sm"
                    color={useColorModeValue("gray.700", "gray.200")}
                  >
                    ອີເມວ
                  </Th>
                  <Th
                    fontFamily="'Noto Sans Lao', sans-serif"
                    textTransform="none"
                    fontSize="sm"
                    color={useColorModeValue("gray.700", "gray.200")}
                  >
                    ບໍລິສັດ
                  </Th>
                  <Th
                    fontFamily="'Noto Sans Lao', sans-serif"
                    textTransform="none"
                    fontSize="sm"
                    color={useColorModeValue("gray.700", "gray.200")}
                  >
                    ບົດບາດ
                  </Th>
                  {isAdmin && (
                    <Th
                      fontFamily="'Noto Sans Lao', sans-serif"
                      textTransform="none"
                      fontSize="sm"
                      textAlign="center"
                      color={useColorModeValue("gray.700", "gray.200")}
                    >
                      ການດຳເນີນການ
                    </Th>
                  )}
                </Tr>
              </Thead>
              <Tbody>
                {users.map((user) => {
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
                            bg={useColorModeValue("gray.50", "gray.700")}
                            borderRadius="md"
                            maxW="120px"
                            fontFamily="'Noto Sans Lao', sans-serif"
                          >
                            <option value="staff">Staff</option>
                            <option value="admin">Admin</option>
                            <option value="master">Master</option>
                          </Select>
                        ) : (
                          getRoleBadge(user.role)
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
                })}
              </Tbody>
            </Table>
          </Box>
        </Card>
        {CompanyAdminDashboard(authUser?.companyId, authUser)}
      </Box>
      {/* Add User Modal */}
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
                  onChange={(e) =>
                    setNewUser({ ...newUser, username: e.target.value })
                  }
                  placeholder="Username"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                  ອີເມວ
                </FormLabel>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  placeholder="Email"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                  ລະຫັດຜ່ານ
                </FormLabel>
                <Input
                  type="password"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                  placeholder="Password"
                  autoComplete="new-password"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                  ບົດບາດ
                </FormLabel>
                <Select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value })
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

      {/* Edit User Modal */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader fontFamily="Noto Sans Lao, sans-serif">
            ແກ້ໄຂຂໍ້ມູນຜູ້ໃຊ້
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                  ຊື່ຜູ້ໃຊ້
                </FormLabel>
                <Input
                  value={editUser?.username || ""}
                  onChange={(e) =>
                    setEditUser({ ...editUser, username: e.target.value })
                  }
                  placeholder="Username"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                  ອີເມວ
                </FormLabel>
                <Input
                  type="email"
                  value={editUser?.email || ""}
                  onChange={(e) =>
                    setEditUser({ ...editUser, email: e.target.value })
                  }
                  placeholder="Email"
                />
              </FormControl>
              <FormControl>
                <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                  ລະຫັດຜ່ານໃໝ່ (ປ່ອຍວ່າງຖ້າບໍ່ຕ້ອງການປ່ຽນ)
                </FormLabel>
                <Input
                  type="password"
                  value={editUser?.password || ""}
                  onChange={(e) =>
                    setEditUser({ ...editUser, password: e.target.value })
                  }
                  placeholder="ລະຫັດຜ່ານໃໝ່"
                  autoComplete="new-password"
                />
              </FormControl>
              <FormControl>
                <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                  ຊື່ບໍລິສັດ
                </FormLabel>
                <Input
                  value={editUser?.companyId?.name || ""}
                  onChange={(e) =>
                    setEditUser({
                      ...editUser,
                      companyId: {
                        ...editUser.companyId,
                        name: e.target.value,
                      },
                    })
                  }
                  placeholder="Company Name"
                />
              </FormControl>
              <FormControl>
                <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                  ທີ່ຢູ່
                </FormLabel>
                <Input
                  value={editUser?.companyId?.address || ""}
                  onChange={(e) =>
                    setEditUser({
                      ...editUser,
                      companyId: {
                        ...editUser.companyId,
                        address: e.target.value,
                      },
                    })
                  }
                  placeholder="Address"
                />
              </FormControl>
              <FormControl>
                <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                  ເບີໂທລະສັບ
                </FormLabel>
                <Input
                  value={editUser?.companyId?.phone || ""}
                  onChange={(e) =>
                    setEditUser({
                      ...editUser,
                      companyId: {
                        ...editUser.companyId,
                        phone: e.target.value,
                      },
                    })
                  }
                  placeholder="Phone"
                />
              </FormControl>
              <FormControl>
                <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                  ອີເມວບໍລິສັດ
                </FormLabel>
                <Input
                  type="email"
                  value={editUser?.companyId?.email || ""}
                  onChange={(e) =>
                    setEditUser({
                      ...editUser,
                      companyId: {
                        ...editUser.companyId,
                        email: e.target.value,
                      },
                    })
                  }
                  placeholder="Company Email"
                />
              </FormControl>
              <FormControl>
                <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                  ໂລໂກ້ URL
                </FormLabel>
                <Input
                  type="file"
                  onChange={(e) =>
                    setEditUser({
                      ...editUser,
                      companyId: {
                        ...editUser.companyId,
                        logo: e.target.files[0], // ✔ ส่งเป็นไฟล์จริง
                      },
                    })
                  }
                  placeholder="Logo URL"
                />
                <Image
                  src={editUser?.companyId?.logo}
                  alt="Company Logo"
                  objectFit="contain"
                  w="90%"
                  h="90%"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                  ບົດບາດ
                </FormLabel>
                <Select
                  value={editUser?.role || "user"}
                  onChange={(e) =>
                    setEditUser({ ...editUser, role: e.target.value })
                  }
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                  <option value="master">Master</option>
                </Select>
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

      {/* Add Bank Account */}
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
                  setNewBank({ ...newBank, bankName: e.target.value })
                }
              />
              <Input
                placeholder="ເລກບັນຊີ"
                onChange={(e) =>
                  setNewBank({ ...newBank, accountNumber: e.target.value })
                }
              />
              <Select
                value={newBank.currency}
                onChange={(e) =>
                  setNewBank({ ...newBank, currency: e.target.value })
                }
              >
                <option value="LAK">LAK</option>
                <option value="THB">THB</option>
                <option value="USD">USD</option>
                <option value="CNY">CNY</option>
              </Select>

              <Input
                type="number"
                placeholder="ຈຳນວນເງິນ"
                onChange={(e) =>
                  setNewBank({ ...newBank, balance: Number(e.target.value) })
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

      {/* Add Cash Account */}
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
                  setNewCash({ ...newCash, name: e.target.value })
                }
              />
              <Select
                value={newCash.currency}
                onChange={(e) =>
                  setNewCash({ ...newCash, currency: e.target.value })
                }
              >
                <option value="LAK">LAK</option>
                <option value="THB">THB</option>
                <option value="USD">USD</option>
                <option value="CNY">CNY</option>
              </Select>

              <Input
                type="number"
                placeholder="ຈຳນວນເງິນ"
                onChange={(e) =>
                  setNewCash({ ...newCash, balance: Number(e.target.value) })
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
                  setEditBank({ ...editBank, bankName: e.target.value })
                }
              />

              <Input
                value={editBank?.accountNumber || ""}
                placeholder="ເລກບັນຊີ"
                onChange={(e) =>
                  setEditBank({ ...editBank, accountNumber: e.target.value })
                }
              />

              <Select
                value={editBank?.currency || "LAK"}
                onChange={(e) =>
                  setEditBank({ ...editBank, currency: e.target.value })
                }
              >
                <option value="LAK">LAK</option>
                <option value="THB">THB</option>
                <option value="USD">USD</option>
                <option value="CNY">CNY</option>
              </Select>

              <Input
                type="number"
                value={editBank?.balance || 0}
                placeholder="ຈຳນວນເງິນ"
                onChange={(e) =>
                  setEditBank({ ...editBank, balance: Number(e.target.value) })
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

      <Modal isOpen={isEditCashOpen} onClose={onCloseEditCash}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>ແກ້ໄຂບັນຊີເງິນສົດ</ModalHeader>

          <ModalBody>
            <VStack spacing={3}>
              <Input
                value={editCash?.name || ""}
                placeholder="ຊື່ກອງເງິນ (ເຊັ່ນ ເງິນສົດຫຼັກ)"
                onChange={(e) =>
                  setEditCash({ ...editCash, name: e.target.value })
                }
              />

              <Select
                value={editCash?.currency || "LAK"}
                onChange={(e) =>
                  setEditCash({ ...editCash, currency: e.target.value })
                }
              >
                <option value="LAK">LAK</option>
                <option value="THB">THB</option>
                <option value="USD">USD</option>
                <option value="CNY">CNY</option>
              </Select>

              <Input
                type="number"
                value={editCash?.balance || 0}
                placeholder="ຈຳນວນເງິນ"
                onChange={(e) =>
                  setEditCash({ ...editCash, balance: Number(e.target.value) })
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
