import React, { forwardRef } from "react";
import { Box } from "@chakra-ui/react";
import GeneralGL from "../../accounting/PDF/GeneralGL";
import { useAuth } from "../../context/AuthContext";
import { useMemo } from "react";
import { getFilterLabel } from "./filterLabel";
const LedgerPdfWrapper = forwardRef(({ data, filter, activeTab }, ref) => {
  const { user } = useAuth();

  const dateRange = useMemo(() => getFilterLabel(filter), [filter]);

  return (
    <Box position="absolute" top="-9999px" left="-9999px">
      <div ref={ref}>
        <GeneralGL
          dateRange={dateRange} // ← ชื่อถูก + เป็น string แล้ว
          activeTab={activeTab}
          data={data}
          user={user}
        />
      </div>
    </Box>
  );
});

export default LedgerPdfWrapper;
