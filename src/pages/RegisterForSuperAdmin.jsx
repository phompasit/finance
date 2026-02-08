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
  Center,
  Image,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import Swal from "sweetalert2";
import Logo from "../../public/Purple and Blue Modern Finance Logo.png";
export default function RegisterForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
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
  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };
  const handleAddUser = async () => {
    try {
      if (loading) return;
      setLoading(true);
      // 🔒 loading popup
      Swal.fire({
        title: "ກຳລັງບັນທຶກ...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      await api.post("/api/auth/register-superadmin", form);

      // ✅ success
      await Swal.fire({
        icon: "success",
        title: "ລົງທະບຽນສຳເລັດ",
        timer: 2000,
        showConfirmButton: false,
      });

      setForm({
        username: "",
        email: "",
        password: "",
      });

      navigate("/login");
    } catch (error) {
      // ❌ error handling
      const message =
        error?.response?.data?.message ||
        "ບໍ່ສາມາດເພີ່ມຜູ້ໃຊ້ງານໄດ້";

      Swal.fire({
        icon: "error",
        title: "ເກີດຂໍ້ຜິດພາດ",
        text: message,
        confirmButtonText: "ຕົກລົງ",
      });
    } finally {
      setLoading(false);
    }
  };
  return (
    <Center
      minH="100vh"
      bgGradient="linear(to-br, #0f2027, #203a43, #2c5364)"
      px={4}
    >
      <Box
        w="full"
        maxW="lg"
        p={8}
        borderRadius="2xl"
        bg="rgba(255,255,255,0.08)"
        backdropFilter="blur(16px)"
        boxShadow="0 25px 50px rgba(0,0,0,0.45)"
        border="1px solid rgba(255,255,255,0.15)"
      >
        <VStack spacing={6} align="stretch">
          {/* ===== Header ===== */}
          <VStack spacing={3} textAlign="center">
            <Box
              w="64px"
              h="64px"
              borderRadius="2xl"
              bg="white"
              display="flex"
              alignItems="center"
              justifyContent="center"
              boxShadow="lg"
            >
              <Image src={Logo} alt="Company Logo" w="42px" />
            </Box>

            <Heading
              fontFamily="Noto Sans Lao, sans-serif"
              fontSize="2xl"
              color="white"
            >
              ສະໝັກສະມາຊິກ
            </Heading>

            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              fontSize="sm"
              color="gray.300"
            >
              ສ້າງບັນຊີຫຼັກສຳລັບການຈັດການລະບົບ
            </Text>
          </VStack>

          {/* ===== User Info ===== */}
          <Box>
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              fontWeight="bold"
              color="teal.200"
              mb={2}
            >
              👤 ຂໍ້ມູນຜູ້ໃຊ້
            </Text>

            <VStack spacing={3}>
              <Input
                fontFamily="Noto Sans Lao, sans-serif"
                placeholder="ຊື່ຜູ້ໃຊ້"
                value={form.username}
                onChange={(e) => handleChange("username", e.target.value)}
                bg="rgba(255,255,255,0.1)"
                color="white"
                border="1px solid rgba(255,255,255,0.2)"
                _placeholder={{ color: "gray.400" }}
                focusBorderColor="teal.300"
              />

              <Input
                fontFamily="Noto Sans Lao, sans-serif"
                placeholder="ອີເມວ"
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                bg="rgba(255,255,255,0.1)"
                color="white"
                border="1px solid rgba(255,255,255,0.2)"
                _placeholder={{ color: "gray.400" }}
                focusBorderColor="teal.300"
              />

              <Input
                fontFamily="Noto Sans Lao, sans-serif"
                placeholder="ລະຫັດຜ່ານ"
                type="password"
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                bg="rgba(255,255,255,0.1)"
                color="white"
                border="1px solid rgba(255,255,255,0.2)"
                _placeholder={{ color: "gray.400" }}
                focusBorderColor="teal.300"
              />
            </VStack>
          </Box>

          {/* ===== Company Info ===== */}
          <Box pt={2}>
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              fontWeight="bold"
              color="purple.200"
              mb={2}
            >
              🏢 ຂໍ້ມູນບໍລິສັດ
            </Text>

            <VStack spacing={3}>
              <Input
                fontFamily="Noto Sans Lao, sans-serif"
                placeholder="ຊື່ບໍລິສັດ"
                value={form.companyInfo.name}
                onChange={(e) =>
                  handleChange("companyInfo", {
                    ...form.companyInfo,
                    name: e.target.value,
                  })
                }
                bg="rgba(255,255,255,0.1)"
                color="white"
                border="1px solid rgba(255,255,255,0.2)"
                _placeholder={{ color: "gray.400" }}
                focusBorderColor="purple.300"
              />

              <Input
                fontFamily="Noto Sans Lao, sans-serif"
                placeholder="ທີ່ຢູ່ບໍລິສັດ"
                value={form.companyInfo.address}
                onChange={(e) =>
                  handleChange("companyInfo", {
                    ...form.companyInfo,
                    address: e.target.value,
                  })
                }
                bg="rgba(255,255,255,0.1)"
                color="white"
                border="1px solid rgba(255,255,255,0.2)"
                _placeholder={{ color: "gray.400" }}
                focusBorderColor="purple.300"
              />

              <Input
                fontFamily="Noto Sans Lao, sans-serif"
                placeholder="ເບີໂທລະສັບບໍລິສັດ"
                value={form.companyInfo.phone}
                onChange={(e) =>
                  handleChange("companyInfo", {
                    ...form.companyInfo,
                    phone: e.target.value,
                  })
                }
                bg="rgba(255,255,255,0.1)"
                color="white"
                border="1px solid rgba(255,255,255,0.2)"
                _placeholder={{ color: "gray.400" }}
                focusBorderColor="purple.300"
              />

              <Input
                fontFamily="Noto Sans Lao, sans-serif"
                placeholder="ອີເມວບໍລິສັດ"
                value={form.companyInfo.email}
                onChange={(e) =>
                  handleChange("companyInfo", {
                    ...form.companyInfo,
                    email: e.target.value,
                  })
                }
                bg="rgba(255,255,255,0.1)"
                color="white"
                border="1px solid rgba(255,255,255,0.2)"
                _placeholder={{ color: "gray.400" }}
                focusBorderColor="purple.300"
              />
            </VStack>
          </Box>

          {/* ===== Submit ===== */}
          <Button
            mt={4}
            size="lg"
            w="full"
            fontFamily="Noto Sans Lao, sans-serif"
            bgGradient="linear(to-r, teal.400, cyan.500)"
            color="white"
            borderRadius="xl"
            boxShadow="0 12px 24px rgba(0,0,0,0.35)"
            _hover={{
              bgGradient: "linear(to-r, teal.500, cyan.600)",
              transform: "translateY(-1px)",
            }}
            _active={{ transform: "scale(0.97)" }}
            onClick={handleAddUser}
          >
            ສະໝັກສະມາຊິກ
          </Button>
        </VStack>
      </Box>
    </Center>
  );
}
