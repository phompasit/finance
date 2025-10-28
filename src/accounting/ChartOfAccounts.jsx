import React, { useState, useMemo } from "react";
import {
  ChakraProvider,
  Box,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Select,
  VStack,
  HStack,
  Text,
  Icon,
  useDisclosure,
  useToast,
  Flex,
  Badge,
  Divider,
  Switch,
  FormHelperText,
} from "@chakra-ui/react";
import {
  Search,
  Plus,
  Upload,
  ChevronRight,
  ChevronDown,
  FileText,
  Lock,
} from "lucide-react";

const MOCK_DATA = [
  {
    companyId: "1",
    parentCode: "",
    code: "1",
    name: "ຊັບສິນ (Asset)",
    type: "asset",
    category: "ອື່ນໆ",
    balanceDr: 0,
    balanceCr: 0,
    isMainAccount: true,
  },
  {
    companyId: "1",
    parentCode: "1",
    code: "101",
    name: "ເງິນສົດ",
    type: "asset",
    category: "ອື່ນໆ",
    balanceDr: 50000,
    balanceCr: 0,
    isMainAccount: false,
  },
  {
    companyId: "1",
    parentCode: "101",
    code: "101.01",
    name: "ເງິນສົດໃນມື",
    type: "asset",
    category: "ອື່ນໆ",
    balanceDr: 20000,
    balanceCr: 0,
    isMainAccount: false,
  },
  {
    companyId: "1",
    parentCode: "101",
    code: "101.02",
    name: "ເງິນສົດໃນທະນາຄານ",
    type: "asset",
    category: "ອື່ນໆ",
    balanceDr: 30000,
    balanceCr: 0,
    isMainAccount: false,
  },
  {
    companyId: "1",
    parentCode: "1",
    code: "102",
    name: "ລູກໜີ້ການຄ້າ",
    type: "asset",
    category: "ອື່ນໆ",
    balanceDr: 15000,
    balanceCr: 0,
    isMainAccount: false,
  },
  {
    companyId: "1",
    parentCode: "",
    code: "2",
    name: "ໜີ້ສິນ (Liability)",
    type: "liability",
    category: "ອື່ນໆ",
    balanceDr: 0,
    balanceCr: 0,
    isMainAccount: true,
  },
  {
    companyId: "1",
    parentCode: "2",
    code: "201",
    name: "ເຈົ້າໜີ້ການຄ້າ",
    type: "liability",
    category: "ອື່ນໆ",
    balanceDr: 0,
    balanceCr: 25000,
    isMainAccount: false,
  },
  {
    companyId: "1",
    parentCode: "",
    code: "3",
    name: "ທຶນ (Equity)",
    type: "equity",
    category: "ອື່ນໆ",
    balanceDr: 0,
    balanceCr: 0,
    isMainAccount: true,
  },
  {
    companyId: "1",
    parentCode: "3",
    code: "301",
    name: "ທຶນຈົດທະບຽນ",
    type: "equity",
    category: "ອື່ນໆ",
    balanceDr: 0,
    balanceCr: 100000,
    isMainAccount: false,
  },
  {
    companyId: "1",
    parentCode: "",
    code: "4",
    name: "ລາຍຮັບ (Income)",
    type: "income",
    category: "ອື່ນໆ",
    balanceDr: 0,
    balanceCr: 0,
    isMainAccount: true,
  },
  {
    companyId: "1",
    parentCode: "4",
    code: "401",
    name: "ລາຍຮັບຈາກການຂາຍ",
    type: "income",
    category: "ອື່ນໆ",
    balanceDr: 0,
    balanceCr: 80000,
    isMainAccount: false,
  },
  {
    companyId: "1",
    parentCode: "",
    code: "5",
    name: "ຄ່າໃຊ້ຈ່າຍ (Expense)",
    type: "expense",
    category: "ອື່ນໆ",
    balanceDr: 0,
    balanceCr: 0,
    isMainAccount: true,
  },
  {
    companyId: "1",
    parentCode: "5",
    code: "501",
    name: "ຕົ້ນທຶນຂາຍ",
    type: "expense",
    category: "ຕົ້ນທຶນຂາຍ",
    balanceDr: 40000,
    balanceCr: 0,
    isMainAccount: false,
  },
  {
    companyId: "1",
    parentCode: "5",
    code: "502",
    name: "ຄ່າໃຊ້ຈ່າຍບໍລິຫານ",
    type: "expense",
    category: "ຕົ້ນທຸນບໍລິຫານ",
    balanceDr: 10000,
    balanceCr: 0,
    isMainAccount: false,
  },
];

