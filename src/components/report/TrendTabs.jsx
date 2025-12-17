import {
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Box,
} from "@chakra-ui/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function TrendTabs({ trend }) {
  return (
    <Tabs mt={10}>
      <TabList>
        {Object.keys(trend)?.map((c) => (
          <Tab key={c}>{c}</Tab>
        ))}
      </TabList>

      <TabPanels>
        {Object.entries(trend)?.map(([c, data]) => (
          <TabPanel key={c}>
            <Box h="300px">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="income" fill="#38A169" />
                  <Bar dataKey="expense" fill="#E53E3E" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </TabPanel>
        ))}
      </TabPanels>
    </Tabs>
  );
}
