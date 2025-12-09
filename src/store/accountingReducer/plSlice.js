// src/store/reports/plSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/api";

export const fetchIncomeStatement = createAsyncThunk(
  "reports/fetchIncomeStatement",
  async ({ startDate, endDate }, { rejectWithValue }) => {
    try {
      const q = new URLSearchParams({ startDate, endDate }).toString();
      const { data } = await api.get(`/reports/income-statement?${q}`, {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message);
    }
  }
);

const slice = createSlice({
  name: "pl",
  initialState: {
    incomes: [],
    expenses: [],
    totals: {},
    loader: false,
    error: "",
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchIncomeStatement.pending, (s) => { s.loader = true; s.error = ""; })
      .addCase(fetchIncomeStatement.fulfilled, (s, a) => {
        s.loader = false;
        s.incomes = a.payload.incomes;
        s.expenses = a.payload.expenses;
        s.totals = a.payload.totals;
      })
      .addCase(fetchIncomeStatement.rejected, (s, a) => {
        s.loader = false;
        s.error = a.payload || "Failed to load income statement";
      });
  },
});

export default slice.reducer;
