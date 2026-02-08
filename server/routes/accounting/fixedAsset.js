import express from "express";
import {
  depreiation,
  postDepreciationForAsset,
  previewDepreciation,
  rollbackFixedAsset,
} from "./services/depreciationService.js";
import FixedAsset from "../../models/accouting_system_models/FixedAsset.js";
const router = express.Router();
import { authenticate } from "../../middleware/auth.js";
import { resolveReportFilter } from "../../utils/balanceSheetFuntions.js";
import mongoose from "mongoose";
import journalEntry_models from "../../models/accouting_system_models/journalEntry_models.js";
import DepreciationLedger from "../../models/accouting_system_models/DepreciationLedger.js";
import accountingPeriod from "../../models/accouting_system_models/accountingPeriod.js";
import { apiLimiter } from "../../middleware/security.js";
/**
 * POST /fixed-assets/run-depreciation
 */
router.post("/", authenticate, apiLimiter, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    // ================= INPUT VALIDATION & SANITIZATION =================
    const {
      assetCode,
      name,
      category,
      purchaseDate,
      startUseDate,
      original,
      exchangeRate = 1,
      currency = "LAK",
      cost,
      salvageValue = 0,
      usefulLife,
      assetAccountId,
      depreciationExpenseAccountId,
      accumulatedDepreciationAccountId,
      paidAccountId,
      getMoneyId,
      incomeAssetId,
      expenseId,
    } = req.body;

    // SECURITY: Whitelist only expected fields to prevent mass assignment
    const allowedFields = [
      "assetCode",
      "name",
      "category",
      "purchaseDate",
      "startUseDate",
      "original",
      "exchangeRate",
      "currency",
      "cost",
      "salvageValue",
      "usefulLife",
      "assetAccountId",
      "depreciationExpenseAccountId",
      "accumulatedDepreciationAccountId",
      "paidAccountId",
      "getMoneyId",
      "incomeAssetId",
      "expenseId",
    ];
    const extraFields = Object.keys(req.body).filter(
      (key) => !allowedFields.includes(key)
    );
    if (extraFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid fields provided",
        invalidFields: extraFields,
      });
    }

    // SECURITY: Input length validation to prevent DoS
    const stringFields = { assetCode, name, category, currency };
    for (const [field, value] of Object.entries(stringFields)) {
      if (value && typeof value === "string" && value.length > 255) {
        return res.status(400).json({
          success: false,
          error: `${field} exceeds maximum length of 255 characters`,
        });
      }
    }

    // SECURITY: Sanitize string inputs (basic XSS prevention)
    const sanitizeString = (str) => {
      if (!str || typeof str !== "string") return str;
      return str.replace(/[<>"']/g, "").trim();
    };

    const sanitizedAssetCode = sanitizeString(assetCode);
    const sanitizedName = sanitizeString(name);
    const sanitizedCategory = sanitizeString(category);

    // Validate required fields
    if (
      !sanitizedAssetCode ||
      !sanitizedName ||
      !sanitizedCategory ||
      !purchaseDate ||
      !startUseDate
    ) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        required: [
          "assetCode",
          "name",
          "category",
          "purchaseDate",
          "startUseDate",
        ],
      });
    }

    // SECURITY: Validate numeric inputs are actual numbers
    const numericFields = {
      original,
      cost,
      salvageValue,
      usefulLife,
      exchangeRate,
    };
    for (const [field, value] of Object.entries(numericFields)) {
      if (
        value !== undefined &&
        value !== null &&
        (isNaN(Number(value)) || !isFinite(Number(value)))
      ) {
        return res.status(400).json({
          success: false,
          error: `${field} must be a valid number`,
        });
      }
    }

    // SECURITY: Validate currency is from allowed list
    const allowedCurrencies = ["LAK", "USD", "THB", "EUR"];
    if (!allowedCurrencies.includes(currency)) {
      return res.status(400).json({
        success: false,
        error: "Invalid currency",
        allowed: allowedCurrencies,
      });
    }

    if (!original || original <= 0) {
      return res.status(400).json({
        success: false,
        error: "Original amount must be greater than 0",
      });
    }

    if (!cost || cost <= 0) {
      return res.status(400).json({
        success: false,
        error: "Cost must be greater than 0",
      });
    }

    if (!usefulLife || usefulLife <= 0) {
      return res.status(400).json({
        success: false,
        error: "Useful life must be greater than 0",
      });
    }

    // SECURITY: Prevent unrealistic values (potential attack)
    if (Number(original) > 999999999999 || Number(cost) > 999999999999) {
      return res.status(400).json({
        success: false,
        error: "Amount exceeds maximum allowed value",
      });
    }

    if (salvageValue && Number(salvageValue) >= Number(cost)) {
      return res.status(400).json({
        success: false,
        error: "Salvage value must be less than cost",
      });
    }

    // Validate account IDs
    if (
      !assetAccountId ||
      !paidAccountId ||
      !depreciationExpenseAccountId ||
      !accumulatedDepreciationAccountId ||
      !getMoneyId ||
      !incomeAssetId ||
      !expenseId
    ) {
      return res.status(400).json({
        success: false,
        error: "All account IDs are required",
        required: [
          "assetAccountId",
          "paidAccountId",
          "depreciationExpenseAccountId",
          "accumulatedDepreciationAccountId",
          "getMoneyId",
          "incomeAssetId ",
          "expenseId",
        ],
      });
    }

    // Validate ObjectId format for all accounts
    const accountIds = [
      assetAccountId,
      paidAccountId,
      depreciationExpenseAccountId,
      accumulatedDepreciationAccountId,
      getMoneyId,
      incomeAssetId,
      expenseId,
    ];
    console.log(accountIds.length);
    for (const id of accountIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          error: "Invalid account ID format",
        });
      }
    }

    // SECURITY: Verify all accounts belong to user's company (Critical!)
    // ต้องทำก่อน startTransaction เพื่อหลีกเลี่ยง abort transaction ที่ยังไม่ได้เริ่ม
    // const accountCheck = await Account.countDocuments({
    //   _id: { $in: accountIds },
    //   companyId: req.user.companyId
    // });

    // if (accountCheck !== accountIds.length) {
    //   return res.status(403).json({
    //     success: false,
    //     error: "Access denied: One or more accounts do not belong to your company"
    //   });
    // }

    // Validate dates
    const purchaseDateObj = new Date(purchaseDate);
    const startUseDateObj = new Date(startUseDate);

    if (isNaN(purchaseDateObj.getTime()) || isNaN(startUseDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        error: "Invalid date format",
      });
    }

    if (startUseDateObj < purchaseDateObj) {
      return res.status(400).json({
        success: false,
        error: "Start use date cannot be before purchase date",
      });
    }

    // SECURITY: Prevent future dates beyond reasonable range
    const maxFutureDate = new Date();
    maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 1);
    if (purchaseDateObj > maxFutureDate || startUseDateObj > maxFutureDate) {
      return res.status(400).json({
        success: false,
        error: "Dates cannot be more than 1 year in the future",
      });
    }

    // ================= START TRANSACTION =================
    await session.startTransaction();

    // ================= CHECK DUPLICATE ASSET CODE =================
    const existingAsset = await FixedAsset.findOne({
      assetCode: sanitizedAssetCode,
      companyId: req.user.companyId,
    }).session(session);

    if (existingAsset) {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        error: "Asset code already exists",
        duplicate: sanitizedAssetCode,
      });
    }

    // ================= CALCULATE VALUES =================
    const costLAK =
      currency === "LAK"
        ? Number(cost)
        : Number(original) * Number(exchangeRate);
    const salvageValueLAK =
      currency === "LAK"
        ? Number(salvageValue)
        : Number(salvageValue) * Number(exchangeRate);

    // ================= CREATE ASSET =================
    const assetData = {
      assetCode: sanitizedAssetCode,
      name: sanitizedName,
      category: sanitizedCategory,
      purchaseDate: purchaseDateObj,
      startUseDate: startUseDateObj,
      original: Number(original),
      exchangeRate: Number(exchangeRate),
      currency,
      cost: costLAK,
      salvageValue: salvageValueLAK,
      usefulLife: Number(usefulLife),
      assetAccountId,
      depreciationExpenseAccountId,
      accumulatedDepreciationAccountId,
      paidAccountId,
      getMoneyId,
      incomeAssetId,
      expenseId,
      companyId: req.user.companyId,
      createdBy: req.user._id,
      status: "active",
    };

    const asset = await FixedAsset.create([assetData], { session });

    // ================= CREATE JOURNAL ENTRY =================
    const journalData = {
      companyId: req.user.companyId,
      userId: req.user._id,
      date: purchaseDateObj,
      description: `Purchase of fixed asset: ${sanitizedName}`,
      reference: sanitizedAssetCode,
      source: "buyFixedAsset",
      sourceId: asset[0]._id,
      createdBy: req.user._id,
      totalDebitLAK: costLAK,
      totalCreditLAK: costLAK,
      status: "posted",
      type: "fiexdAsset",
      lines: [
        // DR: Asset Account
        {
          accountId: assetAccountId,
          description: `Asset: ${sanitizedName}`,
          currency,
          exchangeRate: Number(exchangeRate),
          debitOriginal: Number(original),
          creditOriginal: 0,
          debitLAK: costLAK,
          creditLAK: 0,
          amountLAK: costLAK,
          side: "dr",
        },
        // CR: Paid Account (Cash/Bank)
        {
          accountId: paidAccountId,
          description: `Payment for asset: ${sanitizedName}`,
          currency,
          exchangeRate: Number(exchangeRate),
          debitOriginal: 0,
          creditOriginal: Number(original),
          debitLAK: 0,
          creditLAK: costLAK,
          amountLAK: costLAK,
          side: "cr",
        },
      ],
    };

    const journal = await journalEntry_models.create([journalData], {
      session,
    });

    // ================= CREATE AUDIT LOG (if available) =================
    if (typeof createAuditLog === "function") {
      await createAuditLog({
        userId: req.user._id,
        action: "CREATE",
        collectionName: "FixedAsset",
        documentId: asset[0]._id,
        ipAddress: req.ip,
        description: `Created asset: ${sanitizedAssetCode} - ${sanitizedName}`,
        userAgent: req.get("user-agent"),
        metadata: {
          assetCode: sanitizedAssetCode,
          cost: costLAK,
          journalId: journal[0]._id,
        },
      });
    }

    // ================= COMMIT TRANSACTION =================
    await session.commitTransaction();

    console.log(
      `Asset created: ${asset[0]._id} by user ${req.user._id} from company ${req.user.companyId}`
    );

    res.status(201).json({
      success: true,
      message: "Asset created successfully",
      data: {
        asset: asset[0],
        journal: journal[0],
      },
    });
  } catch (err) {
    // Rollback transaction on error
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    // SECURITY: Don't log sensitive data
    console.error("POST /assets error:", err.message);

    // Handle specific errors
    if (err.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: Object.values(err.errors).map((e) => e.message),
      });
    }

    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: "Duplicate key error",
        field: Object.keys(err.keyPattern)[0],
      });
    }

    if (err.name === "CastError") {
      return res.status(400).json({
        success: false,
        error: "Invalid data format",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to create asset",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  } finally {
    session.endSession();
  }
});

