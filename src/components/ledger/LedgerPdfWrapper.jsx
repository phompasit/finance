import React, { forwardRef } from "react";
import { Box } from "@chakra-ui/react";
import GeneralGL from "../../accounting/PDF/GeneralGL";
import { useAuth } from "../../context/AuthContext";

const LedgerPdfWrapper = forwardRef(({ data, filter, activeTab }, ref) => {
  const { user } = useAuth();
  return (
    <Box position="absolute" top="-9999px" left="-9999px">
      <div ref={ref}>
        <GeneralGL
          filter={filter}
          activeTab={activeTab}
          data={data}
          user={user}
        />
      </div>
    </Box>
  );
});

export default LedgerPdfWrapper;
