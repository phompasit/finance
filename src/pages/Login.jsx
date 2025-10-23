"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
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
} from "@chakra-ui/react"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await login(email, password)
      navigate("/dashboard")
    } catch (err) {
      setError(err.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ")
    } finally {
      setLoading(false)
    }
  }

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
            <Heading fontFamily="Noto Sans Lao, sans-serif"  size="lg" color="white" mb={2}>
              ລະບົບຈັດການການເງິນ
            </Heading>
            <Text fontFamily="Noto Sans Lao, sans-serif"  color="gray.300">ເຂົ້າສູ່ລະບົບ</Text>
          </Box>

          {error && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel fontFamily="Noto Sans Lao, sans-serif"  color="gray.300">ອິເມວ</FormLabel>
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
                <FormLabel fontFamily="Noto Sans Lao, sans-serif"  color="gray.300">ລະຫັດຜ່ານ</FormLabel>
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
                loadingText="กำลังเข้าสู่ระบบ..."
              >
                ເຂົ້າສູ່ລະບົບ
              </Button>
            </VStack>
          </form>
        </VStack>
      </Box>
    </Center>
  )
}
