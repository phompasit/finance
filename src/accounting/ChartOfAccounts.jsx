// src/pages/ChartOfAccountsWithCostCenters.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  ChakraProvider,
  Flex,
  Text,
  Icon,
  Badge,
  Input,
  InputGroup,
  InputLeftElement,
  Button,
  Divider,
  VStack,
  HStack,
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
  Switch,
  useDisclosure,
  useToast,
  IconButton,
    Table,          // ✅ เพิ่ม
  TableContainer, // ✅ เพิ่ม
  Thead,          // ✅ เพิ่ม
  Tbody,          // ✅ เพิ่ม
  Tr,             // ✅ เพิ่ม
  Th,             // ✅ เพิ่ม
  Td,             // ✅ เพิ่ม
  Grid,           // ✅ เพิ่ม
} from "@chakra-ui/react";
import {
  Search,
  Plus,
  ChevronRight,
  ChevronDown,
  Lock,
  Trash2,
} from "lucide-react";
import SelectReact from "react-select";
import { useDispatch, useSelector } from "react-redux";
import {
  getAccounts,
  getAccountTree,
  createAccount,
  updateAccount,
  messageClear,
  deleteAccount,
} from "../store/accountingReducer/chartAccounting";
import Swal from "sweetalert2";
import LedgerLoading from "../components/Loading";
import { blockedCodesForChartAccount } from "./Journal/Chart";

/**
 * Chart of Accounts with explicit Cost-of-Goods-Sold / Distribution / Administrative grouping.
 *
 * Assumptions:
 * - Account schema has fields: _id, code, name, parentCode, type (asset/liability/equity/income/expense), category
 * - category strings include: "ຕົ້ນທຸນຂາຍ" (COGS), "ຕົ້ນທຸນຈຳຫນ່າຍ" (Distribution), "ຕົ້ນທຸນບໍລິຫານ" (Administrative), and others.
 * - You have Redux actions listed above available.
 */

/* ---------- Type order (custom sort) ---------- */
const TYPE_ORDER = {
  asset: 1,
  equity: 2,
  liability: 3,
  expense: 4,
  income: 5,
};

const TYPE_COLORS = {
  asset: "blue",
  liability: "red",
  equity: "purple",
  income: "green",
  expense: "orange",
};

/* ---------- map English labels to Lao / business labels ---------- */
const CATEGORY_LABELS = {
  ຕົ້ນທຸນຂາຍ: "Cost of Goods Sold",
  ຕົ້ນທຸນຈຳຫນ່າຍ: "Distribution Cost",
  ຕົ້ນທຸນບໍລິຫານ: "Administrative Cost",
  ອື່ນໆ: "Other",
};

