import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../api/api";

// ============================
// FETCH CATEGORIES
// ============================
export const fetchCategories = createAsyncThunk(
  "all/fetchCategories",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get(
        `${import.meta.env.VITE_API_URL}/api/category/get-category`,
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      return data; // <----- ถูกต้อง
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || { message: "Server error" }
      );
    }
  }
);

// ============================
// SLICE
// ============================
export const all_ = createSlice({
  name: "all_",
  initialState: {
    successMessage: "",
    errorMessage: "",
    loader: false,
    categoriesRedu: [],
  },
  reducers: {
    messageClear: (state) => {
      state.errorMessage = "";
      state.successMessage = "";
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loader = true;
        state.errorMessage = "";
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loader = false;
        state.categoriesRedu = action.payload; // <--- ดึง categories ใส่ state
        state.successMessage = "Fetched successfully";
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loader = false;
        state.errorMessage = action.payload?.message || "Error loading data";
      });
  },
});

export const { messageClear } = all_.actions;
export default all_.reducer;
