import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  VStack,
} from "@chakra-ui/react";

const JournalFilterModal = ({ isOpen, onClose, onApply, initialFilter }) => {
  const [filter, setFilter] = useState({
    startDate: "",
    endDate: "",
    currency: "",
    status: "",
    search: "",
  });

  useEffect(() => {
    if (initialFilter) {
      setFilter(initialFilter);
    }
  }, [initialFilter]);

  const handleChange = (field, value) => {
    setFilter((prev) => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    onApply(filter);
    onClose();
  };

  const handleReset = () => {
    const empty = {
      startDate: "",
      endDate: "",
      currency: "",
      status: "",
      search: "",
    };
    setFilter(empty);
    onApply(empty);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontFamily="Noto Sans Lao, sans-serif">
          ຕັ້ງຄ່າການຄັດກອງ (Filter)
        </ModalHeader>

        <ModalBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>ຄົ້ນຫາ</FormLabel>
              <Input
                placeholder="Reference / Description"
                value={filter.search}
                onChange={(e) => handleChange("search", e.target.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel>ວັນທີ່ເລີ່ມ</FormLabel>
              <Input
                type="date"
                value={filter.startDate}
                onChange={(e) => handleChange("startDate", e.target.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel>ວັນທີ່ສິ້ນສຸດ</FormLabel>
              <Input
                type="date"
                value={filter.endDate}
                onChange={(e) => handleChange("endDate", e.target.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel>ສະກຸນເງິນ</FormLabel>
              <Select
                placeholder="All"
                value={filter.currency}
                onChange={(e) => handleChange("currency", e.target.value)}
              >
                <option value="LAK">LAK</option>
                <option value="USD">USD</option>
                <option value="THB">THB</option>
                <option value="CNY">CNY</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>ສະຖານະ</FormLabel>
              <Select
                placeholder="All"
                value={filter.status}
                onChange={(e) => handleChange("status", e.target.value)}
              >
                <option value="draft">Draft</option>
                <option value="posted">Posted</option>
              </Select>
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleReset}>
            Reset
          </Button>
          <Button colorScheme="blue" onClick={handleApply}>
            Apply
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default JournalFilterModal;
