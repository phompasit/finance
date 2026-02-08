import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../api/api";

// ============================
// FETCH INCOMEEXPENSE
// ============================
export const fetchTransaction = createAsyncThunk(
  "income_expense/fetchTransaction",
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await api.get(
        `${import.meta.env.VITE_API_URL}/api/income-expense`,
        {
          params,
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
// removeCurrency
// ============================
export const removeCurrencyFromServer = createAsyncThunk(
  "incomeExpense/removeCurrency",
  async ({ currencyIndex, index }, { rejectWithValue }) => {
    try {
      const { data } = await api.delete(
        `${
          import.meta.env.VITE_API_URL
        }/api/income-expense/item/${currencyIndex}/${index}`
      );

      return { currencyIndex, index, data };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || { message: "Server error" }
      );
    }
  }
);
// ============================
// create And update bulk
// ============================
export const createIncomeExpense = createAsyncThunk(
  "incomeExpense/createIncomeExpense",
  async ({ transactions }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(
        `${import.meta.env.VITE_API_URL}/api/income-expense/bulk`,
        { transactions }
      );

      return data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || { message: "Server error" }
      );
    }
  }
);
// ============================
//  update bulk
// ============================

export const updateIncomeExpense = createAsyncThunk(
  "incomeExpense/updateIncomeExpense ",
  async ({ id, Editdata }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(
        `${import.meta.env.VITE_API_URL}/api/income-expense/${id}`,
        Editdata
      );

      return data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || { message: "Server error" }
      );
    }
  }
);
export const deleteIncomeExpense = createAsyncThunk(
  "income/delete",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.delete(
        `${import.meta.env.VITE_API_URL}/api/income-expense/${id}`
      );

      return data; // ต้องมี success: true จาก backend
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Server error" }
      );
    }
  }
);
export const updateStatusIncomeExpense = createAsyncThunk(
  "income/status",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(
        `${import.meta.env.VITE_API_URL}/api/income-expense/status/${id}`,
        { status_Ap: status }
      );

      return data; // backend ควรส่ง { success: true, message: "..."}
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Server error" }
      );
    }
  }
);

export const incomeExpense = createSlice({
  name: "income_expense",
  initialState: {
    successMessage: "",
    errorMessage: "",
    loader: false,
    transactionsRedu: {
      records: [],
      total: 0,
      totalPages: 1,
      page: 1,
    },
  },
  reducers: {
    messageClear: (state) => {
      state.errorMessage = "";
      state.successMessage = "";
    },
  },
  extraReducers: (builder) => {
    builder
      /* ------------------ FETCH (โชว์ LOADER) ------------------ */
      .addCase(fetchTransaction.pending, (state) => {
        state.loader = true;
      })
      .addCase(fetchTransaction.fulfilled, (state, action) => {
        state.loader = false;
        state.transactionsRedu = action.payload;
      })
      .addCase(fetchTransaction.rejected, (state, action) => {
        state.loader = false;
        state.errorMessage = action.payload?.message || "Error loading data";
      })

      /* ------------------ REMOVE CURRENCY ------------------ */
      .addCase(removeCurrencyFromServer.fulfilled, (state) => {
        state.successMessage = "Removed successfully";
      })

      /* ------------------ CREATE (ไม่ใช้ loader) ------------------ */
      .addCase(createIncomeExpense.fulfilled, (state, action) => {
        state.successMessage = "Created successfully";
        // ❗ไม่ set loader
        // ❗ไม่ set transactionsRedu (คุณไป fetchC() เพื่อรีเฟรชอยู่แล้ว)
      })
      .addCase(createIncomeExpense.rejected, (state, action) => {
        state.errorMessage = action.payload?.message || "Error creating record";
      })

      /* ------------------ UPDATE (ไม่ใช้ loader) ------------------ */
      .addCase(updateIncomeExpense.fulfilled, (state) => {
        state.successMessage = "Updated successfully";
      })
      .addCase(updateIncomeExpense.rejected, (state, action) => {
        state.errorMessage = action.payload?.message || "Error updating record";
      })

      /* ------------------ DELETE (ไม่ใช้ loader) ------------------ */
      .addCase(deleteIncomeExpense.fulfilled, (state, action) => {
        state.successMessage = action.payload.message;
      })
      .addCase(deleteIncomeExpense.rejected, (state, action) => {
        state.errorMessage = action.payload?.message;
      })

      /* ------------------ UPDATE STATUS (ไม่ใช้ loader) ------------------ */
      .addCase(updateStatusIncomeExpense.fulfilled, (state, action) => {
        state.successMessage = action.payload.message;
      })
      .addCase(updateStatusIncomeExpense.rejected, (state, action) => {
        state.errorMessage = action.payload?.message;
      });
  },
});

export const { messageClear } = incomeExpense.actions;
export default incomeExpense.reducer;
