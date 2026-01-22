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
import Account from "../../models/accouting_system_models/Account_document.js";
import journalEntry_models from "../../models/accouting_system_models/journalEntry_models.js";
import DepreciationLedger from "../../models/accouting_system_models/DepreciationLedger.js";
/**
 * POST /fixed-assets/run-depreciation
 */
router.post("/", authenticate, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    // ================= INPUT VALIDATION =================
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
    console.log(getMoneyId, incomeAssetId, expenseId);
    // Validate required fields
    if (!assetCode || !name || !category || !purchaseDate || !startUseDate) {
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

    // ================= START TRANSACTION =================
    await session.startTransaction();

    // ================= VERIFY ACCOUNTS EXIST =================
    const accounts = await Account.find({
      _id: { $in: accountIds },
      companyId: req.user.companyId,
    }).session(session);
    console.log(accounts.length);
    // if (accounts.length !== accountIds.length) {
    //   await session.abortTransaction();
    //   return res.status(404).json({
    //     success: false,
    //     error: "One or more accounts not found or access denied",
    //   });
    // }

    // ================= CHECK DUPLICATE ASSET CODE =================
    const existingAsset = await FixedAsset.findOne({
      assetCode,
      companyId: req.user.companyId,
    }).session(session);

    if (existingAsset) {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        error: "Asset code already exists",
        duplicate: assetCode,
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
      assetCode,
      name,
      category,
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
      description: `Purchase of fixed asset: ${name}`,
      reference: assetCode,
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
          description: `Asset: ${name}`,
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
          description: `Payment for asset: ${name}`,
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
        description: `Created asset: ${assetCode} - ${name}`,
        userAgent: req.get("user-agent"),
        metadata: {
          assetCode,
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
    await session.abortTransaction();

    console.error("POST /assets error:", err);

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
const ALLOWED_UPDATE_FIELDS = [
  "assetCode",
  "name",
  "assetCategoryId",
  "purchaseDate",
  "startUseDate",
  "cost",
  "salvageValue",
  "usefulLife",
  "depreciationMethod",
  "assetAccountId",
  "depreciationExpenseAccountId",
  "accumulatedDepreciationAccountId",
  "status",
  "soldDate",
];

router.put("/update-asset/:id", authenticate, async (req, res) => {
  try {
    /* ================= 1. Validate ID ================= */
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid asset id" });
    }

    /* ================= 2. Load asset ================= */
    const asset = await FixedAsset.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    /* ================= 3. Check depreciation ================= */
    const hasDepreciation = await DepreciationLedger.exists({
      assetId: asset._id,
    });

    /* ================= 4. IMMUTABLE fields (never editable) ================= */
    if (
      req.body.assetAccountId &&
      req.body.assetAccountId.toString() !== asset.assetAccountId.toString()
    ) {
      return res.status(403).json({
        message:
          "assetAccountId cannot be changed. Delete the asset and recreate it if incorrect.",
      });
    }

    /* ================= 5. Locked after depreciation ================= */
    if (hasDepreciation) {
      const lockedAfterDepreciation = [
        "depreciationExpenseAccountId",
        "accumulatedDepreciationAccountId",
        "startUseDate",
        "usefulLife",
      ];

      for (const field of lockedAfterDepreciation) {
        if (
          req.body[field] !== undefined &&
          req.body[field]?.toString() !== asset[field]?.toString()
        ) {
          return res.status(403).json({
            message: `Field '${field}' cannot be edited after depreciation posting`,
          });
        }
      }
    }

    /* ================= 6. Whitelist allowed updates ================= */
    const updates = {};
    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    /* ================= 7. No valid updates ================= */
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No valid fields to update",
      });
    }

    /* ================= 8. Audit trail ================= */
    updates.updatedBy = req.user.userId;
    updates.updatedAt = new Date();

    /* ================= 9. Apply update ================= */
    Object.assign(asset, updates);
    await asset.save(); // ✅ schema hooks, validation

    res.json({
      success: true,
      asset,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Update asset failed",
      error: err.message,
    });
  }
});

router.get("/getId-asset/:id", authenticate, async (req, res) => {
  try {
    const asset = await FixedAsset.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    res.json(asset);
  } catch (err) {
    res.status(400).json({
      message: "Get asset failed",
      error: err.message,
    });
  }
});

