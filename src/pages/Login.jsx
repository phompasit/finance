"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Heading,
  Text,
  VStack,
  Alert,
  AlertIcon,
  Center,
  useToast,
} from "@chakra-ui/react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await login(email, password); // ✅ await ตรง ๆ
      toast({
        title: "ເຂົ້າສູ່ລະບົບສຳເລັດ",
        status: "success",
        duration: 2000,
        isClosable: true,
      });

      console.log(res); // ✅ res มีค่าแน่นอน
      navigate("/dashboard");
    } catch (err) {
      const description =
        err?.response?.data?.message || err?.message || "เกิดข้อผิดพลาด";
      if (err.response?.status === 429) {
        toast({
          title: "ເກີດຂໍ້ຜິດພາດ",
          description: description || "คุณส่งคำขอเกินจำนวนที่กำหนด",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
        title: "ເກີດຂໍ້ຜິດພາດ",
          description: description || "เกิดข้อผิดพลาด",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
      setError(description || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Center minH="100vh" bgGradient="linear(to-br, gray.900, gray.800)">
      <Box
        w="full"
        maxW="md"
        p={8}
        bg="gray.700"
        borderRadius="lg"
        boxShadow="xl"
        border="1px"
        borderColor="gray.600"
      >
        <VStack spacing={6} align="stretch">
          <Box textAlign="center">
            <Heading
              fontFamily="Noto Sans Lao, sans-serif"
              size="lg"
              color="white"
              mb={2}
            >
              ລະບົບຈັດການການເງິນ
            </Heading>
            <Text fontFamily="Noto Sans Lao, sans-serif" color="gray.300">
              ເຂົ້າສູ່ລະບົບ
            </Text>
            <Text  fontFamily="Noto Sans Lao, sans-serif" color="gray.300">ກະລຸນາຢ່າເຂົ້າລະບົບເກີນ 5 ຄັ້ງ </Text>
          </Box>

          {error && (
            <Alert  fontFamily="Noto Sans Lao, sans-serif"  status="error" borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel
                  fontFamily="Noto Sans Lao, sans-serif"
                  color="gray.300"
                >
                  ອິເມວ
                </FormLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  bg="gray.600"
                  color="white"
                  _placeholder={{ color: "gray.400" }}
                  borderColor="gray.500"
                  focusBorderColor="green.400"
                  required
                />
              </FormControl>

              <FormControl>
                <FormLabel
                  fontFamily="Noto Sans Lao, sans-serif"
                  color="gray.300"
                >
                  ລະຫັດຜ່ານ
                </FormLabel>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  bg="gray.600"
                  color="white"
                  _placeholder={{ color: "gray.400" }}
                  borderColor="gray.500"
                  focusBorderColor="green.400"
                  required
                />
              </FormControl>

              <Button
                fontFamily="Noto Sans Lao, sans-serif"
                type="submit"
                w="full"
                bg="green.500"
                color="white"
                _hover={{ bg: "green.600" }}
                _disabled={{ bg: "gray.500" }}
                isLoading={loading}
                loadingText="ກຳລັງເຂົ້າສູ່ລະບົບ..."
              >
                ເຂົ້າສູ່ລະບົບ
              </Button>
            </VStack>
          </form>
        </VStack>
      </Box>
    </Center>
  );
}