const TYPE_COLORS = {
  asset: "blue",
  liability: "red",
  equity: "purple",
  income: "green",
  expense: "orange",
};

const TreeNode = ({
  account,
  children,
  level,
  expanded,
  onToggle,
  onEdit,
  isAdmin,
}) => {
  const hasChildren = children && children.length > 0;
  const isExpanded = expanded[account.code];

  const balance = account.balanceDr - account.balanceCr;
  const balanceColor = balance >= 0 ? "green.600" : "red.600";

  const canEdit = isAdmin || !account.isMainAccount;

  return (
    <Box>
      <Flex
        align="center"
        py={2}
        px={3}
        pl={level * 8 + 3}
        _hover={{ bg: canEdit ? "gray.50" : "gray.100" }}
        cursor={canEdit ? "pointer" : "not-allowed"}
        onClick={() => canEdit && onEdit(account)}
        bg={account.isMainAccount ? "blue.50" : "white"}
        borderBottom="1px solid"
        borderColor="gray.100"
        position="relative"
      >
        {/* เส้นเชื่อมแนวตั้ง */}
        {level > 0 && (
          <Box
            position="absolute"
            left={level * 8 - 4}
            top={0}
            bottom="50%"
            width="2px"
            bg="gray.300"
          />
        )}

        {/* เส้นเชื่อมแนวนอน */}
        {level > 0 && (
          <Box
            position="absolute"
            left={level * 8 - 4} // ปรับจาก 8 → 20 เพื่อเพิ่มระยะไม่ชน text
            top="50%"
            transform="translateY(-50%)"
            width="20px"
            height="2px"
            bg="gray.300"
            zIndex={0} // ทำให้เส้นอยู่ข้างหลังตัวหนังสือ
          />
        )}

        <Box
          mr={2}
          onClick={(e) => {
            e.stopPropagation();
            hasChildren && onToggle(account.code);
          }}
          zIndex={1}
          bg="white"
          borderRadius="sm"
        >
          {hasChildren ? (
            <Icon
              as={isExpanded ? ChevronDown : ChevronRight}
              boxSize={4}
              color="gray.600"
            />
          ) : (
            <Box w={4} />
          )}
        </Box>

        <Badge
          colorScheme={TYPE_COLORS[account.type]}
          mr={2}
          fontSize="xs"
          minW="60px"
          textAlign="center"
          fontFamily="Noto Sans Lao, sans-serif"
        >
          {account.code}
        </Badge>

        <Text
          flex={1}
          fontSize="sm"
          fontFamily="Noto Sans Lao, sans-serif"
          fontWeight={
            account.isMainAccount ? "bold" : level === 0 ? "semibold" : "normal"
          }
          color={account.isMainAccount ? "blue.700" : "gray.700"}
        >
          {account.name}
        </Text>

        {account.isMainAccount && (
          <Icon as={Lock} boxSize={3} color="blue.500" mr={2} />
        )}

        <Text
          fontFamily="Noto Sans Lao, sans-serif"
          fontSize="sm"
          color={balanceColor}
          fontWeight="medium"
          mr={3}
          minW="80px"
          textAlign="right"
        >
          {balance.toLocaleString()}
        </Text>

        <Badge
          fontFamily="Noto Sans Lao, sans-serif"
          colorScheme="gray"
          fontSize="xs"
          minW="70px"
          textAlign="center"
        >
          {account.type}
        </Badge>
      </Flex>

      {hasChildren && isExpanded && (
        <Box position="relative">
          {/* เส้นแนวตั้งสำหรับ children */}
          <Box
            fontFamily="Noto Sans Lao, sans-serif"
            position="absolute"
            left={(level + 1) * 8 - 4}
            top={0}
            bottom={0}
            width="2px"
            bg="gray.300"
          />
          {children.map((child, index) => (
            <TreeNode
              key={child.account.code}
              account={child.account}
              children={child.children}
              level={level + 1}
              expanded={expanded}
              onToggle={onToggle}
              onEdit={onEdit}
              isAdmin={isAdmin}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

const ChartOfAccounts = () => {
  const [accounts, setAccounts] = useState(MOCK_DATA);
  const [searchTerm, setSearchTerm] = useState("");
  const [expanded, setExpanded] = useState({
    "1": true,
    "2": true,
    "3": true,
    "4": true,
    "5": true,
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState({
    parentCode: "",
    code: "",
    name: "",
    type: "asset",
    category: "ອື່ນໆ",
  });
  const [editingAccount, setEditingAccount] = useState(null);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isImportOpen,
    onOpen: onImportOpen,
    onClose: onImportClose,
  } = useDisclosure();
  const toast = useToast();

  const buildTree = (data, parentCode = "") => {
    return data
      .filter((acc) => acc.parentCode === parentCode)
      .map((acc) => ({
        account: acc,
        children: buildTree(data, acc.code),
      }));
  };

  const findMatchingCodes = (data, term) => {
    const matches = new Set();
    const lowerTerm = term.toLowerCase();

    data.forEach((acc) => {
      if (
        acc.code.toLowerCase().includes(lowerTerm) ||
        acc.name.toLowerCase().includes(lowerTerm) ||
        acc.type.toLowerCase().includes(lowerTerm) ||
        acc.category.toLowerCase().includes(lowerTerm)
      ) {
        matches.add(acc.code);
        let parent = acc.parentCode;
        while (parent) {
          matches.add(parent);
          const parentAcc = data.find((a) => a.code === parent);
          parent = parentAcc ? parentAcc.parentCode : "";
        }
      }
    });

    return matches;
  };

  const treeData = useMemo(() => {
    if (searchTerm) {
      const matchingCodes = findMatchingCodes(accounts, searchTerm);
      const filtered = accounts.filter((acc) => matchingCodes.has(acc.code));
      const newExpanded = {};
      matchingCodes.forEach((code) => {
        newExpanded[code] = true;
      });
      setExpanded(newExpanded);
      return buildTree(filtered);
    }
    return buildTree(accounts);
  }, [accounts, searchTerm]);

  const toggleNode = (code) => {
    setExpanded((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setFormData({
      parentCode: "",
      code: "",
      name: "",
      type: "asset",
      category: "ອື່ນໆ",
    });
    onOpen();
  };

  const handleEdit = (account) => {
    if (!isAdmin && account.isMainAccount) {
      toast({
        title: "ບໍ່ສາມາດແກ້ໄຂບັນຊີຫຼັກໄດ້",
        description: "ເຉພາະແອດມິນເທົ່ານັ້ນທີ່ສາມາດແກ້ໄຂບັນຊີຫຼັກໄດ້",
        status: "warning",
        duration: 3000,
      });
      return;
    }

    setEditingAccount(account);
    setFormData({
      parentCode: account.parentCode,
      code: account.code,
      name: account.name,
      type: account.type,
      category: account.category,
    });
    onOpen();
  };

  const handleSave = () => {
    if (!formData.code || !formData.name) {
      toast({
        title: "ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບຖ້ວນ",
        status: "warning",
        duration: 3000,
      });
      return;
    }

    // ตรวจสอบว่าเป็นการสร้างบัญชีหลักหรือไม่
    const isCreatingMainAccount = !formData.parentCode;
    if (isCreatingMainAccount && !isAdmin) {
      toast({
        title: "ບໍ່ສາມາດສ້າງບັນຊີຫຼັກໄດ້",
        description: "ເຉພາະແອດມິນເທົ່ານັ້ນທີ່ສາມາດສ້າງບັນຊີຫຼັກໄດ້",
        status: "error",
        duration: 3000,
      });
      return;
    }

    if (editingAccount) {
      // ตรวจสอบสิทธิ์ในการแก้ไข
      if (editingAccount.isMainAccount && !isAdmin) {
        toast({
          title: "ບໍ່ມີສິດແກ້ໄຂ",
          description: "ເຉພາະແອດມິນເທົ່ານັ້ນທີ່ສາມາດແກ້ໄຂບັນຊີຫຼັກໄດ້",
          status: "error",
          duration: 3000,
        });
        return;
      }

      setAccounts((prev) =>
        prev.map((acc) =>
          acc.code === editingAccount.code
            ? { ...acc, ...formData, isMainAccount: acc.isMainAccount }
            : acc
        )
      );
      toast({
        title: "ອັບເດດບັນຊີສຳເລັດ",
        status: "success",
        duration: 3000,
      });
    } else {
      const exists = accounts.find((acc) => acc.code === formData.code);
      if (exists) {
        toast({
          title: "ລະຫັດບັນຊີນີ້ມີຢູ່ແລ້ວ",
          status: "error",
          duration: 3000,
        });
        return;
      }

      setAccounts((prev) => [
        ...prev,
        {
          companyId: "1",
          ...formData,
          balanceDr: 0,
          balanceCr: 0,
          isMainAccount: isCreatingMainAccount,
        },
      ]);
      toast({
        title: "ເພີ່ມບັນຊີສຳເລັດ",
        status: "success",
        duration: 3000,
      });
    }
    onClose();
  };

  const handleFileUpload = (e) => {
    if (!isAdmin) {
      toast({
        title: "ບໍ່ມີສິດນຳເຂົ້າຂໍ້ມູນ",
        description: "ເຉພາະແອດມິນເທົ່ານັ້ນທີ່ສາມາດນຳເຂົ້າຂໍ້ມູນໄດ້",
        status: "error",
        duration: 3000,
      });
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split("\n").filter((line) => line.trim());
        const headers = lines[0].split(",").map((h) => h.trim());

        const imported = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.trim());
          const row = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx] || "";
          });

          if (row.code) {
            imported.push({
              companyId: row.companyId || "1",
              parentCode: row.parentCode || "",
              code: row.code,
              name: row.name,
              type: row.type || "asset",
              category: row.category || "ອື່ນໆ",
              balanceDr: parseFloat(row.balanceDr) || 0,
              balanceCr: parseFloat(row.balanceCr) || 0,
              isMainAccount: row.isMainAccount === "true" || !row.parentCode,
            });
          }
        }

        setAccounts((prev) => {
          const updated = [...prev];
          imported.forEach((imp) => {
            const idx = updated.findIndex((acc) => acc.code === imp.code);
            if (idx >= 0) {
              updated[idx] = imp;
            } else {
              updated.push(imp);
            }
          });
          return updated;
        });

        toast({
          title: `ນຳເຂົ້າ ${imported.length} ບັນຊີສຳເລັດ`,
          status: "success",
          duration: 3000,
        });
        onImportClose();
      } catch (error) {
        toast({
          title: "ເກີດຂໍ້ຜິດພາດໃນການນຳເຂົ້າ",
          description: error.message,
          status: "error",
          duration: 3000,
        });
      }
    };
    reader.readAsText(file);
  };

  // Filter parent accounts - ผู้ใช้ทั่วไปเลือกได้เฉพาะบัญชีย่อย
  const availableParentAccounts = isAdmin
    ? accounts
    : accounts.filter((acc) => !acc.isMainAccount || acc.parentCode !== "");

  return (
    <ChakraProvider>
      <Box minH="100vh" bg="gray.50" p={6}>
        <Box maxW="1400px" mx="auto">
          <Flex justify="space-between" align="center" mb={6}>
            <Box>
              <Text
                fontFamily="Noto Sans Lao, sans-serif"
                fontSize="2xl"
                fontWeight="bold"
                color="gray.700"
              >
                ຜັງບັນຊີ (Chart of Accounts)
              </Text>
              <Text
                fontFamily="Noto Sans Lao, sans-serif"
                fontSize="sm"
                color="gray.500"
                mt={1}
              >
                ບັນຊີຫຼັກ (ພື້ນຖານຕາມກົດໝາຍລາວ) ສາມາດແກ້ໄຂໄດ້ເຉພາະແອດມິນ
              </Text>
            </Box>
            <HStack spacing={3}>
              <HStack bg="white" px={4} py={2} borderRadius="md" shadow="sm">
                <Text
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontSize="sm"
                  fontWeight="medium"
                >
                  ສະຖານະ: {isAdmin ? "Admin" : "User"}
                </Text>
                <Switch
                  colorScheme="blue"
                  isChecked={isAdmin}
                  onChange={(e) => setIsAdmin(e.target.checked)}
                />
              </HStack>
              <Button
                leftIcon={<Plus size={18} />}
                colorScheme="blue"
                onClick={handleOpenAdd}
                fontFamily="Noto Sans Lao, sans-serif"
              >
                ເພີ່ມບັນຊີ
              </Button>
              <Button
                leftIcon={<Upload size={18} />}
                colorScheme="green"
                onClick={onImportOpen}
                isDisabled={!isAdmin}
                fontFamily="Noto Sans Lao, sans-serif"
              >
                Import CSV
              </Button>
            </HStack>
          </Flex>

          <Box bg="white" borderRadius="lg" shadow="sm" p={4} mb={4}>
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <Search size={18} color="gray" />
              </InputLeftElement>
              <Input
                placeholder="ຄົ້ນຫາບັນຊີ (code, name, type, category)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
          </Box>

          <Box bg="white" borderRadius="lg" shadow="sm" overflow="hidden">
            <Flex
              bg="gray.100"
              px={3}
              py={3}
              fontWeight="bold"
              fontSize="sm"
              color="gray.600"
            >
              <Box w={6} />
              <Text flex={1}>ບັນຊີ</Text>
              <Text
                fontFamily="Noto Sans Lao, sans-serif"
                w="100px"
                textAlign="right"
                mr={3}
              >
                ຍອດຄົງເຫຼືອ
              </Text>
              <Box
                fontFamily="Noto Sans Lao, sans-serif"
                w="80px"
                textAlign="center"
              >
                ປະເພດ
              </Box>
            </Flex>
            <Divider />
            <Box maxH="calc(100vh - 320px)" overflowY="auto">
              {treeData.map((node) => (
                <TreeNode
                  key={node.account.code}
                  account={node.account}
                  children={node.children}
                  level={0}
                  expanded={expanded}
                  onToggle={toggleNode}
                  onEdit={handleEdit}
                  isAdmin={isAdmin}
                />
              ))}
            </Box>
          </Box>

          <Box mt={4} p={4} bg="blue.50" borderRadius="md" fontSize="sm">
            <HStack spacing={4}>
              <HStack>
                <Box w={3} h={3} bg="blue.200" borderRadius="sm" />
                <Text fontFamily="Noto Sans Lao, sans-serif">
                  ບັນຊີຫຼັກ (ລ໋ອກ)
                </Text>
              </HStack>
              <HStack>
                <Icon as={Lock} boxSize={3} color="blue.500" />
                <Text fontFamily="Noto Sans Lao, sans-serif">
                  ແກ້ໄຂໄດ້ເຉພາະ Admin
                </Text>
              </HStack>
            </HStack>
          </Box>
        </Box>

        <Modal isOpen={isOpen} onClose={onClose} size="lg">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader fontFamily="Noto Sans Lao, sans-serif">
              {editingAccount ? "ແກ້ໄຂບັນຊີ" : "ເພີ່ມບັນຊີໃໝ່"}
              {editingAccount?.isMainAccount && (
                <Badge ml={2} colorScheme="blue">
                  <HStack spacing={1}>
                    <Icon as={Lock} boxSize={3} />
                    <Text fontFamily="Noto Sans Lao, sans-serif">
                      ບັນຊີຫຼັກ
                    </Text>
                  </HStack>
                </Badge>
              )}
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
                <FormControl>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ບັນຊີຕົ້ນທາງ (Parent Code)
                  </FormLabel>
                  <Select
                    value={formData.parentCode}
                    onChange={(e) =>
                      setFormData({ ...formData, parentCode: e.target.value })
                    }
                    isDisabled={editingAccount?.isMainAccount && !isAdmin}
                  >
                    <option value="">-- ບັນຊີຫຼັກ (ເຉພາະ Admin) --</option>
                    {availableParentAccounts.map((acc) => (
                      <option key={acc.code} value={acc.code}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </Select>
                  {!isAdmin && (
                    <FormHelperText
                      fontFamily="Noto Sans Lao, sans-serif"
                      color="orange.600"
                    >
                      ຜູ້ໃຊ້ທົ່ວໄປສາມາດສ້າງບັນຊີຍ່ອຍໄດ້ເທົ່ານັ້ນ
                    </FormHelperText>
                  )}
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ລະຫັດບັນຊີ (Code)
                  </FormLabel>
                  <Input
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    placeholder="ເຊັ່ນ: 101.01"
                    isDisabled={editingAccount?.isMainAccount && !isAdmin}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ຊື່ບັນຊີ (Name)
                  </FormLabel>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="ເຊັ່ນ: ເງິນສົດໃນມື"
                    isDisabled={editingAccount?.isMainAccount && !isAdmin}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ປະເພດ (Type)
                  </FormLabel>
                  <Select
                    fontFamily="Noto Sans Lao, sans-serif"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    isDisabled={editingAccount?.isMainAccount && !isAdmin}
                  >
                    <option value="asset">ຊັບສິນ (Asset)</option>
                    <option value="liability">ໜີ້ສິນ (Liability)</option>
                    <option value="equity">ທຶນ (Equity)</option>
                    <option value="income">ລາຍຮັບ (Income)</option>
                    <option value="expense">ຄ່າໃຊ້ຈ່າຍ (Expense)</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ໝວດໝູ່ (Category)
                  </FormLabel>
                  <Select
                    fontFamily="Noto Sans Lao, sans-serif"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                  >
                    <option value="ຕົ້ນທຶນຂາຍ">ຕົ້ນທຶນຂາຍ</option>
                    <option value="ຕົ້ນທຶນຈຳໜ່າຍ">ຕົ້ນທຶນຈຳໜ່າຍ</option>
                    <option value="ຕົ້ນທຸນບໍລິຫານ">ຕົ້ນທຸນບໍລິຫານ</option>
                    <option value="ອື່ນໆ">ອື່ນໆ</option>
                  </Select>
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button
                fontFamily="Noto Sans Lao, sans-serif"
                variant="ghost"
                mr={3}
                onClick={onClose}
              >
                ຍົກເລີກ
              </Button>
              <Button
                fontFamily="Noto Sans Lao, sans-serif"
                colorScheme="blue"
                onClick={handleSave}
              >
                ບັນທຶກ
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        <Modal isOpen={isImportOpen} onClose={onImportClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Import CSV (Admin Only)</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4} py={4}>
                <Icon as={FileText} boxSize={12} color="gray.400" />
                <Text
                  fontFamily="Noto Sans Lao, sans-serif"
                  fontSize="sm"
                  color="gray.600"
                  textAlign="center"
                >
                  ເລືອກໄຟລ์ CSV ທີ່ມີຫົວຕາຕະລາງ:
                  <br />
                  companyId, parentCode, code, name, type, category, balanceDr,
                  balanceCr, isMainAccount
                </Text>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  display="none"
                  id="csv-upload"
                />
                <Button
                  as="label"
                  htmlFor="csv-upload"
                  colorScheme="blue"
                  leftIcon={<Upload size={18} />}
                  cursor="pointer"
                  isDisabled={!isAdmin}
                  fontFamily="Noto Sans Lao, sans-serif"
                >
                  ເລືອກໄຟລ์
                </Button>
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>
      </Box>
    </ChakraProvider>
  );
};

export default ChartOfAccounts;

// Example CSV format for import:
// companyId,parentCode,code,name,type,category,balanceDr,balanceCr,isMainAccount
// 1,,1,ຊັບສິນ (Asset),asset,ອື່ນໆ,0,0,true
// 1,1,101,ເງິນສົດ,asset,ອື່ນໆ,50000,0,false
// 1,101,101.01,ເງິນສົດໃນມື,asset,ອື່ນໆ,20000,0,false
