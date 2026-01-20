// store/asset/assetThunks.js
import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  createAssetAPI,
  updateAssetAPI,
  getAssetByIdAPI,
  getAllFixedAssetsAPI,
  getDepreciationPreviewAPI,
  postDepreciationForAssetAPI,
  getdepreiationAPI,
  delete_depreciationAPI,
} from "./assetService.js";

/** CREATE */
export const createAsset = createAsyncThunk(
  "asset/create",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await createAssetAPI(payload);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.error);
    }
  }
);

/** UPDATE */
export const updateAsset = createAsyncThunk(
  "asset/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const { data } = await updateAssetAPI(id, payload);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/** GET BY ID (for edit) */
export const getAssetById = createAsyncThunk(
  "asset/getById",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await getAssetByIdAPI(id);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);
export const getAllFixedAssets = createAsyncThunk(
  "asset/getAllFixedAssets",
  async (params, { rejectWithValue }) => {
    try {
      const qs = new URLSearchParams(params || {}).toString();
      const { data } = await getAllFixedAssetsAPI(qs);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: err.message });
    }
  }
);
export const getDepreciationPreview = createAsyncThunk(
  "depreciation/preview",
  async ({ assetId, params }, { rejectWithValue }) => {
    try {
      const { data } = await getDepreciationPreviewAPI(assetId, params);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: err.message });
    }
  }
);
//postDepreciationForAssetAPI

export const postDepreciationForAsset = createAsyncThunk(
  "depreciation/post-depreciation",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await postDepreciationForAssetAPI(payload);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: err.message });
    }
  }
);
///depreiation

export const getdepreiation = createAsyncThunk(
  "depreciation/getdepreiation",
  async ({ assetId, params }, { rejectWithValue }) => {
    try {
      const { data } = await getdepreiationAPI(assetId, params);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: err.message });
    }
  }
);
///delete depreciation and journal fixedAsset
export const delete_depreciation = createAsyncThunk(
  "depreciation/delete_depreciation",
  async ({ journalId, DepreciationId }, { rejectWithValue }) => {
    try {
      const { data } = await delete_depreciationAPI(journalId, DepreciationId);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: err.message });
    }
  }
);
