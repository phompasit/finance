import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/api";

/* LOAD */
export const loadOpeningBalance = createAsyncThunk(
  "openingBalance/load",
  async (year, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/api/opening-balance/${year}`, {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return data.list;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error);
    }
  }
);

/* CREATE */
export const createOpening = createAsyncThunk(
  "openingBalance/create",
  async (formData, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/api/opening-balance`, formData, {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error);
    }
  }
);

/* UPDATE */
export const updateOpening = createAsyncThunk(
  "openingBalance/update",
  async ({ id, formData }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/api/opening-balance/${id}`, formData, {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error);
    }
  }
);

/* DELETE */
export const deleteOpening = createAsyncThunk(
  "openingBalance/delete",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/api/opening-balance/${id}`, {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error);
    }
  }
);

const slice = createSlice({
  name: "openingBalance",
  initialState: {
    list: [],
    loader: false,
    success: "",
    error: "",
  },

  reducers: {
    clearMessage: (state) => {
      state.error = "";
      state.success = "";
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(loadOpeningBalance.pending, (s) => { s.loader = true; })
      .addCase(loadOpeningBalance.fulfilled, (s, a) => {
        s.loader = false;
        s.list = a.payload;
      })
      .addCase(loadOpeningBalance.rejected, (s, a) => {
        s.loader = false;
        s.error = a.payload;
      })

      .addCase(createOpening.fulfilled, (s, a) => {
        s.list.push(a.payload);
        s.success = "Added";
      })

      .addCase(updateOpening.fulfilled, (s, a) => {
        s.list = s.list.map((i) => (i._id === a.payload._id ? a.payload : i));
        s.success = "Updated";
      })

      .addCase(deleteOpening.fulfilled, (s, a) => {
        s.list = s.list.filter((i) => i._id !== a.payload);
        s.success = "Deleted";
      });
  },
});

export const { clearMessage } = slice.actions;
export default slice.reducer;
