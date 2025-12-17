"use client";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Center,
  Container,
  Heading,
  HStack,
} from "@chakra-ui/react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import Swal from "sweetalert2";

import RenderFields from "../components/Income_Expense/FormFieldsAdd";
import {
  createIncomeExpense,
  removeCurrencyFromServer,
  updateIncomeExpense,
} from "../store/reducer/incomeExpense";
import toast from "react-hot-toast";

const INITIAL_FORM = {
  serial: "",
  type: "income",
  paymentMethod: "cash",
  description: "",
  date: "",
  status: "paid",
  categoryId: null,
  note: "",
  status_Ap: "pending",
  amounts: [{ currency: "LAK", amount: "", accountId: "" }],
};

const FormIncomeExpense = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const mode = state?.mode ?? "create"; // create | edit
  const editData = state?.data;
  const [form, setForm] = useState(INITIAL_FORM);
  const [id, setId] = useState(null);

  /* ================= INIT FORM (EDIT) ================= */
  useEffect(() => {
    if (mode === "edit" && editData) {
      setId(editData?._id);
      setForm({
        serial: editData?.serial ?? "",
        type: editData?.type ?? "income",
        paymentMethod: editData?.paymentMethod ?? "cash",
        description: editData?.description ?? "",
        date: editData?.date?.split("T")[0] ?? "",
        status: editData?.status ?? "paid",
        categoryId: editData?.categoryId?._id ?? null,
        note: editData?.note ?? "",
        status_Ap: editData?.status_Ap ?? "pending",
        amounts: editData?.amounts?.length
          ? editData?.amounts
          : INITIAL_FORM.amounts,
      });
    }
  }, [mode, editData]);

  /* ================= FORM HELPERS ================= */
  const updateField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateCurrency = useCallback((index, field, value) => {
    setForm((prev) => {
      const next = [...prev.amounts];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, amounts: next };
    });
  }, []);

  const addCurrency = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      amounts: [
        ...prev.amounts,
        { currency: "LAK", amount: "", accountId: "" },
      ],
    }));
  }, []);

  const removeCurrency = useCallback(
    async (currencyIndex, transactionId = null) => {
      // 👉 ถ้ามี transactionId = ลบที่ server ก่อน
      if (transactionId) {
        try {
          await dispatch(
            removeCurrencyFromServer({
              currencyIndex,
              index: transactionId,
            })
          ).unwrap();

          Swal.fire({
            title: "ລົບສຳເລັດ",
            text: "ລົບສະກຸນເງິນສຳເລັດ",
            icon: "success",
          });
        } catch (err) {
          Swal.fire({
            title: "ເກີດຂໍ້ຜິດພາດ",
            text: err?.message || "ບໍ່ສາມາດລົບສະກຸນເງິນ",
            icon: "error",
          });
          return; // ⛔ หยุด ถ้า server ล้มเหลว
        }
      }

      // 👉 ลบใน local state
      setForm((prev) => ({
        ...prev,
        amounts: prev.amounts.filter((_, i) => i !== currencyIndex),
      }));
    },
    [dispatch]
  );

  /* ================= VALIDATION ================= */
  const validateForm = useCallback(() => {
    const errors = [];
    if (!form.serial) errors.push("ເລກທີ່");
    if (!form.description) errors.push("ລາຍລະອຽດ");
    if (!form.date) errors.push("ວັນທີ");
    if (!form.note) errors.push("ໝາຍເຫດ");

    const hasAmount = form.amounts.some((a) => Number(a.amount) > 0);
    if (!hasAmount) errors.push("ຈຳນວນເງິນ");

    return errors;
  }, [form]);

  /* ================= SUBMIT (CREATE + EDIT) ================= */
  const handleSubmit = useCallback(async () => {
    const errors = validateForm();
    if (errors.length) {
      Swal.fire({
        title: "ຂໍ້ມູນບໍ່ຄົບ",
        text: errors.join(", "),
        icon: "error",
      });
      return;
    }

    try {
      const payload = {
        serial: form.serial,
        description: form.description,
        type: form.type,
        paymentMethod: form.paymentMethod,
        date: form.date,
        amounts: form.amounts,
        note: form.note,
        status: form.status,
        status_Ap: "pending",
        categoryId: form.categoryId,
      };

      const action =
        mode === "edit"
          ? updateIncomeExpense({ id, Editdata: payload })
          : createIncomeExpense({ transactions: payload });

      const res = await dispatch(action).unwrap();

      if (res?.success) {
        Swal.fire({
          title: "ສຳເລັດ",
          text: mode === "edit" ? "ແກ້ໄຂສຳເລັດ" : "ບັນທຶກສຳເລັດ",
          icon: "success",
        });
        navigate(-1);
      }
    } catch (err) {
      Swal.fire({
        title: "Error",
        text: err?.message || "Server error",
        icon: "error",
      });
    }
  }, [dispatch, form, id, mode, navigate, validateForm]);

  /* ================= RENDER ================= */
  return (
    <Box maxW="">
      <HStack justifyContent={"space-between"}>
        <Button
          fontFamily="Noto Sans Lao, sans-serif"
          mt={4}
          variant="ghost"
          onClick={() => navigate(-1)}
        >
          ⬅ ກັບຄືນ
        </Button>
        <Heading
          fontFamily="Noto Sans Lao, sans-serif"
          size="xl"
          bgGradient="linear(to-r, teal.400, blue.500)"
          bgClip="text"
        >
          {mode === "create" ? "ເພີ່ມລາຍການ" : "ແກ້ໄຂລາຍການ"}
        </Heading>
      </HStack>
      <Box mt={8}>
        <RenderFields
          {...form}
          setSerial={(v) => updateField("serial", v)}
          setType={(v) => updateField("type", v)}
          setPaymentMethod={(v) => updateField("paymentMethod", v)}
          setDescription={(v) => updateField("description", v)}
          setDate={(v) => updateField("date", v)}
          setStatus={(v) => updateField("status", v)}
          setCategoryId={(v) => updateField("categoryId", v)}
          setNote={(v) => updateField("note", v)}
          updateCurrency={updateCurrency}
          addCurrency={addCurrency}
          removeCurrency={removeCurrency}
          id={id}
          handleEdit={handleSubmit}
        />
      </Box>
    </Box>
  );
};

export default FormIncomeExpense;
