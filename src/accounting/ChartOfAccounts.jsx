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
              key={child._id || child.code}
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
        ?.filter((a) => !a.parentCode) // only top-level (main) accounts
        .map((a) => ({ value: a.code, label: `${a.code} - ${a.name}` })) || [],
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
  const filteredTop = useMemo(() => {
    if (!searchTerm) return sortedTree;
    const q = searchTerm.toLowerCase();
    return sortedTree.map((n) => {
      // shallow filter children too: simple approach - keep node if name/code matches or any child's name/code matches
      const matches = (acc) =>
        (acc.name || "").toLowerCase().includes(q) ||
        (acc.code || "").toLowerCase().includes(q);

      if (matches(n.account)) return n;
      // deep search children, if any match keep node but don't prune children to keep structure simpler
      const anyChildMatch = JSON.stringify(n).toLowerCase().includes(q);
      if (anyChildMatch) return n;
      return n; // keep anyway to preserve tree; you can implement pruning later
    });
  }, [sortedTree, searchTerm]);
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
              ?.sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type])
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
                    ເລືອກໝາຍເລກບັນຊີ(ຖ້າຈະສ້າງບັນຊີຫຼັກ ບໍ່ເລືອກ)
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
