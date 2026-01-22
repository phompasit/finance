// store/asset/assetService.js

import api from "../../api/api";

export const createAssetAPI = (payload) => api.post("/api/fixAsset", payload);

export const updateAssetAPI = (id, payload) =>
  api.put(`/api/fixAsset/update-asset/${id}`, payload);

export const getAssetByIdAPI = (id) =>
  api.get(`/api/fixAsset/getId-asset/${id}`);
export const getAllFixedAssetsAPI = (qs) =>
  api.get(`/api/fixAsset/all-fixedAsset?${qs}`);

export const getDepreciationPreviewAPI = (assetId, params) =>
  api.get(`/api/fixAsset/assets/${assetId}/depreciation-preview`, {
    params, // { from, to }
  });
export const postDepreciationForAssetAPI = (payload) =>
  api.post(`/api/fixAsset/post-depreciation/${payload.id}`, payload);
//getdepreiationAPI

export const getdepreiationAPI = (assetId, params) =>
  api.get(`/api/fixAsset/get-depreciation/${assetId}`, {
    params, // { from, to }
  });
///delete_depreciationAPI
export const delete_depreciationAPI = (journalId, DepreciationId) =>
  api.delete(
    `/api/fixAsset/delete_depreciation/${journalId}/${DepreciationId}`
  );

export const rollbackFixedAssetAPI = async (assetId, deleteAsset = false) => {
  const res = await api.delete(`/api/fixAsset/${assetId}/rollback`, {
    data: { deleteAsset },
  });
  return res.data;
};