// router.put("/update-asset/:id", authenticate, async (req, res) => {
//   try {
//     /* ================= 1. Validate ID ================= */
//     if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
//       return res.status(400).json({ message: "Invalid asset ID" });
//     }

//     /* ================= 2. Load asset ================= */
//     const asset = await FixedAsset.findOne({
//       _id: req.params.id,
//       companyId: req.user.companyId,
//     });

//     if (!asset) {
//       return res.status(404).json({ message: "Asset not found" });
//     }

//     /* ================= 3. Prevent editing sold/disposed ================= */
//     if (["sold", "disposal"].includes(asset.status)) {
//       return res.status(403).json({
//         message: `Asset has been ${asset.status} and cannot be edited`,
//       });
//     }

//     /* ================= 4. Check if depreciation exists ================= */
//     const hasDepreciation = await DepreciationLedger.exists({
//       assetId: asset._id,
//     });

//     /* ================= 5. IMMUTABLE fields ================= */
//     if (
//       req.body.assetAccountId &&
//       req.body.assetAccountId.toString() !== asset.assetAccountId.toString()
//     ) {
//       return res.status(403).json({
//         message:
//           "assetAccountId cannot be changed. Delete the asset and recreate it if incorrect.",
//       });
//     }
//     console.log(req.body.cost);
//     /* ==== ============= 6. Locked fields after depreciation ================= */
//     if (hasDepreciation) {
//       const lockedAfterDepreciation = [
//         "cost",
//         "startUseDate",
//         "usefulLife",
//         "depreciationMethod",
//         "assetAccountId",
//         "depreciationExpenseAccountId",
//         "accumulatedDepreciationAccountId",
//       ];

