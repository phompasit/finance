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
} from "@chakra-ui/react";
import { AddIcon, EditIcon } from "@chakra-ui/icons";
import { DeleteIcon } from "lucide-react";

export default function Partner() {
  const toast = useToast();

  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [formType, setFormType] = useState("supplier");

  const [formData, setFormData] = useState({
    name: "",
    taxId: "",
    phone: "",
    address: "",
  });

  const [formEmployee, setFormEmployee] = useState({
    emp_code: "",
    full_name: "",
    department: "",
    position: "",
    phone: "",
  });

  const {
    isOpen: isPartnerModal,
    onOpen: onOpenPartner,
    onClose: onClosePartner,
  } = useDisclosure();

  const {
    isOpen: isEmployeeModal,
    onOpen: onOpenEmployee,
    onClose: onCloseEmployee,
  } = useDisclosure();

  const fetchPartners = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/debt/partners`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const result = await res.json();
      if (result.success) {
        setSuppliers(result.data.filter((p) => p.type === "supplier"));
        setCustomers(result.data.filter((p) => p.type === "customer"));
      }
    } catch (err) {
      toast({ title: "Error fetching partners", status: "error" });
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/debt/employees`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const result = await res.json();
      if (result.success) setEmployees(result.data);
    } catch (err) {
      toast({ title: "Error fetching employees", status: "error" });
    }
  };

  useEffect(() => {
    fetchPartners();
    fetchEmployees();
  }, []);

  const handleOpenPartner = (type, item = null) => {
    setFormType(type);
    if (item) {
      setEditingId(item._id);
      setFormData(item);
    } else {
      setEditingId(null);
      setFormData({ name: "", taxId: "", phone: "", address: "" });
    }
    onOpenPartner();
  };

  const handleOpenEmployee = (item = null) => {
    if (item) {
      setEditingId(item._id);
      setFormEmployee(item);
    } else {
      setEditingId(null);
      setFormEmployee({
        emp_code: "",
        full_name: "",
        department: "",
        position: "",
        phone: "",
      });
    }
    onOpenEmployee();
  };

  const handleSubmitPartner = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/debt/partners${
          editingId ? `/${editingId}` : ""
        }`,
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ ...formData, type: formType }),
        }
      );
      const result = await res.json();
      if (result.success) {
        toast({ title: "Saved successfully", status: "success" });
        onClosePartner();
        fetchPartners();
      }
    } catch {
      toast({ title: "Save failed", status: "error" });
    }
  };

  const handleSubmitEmployee = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/debt/employees${
          editingId ? `/${editingId}` : ""
        }`,
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(formEmployee),
        }
      );
      const result = await res.json();
      if (result.success) {
        toast({ title: "Employee saved", status: "success" });
        onCloseEmployee();
        fetchEmployees();
      }
    } catch {
      toast({ title: "Save failed", status: "error" });
    }
  };
  const handleDeleteEmployee = async (id) => {

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/debt/employees/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const result = await res.json();

      if (result.success) {
        alert("ลบข้อมูลสำเร็จ!");
        fetchEmployees(); // รีเฟรชข้อมูลหลังลบ
      } else {
        alert(result.message || "เกิดข้อผิดพลาดขณะลบข้อมูล");
      }
    } catch (error) {
      console.error("❌ Error deleting employee:", error);
    }
  };
  const handleDeletePartner = async (id) => {

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/debt/partners/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const result = await res.json();

      if (result.success) {
        alert("ลบข้อมูลสำเร็จ!");
        fetchPartners(); // ดึงข้อมูลใหม่
      } else {
        alert(result.message || "เกิดข้อผิดพลาดขณะลบข้อมูล");
      }
    } catch (error) {
      console.error("❌ Error deleting partner:", error);
    }
  };

  return (
    <Box p={6}>
      <Heading
        fontFamily="Noto Sans Lao, sans-serif"
        size="lg"
        color="teal.600"
        mb={4}
      >
        ຈັດການຜູ້ສະໜອງ / ລູກໜີ້ / ພະນັກງານ
      </Heading>

      <Tabs variant="enclosed">
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
        </TabList>

        <TabPanels>
          {/* Supplier */}
          <TabPanel>
            <Button
              fontFamily="Noto Sans Lao, sans-serif"
              leftIcon={<AddIcon />}
              colorScheme="teal"
              mb={4}
              onClick={() => handleOpenPartner("supplier")}
            >
              ເພີ່ມຜູ້ສະໜອງ
            </Button>
            <Table variant="striped" size="sm">
              <Thead>
                <Tr>
                  <Th fontFamily="Noto Sans Lao, sans-serif">ຊື່</Th>
                  <Th fontFamily="Noto Sans Lao, sans-serif">ເບີໂທ</Th>
                  <Th fontFamily="Noto Sans Lao, sans-serif">ທີ່ຢູ່</Th>
                  <Th fontFamily="Noto Sans Lao, sans-serif">ຈັດການ</Th>
                </Tr>
              </Thead>
              <Tbody>
                {suppliers.map((s) => (
                  <Tr key={s._id}>
                    <Td fontFamily="Noto Sans Lao, sans-serif">{s.name}</Td>
                    <Td fontFamily="Noto Sans Lao, sans-serif">{s.phone}</Td>
                    <Td fontFamily="Noto Sans Lao, sans-serif">{s.address}</Td>
                    <Td fontFamily="Noto Sans Lao, sans-serif">
                      <Button
                        fontFamily="Noto Sans Lao, sans-serif"
                        size="xs"
                        colorScheme="blue"
                        leftIcon={<EditIcon />}
                        onClick={() => handleOpenPartner("supplier", s)}
                      >
                        ແກ້ໄຂ
                      </Button>
                      <Button
                        fontFamily="Noto Sans Lao, sans-serif"
                        size="xs"
                        colorScheme="red"
                        onClick={()=>handleDeletePartner(s._id)}
                        leftIcon={<DeleteIcon />}
                      >
                        ລົບ
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TabPanel>

          {/* Customer */}
          <TabPanel>
            <Button
              fontFamily="Noto Sans Lao, sans-serif"
              leftIcon={<AddIcon />}
              colorScheme="teal"
              mb={4}
              onClick={() => handleOpenPartner("customer")}
            >
              ເພີ່ມລູກໜີ້
            </Button>
            <Table variant="striped" size="sm">
              <Thead>
                <Tr>
                  <Th fontFamily="Noto Sans Lao, sans-serif">ຊື່</Th>
                  <Th fontFamily="Noto Sans Lao, sans-serif">ເບີໂທ</Th>
                  <Th fontFamily="Noto Sans Lao, sans-serif">ທີ່ຢູ່</Th>
                  <Th fontFamily="Noto Sans Lao, sans-serif">ຈັດການ</Th>
                </Tr>
              </Thead>
              <Tbody>
                {customers.map((c) => (
                  <Tr key={c._id}>
                    <Td fontFamily="Noto Sans Lao, sans-serif">{c.name}</Td>
                    <Td fontFamily="Noto Sans Lao, sans-serif">{c.phone}</Td>
                    <Td fontFamily="Noto Sans Lao, sans-serif">{c.address}</Td>
                    <Td fontFamily="Noto Sans Lao, sans-serif">
                      <Button
                        fontFamily="Noto Sans Lao, sans-serif"
                        size="xs"
                        colorScheme="blue"
                        leftIcon={<EditIcon />}
                        onClick={() => handleOpenPartner("customer", c)}
                      >
                        ແກ້ໄຂ
                      </Button>
                      <Button
                        fontFamily="Noto Sans Lao, sans-serif"
                        size="xs"
                        colorScheme="red"
                        leftIcon={<DeleteIcon />}
                          onClick={()=>handleDeletePartner(c._id)}
                      >
                        ລົບ
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TabPanel>

          {/* Employee */}
          <TabPanel>
            <Button
              fontFamily="Noto Sans Lao, sans-serif"
              leftIcon={<AddIcon />}
              colorScheme="teal"
              mb={4}
              onClick={() => handleOpenEmployee()}
            >
              ເພີ່ມພະນັກງານ
            </Button>
            <Table variant="striped" size="sm">
              <Thead>
                <Tr>
                  <Th fontFamily="Noto Sans Lao, sans-serif">ລະຫັດ</Th>
                  <Th fontFamily="Noto Sans Lao, sans-serif">ຊື່</Th>
                  <Th fontFamily="Noto Sans Lao, sans-serif">ພະແນກ</Th>
                  <Th fontFamily="Noto Sans Lao, sans-serif">ຈັດການ</Th>
                </Tr>
              </Thead>
              <Tbody>
                {employees.map((e) => (
                  <Tr key={e._id}>
                    <Td fontFamily="Noto Sans Lao, sans-serif">{e.emp_code}</Td>
                    <Td fontFamily="Noto Sans Lao, sans-serif">
                      {e.full_name}
                    </Td>
                    <Td fontFamily="Noto Sans Lao, sans-serif">
                      {e.department}
                    </Td>
                    <Td fontFamily="Noto Sans Lao, sans-serif">
                      <Button
                        fontFamily="Noto Sans Lao, sans-serif"
                        size="xs"
                        colorScheme="blue"
                        leftIcon={<EditIcon />}
                        onClick={() => handleOpenEmployee(e)}
                      >
                        ແກ້ໄຂ
                      </Button>
                      <Button
                        fontFamily="Noto Sans Lao, sans-serif"
                        size="xs"
                        colorScheme="red"
                        leftIcon={<DeleteIcon />}
                        onClick={()=>handleDeleteEmployee(e._id)}
                      >
                        ລົບ
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Partner Modal */}
      <Modal isOpen={isPartnerModal} onClose={onClosePartner} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader fontFamily="Noto Sans Lao, sans-serif">
            {editingId ? "ແກ້ໄຂ" : "ເພີ່ມ"}{" "}
            {formType === "supplier" ? "ຜູ້ສະໜອງ" : "ລູກໜີ້"}
          </ModalHeader>
          <ModalBody>
            <VStack spacing={3}>
              <Input
                placeholder="ຊື່"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
              <Input
                placeholder="ເບີໂທ"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
              <Textarea
                placeholder="ທີ່ຢູ່"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              fontFamily="Noto Sans Lao, sans-serif"
              mr={3}
              onClick={onClosePartner}
            >
              ຍົກເລີກ
            </Button>
            <Button
              fontFamily="Noto Sans Lao, sans-serif"
              colorScheme="teal"
              onClick={handleSubmitPartner}
            >
              ບັນທຶກ
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Employee Modal */}
      <Modal isOpen={isEmployeeModal} onClose={onCloseEmployee} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader fontFamily="Noto Sans Lao, sans-serif">
            {editingId ? "ແກ້ໄຂພະນັກງານ" : "ເພີ່ມພະນັກງານ"}
          </ModalHeader>
          <ModalBody>
            <VStack spacing={3}>
              <Input
                fontFamily="Noto Sans Lao, sans-serif"
                placeholder="ລະຫັດ"
                value={formEmployee.emp_code}
                onChange={(e) =>
                  setFormEmployee({ ...formEmployee, emp_code: e.target.value })
                }
              />
              <Input
                fontFamily="Noto Sans Lao, sans-serif"
                placeholder="ຊື່"
                value={formEmployee.full_name}
                onChange={(e) =>
                  setFormEmployee({
                    ...formEmployee,
                    full_name: e.target.value,
                  })
                }
              />
              <Input
                fontFamily="Noto Sans Lao, sans-serif"
                placeholder="ພະແນກ"
                value={formEmployee.department}
                onChange={(e) =>
                  setFormEmployee({
                    ...formEmployee,
                    department: e.target.value,
                  })
                }
              />
              <Input
                fontFamily="Noto Sans Lao, sans-serif"
                placeholder="ຕຳແໜ່ງ"
                value={formEmployee.position}
                onChange={(e) =>
                  setFormEmployee({ ...formEmployee, position: e.target.value })
                }
              />
              <Input
                fontFamily="Noto Sans Lao, sans-serif"
                placeholder="ເບີໂທ"
                value={formEmployee.phone}
                onChange={(e) =>
                  setFormEmployee({ ...formEmployee, phone: e.target.value })
                }
              />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              fontFamily="Noto Sans Lao, sans-serif"
              mr={3}
              onClick={onCloseEmployee}
            >
              ຍົກເລີກ
            </Button>
            <Button
              fontFamily="Noto Sans Lao, sans-serif"
              colorScheme="teal"
              onClick={handleSubmitEmployee}
            >
              ບັນທຶກ
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
