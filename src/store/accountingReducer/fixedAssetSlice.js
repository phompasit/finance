// store/asset/assetSlice.js
import { createSlice } from "@reduxjs/toolkit";
import {
  createAsset,
  updateAsset,
  getAssetById,
  getAllFixedAssets,
  getDepreciationPreview,
  postDepreciationForAsset,
  getdepreiation,
  delete_depreciation,
  rollbackFixedAsset,
} from "../assetService/assetThunk.js";

const initialState = {
  current: null, // asset ที่กำลัง edit
  loading: false,
  error: null,
  success: false,
  list: [],
  filters: {},
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
  asset: null,
  monthlyAmount: 0,
  schedule: [], // ตารางรายเดือน
  deprecations: null,
  totalAmount: 0,
  journalEntries: null,
  depreciationAmount: null,
  rollbackResult: null,
  depreciationThisYearAmount: null,
  depreciationBeforeYearAmount: null,
};

const assetSlice = createSlice({
  name: "asset",
  initialState,
  reducers: {
    resetAssetState: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.rollbackResult = null;
    },
    clearCurrentAsset: (state) => {
      state.current = null;
    },
    resetAssetError: (state) => {
      state.error = null;
    },
    clearDepreciationPreview: (state) => {
      state.asset = null;
      state.monthlyAmount = 0;
      state.schedule = [];
      state.journalEntries = null;
    },
  },
  extraReducers: (builder) => {
    builder
      /** CREATE */
      .addCase(createAsset.pending, (state) => {
        state.loading = true;
      })
      .addCase(createAsset.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.current = action.payload;
      })
      .addCase(createAsset.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /** UPDATE */
      .addCase(updateAsset.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateAsset.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.current = action.payload;
      })
      .addCase(updateAsset.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /** GET BY ID */
      .addCase(getAssetById.pending, (state) => {
        state.loading = true;
      })
      .addCase(getAssetById.fulfilled, (state, action) => {
        state.loading = false;
        state.current = action.payload.data;
      })
      .addCase(getAssetById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      /* ============ GET ALL FIXED ASSET ============ */
      .addCase(getAllFixedAssets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllFixedAssets.fulfilled, (state, action) => {
        state.loading = false;

        state.list = action.payload.assets;
        state.filters = action.payload.filters;
        state.pagination = action.payload.pagination;
        state.depreciationAmount = action.payload.depreciationAmount;
        state.depreciationThisYearAmount =
          action.payload.depreciationThisYearAmount;
        state.depreciationBeforeYearAmount =
          action.payload.depreciationBeforeYearAmount;
      })
      .addCase(getAllFixedAssets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Load assets failed";
      })

      /* ========== PREVIEW ========== */
      .addCase(getDepreciationPreview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDepreciationPreview.fulfilled, (state, action) => {
        state.loading = false;
        state.asset = action.payload.asset;
        state.monthlyAmount = action.payload.monthlyAmount;
        state.schedule = action.payload.schedule;
        state.journalEntries = action.payload.journal;
      })
      .addCase(getDepreciationPreview.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload?.message || "Load depreciation preview failed";
      })
      ///////postDepreciationForAsset
      .addCase(postDepreciationForAsset.pending, (state) => {
        state.loading = true;
      })
      .addCase(postDepreciationForAsset.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.current = action.payload;
      })
      .addCase(postDepreciationForAsset.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      /// getdepreiationAPI
      .addCase(getdepreiation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getdepreiation.fulfilled, (state, action) => {
        state.loading = false;
        state.deprecations = action.payload.data;
        state.totalAmount = action.payload.totalAmounts;
      })
      .addCase(getdepreiation.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload?.message || "Load depreciation preview failed";
      })
      ////delete_depreciation
      .addCase(delete_depreciation.pending, (state) => {
        state.loading = true;
      })
      .addCase(delete_depreciation.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.current = action.payload;
      })
      .addCase(delete_depreciation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ================= ROLLBACK ================= */
      .addCase(rollbackFixedAsset.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(rollbackFixedAsset.fulfilled, (state, action) => {
        state.loading = false;
        state.rollbackResult = action.payload;

        if (action.payload.assetDeleted) {
          state.list = state.list.filter(
            (a) => a._id !== action.payload.assetId
          );
        } else {
          const asset = state.list.find(
            (a) => a._id === action.payload.assetId
          );
          if (asset) {
            asset.accumulatedDepreciation = 0;
            asset.netBookValue = asset.cost;
            asset.status = "active";
            asset.soldDate = null;
          }
        }
      })
      .addCase(rollbackFixedAsset.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { resetAssetState, clearCurrentAsset } = assetSlice.actions;
export default assetSlice.reducer;
