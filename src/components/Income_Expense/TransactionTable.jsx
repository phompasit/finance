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
    <Table variant="simple">
      {/* HEADER */}
      <Thead bg={tableHeaderBg}>
        <Tr>
          <Th>
            <Checkbox
              colorScheme="teal"
              isChecked={
                selectedTransactions.length === pageDataSorted.length &&
                pageDataSorted.length > 0
              }
              onChange={(e) =>
                setSelectedTransactions(e.target.checked ? pageDataSorted : [])
              }
            />
          </Th>
          <Th fontFamily="Noto Sans Lao, sans-serif" color="white">ລຳດັບ</Th>
          <Th fontFamily="Noto Sans Lao, sans-serif" color="white">ເລກທີ່</Th>
          <Th fontFamily="Noto Sans Lao, sans-serif" color="white">ວັນທີ່</Th>
          <Th fontFamily="Noto Sans Lao, sans-serif" color="white">ປະເພດ</Th>
          <Th fontFamily="Noto Sans Lao, sans-serif" color="white">ລາຍລະອຽດ</Th>
          <Th fontFamily="Noto Sans Lao, sans-serif" color="white">ວິທີຊຳລະ</Th>
          <Th fontFamily="Noto Sans Lao, sans-serif" color="white">ຈຳນວນເງິນ</Th>
          <Th fontFamily="Noto Sans Lao, sans-serif" color="white">ສະຖານະຊຳລະ</Th>
          <Th fontFamily="Noto Sans Lao, sans-serif" color="white">ຜູ້ສ້າງ</Th>
          <Th fontFamily="Noto Sans Lao, sans-serif" color="white">ສະຖານະ</Th>
          <Th fontFamily="Noto Sans Lao, sans-serif" color="white">ການກະທຳ</Th>
        </Tr>
      </Thead>

      {/* BODY */}
      <Tbody>
        {pageDataSorted.length === 0 ? (
          <Tr>
            <Td colSpan={12} textAlign="center" py={12}>
              <VStack spacing={3}>
                <Icon as={FileText} boxSize={12} color="gray.400" />
                <Text fontFamily="Noto Sans Lao, sans-serif" color={labelClr} fontSize="lg">
                  ບໍ່ມີຂໍ້ມູນ
                </Text>
              </VStack>
            </Td>
          </Tr>
        ) : (
          pageDataSorted.map((transaction, idx) => (
            <Tr
              key={transaction._id}
              _hover={{ bg: hoverBg }}
              transition="all 0.2s"
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
              <Td>
                <Text fontFamily="Noto Sans Lao, sans-serif" fontWeight="600" color={labelClr}>
                  {offset + idx + 1}
                </Text>
              </Td>

              <Td>
                <Text fontFamily="Noto Sans Lao, sans-serif" fontWeight="600" color={labelClr}>
                  {transaction.serial || "-"}
                </Text>
              </Td>

              {/* DATE */}
              <Td>
                <HStack spacing={2}>
                  <Icon as={Calendar} boxSize={4} color="gray.400" />
                  <Text fontFamily="Noto Sans Lao, sans-serif" color={labelClr}>
                    {formatDate(new Date(transaction.date))}
                  </Text>
                </HStack>
              </Td>

              {/* TYPE */}
              <Td>
                <Badge
                  px={3}
                  py={1}
                  fontFamily="Noto Sans Lao, sans-serif"
                  rounded="full"
                  colorScheme={transaction.type === "income" ? "green" : "red"}
                >
                  {transaction.type === "income" ? "ລາຍຮັບ" : "ລາຍຈ່າຍ"}
                </Badge>
              </Td>

              {/* DESCRIPTION */}
              <Td>
                <Tooltip label={transaction.note}>
                  <Text fontFamily="Noto Sans Lao, sans-serif" color={labelClr} fontWeight="500">
                    {shortDesc(transaction.description)}
                  </Text>
                </Tooltip>
              </Td>

              {/* PAYMENT METHOD */}
              <Td>
                <Badge fontFamily="Noto Sans Lao, sans-serif" colorScheme="blue" rounded="md">
                  {paymentMethodLabels[transaction.paymentMethod]}
                </Badge>
              </Td>

              {/* AMOUNTS */}
              <Td>
                <VStack align="start" spacing={1}>
                  {transaction.amounts.map((amt, i) => (
                    <HStack key={i} spacing={1}>
                      <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                        fontWeight="bold"
                        color={
                          transaction.type === "income"
                            ? "green.500"
                            : "red.500"
                        }
                      >
                        {transaction.type === "income" ? "+" : "-"}
                        {parseFloat(amt.amount).toLocaleString()} {amt.currency}
                      </Text>
                    </HStack>
                  ))}
                </VStack>
              </Td>

              {/* STATUS */}
              <Td>
                <Badge
                  px={3}
                  py={1}
                  fontFamily="Noto Sans Lao, sans-serif"
                  rounded="full"
                  colorScheme={
                    transaction.status === "paid" ? "green" : "orange"
                  }
                >
                  {transaction.status === "paid"
                    ? "✓ ຊຳລະແລ້ວ"
                    : "⏳ ຍັງບໍ່ຊຳລະ"}
                </Badge>
              </Td>

              {/* CREATED BY */}
              <Td>
                <Badge fontFamily="Noto Sans Lao, sans-serif">{transaction?.createdBy?.username}</Badge>
              </Td>

              {/* STATUS_AP */}
              <Td>
                {transaction.type !== "income" ? (
                  <Badge
                    px={4}
                    py={2}
                    fontFamily="Noto Sans Lao, sans-serif"
                    colorScheme={statusColors[transaction.status_Ap]}
                    variant="solid"
                    rounded="lg"
                  >
                    {status_Ap[transaction.status_Ap]}
                  </Badge>
                ) : (
                  "-"
                )}
              </Td>

              {/* ACTIONS */}
              <Td>
                <HStack spacing={2}>
                  {/* ADMIN STATUS BUTTONS */}
                  {user?.role === "admin" && transaction.type !== "income" && (
                    <HStack spacing={2}>
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
                        ລໍຖ້າ
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
                        ອະນຸມັດ
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
                        ຍົກເລີກ
                      </Button>
                    </HStack>
                  )}

                  {/* EDIT */}
                  <Tooltip label="ແກ້ໄຂ">
                    <IconButton
                      icon={<EditIcon />}
                      size="sm"
                      fontFamily="Noto Sans Lao, sans-serif"
                      variant="ghost"
                      colorScheme="blue"
                      onClick={() => handleEditClick(transaction)}
                    />
                  </Tooltip>

                  {/* VIEW */}
                  <Tooltip label="ເບີງລາຍລະອຽດ">
                    <IconButton
                      icon={<ViewIcon />}
                      size="sm"
                      fontFamily="Noto Sans Lao, sans-serif"
                      colorScheme="blue"
                      variant="ghost"
                      onClick={() => handleViews(transaction)}
                    />
                  </Tooltip>

                  {/* DELETE */}
                  <Tooltip label="ລຶບ">
                    <IconButton
                      icon={<DeleteIcon />}
                      size="sm"
                      fontFamily="Noto Sans Lao, sans-serif"
                      colorScheme="red"
                      variant="ghost"
                      onClick={() => onDeleteClick(transaction._id)}
                    />
                  </Tooltip>
                </HStack>
              </Td>
            </Tr>
          ))
        )}
      </Tbody>

      {/* ALERT DIALOG */}
      <AlertDialog
        isOpen={isWarningIsOpen}
        leastDestructiveRef={cancelRef}
        onClose={onWarningClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              ລຶບລາຍການ
            </AlertDialogHeader>

            <AlertDialogBody>ທ່ານແນ່ໃຈບໍ່ວ່າຈະລຶບລາຍການນີ້?</AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onWarningClose}>
                ຍົກເລີກ
              </Button>
              <Button colorScheme="red" onClick={confirmDelete} ml={3}>
                ລຶບ
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Table>
  );
}
export default React.memo(TransactionTable);
