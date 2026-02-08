// pages/FixedAssetApp.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { ChakraProvider, Box, HStack, Text, Badge } from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";

import AssetListPage from "../components/FixedAsset/AssetListPage";
import AssetDetailPage from "../components/FixedAsset/AssetDetailPage";

import {
  delete_depreciation,
  getAllFixedAssets,
  getDepreciationPreview,
  getdepreiation,
  rollbackFixedAsset,
} from "../store/assetService/assetThunk";

/* ================= FILTER MODES ================= */
const FILTER_MODE = {
  YEAR: "YEAR",
  MONTH: "MONTH",
  PRESET: "PRESET",
  RANGE: "RANGE",
};

/* ================= DATE FORMAT ================= */
const formatDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date)) return d;
  return date.toLocaleDateString("en-GB");
};

function FixedAssetApp() {
  const dispatch = useDispatch();

  /* ------------------ redux state ------------------ */
  const {
    totalAmount = 0,
    journalEntries = [],
    schedule = [],
    monthlyAmount = 0,
    list = [],
    loading = false,
    depreciationBeforeYearAmount,
    depreciationAmount,
    depreciationThisYearAmount,
  } = useSelector((s) => s.fixedAsset);

  /* ------------------ local state ------------------ */
  const [view, setView] = useState("list");
  const [selectedAsset, setSelectedAsset] = useState(null);

  /* ================= YEAR OPTIONS ================= */
  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [
      current + 1,
      current,
      ...Array.from({ length: 6 }, (_, i) => current - (i + 1)),
    ];
  }, []);

  /* ================= FILTER STATE ================= */
  const [filter, setFilter] = useState({
    mode: FILTER_MODE.YEAR,
    year: new Date().getFullYear(),
    month: null,
    preset: null,
    startDate: null,
    endDate: null,
  });

  const [appliedFilter, setAppliedFilter] = useState(null);
  const [search, setSearch] = useState("");

  /* ================= RESET INVALID FIELD WHEN MODE CHANGE ================= */
  useEffect(() => {
    setFilter((prev) => {
      switch (prev.mode) {
        case FILTER_MODE.YEAR:
          return {
            ...prev,
            month: null,
            preset: null,
            startDate: null,
            endDate: null,
          };
        case FILTER_MODE.MONTH:
          return { ...prev, preset: null, startDate: null, endDate: null };
        case FILTER_MODE.PRESET:
          return { ...prev, month: null, startDate: null, endDate: null };
        case FILTER_MODE.RANGE:
          return { ...prev, month: null, preset: null };
        default:
          return prev;
      }
    });
  }, [filter.mode]);

  /* ================= BUILD PARAMS (SAFE) ================= */
  const buildParams = useCallback(() => {
    const params = {};

    if (filter.year) params.year = filter.year;

    if (filter.mode === FILTER_MODE.MONTH && filter.month) {
      params.month = filter.month;
    }

    if (filter.mode === FILTER_MODE.PRESET && filter.preset) {
      params.preset = filter.preset;
    }

    if (
      filter.mode === FILTER_MODE.RANGE &&
      filter.startDate &&
      filter.endDate
    ) {
      params.startDate = filter.startDate;
      params.endDate = filter.endDate;
    }

    if (search) params.search = search;

    return params;
  }, [filter, search]);

  /* ================= APPLY FILTER ================= */
  const handleFetch = useCallback(() => {
    const params = buildParams();
    dispatch(getAllFixedAssets(params));
    setAppliedFilter(filter);
  }, [dispatch, buildParams, filter]);

  /* ------------------ initial load ------------------ */
  useEffect(() => {
    dispatch(getAllFixedAssets());
  }, [dispatch]);

  /* ------------------ depreciation load ------------------ */
  const reloadAssetDetail = useCallback(() => {
    if (!selectedAsset?._id) return;

    dispatch(getDepreciationPreview({ assetId: selectedAsset._id }));
    dispatch(getdepreiation({ assetId: selectedAsset._id }));
  }, [dispatch, selectedAsset]);

  useEffect(() => {
    reloadAssetDetail();
  }, [reloadAssetDetail]);
  const askToRefresh = async () => {
    const { isConfirmed } = await Swal.fire({
      title: "ດຶງຂໍ້ມູນລ່າສຸດ?",
      text: "ຂໍ້ມູນອາດຈະມີການປ່ຽນແປງ",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "🔄 ດຶງທັນທີ",
    });

    if (isConfirmed) {
      reloadAssetDetail();
    }
  };
  /* ================= FILTER LABEL ================= */
  const getFilterLabel = (f) => {
    if (!f) return "";

    switch (f.mode) {
      case FILTER_MODE.YEAR:
        return `ປີບັນຊີ: ${f.year}`;
      case FILTER_MODE.MONTH:
        return `ເດືອນ: ${String(f.month).padStart(2, "0")}/${f.year}`;
      case FILTER_MODE.RANGE:
        return `ຊ່ວງວັນທີ: ${formatDate(f.startDate)} – ${formatDate(
          f.endDate
        )}`;
      case FILTER_MODE.PRESET:
        return `Preset: ${f.preset}`;
      default:
        return "";
    }
  };

  const activeFilterLabel = useMemo(() => getFilterLabel(appliedFilter), [
    appliedFilter,
  ]);

  const ActiveFilterBar = ({ label }) => {
    if (!label) return null;

    return (
      <Box px={4} py={2} border="1px solid" borderColor="gray.200" bg="gray.50">
        <HStack>
          <Text
            fontFamily="Noto Sans Lao, sans-serif"
            fontSize="sm"
            color="gray.600"
          >
            ກຳລັງສະແດງຂໍ້ມູນ
          </Text>
          <Badge fontFamily="Noto Sans Lao, sans-serif" colorScheme="blue">
            {label}
          </Badge>
        </HStack>
      </Box>
    );
  };

  /* ------------------ helpers ------------------ */
  const formatCurrency = (amount = 0) =>
    new Intl.NumberFormat("en-US").format(amount) + " ₭";

  const getStatusColor = (status = "") => {
    switch (status.toLowerCase()) {
      case "active":
        return "green";
      case "sold":
        return "orange";
      case "disposed":
        return "red";
      default:
        return "gray";
    }
  };

  /* ------------------ delete depreciation ------------------ */
  const handleDeleteDepreciationAndJournal = async (journalId) => {
    const { isConfirmed } = await Swal.fire({
      title: "ຢືນຢັນລົບຂໍ້ມູນ",
      text: "ຂໍ້ມູນການຕັດຄ່າເສື່ອມ ແລະ Journal ຈະຖືກລົບຖາວອນ",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ລົບ",
      cancelButtonText: "ຍົກເລີກ",
      confirmButtonColor: "#d33",
    });

    if (!isConfirmed) return;
    try {
      await dispatch(
        delete_depreciation({
          journalId: journalId.journalId,
          DepreciationId: journalId.DepreciationId,
        })
      ).unwrap();

      Swal.fire({
        icon: "success",
        title: "ລົບສຳເລັດ",
        timer: 1500,
        showConfirmButton: false,
      });
      await askToRefresh(); // 👈 ถามต่อ
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "ລົບບໍ່ສຳເລັດ",
        text: error?.message || "ເກີດຂໍ້ຜິດພາດ",
      });
    }
  };

  const handleRollback = async (assetId) => {
    try {
      const { value, isConfirmed } = await Swal.fire({
        title: "Rollback Asset",
        html: `
          <div style="text-align:left">
            <label>
              <input type="radio" name="rollbackType" value="keep" checked />
              🔄 ລົບພຽງແຕ່ຄ່າຫຼຸ້ຍ ແລະ ລາຍການບັນຊີ
            </label><br/><br/>
            <label>
              <input type="radio" name="rollbackType" value="delete" />
              ❌ ລົບຂໍ້ມູນທັງໝົດ
            </label>
            <p style="color:red;margin-top:8px">
              ⚠️ ເມື່ອດຳເນີນການແລ້ວບໍ່ສາມາດຍ້ອນຄືນໄດ້
            </p>
          </div>
        `,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Confirm",
        confirmButtonColor: "#d33",
        preConfirm: () => {
          const popup = Swal.getPopup();
          const selected = popup.querySelector(
            'input[name="rollbackType"]:checked'
          );
          if (!selected) {
            Swal.showValidationMessage("Please select rollback option");
            return false;
          }
          return selected.value;
        },
      });

      if (!isConfirmed) return;

      const deleteAsset = value === "delete";

      // Extra confirm for delete
      if (deleteAsset) {
        const secondConfirm = await Swal.fire({
          title: "Are you absolutely sure?",
          text: "This will permanently delete the asset",
          icon: "error",
          showCancelButton: true,
          confirmButtonColor: "#d33",
          confirmButtonText: "Yes, delete it",
        });
        if (!secondConfirm.isConfirmed) return;
      }

      // Dispatch rollback
      await dispatch(rollbackFixedAsset({ assetId, deleteAsset })).unwrap();

      Swal.fire({
        icon: "success",
        title: "Rollback successful",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Rollback failed",
        text: err,
      });
    }
  };

  /* ------------------ render ------------------ */
  return (
    <ChakraProvider>
      <Box bg="gray.50" minH="100vh">
        {view === "list" ? (
          <AssetListPage
            assets={list}
            loading={loading}
            activeFilterLabel={activeFilterLabel}
            filter={filter}
            ActiveFilterBar={ActiveFilterBar}
            depreciationAmount={depreciationAmount}
            depreciationBeforeYearAmount={depreciationBeforeYearAmount}
            setFilter={setFilter}
            yearOptions={yearOptions}
            search={search}
            setSearch={setSearch}
            depreciationThisYearAmount={depreciationThisYearAmount}
            onApplyFilter={handleFetch}
            FILTER_MODE={FILTER_MODE}
            formatCurrency={formatCurrency}
            getStatusColor={getStatusColor}
            handleRollback={handleRollback}
            onView={(asset) => {
              setSelectedAsset(asset);
              setView("detail");
            }}
          />
        ) : (
          <AssetDetailPage
            selectedAsset={selectedAsset}
            schedule={schedule}
            totalAmount={totalAmount}
            monthlyAmount={monthlyAmount}
            journalEntries={journalEntries}
            handleDeleteDepreciationAndJournal={
              handleDeleteDepreciationAndJournal
            }
            depreciationAmount={depreciationAmount}
            formatCurrency={formatCurrency}
            getStatusColor={getStatusColor}
            onBack={() => setView("list")}
            onRefresh={reloadAssetDetail} // 👈 ส่งเข้าไป
          />
        )}
      </Box>
    </ChakraProvider>
  );
}

export default FixedAssetApp;
