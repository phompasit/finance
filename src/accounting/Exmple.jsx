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
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  useDisclosure,
  VStack,
  IconButton,
  Text,
  Alert,
  AlertIcon,
  AlertDescription,
} from "@chakra-ui/react";
import { EditIcon, DeleteIcon } from "@chakra-ui/icons";
import { useAuth } from "../context/AuthContext";

// Constants
const API_URL = import.meta.env.VITE_API_URL;
const TOAST_DURATION = 3000;

// Initial state for new user
const INITIAL_USER_STATE = {
  username: "",
  email: "",
  password: "",
  role: "user",
  companyInfo: {
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
  console.error("API Error:", error);
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

  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isEditOpen,
    onOpen: onEditOpen,
    onClose: onEditClose,
  } = useDisclosure();

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

        if (!response.ok) {
          throw new Error("ບໍ່ສາມາດລົບຜູ້ໃຊ້ງານໄດ້");
        }

        await fetchUsers();
        toast({
          title: "ລົບຜູ້ໃຊ້ງານເຮັດສຳເລັດແລ້ວ",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      } catch (error) {
        handleApiError(error, toast, "ບໍ່ສາມາດລົບຜູ້ໃຊ້ງານໄດ້");
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

  // Handle update user
  const handleUpdateUser = useCallback(async () => {
    try {
      validateUserInput(editUser);
      setIsSubmitting(true);

      const updateData = {
        username: editUser.username,
        email: editUser.email,
        role: editUser.role,
        companyInfo: editUser.companyInfo,
        ...(editUser.password && { password: editUser.password }),
      };

      const response = await fetch(`${API_URL}/api/auth/user/${editUser._id}`, {
        method: "PATCH",
        headers: createAuthHeaders(),
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error("ບໍ່ສາມາດອັບເດດຂໍ້ມູນໄດ້");
      }

      await fetchUsers();
      toast({
        title: "ອັບເດດຂໍ້ມູນເຮັດສຳເລັດແລ້ວ",
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

  // Group users by company (memoized for performance)
  const groupedUsers = useMemo(() => {
    if (!Array.isArray(users)) return {};

    return users.reduce((groups, user) => {
      const companyName = user?.companyInfo?.name || "ບໍ່ມີຊື່ບໍລິສັດ";
      if (!groups[companyName]) {
        groups[companyName] = [];
      }
      groups[companyName].push(user);
      return groups;
    }, {});
  }, [users]);

  // Check if user is admin
  const isAdmin = useMemo(() => authUser?.role === "admin", [authUser?.role]);

  if (loading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" color="green.400" />
      </Center>
    );
  }

  return (
    <Box p={6} fontFamily="'Noto Sans Lao', sans-serif">
      <Heading
        fontFamily="Noto Sans Lao, sans-serif"
        mb={6}
        size="lg"
        color="gray.700"
      >
        ຈັດການຜູ້ໃຊ້ງານ
      </Heading>

      {/* Warning Alert */}
      <Alert status="error" mb={4} borderRadius="md">
        <AlertIcon />
        <Box>
          <AlertDescription fontFamily="Noto Sans Lao, sans-serif">
            <Text fontFamily="'Noto Sans Lao', sans-serif">
              ⚠️ ຫ້າມລົບບັນຊີຜູ້ໃຊ້ເດັດຂາດ!
            </Text>
            <br />
            ການລົບຈະສົ່ງຜົນກະທົບຕໍ່ລາຍການທັງໝົດທີ່ຜູ້ໃຊ້ນີ້ເຄີຍບັນທຶກໄວ້
            ແລະບໍ່ສາມາດກູ້ຄືນໄດ້
          </AlertDescription>
        </Box>
      </Alert>

      {/* Info Alert */}
      <Alert status="info" mb={4} borderRadius="md">
        <AlertIcon />
        <Box fontSize="sm">
          <Text fontFamily="Noto Sans Lao, sans-serif" mb={2}>
            • <strong>account</strong> ທີ່ມີບົດບາດເປັນ <strong>admin</strong> =
            1 ບໍລິສັດ
          </Text>
          <Text fontFamily="Noto Sans Lao, sans-serif" mb={2}>
            • <strong>account</strong> ໃດທີ່ສ້າງບັນຊີ <strong>staff</strong> ຫຼື{" "}
            <strong>master</strong> — account
            ນັ້ນສາມາດເບີງຂໍ້ມູນຂອງບໍລິສັດນັ້ນໄດ້ເທົ່ານັ້ນ
          </Text>
          <Text fontFamily="Noto Sans Lao, sans-serif" mb={2}>
            • ບົດບາດ <strong>admin</strong> ສາມາດມີໄດ້ພຽງແຕ່{" "}
            <strong>account ດຽວ</strong>
          </Text>
          <Text fontFamily="Noto Sans Lao, sans-serif" color="red.600">
            ໝາຍເຫດ: ຖ້າຢາກສ້າງ account admin ໃຫ້ມາສ້າງໃນບັນຊີບໍລິສັດອັດຕະປືບໍລາວ
          </Text>
        </Box>
      </Alert>

      <Button colorScheme="green" mb={4} onClick={onOpen}>
        ເພີ່ມສະມາຊິກໃໝ່
      </Button>

      <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
        <Table variant="simple" size="sm">
          <Thead bg="gray.100">
            <Tr>
              <Th fontFamily="Noto Sans Lao, sans-serif">ຊື່ຜູ້ໃຊ້ງານ</Th>
              <Th fontFamily="Noto Sans Lao, sans-serif">ອິເມວ</Th>
              <Th fontFamily="Noto Sans Lao, sans-serif">ຊື່ບໍລິສັດ</Th>
              <Th fontFamily="Noto Sans Lao, sans-serif">ບົດບາດ</Th>
              {isAdmin && (
                <Th fontFamily="Noto Sans Lao, sans-serif" textAlign="center">
                  ການດຳເນີນການ
                </Th>
              )}
            </Tr>
          </Thead>
          <Tbody>
            {Object.entries(groupedUsers).map(([companyName, companyUsers]) => (
              <React.Fragment key={companyName}>
                <Tr bg="gray.100">
                  <Td
                    colSpan={isAdmin ? 5 : 4}
                    fontWeight="bold"
                    fontFamily="Noto Sans Lao, sans-serif"
                  >
                    {companyName}
                  </Td>
                </Tr>

                {companyUsers.map((user) => (
                  <Tr key={user._id}>
                    <Td fontFamily="Noto Sans Lao, sans-serif">
                      {user.username}
                    </Td>
                    <Td fontFamily="Noto Sans Lao, sans-serif">{user.email}</Td>
                    <Td fontFamily="Noto Sans Lao, sans-serif">
                      {user.companyInfo?.name || "-"}
                    </Td>
                    <Td fontFamily="Noto Sans Lao, sans-serif">
                      {isAdmin ? (
                        <Select
                          value={user.role}
                          onChange={(e) =>
                            handleRoleChange(user._id, e.target.value)
                          }
                          size="sm"
                          bg="gray.50"
                        >
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                          <option value="master">Master</option>
                        </Select>
                      ) : (
                        user.role
                      )}
                    </Td>
                    {isAdmin && (
                      <Td textAlign="center">
                        <IconButton
                          icon={<EditIcon />}
                          colorScheme="blue"
                          size="sm"
                          mr={2}
                          onClick={() => handleOpenEdit(user)}
                          aria-label="ແກ້ໄຂ"
                        />
                        <IconButton
                          icon={<DeleteIcon />}
                          colorScheme="red"
                          size="sm"
                          onClick={() => handleDeleteUser(user._id)}
                          aria-label="ລົບ"
                        />
                      </Td>
                    )}
                  </Tr>
                ))}
              </React.Fragment>
            ))}
          </Tbody>
        </Table>
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
              <FormControl>
                <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                  ຊື່ບໍລິສັດ
                </FormLabel>
                <Input
                  value={newUser.companyId?.name || ""}
                  onChange={(e) =>
                    setNewUser({
                      ...newUser,
                      companyId: {
                        ...newUser.companyId,
                        name: e.target.value,
                      },
                    })
                  }
                  placeholder="Company Name"
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
                  value={editUser?.companyId?.logo || ""}
                  onChange={(e) =>
                    setEditUser({
                      ...editUser,
                      companyId: {
                        ...editUser.companyId,
                        logo: e.target.value,
                      },
                    })
                  }
                  placeholder="Logo URL"
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
    </Box>
  );
}
