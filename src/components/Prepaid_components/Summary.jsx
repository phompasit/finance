import { SimpleGrid, Box, Text, Flex, Stat, StatLabel, StatNumber, useColorModeValue } from "@chakra-ui/react";
import { useMemo } from "react";
import { calcSummary } from "./prepaidSummary";

export default function Summary({ advances }) {
  const summary = useMemo(() => calcSummary(advances), [advances]);
  const textColor = useColorModeValue("gray.700", "gray.200");
  return (
   <>
     <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
           {summary.map((item) => (
             <Box
               key={item.currency}
               p={4}
               borderRadius="lg"
               boxShadow="md"
               transition="all 0.2s"
               _hover={{ transform: "scale(1.02)", boxShadow: "lg" }}
             >
               <Text
                 fontSize="lg"
                 fontWeight="bold"
                 mb={3}
                 color="blue.600"
                 fontFamily="Noto Sans Lao, sans-serif"
               >
                 {item.currency}
               </Text>
   
               <Flex justify="space-between" wrap="wrap" gap={3}>
                 <Stat minW="120px">
                   <StatLabel
                     fontFamily="Noto Sans Lao, sans-serif"
                     fontSize="sm"
                     color={textColor}
                   >
                     ຍອດເບີກ
                   </StatLabel>
                   <StatNumber
                     fontFamily="Noto Sans Lao, sans-serif"
                     fontSize="md"
                   >
                     {item.totalRequested?.toLocaleString()}
                   </StatNumber>
                 </Stat>
   
                 <Stat minW="120px">
                   <StatLabel
                     fontFamily="Noto Sans Lao, sans-serif"
                     fontSize="sm"
                     color={textColor}
                   >
                     ໃຊ້ຈິງ
                   </StatLabel>
                   <StatNumber
                     fontFamily="Noto Sans Lao, sans-serif"
                     fontSize="md"
                     color="purple.600"
                   >
                     {item.totalSpent?.toLocaleString()}
                   </StatNumber>
                 </Stat>
   
                 <Stat minW="120px">
                   <StatLabel
                     fontFamily="Noto Sans Lao, sans-serif"
                     fontSize="sm"
                     color={textColor}
                   >
                     ຄືນບໍລິສັດ
                   </StatLabel>
                   <StatNumber
                     fontFamily="Noto Sans Lao, sans-serif"
                     fontSize="md"
                     color="green.600"
                   >
                     {item.totalReturnCompany?.toLocaleString()}
                   </StatNumber>
                 </Stat>
   
                 <Stat minW="120px">
                   <StatLabel
                     fontFamily="Noto Sans Lao, sans-serif"
                     fontSize="sm"
                     color={textColor}
                   >
                     ຄືນພະນັກງານ
                   </StatLabel>
                   <StatNumber
                     fontFamily="Noto Sans Lao, sans-serif"
                     fontSize="md"
                     color="green.600"
                   >
                     {item.totalRefundEmployee.toLocaleString()}
                   </StatNumber>
                 </Stat>
               </Flex>
             </Box>
           ))}
         </SimpleGrid>
   </>
  );
}
