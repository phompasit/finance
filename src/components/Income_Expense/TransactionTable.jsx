"use client";

import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Checkbox,
  HStack,
  IconButton,
  Text,
  Badge,
  Tooltip,
  Button,
  VStack,
  Icon,
  Box,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from "@chakra-ui/react";
import React, { useMemo } from "react";

function TransactionTable({
  tableHeaderBg,
  hoverBg,
  labelClr,

  pageData,
  offset,

  selectedTransactions,
  setSelectedTransactions,

  paymentMethodLabels,
  status_Ap,
  statusColors,

  shortDesc,
  formatDate,

  user,
  handleStatus,
  handleViews,
  onDeleteClick,

  EditIcon,
  ViewIcon,
  DeleteIcon,
  FileText,
  Calendar,

  isWarningIsOpen,
  cancelRef,
  onWarningClose,
  confirmDelete,

  handleEditClick,
}) {
  const pageDataSorted = useMemo(
    () => pageData.slice().sort((a, b) => new Date(b.date) - new Date(a.date)),
    [pageData]
  );
  return (
    <Box
      bg="whiteAlpha.800"
      backdropFilter="blur(14px)"
      rounded="3xl"
      p={4}
      shadow="xl"
    >
      <Table variant="unstyled" size="sm">
        {/* ===== HEADER ===== */}
        <Thead position="sticky" top={0} zIndex={1}>
          <Tr bgGradient="linear(to-r, teal.500, cyan.500)" rounded="xl">
            <Th>
              <Checkbox
                colorScheme="whiteAlpha"
                isChecked={
                  selectedTransactions.length === pageDataSorted.length &&
                  pageDataSorted.length > 0
                }
                onChange={(e) =>
                  setSelectedTransactions(
                    e.target.checked ? pageDataSorted : []
                  )
                }
              />
            </Th>

            {[
              "ລຳດັບ",
              "ເລກທີ່",
              "ວັນທີ່",
              "ປະເພດ",
              "ລາຍລະອຽດ",
              "ວິທີຊຳລະ",
              "ຈຳນວນ",
              "ຊຳລະ",
              "ຜູ້ສ້າງ",
              "ສະຖານະ",
              "ສະຖານະ",
              "ການກະທຳ",
            ].map((h) => (
              <Th
                fontFamily="Noto Sans Lao, sans-serif"
                key={h}
                fontSize="xs"
                fontWeight="700"
                color="white"
                letterSpacing="wide"
              >
                {h}
              </Th>
            ))}
          </Tr>
        </Thead>

        {/* ===== BODY ===== */}
        <Tbody>
          {pageDataSorted.length === 0 ? (
            <Tr>
              <Td colSpan={12} py={16}>
                <VStack spacing={4}>
                  <Icon as={FileText} boxSize={14} color="gray.400" />
                  <Text
                    fontFamily="Noto Sans Lao, sans-serif"
                    fontSize="lg"
                    opacity={0.7}
                  >
                    ບໍ່ມີຂໍ້ມູນ
                  </Text>
                </VStack>
              </Td>
            </Tr>
          ) : (
            pageDataSorted.map((transaction, idx) => (
              <Tr
                key={transaction._id}
                bg="white"
                rounded="2xl"
                _hover={{
                  bg: "gray.50",
                  transform: "translateY(-2px)",
                  shadow: "md",
                }}
                transition="all 0.2s ease"
              >
                {/* SELECT */}
                <Td>
                  <Checkbox
                    colorScheme="teal"
                    isChecked={selectedTransactions.includes(transaction)}
                    onChange={(e) =>
                      setSelectedTransactions(
                        e.target.checked
                          ? [...selectedTransactions, transaction]
                          : selectedTransactions.filter(
                              (t) => t._id !== transaction._id
                            )
                      )
                    }
                  />
                </Td>

                {/* INDEX */}
                <Td fontFamily="Noto Sans Lao, sans-serif" fontWeight="700">
                  {offset + idx + 1}
                </Td>

                {/* SERIAL */}
                <Td fontFamily="Noto Sans Lao, sans-serif" fontWeight="600">
                  {transaction.serial || "-"}
                </Td>

                {/* DATE */}
                <Td fontFamily="Noto Sans Lao, sans-serif">
                  <HStack spacing={2}>
                    <Icon  as={Calendar} boxSize={4} color="gray.400" />
                    <Text   fontFamily="Noto Sans Lao, sans-serif">{formatDate(new Date(transaction.date))}</Text>
                  </HStack>
                </Td>

                {/* TYPE */}
                <Td fontFamily="Noto Sans Lao, sans-serif">
                  <Badge
                    fontFamily="Noto Sans Lao, sans-serif"
                    rounded="full"
                    px={3}
                    colorScheme={
                      transaction.type === "income" ? "green" : "red"
                    }
                  >
                    {transaction.type === "income" ? "💰 ລາຍຮັບ" : "💸 ລາຍຈ່າຍ"}
                  </Badge>
                </Td>

                {/* DESCRIPTION */}
                <Td fontFamily="Noto Sans Lao, sans-serif" maxW="220px">
                  <Tooltip label={transaction.note}>
                    <Text   fontFamily="Noto Sans Lao, sans-serif" noOfLines={1} fontWeight="500">
                      {transaction.description}
                    </Text>
                  </Tooltip>
                </Td>

                {/* PAYMENT */}
                <Td fontFamily="Noto Sans Lao, sans-serif">
                  <Badge   fontFamily="Noto Sans Lao, sans-serif" rounded="md" colorScheme="blue">
                    {paymentMethodLabels[transaction.paymentMethod]}
                  </Badge>
                </Td>

                {/* AMOUNT */}
                <Td fontFamily="Noto Sans Lao, sans-serif">
                  <VStack justifyContent={'flex-start'} w={'100px'} align="start" spacing={0}>
                    {transaction.amounts.map((amt, i) => (
                      <Text
                        fontFamily="Noto Sans Lao, sans-serif"
                        key={i}
                        fontWeight="700"
                        color={
                          transaction.type === "income"
                            ? "green.500"
                            : "red.500"
                        }
                      >
                        {transaction.type === "income" ? "+" : "-"}
                        {Number(amt.amount).toLocaleString()} {amt.currency}
                      </Text>
                    ))}
                  </VStack>
                </Td>

                {/* PAYMENT STATUS */}
                <Td fontFamily="Noto Sans Lao, sans-serif">
                  <Badge
                    fontFamily="Noto Sans Lao, sans-serif"
                    rounded="full"
                    px={3}
                    colorScheme={
                      transaction.status === "paid" ? "green" : "orange"
                    }
                  >
                    {transaction.status === "paid" ? "✅ ຊຳລະແລ້ວ" : "⏳ ລໍຖ້າ"}
                  </Badge>
                </Td>

                {/* CREATED BY */}
                <Td fontFamily="Noto Sans Lao, sans-serif">
                  <Badge fontFamily="Noto Sans Lao, sans-serif" rounded="full">
                    👤 {transaction?.createdBy?.username}
                  </Badge>
                </Td>

                {/* APPROVAL */}
                <Td>
                  {transaction.type !== "income" ? (
                    <Badge
                      rounded="lg"
                      px={3}
                      py={1}
                      fontFamily="Noto Sans Lao, sans-serif"
                      colorScheme={statusColors[transaction.status_Ap]}
                    >
                      {status_Ap[transaction.status_Ap]}
                    </Badge>
                  ) : (
                    "-"
                  )}
                </Td>
                <Td>
                  {user?.role === "admin" && transaction.type !== "income" && (
                   <HStack>
                       <Button
                        fontFamily="Noto Sans Lao, sans-serif"
                        size="sm"
                        colorScheme="yellow"
                        variant={
                          transaction.status_Ap === "pending"
                            ? "solid"
                            : "outline"
                        }
                        onClick={() => handleStatus(transaction, "pending")}
                      >
                        {" "}
                        ລໍຖ້າ{" "}
                      </Button>
                      <Button
                        size="sm"
                        fontFamily="Noto Sans Lao, sans-serif"
                        colorScheme="green"
                        variant={
                          transaction.status_Ap === "approve"
                            ? "solid"
                            : "outline"
                        }
                        onClick={() => handleStatus(transaction, "approve")}
                      >
                        {" "}
                        ອະນຸມັດ{" "}
                      </Button>
                      <Button
                        size="sm"
                        fontFamily="Noto Sans Lao, sans-serif"
                        colorScheme="red"
                        variant={
                          transaction.status_Ap === "cancel"
                            ? "solid"
                            : "outline"
                        }
                        onClick={() => handleStatus(transaction, "cancel")}
                      >
                        {" "}
                        ຍົກເລີກ{" "}
                      </Button>
                   </HStack>
                  )}
                </Td>
                {/* ACTIONS */}
                <Td>
                  <HStack spacing={1}>
                    F
                    <IconButton
                      icon={<EditIcon />}
                      size="sm"
                      variant="ghost"
                      rounded="full"
                      aria-label="edit"
                      onClick={() => handleEditClick(transaction)}
                    />
                    <IconButton
                      icon={<ViewIcon />}
                      size="sm"
                      variant="ghost"
                      rounded="full"
                      aria-label="view"
                      onClick={() => handleViews(transaction)}
                    />
                    <IconButton
                      icon={<DeleteIcon />}
                      size="sm"
                      variant="ghost"
                      rounded="full"
                      colorScheme="red"
                      aria-label="delete"
                      onClick={() => onDeleteClick(transaction._id)}
                    />
                  </HStack>
                </Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>
    </Box>
  );
}
export default React.memo(TransactionTable);
