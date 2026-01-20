// utils/createAuditLog.js
import AuditLog from "../models/AuditLog.js";

export const createAuditLog = async ({
  userId,
  action,
  collectionName,
  documentId,
  oldData = null,
  newData = null,
  ipAddress,
  description = "",
  userAgent,
}) => {
  try {
    if (!userId) return;

    await AuditLog.create({
      userId,
      action,
      collectionName,
      documentId,
      ipAddress,
      description,
      userAgent,
    });
  } catch (err) {
    // ❗ log พังได้ แต่ห้ามทำให้ main flow พัง
    console.error("Audit log error:", err.message);
  }
};