//       for (const field of lockedAfterDepreciation) {
//         if (req.body[field] !== undefined) {
//           // แปลงค่าเก่าและใหม่เป็น string ให้เทียบง่าย
//           const oldValue =
//             asset[field] instanceof Date
//               ? asset[field].toISOString()
//               : asset[field];
//           const newValue =
//             req.body[field] instanceof Date
//               ? req.body[field].toISOString()
//               : req.body[field];

//           if (newValue != oldValue) {
//             return res.status(403).json({
//               message: `Field '${field}' cannot be edited after depreciation has been posted`,
//             });
//           }
//         }
//       }
//     }

//     /* ================= 7. Whitelist allowed updates ================= */
//     const ALLOWED_UPDATE_FIELDS = [
//       "name",
//       "category",
//       "original",
//       "exchangeRate",
//       "currency",
//       "salvageValue",
//       "notes",
//       "cost",
//       "startUseDate",
//       "usefulLife",
//       // รวม fields ที่สามารถแก้ไขได้
//     ];

//     const updates = {};
//     for (const field of ALLOWED_UPDATE_FIELDS) {
//       if (req.body[field] !== undefined) {
//         updates[field] = req.body[field];
//       }
//     }

//     if (Object.keys(updates).length === 0) {
//       return res.status(400).json({ message: "No valid fields to update" });
//     }

//     /* ================= 8. Audit trail ================= */
//     updates.updatedBy = req.user.userId;
//     updates.updatedAt = new Date();

//     /* ================= 9. Apply updates ================= */
//     Object.assign(asset, updates);
//     await asset.save();

