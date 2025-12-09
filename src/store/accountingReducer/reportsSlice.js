// src/store/reports/reportsSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/api";
export const fetchStatement = createAsyncThunk(
  "reports/fetchStatement",
  async ({ preset, startDate, endDate } = {}, { rejectWithValue }) => {
    try {
      const params = {};
      if (preset) params.preset = preset;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const r = await api.get(
        "/api/statement/statement-of-financial-position",
        {
          params,
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      return r.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || err.message || "Server error"
      );
    }
  }
);

const reportsSlice = createSlice({
  name: "reports",
  initialState: { loading: false, error: null, data: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStatement.pending, (s) => {
        s.loading = true;
        s.error = null;
      })
      .addCase(fetchStatement.fulfilled, (s, a) => {
        s.loading = false;
        s.data = a.payload;
      })
      .addCase(fetchStatement.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload || a.error.message;
      });
  },
});

export default reportsSlice.reducer;
