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
  Image,
  AlertDescription,
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { ChevronRightIcon } from "@chakra-ui/icons";
import Logo from "../../public/Purple and Blue Modern Finance Logo.png";
import Swal from "sweetalert2";
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, user, fetchUser } = useAuth();

  const navigate = useNavigate();
  const toast = useToast();
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      Swal.fire({
        title: "ກຳລັງເຂົ້າສູ່ລະບົບ...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const res = await login(email, password);

      // 🟡 ถ้าต้องกรอก 2FA ก่อน
      if (res?.requiresTwoFactor) {
        await Swal.fire({
          icon: "info",
          title: "ກະລຸນາໃສ່ລະຫັດ 2FA",
          text: "ກວດສອບລະຫັດຈາກແອັບ Authenticator",
          confirmButtonText: "ຕົກລົງ",
        });

        // ไปหน้าใส่ OTP
        navigate(`/2faVerify?token=${res.tempToken}`);
        return;
      }

      // ✅ Login สำเร็จจริง (ไม่มี 2FA)
      await Swal.fire({
        icon: "success",
        title: "ເຂົ້າສູ່ລະບົບສຳເລັດ",
        timer: 1500,
        showConfirmButton: false,
      });

      if (res?.role === "admin" || res?.role === "master") {
        navigate("/dashboard");
      } else {
        navigate("/opo");
      }
      await fetchUser();
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || "ເກີດຂໍ້ຜິດພາດ";

      if (err?.response?.status === 429) {
        Swal.fire({
          icon: "warning",
          title: "ຖືກຈຳກັດການເຂົ້າໃຊ້",
          text: message,
          confirmButtonText: "ຕົກລົງ",
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "ເຂົ້າສູ່ລະບົບບໍ່ສຳເລັດ",
          text: message,
          confirmButtonText: "ລອງໃໝ່",
        });
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Center minH="100vh" bgGradient="linear(to-br, #0f2027, #203a43, #2c5364)">
      <Box
        w="full"
        maxW="md"
        p={8}
        borderRadius="2xl"
        bg="rgba(255,255,255,0.08)"
        backdropFilter="blur(14px)"
        boxShadow="0 20px 40px rgba(0,0,0,0.4)"
        border="1px solid rgba(255,255,255,0.15)"
      >
        <VStack spacing={6} align="stretch">
          {/* ===== Logo ===== */}
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
              letterSpacing="wide"
            >
              TECH FINANCIAL
            </Heading>

            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              color="gray.300"
              fontSize="sm"
            >
              ເຂົ້າສູ່ລະບົບຈັດການການເງິນ
            </Text>
          </VStack>

          {/* ===== Error ===== */}
          {error && (
            <Alert status="error" borderRadius="lg">
              <AlertIcon />
              <AlertDescription fontFamily="Noto Sans Lao, sans-serif">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* ===== Form ===== */}
          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel
                  fontFamily="Noto Sans Lao, sans-serif"
                  color="gray.200"
                >
                  ອິເມວ
                </FormLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  bg="rgba(255,255,255,0.1)"
                  color="white"
                  border="1px solid rgba(255,255,255,0.2)"
                  _placeholder={{ color: "gray.400" }}
                  focusBorderColor="teal.300"
                />
              </FormControl>

              <FormControl>
                <FormLabel
                  fontFamily="Noto Sans Lao, sans-serif"
                  color="gray.200"
                >
                  ລະຫັດຜ່ານ
                </FormLabel>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  bg="rgba(255,255,255,0.1)"
                  color="white"
                  border="1px solid rgba(255,255,255,0.2)"
                  _placeholder={{ color: "gray.400" }}
                  focusBorderColor="teal.300"
                />
              </FormControl>

              <Button
                type="submit"
                w="full"
                size="lg"
                fontFamily="Noto Sans Lao, sans-serif"
                bgGradient="linear(to-r, teal.400, cyan.500)"
                color="white"
                borderRadius="xl"
                boxShadow="0 10px 20px rgba(0,0,0,0.3)"
                _hover={{
                  bgGradient: "linear(to-r, teal.500, cyan.600)",
                  transform: "translateY(-1px)",
                }}
                _active={{ transform: "scale(0.98)" }}
                isLoading={loading}
                loadingText="ກຳລັງເຂົ້າ..."
              >
                ເຂົ້າສູ່ລະບົບ
              </Button>
            </VStack>
          </form>

          {/* ===== Register ===== */}
          <Button
            as={RouterLink}
            to="/register"
            variant="ghost"
            color="teal.200"
            rightIcon={<ChevronRightIcon />}
            fontFamily="Noto Sans Lao, sans-serif"
            _hover={{ color: "teal.300", bg: "transparent" }}
          >
            ລົງທະບຽນບັນຊີໃໝ່
          </Button>
        </VStack>
      </Box>
    </Center>
  );
}
