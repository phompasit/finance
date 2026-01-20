"use client";

import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  IconButton,
  Button,
  Divider,
  Avatar,
  Badge,
  useColorMode,
  useColorModeValue,
} from "@chakra-ui/react";
import {
  FiHome,
  FiDollarSign,
  FiFileText,
  FiUsers,
  FiLogOut,
  FiMoon,
  FiSun,
  FiMenu,
  FiBook,
  FiLayers,
  FiTrendingUp,
} from "react-icons/fi";
import React from "react";

/* ===================== MENU CONFIG ===================== */

const MAIN_MENU = [
  {
    label: "ໜ້າຫຼັກ",
    path: "/dashboard",
    icon: FiHome,
    roles: ["admin", "master"],
  },
  {
    label: "ຈັດການລາຍຮັບ-ລາຍຈ່າຍ",
    path: "/income-expense",
    icon: FiDollarSign,
    roles: ["admin", "master"],
  },
  {
    label: "ຈັດການລາຍຈ່າຍລ່ວງໜ້າ",
    path: "/prepaid",
    icon: FiDollarSign,
    roles: ["admin", "master"],
  },
  {
    label: "ອອກໃບສັ່ງຊື້",
    path: "/opo",
    icon: FiFileText,
    roles: ["admin", "master"],
  },
  {
    label: "ຈັດການໜີ້ສິນ",
    path: "/debt",
    icon: FiFileText,
    roles: ["admin", "master"],
  },
  {
    label: "ຈັດການອື່ນໆ",
    path: "/partner",
    icon: FiFileText,
    roles: ["admin", "master"],
  },
  {
    label: "ຈັດການຜູ້ໃຊ້ງານ",
    path: "/users",
    icon: FiUsers,
    roles: ["admin"],
  },
];

const ACCOUNTING_MENU = [
  {
    section: "ສະມຸດບັນຊີ",
    items: [
      { label: "ໃບດຸ່ນດຽງທົ່ວໄປ", path: "/balance-sheet", icon: FiBook },
      {
        label: "ໃບດຸ່ນດ່ຽງຫລັງສ້າງຜົນດຳເນີນງານ",
        path: "/balance-sheet-before",
        icon: FiBook,
      },
      {
        label: "ໃບສັງລວມລາຍຮັບ-ລາຍຈ່າຍ",
        path: "/income-expense-balance-sheet",
        icon: FiBook,
      },
      {
        label: "ຊັບສິນ",
        path: "/fixed-assets",
        icon: FiBook,
      },
    ],
  },
  {
    section: "ງົບການເງິນ",
    items: [
      { label: "ໃບລາຍງານໜີ້ສິນ", path: "/statement", icon: FiBook },
      {
        label: "ໃບລາຍງານຊັບສິນ",
        path: "/assets",
        icon: FiBook,
      },
      {
        label: "ໃບລາຍງານຜົນດຳເນີນງານ",
        path: "/income-statement",
        icon: FiTrendingUp,
      },
    ],
  },
  {
    section: "ລະບົບບັນຊີ",
    items: [
      { label: "ຜັງບັນຊີ", path: "/chart-account", icon: FiLayers },
      { label: "ຍອດຍົກມາ", path: "/opening-balance", icon: FiTrendingUp },
      { label: "ປື້ມບັນຊີປະຈຳວັນ", path: "/journal", icon: FiBook },
      { label: "ປື້ມຕິດຕາມ", path: "/ledger", icon: FiBook },
      { label: "ປິດບັນຊີ", path: "/closing_account", icon: FiBook },
    ],
  },
];

