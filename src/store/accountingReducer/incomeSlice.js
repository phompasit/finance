import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/api";

export const loadIncomeStatement = createAsyncThunk(
  "income/load",
  async (params = {}, { rejectWithValue }) => {
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await api.get(`/api/income-statement/income-statement?${qs}`);
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || err.message || "Server error"
      );
    }
  }
);

const incomeSlice = createSlice({
  name: "income",
  initialState: {
    loader: false,
    error: null,

    // 🔽 comparison meta
    comparable: false,
    currentYear: null,
    previousYear: null,
    mode:null,
    period:null,
    // 🔽 payload
    data: null,
  },
  reducers: {
    clearIncomeError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      /* ================= PENDING ================= */
      .addCase(loadIncomeStatement.pending, (state) => {
        state.loader = true;
        state.error = null;
      })

      /* ================= SUCCESS ================= */
      .addCase(loadIncomeStatement.fulfilled, (state, action) => {
        state.loader = false;

        const payload = action.payload || {};

        state.comparable = Boolean(payload.comparable);
        state.currentYear = payload.currentYear ?? null;
        state.previousYear = payload.previousYear ?? null;
        (state.mode = payload.mode ?? null),
          (state.period = payload.mode ?? null),
          // รองรับทั้งแบบ compare และไม่ compare
          (state.data = payload.data ?? payload);
      })

      /* ================= ERROR ================= */
      .addCase(loadIncomeStatement.rejected, (state, action) => {
        state.loader = false;
        state.error = action.payload || action.error?.message;
      });
  },
});

export const { clearIncomeError } = incomeSlice.actions;
export default incomeSlice.reducer;
