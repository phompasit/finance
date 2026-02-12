import React, { useState, useRef, useEffect } from "react";
import {
  ChakraProvider,
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  Link,
  useToast,
  extendTheme,
} from "@chakra-ui/react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
const theme = extendTheme({
  fonts: {
    heading:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    body:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  },
});

function Verify2FA() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef([]);
  const toast = useToast();
  const { fetchUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const tempToken = query.get("token");
  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
    if (!tempToken) {
      navigate("/login");
    }
  }, [tempToken]);

  const handleChange = (index, value) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1); // Take only the last character
    setCode(newCode);

    // Auto-focus to next box
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };
  const handleKeyDown = (index, e) => {
    // Auto-backspace to previous box
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);

    if (!/^\d+$/.test(pastedData)) return;

    const newCode = [...code];
    pastedData.split("").forEach((char, i) => {
      if (i < 6) newCode[i] = char;
    });
    setCode(newCode);

    // Focus last filled input or next empty
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleVerify = async () => {
    // ป้องกันกดซ้ำ
    if (isVerifying) return;

    const fullCode = code.join("");

    // ตรวจ tempToken
    if (!tempToken) {
      toast({
        title: "Session expired",
        description: "Please login again",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      navigate("/login");
      return;
    }

    // ตรวจรูปแบบ code
    if (!/^\d{6}$/.test(fullCode)) {
      toast({
        title: "Invalid code",
        description: "Please enter a valid 6-digit code",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsVerifying(true);

    try {
      await api.post("/api/auth/user/verify-2fa", {
        tempToken,
        code: fullCode,
      });

      toast({
        title: "Success",
        description: "Login successful",
        status: "success",
        duration: 1500,
        isClosable: true,
      });

      // ดึง user หลัง verify สำเร็จ
      await fetchUser();

      // เคลียร์ code ออกจาก memory
      setCode(["", "", "", "", "", ""]);

      navigate("/");
    } catch (err) {
      const message = err?.response?.data?.message || "Verification failed";

      // token หมดอายุ
      if (message === "Invalid or expired token") {
        toast({
          title: "Session expired",
          description: "Please login again",
          status: "warning",
          duration: 3000,
          isClosable: true,
        });

        navigate("/login");
        return;
      }

      // รหัสผิด
      toast({
        title: "Verification failed",
        description: "Incorrect authentication code",
        status: "error",
        duration: 3000,
        isClosable: true,
      });

      // เคลียร์ช่อง input เพื่อกัน brute force แบบอัตโนมัติ
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBackToLogin = () => {
    navigate("/login");
  };
  return (
    <ChakraProvider theme={theme}>
      <Box
        minH="100vh"
        bg="gray.50"
        display="flex"
        alignItems="center"
        justifyContent="center"
        p={4}
      >
        <Container maxW="md">
          <Box
            bg="white"
            borderRadius="xl"
            boxShadow="lg"
            p={{ base: 6, md: 8 }}
            w="full"
          >
            <VStack spacing={6} align="stretch">
              {/* Header */}
              <VStack spacing={2} textAlign="center">
                <Text
                  fontSize={{ base: "2xl", md: "3xl" }}
                  fontWeight="600"
                  color="gray.800"
                >
                  Enter Verification Code
                </Text>
                <Text fontSize="md" color="gray.600">
                  Enter the 6-digit code from your authenticator app
                </Text>
              </VStack>
              {/* Code Inputs */}
              <HStack spacing={{ base: 2, md: 3 }} justify="center" py={4}>
                {code.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    maxLength={1}
                    textAlign="center"
                    fontSize={{ base: "xl", md: "2xl" }}
                    fontWeight="600"
                    w={{ base: "45px", md: "56px" }}
                    h={{ base: "50px", md: "60px" }}
                    borderRadius="lg"
                    borderWidth="2px"
                    borderColor={digit ? "blue.500" : "gray.300"}
                    _hover={{ borderColor: digit ? "blue.600" : "gray.400" }}
                    _focus={{
                      borderColor: "blue.500",
                      boxShadow: "0 0 0 1px var(--chakra-colors-blue-500)",
                    }}
                    transition="all 0.2s"
                  />
                ))}
              </HStack>

              {/* Verify Button */}
              <Button
                colorScheme="blue"
                size="lg"
                fontSize="md"
                fontWeight="600"
                h="52px"
                borderRadius="lg"
                isLoading={isVerifying}
                loadingText="Verifying..."
                onClick={handleVerify}
                _hover={{ transform: "translateY(-1px)", boxShadow: "md" }}
                transition="all 0.2s"
              >
                Verify
              </Button>

              {/* Back to Login Link */}
              <Box textAlign="center">
                <Link
                  color="gray.600"
                  fontSize="sm"
                  fontWeight="500"
                  onClick={handleBackToLogin}
                  _hover={{ color: "blue.600", textDecoration: "none" }}
                  transition="color 0.2s"
                >
                  ← Back to login
                </Link>
              </Box>
            </VStack>
          </Box>

          {/* Footer */}
          <Text textAlign="center" fontSize="sm" color="gray.500" mt={6}>
            Having trouble? Contact support
          </Text>
        </Container>
      </Box>
    </ChakraProvider>
  );
}

export default Verify2FA;