//     /* ================= 10. Response ================= */
//     res.json({
//       success: true,
//       updatedFields: Object.keys(updates),
//       asset,
//     });
//   } catch (err) {
//     console.error("Update asset error:", err);
//     res.status(500).json({
//       success: false,
//       message: "Update asset failed",
//       error: err.message,
//     });
//   }
// });
router.put("/update-asset/:id", authenticate, apiLimiter, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    /* ================= 1. Validate ID ================= */
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset ID",
      });
    }

    // SECURITY: Whitelist only expected fields to prevent mass assignment
    const ALLOWED_UPDATE_FIELDS = [
      "name",
      "category",
      "original",
      "exchangeRate",
      "currency",
      "salvageValue",
      "notes",
      "cost",
      "startUseDate",
      "usefulLife",
    ];

    // const extraFields = Object.keys(req.body).filter(
    //   (key) => !ALLOWED_UPDATE_FIELDS.includes(key)
    // );

    // if (extraFields.length > 0) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Invalid fields provided dd",
    //     invalidFields: extraFields,
    //   });
    // }

    // SECURITY: Input length validation
    const stringFields = {
      name: req.body.name,
      category: req.body.category,
      currency: req.body.currency,
      notes: req.body.notes,
    };

    for (const [field, value] of Object.entries(stringFields)) {
      if (value && typeof value === "string") {
        const maxLength = field === "notes" ? 1000 : 255;
        if (value.length > maxLength) {
          return res.status(400).json({
            success: false,
            message: `${field} exceeds maximum length of ${maxLength} characters`,
          });
        }
      }
    }

    // SECURITY: Sanitize string inputs
    const sanitizeString = (str) => {
      if (!str || typeof str !== "string") return str;
      return str.replace(/[<>"']/g, "").trim();
    };

    // SECURITY: Validate numeric inputs
    const numericFields = {
      original: req.body.original,
      cost: req.body.cost,
      salvageValue: req.body.salvageValue,
      usefulLife: req.body.usefulLife,
      exchangeRate: req.body.exchangeRate,
    };

    for (const [field, value] of Object.entries(numericFields)) {
      if (value !== undefined && value !== null) {
        if (isNaN(Number(value)) || !isFinite(Number(value))) {
          return res.status(400).json({
            success: false,
            message: `${field} must be a valid number`,
          });
        }
        // SECURITY: Prevent unrealistic values
        if (Number(value) > 999999999999 || Number(value) < 0) {
          return res.status(400).json({
            success: false,
            message: `${field} value is out of acceptable range`,
          });
        }
      }
    }

    // SECURITY: Validate currency
    if (req.body.currency) {
      const allowedCurrencies = ["LAK", "USD", "THB", "EUR"];
      if (!allowedCurrencies.includes(req.body.currency)) {
        return res.status(400).json({
          success: false,
          message: "Invalid currency",
          allowed: allowedCurrencies,
        });
      }
    }

    // SECURITY: Validate date if provided
    if (req.body.startUseDate) {
      const startUseDateObj = new Date(req.body.startUseDate);
      if (isNaN(startUseDateObj.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format for startUseDate",
        });
      }

      // SECURITY: Prevent future dates beyond reasonable range
      const maxFutureDate = new Date();
      maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 1);
      if (startUseDateObj > maxFutureDate) {
        return res.status(400).json({
          success: false,
          message: "Start use date cannot be more than 1 year in the future",
        });
      }
    }

    // SECURITY: Validate business rules
    if (req.body.salvageValue !== undefined && req.body.cost !== undefined) {
      if (Number(req.body.salvageValue) >= Number(req.body.cost)) {
        return res.status(400).json({
          success: false,
          message: "Salvage value must be less than cost",
        });
      }
    }

    if (req.body.usefulLife !== undefined && Number(req.body.usefulLife) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Useful life must be greater than 0",
      });
    }

    /* ================= 2. Load asset ================= */
    const asset = await FixedAsset.findOne({
      _id: req.params.id,
      companyId: req.user.companyId, // SECURITY: Ensure user can only access their company's assets
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found or access denied",
      });
    }

    /* ================= 3. Prevent editing sold/disposed ================= */
    if (["sold", "disposal"].includes(asset.status)) {
      return res.status(403).json({
        success: false,
        message: `Asset has been ${asset.status} and cannot be edited`,
      });
    }

    /* ================= 4. Check if depreciation exists ================= */
    const hasDepreciation = await DepreciationLedger.exists({
      assetId: asset._id,
    });

    /* ================= 5. IMMUTABLE fields ================= */
    if (
      req.body.assetAccountId &&
      req.body.assetAccountId.toString() !== asset.assetAccountId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          "assetAccountId cannot be changed. Delete the asset and recreate it if incorrect.",
      });
    }

    /* ================= 6. Locked fields after depreciation ================= */
    if (hasDepreciation) {
      const lockedAfterDepreciation = [
        "cost",
        "original",
        "exchangeRate",
        "currency",
        "salvageValue",
        "startUseDate",
        "usefulLife",
        "depreciationMethod",
        "assetAccountId",
        "depreciationExpenseAccountId",
        "accumulatedDepreciationAccountId",
      ];

      for (const field of lockedAfterDepreciation) {
        if (req.body[field] !== undefined) {
          // แปลงค่าเก่าและใหม่เป็น string ให้เทียบง่าย
          const oldValue =
            asset[field] instanceof Date
              ? asset[field].toISOString()
              : asset[field];
          const newValue =
            req.body[field] instanceof Date
              ? new Date(req.body[field]).toISOString()
              : req.body[field];

          if (newValue != oldValue) {
            return res.status(403).json({
              success: false,
              message: `Field '${field}' cannot be edited after depreciation has been posted`,
            });
          }
        }
      }
    }

    /* ================= 7. Build sanitized updates ================= */
    const updates = {};

    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (req.body[field] !== undefined) {
        // Sanitize string fields
        if (["name", "category", "notes"].includes(field)) {
          updates[field] = sanitizeString(req.body[field]);
        }
        // Convert numeric fields
        else if (
          [
            "original",
            "cost",
            "salvageValue",
            "usefulLife",
            "exchangeRate",
          ].includes(field)
        ) {
          updates[field] = Number(req.body[field]);
        }
        // Date fields
        else if (field === "startUseDate") {
          updates[field] = new Date(req.body[field]);
        }
        // Other fields (currency)
        else {
          updates[field] = req.body[field];
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    // SECURITY: Additional validation for salvageValue vs existing cost
    if (updates.salvageValue !== undefined && updates.cost === undefined) {
      if (Number(updates.salvageValue) >= Number(asset.cost)) {
        return res.status(400).json({
          success: false,
          message: "Salvage value must be less than current cost",
        });
      }
    }

    // SECURITY: Additional validation for cost vs existing salvageValue
    if (updates.cost !== undefined && updates.salvageValue === undefined) {
      if (Number(asset.salvageValue) >= Number(updates.cost)) {
        return res.status(400).json({
          success: false,
          message: "New cost must be greater than current salvage value",
        });
      }
    }

    /* ================= 8. Start transaction ================= */
    await session.startTransaction();

    /* ================= 9. Audit trail ================= */
    updates.updatedBy = req.user._id;
    updates.updatedAt = new Date();

    /* ================= 10. Apply updates ================= */
    Object.assign(asset, updates);
    await asset.save({ session });
    // ================= Update journal if cost changed =================
    if (updates.cost !== undefined) {
      const journal = await journalEntry_models.findOne(
        {
          sourceId: asset._id,
          source: "buyFixedAsset",
          companyId: req.user.companyId,
        },
        null,
        { session }
      );

      if (journal && journal.lines.length >= 2) {
        const newCost = Number(asset.cost);

        // update totals
        journal.totalDebitLAK = newCost;
        journal.totalCreditLAK = newCost;

        // DR: asset line
        journal.lines[0].debitLAK = newCost;
        journal.lines[0].creditLAK = 0;
        journal.lines[0].amountLAK = newCost;
        journal.lines[0].debitOriginal = newCost;
        journal.lines[0].creditOriginal = 0;

        // CR: payment line
        journal.lines[1].debitLAK = 0;
        journal.lines[1].creditLAK = newCost;
        journal.lines[1].amountLAK = newCost;
        journal.lines[1].debitOriginal = 0;
        journal.lines[1].creditOriginal = newCost;

        await journal.save({ session });
      }
    }
    /* ================= 11. Create audit log ================= */
    if (typeof createAuditLog === "function") {
      await createAuditLog({
        userId: req.user._id,
        action: "UPDATE",
        collectionName: "FixedAsset",
        documentId: asset._id,
        ipAddress: req.ip,
        description: `Updated asset: ${asset.assetCode} - ${asset.name}`,
        userAgent: req.get("user-agent"),
        metadata: {
          updatedFields: Object.keys(updates).filter(
            (f) => !["updatedBy", "updatedAt"].includes(f)
          ),
          assetCode: asset.assetCode,
        },
      });
    }

    /* ================= 12. Commit transaction ================= */
    await session.commitTransaction();

    /* ================= 13. Response ================= */
    res.json({
      success: true,
      message: "Asset updated successfully",
      updatedFields: Object.keys(updates).filter(
        (f) => !["updatedBy", "updatedAt"].includes(f)
      ),
      asset,
    });
  } catch (err) {
    // Rollback transaction on error
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    // SECURITY: Don't log sensitive data
    console.error("Update asset error:", err.message);

    // Handle specific errors
    if (err.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        details: Object.values(err.errors).map((e) => e.message),
      });
    }

    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate key error",
        field: Object.keys(err.keyPattern)[0],
      });
    }

    if (err.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid data format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Update asset failed",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  } finally {
    session.endSession();
  }
});

