import { Flex, Heading, Button } from "@chakra-ui/react";
import { AddIcon } from "@chakra-ui/icons";
import { Printer } from "lucide-react";

export default function PrepaidHeader({
  selected,
  user,
  onAddOpen,
  onPrint,
}) {
  return (
    <Flex justify="space-between" align="center" mb={6}>
      <Heading size="lg" fontFamily="Noto Sans Lao, sans-serif">
        ລາຍຈ່າຍລ່ວງໜ້າ
      </Heading>

      <Flex gap={2}>
        <Button
          leftIcon={<Printer size={16} />}
          variant="outline"
          isDisabled={selected.length === 0}
          fontFamily="Noto Sans Lao, sans-serif"
          onClick={onPrint}
        >
          ພິມ ({selected.length})
        </Button>

        <Button
          leftIcon={<AddIcon />}
          colorScheme="blue"
          onClick={onAddOpen}
          fontFamily="Noto Sans Lao, sans-serif"
        >
          ເພີ່ມລາຍການ
        </Button>
      </Flex>
    </Flex>
  );
}
