"use client";
import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Input,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Textarea,
  VStack,
  HStack,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useDisclosure,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Heading,
  Badge,
  RadioGroup,
  Radio,
} from "@chakra-ui/react";
import { AddIcon, EditIcon } from "@chakra-ui/icons";
import { DeleteIcon } from "lucide-react";
import Swal from "sweetalert2";
import api from "../api/api";

/* ================================
   Helpers (Security)
================================ */
const sanitize = (v = "") => v.trim();

const handleApiError = (error, fallback = "Something went wrong") => {
  const message =
    error?.response?.data?.message ||
    fallback;

  Swal.fire({
    icon: "error",
    title: "Error",
    text: message,
  });
};

export default function Partner() {
  const toast = useToast();

  /* ================================
     STATE
  ================================ */
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [categories, setCategories] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [formType, setFormType] = useState("supplier");
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    taxId: "",
  });

  const [formEmployee, setFormEmployee] = useState({
    emp_code: "",
    full_name: "",
    department: "",
    position: "",
    phone: "",
  });

  const [formCategory, setFormCategory] = useState({
    name: "",
    type: "income",
    description: "",
  });

  const partnerModal = useDisclosure();
  const employeeModal = useDisclosure();
  const categoryModal = useDisclosure();

  /* ================================
     Fetch
  ================================ */
  const fetchPartners = async () => {
    try {
      const { data } = await api.get("/api/debt/partners");
      setSuppliers(data.data.filter((i) => i.type === "supplier"));
      setCustomers(data.data.filter((i) => i.type === "customer"));
    } catch (error) {
      handleApiError(error, "Failed to fetch partners");
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data } = await api.get("/api/debt/employees");
      setEmployees(data.data);
    } catch (error) {
      handleApiError(error, "Failed to fetch employees");
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await api.get("/api/category/get-category");
      setCategories(data);
    } catch (error) {
      handleApiError(error, "Failed to fetch categories");
    }
  };

  useEffect(() => {
    fetchPartners();
    fetchEmployees();
    fetchCategories();
  }, []);

  /* ================================
     Open Modals
  ================================ */
  const handleOpenPartner = (type, item = null) => {
    setFormType(type);
    setEditingId(item?._id || null);
    setFormData(item || { name: "", phone: "", address: "", taxId: "" });
    partnerModal.onOpen();
  };

  const handleOpenEmployee = (item = null) => {
    setEditingId(item?._id || null);
    setFormEmployee(
      item || {
        emp_code: "",
        full_name: "",
        department: "",
        position: "",
        phone: "",
      }
    );
    employeeModal.onOpen();
  };

  const handleOpenCategory = (item = null) => {
    setEditingId(item?._id || null);
    setFormCategory(item || { name: "", type: "income", description: "" });
    categoryModal.onOpen();
  };

  /* ================================
     Submit (Secure)
  ================================ */
  const handleSubmitPartner = async () => {
    if (submitting) return;
    if (!sanitize(formData.name)) {
      Swal.fire("Invalid", "ກະລຸນາລະບຸຂໍ້ມູນ", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const url = editingId
        ? `/api/debt/partners/${editingId}`
        : `/api/debt/partners`;

      await api[editingId ? "put" : "post"](url, {
        name: sanitize(formData.name),
        phone: sanitize(formData.phone),
        address: sanitize(formData.address),
        taxId: sanitize(formData.taxId),
        type: formType,
      });

      Swal.fire({
        icon: "success",
        title: "Saved successfully",
        timer: 1200,
        showConfirmButton: false,
      });

      partnerModal.onClose();
      fetchPartners();
    } catch (error) {
      handleApiError(error, "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitEmployee = async () => {
    if (submitting) return;
    if (!sanitize(formEmployee.full_name)) {
      Swal.fire("Invalid", "ກະລຸນາລະບຸຂໍ້ມູນ", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const url = editingId
        ? `/api/debt/employees/${editingId}`
        : `/api/debt/employees`;

      await api[editingId ? "put" : "post"](url, {
        ...formEmployee,
        name: sanitize(formEmployee.full_name),
        phone: sanitize(formEmployee.phone),
      });

      Swal.fire({
        icon: "success",
        title: "Employee saved",
        timer: 1200,
        showConfirmButton: false,
      });

      employeeModal.onClose();
      fetchEmployees();
    } catch (error) {
      handleApiError(error, "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitCategory = async () => {
    if (submitting) return;
    if (!sanitize(formCategory.name)) {
      Swal.fire("Invalid", "ກະລຸນາລະບຸຂໍ້ມູນ", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const url = editingId
        ? `/api/category/update-category/${editingId}`
        : `/api/category/create-category`;

      await api[editingId ? "patch" : "post"](url, {
        ...formCategory,
        name: sanitize(formCategory.name),
        description: sanitize(formCategory.description),
      });

      Swal.fire({
        icon: "success",
        title: "Category saved",
        timer: 1200,
        showConfirmButton: false,
      });

      categoryModal.onClose();
      fetchCategories();
    } catch (error) {
      handleApiError(error, "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  /* ================================
     Delete (Swal)
  ================================ */
  const confirmDelete = async (callback) => {
    const res = await Swal.fire({
      title: "Confirm delete?",
      text: "This action cannot be undone",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Delete",
    });

    if (res.isConfirmed) callback();
  };

  const handleDeletePartner = (id) =>
    confirmDelete(async () => {
      try {
        await api.delete(`/api/debt/partners/${id}`);
        Swal.fire("Deleted", "", "success");
        fetchPartners();
      } catch (e) {
        handleApiError(e, "Delete failed");
      }
    });

  const handleDeleteEmployee = (id) =>
    confirmDelete(async () => {
      try {
        await api.delete(`/api/debt/employees/${id}`);
        Swal.fire("Deleted", "", "success");
        fetchEmployees();
      } catch (e) {
        handleApiError(e, "Delete failed");
      }
    });

  const handleDeleteCategory = (id) =>
    confirmDelete(async () => {
      try {
        await api.delete(`/api/category/delete-category/${id}`);
        Swal.fire("Deleted", "", "success");
        fetchCategories();
      } catch (e) {
        handleApiError(e, "Delete failed");
      }
    });

  /* ================================
     UI (UNCHANGED)
  ================================ */

  // ==================================================================
  // RENDER UI
  // ==================================================================
  return (
    <Box p={6} bg="gray.50" minH="100vh">
      <Heading
        fontFamily="Noto Sans Lao, sans-serif"
        size="lg"
        color="teal.700"
        mb={6}
        textAlign="center"
      >
        ຈັດການຜູ້ສະໜອງ / ລູກໜີ້ / ພະນັກງານ / ໝວດໝູ່
      </Heading>

      <Box
        bg="white"
        p={6}
        rounded="xl"
        shadow="md"
        border="1px solid"
        borderColor="gray.100"
      >
        <Tabs variant="soft-rounded" colorScheme="teal">
          <TabList>
            <Tab fontFamily="Noto Sans Lao, sans-serif">
              ຜູ້ສະໜອງ <Badge ml={2}>{suppliers.length}</Badge>
            </Tab>
            <Tab fontFamily="Noto Sans Lao, sans-serif">
              ລູກໜີ້ <Badge ml={2}>{customers.length}</Badge>
            </Tab>
            <Tab fontFamily="Noto Sans Lao, sans-serif">
              ພະນັກງານ <Badge ml={2}>{employees.length}</Badge>
            </Tab>
            <Tab fontFamily="Noto Sans Lao, sans-serif">
              ໝວດໝູ່ <Badge ml={2}>{categories?.length}</Badge>
            </Tab>
          </TabList>

          <TabPanels mt={4}>
            {/* SUPPLIER */}
            <TabPanel>
              <Button
                fontFamily="Noto Sans Lao, sans-serif"
                leftIcon={<AddIcon />}
                colorScheme="teal"
                mb={4}
                size="sm"
                rounded="md"
                shadow="sm"
                onClick={() => handleOpenPartner("supplier")}
              >
                ເພີ່ມຜູ້ສະໜອງ
              </Button>

              <Table size="sm" variant="simple">
                <Thead bg="gray.100">
                  <Tr>
                    <Th fontFamily="Noto Sans Lao, sans-serif">ຊື່</Th>
                    <Th fontFamily="Noto Sans Lao, sans-serif">ເບີໂທ</Th>
                    <Th fontFamily="Noto Sans Lao, sans-serif">ທີ່ຢູ່</Th>
                    <Th fontFamily="Noto Sans Lao, sans-serif">ຈັດການ</Th>
                  </Tr>
                </Thead>

                <Tbody>
                  {suppliers.map((i) => (
                    <Tr key={i._id} _hover={{ bg: "gray.50" }}>
                      <Td>{i.name}</Td>
                      <Td>{i.phone}</Td>
                      <Td>{i.address}</Td>
                      <Td>
                        <HStack>
                          <Button
                            size="xs"
                            leftIcon={<EditIcon />}
                            colorScheme="blue"
                            rounded="md"
                            fontFamily="Noto Sans Lao, sans-serif"
                            onClick={() => handleOpenPartner("supplier", i)}
                          >
                            ແກ້ໄຂ
                          </Button>

                          <Button
                            size="xs"
                            colorScheme="red"
                            fontFamily="Noto Sans Lao, sans-serif"
                            leftIcon={<DeleteIcon />}
                            rounded="md"
                            onClick={() => handleDeletePartner(i._id)}
                          >
                            ລົບ
                          </Button>
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TabPanel>

            {/* CUSTOMER */}
            <TabPanel>
              <Button
                fontFamily="Noto Sans Lao, sans-serif"
                leftIcon={<AddIcon />}
                colorScheme="teal"
                mb={4}
                size="sm"
                rounded="md"
                shadow="sm"
                onClick={() => handleOpenPartner("customer")}
              >
                ເພີ່ມລູກໜີ້
              </Button>

              <Table size="sm" variant="simple">
                <Thead bg="gray.100">
                  <Tr>
                    <Th>ຊື່</Th>
                    <Th>ເບີໂທ</Th>
                    <Th>ທີ່ຢູ່</Th>
                    <Th>ຈັດການ</Th>
                  </Tr>
                </Thead>

                <Tbody>
                  {customers.map((i) => (
                    <Tr key={i._id} _hover={{ bg: "gray.50" }}>
                      <Td>{i.name}</Td>
                      <Td>{i.phone}</Td>
                      <Td>{i.address}</Td>
                      <Td>
                        <HStack>
                          <Button
                            size="xs"
                            colorScheme="blue"
                            leftIcon={<EditIcon />}
                            rounded="md"
                            fontFamily="Noto Sans Lao, sans-serif"
                            onClick={() => handleOpenPartner("customer", i)}
                          >
                            ແກ້ໄຂ
                          </Button>

                          <Button
                            size="xs"
                            colorScheme="red"
                            fontFamily="Noto Sans Lao, sans-serif"
                            leftIcon={<DeleteIcon />}
                            rounded="md"
                            onClick={() => handleDeletePartner(i._id)}
                          >
                            ລົບ
                          </Button>
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TabPanel>

            {/* EMPLOYEE */}
            <TabPanel>
              <Button
                fontFamily="Noto Sans Lao, sans-serif"
                leftIcon={<AddIcon />}
                colorScheme="teal"
                mb={4}
                size="sm"
                rounded="md"
                shadow="sm"
                onClick={() => handleOpenEmployee()}
              >
                ເພີ່ມພະນັກງານ
              </Button>

              <Table size="sm" variant="simple">
                <Thead bg="gray.100">
                  <Tr>
                    <Th>ລະຫັດ</Th>
                    <Th>ຊື່</Th>
                    <Th>ພະແນກ</Th>
                    <Th>ຈັດການ</Th>
                  </Tr>
                </Thead>

                <Tbody>
                  {employees?.map((i) => (
                    <Tr key={i._id} _hover={{ bg: "gray.50" }}>
                      <Td>{i.emp_code}</Td>
                      <Td>{i.full_name}</Td>
                      <Td>{i.department}</Td>
                      <Td>
                        <HStack>
                          <Button
                            size="xs"
                            leftIcon={<EditIcon />}
                            colorScheme="blue"
                            rounded="md"
                            fontFamily="Noto Sans Lao, sans-serif"
                            onClick={() => handleOpenEmployee(i)}
                          >
                            ແກ້ໄຂ
                          </Button>

                          <Button
                            size="xs"
                            fontFamily="Noto Sans Lao, sans-serif"
                            leftIcon={<DeleteIcon />}
                            colorScheme="red"
                            rounded="md"
                            onClick={() => handleDeleteEmployee(i._id)}
                          >
                            ລົບ
                          </Button>
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TabPanel>

            {/* CATEGORY */}
            <TabPanel>
              <Button
                fontFamily="Noto Sans Lao, sans-serif"
                leftIcon={<AddIcon />}
                colorScheme="teal"
                mb={4}
                size="sm"
                rounded="md"
                shadow="sm"
                onClick={() => handleOpenCategory()}
              >
                ເພີ່ມໝວດໝູ່
              </Button>

              <Table size="sm" variant="simple">
                <Thead bg="gray.100">
                  <Tr>
                    <Th>ຊື່ໝວດ</Th>
                    <Th>ປະເພດ</Th>
                    <Th>ອະທິບາຍ</Th>
                    <Th>ຈັດການ</Th>
                  </Tr>
                </Thead>

                <Tbody>
                  {categories?.map((i) => (
                    <Tr key={i._id} _hover={{ bg: "gray.50" }}>
                      <Td>{i.name}</Td>
                      <Td>
                        {
                          {
                            income: "💰 ລາຍຮັບ",
                            asset: "🏦 ຊັບສິນ",
                            cogs: "📦 ຕົ້ນທຶນຂາຍ",
                            "selling-expense": "🛒 ຈ່າຍຈຳໜ່າຍ",
                            "admin-expense": "🏢 ບໍລິຫານ",
                            expense: "📉 ຈ່າຍອື່ນໆ",
                          }[i.type]
                        }
                      </Td>
                      <Td>{i.description}</Td>
                      <Td>
                        <HStack>
                          <Button
                            size="xs"
                            leftIcon={<EditIcon />}
                            colorScheme="blue"
                            rounded="md"
                            fontFamily="Noto Sans Lao, sans-serif"
                            onClick={() => handleOpenCategory(i)}
                          >
                            ແກ້ໄຂ
                          </Button>

                          <Button
                            size="xs"
                            leftIcon={<DeleteIcon />}
                            colorScheme="red"
                            rounded="md"
                            fontFamily="Noto Sans Lao, sans-serif"
                            onClick={() => handleDeleteCategory(i._id)}
                          >
                            ລົບ
                          </Button>
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      {/* ========================= PARTNER MODAL ========================= */}
      <Modal
        isOpen={partnerModal.isOpen}
        onClose={partnerModal.onClose}
        size="md"
      >
        <ModalOverlay />
        <ModalContent rounded="xl" shadow="lg">
          <ModalHeader
            fontFamily="Noto Sans Lao, sans-serif"
            color="teal.600"
            fontWeight="bold"
          >
            {editingId
              ? "ແກ້ໄຂຂໍ້ມູນ"
              : formType === "supplier"
              ? "ເພີ່ມຜູ້ສະໜອງ"
              : "ເພີ່ມລູກໜີ້"}
          </ModalHeader>

          <ModalBody>
            <VStack spacing={4}>
              <Input
                placeholder="ຊື່"
                value={formData.name}
                rounded="md"
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
              <Input
                placeholder="ເບີໂທ"
                value={formData.phone}
                rounded="md"
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
              <Textarea
                placeholder="ທີ່ຢູ່"
                value={formData.address}
                rounded="md"
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button mr={3} onClick={partnerModal.onClose}>
              ຍົກເລີກ
            </Button>
            <Button colorScheme="teal" onClick={handleSubmitPartner}>
              ບັນທຶກ
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* EMPLOYEE MODAL */}
      <Modal isOpen={employeeModal.isOpen} onClose={employeeModal.onClose}>
        <ModalOverlay />
        <ModalContent rounded="xl" shadow="lg">
          <ModalHeader fontFamily="Noto Sans Lao, sans-serif" color="teal.600">
            {editingId ? "ແກ້ໄຂພະນັກງານ" : "ເພີ່ມພະນັກງານ"}
          </ModalHeader>

          <ModalBody>
            <VStack spacing={4}>
              <Input
                placeholder="ລະຫັດ"
                value={formEmployee.emp_code}
                rounded="md"
                onChange={(e) =>
                  setFormEmployee({ ...formEmployee, emp_code: e.target.value })
                }
              />
              <Input
                placeholder="ຊື່"
                value={formEmployee.full_name}
                rounded="md"
                onChange={(e) =>
                  setFormEmployee({
                    ...formEmployee,
                    full_name: e.target.value,
                  })
                }
              />
              <Input
                placeholder="ພະແນກ"
                rounded="md"
                value={formEmployee.department}
                onChange={(e) =>
                  setFormEmployee({
                    ...formEmployee,
                    department: e.target.value,
                  })
                }
              />
              <Input
                placeholder="ຕຳແໜ່ງ"
                rounded="md"
                value={formEmployee.position}
                onChange={(e) =>
                  setFormEmployee({
                    ...formEmployee,
                    position: e.target.value,
                  })
                }
              />
              <Input
                placeholder="ເບີໂທ"
                rounded="md"
                value={formEmployee.phone}
                onChange={(e) =>
                  setFormEmployee({
                    ...formEmployee,
                    phone: e.target.value,
                  })
                }
              />
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button mr={3} onClick={employeeModal.onClose}>
              ຍົກເລີກ
            </Button>
            <Button colorScheme="teal" onClick={handleSubmitEmployee}>
              ບັນທຶກ
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* CATEGORY MODAL */}
      <Modal isOpen={categoryModal.isOpen} onClose={categoryModal.onClose}>
        <ModalOverlay />
        <ModalContent rounded="xl" shadow="lg">
          <ModalHeader fontFamily="Noto Sans Lao, sans-serif" color="teal.600">
            {editingId ? "ແກ້ໄຂໝວດໝູ່" : "ເພີ່ມໝວດໝູ່"}
          </ModalHeader>

          <ModalBody>
            <VStack spacing={4}>
              <Input
                placeholder="ຊື່ໝວດ"
                value={formCategory.name}
                rounded="md"
                onChange={(e) =>
                  setFormCategory({ ...formCategory, name: e.target.value })
                }
              />

              <RadioGroup
                value={formCategory.type}
                onChange={(val) =>
                  setFormCategory({ ...formCategory, type: val })
                }
              >
                <VStack align="start" spacing={2}>
                  <Radio value="income">💰 Income (ລາຍຮັບ)</Radio>
                  <Radio value="asset">🏦 Asset (ຊັບສິນ)</Radio>
                  <Radio value="cogs">📦 COGS (ຕົ້ນທຶນຂາຍ)</Radio>
                  <Radio value="selling-expense">🛒 ຈ່າຍຈຳໜ່າຍ</Radio>
                  <Radio value="admin-expense">🏢 ບໍລິຫານ</Radio>
                  <Radio value="expense">📉 ອື່ນໆ</Radio>
                </VStack>
              </RadioGroup>

              <Textarea
                placeholder="ອະທິບາຍ"
                value={formCategory.description}
                rounded="md"
                onChange={(e) =>
                  setFormCategory({
                    ...formCategory,
                    description: e.target.value,
                  })
                }
              />
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button mr={3} onClick={categoryModal.onClose}>
              ຍົກເລີກ
            </Button>
            <Button colorScheme="teal" onClick={handleSubmitCategory}>
              ບັນທຶກ
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