/* ---------- Tree node component ---------- */
const TreeNode = React.memo(function TreeNode({
  account,
  children = [],
  level = 0,
  expanded,
  onToggle,
  onEdit,
  isAdmin,
  onDelete,
}) {
  const hasChildren = children.length > 0;
  const isExpanded = !!expanded[account?.code];
  const balance = (account?.balanceDr || 0) - (account?.balanceCr || 0);
  const canEdit = isAdmin || !account?.isMainAccount;
  const canDelete = !account?.isMainAccount && children.length === 0;
  return (
    <Box>
      <Flex
        align="center"
        py={2}
        px={3}
        pl={level * 14}
        bg={account?.isMainAccount ? "blue.50" : "white"}
        borderBottom="1px solid"
        borderColor="gray.100"
        _hover={{ bg: "gray.50" }}
        cursor={canEdit ? "pointer" : "not-allowed"}
        onClick={() => canEdit && onEdit && onEdit(account)}
      >
        <Box
          mr={2}
          onClick={(e) => {
            e.stopPropagation();
            hasChildren && onToggle && onToggle(account.code);
          }}
        >
          {hasChildren ? (
            <Icon
              as={isExpanded ? ChevronDown : ChevronRight}
              boxSize={4}
              color="gray.600"
            />
          ) : (
            <Box boxSize={4} />
          )}
        </Box>

        <Badge
          colorScheme={TYPE_COLORS[account?.type]}
          mr={2}
          minW="60px"
          textAlign="center"
          fontFamily="Noto Sans Lao, sans-serif"
        >
          {account?.code}
        </Badge>

        <Text
          flex={1}
          fontSize="sm"
          fontFamily="Noto Sans Lao, sans-serif"
          fontWeight={account?.isMainAccount ? "bold" : "medium"}
        >
          {account?.name}
        </Text>

        {account?.isMainAccount && (
          <Icon as={Lock} boxSize={3} color="blue.500" mr={2} />
        )}
        <Badge minW="90px" textAlign="center">
          {account?.type}
        </Badge>
        {canDelete && (
          <IconButton
            size="sm"
            ml={2}
            colorScheme="red"
            icon={<Trash2 size={14} />}
            onClick={(e) => {
              e.stopPropagation();
              onDelete && onDelete(account);
            }}
            aria-label="Delete account"
          />
        )}
      </Flex>

      {hasChildren && isExpanded && (
        <Box ml={6}>
          {children.map((child) => (
            <TreeNode
              key={child._id}
              account={child}
              children={child.children || []}
              level={level + 1}
              expanded={expanded}
              onDelete={onDelete}
              onToggle={onToggle}
              onEdit={onEdit}
              isAdmin={isAdmin}
            />
          ))}
        </Box>
      )}
    </Box>
  );
});

