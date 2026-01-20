import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@chakra-ui/react";

const TAB_KEYS = ["CASH", "BANK", "ALL"];

const LedgerTabs = ({ activeTab, onChange }) => {
  const index = TAB_KEYS.indexOf(activeTab);

  return (
    <Tabs
      index={index}
      onChange={(i) => onChange(TAB_KEYS[i])}
      variant="enclosed"
      mb={4}
    >
      <TabList>
        <Tab>📕 ปื้มเงินสด</Tab>
        <Tab>📘 ปื้มเงินฝาก</Tab>
        <Tab>📙 ทั้งหมด</Tab>
      </TabList>

      <TabPanels>
        <TabPanel>
          <p>one!</p>
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
};

export default LedgerTabs;
