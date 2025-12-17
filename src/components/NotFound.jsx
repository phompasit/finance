import { Center, VStack, Text, Button, Icon } from "@chakra-ui/react";
import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <Center minH="100vh" bg="gray.50">
      <VStack spacing={5} textAlign="center">
        <Icon as={AlertTriangle} boxSize={14} color="orange.400" />

        <Text
          fontSize="2xl"
          fontWeight="bold"
          fontFamily="'Noto Sans Lao', sans-serif"
        >
          ບໍ່ພົບໜ້ານີ້
        </Text>

        <Text
          fontFamily="Noto Sans Lao, sans-serif"
          fontSize="md"
          color="gray.500"
          maxW="400px"
        >
          ໜ້າທີ່ເຈົ້າກຳລັງຄົ້ນຫາ ອາດຖືກລົບ ຫຼື ບໍ່ມີຢູ່ໃນລະບົບ
        </Text>

        <Button
          fontFamily="Noto Sans Lao, sans-serif"
          colorScheme="green"
          onClick={() => navigate("/dashboard")}
        >
          ກັບໄປໜ້າຫຼັກ
        </Button>
      </VStack>
    </Center>
  );
}
