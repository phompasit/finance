import React, { useState, useMemo } from "react";
import {
  Box,
  Button,
  Card,
  CardBody,
  Divider,
  FormControl,
  FormLabel,
  Input,
  Radio,
  RadioGroup,
  Stack,
  Text,
  VStack,
  HStack,
  Alert,
  AlertIcon,
  Heading,
} from "@chakra-ui/react";
import { DollarSign } from "lucide-react";
import { useDispatch } from "react-redux";
import { postDepreciationForAsset } from "../../store/assetService/assetThunk";
import Swal from "sweetalert2";

const DisposalSection = ({
  depreciationAmount,
  selectedAsset,
  formatCurrency,
}) => {
  const dispatch = useDispatch();

  /* ================= State ================= */
  const [type, setType] = useState("sale"); // sale | disposal | depreciation
  const [period, setPeriod] = useState(""); // YYYY-MM (depreciation only)
  const [eventDate, setEventDate] = useState(""); // YYYY-MM-DD (sale / disposal)
  const [saleAmount, setSaleAmount] = useState(
    selectedAsset?.salvageValue || 0
  );

  /* ================= Base Numbers ================= */
  const cost = Number(selectedAsset?.cost || 0);
  const accumulatedDep = Number(depreciationAmount || 0);
  const nbv = Math.max(cost - accumulatedDep, 0);

  /* ================= Gain / Loss Preview ================= */
  const gainLoss = useMemo(() => {
    if (type === "sale") return Number(saleAmount || 0) - nbv;
    if (type === "disposal") return -nbv;
    return 0;
  }, [type, saleAmount, nbv]);

  const gainLossColor = gainLoss >= 0 ? "green.600" : "red.600";

  /* ================= Submit ================= */
  const handlePost = async () => {
    try {
      // ===== validation =====
      if (type === "depreciation" && !period) {
        return Swal.fire("ຜິດພາດ", "ກະລຸນາເລືອກເດືອນ / ປີ", "warning");
      }

      if ((type === "sale" || type === "disposal") && !eventDate) {
        return Swal.fire("ຜິດພາດ", "ກະລຸນາເລືອກວັນ", "warning");
      }

      // ===== confirm =====
      const confirm = await Swal.fire({
        title: "ຢືນຢັນ",
        text: "ຕ້ອງການບັນທຶກລາຍການນີ້ບໍ?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "ຢືນຢັນ",
      });

      if (!confirm.isConfirmed) return;

      // ===== payload =====
      const payload = {
        id: selectedAsset._id,
        type,
      };

      if (type === "depreciation") {
        payload.period = period; // YYYY-MM
      }

      if (type === "sale" || type === "disposal") {
        payload.eventDate = eventDate; // YYYY-MM-DD
      }

      if (type === "sale") {
        payload.saleAmount = Number(saleAmount || 0);
      }

      // ===== dispatch =====
      await dispatch(postDepreciationForAsset(payload)).unwrap();

      await Swal.fire("ສຳເລັດ", "ບັນທຶກສຳເລັດແລ້ວ", "success");
    } catch (err) {
      Swal.fire(
        "Error",
        err?.message || "ບັນທຶກບໍ່ສຳເລັດ",
        "error"
      );
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      <Alert status="info">
        <AlertIcon />
        ລະບົບຈະຄຳນວນຄ່າຫຼຸ້ຍຫ້ຽນ ແລະ ກຳໄລ / ຂາດທຶນ ໃຫ້ອັດຕະໂນມັດ
      </Alert>

      <Card>
        <CardBody>
          <VStack spacing={5} align="stretch">
            {/* ===== Type ===== */}
            <FormControl>
              <FormLabel>ປະເພດລາຍການ</FormLabel>
              <RadioGroup value={type} onChange={setType}>
                <Stack direction="row">
                  <Radio value="sale">ຂາຍ</Radio>
                  <Radio value="disposal">ປ່ອຍຊັບສິນ</Radio>
                  <Radio value="depreciation">ຫັກຄ່າຫຼຸ້ຍຫ້ຽນ</Radio>
                </Stack>
              </RadioGroup>
            </FormControl>

            {/* ===== Period / Date ===== */}
            {type === "depreciation" && (
              <FormControl isRequired>
                <FormLabel>ເດືອນ / ປີ</FormLabel>
                <Input
                  type="month"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                />
              </FormControl>
            )}

            {(type === "sale" || type === "disposal") && (
              <FormControl isRequired>
                <FormLabel>ວັນຂາຍ / ວັນປ່ອຍ</FormLabel>
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </FormControl>
            )}

            {/* ===== Sale Amount ===== */}
            {type === "sale" && (
              <FormControl isRequired>
                <FormLabel>ຈຳນວນເງິນຂາຍ</FormLabel>
                <Input
                  type="number"
                  value={saleAmount}
                  onChange={(e) => setSaleAmount(e.target.value)}
                />
              </FormControl>
            )}

            <Divider />

            {/* ===== Preview ===== */}
            <Box bg="gray.50" p={4} borderRadius="md">
              <VStack spacing={2} fontSize="sm">
                <Heading size="xs">ສະຫຼຸບ</Heading>

                <HStack justify="space-between">
                  <Text>ມູນຄ່າຕາມບັນຊີ</Text>
                  <Text>{formatCurrency(nbv)}</Text>
                </HStack>

                <HStack justify="space-between">
                  <Text color={gainLossColor} fontWeight="bold">
                    ກຳໄລ / (ຂາດທຶນ)
                  </Text>
                  <Text color={gainLossColor} fontWeight="bold">
                    {formatCurrency(gainLoss)}
                  </Text>
                </HStack>
              </VStack>
            </Box>

            {/* ===== Submit ===== */}
            <Button
              colorScheme="orange"
              leftIcon={<DollarSign size={16} />}
              onClick={handlePost}
            >
              ບັນທຶກລາຍການ
            </Button>
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  );
};

export default DisposalSection;
