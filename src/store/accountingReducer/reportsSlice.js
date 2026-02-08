// src/store/reports/reportsSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/api";

/* =========================
   Helpers
========================= */
const extractError = (err) =>
  err.response?.data?.error ||
  err.response?.data?.message ||
  err.message ||
  "Server error";

/* =========================
   THUNKS
========================= */

/* -------- Financial Statement -------- */
export const fetchStatement = createAsyncThunk(
  "reports/fetchStatement",
  async (params = {}, { rejectWithValue }) => {
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await api.get(
        `/api/statement/statement-of-financial-position?${qs}`
      );
      return res.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/* -------- Period Status -------- */
export const fetchPeriodStatus = createAsyncThunk(
  "reports/fetchPeriodStatus",
  async ({ year }, { rejectWithValue }) => {
    try {
      const qs = year ? `?year=${year}` : "";
      const res = await api.get(`/api/accounting/period-status${qs}`);
      return res.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/* -------- Close Period -------- */
export const closePeriod = createAsyncThunk(
  "reports/closePeriod",
  async ({ year, month = 12 }, { rejectWithValue }) => {
    try {
      const res = await api.post("/api/accounting/close-period", {
        year,
        month,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/* -------- Rollback Period -------- */
export const rollbackPeriod = createAsyncThunk(
  "reports/rollbackPeriod",
  async ({ year }, { rejectWithValue }) => {
    try {
      const res = await api.post("/api/accounting/rollback-period", { year });
      return res.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/* =========================
   SLICE
========================= */
const reportsSlice = createSlice({
  name: "reports",
  initialState: {
    /* generic */
    loading: false,
    error: null,
    success: false,

    /* statement */
    comparable: false,
    currentYear: null,
    previousYear: null,
    mode: null,
    data: {
      current: [],
      previous: [],
    },

    /* period */
    periodStatus: null,
    closing: false,
    rollingBack: false,
  },
  reducers: {
    clearReportState: (state) => {
      state.error = null;
      state.success = false;
    },
  },
  extraReducers: (builder) => {
    builder
      /* ================= FETCH STATEMENT ================= */
      .addCase(fetchStatement.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStatement.fulfilled, (state, action) => {
        const p = action.payload || {};
        state.loading = false;
        state.comparable = !!p.comparable;
        state.currentYear = p.currentYear;
        state.previousYear = p.previousYear;
        state.mode = p.mode;
        state.data = p.data || { current: [], previous: [] };
      })
      .addCase(fetchStatement.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ================= PERIOD STATUS ================= */
      .addCase(fetchPeriodStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPeriodStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.periodStatus = action.payload.data;
      })
      .addCase(fetchPeriodStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ================= CLOSE PERIOD ================= */
      .addCase(closePeriod.pending, (state) => {
        state.closing = true;
        state.error = null;
      })
      .addCase(closePeriod.fulfilled, (state) => {
        state.closing = false;
        state.success = true;
      })
      .addCase(closePeriod.rejected, (state, action) => {
        state.closing = false;
        state.error = action.payload;
      })

      /* ================= ROLLBACK PERIOD ================= */
      .addCase(rollbackPeriod.pending, (state) => {
        state.rollingBack = true;
        state.error = null;
      })
      .addCase(rollbackPeriod.fulfilled, (state) => {
        state.rollingBack = false;
        state.success = true;
      })
      .addCase(rollbackPeriod.rejected, (state, action) => {
        state.rollingBack = false;
        state.error = action.payload;
      });
  },
});

export const { clearReportState } = reportsSlice.actions;
export default reportsSlice.reducer;
