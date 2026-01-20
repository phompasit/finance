// src/pages/journal/JournalPrintModal.jsx
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Box,
} from "@chakra-ui/react";
import html2pdf from "html2pdf.js";
import journalPdfTemplate from "./journalPdfTemplate";
import pdfJournal from "../PDF/pdf";
import { useAuth } from "../../context/AuthContext";

export default function JournalPrintModal({
  isOpen,
  onClose,
  journals,
  filters,
}) {
  const { user } = useAuth();
    console.log("filter",filters)
    console.log("journals",journals)
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Print / Download Journal</ModalHeader>

        <ModalBody>
          <Box
            border="1px solid #ccc"
            p={4}
          />
        </ModalBody>

        <ModalFooter>
          <Button
            mr={3}
            onClick={() => pdfJournal({ data: journals, user: user })}
          >
            Print
          </Button>
          <Button colorScheme="blue" >
            Download PDF
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