/* ===================== COMPONENT ===================== */

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { colorMode, toggleColorMode } = useColorMode();

  const bg = useColorModeValue("gray.50", "gray.900");
  const sidebarBg = useColorModeValue("white", "gray.800");
  const activeBg = useColorModeValue("blue.100", "blue.900");

  const [collapsed, setCollapsed] = React.useState(
    localStorage.getItem("sidebar") === "collapsed"
  );

  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar", next ? "collapsed" : "open");
  };

  const isActive = (path) => location.pathname.startsWith(path);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <Flex minH="100vh" bg={bg}>
      {/* ================= SIDEBAR ================= */}
      <Box
        w={collapsed ? "80px" : "280px"}
        bg={sidebarBg}
        borderRight="1px solid"
        borderColor="gray.200"
        transition="0.25s"
      >
        {/* Logo */}
        <Flex p={4} align="center" justify="space-between">
          {!collapsed && (
            <Text fontWeight="bold" fontSize="lg">
              TECH FINANCIAL
            </Text>
          )}
          <IconButton icon={<FiMenu />} size="sm" onClick={toggleSidebar} />
        </Flex>

        {/* ===== MAIN MENU ===== */}
        <VStack align="stretch" spacing={1} px={2}>
          {MAIN_MENU.filter((m) => m.roles.includes(user?.role)).map((item) => (
            <Button
              fontFamily="Noto Sans Lao, sans-serif"
              key={item.path}
              as={Link}
              to={item.path}
              justifyContent={collapsed ? "center" : "flex-start"}
              leftIcon={<item.icon />}
              variant="ghost"
              bg={isActive(item.path) ? activeBg : "transparent"}
            >
              {!collapsed && item.label}
            </Button>
          ))}
        </VStack>

        {/* ===== ACCOUNTING MENU ===== */}
        {(user?.role === "admin" || user?.role === "master") && (
          <>
            <Divider my={4} />
            {!collapsed && (
              <Text
                fontFamily="Noto Sans Lao, sans-serif"
                px={4}
                fontSize="sm"
                color="gray.500"
              >
                Accounting
              </Text>
            )}
            <VStack align="stretch" spacing={3} px={2} mt={2}>
              {ACCOUNTING_MENU.map((group) => (
                <Box key={group.section}>
                  {!collapsed && (
                    <Text
                      px={3}
                      py={1}
                      fontSize="xs"
                      fontWeight="bold"
                      color="gray.500"
                      fontFamily="Noto Sans Lao, sans-serif"
                    >
                      {group.section}
                    </Text>
                  )}

                  {group.items.map((item) => (
                    <Button
                      fontFamily="Noto Sans Lao, sans-serif"
                      key={item.path}
                      as={Link}
                      to={item.path}
                      justifyContent={collapsed ? "center" : "flex-start"}
                      leftIcon={<item.icon />}
                      variant="ghost"
                      bg={isActive(item.path) ? activeBg : "transparent"}
                    >
                      {!collapsed && item.label}
                    </Button>
                  ))}
                </Box>
              ))}
            </VStack>
          </>
        )}
      </Box>

      {/* ================= CONTENT ================= */}
      <Flex flex="1" direction="column">
        {/* TOPBAR */}
        <Flex
          h="64px"
          px={6}
          align="center"
          justify="space-between"
          borderBottom="1px solid"
          borderColor="gray.200"
          bg={sidebarBg}
        >
          <HStack>
            <IconButton
              icon={colorMode === "light" ? <FiMoon /> : <FiSun />}
              onClick={toggleColorMode}
              variant="ghost"
            />
          </HStack>

          <HStack>
            <Avatar size="sm" name={user?.username} />
            <VStack spacing={0} align="start">
              <Text fontFamily="Noto Sans Lao, sans-serif" fontSize="sm">
                {user?.username}
              </Text>
              <Badge fontFamily="Noto Sans Lao, sans-serif" colorScheme="blue">
                {user?.role}
              </Badge>
            </VStack>
            <IconButton
              fontFamily="Noto Sans Lao, sans-serif"
              icon={<FiLogOut />}
              variant="ghost"
              colorScheme="red"
              onClick={handleLogout}
            />
          </HStack>
        </Flex>

        {/* PAGE CONTENT */}
        <Box p={6}>
          <Outlet />
        </Box>
      </Flex>
    </Flex>
  );
}
