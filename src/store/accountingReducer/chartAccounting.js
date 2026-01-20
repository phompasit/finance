import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../api/api";

// =======================
// 1) GET ALL ACCOUNTS
// =======================
export const getAccounts = createAsyncThunk(
  "account/getAccounts",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/api/account-document");
      return data.accounts;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Error loading accounts"
      );
    }
  }
);

// =======================
// 2) GET TREE
// =======================
export const getAccountTree = createAsyncThunk(
  "account/getTree",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/api/account-document/tree");
      return data.tree;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || "Error loading tree");
    }
  }
);

// =======================
// 3) CREATE ACCOUNT
// =======================
export const createAccount = createAsyncThunk(
  "account/create",
  async (formData, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/api/account-document/create", formData);
      return data.account;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || "Create failed");
    }
  }
);

// =======================
// 4) UPDATE ACCOUNT
// =======================
export const updateAccount = createAsyncThunk(
  "account/update",
  async ({ id, formData }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/api/account-document/${id}`, formData);
      return data.account;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || "Update failed");
    }
  }
);

// =======================
// 5) DELETE ACCOUNT
// =======================
export const deleteAccount = createAsyncThunk(
  "account/delete",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.delete(
        `/api/account-document/account-document/${id}`
      );
      return { id };
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || "Delete failed");
    }
  }
);

// =======================
// SLICE
// =======================
export const accountSlice = createSlice({
  name: "accountDocument",
  initialState: {
    accounts: [],
    tree: [],
    loader: false,
    successMessage: "",
    errorMessage: "",
  },

  reducers: {
    messageClear: (state) => {
      state.successMessage = "";
      state.errorMessage = "";
    },
  },

  extraReducers: (builder) => {
    builder

      // ===================
      // GET ACCOUNTS
      // ===================
      .addCase(getAccounts.pending, (state) => {
        state.loader = true;
      })
      .addCase(getAccounts.fulfilled, (state, { payload }) => {
        state.loader = false;
        state.accounts = payload;
      })
      .addCase(getAccounts.rejected, (state, { payload }) => {
        state.loader = false;
        state.errorMessage = payload;
      })

      // ===================
      // GET TREE
      // ===================
      .addCase(getAccountTree.pending, (state) => {
        state.loader = true;
      })
      .addCase(getAccountTree.fulfilled, (state, { payload }) => {
        state.loader = false;
        state.tree = payload;
      })
      .addCase(getAccountTree.rejected, (state, { payload }) => {
        state.loader = false;
        state.errorMessage = payload;
      })

      // ===================
      // CREATE
      // ===================
      .addCase(createAccount.pending, (state) => {
        state.loader = true;
      })
      .addCase(createAccount.fulfilled, (state, { payload }) => {
        state.loader = false;
        state.successMessage = "เพิ่มบัญชีสำเร็จ";
        state.accounts.push(payload);
      })
      .addCase(createAccount.rejected, (state, { payload }) => {
        state.loader = false;
        state.errorMessage = payload;
      })

      // ===================
      // UPDATE
      // ===================
      .addCase(updateAccount.pending, (state) => {
        state.loader = true;
      })
      .addCase(updateAccount.fulfilled, (state, { payload }) => {
        state.loader = false;
        state.successMessage = "แก้ไขบัญชีสำเร็จ";

        // update list
        state.accounts = state.accounts.map((item) =>
          item._id === payload._id ? payload : item
        );
      })
      .addCase(updateAccount.rejected, (state, { payload }) => {
        state.loader = false;
        state.errorMessage = payload;
      })

      // ===================
      // DELETE
      // ===================
      .addCase(deleteAccount.pending, (state) => {
        state.loader = true;
      })
      .addCase(deleteAccount.fulfilled, (state, { payload }) => {
        state.loader = false;
        state.successMessage = "ลบสำเร็จ";

        state.accounts = state.accounts.filter((a) => a._id !== payload.id);
      })
      .addCase(deleteAccount.rejected, (state, { payload }) => {
        state.loader = false;
        state.errorMessage = payload;
      });
  },
});

export const { messageClear } = accountSlice.actions;
export default accountSlice.reducer;
