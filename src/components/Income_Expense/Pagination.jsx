"use client";

import { HStack, IconButton, Badge } from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";

export default function Pagination({ page, totalPages, setPage }) {
  return (
    <HStack spacing={3}>
      <IconButton
        icon={<ChevronLeftIcon />}
        onClick={() => setPage(page - 1)}
        isDisabled={page === 1}
      />
      <Badge>
        {page} / {totalPages}
      </Badge>
      <IconButton
        icon={<ChevronRightIcon />}
        onClick={() => setPage(page + 1)}
        isDisabled={page === totalPages}
      />
    </HStack>
  );
}
