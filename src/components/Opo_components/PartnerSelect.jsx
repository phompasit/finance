import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Input,
  List,
  ListItem,
  Text,
  InputGroup,
  InputLeftElement,
  IconButton,
} from "@chakra-ui/react";
import { Search, X } from "lucide-react";

const PartnerSelect = ({
  suppliers = [],
  value,
  onChange,
  isDisabled = false,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  // ✅ ไม่มี internal "selected" state — ใช้ value จาก parent โดยตรง
  // นี่คือหัวใจของการแก้ไข

  // ปิด dropdown เมื่อคลิกนอก
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
        setQuery(""); // ✅ clear query ด้วยเมื่อปิด
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter suppliers
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    const q = query.toLowerCase();
    const filtered = suppliers.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.phone?.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q)
    );
    setResults(filtered);
    setIsOpen(true);
  }, [query, suppliers]);

  const handleSelect = (partner) => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    onChange(partner); // ✅ บอก parent ทันที
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setQuery("");
    setResults([]);
    setIsOpen(false);
    onChange(null); // ✅ บอก parent ว่า clear แล้ว
  };

  return (
    <Box ref={wrapperRef} position="relative">
      {value ? (
        // ✅ แสดงจาก value (parent) — ไม่ใช่ internal state
        <Box
          border="1px solid"
          borderColor="blue.300"
          borderRadius="md"
          px={3}
          py={2}
          bg="blue.50"
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box>
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              fontWeight="bold"
              fontSize="sm"
            >
              {value.name}
            </Text>
            {value.phone && (
              <Text
                fontFamily="Noto Sans Lao, sans-serif"
                fontSize="xs"
                color="gray.500"
              >
                {value.phone}
              </Text>
            )}
          </Box>
          {!isDisabled && (
            <IconButton
              size="xs"
              icon={<X size={14} />}
              variant="ghost"
              colorScheme="red"
              onClick={handleClear}
              aria-label="Clear"
            />
          )}
        </Box>
      ) : (
        // 🔍 Search input
        <InputGroup>
          <InputLeftElement pointerEvents="none">
            <Search size={16} color="gray" />
          </InputLeftElement>
          <Input
            fontFamily="Noto Sans Lao, sans-serif"
            placeholder="ຄົ້ນຫາຊື່ຜູ້ສະໜອງ..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            isDisabled={isDisabled}
            autoComplete="off"
          />
        </InputGroup>
      )}

      {/* Dropdown */}
      {isOpen && !value && (
        <Box
          position="absolute"
          top="100%"
          left={0}
          right={0}
          zIndex={999}
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="md"
          shadow="lg"
          maxH="220px"
          overflowY="auto"
          mt={1}
        >
          {results.length > 0 ? (
            <List>
              {results.map((partner) => (
                <ListItem
                  key={partner._id}
                  px={3}
                  py={2}
                  cursor="pointer"
                  _hover={{ bg: "blue.50" }}
                  onMouseDown={(e) => e.preventDefault()} // ✅ ป้องกัน blur ก่อน click
                  onClick={() => handleSelect(partner)}
                  borderBottom="1px solid"
                  borderColor="gray.100"
                >
                  <Text
                    fontFamily="Noto Sans Lao, sans-serif"
                    fontWeight="600"
                    fontSize="sm"
                  >
                    {partner.name}
                  </Text>
                  {partner.phone && (
                    <Text
                      fontFamily="Noto Sans Lao, sans-serif"
                      fontSize="xs"
                      color="gray.500"
                    >
                      {partner.phone}
                    </Text>
                  )}
                </ListItem>
              ))}
            </List>
          ) : (
            <Box p={3} textAlign="center">
              <Text
                fontFamily="Noto Sans Lao, sans-serif"
                fontSize="sm"
                color="gray.400"
              >
                ບໍ່ພົບຜູ້ສະໜອງ
              </Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default PartnerSelect;
