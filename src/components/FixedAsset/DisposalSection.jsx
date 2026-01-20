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

const DisposalSection = ({ selectedAsset, formatCurrency }) => {
  const [type, setType] = useState("sale"); // sale | disposal | trade
  const [period, setPeriod] = useState(""); // yyyy-mm
  const [saleAmount, setSaleAmount] = useState("");
  const [tradeValue, setTradeValue] = useState("");
  const dispatch = useDispatch();
  const nbv = selectedAsset?.netBookValue || 0;

  /* ================= Preview Gain / Loss ================= */
  const gainLoss = useMemo(() => {
    if (!period) return 0;

    if (type === "sale") {
      return Number(saleAmount || 0) - nbv;
    }

    if (type === "trade") {
      return Number(tradeValue || 0) - nbv;
    }

    // disposal
    return -nbv;
  }, [type, saleAmount, tradeValue, nbv, period]);

  const gainLossColor = gainLoss >= 0 ? "green.600" : "red.600";

  /* ================= Submit ================= */
  const handlePost = () => {
    // if (!period) {
    //   alert("Please select disposal period");
    //   return;
    // }

    const [year, month] = period.split("-").map(Number);

    const payload = {
      type,
      year,
      month,
    };

    if (type === "sale") payload.saleAmount = Number(saleAmount);
    if (type === "trade") payload.tradeValue = Number(tradeValue);
    payload.id = selectedAsset._id;
    console.log("POST DISPOSAL", payload);

    // TODO:
    dispatch(postDepreciationForAsset(payload));
    // api.post(`/assets/${selectedAsset.id}/dispose`, payload)
  };

  return (
    <VStack spacing={6} align="stretch">
      <Alert status="info">
        <AlertIcon />
        Select disposal type and period. System will calculate gain or loss
        automatically.
      </Alert>

      <Card>
        <CardBody>
          <VStack spacing={5} align="stretch">
            {/* ===== Disposal Type ===== */}
            <FormControl>
              <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                ເລືອກປະເພດ
              </FormLabel>
              <RadioGroup value={type} onChange={setType}>
                <Stack direction="row">
                  <Radio fontFamily="Noto Sans Lao, sans-serif" value="sale">
                    ຂາຍ
                  </Radio>
                  {/* <Radio value="disposal"></Radio> */}
                  {/* <Radio value="trade">Trade-in</Radio> */}
                  <Radio
                    fontFamily="Noto Sans Lao, sans-serif"
                    value="depreciation"
                  >
                    ຫັກຄ່າຫຼຸ້ຍຫ້ຽນ
                  </Radio>
                </Stack>
              </RadioGroup>
            </FormControl>

            {/* ===== Period ===== */}
            <FormControl isRequired>
              <FormLabel fontFamily="Noto Sans Lao, sans-serif">
                ເລືອກ ເດືອນ/ປີ ຫັກຄ່າຫຼຸ້ຍຫ້ຽນ
              </FormLabel>
              <Input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
            </FormControl>

            {/* ===== Amount Inputs ===== */}
            {type === "sale" && (
              <FormControl isRequired>
                <FormLabel fontFamily="Noto Sans Lao, sans-serif" >ຈຳນວນເງິນຂາຍ (₭)</FormLabel>
                <Input
                  type="number"
                  value={saleAmount}
                  onChange={(e) => setSaleAmount(e.target.value)}
                />
              </FormControl>
            )}

            {type === "trade" && (
              <FormControl isRequired>
                <FormLabel>Trade-in Value (₭)</FormLabel>
                <Input
                  type="number"
                  value={tradeValue}
                  onChange={(e) => setTradeValue(e.target.value)}
                />
              </FormControl>
            )}

            <Divider />

            {/* ===== Preview ===== */}
            <Box bg="gray.50" p={4} borderRadius="md">
              <VStack spacing={2} align="stretch" fontSize="sm">
                <Heading size="xs">Calculation Preview</Heading>

                <HStack justify="space-between">
                  <Text>Original Cost</Text>
                  <Text>{formatCurrency(selectedAsset?.cost)}</Text>
                </HStack>

                <HStack justify="space-between">
                  <Text>Accumulated Depreciation</Text>
                  <Text color="orange.600">
                    ({formatCurrency(selectedAsset?.accumulatedDep)})
                  </Text>
                </HStack>

                <Divider />

                <HStack justify="space-between">
                  <Text fontWeight="bold">Net Book Value</Text>
                  <Text fontWeight="bold">
                    {formatCurrency(selectedAsset?.netBookValue)}
                  </Text>
                </HStack>

                {type !== "disposal" && (
                  <HStack justify="space-between">
                    <Text fontWeight="bold">
                      {type === "sale" ? "Sale Amount" : "Trade-in Value"}
                    </Text>
                    <Text fontWeight="bold">
                      {formatCurrency(
                        type === "sale" ? saleAmount : tradeValue
                      )}
                    </Text>
                  </HStack>
                )}

                <Divider />

                <HStack justify="space-between">
                  <Text fontWeight="bold" color={gainLossColor}>
                    Gain / (Loss)
                  </Text>
                  <Text fontWeight="bold" color={gainLossColor}>
                    {formatCurrency(gainLoss)}
                  </Text>
                </HStack>
              </VStack>
            </Box>

            {/* ===== Submit ===== */}
            <Button
              colorScheme="orange"
              leftIcon={<DollarSign size={16} />}
              w="full"
              onClick={handlePost}
            >
              Post Disposal
            </Button>
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  );
};

export default DisposalSection;
