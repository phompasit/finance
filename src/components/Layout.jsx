"use client";

import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Box,
  Flex,
  HStack,
  Button,
  Text,
  Container,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Icon,
  Badge,
  useColorModeValue,
  IconButton,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  useDisclosure,
  VStack,
  Divider,
} from "@chakra-ui/react";
import {
  FiHome,
  FiDollarSign,
  FiFileText,
  FiCreditCard,
  FiBarChart2,
  FiUsers,
  FiLogOut,
  FiMenu,
  FiChevronDown,
} from "react-icons/fi";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const hoverBg = useColorModeValue("blue.50", "gray.700");
  const activeBg = useColorModeValue("blue.100", "blue.900");
  const activeColor = useColorModeValue("blue.600", "blue.200");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  const navItems = [
    {
      name: "ໜ້າຫຼັກ",
      path: "/dashboard",
      icon: FiHome,
      show: user?.role === "admin",
    },
    {
      name: "ລາຍຮັບ-ລາຍຈ່າຍ",
      path: "/income-expense",
      icon: FiDollarSign,
      // admin และ staff
      show: user?.role === "admin" || user?.role === "staff",
    },
    {
      name: "OPO",
      path: "/opo",
      icon: FiFileText,
      // admin และ staff
      show: user?.role === "admin" || user?.role === "staff",
    },
    {
      name: "ໜີ້ສິນ",
      path: "/debt",
      icon: FiCreditCard,
      show: user?.role === "admin",
    },
    {
      name: "ລາຍງານ",
      path: "/reports",
      icon: FiBarChart2,
      show: user?.role === "admin",
    },
    {
      name: "ຜູ້ໃຊ້ງານ",
      path: "/users",
      icon: FiUsers,
      show: user?.role === "admin",
    },
  ];

  const isActive = (path) => location.pathname === path;

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "admin":
        return "red";
      case "manager":
        return "purple";
      default:
        return "blue";
    }
  };

  const getRoleText = (role) => {
    switch (role) {
      case "admin":
        return "ຜູ້ດູແລລະບົບ";
      case "staff":
        return "ພະນັກງານ";
      default:
        return "ຜູ້ໃຊ້ງານ";
    }
  };

  return (
    <Box minH="100vh" bg={useColorModeValue("gray.50", "gray.900")}>
      {/* Navigation Bar */}
      <Box
        as="nav"
        bg={bgColor}
        borderBottom="1px"
        borderColor={borderColor}
        px={4}
        position="sticky"
        top={0}
        zIndex={1000}
        boxShadow="sm"
      >
        <Container maxW="7xl">
          <Flex h={16} alignItems="center" justifyContent="space-between">
            {/* Logo & Title */}
            <Flex alignItems="center" gap={3}>
              <IconButton
                display={{ base: "flex", md: "none" }}
                onClick={onOpen}
                icon={<FiMenu />}
                variant="ghost"
                aria-label="Open menu"
              />
              <Flex alignItems="center" gap={2}>
                <Box
                  bg="gradient-to-r from-blue-500 to-purple-600"
                  p={2}
                  borderRadius="lg"
                >
                  <Icon as={FiDollarSign} color="white" boxSize={5} />
                </Box>
                <Text
                  fontSize="xl"
                  fontWeight="bold"
                  bgGradient="linear(to-r, blue.500, purple.600)"
                  bgClip="text"
                  fontFamily={"Noto Sans Lao, sans-serif"}
                >
                  ລະບົບຈັດການການເງິນ
                </Text>
              </Flex>
            </Flex>

            {/* Desktop Navigation */}
            <HStack
              spacing={1}
              display={{ base: "none", md: "flex" }}
              flex={1}
              justify="center"
            >
              {navItems.map(
                (item) =>
                  item.show && (
                    <Button
                      fontFamily={"Noto Sans Lao, sans-serif"}
                      key={item.path}
                      as={Link}
                      to={item.path}
                      leftIcon={<Icon as={item.icon} />}
                      variant={isActive(item.path) ? "solid" : "ghost"}
                      colorScheme={isActive(item.path) ? "blue" : "gray"}
                      bg={isActive(item.path) ? activeBg : "transparent"}
                      color={isActive(item.path) ? activeColor : "gray.600"}
                      _hover={{
                        bg: isActive(item.path) ? activeBg : hoverBg,
                      }}
                      size="sm"
                      fontWeight="medium"
                    >
                      {item.name}
                    </Button>
                  )
              )}
            </HStack>

            {/* User Menu */}
            <Menu>
              <MenuButton
                as={Button}
                fontFamily={"Noto Sans Lao, sans-serif"}
                rightIcon={<FiChevronDown />}
                leftIcon={
                  <Avatar
                    size="sm"
                    name={user?.username}
                    bg="blue.500"
                    color="white"
                  />
                }
                variant="ghost"
                _hover={{ bg: hoverBg }}
              >
                <VStack
                  spacing={0}
                  align="start"
                  display={{ base: "none", md: "flex" }}
                >
                  <Text
                    fontFamily={"Noto Sans Lao, sans-serif"}
                    fontSize="sm"
                    fontWeight="medium"
                  >
                    {user?.username}
                  </Text>
                  <Badge
                    fontFamily={"Noto Sans Lao, sans-serif"}
                    colorScheme={getRoleBadgeColor(user?.role)}
                    fontSize="xs"
                  >
                    {getRoleText(user?.role)}
                  </Badge>
                </VStack>
              </MenuButton>
              <MenuList>
                <MenuItem>
                  <VStack align="start" spacing={0}>
                    <Text
                      fontFamily={"Noto Sans Lao, sans-serif"}
                      fontWeight="medium"
                    >
                      {user?.companyInfo?.name}
                    </Text>
                    <Badge
                      fontFamily={"Noto Sans Lao, sans-serif"}
                      colorScheme={getRoleBadgeColor(user?.role)}
                      fontSize="xs"
                    >
                      {getRoleText(user?.role)}
                    </Badge>
                  </VStack>
                </MenuItem>
                <MenuDivider />
                <MenuItem
                  fontFamily={"Noto Sans Lao, sans-serif"}
                  icon={<FiLogOut />}
                  onClick={handleLogout}
                  color="red.500"
                >
                  ອອກຈາກລະບົບ
                </MenuItem>
              </MenuList>
            </Menu>
          </Flex>
        </Container>
      </Box>

      {/* Mobile Drawer */}
      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">
            <Flex alignItems="center" gap={2}>
              <Box
                bg="gradient-to-r from-blue-500 to-purple-600"
                p={2}
                borderRadius="lg"
              >
                <Icon
                  fontFamily={"Noto Sans Lao, sans-serif"}
                  as={FiDollarSign}
                  color="white"
                  boxSize={5}
                />
              </Box>
              <Text
                fontSize="lg"
                fontWeight="bold"
                bgGradient="linear(to-r, blue.500, purple.600)"
                bgClip="text"
                fontFamily={"Noto Sans Lao, sans-serif"}
              >
                ເມນູ
              </Text>
            </Flex>
          </DrawerHeader>

          <DrawerBody>
            <VStack spacing={2} align="stretch" mt={4}>
              {navItems.map(
                (item) =>
                  item.show && (
                    <Button
                      fontFamily={"Noto Sans Lao, sans-serif"}
                      key={item.path}
                      as={Link}
                      to={item.path}
                      leftIcon={<Icon as={item.icon} />}
                      variant={isActive(item.path) ? "solid" : "ghost"}
                      colorScheme={isActive(item.path) ? "blue" : "gray"}
                      justifyContent="flex-start"
                      onClick={onClose}
                      bg={isActive(item.path) ? activeBg : "transparent"}
                      color={isActive(item.path) ? activeColor : "gray.600"}
                    >
                      {user?.companyInfo?.name}
                    </Button>
                  )
              )}
              <Divider my={4} />
              <Button
                leftIcon={<FiLogOut />}
                colorScheme="red"
                fontFamily={"Noto Sans Lao, sans-serif"}
                variant="ghost"
                justifyContent="flex-start"
                onClick={handleLogout}
              >
                ອອກຈາກລະບົບ
              </Button>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Main Content */}
      <Container maxW="7xl" py={6}>
        <Outlet />
      </Container>
    </Box>
  );
}
