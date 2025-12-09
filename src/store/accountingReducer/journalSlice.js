// src/store/api/journal/api/journalSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/api"; // adjust path to your axios/api wrapper

// ====================== Async Thunks ======================
export const getJournals = createAsyncThunk(
  "journal/getJournals",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/api/journal", {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return data.journals || data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message);
    }
  }
);

export const getJournalById = createAsyncThunk(
  "journal/getJournalById",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/api/journal/${id}`, {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return data.journal || data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message);
    }
  }
);

export const createJournal = createAsyncThunk(
  "journal/createJournal",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/api/journal", payload, {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return data.journal || data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message);
    }
  }
);

export const updateJournal = createAsyncThunk(
  "journal/updateJournal",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/api/journal/${id}`, payload, {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return data.journal || data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message);
    }
  }
);

export const deleteJournal = createAsyncThunk(
  "journal/deleteJournal",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/api/journal/${id}`, {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message);
    }
  }
);

// ====================== Slice ======================
const slice = createSlice({
  name: "journal",
  initialState: {
    journals: [],
    selectedJournal: null,
    loader: false,
    success: "",
    error: "",
    pagination: {
      page: 1,
      pageSize: 10,
      total: 0,
    },
  },
  reducers: {
    clearMessage: (state) => {
      state.success = "";
      state.error = "";
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    clearSelectedJournal: (state) => {
      state.selectedJournal = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // getJournals
      .addCase(getJournals.pending, (s) => {
        s.loader = true;
      })
      .addCase(getJournals.fulfilled, (s, a) => {
        s.loader = false;
        s.journals = a.payload || [];
        // if backend returns pagination info include setting total
        if (a.payload && a.payload.length && a.meta?.response?.total) {
          s.pagination.total = a.meta.response.total;
        }
      })
      .addCase(getJournals.rejected, (s, a) => {
        s.loader = false;
        s.error = a.payload || "Failed to load journals";
      })

      // getJournalById
      .addCase(getJournalById.pending, (s) => {
        s.loader = true;
      })
      .addCase(getJournalById.fulfilled, (s, a) => {
        s.loader = false;
        s.selectedJournal = a.payload;
      })
      .addCase(getJournalById.rejected, (s, a) => {
        s.loader = false;
        s.error = a.payload || "Failed to load journal";
      })

      // createJournal
      .addCase(createJournal.pending, (s) => {
        s.loader = true;
      })
      .addCase(createJournal.fulfilled, (s, a) => {
        s.loader = false;
        s.journals.unshift(a.payload); // add to top
        s.success = "Journal created";
      })
      .addCase(createJournal.rejected, (s, a) => {
        s.loader = false;
        s.error = a.payload || "Failed to create journal";
      })

      // updateJournal
      .addCase(updateJournal.pending, (s) => {
        s.loader = true;
      })
      .addCase(updateJournal.fulfilled, (s, a) => {
        s.loader = false;
        s.journals = s.journals.map((j) =>
          j._id === a.payload._id ? a.payload : j
        );
        s.success = "Journal updated";
      })
      .addCase(updateJournal.rejected, (s, a) => {
        s.loader = false;
        s.error = a.payload || "Failed to update journal";
      })

      // deleteJournal
      .addCase(deleteJournal.pending, (s) => {
        s.loader = true;
      })
      .addCase(deleteJournal.fulfilled, (s, a) => {
        s.loader = false;
        s.journals = s.journals.filter((j) => j._id !== a.payload);
        s.success = "Journal deleted";
      })
      .addCase(deleteJournal.rejected, (s, a) => {
        s.loader = false;
        s.error = a.payload || "Failed to delete journal";
      });
  },
});

export const {
  clearMessage,
  setPagination,
  clearSelectedJournal,
} = slice.actions;
export default slice.reducer;
