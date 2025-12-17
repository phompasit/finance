import React from "react";
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Checkbox,
  Box,
  Flex,
  HStack,
  IconButton,
  Badge,
  Text,
  Spinner,
  Tooltip,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from "@chakra-ui/react";
import {
  Edit,
  Eye,
  MoreVertical,
  RefreshCw,
  Trash2,
} from "lucide-react/dist/cjs/lucide-react";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@chakra-ui/icons";

export default React.memo(function PrepaidTable({
  advances,
  selected,
  onSelect,
  loading,
  page,
  setPage,
  totalPages,
  allChecked,
  isIndeterminate,
  handleSelectAll,
  pageData,
  STATUS_CONFIG,
  TYPE_CONFIG,
  formatDate,
  shortDesc,
  user,
  handleDetail,
  setEditing,
  setEditForm,
  onEditOpen,
  setTransTarget,
  onTransOpen,
  closeAdvanceA,
  reopenAdvanceA,
  deleteAdvanceA,
  handleStatus,
  handleSendEdit,
}) {
  const toggle = (item) => {
    const exists = selected.find((i) => i._id === item._id);
    onSelect(
      exists ? selected.filter((i) => i._id !== item._id) : [...selected, item]
    );
  };

  return (
    <>
      <Box bg="white" borderRadius="md" boxShadow="sm" overflowX="auto">
        {loading && !advances.length ? (
          <Flex justify="center" align="center" minH="200px">
            <Spinner size="lg" color="blue.500" />
          </Flex>
        ) : advances.length === 0 ? (
          <Flex justify="center" align="center" minH="200px">
            <Text color="gray.500" fontFamily="Noto Sans Lao, sans-serif">
              ບໍ່ພົບຂໍ້ມູນ
            </Text>
          </Flex>
        ) : (
          <Table variant="simple" size="sm">
            <Thead bg="gray.50">
              <Tr>
                <Th>
                  <Checkbox
                    isChecked={allChecked}
                    isIndeterminate={isIndeterminate}
                    onChange={handleSelectAll}
                  />
                </Th>
                <Th fontFamily="Noto Sans Lao, sans-serif">ວັນທີ່</Th>
                <Th fontFamily="Noto Sans Lao, sans-serif">ເລກທີ່</Th>
                <Th fontFamily="Noto Sans Lao, sans-serif">ຜູ້ເບີກ</Th>
                <Th fontFamily="Noto Sans Lao, sans-serif">ລາຍລະອຽດ</Th>
                <Th fontFamily="Noto Sans Lao, sans-serif">ປະເພດ</Th>
                <Th fontFamily="Noto Sans Lao, sans-serif" isNumeric>
                  ງົບຂໍເບິກ
                </Th>

                <Th fontFamily="Noto Sans Lao, sans-serif">ສະຖານະ</Th>
                <Th fontFamily="Noto Sans Lao, sans-serif">ດຳເນີນການ</Th>
                <Th fontFamily="Noto Sans Lao, sans-serif">ຈັດການ</Th>
              </Tr>
            </Thead>
            <Tbody>
              {pageData?.map((advance) => {
                // 🔹 รวมสกุลเงินจาก summary และ amount_requested ทั้งหมด
                const currencies = new Set([
                  ...(advance.amount_requested?.map((a) => a.currency) || []),
                  ...Object.keys(advance.summary || {}),
                ]);

                // 🔹 สร้าง rowData รวมทุกสกุลเงิน
                const rowData = Array.from(currencies).map((currency) => {
                  const requested =
                    advance.amount_requested?.find(
                      (a) => a.currency === currency
                    )?.amount || 0;

                  return {
                    id: advance?._id,
                    currency,
                    summary: advance.summary?.[currency] || {},
                    requested,
                    status_Ap: advance.status_Ap,
                    serial: advance.serial || "-", // ถ้าต้องการโชว์เลข serial ด้วย
                  };
                });

                const statusConfig =
                  STATUS_CONFIG[advance.status] || STATUS_CONFIG.pending;
                const typeConfig =
                  TYPE_CONFIG[advance.type] || TYPE_CONFIG.employee;

                return (
                  <React.Fragment key={advance._id}>
                    {rowData.map(
                      (
                        { currency, summary, requested, serial, status_Ap, id },
                        idx
                      ) => (
                        <Tr
                          key={`${advance._id}-${currency}`}
                          _hover={{ bg: "gray.50" }}
                        >
                          {/* ✅ Checkbox */}
                          {idx === 0 && (
                            <Td
                              fontFamily="Noto Sans Lao, sans-serif"
                              rowSpan={rowData.length}
                            >
                              <Checkbox
                                isChecked={selected?.some((i) => i?._id === id)}
                                onChange={() => handleToggle(advance)}
                              />
                            </Td>
                          )}

                          {/* ✅ วันที่ */}
                          {idx === 0 && (
                            <Td
                              fontFamily="Noto Sans Lao, sans-serif"
                              rowSpan={rowData.length}
                            >
                              {formatDate(new Date(advance.request_date))}
                            </Td>
                          )}
                          {idx === 0 && (
                            <Td
                              rowSpan={rowData.length}
                              fontFamily="Noto Sans Lao, sans-serif"
                            >
                              {serial}
                            </Td>
                          )}
                          {/* ✅ พนักงาน */}
                          {idx === 0 && (
                            <Td
                              fontFamily="Noto Sans Lao, sans-serif"
                              rowSpan={rowData.length}
                            >
                              {advance.employee_id?.full_name || "—"}
                            </Td>
                          )}

                          {/* ✅ ຈຸດປະສົງ */}
                          {idx === 0 && (
                            <Td rowSpan={rowData.length} maxW="300px">
                              <Tooltip label={advance.purpose} placement="top">
                                <Text
                                  fontFamily="Noto Sans Lao, sans-serif"
                                  isTruncated
                                >
                                  {shortDesc(advance.purpose)}
                                </Text>
                              </Tooltip>
                            </Td>
                          )}

                          {/* ✅ ประเภท */}
                          {idx === 0 && (
                            <Td rowSpan={rowData.length}>
                              <Badge
                                fontFamily="Noto Sans Lao, sans-serif"
                                colorScheme={typeConfig.colorScheme}
                              >
                                {typeConfig.label}
                              </Badge>
                            </Td>
                          )}

                          {/* ✅ ยอดเบิก */}
                          <Td
                            fontFamily="Noto Sans Lao, sans-serif"
                            isNumeric
                            fontWeight="medium"
                          >
                            {requested?.toLocaleString()} {currency}
                          </Td>

                          {/* ✅ สถานะ */}
                          {idx === 0 && (
                            <Td rowSpan={rowData.length}>
                              <Badge
                                fontFamily="Noto Sans Lao, sans-serif"
                                colorScheme={statusConfig.colorScheme}
                              >
                                {statusConfig.label}
                              </Badge>
                            </Td>
                          )}
                          {idx === 0 && (
                            <Td rowSpan={rowData.length}>
                              {user?.role === "admin" && (
                                <HStack>
                                  <Button
                                    fontSize={"20"}
                                    size="sm"
                                    rounded="lg"
                                    fontFamily="Noto Sans Lao, sans-serif"
                                    colorScheme={
                                      status_Ap === "pending"
                                        ? "yellow"
                                        : "gray"
                                    }
                                    variant={
                                      status_Ap === "pending"
                                        ? "solid"
                                        : "outline"
                                    }
                                    onClick={() => handleStatus(id, "pending")}
                                  >
                                    ລໍຖ້າ
                                  </Button>
                                  <Button
                                    fontSize={"20"}
                                    size="sm"
                                    rounded="lg"
                                    fontFamily="Noto Sans Lao, sans-serif"
                                    colorScheme={
                                      status_Ap === "approve" ? "green" : "gray"
                                    }
                                    variant={
                                      status_Ap === "approve"
                                        ? "solid"
                                        : "outline"
                                    }
                                    onClick={() => handleStatus(id, "approve")}
                                  >
                                    ອະນຸມັດ
                                  </Button>
                                  <Button
                                    fontSize={"20"}
                                    size="sm"
                                    rounded="lg"
                                    fontFamily="Noto Sans Lao, sans-serif"
                                    colorScheme={
                                      status_Ap === "cancel" ? "red" : "gray"
                                    }
                                    variant={
                                      status_Ap === "cancel"
                                        ? "solid"
                                        : "outline"
                                    }
                                    onClick={() => handleStatus(id, "cancel")}
                                  >
                                    ຍົກເລີກ
                                  </Button>
                                </HStack>
                              )}
                            </Td>
                          )}
                          {/* ✅ เมนู */}
                          {idx === 0 && (
                            <Td rowSpan={rowData.length}>
                              <Menu>
                                <MenuButton
                                  fontFamily="Noto Sans Lao, sans-serif"
                                  as={IconButton}
                                  icon={<MoreVertical size={16} />}
                                  variant="ghost"
                                  size="sm"
                                />
                                <MenuList>
                                  <MenuItem
                                    fontFamily="Noto Sans Lao, sans-serif"
                                    icon={<Eye size={16} />}
                                    onClick={() => handleDetail(advance)}
                                  >
                                    ເບີ່ງລາຍລະອຽດ
                                  </MenuItem>
                                  <MenuItem
                                    fontFamily="Noto Sans Lao, sans-serif"
                                    icon={<Edit size={16} />}
                                    onClick={() => {
                                      handleSendEdit({
                                        ...advance,
                                        amounts: advance?.amount_requested,
                                        categoryId: advance.categoryId, // ⭐ สำคัญมาก
                                      });
                                    }}
                                  >
                                    ແກ້ໄຂ
                                  </MenuItem>
                                  <MenuItem
                                    fontFamily="Noto Sans Lao, sans-serif"
                                    icon={<RefreshCw size={16} />}
                                    onClick={() => {
                                      setTransTarget(advance);
                                      onTransOpen();
                                    }}
                                  >
                                    ບັນທຶກໃຊ້ຈິງ / ຄືນ
                                  </MenuItem>
                                  {advance.status !== "closed" ? (
                                    <MenuItem
                                      fontFamily="Noto Sans Lao, sans-serif"
                                      icon={<ChevronDownIcon />}
                                      onClick={() => closeAdvanceA(advance._id)}
                                    >
                                      ປິດລາຍການ
                                    </MenuItem>
                                  ) : (
                                    <MenuItem
                                      fontFamily="Noto Sans Lao, sans-serif"
                                      icon={<ChevronDownIcon />}
                                      onClick={() =>
                                        reopenAdvanceA(advance._id)
                                      }
                                    >
                                      ເປີດລາຍການ
                                    </MenuItem>
                                  )}
                                  <MenuItem
                                    fontFamily="Noto Sans Lao, sans-serif"
                                    icon={<Trash2 size={16} />}
                                    onClick={() => deleteAdvanceA(advance._id)}
                                    color="red.500"
                                  >
                                    ລົບ
                                  </MenuItem>
                                </MenuList>
                              </Menu>
                            </Td>
                          )}
                        </Tr>
                      )
                    )}
                  </React.Fragment>
                );
              })}
            </Tbody>
          </Table>
        )}
        <HStack paddingTop={"40px"} spacing={2} justify="center">
          <IconButton
            icon={<ChevronLeftIcon />}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            isDisabled={page === 1}
            colorScheme="purple"
            variant="outline"
            borderRadius="full"
            aria-label="Previous page"
            _hover={{
              transform: "scale(1.1)",
            }}
          />

          <Badge
            colorScheme="purple"
            fontSize="md"
            px={4}
            py={2}
            borderRadius="full"
          >
            {page} / {totalPages}
          </Badge>

          <IconButton
            icon={<ChevronRightIcon />}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            isDisabled={page === totalPages}
            colorScheme="purple"
            variant="outline"
            borderRadius="full"
            aria-label="Next page"
            _hover={{
              transform: "scale(1.1)",
            }}
          />
        </HStack>
      </Box>
    </>
  );
});
