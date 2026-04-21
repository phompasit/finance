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
  FiActivity,
  FiCreditCard,
  FiShoppingCart,
  FiAlertCircle,
  FiGrid,
  FiUsers,
  FiBookOpen,
  FiClipboard,
  FiPackage,
  FiBarChart2,
  FiBarChart,
  FiPieChart,
  FiMinusCircle,
  FiArchive,
  FiTrendingUp,
  FiLayers,
  FiRefreshCw,
  FiLock,
  FiMenu,
  FiLogOut,
} from "react-icons/fi";
import React, { Suspense } from "react";
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
    icon: FiActivity,
    roles: ["admin", "master"],
  },
  {
    label: "ຈັດການລາຍຈ່າຍລ່ວງໜ້າ",
    path: "/prepaid",
    icon: FiCreditCard,
    roles: ["admin", "master"],
  },
  {
    label: "ອອກໃບສັ່ງຊື້",
    path: "/opo",
    icon: FiShoppingCart,
    roles: ["admin", "master"],
  },
  {
    label: "ຈັດການໜີ້ສິນ",
    path: "/debt",
    icon: FiAlertCircle,
    roles: ["admin", "master"],
  },
  {
    label: "ຈັດການອື່ນໆ",
    path: "/partner",
    icon: FiGrid,
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
      {
        label: "ປື້ມບັນຊີປະຈຳວັນ",
        path: "/journal",
        icon: FiBookOpen,
        roles: ["admin", "master"],
      },
      {
        label: "ປື້ມຕິດຕາມ",
        path: "/ledger",
        icon: FiClipboard,
        roles: ["admin", "master"],
      },
      {
        label: "ຊັບສິນ",
        path: "/fixed-assets",
        icon: FiPackage,
        roles: ["admin", "master"],
      },
    ],
  },
  {
    section: "ງົບການເງິນ",
    items: [
      {
        label: "ໃບດຸ່ນດຽງທົ່ວໄປ",
        path: "/balance-sheet",
        icon: FiBarChart2,
      },
      {
        label: "ໃບດຸ່ນດ່ຽງຫລັງສ້າງຜົນດຳເນີນງານ",
        path: "/balance-sheet-before",
        icon: FiBarChart,
        roles: ["admin", "master"],
      },
      {
        label: "ໃບສັງລວມລາຍຮັບ-ລາຍຈ່າຍ",
        path: "/income-expense-balance-sheet",
        icon: FiPieChart,
        roles: ["admin", "master"],
      },
      {
        label: "ໃບລາຍງານໜີ້ສິນ",
        path: "/statement",
        icon: FiMinusCircle,
        roles: ["admin", "master"],
      },
      {
        label: "ໃບລາຍງານຊັບສິນ",
        path: "/assets",
        icon: FiArchive,
        roles: ["admin", "master"],
      },
      {
        label: "ໃບລາຍງານຜົນດຳເນີນງານ",
        path: "/income-statement",
        icon: FiTrendingUp,
        roles: ["admin", "master"],
      },
    ],
  },
  {
    section: "ລະບົບບັນຊີ",
    items: [
      {
        label: "ຜັງບັນຊີ",
        path: "/chart-account",
        icon: FiLayers,
        roles: ["admin", "master"],
      },
      {
        label: "ຍອດຍົກມາ",
        path: "/opening-balance",
        icon: FiRefreshCw,
        roles: ["admin", "master"],
      },
      {
        label: "ປິດບັນຊີ",
        path: "/closing_account",
        icon: FiLock,
        roles: ["admin", "master"],
      },
    ],
  },
];

/* ===================== COMPONENT ===================== */

// ✅ Progress bar loader — ไม่บังเนื้อหา
const PageLoader = () => (
  <Box
    position="fixed"
    top={0}
    left={0}
    right={0}
    h="3px"
    bg="blue.400"
    zIndex={9999}
    sx={{
      animation: "progress 0.8s ease-in-out infinite",
      "@keyframes progress": {
        "0%": { width: "0%", opacity: 1 },
        "50%": { width: "70%", opacity: 1 },
        "100%": { width: "100%", opacity: 0 },
      },
    }}
  />
);

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
      {/* ✅ Sidebar อยู่นอก Suspense — ไม่หายไปเวลาโหลด */}
      <Box
        w={collapsed ? "80px" : "280px"}
        bg={sidebarBg}
        borderRight="1px solid"
        borderColor="gray.200"
        transition="0.25s"
      >
        <Flex p={4} align="center" justify="space-between">
          {!collapsed && (
            <Text fontWeight="bold" fontSize="lg">
              TECH FINANCIAL
            </Text>
          )}
          <IconButton icon={<FiMenu />} size="sm" onClick={toggleSidebar} />
        </Flex>

        <VStack align="stretch" spacing={1} px={2}>
          {MAIN_MENU.filter((m) => m.roles.includes(user?.role)).map((item) => (
            <Button
              fontFamily="Noto Sans Lao, sans-serif"
              key={item.path}
              as={Link}
              to={item.path}
              // ✅ preload ตอน hover
              onMouseEnter={() => item.component?.preload?.()}
              justifyContent={collapsed ? "center" : "flex-start"}
              leftIcon={<item.icon />}
              variant="ghost"
              bg={isActive(item.path) ? activeBg : "transparent"}
            >
              {!collapsed && item.label}
            </Button>
          ))}
        </VStack>

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
                      // ✅ preload ตอน hover
                      onMouseEnter={() => item.component?.preload?.()}
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
          <HStack />
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
              icon={<FiLogOut />}
              variant="ghost"
              colorScheme="red"
              onClick={handleLogout}
            />
          </HStack>
        </Flex>

        {/* ✅ Suspense ครอบแค่ PAGE CONTENT */}
        <Suspense fallback={<PageLoader />}>
          <Box
            key={location.pathname} // ✅ trigger fade ทุกครั้งที่เปลี่ยนหน้า
            p={6}
            sx={{
              animation: "fadeIn 0.15s ease-in-out",
              "@keyframes fadeIn": {
                from: { opacity: 0, transform: "translateY(4px)" },
                to: { opacity: 1, transform: "translateY(0)" },
              },
            }}
          >
            <Outlet />
          </Box>
        </Suspense>
      </Flex>
    </Flex>
  );
}
