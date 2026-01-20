import { Flex, Button } from "@chakra-ui/react";
import ReportFilter from "../Accounting_component/ReportFilter";
import { useMemo } from "react";

const FILTER_MODE = {
  YEAR: "YEAR",
  MONTH: "MONTH",
  PRESET: "PRESET",
  RANGE: "RANGE",
};

const LedgerFilterBar = ({ filter, setFilter, onApply }) => {
  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [
      current + 1,
      current,
      ...Array.from({ length: 6 }, (_, i) => current - (i + 1)),
    ];
  }, []);
  return (
    <ReportFilter
      filter={filter}
      yearOptions={yearOptions}
      setFilter={setFilter}
      FILTER_MODE={FILTER_MODE}
      onApply={onApply}
    />
  );
};

export default LedgerFilterBar;
