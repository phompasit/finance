import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/api";

export const loadGeneralLedger = createAsyncThunk(
  "ledger/load",
  async ({ accountId, startDate, endDate }, { rejectWithValue }) => {
    try {
      const r = await api.get("/api/generalLedger/general-ledger", {
        params: { accountId, startDate, endDate },
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

const ledgerSlice = createSlice({
  name: "ledger",
  initialState: { data: null, loading: false, error: null },
  reducers: { clearLedger: (s) => (s.data = null) },
  extraReducers: (b) => {
    b.addCase(loadGeneralLedger.pending, (s) => {
      s.loading = true;
      s.error = null;
    });
    b.addCase(loadGeneralLedger.fulfilled, (s, a) => {
      s.loading = false;
      s.data = a.payload;
    });
    b.addCase(loadGeneralLedger.rejected, (s, a) => {
      s.loading = false;
      s.error = a.payload;
    });
  },
});

export const { clearLedger } = ledgerSlice.actions;
export default ledgerSlice.reducer;
