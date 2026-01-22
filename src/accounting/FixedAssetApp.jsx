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
    depreciationAmount,
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
  useEffect(() => {
    if (!selectedAsset?._id) return;

    const params = { from: "2026-01", to: "2026-12" };

    dispatch(getDepreciationPreview({ assetId: selectedAsset._id }));
    dispatch(getdepreiation({ assetId: selectedAsset._id }));
  }, [selectedAsset, dispatch]);

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
          <Text fontSize="sm" color="gray.600">
            ກຳລັງສະແດງຂໍ້ມູນ
          </Text>
          <Badge colorScheme="blue">{label}</Badge>
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
    console.log(journalId);
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
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "ລົບບໍ່ສຳເລັດ",
        text: error?.message || "ເກີດຂໍ້ຜິດພາດ",
      });
    }
  };

  const handleRollback = async (assetId) => {
    const { value, isConfirmed } = await Swal.fire({
      title: "Rollback Asset",
      html: `
      <div style="text-align:left">
        <label>
          <input type="radio" name="rollbackType" value="keep" checked />
          🔄 Rollback accounting only (keep asset)
        </label><br/><br/>
        <label>
          <input type="radio" name="rollbackType" value="delete" />
          ❌ Rollback and delete asset
        </label>
        <p style="color:red;margin-top:8px">
          ⚠️ Deleting asset cannot be undone
        </p>
      </div>
    `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Confirm",
      confirmButtonColor: "#d33",
      preConfirm: () => {
        const selected = document.querySelector(
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

    /* 🔐 Extra confirm for delete */
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

    dispatch(
      rollbackFixedAsset({
        assetId,
        deleteAsset,
      })
    );
  };

  /* ------------------ render ------------------ */
  return (
    <ChakraProvider>
      <Box bg="gray.50" minH="100vh">
        {activeFilterLabel && <ActiveFilterBar label={activeFilterLabel} />}

        {view === "list" ? (
          <AssetListPage
            assets={list}
            loading={loading}
            filter={filter}
            depreciationAmount={depreciationAmount}
            setFilter={setFilter}
            yearOptions={yearOptions}
            search={search}
            setSearch={setSearch}
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
            formatCurrency={formatCurrency}
            getStatusColor={getStatusColor}
            onBack={() => setView("list")}
          />
        )}
      </Box>
    </ChakraProvider>
  );
}

export default FixedAssetApp;
