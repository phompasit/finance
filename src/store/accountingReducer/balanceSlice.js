// src/store/reports/detailedBalanceSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/api"; // your axios wrapper

export const fetchDetailedBalance = createAsyncThunk(
  "reports/fetchDetailedBalance",
  async (params, { rejectWithValue }) => {
    try {
      // params: { startDate, endDate, preset }
      const qs = new URLSearchParams(params || {}).toString();
      const { data } = await api.get(`/api/reports/detailed-balance?${qs}`);
      if (!data.success) return rejectWithValue(data.error || "No data");
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message);
    }
  }
);
///balance_sheet
export const fetchDetailedBalance_before = createAsyncThunk(
  "reports/fetchDetailedBalance_before",
  async (params, { rejectWithValue }) => {
    try {
      // params: { startDate, endDate, preset }
      const qs = new URLSearchParams(params || {}).toString();
      const { data } = await api.get(`/api/reports/balance_after?${qs}`);
      if (!data.success) return rejectWithValue(data.error || "No data");
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message);
    }
  }
);
export const fetchDetailedBalance_Income_expense = createAsyncThunk(
  "reports/fetchDetailedBalance_Income_expense",
  async (params, { rejectWithValue }) => {
    try {
      // params: { startDate, endDate, preset }
      const qs = new URLSearchParams(params || {}).toString();
      const { data } = await api.get(
        `/api/reports/fetchDetailedBalance_Income_expense?${qs}`
      );
      if (!data.success) return rejectWithValue(data.error || "No data");
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message);
    }
  }
);
///balance-sheet -income-expense
const slice = createSlice({
  name: "detailedBalance",
  initialState: {
    list: [],
    totals: {},
    loader: false,
    error: "",
    list_before: [],
    totals_before: {},
    list_incomeExpense: [],
    totals_incomExpense: {},
    balance_incomeExpense: 0,
  },
  reducers: {
    clearDetailedBalance: (s) => {
      s.months = [];
      s.list = [];
      s.totals = null;
      s.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDetailedBalance.pending, (s) => {
        s.loader = true;
        s.error = "";
      })
      .addCase(fetchDetailedBalance.fulfilled, (s, a) => {
        s.loader = false;
        s.list = a.payload.list;
        s.totals = a.payload.totals;
      })
      .addCase(fetchDetailedBalance.rejected, (s, a) => {
        s.loader = false;
        s.error = a.payload || "Failed to fetch";
      })
      .addCase(fetchDetailedBalance_before.pending, (s) => {
        s.loader = true;
        s.error = "";
      })
      .addCase(fetchDetailedBalance_before.fulfilled, (s, a) => {
        s.loader = false;
        s.list_before = a.payload.list;
        s.totals_before = a.payload.totals;
      })
      .addCase(fetchDetailedBalance_before.rejected, (s, a) => {
        s.loader = false;
        s.error = a.payload || "Failed to fetch";
      })
      //fetchDetailedBalance_Income_expense
      .addCase(fetchDetailedBalance_Income_expense.pending, (s) => {
        s.loader = true;
        s.error = "";
      })
      .addCase(fetchDetailedBalance_Income_expense.fulfilled, (s, a) => {
        s.loader = false;
        s.list_incomeExpense = a.payload.list;
        s.totals_incomExpense = a.payload.totals;
        s.balance_incomeExpense = a.payload.balance;
      })
      .addCase(fetchDetailedBalance_Income_expense.rejected, (s, a) => {
        s.loader = false;
        s.error = a.payload || "Failed to fetch";
      });
  },
});

export const { clearDetailedBalance } = slice.actions;
export default slice.reducer;
