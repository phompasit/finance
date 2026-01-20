import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/api";

/* ================= Thunks ================= */

export const loadGeneralLedger = createAsyncThunk(
  "ledger/loadGeneralLedger",
  async (params = {}, { rejectWithValue }) => {
    try {
      const qs = new URLSearchParams(params).toString();
      const r = await api.get(
        `/api/generalLedger/general-ledger?${qs}`
      );
      return r.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Server error"
      );
    }
  }
);

export const loadBook = createAsyncThunk(
  "ledger/loadBook",
  async (params = {}, { rejectWithValue }) => {
    try {
      const qs = new URLSearchParams(params).toString();
      const r = await api.get(`/api/book/cash-book?${qs}`);
      return r.data; // ⬅️ เก็บทั้งก้อน
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Server error"
      );
    }
  }
);

/* ================= Slice ================= */

const ledgerSlice = createSlice({
  name: "ledger",
  initialState: {
    /* General Ledger */
    data: null,
    loadingLedger: false,

    /* Cash / Bank Book */
    data_book: [],
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    loadingBook: false,

    error: null,
  },

  reducers: {
    clearLedger: (s) => {
      s.data = null;
    },
    clearBook: (s) => {
      s.data_book = [];
      s.page = 1;
      s.totalPages = 1;
      s.total = 0;
    },
  },

  extraReducers: (b) => {
    /* ===== General Ledger ===== */
    b.addCase(loadGeneralLedger.pending, (s) => {
      s.loadingLedger = true;
      s.error = null;
    });
    b.addCase(loadGeneralLedger.fulfilled, (s, a) => {
      s.loadingLedger = false;
      s.data = a.payload;
    });
    b.addCase(loadGeneralLedger.rejected, (s, a) => {
      s.loadingLedger = false;
      s.error = a.payload;
    });

    /* ===== Cash / Bank Book ===== */
    b.addCase(loadBook.pending, (s) => {
      s.loadingBook = true;
      s.error = null;
    });
    b.addCase(loadBook.fulfilled, (s, a) => {
      s.loadingBook = false;

      // 🔑 เก็บทั้ง payload
      s.data_book = a.payload.rows || [];
      s.page = a.payload.page ?? 1;
      s.limit = a.payload.limit ?? 10;
      s.total = a.payload.total ?? 0;
      s.totalPages = a.payload.totalPages ?? 1;
    });
    b.addCase(loadBook.rejected, (s, a) => {
      s.loadingBook = false;
      s.error = a.payload;
    });
  },
});

export const { clearLedger, clearBook } = ledgerSlice.actions;
export default ledgerSlice.reducer;
