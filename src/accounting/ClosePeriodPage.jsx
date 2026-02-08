import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Text,
  Button,
  HStack,
  Badge,
  Divider,
  Alert,
  AlertIcon,
  Stat,
  StatLabel,
  StatNumber,
  SimpleGrid,
  Spinner,
  Select,
  VStack,
  Flex,
} from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchPeriodStatus,
  closePeriod,
  rollbackPeriod,
} from "../store/accountingReducer/reportsSlice";
import Swal from "sweetalert2";
import LedgerLoading from "../components/Loading";

export default function ClosePeriodPage() {
  const dispatch = useDispatch();

  const { periodStatus, loading, closing, rollingBack } = useSelector(
    (s) => s.reports
  );
  console.log("periodStatus", periodStatus);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  /* ================= LOAD ================= */
  useEffect(() => {
    dispatch(fetchPeriodStatus({}));
  }, [dispatch]);

  /* ================= DERIVED ================= */
  const selectedYearStatus = useMemo(() => {
    return periodStatus?.find((y) => y.year === selectedYear);
  }, [periodStatus, selectedYear]);

  const isClosed = !!selectedYearStatus?.isClosed;

  /* ================= ACTIONS ================= */
  const handleCloseYear = async () => {
    const confirm = await Swal.fire({
      title: "ຢືນຢັນປິດປີບັນຊີ?",
      html: `
        <b>ປີ:</b> ${selectedYear}<br/>
        <span style="color:red">
          ⚠️ ຫຼັງຈາກປິດແລ້ວ ຈະບໍ່ສາມາດແກ້ໄຂຂໍ້ມູນໄດ້
        </span>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "✅ ປິດປີ",
      cancelButtonText: "ຍົກເລີກ",
      confirmButtonColor: "#e53e3e",
    });

    if (!confirm.isConfirmed) return;

    try {
      await dispatch(closePeriod({ year: selectedYear, month: 12 })).unwrap();

      Swal.fire({
        icon: "success",
        title: "ປິດປີສຳເລັດ ✅",
        timer: 1500,
        showConfirmButton: false,
      });

      dispatch(fetchPeriodStatus({}));
    } catch (err) {
      Swal.fire("ຜິດພາດ", String(err), "error");
    }
  };

  const handleRollbackYear = async () => {
    const confirm = await Swal.fire({
      title: "Rollback ປີບັນຊີ",
      html: `
        <b>ປີ:</b> ${selectedYear}<br/>
        <span style="color:red">
          ⚠️ ຈະເປີດໃຫ້ແກ້ໄຂບັນຊີໄດ້ອີກຄັ້ງ
        </span>
      `,
      icon: "error",
      showCancelButton: true,
      confirmButtonText: "Rollback",
      cancelButtonText: "ຍົກເລີກ",
      confirmButtonColor: "#d33",
    });

    if (!confirm.isConfirmed) return;

    try {
      await dispatch(rollbackPeriod({ year: selectedYear })).unwrap();

      Swal.fire({
        icon: "success",
        title: "Rollback ສຳເລັດ ✅",
        timer: 1500,
        showConfirmButton: false,
      });

      dispatch(fetchPeriodStatus({}));
    } catch (err) {
      Swal.fire("ຜິດພາດ", String(err), "error");
    }
  };

  if (loading && !periodStatus) return <LedgerLoading />;

  /* ================= UI ================= */
  return (
    <Box p={10} bg="gray.100" minH="100vh">
      {/* Header */}
      <Text
        fontFamily="Noto Sans Lao, sans-serif"
        fontSize="3xl"
        fontWeight="bold"
        mb={2}
      >
        📌 ການປິດງວດບັນຊີປະຈຳປີ
      </Text>
      <Text fontFamily="Noto Sans Lao, sans-serif" color="gray.600" mb={8}>
        ຈັດການການປິດປີບັນຊີ ແລະ Rollback ຖ້າຈຳເປັນ
      </Text>

      {/* Card */}
      <Box bg="white" p={6} borderRadius="xl" shadow="md">
        <Flex justify="space-between" align="center" wrap="wrap">
          {/* Select Year */}
          <VStack align="start" spacing={1}>
            <Text fontWeight="bold" mb={2}>
              ເລືອກປີບັນຊີ:
            </Text>

            <HStack spacing={3} wrap="wrap">
              <Select
                fontFamily="Noto Sans Lao, sans-serif"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                w="200px"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </Select>
            </HStack>
          </VStack>

          {/* Status Badge */}
          <Badge
            fontFamily="Noto Sans Lao, sans-serif"
            px={4}
            py={2}
            borderRadius="full"
            fontSize="md"
            colorScheme={isClosed ? "red" : "green"}
          >
            {isClosed ? "🔒 ປິດແລ້ວ" : "🟢 ກຳລັງເປີດ"}
          </Badge>
        </Flex>

        {/* Stat */}
        <Stat mt={6}>
          <StatLabel fontFamily="Noto Sans Lao, sans-serif">
            ສະຖານະປີ {selectedYear}
          </StatLabel>
          <StatNumber fontFamily="Noto Sans Lao, sans-serif" fontSize="xl">
            {isClosed ? "✅ ປິດບັນຊີແລ້ວ" : "📂 ຍັງເປີດຢູ່"}
          </StatNumber>
        </Stat>

        {/* Warning */}
        {!isClosed && selectedYear === currentYear && (
          <Alert
            fontFamily="Noto Sans Lao, sans-serif"
            status="warning"
            mt={4}
            borderRadius="md"
          >
            <AlertIcon />
            ຫຼັງຈາກປິດປີ ຈະບໍ່ສາມາດແກ້ໄຂບັນຊີໄດ້
          </Alert>
        )}

        <Divider my={6} />

        {/* Buttons */}
        <HStack spacing={4}>
          <Button
            colorScheme="red"
            size="lg"
            onClick={handleCloseYear}
            fontFamily="Noto Sans Lao, sans-serif"
            isDisabled={isClosed}
          >
            {closing ? <Spinner size="sm" /> : "✅ ປິດປີ"}
          </Button>

          {isClosed && (
            <Button
              colorScheme="orange"
              size="lg"
              onClick={handleRollbackYear}
              isDisabled={rollingBack}
            >
              {rollingBack ? <Spinner size="sm" /> : "↩ Rollback"}
            </Button>
          )}
        </HStack>
      </Box>

      {/* Summary */}
      <Divider my={10} />

      <Text
        fontFamily="Noto Sans Lao, sans-serif"
        fontSize="xl"
        fontWeight="bold"
        mb={4}
      >
        📊 ປະຫວັດການປິດປີບັນຊີ
      </Text>

      <SimpleGrid columns={[1, 2, 3]} spacing={5}>
        {periodStatus?.map((y) => (
          <Box
            key={y.year}
            p={5}
            bg="white"
            borderRadius="xl"
            fontFamily="Noto Sans Lao, sans-serif"
            shadow="sm"
            transition="0.2s"
            _hover={{ shadow: "md", transform: "scale(1.02)" }}
          >
            <Text
              fontFamily="Noto Sans Lao, sans-serif"
              fontWeight="bold"
              fontSize="lg"
            >
              ປີ {y.year}
            </Text>

            <Badge
              mt={3}
              fontFamily="Noto Sans Lao, sans-serif"
              px={3}
              py={1}
              borderRadius="full"
              colorScheme={y.isClosed ? "red" : "green"}
            >
              {y.isClosed ? "🔒 ປິດແລ້ວ" : "🟢 ເປີດຢູ່"}
            </Badge>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}