/* ================= GET ALL BY COMPANY ================= */
router.get("/all-fixedAsset", authenticate, async (req, res) => {
  try {
    /* ================= 1. Resolve report period ================= */
    const { year, startDate, endDate } = resolveReportFilter({
      query: req.query,
    });
    /* ================= 2. Query params ================= */
    const { status, category, search, page = 1, limit = 10 } = req.query;
    console.log(year);
    const companyId = req.user.companyId;

    /* ================= 3. Base query ================= */
    const query = {
      companyId,
      status: { $ne: false }, // optional: soft delete
    };

    /* ================= 4. Status filter ================= */
    if (status && status !== "All") {
      query.status = status.toUpperCase();
    }

    /* ================= 5. Category filter ================= */
    if (category && category !== "All") {
      query.category = category;
    }

    /* ================= 6. Date filter (priority: custom range) ================= */
    if (startDate && endDate) {
      query.startUseDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else if (year) {
      query.startUseDate = {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31`),
      };
    }

    /* ================= 7. Search ================= */
    if (search) {
      query.$or = [
        { assetCode: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
      ];
    }

    /* ================= 8. Pagination ================= */
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    /* ================= 9. Query DB ================= */
    const [assets, total] = await Promise.all([
      FixedAsset.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      FixedAsset.countDocuments(query),
    ]);
    const ledgers = await DepreciationLedger.find().lean();

    const totalDepreciationLedgerAll = ledgers.reduce(
      (sum, l) => sum + (l.depreciationAmount || 0),
      0
    );

    /* ================= 10. Response ================= */
    res.json({
      success: true,
      filters: {
        year,
        startDate,
        endDate,
        status,
        category,
        search,
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
      depreciationAmount: totalDepreciationLedgerAll,
      assets,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Get fixed assets failed",
    });
  }
});
router.get(
  "/assets/:id/depreciation-preview",
  authenticate,
  previewDepreciation
);

router.post("/post-depreciation/:id", authenticate, postDepreciationForAsset);

router.get("/get-depreciation/:id", authenticate, depreiation);

router.delete(
  "/delete_depreciation/:journalId/:depreciationId",
  authenticate,
  async (req, res) => {
    const session = await mongoose.startSession();

    try {
      const { companyId } = req.user;
      const { journalId, depreciationId } = req.params;
      const fiexdAsset = await FixedAsset.findById(depreciationId).session(
        session
      );

      if (fiexdAsset.status === "sold") {
        return res.status(400).json({
          success: false,
          message: "ຊັບສິນນີ້ ຂາຍແລ້ວ ບໍ່ສາມາດລົບໄດ້",
        });
      }
      console.log(journalId, depreciationId);
      // Input validation
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

      // Start transaction
      session.startTransaction();

      // Verify journal belongs to user's company
      const journal = await journalEntry_models
        .findOne({
          _id: journalId,
          companyId: companyId,
        })
        .session(session);
      ////ບໍ່ອະນຸຍາດໃຫ້ລົບຊັບສິນທີ່ຊື້ມາແບບ ບໍ່ລົບທັງຊັບສິນທັງໝົດ
      const journalForAsset = await journalEntry_models
        .findOne({
          _id: journalId,
          companyId: companyId,
          source: "buyFixedAsset",
        })
        .session(session);
      if (journalForAsset) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: "Journal entry can not delete ",
        });
      }
      if (!journal) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: "Journal entry not found or access denied",
        });
      }
      // Verify depreciation ledger exists and belongs to the journal
      const depreciationLedger = await DepreciationLedger.findOne({
        journalEntryId: journalId,
        companyId: companyId,
      }).session(session);

      if (!depreciationLedger) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: "Depreciation ledger not found or access denied",
        });
      }

      // Delete depreciation ledger
      await DepreciationLedger.findOneAndDelete({
        journalEntryId: journalId,
      }).session(session);

      // Delete journal entry
      await journalEntry_models.findByIdAndDelete(journalId).session(session);

      // Commit transaction
      await session.commitTransaction();

      // Log the deletion for audit trail
      console.log(
        `Deleted: Journal ${journalId} and Depreciation ${depreciationId} by company ${companyId}`
      );

      res.status(200).json({
        success: true,
        message: "Depreciation and journal entry deleted successfully",
      });
    } catch (error) {
      // Rollback transaction on error
      await session.abortTransaction();

      console.error("Delete depreciation error:", error);

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
