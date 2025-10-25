"use client";

import React, { useState, useEffect } from "react";
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
} from "@chakra-ui/react";
import { EditIcon } from "@chakra-ui/icons";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
  });
  const [editUser, setEditUser] = useState(null);
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isEditOpen,
    onOpen: onEditOpen,
    onClose: onEditClose,
  } = useDisclosure();

  useEffect(() => {
    fetchUsers();
  }, []);
  console.log("users", users);
  const fetchUsers = async () => {
    try {
      const response = await fetch("https://a93e81e5545a.ngrok-free.app /api/auth/users", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถดึงข้อมูลผู้ใช้งานได้",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await fetch(`https://a93e81e5545a.ngrok-free.app /api/auth/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      fetchUsers();
      toast({
        title: "อัปเดตบทบาทเรียบร้อยแล้ว",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error updating user role:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตบทบาทได้",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบผู้ใช้งานนี้?")) return;
    try {
      await fetch(`https://a93e81e5545a.ngrok-free.app /api/auth/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      fetchUsers();
      toast({
        title: "ລົບຜູ້ໃຊ້ງານເຮັດສຳເລັດແລ້ວ",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "ເກີດຂໍ້ຜິດພາດ",
        description: "ບໍ່ສາມາດລົບຜູ້ໃຊ້ງານໄດ້",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleAddUser = async () => {
    try {
      await fetch("https://a93e81e5545a.ngrok-free.app /api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(newUser),
      })
        .unrwp()
        .then((res) => {
          toast({
            title: "ເພີ່ມຜູ້ໃຊ້ງານເຮັດສຳເລັດແລ້ວ",
            status: "success",
            duration: 2000,
            isClosable: true,
          });
          fetchUsers();
          setNewUser({ username: "", email: "", password: "", role: "user" });
        })
        .catch((error) => {
          toast({
            title: "ເກີດຂໍ້ຜິດພາດ",
            description: error.message || "ບໍ່ສາມາດເພີ່ມຜູ້ໃຊ້ງານໄດ້",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
        });
      onClose();
    } catch (error) {
      console.error("Error adding user:", error);
      toast({
        title: "ເກີດຂໍ້ຜິດພາດ",
        description: "ບໍ່ສາມາດເພີ່ມຜູ້ໃຊ້ງານໄດ້",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };
  const handleOpenEdit = (user) => {
    setEditUser({
      _id: user._id,
      username: user.username,
      email: user.email,
      password: "",
      role: user.role,
      companyInfo: {
        name: user?.companyInfo.name,
        address: user?.companyInfo.address,
        phone: user?.companyInfo.phone,
        email: user?.companyInfo.email,
      },
    });
    onEditOpen();
  };

  const handleUpdateUser = async () => {
    try {
      const updateData = {
        username: editUser.username,
        email: editUser.email,
        role: editUser.role,
        companyInfo: editUser.companyInfo,
      };

      // เพิ่ม password เฉพาะเมื่อมีการกรอก
      await fetch(`https://a93e81e5545a.ngrok-free.app /api/auth/user/${editUser._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(updateData),
      });

      fetchUsers();
      toast({
        title: "ອັບເດດຂໍ້ມູນເຮັດສຳເລັດແລ້ວ",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
      onEditClose();
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "ເກີດຂໍ້ຜິດພາດ",
        description: "ບໍ່ສາມາດອັບເດດຂໍ້ມູນໄດ້",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

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
      <p
        style={{
          color: "#b71c1c", // สีแดงเข้ม
          backgroundColor: "#ffebee", // สีพื้นอ่อน
          padding: "12px 16px",
          borderRadius: "8px",
          fontWeight: "bold",
          border: "1px solid #f44336",
          fontFamily:"Noto Sans Lao, sans-serif"
        }}
      >
        ⚠️  ຫ້າມລົບບັນຊີຜູ້ໃຊ້ເດັດຂາດ! 
        ການລົບຈະສົ່ງຜົນກະທົບຕໍ່ລາຍການທັງໝົດທີ່ຜູ້ໃຊ້ນີ້ເຄີຍບັນທຶກໄວ້ ແລະ ບໍ່ສາມາດກູ້ຄືນໄດ້
      </p>
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
              <Th fontFamily="Noto Sans Lao, sans-serif" textAlign="center">
                ການດຳເນີນການ
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {Object.entries(
              users.reduce((groups, user) => {
                const companyName = user.companyInfo?.name || "ບໍ່ມີຊື່ບໍລິສັດ";
                if (!groups[companyName]) groups[companyName] = [];
                groups[companyName].push(user);
                return groups;
              }, {})
            ).map(([companyName, companyUsers]) => (
              <React.Fragment key={companyName}>
                {/* หัวบริษัท */}
                <Tr bg="gray.100">
                  <Td
                    colSpan={5}
                    fontWeight="bold"
                    fontFamily="Noto Sans Lao, sans-serif"
                  >
                    {companyName}
                  </Td>
                </Tr>

                {/* รายชื่อผู้ใช้ในบริษัท */}
                {companyUsers.map((user) => (
                  <Tr key={user._id}>
                    <Td fontFamily="Noto Sans Lao, sans-serif">
                      {user.username}
                    </Td>
                    <Td fontFamily="Noto Sans Lao, sans-serif">{user.email}</Td>
                    <Td fontFamily="Noto Sans Lao, sans-serif">
                      {user.companyInfo?.name}
                    </Td>
                    <Td fontFamily="Noto Sans Lao, sans-serif">
                      <Select
                        value={user.role}
                        onChange={(e) =>
                          handleRoleChange(user._id, e.target.value)
                        }
                        size="sm"
                        bg="gray.50"
                      >
                        <option value="user">User</option>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </Select>
                    </Td>
                    <Td
                      fontFamily="Noto Sans Lao, sans-serif"
                      textAlign="center"
                    >
                      <IconButton
                        icon={<EditIcon />}
                        colorScheme="blue"
                        size="sm"
                        mr={2}
                        onClick={() => handleOpenEdit(user)}
                        aria-label="ແກ້ໄຂ"
                      />
                      <Button
                        fontFamily="Noto Sans Lao, sans-serif"
                        colorScheme="red"
                        size="sm"
                        onClick={() => handleDeleteUser(user._id)}
                      >
                        ລົບ
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </React.Fragment>
            ))}
          </Tbody>
        </Table>
      </Box>

      {/* Modal เพิ่มสมาชิก */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader fontFamily="Noto Sans Lao, sans-serif">
            ເພີ່ມສະມາຊິກໃໝ່
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
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
              <FormControl>
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
              <FormControl>
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
                />
              </FormControl>
              <FormControl>
                <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                  ບົດບາດ
                </FormLabel>
                <Select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value })
                  }
                >
                  <option value="user">User</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
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
            >
              ບັນທຶກ
            </Button>
            <Button
              fontFamily="Noto Sans Lao, sans-serif"
              variant="ghost"
              onClick={onClose}
            >
              ຍົກເລີກ
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal แก้ไขข้อมูลผู้ใช้ */}
      <Modal isOpen={isEditOpen} onClose={onEditClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader fontFamily="Noto Sans Lao, sans-serif">
            ແກ້ໄຂຂໍ້ມູນຜູ້ໃຊ້
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
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
              <FormControl>
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
                />
              </FormControl>
              <FormControl>
                <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                  ຊື່ບໍລິສັດ
                </FormLabel>
                <Input
                  value={editUser?.companyInfo?.name || ""}
                  onChange={(e) =>
                    setEditUser({
                      ...editUser,
                      companyInfo: {
                        ...editUser.companyInfo,
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
                  value={editUser?.companyInfo?.address || ""}
                  onChange={(e) =>
                    setEditUser({
                      ...editUser,
                      companyInfo: {
                        ...editUser.companyInfo,
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
                  value={editUser?.companyInfo?.phone || ""}
                  onChange={(e) =>
                    setEditUser({
                      ...editUser,
                      companyInfo: {
                        ...editUser.companyInfo,
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
                  value={editUser?.companyInfo?.email || ""}
                  onChange={(e) =>
                    setEditUser({
                      ...editUser,
                      companyInfo: {
                        ...editUser.companyInfo,
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
                  value={editUser?.companyInfo?.logo || ""}
                  onChange={(e) =>
                    setEditUser({
                      ...editUser,
                      companyInfo: {
                        ...editUser.companyInfo,
                        logo: e.target.value,
                      },
                    })
                  }
                  placeholder="Logo URL"
                />
              </FormControl>
              <FormControl>
                <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                  ບົດບາດ
                </FormLabel>
                <Select
                  value={editUser?.role || "user"}
                  onChange={(e) =>
                    setEditUser({ ...editUser, role: e.target.value })
                  }
                >
                  <option value="user">User</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
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
            >
              ອັບເດດ
            </Button>
            <Button
              fontFamily="Noto Sans Lao, sans-serif"
              variant="ghost"
              onClick={onEditClose}
            >
              ຍົກເລີກ
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
