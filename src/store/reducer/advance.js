import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../api/api";

// -----------------------------
// THUNKS (ใช้รูปแบบเดียวกับตัวอย่าง income-expense)
// -----------------------------

export const fetchAdvances = createAsyncThunk(
  "advances/fetchAdvances",
  async (params = {}, { rejectWithValue }) => {
    try {
      const {
        search = "",
        status = "",
        dateFrom,
        dateTo,
        page = 1,
        limit = 50,
      } = params;
      console.log(params)
      const { data } = await api.get("/api/advances", {
        params: {
          search,
          status,
          dateFrom,
          dateTo,
          page,
          limit,
        },
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      return data; // { success, data, pagination }
    } catch (error) {
      return rejectWithValue(
        error?.response?.data ?? { message: "Server error" }
      );
    }
  }
);

export const fetchEmployees = createAsyncThunk(
  "advances/fetchEmployees",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get(
        `${import.meta.env.VITE_API_URL}/api/debt/employees`,
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      return data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || { message: "Server error" }
      );
    }
  }
);

export const createAdvanceA = createAsyncThunk(
  "advances/createAdvance",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post(
        `${import.meta.env.VITE_API_URL}/api/advances`,
        payload,
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      return data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || { message: "Server error" }
      );
    }
  }
);

export const updateAdvance = createAsyncThunk(
  "advances/updateAdvance",
  async ({ id, data: editData }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(
        `${import.meta.env.VITE_API_URL}/api/advances/${id}`,
        editData,
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      return data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || { message: "Server error" }
      );
    }
  }
);

export const deleteAdvance = createAsyncThunk(
  "advances/deleteAdvance",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.delete(
        `${import.meta.env.VITE_API_URL}/api/advances/${id}`,
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      return data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || { message: "Server error" }
      );
    }
  }
);

export const addTransaction = createAsyncThunk(
  "advances/addTransaction",
  async ({ advanceId, transaction }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(
        `${import.meta.env.VITE_API_URL}/api/advances/${advanceId}/transaction`,
        transaction,
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      return data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || { message: "Server error" }
      );
    }
  }
);

export const deleteTransaction = createAsyncThunk(
  "advances/deleteTransaction",
  async ({ advanceId, transactionId }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(
        `${
          import.meta.env.VITE_API_URL
        }/api/advances/transation/${advanceId}/${transactionId}`,
        {},
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      return data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || { message: "Server error" }
      );
    }
  }
);

export const closeAdvance = createAsyncThunk(
  "advances/closeAdvance",
  async ({ advanceId, remarks = "" }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(
        `${import.meta.env.VITE_API_URL}/api/advances/${advanceId}/close`,
        { remarks },
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      return data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || { message: "Server error" }
      );
    }
  }
);

export const reopenAdvance = createAsyncThunk(
  "advances/reopenAdvance",
  async (advanceId, { rejectWithValue }) => {
    try {
      const { data } = await api.post(
        `${import.meta.env.VITE_API_URL}/api/advances/${advanceId}/reopen`,
        {},
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      return data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || { message: "Server error" }
      );
    }
  }
);

// -----------------------------
// SLICE
// -----------------------------

export const advancesSlice = createSlice({
  name: "advances",
  initialState: {
    loader: false,
    successMessage: "",
    errorMessage: "",
    advancesList: [],
    employees: [],
    pagination: {
      page: 1,
      limit: 50,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    },
  },
  reducers: {
    messageClear: (state) => {
      state.errorMessage = "";
      state.successMessage = "";
    },
    setAdvancesLocal: (state, action) => {
      state.advancesList = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // FETCH advances (โชว์ loader)
      .addCase(fetchAdvances.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdvances.fulfilled, (state, action) => {
        state.loading = false;
        state.advancesList = action.payload.data || [];
        state.pagination = action.payload.pagination || initialState.pagination;
      })
      .addCase(fetchAdvances.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Fetch failed";
      })

      // fetchEmployees (ไม่แสดง loader)
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.employees = action.payload.data;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.errorMessage =
          action.payload?.message || "Error loading employees";
      })
      // createAdvance (ไม่ใช้ loader)
      .addCase(createAdvanceA.fulfilled, (state, action) => {
        state.successMessage =
          action.payload?.message || "Created successfully";
      })
      .addCase(createAdvanceA.rejected, (state, action) => {
        state.errorMessage =
          action.payload?.message || "Error creating advance";
      })

      // updateAdvance
      .addCase(updateAdvance.fulfilled, (state, action) => {
        state.successMessage =
          action.payload?.message || "Updated successfully";
      })
      .addCase(updateAdvance.rejected, (state, action) => {
        state.errorMessage =
          action.payload?.message || "Error updating advance";
      })

      // deleteAdvance
      .addCase(deleteAdvance.fulfilled, (state, action) => {
        state.successMessage =
          action.payload?.message || "Deleted successfully";
      })
      .addCase(deleteAdvance.rejected, (state, action) => {
        state.errorMessage =
          action.payload?.message || "Error deleting advance";
      })

      // addTransaction
      .addCase(addTransaction.fulfilled, (state, action) => {
        state.successMessage = action.payload?.message || "Transaction added";
      })
      .addCase(addTransaction.rejected, (state, action) => {
        state.errorMessage =
          action.payload?.message || "Error adding transaction";
      })

      // deleteTransaction
      .addCase(deleteTransaction.fulfilled, (state, action) => {
        state.successMessage = action.payload?.message || "Transaction removed";
      })
      .addCase(deleteTransaction.rejected, (state, action) => {
        state.errorMessage =
          action.payload?.message || "Error removing transaction";
      })

      // closeAdvance
      .addCase(closeAdvance.fulfilled, (state, action) => {
        state.successMessage = action.payload?.message || "Advance closed";
      })
      .addCase(closeAdvance.rejected, (state, action) => {
        state.errorMessage = action.payload?.message || "Error closing advance";
      })

      // reopenAdvance
      .addCase(reopenAdvance.fulfilled, (state, action) => {
        state.successMessage = action.payload?.message || "Advance reopened";
      })
      .addCase(reopenAdvance.rejected, (state, action) => {
        state.errorMessage =
          action.payload?.message || "Error reopening advance";
      });
  },
});

export const { messageClear, setAdvancesLocal } = advancesSlice.actions;
export default advancesSlice.reducer;
