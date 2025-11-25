import React, { useState } from "react";
import {
  Box,
  Button,
  Input,
  Select,
  Heading,
  VStack,
  Card,
  CardBody,
  HStack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

export default function RegisterForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    companyInfo: {
      name: "",
      address: "",
      phone: "",
      email: "",
    },
  });
  const toast = useToast();
  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };
  const handleAddUser = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/register-superadmin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json", // <<-- สำคัญ
          },
          body: JSON.stringify(form),
        }
      );

      if (!res.ok) {
        // อ่านข้อความ error จาก response ถ้ามี
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "ບໍ່ສາມາດເພີ່ມຜູ້ໃຊ້ງານໄດ້");
      }
      navigate("/login");
      toast({
        title: "ລົງທະບຽນສຳເລັດ",
        status: "success",
        duration: 2000,
        isClosable: true,
      });

      setForm({
        username: "",
        email: "",
        password: "",
      });
    } catch (error) {
      toast({
        title: "ເກີດຂໍ້ຜິດພາດ",
        description: error.message || "ບໍ່ສາມາດເພີ່ມຜູ້ໃຊ້ງານໄດ້",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };
  return (
    <Box
      minH="100vh"
      bg="gray.100"
      display="flex"
      justifyContent="center"
      alignItems="center"
      p={6}
    >
      <Card w="100%" maxW="500px" shadow="xl" borderRadius="2xl" bg="white">
        <CardBody>
          <Heading
            fontFamily={"Noto Sans Lao"}
            size="lg"
            textAlign="center"
            mb={6}
          >
            ສະໝັກສະມາຊິກ Super Admin
          </Heading>

          <VStack spacing={4}>
            <Input
              placeholder="ຊື່ຜູ້ໃຊ້"
              value={form.username}
              onChange={(e) => handleChange("username", e.target.value)}
            />

            <Input
              placeholder="ອີເມວ"
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
            />
            <Input
              placeholder="ລະຫັດຜ່ານ"
              type="password"
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
            />

            <Text fontWeight="bold" fontSize="lg" pt={4} w="full">
              ຂໍ້ມູນບໍລິສັດ
            </Text>

            <Input
              placeholder="ຊື່ບໍລິສັດ"
              value={form.companyInfo.name}
              onChange={(e) =>
                handleChange("companyInfo", {
                  ...form.companyInfo,
                  name: e.target.value,
                })
              }
            />

            <Input
              placeholder="ທີ່ຢູ່ບໍລິສັດ"
              value={form.companyInfo.address}
              onChange={(e) =>
                handleChange("companyInfo", {
                  ...form.companyInfo,
                  address: e.target.value,
                })
              }
            />

            <Input
              placeholder="ເບີໂທລະສັບບໍລິສັດ"
              value={form.companyInfo.phone}
              onChange={(e) =>
                handleChange("companyInfo", {
                  ...form.companyInfo,
                  phone: e.target.value,
                })
              }
            />

            <Input
              placeholder="ອີເມວບໍລິສັດ"
              value={form.companyInfo.email}
              onChange={(e) =>
                handleChange("companyInfo", {
                  ...form.companyInfo,
                  email: e.target.value,
                })
              }
            />
          </VStack>

          <Button
            mt={6}
            w="full"
            onClick={handleAddUser}
            fontFamily={"Noto Sans Lao"}
            size="lg"
            colorScheme="blue"
            borderRadius="xl"
          >
            ສະໝັກສະມາຊິກ
          </Button>
        </CardBody>
      </Card>
    </Box>
  );
}