/* ---------- Main component ---------- */
const ChartOfAccountsWithCostCenters = () => {
  const dispatch = useDispatch();
  const toast = useToast();

  const {
    accounts = [],
    tree = [],
    loader,
    successMessage,
    errorMessage,
  } = useSelector((s) => s.chartAccount || {});

  const [searchTerm, setSearchTerm] = useState("");
  const [expanded, setExpanded] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [formData, setFormData] = useState({
    parentCode: "",
    code: "",
    name: "",
    type: "asset",
    category: "ອື່ນໆ",
    isMainAccount: false,
  });

  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    dispatch(getAccounts());
    dispatch(getAccountTree());
  }, [dispatch]);

  useEffect(() => {
    if (successMessage) {
      Swal.fire({
        icon: "success",
        title: "ສຳເລັດ",
        text: successMessage,
        timer: 2000,
        showConfirmButton: false,
      });

      dispatch(messageClear());
    }

    if (errorMessage) {
      Swal.fire({
        icon: "error",
        title: "ຜິດພາດ",
        text: errorMessage,
      });

      dispatch(messageClear());
    }
  }, [successMessage, errorMessage, dispatch]);

  const toggleNode = useCallback((code) => {
    setExpanded((p) => ({ ...p, [code]: !p[code] }));
  }, []);

  const handleEdit = (acc) => {
    if (!isAdmin && acc.isMainAccount) {
      return Swal.fire({
        icon: "warning",
        title: "ຄຳເຕືອນ",
        text: "ບໍ່ສາມາດແກ້ໄຂບັນຊີຫຼັກໄດ້",
      });
    }
    setEditingAccount(acc);
    setFormData({
      parentCode: acc.parentCode || "",
      code: acc.code,
      name: acc.name,
      type: acc.type,
      category: acc.category || "ອື່ນໆ",
      isMainAccount: !!acc.isMainAccount,
    });
    onOpen();
  };

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setFormData({
      parentCode: "",
      code: "",
      name: "",
      type: "asset",
      category: "ອື່ນໆ",
      isMainAccount: false,
    });
    onOpen();
  };

  const handleSave = async () => {
    if (!formData.code || !formData.name) {
      await Swal.fire({
        icon: "warning",
        title: "ຂໍ້ມູນບໍ່ຄົບ",
        text: "ກະລຸນາລະບຸ ໝາຍເລກບັນຊີ ແລະ ຊື່ບັນຊີ",
      });
      return;
    }

    const payload = {
      parentCode: formData.parentCode || null,
      code: formData.code,
      name: formData.name,
      type: formData.type,
      category: formData.category,
      isMainAccount: !!formData.isMainAccount,
    };

    try {
      if (editingAccount) {
        await dispatch(
          updateAccount({ id: editingAccount._id, formData: payload })
        );
      } else {
        await dispatch(createAccount(payload));
      }
      dispatch(getAccounts());
      dispatch(getAccountTree());
      onClose();
    } catch (err) {
      toast({ title: "Save failed", status: "error" });
    }
  };
  const handleDelete = async (acc) => {
    /* ---------- กันลบบัญชีหลัก ---------- */
    if (acc.isMainAccount) {
      await Swal.fire({
        icon: "warning",
        title: "ບໍ່ອະນຸຍາດ",
        text: "ບໍ່ສາມາດລົບບັນຊີຫຼັກໄດ້",
      });
      return;
    }

    /* ---------- Confirm ---------- */
    const result = await Swal.fire({
      icon: "warning",
      title: "ຢືນຢັນການລົບ",
      text: `ຕ້ອງການລົບ ${acc.code} - ${acc.name} ແມ່ນຫຼືບໍ່?`,
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "ລົບ",
      cancelButtonText: "ຍົກເລີກ",
    });

    if (!result.isConfirmed) return;

    /* ---------- Loading ---------- */
    Swal.fire({
      title: "ກຳລັງລົບ...",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      await dispatch(deleteAccount(acc._id));
      dispatch(getAccounts());
      dispatch(getAccountTree());
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "ຜິດພາດ",
        text: "ລົບບໍ່ສຳເລັດ",
      });
    }
  };

  /* ---------- Parent options: only show main accounts as parents ---------- */
  const parentOptions = useMemo(
    () =>
      accounts
        ?.filter((a) => !blockedCodesForChartAccount.includes(a.code)) // เอาทุก account ที่ไม่ถูก block
        .map((a) => ({
          value: a.code,
          label: a.parentCode
            ? ` ${a.code} - ${a.name}` // แสดง parent → child
            : `${a.code} - ${a.name}`, // top-level
        })) || [],
    [accounts]
  );
  /* ---------- Sorted top-level tree by requested order ---------- */
  const sortedTree = useMemo(() => {
    if (!tree) return [];
    // make shallow copy and sort top-level nodes by TYPE_ORDER
    const copy = [...tree];
    copy.sort((a, b) => {
      const ta = TYPE_ORDER[a.account?.type] || 99;
      const tb = TYPE_ORDER[b.account?.type] || 99;
      if (ta !== tb) return ta - tb;
      // fallback: sort by code
      const ca = a.account?.code || "";
      const cb = b.account?.code || "";
      return ca.localeCompare(cb, undefined, { numeric: true });
    });
    return copy;
  }, [tree]);

  /* ---------- For Expense: split into COGS / Distribution / Admin / Other ---------- */
  const expenseMeta = useMemo(() => {
    // find expense top-level node
    const node = sortedTree.find((n) => n.account?.type === "expense");
    if (!node) return { node: null, byCategory: {} };

    // flatten tree into array of accounts under expense
    const flat = [];
    function walk(n) {
      const acc = n.account;
      flat.push({ ...acc, children: n.children || [] });
      (n.children || []).forEach((c) => walk(c));
    }
    (node.children || []).forEach((c) => walk(c));

    // group by category (use Lao category string)
    const byCategory = {};
    flat.forEach((a) => {
      const cat = a.category || "ອື່ນໆ";
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(a);
    });

    return { node, byCategory };
  }, [sortedTree]);

  /* ---------- Filter search across tree: we're still rendering full tree but you can enhance to filter ---------- */
  // For now we keep search as client-only filter for top-level nodes by account name/code
  // แทนที่ฟังก์ชัน filteredTop เดิม
  const filteredTop = useMemo(() => {
    if (!searchTerm.trim()) return sortedTree;
    const q = searchTerm.toLowerCase().trim();

    // recursive function: คืน node ที่ match หรือมี child ที่ match
    function filterNode(node) {
      const acc = node.account || node;
      const matches =
        (acc?.name || "").toLowerCase().includes(q) ||
        (acc?.code || "").toLowerCase().includes(q);

      const filteredChildren = (node.children || [])
        .map(filterNode)
        .filter(Boolean);

      if (matches || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    }

    return sortedTree.map(filterNode).filter(Boolean);
  }, [sortedTree, searchTerm]);
  // เพิ่ม useEffect นี้ใต้ state declarations
  useEffect(() => {
    if (!searchTerm.trim()) return;

    // auto expand ทุก node ที่ filter ผ่าน
    const newExpanded = {};
    function collectCodes(nodes) {
      nodes.forEach((node) => {
        if ((node.children || []).length > 0) {
          newExpanded[node.account?.code || node.code] = true;
          collectCodes(node.children);
        }
      });
    }
    collectCodes(filteredTop);
    setExpanded(newExpanded);
  }, [searchTerm, filteredTop]);
  if (loader) {
    return <LedgerLoading />;
  }
  return (
    <ChakraProvider>
      <Box p={6} maxW="1400px" mx="auto" bg="gray.50" minH="100vh">
        <Flex justify="space-between" mb={6}>
          <Box>
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              fontSize="2xl"
              fontWeight="bold"
            >
              ຜັງບັນຊີວິສະຫະກິດ
            </Text>
            <p style={{ fontFamily: "Noto Sans Lao, sans-serif", color: "#666" }}>
              ທ່ານສາມາດເພີ່ມ, ແກ້ໄຂ ຫຼື ລົບ ເລກໝາຍບັນຊີຕາມທີ່ອະນຸຍາດໄດ້ ຍົກເວັ້ນຫມາຍເລກບັນຊີທີ່ບໍ່ອະນຸຍາດໃຫ້ມີຍ່ອຍ. 
              ຫາກທ່ານໃຊ້ຫມາຍເລກບັນຊີໄດ້ກະລຸນາເປີດບັນຊີຍ່ອຍພາຍໃຕ້ບັນຊີຫຼັກ ເພື່ອເຮັດໃຫ້ເລກໝາຍບັນຊີແນ່ນອນ ແລະ ສາມາດເພີ່ມໝາຍເລກບັນຊີໃນໝາຍເລກແລະນຳໃຊ້ຢ່າງຖືກຕ້ອງ.
            </p>
          </Box>

          <HStack spacing={3}>
            <Button
              leftIcon={<Plus size={18} />}
              colorScheme="blue"
              onClick={handleOpenAdd}
              fontFamily="Noto Sans Lao, sans-serif"
            >
              ເພີ່ມເລກໝາຍບັນຊີ
            </Button>
          </HStack>
        </Flex>

        <Box bg="white" p={4} mb={4} borderRadius="md" shadow="sm">
          <InputGroup>
            <InputLeftElement pointerEvents="none">
              <Search size={16} />
            </InputLeftElement>
            <Input
              fontFamily="Noto Sans Lao, sans-serif"
              placeholder="Search account code or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Box>

        {/* Render top-level nodes in sorted order */}
        <Box bg="white" borderRadius="lg" shadow="sm" mb={6}>
          <Flex
            bg="gray.100"
            px={3}
            py={3}
            fontWeight="bold"
            fontSize="sm"
            color="gray.600"
          >
            <Box w={6} />
            <Text fontFamily="Noto Sans Lao, sans-serif" flex={1}>
              ເລກບັນຊີ
            </Text>
            <Text fontFamily="Noto Sans Lao, sans-serif" flex={1}>
              ຊື່ບັນຊີ
            </Text>

            <Box
              fontFamily="Noto Sans Lao, sans-serif"
              w="90px"
              textAlign="center"
            >
              ປະເພດ
            </Box>
          </Flex>
          <Divider />

          <Box maxH="calc(100vh - 320px)" overflowY="auto">
            {filteredTop
              ?.sort(
                (a, b) =>
                  TYPE_ORDER[a.account?.type] - TYPE_ORDER[b.account?.type]
              )
              ?.map((node) => (
                <TreeNode
                  key={node._id}
                  account={node}
                  children={node.children || []}
                  level={0}
                  expanded={expanded}
                  onDelete={handleDelete}
                  onToggle={toggleNode}
                  onEdit={handleEdit}
                  isAdmin={isAdmin}
                />
              ))}
          </Box>

                   {/* วางใต้ <p> description เดิม */}

<Box mt={4} p={4} bg="gray.50" borderRadius="lg" border="1px solid" borderColor="gray.200">
  
  {/* Row บน: 2 card summary */}
  <Grid templateColumns="1fr 1fr" gap={3} mb={4}>
    
    {/* Card 1: ตัวอย่าง depth */}
    <Box bg="white" p={3} borderRadius="md" border="1px solid" borderColor="gray.200">
      <Text fontSize="xs" color="gray.500" mb={2} fontFamily="Noto Sans Lao">
        ການສ້າງບັນຊີຍ່ອຍ (ຕົວຢ່າງ 606)
      </Text>
      <HStack spacing={2} flexWrap="wrap">
        <Badge colorScheme="blue" borderRadius="full" px={3}>606</Badge>
        <Text color="gray.400">→</Text>
        <Badge colorScheme="green" borderRadius="full" px={3}>6063.001</Badge>
        <Text color="gray.400">→</Text>
        <Badge colorScheme="red" borderRadius="full" px={3}>❌ ຕໍ່ໄດ້</Badge>
      </HStack>
    </Box>

    {/* Card 2: ห้ามสร้างยอย */}
    <Box bg="white" p={3} borderRadius="md" border="1px solid" borderColor="gray.200">
      <Text fontSize="xs" color="gray.500" mb={2} fontFamily="Noto Sans Lao">
        ໝາຍເລກທີ່ຫ້າມສ້າງຍ່ອຍ (Default)
      </Text>
      <HStack spacing={1} flexWrap="wrap">
        {["321","329","1011","501"].map(code => (
          <Badge key={code} colorScheme="orange" fontSize="xs">{code}</Badge>
        ))}
        <Text fontSize="xs" color="gray.400">ແລະ ອື່ນໆ...</Text>
      </HStack>
    </Box>
  </Grid>

  {/* ตาราง Depth สรุป */}
  {/* <TableContainer>
    <Table size="sm" variant="simple">
      <Thead bg="gray.100">
        <Tr>
          <Th fontFamily="Noto Sans Lao">ໝາຍເລກ</Th>
          <Th fontFamily="Noto Sans Lao">ລະດັບ 1</Th>
          <Th fontFamily="Noto Sans Lao">ລະດັບ 2</Th>
          <Th fontFamily="Noto Sans Lao">ຫຼາຍກວ່ານີ້</Th>
        </Tr>
      </Thead>
      <Tbody>
        <Tr>
          <Td fontWeight="bold">606</Td>
          <Td><Badge colorScheme="green">✓ ໄດ້</Badge></Td>
          <Td><Badge colorScheme="green">✓ ໄດ້</Badge></Td>
          <Td><Badge colorScheme="red">✕ ຫ້າມ</Badge></Td>
        </Tr>
        <Tr>
          <Td fontWeight="bold">507</Td>
          <Td><Badge colorScheme="green">✓ ໄດ້</Badge></Td>
          <Td><Badge colorScheme="red">✕ ຫ້າມ</Badge></Td>
          <Td><Badge colorScheme="red">✕ ຫ້າມ</Badge></Td>
        </Tr>
        <Tr>
          <Td>ອື່ນໆ</Td>
          <Td><Badge colorScheme="green">✓ ໄດ້</Badge></Td>
          <Td><Badge colorScheme="green">✓ ໄດ້</Badge></Td>
          <Td><Badge colorScheme="green">✓ ໄດ້</Badge></Td>
        </Tr>
      </Tbody>
    </Table>
  </TableContainer> */}
</Box>
        </Box>

        {/* Expense detail grouped by cost categories */}

        {/* Modal for add/edit */}
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader fontFamily="Noto Sans Lao, sans-serif">
              {editingAccount ? "ແກ້ໄຂເລກໝາຍບັນຊີ" : "ເພີ່ມເລກໝາຍບັນຊີ"}
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
                <FormControl>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ເລືອກໝາຍເລກບັນຊີ
                  </FormLabel>
                  <SelectReact
                    options={parentOptions}
                    value={
                      parentOptions.find(
                        (o) => o.value === formData.parentCode
                      ) || null
                    }
                    onChange={(opt) =>
                      setFormData((s) => ({
                        ...s,
                        parentCode: opt?.value || "",
                      }))
                    }
                    placeholder="-- ເລືອກບັນຊີ --"
                    isClearable
                    styles={{
                      container: (base) => ({ ...base, width: "100%" }),
                    }}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ເລກໝາຍບັນຊີ
                  </FormLabel>
                  <Input
                    fontFamily="Noto Sans Lao, sans-serif"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData((s) => ({ ...s, code: e.target.value }))
                    }
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ຊື່ເລກໝາຍບັນຊີ
                  </FormLabel>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((s) => ({ ...s, name: e.target.value }))
                    }
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ປະເພດ
                  </FormLabel>
                  <Select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData((s) => ({ ...s, type: e.target.value }))
                    }
                  >
                    <option value="asset">ຊັບສິນ</option>
                    <option value="liability">ໜີ້ສິນ</option>
                    <option value="equity">ທຶນ</option>
                    <option value="income">ລາຍຮັບ</option>
                    <option value="expense">ລາຍຈ່າຍ</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                    ໝວດໝູ່ (ສຳຫລັບ ປະເພດລາຍຈ່າຍ 6 )
                  </FormLabel>
                  <Select
                    fontFamily="Noto Sans Lao, sans-serif"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData((s) => ({ ...s, category: e.target.value }))
                    }
                  >
                    <option value="ຕົ້ນທຸນຂາຍ">ຕົ້ນທຸນຂາຍ (COGS)</option>
                    <option value="ຕົ້ນທຸນຈຳຫນ່າຍ">
                      ຕົ້ນທຸນຈຳຫນ່າຍ (Distribution)
                    </option>
                    <option value="ຕົ້ນທຸນບໍລິຫານ">
                      ຕົ້ນທຸນບໍລິຫານ (Admin)
                    </option>
                    <option value="ອື່ນໆ">ອື່ນໆ</option>
                  </Select>
                </FormControl>

                {/* <FormControl>
                  <FormLabel fontFamily="Noto Sans Lao, sans-serif">Is Main Account</FormLabel>
                  <Switch
                    isChecked={formData.isMainAccount}
                    onChange={(e) =>
                      setFormData((s) => ({
                        ...s,
                        isMainAccount: e.target.checked,
                      }))
                    }
                  />
                </FormControl> */}
              </VStack>
            </ModalBody>

            <ModalFooter>
              <Button
                fontFamily="Noto Sans Lao, sans-serif"
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
                {editingAccount ? "ອັບເດດ" : "ເພີ່ມໝາຍເລກບັນຊີ"}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
    </ChakraProvider>
  );
};

export default ChartOfAccountsWithCostCenters;
