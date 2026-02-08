"use client";
import React, { useEffect, useState } from "react";
import {
  Container,
  SimpleGrid,
  Spinner,
  Center,
  Heading,
} from "@chakra-ui/react";
import api from "../api/api";
import FilterBar from "../components/report/FilterBar";
import CurrencyCard from "../components/report/CurrencyCard";
import TrendTabs from "../components/report/TrendTabs";

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({});

  // const fetchData = async () => {
  //   const { data } = await api.get("/api/report/sumsmary", {
  //     params: filters,
  //   });
  //   setData(data);
  // };

  // useEffect(() => {
  //   fetchData();
  // }, []);

  if (!data) {
    return (
      <Center h="60vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  return (
    <Container maxW="container.xl" py={6}>
      {/* <FilterBar onApply={setFilters} />

      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={6} mt={6}>
        {Object.entries(data.summary).map(([currency, s]) => (
          <CurrencyCard key={currency} currency={currency} data={s} />
        ))}
      </SimpleGrid>

      <TrendTabs trend={data.trend} /> */}
      <Heading>Comming Soon...</Heading>
    </Container>
  );
}
