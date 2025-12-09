// src/store/reports/detailedBalanceSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/api"; // your axios wrapper

export const fetchDetailedBalance = createAsyncThunk(
  "reports/fetchDetailedBalance",
  async (params, { rejectWithValue }) => {
    try {
      // params: { startDate, endDate, preset }
      const qs = new URLSearchParams(params || {}).toString();
      const { data } = await api.get(`/api/reports/detailed-balance?${qs}`, {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!data.success) return rejectWithValue(data.error || "No data");
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message);
    }
  }
);

const slice = createSlice({
  name: "detailedBalance",
  initialState: {
    list: [],
    totals: {},
    loader: false,
    error: "",
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
      });
  },
});

export const { clearDetailedBalance } = slice.actions;
export default slice.reducer;
