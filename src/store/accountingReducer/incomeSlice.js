// src/store/accountingReducer/incomeSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/api"; // <-- adjust import to your API helper

export const loadIncomeStatement = createAsyncThunk(
  "income/load",
  async ({ startDate, endDate, preset } = {}, { rejectWithValue }) => {
    try {
      const params = {};
      if (preset) params.preset = preset;
      else {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }
      const r = await api.get("/api/income-statement/income-statement", {
        params,
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return r.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || "Server error");
    }
  }
);

const slice = createSlice({
  name: "income",
  initialState: {
    loader: false,
    data: null,
    error: null,
  },
  reducers: {
    clearIncomeError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadIncomeStatement.pending, (s) => {
        s.loader = true;
        s.error = null;
      })
      .addCase(loadIncomeStatement.fulfilled, (s, a) => {
        s.loader = false;
        s.data = a.payload.data || a.payload;
      })
      .addCase(loadIncomeStatement.rejected, (s, a) => {
        s.loader = false;
        s.error = a.payload || a.error?.message;
      });
  },
});

export const { clearIncomeError } = slice.actions;
export default slice.reducer;
