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
import { useAuth } from "../context/AuthContext";

const theme = extendTheme({
  fonts: {
    heading:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    body:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  },
});

function TwoFactorAuth() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef([]);
  const { user } = useAuth();
  const toast = useToast();
  const [qr, setQr] = useState();
  const navigate = useNavigate();
  const enable = async () => {
    const fullCode = code.join("");

    if (fullCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter all 6 digits",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsVerifying(true);

      await api.post("/api/auth/user/2fa/enable", {
        token: fullCode,
      });

      toast({
        title: "2FA Enabled",
        description: "Two-factor authentication activated",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      navigate("/user");
    } catch (err) {
      console.log(err);
      toast({
        title: "Invalid code",
        description: "Please try again",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
    if (!user) {
      return navigate("/login");
    }
  }, [user]);

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
  ///2FA
  useEffect(() => {
    const fetchQR = async () => {
      const res = await api.get("/api/auth/user/2fa/setup");
      setQr(res.data.qr);
    };
    fetchQR();
  }, []);
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
              {qr && (
                <Box textAlign="center">
                  <Text fontWeight="500" mb={2}>
                    Scan this QR with Google Authenticator
                  </Text>
                  <img
                    src={qr}
                    alt="QR Code"
                    style={{ width: "180px", margin: "0 auto" }}
                  />
                </Box>
              )}
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
                loadingText="continue..."
                onClick={enable}
                _hover={{ transform: "translateY(-1px)", boxShadow: "md" }}
                transition="all 0.2s"
              >
                open 2FA
              </Button>
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

export default TwoFactorAuth;
