// src/store/reports/reportsSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/api";
export const fetchStatement = createAsyncThunk(
  "reports/fetchStatement",
  async (params = {}, { rejectWithValue }) => {
    try {
      const qs = new URLSearchParams(params || {}).toString();
      const r = await api.get(
        `/api/statement/statement-of-financial-position?${qs}`
      );
      return r.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || err.message || "Server error"
      );
    }
  }
);
export const closePeriod = createAsyncThunk(
  "reports/close",
  async ({ year, month }, { rejectWithValue }) => {
    try {
      const res = await api.post("/api/accounting/close-period", {
        year,
        month,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message);
    }
  }
);

export const period_status = createAsyncThunk(
  "reports/period_status",
  async (year, { rejectWithValue }) => {
    try {
      const qs = new URLSearchParams(year || {}).toString();
      const res = await api.get(`/api/accounting/period-status?${qs}`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message);
    }
  }
);
const reportsSlice = createSlice({
  name: "reports",
  initialState: {
    loading: false,
    error: null,
    period: null,
    closing: false,

    currentYear: null,
    comparable: false,
    previousYear: null,
    mode: null,

    data: {
      current: [],
      previous: [],
    },
    period_status: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      /* ---------- FETCH ---------- */
      .addCase(fetchStatement.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(fetchStatement.fulfilled, (state, action) => {
        const payload = action.payload || {};

        state.loading = false;
        state.error = null;

        state.comparable = !!payload.comparable;
        state.currentYear = payload.currentYear || null;
        state.previousYear = payload.previousYear || null;
        state.mode = payload.mode || null;

        state.data = payload.data || {
          current: [],
          previous: [],
        };
      })

      .addCase(fetchStatement.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message;
      })
      /* ---- CLOSE PERIOD ---- */
      .addCase(closePeriod.pending, (state) => {
        state.closing = true;
        state.error = null;
      })
      .addCase(closePeriod.fulfilled, (state) => {
        state.closing = false;
        state.success = true;
        if (state.period) state.period.isClosed = true;
      })
      .addCase(closePeriod.rejected, (state, action) => {
        state.closing = false;
        state.error = action.payload;
      })
      .addCase(period_status.pending, (s) => {
        s.loading = true;
        s.error = null;
      })
      .addCase(period_status.fulfilled, (s, a) => {
        s.loading = false;
        s.period_status = a.payload;
      })
      .addCase(period_status.rejected, (s, a) => {
        s.loading = false;
        s.period_status = a.data;
      });
    ////period_status
  },
});

export default reportsSlice.reducer;