router.get("/getId-asset/:id", authenticate, apiLimiter, async (req, res) => {
  try {
    /* ================= 1. Validate ID format ================= */
    // SECURITY: Validate ObjectId format to prevent injection
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset ID format",
      });
    }

    /* ================= 2. Query asset with company isolation ================= */
    // SECURITY: Always filter by companyId to prevent unauthorized access
    const asset = await FixedAsset.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    })
      .select("-__v") // SECURITY: Exclude internal fields
      .lean(); // Performance: Convert to plain object

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found or access denied",
      });
    }

    /* ================= 3. Create audit log (optional) ================= */
    // SECURITY: Log access to sensitive data for compliance
    if (typeof createAuditLog === "function") {
      await createAuditLog({
        userId: req.user._id,
        action: "READ",
        collectionName: "FixedAsset",
        documentId: asset._id,
        ipAddress: req.ip,
        description: `Viewed asset: ${asset.assetCode} - ${asset.name}`,
        userAgent: req.get("user-agent"),
        metadata: {
          assetCode: asset.assetCode,
        },
      });
    }

    /* ================= 4. Response ================= */
    res.json({
      success: true,
      data: asset,
    });
  } catch (err) {
    // SECURITY: Don't expose internal error details
    console.error("Get asset error:", err.message);

    // Handle specific errors
    if (err.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid asset ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to retrieve asset",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});
/* ================= GET ALL BY COMPANY ================= */
router.get("/all-fixedAsset", authenticate, apiLimiter, async (req, res) => {
  try {
    /* ================= 1. INPUT VALIDATION & SANITIZATION ================= */

    // SECURITY: Validate and sanitize query parameters
    const {
      status,
      category,
      search,
      page = 1,
      limit = 10,
      year,
      month,
      startDate,
      endDate,
    } = req.query;

    // SECURITY: Validate pagination parameters
    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid page number",
      });
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        message: "Invalid limit. Must be between 1 and 100",
      });
    }

    // SECURITY: Validate year parameter
    if (
      year &&
      (isNaN(Number(year)) || Number(year) < 1900 || Number(year) > 2100)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid year parameter",
      });
    }

    // SECURITY: Validate month parameter
    if (
      month &&
      (isNaN(Number(month)) || Number(month) < 1 || Number(month) > 12)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid month parameter. Must be between 1 and 12",
      });
    }

    // SECURITY: Validate status parameter
    const allowedStatuses = [
      "All",
      "ACTIVE",
      "SOLD",
      "DISPOSAL",
      "active",
      "sold",
      "disposal",
    ];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status parameter",
        allowed: ["All", "ACTIVE", "SOLD", "DISPOSAL"],
      });
    }

    // SECURITY: Sanitize search input to prevent NoSQL injection and XSS
    let sanitizedSearch = null;
    if (search) {
      if (typeof search !== "string" || search.length > 100) {
        return res.status(400).json({
          success: false,
          message: "Search term must be a string with maximum 100 characters",
        });
      }
      // Remove special regex characters and potential injection patterns
      sanitizedSearch = search
        .replace(/[<>"'`]/g, "") // XSS prevention
        .replace(/[\$\{\}]/g, "") // NoSQL injection prevention
        .trim();

      if (sanitizedSearch.length === 0) {
        sanitizedSearch = null;
      }
    }

    // SECURITY: Sanitize category input
    let sanitizedCategory = null;
    if (category && category !== "All") {
      if (typeof category !== "string" || category.length > 100) {
        return res.status(400).json({
          success: false,
          message: "Category must be a string with maximum 100 characters",
        });
      }
      sanitizedCategory = category.replace(/[<>"'`]/g, "").trim();
    }

    /* ================= 2. Resolve period ================= */
    const resolvedFilter = resolveReportFilter({
      query: req.query,
    });

    // SECURITY: Validate date objects
    if (
      resolvedFilter.startDate &&
      isNaN(new Date(resolvedFilter.startDate).getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid startDate format",
      });
    }

    if (
      resolvedFilter.endDate &&
      isNaN(new Date(resolvedFilter.endDate).getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid endDate format",
      });
    }

    // SECURITY: Validate date range
    if (resolvedFilter.startDate && resolvedFilter.endDate) {
      if (
        new Date(resolvedFilter.startDate) > new Date(resolvedFilter.endDate)
      ) {
        return res.status(400).json({
          success: false,
          message: "startDate cannot be after endDate",
        });
      }
    }

    const selectedYear = resolvedFilter.year
      ? Number(resolvedFilter.year)
      : null;
    const selectedMonth = resolvedFilter.month
      ? Number(resolvedFilter.month)
      : null;

    const companyId = req.user.companyId;

    /* ================= 3. FixedAsset Query ================= */
    const assetQuery = {
      companyId, // SECURITY: Always filter by company
      status: { $ne: false },
    };

    if (status && status !== "All") {
      assetQuery.status = status.toUpperCase();
    }

    if (sanitizedCategory) {
      assetQuery.category = sanitizedCategory;
    }

    if (sanitizedSearch) {
      // SECURITY: Use escaped regex to prevent ReDoS attacks
      const searchRegex = new RegExp(
        sanitizedSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
      assetQuery.$or = [{ assetCode: searchRegex }, { name: searchRegex }];
    }

    /* ================= 4. Pagination ================= */
    const skip = (pageNum - 1) * limitNum;

    /* ================= 5. Fetch Assets ================= */
    const [assets, total] = await Promise.all([
      FixedAsset.find(assetQuery)
        .select("-__v") // SECURITY: Exclude internal fields
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      FixedAsset.countDocuments(assetQuery),
    ]);

    const assetIds = assets.map((a) => a._id);

    /* ================= 6. Helpers ================= */

    function toYearMonth(dateStr) {
      const d = new Date(dateStr);
      return {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
      };
    }

    // ✅ Apply ledger filter based on mode
    function applyLedgerFilter(queryObj) {
      // ✅ year+month overrides everything
      if (selectedYear && selectedMonth) {
        queryObj.$or = [
          { year: { $lt: selectedYear } },
          { year: selectedYear, month: { $lte: selectedMonth } },
        ];
        return;
      }

      // ✅ year overrides date-range
      if (selectedYear) {
        queryObj.year = { $lte: selectedYear };
        return;
      }

      // ✅ date-range only when no year selected
      if (resolvedFilter.startDate && resolvedFilter.endDate) {
        const start = toYearMonth(resolvedFilter.startDate);
        const end = toYearMonth(resolvedFilter.endDate);

        queryObj.$and = [
          {
            $or: [
              { year: { $gt: start.year } },
              { year: start.year, month: { $gte: start.month } },
            ],
          },
          {
            $or: [
              { year: { $lt: end.year } },
              { year: end.year, month: { $lte: end.month } },
            ],
          },
        ];
      }
    }

    /* ======================================================
       ✅ 7A. Ledger Total (ALL Assets)
    ====================================================== */
    const ledgerTotalQuery = {
      companyId, // SECURITY: Always filter by company
    };
    applyLedgerFilter(ledgerTotalQuery);

    const ledgersAll = await DepreciationLedger.find(ledgerTotalQuery)
      .select("-__v") // SECURITY: Exclude internal fields
      .lean();

    /* ======================================================
       ✅ 7B. Ledger Page (Only current assets)
    ====================================================== */
    const ledgerPageQuery = {
      companyId, // SECURITY: Always filter by company
      assetId: { $in: assetIds },
    };
    applyLedgerFilter(ledgerPageQuery);

    const ledgersPage = await DepreciationLedger.find(ledgerPageQuery)
      .select("-__v") // SECURITY: Exclude internal fields
      .sort({ year: 1, month: 1 })
      .lean();

    /* ================= 8. Group Ledgers by Asset ================= */
    const ledgerMap = {};
    ledgersPage.forEach((l) => {
      const id = l.assetId.toString();
      if (!ledgerMap[id]) ledgerMap[id] = [];
      ledgerMap[id].push(l);
    });

    /* ================= 9. Merge Assets ================= */
    const assetsWithLedgers = assets.map((asset) => {
      const assetLedgers = ledgerMap[asset._id.toString()] || [];

      // ✅ Total in period
      const totalDepreciation = assetLedgers.reduce(
        (sum, l) => sum + (Number(l.depreciationAmount) || 0),
        0
      );

      // ✅ This Year only (inside range also)
      const depreciationThisYear = selectedYear
        ? assetLedgers
            .filter((l) => l.year === selectedYear)
            .reduce((sum, l) => sum + (Number(l.depreciationAmount) || 0), 0)
        : 0;

      // ✅ Accumulated before selected year (important!)
      const depreciationBeforeYear = selectedYear
        ? assetLedgers
            .filter((l) => l.year < selectedYear)
            .reduce((sum, l) => sum + (Number(l.depreciationAmount) || 0), 0)
        : totalDepreciation;

      return {
        ...asset,
        totalDepreciation,
        depreciationBeforeYear,
        depreciationThisYear,
      };
    });

    /* ================= 10. Totals ERP Correct ================= */

    // ✅ Total depreciation in selected period
    const depreciationAmount = ledgersAll.reduce(
      (sum, l) => sum + (Number(l.depreciationAmount) || 0),
      0
    );

    // ✅ This year depreciation only
    const depreciationThisYearAmount = selectedYear
      ? ledgersAll
          .filter((l) => l.year === selectedYear)
          .reduce((sum, l) => sum + (Number(l.depreciationAmount) || 0), 0)
      : 0;

    // ✅ Accumulated before selected year (Fix your case!)
    const depreciationBeforeYearAmount = selectedYear
      ? ledgersAll
          .filter((l) => l.year < selectedYear)
          .reduce((sum, l) => sum + (Number(l.depreciationAmount) || 0), 0)
      : depreciationAmount;

    /* ================= 11. Response ================= */
    res.json({
      success: true,

      filters: {
        year: selectedYear,
        month: selectedMonth,
        startDate: resolvedFilter.startDate,
        endDate: resolvedFilter.endDate,
        status,
        category: sanitizedCategory,
        search: sanitizedSearch,
      },

      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },

      // ✅ ERP Correct Totals
      depreciationAmount, // Total in period
      depreciationBeforeYearAmount, // ✅ Accumulated before selected year
      depreciationThisYearAmount, // ✅ This year only

      assets: assetsWithLedgers,
    });
  } catch (err) {
    // SECURITY: Don't expose internal error details
    console.error("Error in /all-fixedAsset:", err.message);

    // Handle specific errors
    if (err.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid data format in query parameters",
      });
    }

    res.status(500).json({
      success: false,
      message: "Get fixed assets failed",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

router.get(
  "/assets/:id/depreciation-preview",
  authenticate,
  apiLimiter,
  previewDepreciation
);

router.post(
  "/post-depreciation/:id",
  authenticate,
  apiLimiter,
  postDepreciationForAsset
);

router.get("/get-depreciation/:id", authenticate, apiLimiter, depreiation);

router.delete(
  "/delete_depreciation/:journalId/:depreciationId",
  authenticate,
  apiLimiter,
  async (req, res) => {
    const session = await mongoose.startSession();

    try {
      /* ================= SECURITY: Input Validation ================= */
      const { companyId, _id: userId } = req.user;
      const { journalId, depreciationId } = req.params;

      // SECURITY: Validate company access
      if (!companyId) {
        return res.status(403).json({
          success: false,
          message: "Access denied: Company ID required",
        });
      }

      // SECURITY: Validate ObjectId formats
      if (!mongoose.Types.ObjectId.isValid(journalId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid journal ID format",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(depreciationId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid depreciation ID format",
        });
      }

      /* ================= 1. Verify Asset Exists and Status ================= */
      // SECURITY: Always filter by companyId
      const fixedAsset = await FixedAsset.findOne({
        _id: depreciationId,
        companyId,
      }).lean();

      if (!fixedAsset) {
        return res.status(404).json({
          success: false,
          message: "Asset not found or access denied",
        });
      }

      // Check asset status
      if (fixedAsset.status === "sold") {
        return res.status(400).json({
          success: false,
          message: "ຊັບສິນນີ້ ຂາຍແລ້ວ ບໍ່ສາມາດລົບໄດ້",
        });
      }

      if (fixedAsset.status === "disposal") {
        return res.status(400).json({
          success: false,
          message: "ຊັບສິນນີ້ ປ່ອຍອອກແລ້ວ ບໍ່ສາມາດລົບໄດ້",
        });
      }

      /* ================= 2. Verify Journal Entry ================= */
      // SECURITY: Verify journal belongs to user's company
      const journal = await journalEntry_models
        .findOne({
          _id: journalId,
          companyId: companyId,
        })
        .lean();

      if (!journal) {
        return res.status(404).json({
          success: false,
          message: "Journal entry not found or access denied",
        });
      }

      // SECURITY: Prevent deletion of asset purchase journal
      if (journal.source === "buyFixedAsset") {
        return res.status(403).json({
          success: false,
          message:
            "Cannot delete asset purchase journal entry. Use rollback instead.",
        });
      }

      /* ================= 3. Verify Depreciation Ledger ================= */
      // SECURITY: Verify depreciation ledger exists and belongs to the journal
      const depreciationLedger = await DepreciationLedger.findOne({
        journalEntryId: journalId,
        companyId: companyId,
      }).lean();

      if (!depreciationLedger) {
        return res.status(404).json({
          success: false,
          message: "Depreciation ledger not found or access denied",
        });
      }

      /* ================= 4. Check if Period is Closed ================= */
      const closed = await accountingPeriod
        .findOne({
          companyId,
          year: depreciationLedger.year,
          isClosed: true,
        })
        .lean();

      if (closed) {
        return res.status(400).json({
          success: false,
          message: "This period is locked/closed. Cannot delete depreciation.",
        });
      }

      /* ================= 5. Additional validation - ensure this is a depreciation journal ================= */
      const allowedSources = [
        "depreciation",
        "asset_sale",
        "asset_disposal",
        "asset_disposal_depreciation",
      ];
      if (!allowedSources.includes(journal.source)) {
        return res.status(400).json({
          success: false,
          message: "Invalid journal source for depreciation deletion",
        });
      }

      /* ================= 6. Start Transaction ================= */
      await session.startTransaction();

      /* ================= 7. Delete Depreciation Ledger ================= */
      const deletedLedger = await DepreciationLedger.findOneAndDelete(
        {
          journalEntryId: journalId,
          companyId,
        },
        { session }
      );

      if (!deletedLedger) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: "Depreciation ledger not found during deletion",
        });
      }

      /* ================= 8. Delete Journal Entry ================= */
      const deletedJournal = await journalEntry_models.findOneAndDelete(
        {
          _id: journalId,
          companyId, // SECURITY: Double-check companyId
        },
        { session }
      );

      if (!deletedJournal) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: "Journal entry not found during deletion",
        });
      }

      /* ================= 9. Update Asset Accumulated Depreciation ================= */
      const remainingDepreciation = await DepreciationLedger.find({
        assetId: depreciationId,
        companyId,
      }).session(session);

      const newAccumulatedDepreciation = remainingDepreciation.reduce(
        (sum, l) => sum + (Number(l.depreciationAmount) || 0),
        0
      );

      await FixedAsset.findOneAndUpdate(
        { _id: depreciationId, companyId },
        {
          accumulatedDepreciation: newAccumulatedDepreciation,
          netBookValue: fixedAsset.cost - newAccumulatedDepreciation,
        },
        { session }
      );

      /* ================= 10. Create Audit Log ================= */
      if (typeof createAuditLog === "function") {
        await createAuditLog({
          userId,
          action: "DELETE_DEPRECIATION",
          collectionName: "DepreciationLedger",
          documentId: deletedLedger._id,
          ipAddress: req.ip,
          description: `Deleted depreciation for asset: ${fixedAsset.assetCode}`,
          userAgent: req.get("user-agent"),
          metadata: {
            journalId,
            depreciationAmount: deletedLedger.depreciationAmount,
            year: deletedLedger.year,
            month: deletedLedger.month,
          },
        });
      }

      /* ================= 11. Commit Transaction ================= */
      await session.commitTransaction();

      // SECURITY: Log the deletion for audit trail
      console.log(
        `Deleted: Journal ${journalId} and Depreciation ${depreciationLedger._id} by user ${userId} from company ${companyId}`
      );

      res.status(200).json({
        success: true,
        message: "Depreciation and journal entry deleted successfully",
        data: {
          journalId: deletedJournal._id,
          depreciationId: deletedLedger._id,
          deletedAmount: deletedLedger.depreciationAmount,
          newAccumulatedDepreciation,
        },
      });
    } catch (error) {
      // Rollback transaction on error
      if (session.inTransaction()) {
        await session.abortTransaction();
      }

      // SECURITY: Don't expose sensitive data
      console.error("Delete depreciation error:", error.message);

      // Handle specific errors
      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,
          message: "Invalid data format",
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to delete depreciation entry",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    } finally {
      // End session
      session.endSession();
    }
  }
);
router.delete("/:id/rollback", authenticate, rollbackFixedAsset);

export default router;
