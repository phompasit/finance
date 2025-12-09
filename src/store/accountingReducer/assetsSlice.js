// src/store/reports/assetsSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/api";

export const loadAssets = createAsyncThunk(
  "assets/load",
  async (params = {}, { rejectWithValue }) => {
    try {
      const r = await api.get("/api/statement-assets/assets", {
        params,
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return r.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || err.message || "Server error"
      );
    }
  }
);

const assetsSlice = createSlice({
  name: "assets",
  initialState: {
    data: null,
    loader: false,
    error: null,
    success: null,
  },
  reducers: {
    clearMessage(state) {
      state.error = null;
      state.success = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadAssets.pending, (s) => {
        s.loader = true;
        s.error = null;
        s.success = null;
      })
      .addCase(loadAssets.fulfilled, (s, a) => {
        s.loader = false;
        s.data = a.payload.data;
        s.success = null;
      })
      .addCase(loadAssets.rejected, (s, a) => {
        s.loader = false;
        s.error = a.payload || a.error?.message;
      });
  },
});

export const { clearMessage } = assetsSlice.actions;
export default assetsSlice.reducer;
