import React, { useEffect, useState } from "react";
import {
  Box,
  Text,
  Button,
  Flex,
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
} from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import {
  closePeriod,
  period_status,
} from "../store/accountingReducer/reportsSlice";
import Swal from "sweetalert2";
import LedgerLoading from "../components/Loading";

export default function ClosePeriodPage() {
  const dispatch = useDispatch();
  const { period_status: data, loading } = useSelector((s) => s.reports);

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [closing, setClosing] = useState(false);
  
  /* ===============================
     LOAD PERIOD STATUS
  =============================== */
  useEffect(() => {
  dispatch(period_status({year:selectedYear}));
  }, [dispatch]);

  const selectedYearStatus = data?.years?.find((y) => y.year === selectedYear);

  const isClosed = selectedYearStatus?.isClosed;

  /* ===============================
     CLOSE YEAR
  =============================== */
  const handleCloseYear = async () => {
    const confirm = await Swal.fire({
      title: "ยืนยันการปิดบัญชี?",
      html: `
        <b>ปี:</b> ${selectedYear} <br/><br/>
        <span style="color:red">
          ⚠️ การปิดปีไม่สามารถย้อนกลับได้
        </span>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ปิดปี",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#e53e3e",
    });

    if (!confirm.isConfirmed) return;

    try {
      setClosing(true);

      await dispatch(
        closePeriod({
          year: selectedYear,
          month: 12,
        })
      ).unwrap();

      await Swal.fire({
        icon: "success",
        title: "ปิดปีสำเร็จ",
        timer: 2000,
        showConfirmButton: false,
      });

      // 🔄 AUTO REFRESH
      dispatch(period_status());
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "ปิดปีไม่สำเร็จ",
        text: err?.message || err || "เกิดข้อผิดพลาด",
      });
    } finally {
      setClosing(false);
    }
  };

  /* ===============================
     EXPORT REPORT
  =============================== */
  const handleExport = (year) => {
    Swal.fire({
      icon: "info",
      title: "Export Report",
      text: `กำลัง export รายงานของปี ${year}`,
    });

    // 👉 เชื่อม API export /reports/export?year=xxxx
  };
  console.log(data);
  if (loading) {
    return <LedgerLoading />;
  }
  /* ===============================
     RENDER
  =============================== */
  return (
    <Box p={8} bg="gray.50" minH="100vh">
      {/* HEADER */}
      <Flex justify="space-between" mb={6}>
        <Box>
          <Text fontSize="2xl" fontWeight="bold">
            การปิดบัญชีประจำปี
          </Text>
          <Text color="gray.600">เลือกดูสถานะ และปิดปีบัญชี</Text>
        </Box>
      </Flex>

      {/* YEAR SELECT */}
      <HStack mb={6} spacing={4}>
        <Text>เลือกปี:</Text>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          style={{
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid #CBD5E0",
          }}
        >
          {data?.years?.map((y) => (
            <option key={y.year} value={y.year}>
              {y.year}
            </option>
          ))}
        </select>

        {isClosed ? (
          <Badge colorScheme="red">🔒 ปิดแล้ว</Badge>
        ) : (
          <Badge colorScheme="green">🟢 ยังเปิดอยู่</Badge>
        )}
      </HStack>

      {/* STATUS */}
      <Stat mb={6}>
        <StatLabel>สถานะปี {selectedYear}</StatLabel>
        <StatNumber>
          {isClosed ? "🔒 ปิดบัญชีแล้ว" : "🟢 ยังเปิดอยู่"}
        </StatNumber>
      </Stat>

      {!isClosed && selectedYear === currentYear && (
        <Alert status="warning" mb={6}>
          <AlertIcon />
          เมื่อปิดปีแล้ว จะไม่สามารถแก้ไขข้อมูลในปีนี้ได้
        </Alert>
      )}

      <Divider my={6} />

      {/* ACTION */}
      <HStack spacing={4}>
        <Button
          colorScheme="red"
          onClick={handleCloseYear}
          isDisabled={isClosed || selectedYear !== currentYear}
        >
          {closing ? <Spinner size="sm" /> : `ปิดบัญชีปี ${selectedYear}`}
        </Button>

        {isClosed && (
          <Button colorScheme="blue" onClick={() => handleExport(selectedYear)}>
            📄 Export รายงานปี {selectedYear}
          </Button>
        )}
      </HStack>

      {/* TIMELINE */}
      <Divider my={10} />
      <Text fontSize="lg" fontWeight="bold" mb={4}>
        📊 Timeline การปิดบัญชี
      </Text>

      <SimpleGrid columns={[1, 2, 3]} spacing={4}>
        {data?.years?.map((y) => (
          <Box
            key={y.year}
            p={4}
            bg="white"
            borderRadius="md"
            border="1px solid #e2e8f0"
          >
            <Text fontWeight="bold">{y.year}</Text>
            <Badge mt={2} colorScheme={y.isClosed ? "red" : "green"}>
              {y.isClosed ? "🔒 ปิดแล้ว" : "🟢 เปิดอยู่"}
            </Badge>

            {y.isClosed && (
              <Button
                size="sm"
                mt={3}
                colorScheme="blue"
                onClick={() => handleExport(y.year)}
              >
                Export Report
              </Button>
            )}
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}
