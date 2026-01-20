import React, { useState } from "react";
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Flex,
  IconButton,
  Text,
  Container,
  Heading,
  Badge,
} from "@chakra-ui/react";
import { ChevronDown, ChevronRight } from "lucide-react";

const formatNum = (n) => Number(n || 0).toLocaleString();

const AccountTreeTable = ({ tree, expanded, toggle, totals }) => {
  const renderNode = (node, level = 0) => {
    const isParent = node.children?.length > 0;
    const isExpanded = expanded[node.code];

    return (
      <React.Fragment key={node.code}>
        <Tr
          fontWeight={isParent ? "semibold" : "normal"}
          bg={isParent ? "blue.50" : "white"}
          _hover={{ bg: isParent ? "blue.100" : "gray.50" }}
          transition="all 0.2s"
          borderLeft={isParent ? "4px solid" : "none"}
          borderLeftColor={isParent ? "blue.500" : "transparent"}
        >
          <Td py={3}>
            <Flex align="center" gap={2}>
              {isParent ? (
                <IconButton
                  size="xs"
                  variant="ghost"
                  colorScheme="blue"
                  icon={
                    isExpanded ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )
                  }
                  onClick={() => toggle(node.code)}
                  borderRadius="md"
                  _hover={{ bg: "blue.200" }}
                />
              ) : (
                <Box width="24px" />
              )}
              <Text 
                fontFamily="Noto Sans Lao, sans-serif" 
                ml={level * 6}
                fontSize="sm"
                color={isParent ? "blue.800" : "gray.700"}
              >
                {node.code}
              </Text>
            </Flex>
          </Td>

          <Td py={3}>
            <Text 
              fontFamily="Noto Sans Lao, sans-serif" 
              ml={level * 6}
              fontSize="sm"
              color={isParent ? "blue.800" : "gray.700"}
            >
              {node.name}
            </Text>
          </Td>

          <Td fontFamily="Noto Sans Lao, sans-serif" textAlign="right" fontSize="sm" color="gray.700">
            {formatNum(node.openingDr)}
          </Td>
          <Td fontFamily="Noto Sans Lao, sans-serif" textAlign="right" fontSize="sm" color="gray.700">
            {formatNum(node.openingCr)}
          </Td>
          <Td fontFamily="Noto Sans Lao, sans-serif" textAlign="right" fontSize="sm" color="green.600" fontWeight="medium">
            {formatNum(node.movementDr)}
          </Td>
          <Td fontFamily="Noto Sans Lao, sans-serif" textAlign="right" fontSize="sm" color="red.600" fontWeight="medium">
            {formatNum(node.movementCr)}
          </Td>
          <Td fontFamily="Noto Sans Lao, sans-serif" textAlign="right" fontSize="sm" color="blue.700" fontWeight="semibold">
            {formatNum(node.endingDr)}
          </Td>
          <Td fontFamily="Noto Sans Lao, sans-serif" textAlign="right" fontSize="sm" color="purple.700" fontWeight="semibold">
            {formatNum(node.endingCr)}
          </Td>
        </Tr>

        {isParent &&
          isExpanded &&
          node.children.map((c) => renderNode(c, level + 1))}
      </React.Fragment>
    );
  };
  return (
     <Box 
    
      borderRadius="xl" 
      overflow="hidden"
      boxShadow="xl"
      border="1px solid"
      borderColor="gray.100"
    >
      <Box overflowX="auto">
        <Table size="sm" variant="simple">
          <Thead>
            <Tr >
              <Th 
                fontFamily="Noto Sans Lao, sans-serif" 
                rowSpan={2}
                color="black"
                fontSize="xs"
                fontWeight="bold"
                textTransform="none"
                py={4}
                borderBottom="2px solid"
                borderColor="blue.800"
              >
                ເລກບັນຊີ
              </Th>
              <Th 
                fontFamily="Noto Sans Lao, sans-serif" 
                rowSpan={2}
                color="black"
                fontSize="xs"
                fontWeight="bold"
                textTransform="none"
                py={4}
                borderBottom="2px solid"
                borderColor="blue.800"
              >
                ຊື່ບັນຊີ
              </Th>
              <Th
                fontFamily="Noto Sans Lao, sans-serif"
                colSpan={2}
                textAlign="center"
                color="black"
                fontSize="xs"
                fontWeight="bold"
                textTransform="none"
                borderBottom="1px solid"
                borderColor="blue.500"
                py={3}
              >
                ຍອດຍົກມາ
              </Th>
              <Th
                fontFamily="Noto Sans Lao, sans-serif"
                colSpan={2}
                textAlign="center"
                color="black"
                fontSize="xs"
                fontWeight="bold"
                textTransform="none"
                borderBottom="1px solid"
                borderColor="blue.500"
                py={3}
              >
                ເຄື່ອນໄຫວ
              </Th>
              <Th
                fontFamily="Noto Sans Lao, sans-serif"
                colSpan={2}
                textAlign="center"
                color="black"
                fontSize="xs"
                fontWeight="bold"
                textTransform="none"
                borderBottom="1px solid"
                borderColor="blue.500"
                py={3}
              >
                ຍອດເຫຼືອ
              </Th>
            </Tr>
            <Tr bg="blue.600">
              <Th 
                fontFamily="Noto Sans Lao, sans-serif" 
                textAlign="right"
                color="black"
                fontSize="xs"
                fontWeight="semibold"
                textTransform="none"
                py={3}
              >
                ເບື້ອງໜີ້
              </Th>
              <Th 
                fontFamily="Noto Sans Lao, sans-serif" 
                textAlign="right"
                color="black"
                fontSize="xs"
                fontWeight="semibold"
                textTransform="none"
                py={3}
              >
                ເບື້ອງມີ
              </Th>
              <Th 
                fontFamily="Noto Sans Lao, sans-serif" 
                textAlign="right"
                color="black"
                fontSize="xs"
                fontWeight="semibold"
                textTransform="none"
                py={3}
              >
                ເບື້ອງໜີ້
              </Th>
              <Th 
                fontFamily="Noto Sans Lao, sans-serif" 
                textAlign="right"
                color="black"
                fontSize="xs"
                fontWeight="semibold"
                textTransform="none"
                py={3}
              >
                ເບື້ອງມີ
              </Th>
              <Th 
                fontFamily="Noto Sans Lao, sans-serif" 
                textAlign="right"
                color="black"
                fontSize="xs"
                fontWeight="semibold"
                textTransform="none"
                py={3}
              >
                ເບື້ອງໜີ້
              </Th>
              <Th 
                fontFamily="Noto Sans Lao, sans-serif" 
                textAlign="right"
                color="black"
                fontSize="xs"
                fontWeight="semibold"
                textTransform="none"
                py={3}
              >
                ເບື້ອງມີ
              </Th>
            </Tr>
          </Thead>

          <Tbody>
            {tree.map((root) => renderNode(root))}
            {totals && (
              <Tr 
                bg="linear-gradient(to right, var(--chakra-colors-gray-100), var(--chakra-colors-gray-200))" 
                fontWeight="bold"
                borderTop="3px solid"
                borderColor="blue.600"
              >
                <Td fontFamily="Noto Sans Lao, sans-serif" colSpan={2} py={4}>
                  <Flex align="center" gap={2}>
                    <Badge colorScheme="blue" fontSize="xs" px={3} py={1} borderRadius="md">
                      TOTAL
                    </Badge>
                  </Flex>
                </Td>
                <Td fontFamily="Noto Sans Lao, sans-serif" textAlign="right" color="gray.800" fontSize="sm">
                  {formatNum(totals.openingDr)}
                </Td>
                <Td fontFamily="Noto Sans Lao, sans-serif" textAlign="right" color="gray.800" fontSize="sm">
                  {formatNum(totals.openingCr)}
                </Td>
                <Td fontFamily="Noto Sans Lao, sans-serif" textAlign="right" color="green.700" fontSize="sm">
                  {formatNum(totals.movementDr)}
                </Td>
                <Td fontFamily="Noto Sans Lao, sans-serif" textAlign="right" color="red.700" fontSize="sm">
                  {formatNum(totals.movementCr)}
                </Td>
                <Td fontFamily="Noto Sans Lao, sans-serif" textAlign="right" color="blue.800" fontSize="sm">
                  {formatNum(totals.endingDr)}
                </Td>
                <Td fontFamily="Noto Sans Lao, sans-serif" textAlign="right" color="purple.800" fontSize="sm">
                  {formatNum(totals.endingCr)}
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
};

export default AccountTreeTable;
