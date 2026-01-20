import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/api";

/* ============================================================
   THUNK
============================================================ */
export const loadAssets = createAsyncThunk(
  "assets/load",
  async (params = {}, { rejectWithValue }) => {
    try {
      const qs = new URLSearchParams(params || {}).toString();
      const res = await api.get(`/api/statement-assets/assets?${qs}`);

      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || err.message || "Failed to load assets"
      );
    }
  }
);

/* ============================================================
   INITIAL STATE
============================================================ */
const initialState = {
  loader: false,
  error: null,

  // compare meta
  comparable: false,
  currentYear: null,
  previousYear: null,

  // data
  current: {
    groups: {},
    totalAssets: 0,
  },
  previous: {
    groups: {},
    totalAssets: 0,
  },
  period:{},
  mode:""
};

/* ============================================================
   SLICE
============================================================ */
const assetsSlice = createSlice({
  name: "assets",
  initialState,
  reducers: {
    clearMessage(state) {
      state.error = null;
    },
    resetAssetsState() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      /* ---------- PENDING ---------- */
      .addCase(loadAssets.pending, (state) => {
        state.loader = true;
        state.error = null;
      })

      /* ---------- FULFILLED ---------- */
      .addCase(loadAssets.fulfilled, (state, action) => {
        state.loader = false;

        const payload = action.payload || {};

        state.comparable = Boolean(payload.comparable);
        state.currentYear = payload.currentYear || null;
        state.previousYear = payload.previousYear || null;
        state.period =payload.period
        state.mode =payload.mode
        if (payload.data) {
          state.current = payload.data.current || {
            groups: {},
            totalAssets: 0,
          };
          state.previous = payload.data.previous || {
            groups: {},
            totalAssets: 0,
          };
        } else {
          // fallback safety
          state.current = { groups: {}, totalAssets: 0 };
          state.previous = { groups: {}, totalAssets: 0 };
        }
      })

      /* ---------- REJECTED ---------- */
      .addCase(loadAssets.rejected, (state, action) => {
        state.loader = false;
        state.error = action.payload || action.error?.message;
      });
  },
});

/* ============================================================
   EXPORTS
============================================================ */
export const { clearMessage, resetAssetsState } = assetsSlice.actions;

export default assetsSlice.reducer;
