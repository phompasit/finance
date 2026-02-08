import FixedAsset from "../../../models/accouting_system_models/FixedAsset.js";
import AccountingPeriod from "../../../models/accouting_system_models/accountingPeriod.js";
import DepreciationLedger from "../../../models/accouting_system_models/DepreciationLedger.js";
import JournalEntry from "../../../models/accouting_system_models/journalEntry_models.js";

import {
  calcMonthlyDepreciation,
  buildDepreciationScheduleV2,
  calcMonthlyDepreciationDaily,
  isAfter,
} from "../../../utils/depreciation.js";
import journalEntry_models from "../../../models/accouting_system_models/journalEntry_models.js";
import mongoose from "mongoose";
import accountingPeriod from "../../../models/accouting_system_models/accountingPeriod.js";

/* ================= UTIL ================= */
function buildJournalLine({
  accountId,
  debit = 0,
  credit = 0,
  currency = "LAK",
  exchangeRate = 1,
}) {
  const amount = Math.max(debit, credit);
  return {
    accountId,
    currency,
    exchangeRate,
    debitOriginal: debit,
    creditOriginal: credit,
    debitLAK: debit,
    creditLAK: credit,
    amountLAK: amount,
    side: debit > 0 ? "dr" : "cr",
  };
}

/* ================= MAIN ================= */
export async function postDepreciationForAsset(req, res) {
  const session = await mongoose.startSession();

  try {
    /* ================= SECURITY: Input Validation ================= */
    const { id: assetId } = req.params;
    const { type, period, eventDate, saleAmount, tradeValue } = req.body;

    // SECURITY: Validate assetId
    if (!mongoose.Types.ObjectId.isValid(assetId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset ID format",
      });
    }

    // SECURITY: Validate type
    const allowedTypes = ["depreciation", "sale", "disposal"];
    if (!type || !allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid type. Must be one of: depreciation, sale, disposal",
      });
    }

    // SECURITY: Validate period format for depreciation
    if (type === "depreciation") {
      if (!period) {
        return res.status(400).json({
          success: false,
          message: "Period is required for depreciation type",
        });
      }

      const periodRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
      if (!periodRegex.test(period)) {
        return res.status(400).json({
          success: false,
          message: "Invalid period format. Must be YYYY-MM",
        });
      }

      const [year, month] = period.split("-").map(Number);
      if (year < 1900 || year > 2100 || month < 1 || month > 12) {
        return res.status(400).json({
          success: false,
          message: "Period year or month out of valid range",
        });
      }
    }

    // SECURITY: Validate eventDate for sale/disposal
    if (["sale", "disposal"].includes(type)) {
      if (!eventDate) {
        return res.status(400).json({
          success: false,
          message: `Event date is required for ${type} type`,
        });
      }

      const eventDateObj = new Date(eventDate);
      if (isNaN(eventDateObj.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid event date format",
        });
      }

      // SECURITY: Prevent future dates
      const maxFutureDate = new Date();
      maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 1);
      if (eventDateObj > maxFutureDate) {
        return res.status(400).json({
          success: false,
          message: "Event date cannot be more than 1 year in the future",
        });
      }
    }

    // SECURITY: Validate saleAmount for sale type
    if (type === "sale") {
      if (saleAmount === undefined || saleAmount === null) {
        return res.status(400).json({
          success: false,
          message: "Sale amount is required for sale type",
        });
      }

      if (isNaN(Number(saleAmount)) || Number(saleAmount) < 0) {
        return res.status(400).json({
          success: false,
          message: "Sale amount must be a valid positive number",
        });
      }

      if (Number(saleAmount) > 999999999999) {
        return res.status(400).json({
          success: false,
          message: "Sale amount exceeds maximum allowed value",
        });
      }
    }

    // SECURITY: Validate tradeValue if provided
    if (tradeValue !== undefined && tradeValue !== null) {
      if (isNaN(Number(tradeValue)) || Number(tradeValue) < 0) {
        return res.status(400).json({
          success: false,
          message: "Trade value must be a valid positive number",
        });
      }

      if (Number(tradeValue) > 999999999999) {
        return res.status(400).json({
          success: false,
          message: "Trade value exceeds maximum allowed value",
        });
      }
    }

    const companyId = req.user.companyId;
    const userId = req.user._id;

    /* ================= 1. Load Asset ================= */
    // SECURITY: Always filter by companyId
    const asset = await FixedAsset.findOne({ _id: assetId, companyId });
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found or access denied",
      });
    }

    if (asset.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Asset is not active",
      });
    }

    /* ================= 2. Load Depreciation Ledger ================= */
    const ledgers = await DepreciationLedger.find({ assetId, companyId })
      .sort({ year: 1, month: 1 })
      .lean();

    let postedAccumulated = ledgers.reduce(
      (sum, l) => sum + (Number(l.depreciationAmount) || 0),
      0
    );
    const lastPosted = ledgers.length ? ledgers[ledgers.length - 1] : null;

    /* ================= 3. Lock check ================= */
    if (
      (type === "depreciation" && period) ||
      (["sale", "disposal"].includes(type) && eventDate)
    ) {
      const dateToCheck =
        type === "depreciation"
          ? new Date(period + "-01")
          : new Date(eventDate);

      const closed = await accountingPeriod.findOne({
        companyId,
        startDate: { $lte: dateToCheck },
        endDate: { $gte: dateToCheck },
        isClosed: true,
      });

      if (closed) {
        return res.status(400).json({
          success: false,
          message: "This period is locked/closed",
        });
      }
    }

    /* ================= 4. Start Transaction ================= */
    await session.startTransaction();

    /* ================= 5. Depreciation ================= */
    if (type === "depreciation") {
      const [year, month] = period.split("-").map(Number);

      if (
        lastPosted &&
        !isAfter(year, month, lastPosted.year, lastPosted.month)
      ) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "This period already depreciated",
        });
      }

      let amount = calcMonthlyDepreciationDaily({ asset, year, month });
      amount = Math.min(amount, asset.cost - postedAccumulated);

      if (amount <= 0) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Asset fully depreciated",
        });
      }

      const lines = [
        buildJournalLine({
          accountId: asset.depreciationExpenseAccountId,
          debit: amount,
        }),
        buildJournalLine({
          accountId: asset.accumulatedDepreciationAccountId,
          credit: amount,
        }),
      ];

      const journal = await JournalEntry.create(
        [
          {
            companyId,
            userId,
            date: new Date(year, month, 0),
            description: `Depreciation ${month}/${year} - ${asset.name}`,
            reference: asset.assetCode,
            source: "depreciation",
            sourceId: asset._id,
            totalDebitLAK: amount,
            totalCreditLAK: amount,
            status: "posted",
            lines,
          },
        ],
        { session }
      );

      await DepreciationLedger.create(
        [
          {
            assetId: asset._id,
            companyId,
            year,
            month,
            depreciationAmount: amount,
            journalEntryId: journal[0]._id,
            postedBy: userId,
          },
        ],
        { session }
      );

      asset.accumulatedDepreciation = postedAccumulated + amount;
      asset.netBookValue = asset.cost - asset.accumulatedDepreciation;
      await asset.save({ session });

      await session.commitTransaction();

      return res.json({
        success: true,
        message: "Depreciation posted successfully",
        data: {
          amount,
          accumulatedDepreciation: asset.accumulatedDepreciation,
          netBookValue: asset.netBookValue,
        },
      });
    }

    /* ================= 6. Event: SALE / DISPOSAL ================= */
    if (["sale", "disposal"].includes(type)) {
      const event = new Date(eventDate);
      const eventYear = event.getFullYear();
      const eventMonth = event.getMonth() + 1;

      if (
        lastPosted &&
        !isAfter(eventYear, eventMonth, lastPosted.year, lastPosted.month)
      ) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Event must be after last depreciation",
        });
      }

      /* ===== 6.1 Post missing depreciation until event month ===== */
      let accumulated = postedAccumulated;
      let startYear = lastPosted
        ? lastPosted.year
        : asset.purchaseDate.getFullYear();
      let startMonth = lastPosted
        ? lastPosted.month + 1
        : asset.purchaseDate.getMonth() + 1;

      while (
        startYear < eventYear ||
        (startYear === eventYear && startMonth <= eventMonth)
      ) {
        const depAmount = Math.min(
          calcMonthlyDepreciationDaily({
            asset,
            year: startYear,
            month: startMonth,
            soldDate: event,
          }),
          asset.cost - accumulated
        );

        if (depAmount > 0) {
          accumulated += depAmount;

          const depLines = [
            buildJournalLine({
              accountId: asset.depreciationExpenseAccountId,
              debit: depAmount,
            }),
            buildJournalLine({
              accountId: asset.accumulatedDepreciationAccountId,
              credit: depAmount,
            }),
          ];

          const depJournal = await JournalEntry.create(
            [
              {
                companyId,
                userId,
                date: new Date(year, month, 0),
                description: `Depreciation ${startMonth}/${startYear} - ${asset.name}`,
                reference: asset.assetCode,
                source: "depreciation",
                sourceId: asset._id,
                totalDebitLAK: depAmount,
                totalCreditLAK: depAmount,
                status: "posted",
                lines: depLines,
              },
            ],
            { session }
          );

          await DepreciationLedger.create(
            [
              {
                assetId: asset._id,
                companyId,
                year: startYear,
                month: startMonth,
                depreciationAmount: depAmount,
                journalEntryId: depJournal[0]._id,
                postedBy: userId,
              },
            ],
            { session }
          );
        }

        startMonth++;
        if (startMonth > 12) {
          startMonth = 1;
          startYear++;
        }
      }

      /* ===== 6.2 Prepare journal for SALE / DISPOSAL ===== */
      let journalLines = [];
      const netBookValue = asset.cost - accumulated;

      if (type === "sale") {
        const proceeds = Number(saleAmount || 0);
        const gainLoss = proceeds - netBookValue;

        journalLines.push(
          buildJournalLine({ accountId: asset.getMoneyId, debit: proceeds })
        );
        journalLines.push(
          buildJournalLine({
            accountId: asset.accumulatedDepreciationAccountId,
            debit: accumulated,
          })
        );
        journalLines.push(
          buildJournalLine({
            accountId: asset.assetAccountId,
            credit: asset.cost,
          })
        );

        if (gainLoss > 0) {
          journalLines.push(
            buildJournalLine({
              accountId: asset.incomeAssetId,
              credit: gainLoss,
            })
          );
        } else if (gainLoss < 0) {
          journalLines.push(
            buildJournalLine({
              accountId: asset.expenseId,
              debit: Math.abs(gainLoss),
            })
          );
        }
      }

      if (type === "disposal") {
        journalLines.push(
          buildJournalLine({
            accountId: asset.accumulatedDepreciationAccountId,
            debit: accumulated,
          })
        );
        journalLines.push(
          buildJournalLine({
            accountId: asset.assetAccountId,
            credit: asset.cost,
          })
        );
        const loss = asset.cost - accumulated;
        if (loss > 0) {
          journalLines.push(
            buildJournalLine({ accountId: asset.expenseId, debit: loss })
          );
        }
      }

      await JournalEntry.create(
        [
          {
            companyId,
            userId,
            date: event,
            description: `Asset ${type} - ${asset.name}`,
            reference: asset.assetCode,
            source: type === "disposal" ? "asset_disposal" : "asset_sale",
            sourceId: asset._id,
            totalDebitLAK: journalLines.reduce(
              (s, l) => s + (Number(l.debitLAK) || 0),
              0
            ),
            totalCreditLAK: journalLines.reduce(
              (s, l) => s + (Number(l.creditLAK) || 0),
              0
            ),
            lines: journalLines,
            status: "posted",
          },
        ],
        { session }
      );

      /* ===== 6.3 Update Asset ===== */
      asset.status = type === "sale" ? "sold" : "disposal";
      asset.soldDate = event;
      asset.accumulatedDepreciation = accumulated;
      asset.netBookValue = 0;
      await asset.save({ session });

      await session.commitTransaction();

      return res.json({
        success: true,
        message: `Asset ${type} completed successfully`,
        data: {
          assetId: asset._id,
          proceeds: type === "sale" ? saleAmount : 0,
          accumulated,
          netBookValue: 0,
        },
      });
    }

    await session.abortTransaction();
    return res.status(400).json({
      success: false,
      message: "Invalid type",
    });
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("Post depreciation error:", err.message);

    if (err.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        details: Object.values(err.errors).map((e) => e.message),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Post depreciation failed",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  } finally {
    session.endSession();
  }
}

/* ================= ROLLBACK ================= */
export async function rollbackFixedAsset(req, res) {
  const session = await mongoose.startSession();

  const JOURNAL_SOURCE = {
    DEPRECIATION: "depreciation",
    ASSET_SALE: "asset_sale",
    ASSET_DISPOSAL_DEP: "asset_disposal_depreciation",
    BUY_FIXED_ASSET: "buyFixedAsset",
    DISPOSAL: "asset_disposal",
  };

  try {
    /* ================= SECURITY: Input Validation ================= */
    const { id: assetId } = req.params;
    const { deleteAsset = false } = req.body;

    // SECURITY: Validate assetId
    if (!mongoose.Types.ObjectId.isValid(assetId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset ID format",
      });
    }

    // SECURITY: Validate deleteAsset is boolean
    if (typeof deleteAsset !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "deleteAsset must be a boolean value",
      });
    }

    const companyId = req.user.companyId;
    const userId = req.user._id;

    await session.startTransaction();

    /* ================= 1. Load Asset ================= */
    // SECURITY: Always filter by companyId
    const asset = await FixedAsset.findOne({
      _id: assetId,
      companyId,
    }).session(session);

    if (!asset) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Asset not found or access denied",
      });
    }

    /* ================= 2. Lock Closed Period ================= */
    const periodToCheck = asset.soldDate || asset.purchaseDate;

    if (periodToCheck) {
      const year = periodToCheck.getFullYear();
      const month = periodToCheck.getMonth() + 1;

      const closedPeriod = await accountingPeriod
        .findOne({
          companyId,
          year,
          isClosed: true,
        })
        .session(session);

      if (closedPeriod) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Cannot rollback asset in closed period ${year}`,
        });
      }
    }

    /* ================= 3. Snapshot Before ================= */
    const assetBefore = asset.toObject();

    /* ================= 4. Delete Depreciation Ledgers ================= */
    const depResult = await DepreciationLedger.deleteMany(
      { assetId: asset._id, companyId },
      { session }
    );

    /* ================= 5. Validate Buy Journal Exists ================= */
    if (!deleteAsset) {
      const buyJournalExists = await JournalEntry.exists({
        companyId,
        sourceId: asset._id,
        source: "buyFixedAsset",
      }).session(session);

      if (!buyJournalExists) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message:
            "BUY journal missing. Rollback aborted to prevent accounting corruption.",
        });
      }
    }

    /* ================= 6. Delete Journal Entries ================= */
    let assetAfter = null;
    let journalResult;

    if (deleteAsset === true) {
      // 🔥 DELETE ALL (including buyFixedAsset)
      journalResult = await JournalEntry.deleteMany(
        {
          companyId,
          sourceId: asset._id,
          source: {
            $in: [
              "depreciation",
              "asset_sale",
              "asset_disposal_depreciation",
              "asset_disposal",
              "buyFixedAsset",
            ],
          },
        },
        { session }
      );

      // Delete the asset itself
      await FixedAsset.deleteOne({ _id: asset._id, companyId }, { session });
    } else {
      // 🔒 DELETE ONLY depreciation & sale
      journalResult = await JournalEntry.deleteMany(
        {
          companyId,
          sourceId: asset._id,
          source: {
            $in: [
              "depreciation",
              "asset_sale",
              "asset_disposal_depreciation",
              "asset_disposal",
            ],
          },
        },
        { session }
      );

      asset.accumulatedDepreciation = 0;
      asset.netBookValue = asset.cost;
      asset.status = "active";
      asset.soldDate = null;
      asset.saleAmount = null;
      asset.tradeValue = null;
      asset.gainLoss = 0;
      asset.disposalType = null;

      await asset.save({ session });
      assetAfter = asset.toObject();
    }

    /* ================= 7. Audit Log ================= */
    if (typeof createAuditLog === "function") {
      await createAuditLog({
        userId,
        action: deleteAsset
          ? "ROLLBACK_DELETE_FIXED_ASSET"
          : "ROLLBACK_FIXED_ASSET",
        collectionName: "FixedAsset",
        documentId: asset._id,
        ipAddress: req.ip,
        description: `Rolled back asset: ${asset.assetCode}`,
        userAgent: req.get("user-agent"),
        metadata: {
          assetCode: asset.assetCode,
          deleteAsset,
          depreciationLedgersDeleted: depResult.deletedCount,
          journalEntriesDeleted: journalResult.deletedCount,
        },
      });
    }

    /* ================= 8. Commit ================= */
    await session.commitTransaction();

    res.json({
      success: true,
      message: deleteAsset
        ? "Asset completely deleted"
        : "Asset rolled back to active state",
      data: {
        assetId,
        assetDeleted: deleteAsset,
        deleted: {
          depreciationLedgers: depResult.deletedCount,
          journalEntries: journalResult.deletedCount,
        },
      },
    });
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("Rollback Fixed Asset Error:", err.message);

    res.status(err.message?.includes("closed period") ? 400 : 500).json({
      success: false,
      message: err.message || "Rollback fixed asset failed",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  } finally {
    session.endSession();
  }
}

/* ================= PREVIEW DEPRECIATION ================= */
export async function previewDepreciation(req, res) {
  try {
    /* ================= SECURITY: Input Validation ================= */
    const { id } = req.params;

    // SECURITY: Validate assetId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset ID format",
      });
    }

    const companyId = req.user.companyId;

    /* ================= 1. Load asset ================= */
    // SECURITY: Always filter by companyId
    const asset = await FixedAsset.findOne({
      _id: id,
      companyId,
    }).lean();

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found or access denied",
      });
    }

    /* ================= 2. Calc base monthly depreciation ================= */
    const baseMonthly = calcMonthlyDepreciation({
      cost: asset.cost,
      salvageValue: asset.salvageValue || 0,
      usefulLifeYears: asset.usefulLife,
    });

    /* ================= 3. Build depreciation schedule ================= */
    const schedule = buildDepreciationScheduleV2({
      startUseDate: asset.startUseDate,
      usefulLifeYears: asset.usefulLife,
      soldDate: asset.soldDate,
    });

    /* ================= 4. Load posted depreciation ledgers ================= */
    const ledgers = await DepreciationLedger.find({
      assetId: asset._id,
      companyId,
    }).lean();

    const postedMap = new Map(ledgers.map((l) => [`${l.year}-${l.month}`, l]));

    /* ================= 5. Load accounting periods (only needed months) ================= */
    const years = [...new Set(schedule.map((s) => s.year))];

    const periods = await AccountingPeriod.find({
      companyId,
      year: { $in: years },
    }).lean();

    const periodMap = new Map(periods.map((p) => [`${p.year}-${p.month}`, p]));

    /* ================= 6. Preview calculation ================= */
    const depreciableBase = asset.cost - (asset.salvageValue || 0);
    const postedAccumulated = ledgers.reduce(
      (sum, l) => sum + (Number(l.depreciationAmount) || 0),
      0
    );

    let previewAccumulated = postedAccumulated;

    let result = schedule.map((m) => {
      const key = `${m.year}-${m.month}`;
      const posted = postedMap.get(key);
      const period = periodMap.get(key);

      let amount = 0;
      let status = "open";
      let alert = null;

      /* ===== already posted ===== */
      if (posted) {
        amount = Number(posted.depreciationAmount) || 0;
        status = "posted";
        alert = "Depreciation already posted";
        previewAccumulated += amount;
      } else {
        /* ===== preview only ===== */
        const perDay = baseMonthly / m.daysInMonth;
        amount = perDay * m.usedDays;

        // 🔒 do not exceed depreciable base
        if (previewAccumulated + amount > depreciableBase) {
          amount = Math.max(depreciableBase - previewAccumulated, 0);
        }

        previewAccumulated += amount;

        if (period?.isClosed) {
          status = "closed";
          alert = "Accounting period is closed";
        }
      }

      return {
        year: m.year,
        month: m.month,
        type: m.type,
        usedDays: m.usedDays,
        daysInMonth: m.daysInMonth,
        factor: Number(m.factor.toFixed(4)),
        amount: Number(amount.toFixed(2)),
        status,
        alert,
      };
    });

    /* ================= 7. If asset sold → show only posted ================= */
    if (asset.status === "sold" || asset.status === "disposal") {
      result = result.filter((r) => r.status === "posted");
    }

    /* ================= 8. Load journals (read-only) ================= */
    const journal = await journalEntry_models
      .find({
        sourceId: id,
        companyId, // SECURITY: Always filter by companyId
      })
      .populate("lines.accountId", "code name")
      .select("-__v -status_close -userId")
      .lean();

    /* ================= 9. Response ================= */
    res.json({
      success: true,
      asset: {
        id: asset._id,
        assetCode: asset.assetCode,
        name: asset.name,
        cost: asset.cost,
        salvageValue: asset.salvageValue || 0,
        postedAccumulated: Number(postedAccumulated.toFixed(2)),
        previewAccumulated: Number(previewAccumulated.toFixed(2)),
        remainingValue: Number(
          Math.max(depreciableBase - previewAccumulated, 0).toFixed(2)
        ),
      },
      baseMonthly: Number(baseMonthly.toFixed(2)),
      schedule: result,
      journal,
    });
  } catch (err) {
    console.error("Preview depreciation error:", err.message);

    if (err.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid data format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Preview depreciation failed",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

/* ================= GET DEPRECIATION ================= */
export const depreiation = async (req, res) => {
  try {
    /* ================= SECURITY: Input Validation ================= */
    const { id } = req.params;
    console.log("id",id)
    // SECURITY: Validate assetId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset ID format",
      });
    }

    const { companyId } = req.user;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Company ID required",
      });
    }

    /* ================= Query with company isolation ================= */
    // SECURITY: Always filter by companyId
    const det = await DepreciationLedger.find({
      assetId: id,
      companyId,
    })
      .select("-__v")
      .lean();

    const totalAmounts = det.reduce(
      (sum, row) => sum + (Number(row.depreciationAmount) || 0),
      0
    );

    res.json({
      success: true,
      data: det,
      totalAmounts: Number(totalAmounts.toFixed(2)),
    });
  } catch (error) {
    console.error("Depreciation error:", error.message);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid data format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Get depreciation failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// import FixedAsset from "../../../models/accouting_system_models/FixedAsset.js";
// import AccountingPeriod from "../../../models/accouting_system_models/accountingPeriod.js";
// import DepreciationLedger from "../../../models/accouting_system_models/DepreciationLedger.js";
// import JournalEntry from "../../../models/accouting_system_models/journalEntry_models.js";

// import {
//   calcMonthlyDepreciation,
//   buildDepreciationScheduleV2,
//   calcMonthlyDepreciationDaily,
//   isAfter,
// } from "../../../utils/depreciation.js";
// import journalEntry_models from "../../../models/accouting_system_models/journalEntry_models.js";
// import mongoose from "mongoose";
// import accountingPeriod from "../../../models/accouting_system_models/accountingPeriod.js";
// /* ================= UTIL ================= */
// /* ================= UTIL ================= */
// function buildJournalLine({
//   accountId,
//   debit = 0,
//   credit = 0,
//   currency = "LAK",
//   exchangeRate = 1,
// }) {
//   const amount = Math.max(debit, credit);
//   return {
//     accountId,
//     currency,
//     exchangeRate,
//     debitOriginal: debit,
//     creditOriginal: credit,
//     debitLAK: debit,
//     creditLAK: credit,
//     amountLAK: amount,
//     side: debit > 0 ? "dr" : "cr",
//   };
// }

// /* ================= MAIN ================= */
// export async function postDepreciationForAsset(req, res) {
//   try {
//     const { id: assetId } = req.params;
//     const { type, period, eventDate, saleAmount, tradeValue } = req.body;

//     const companyId = req.user.companyId;
//     const userId = req.user._id;

//     /* ================= 1. Load Asset ================= */
//     const asset = await FixedAsset.findOne({ _id: assetId, companyId });
//     if (!asset) return res.status(404).json({ message: "Asset not found" });
//     if (asset.status !== "active")
//       return res.status(400).json({ message: "Asset is not active" });

//     /* ================= 2. Load Depreciation Ledger ================= */
//     const ledgers = await DepreciationLedger.find({ assetId, companyId }).sort({
//       year: 1,
//       month: 1,
//     });
//     let postedAccumulated = ledgers.reduce(
//       (sum, l) => sum + l.depreciationAmount,
//       0
//     );
//     const lastPosted = ledgers.length ? ledgers[ledgers.length - 1] : null;

//     /* ================= 3. Lock check ================= */
//     if (
//       (type === "depreciation" && period) ||
//       (["sale", "disposal"].includes(type) && eventDate)
//     ) {
//       const dateToCheck =
//         type === "depreciation"
//           ? new Date(period + "-01")
//           : new Date(eventDate);
//       const closed = await accountingPeriod.findOne({
//         companyId,
//         startDate: { $lte: dateToCheck },
//         endDate: { $gte: dateToCheck },
//         isClosed: true,
//       });
//       if (closed)
//         return res
//           .status(400)
//           .json({ message: "This period is locked/closed" });
//     }

//     /* ================= 4. Depreciation ================= */
//     if (type === "depreciation") {
//       const [year, month] = period.split("-").map(Number);
//       if (
//         lastPosted &&
//         !isAfter(year, month, lastPosted.year, lastPosted.month)
//       ) {
//         return res
//           .status(400)
//           .json({ message: "This period already depreciated" });
//       }

//       let amount = calcMonthlyDepreciationDaily({ asset, year, month });
//       amount = Math.min(amount, asset.cost - postedAccumulated);
//       if (amount <= 0)
//         return res.status(400).json({ message: "Asset fully depreciated" });

//       const lines = [
//         buildJournalLine({
//           accountId: asset.depreciationExpenseAccountId,
//           debit: amount,
//         }),
//         buildJournalLine({
//           accountId: asset.accumulatedDepreciationAccountId,
//           credit: amount,
//         }),
//       ];

//       const journal = await JournalEntry.create({
//         companyId,
//         userId,
//         date: new Date(year, month - 1, 1),
//         description: `Depreciation ${month}/${year} - ${asset.name}`,
//         reference: asset.assetCode,
//         source: "depreciation",
//         sourceId: asset._id,
//         totalDebitLAK: amount,
//         totalCreditLAK: amount,
//         status: "posted",
//         lines,
//       });

//       await DepreciationLedger.create({
//         assetId: asset._id,
//         companyId,
//         year,
//         month,
//         depreciationAmount: amount,
//         journalEntryId: journal._id,
//         postedBy: userId,
//       });

//       asset.accumulatedDepreciation = postedAccumulated + amount;
//       asset.netBookValue = asset.cost - asset.accumulatedDepreciation;
//       await asset.save();

//       return res.json({ success: true });
//     }

//     /* ================= 5. Event: SALE / DISPOSAL ================= */
//     /* ================= 5. Event: SALE / DISPOSAL ================= */
//     if (["sale", "disposal"].includes(type)) {
//       const event = new Date(eventDate);
//       const eventYear = event.getFullYear();
//       const eventMonth = event.getMonth() + 1;

//       if (
//         lastPosted &&
//         !isAfter(eventYear, eventMonth, lastPosted.year, lastPosted.month)
//       ) {
//         return res
//           .status(400)
//           .json({ message: "Event must be after last depreciation" });
//       }

//       /* ===== 5.1 Post missing depreciation until event month ===== */
//       let accumulated = postedAccumulated;
//       let startYear = lastPosted
//         ? lastPosted.year
//         : asset.purchaseDate.getFullYear();
//       let startMonth = lastPosted
//         ? lastPosted.month + 1
//         : asset.purchaseDate.getMonth() + 1;

//       while (
//         startYear < eventYear ||
//         (startYear === eventYear && startMonth <= eventMonth)
//       ) {
//         const depAmount = Math.min(
//           calcMonthlyDepreciationDaily({
//             asset,
//             year: startYear,
//             month: startMonth,
//             soldDate: event,
//           }),
//           asset.cost - accumulated
//         );
//         if (depAmount > 0) {
//           accumulated += depAmount;

//           const depLines = [
//             buildJournalLine({
//               accountId: asset.depreciationExpenseAccountId,
//               debit: depAmount,
//             }),
//             buildJournalLine({
//               accountId: asset.accumulatedDepreciationAccountId,
//               credit: depAmount,
//             }),
//           ];

//           const depJournal = await JournalEntry.create({
//             companyId,
//             userId,
//             date: new Date(startYear, startMonth - 1, 1),
//             description: `Depreciation ${startMonth}/${startYear} - ${asset.name}`,
//             reference: asset.assetCode,
//             source: "depreciation",
//             sourceId: asset._id,
//             totalDebitLAK: depAmount,
//             totalCreditLAK: depAmount,
//             status: "posted",
//             lines: depLines,
//           });

//           await DepreciationLedger.create({
//             assetId: asset._id,
//             companyId,
//             year: startYear,
//             month: startMonth,
//             depreciationAmount: depAmount,
//             journalEntryId: depJournal._id,
//             postedBy: userId,
//           });
//         }

//         startMonth++;
//         if (startMonth > 12) {
//           startMonth = 1;
//           startYear++;
//         }
//       }

//       /* ===== 5.2 Prepare journal for SALE / DISPOSAL ===== */
//       let journalLines = [];
//       const netBookValue = asset.cost - accumulated;

//       if (type === "sale") {
//         const proceeds = Number(saleAmount || 0);
//         const gainLoss = proceeds - netBookValue;

//         journalLines.push(
//           buildJournalLine({ accountId: asset.getMoneyId, debit: proceeds })
//         );
//         journalLines.push(
//           buildJournalLine({
//             accountId: asset.assetAccountId,
//             credit: netBookValue,
//           })
//         );

//         if (gainLoss > 0) {
//           journalLines.push(
//             buildJournalLine({
//               accountId: asset.incomeAssetId,
//               credit: gainLoss,
//             })
//           );
//         } else if (gainLoss < 0) {
//           journalLines.push(
//             buildJournalLine({
//               accountId: asset.expenseId,
//               debit: Math.abs(gainLoss),
//             })
//           );
//         }
//       }

//       if (type === "disposal") {
//         journalLines.push(
//           buildJournalLine({
//             accountId: asset.accumulatedDepreciationAccountId,
//             debit: accumulated,
//           })
//         );
//         journalLines.push(
//           buildJournalLine({
//             accountId: asset.assetAccountId,
//             credit: asset.cost,
//           })
//         );
//         const loss = asset.cost - accumulated;
//         if (loss > 0) {
//           journalLines.push(
//             buildJournalLine({ accountId: asset.expenseId, debit: loss })
//           );
//         }
//       }

//       await JournalEntry.create({
//         companyId,
//         userId,
//         date: event,
//         description: `Asset ${type} - ${asset.name}`,
//         reference: asset.assetCode,
//         source: type === "disposal" ? "asset_disposal" : "asset_sale",
//         sourceId: asset._id,
//         totalDebitLAK: journalLines.reduce((s, l) => s + l.debitLAK, 0),
//         totalCreditLAK: journalLines.reduce((s, l) => s + l.creditLAK, 0),
//         lines: journalLines,
//         status: "posted",
//       });

//       /* ===== 5.3 Update Asset ===== */
//       asset.status = type === "sale" ? "sold" : "disposal";
//       asset.soldDate = event;
//       asset.accumulatedDepreciation = accumulated;
//       asset.netBookValue = 0;
//       await asset.save();

//       return res.json({
//         success: true,
//         assetId: asset._id,
//         proceeds: type === "sale" ? saleAmount : 0,
//         accumulated,
//         netBookValue,
//       });
//     }

//     return res.status(400).json({ message: "Invalid type" });
//   } catch (err) {
//     console.error(err);
//     return res
//       .status(500)
//       .json({ message: "Post depreciation failed", error: err.message });
//   }
// }

// ////rollback
// export async function rollbackFixedAsset(req, res) {
//   const session = await mongoose.startSession();

//   const JOURNAL_SOURCE = {
//     DEPRECIATION: "depreciation",
//     ASSET_SALE: "asset_sale",
//     ASSET_DISPOSAL_DEP: "asset_disposal_depreciation",
//     BUY_FIXED_ASSET: "buyFixedAsset",
//     DISPOSAL: "asset_disposal",
//   };

//   try {
//     session.startTransaction();

//     const { id: assetId } = req.params;
//     const { deleteAsset = false } = req.body;
//     const companyId = req.user.companyId;
//     const userId = req.user._id;

//     /* ================= 1. Load Asset ================= */
//     const asset = await FixedAsset.findOne({
//       _id: assetId,
//       companyId,
//     }).session(session);

//     if (!asset) {
//       throw new Error("Asset not found");
//     }

//     /* ================= 2. Lock Closed Period ================= */
//     const periodToCheck = asset.soldDate || asset.purchaseDate;

//     if (periodToCheck) {
//       const year = periodToCheck.getFullYear();
//       const month = periodToCheck.getMonth() + 1;

//       const closedPeriod = await accountingPeriod
//         .findOne({
//           companyId,
//           year,
//           isClosed: true,
//         })
//         .session(session);

//       if (closedPeriod) {
//         throw new Error(`Cannot rollback asset in closed period ${year}`);
//       }
//     }

//     /* ================= 3. Snapshot Before ================= */
//     const assetBefore = asset.toObject();

//     /* ================= 4. Delete Depreciation Ledgers ================= */
//     const depResult = await DepreciationLedger.deleteMany(
//       { assetId: asset._id, companyId },
//       { session }
//     );

//     /* ================= 5. Delete Journal Entries ================= */
//     const journalSourcesToDelete = [
//       JOURNAL_SOURCE.DEPRECIATION,
//       JOURNAL_SOURCE.ASSET_SALE,
//       JOURNAL_SOURCE.ASSET_DISPOSAL_DEP,
//       JOURNAL_SOURCE.DISPOSAL,
//     ];

//     if (!deleteAsset) {
//       const buyJournalExists = await JournalEntry.exists({
//         companyId,
//         sourceId: asset._id,
//         source: "buyFixedAsset",
//       }).session(session);

//       if (!buyJournalExists) {
//         throw new Error(
//           "BUY journal missing. Rollback aborted to prevent accounting corruption."
//         );
//       }
//     }

//     /* ================= Delete Journal Entries ================= */
//     let assetAfter = null;
//     let journalResult;

//     if (deleteAsset === true) {
//       // 🔥 DELETE ALL (including buyFixedAsset)
//       journalResult = await JournalEntry.deleteMany(
//         {
//           companyId,
//           sourceId: asset._id,
//           source: {
//             $in: [
//               "depreciation",
//               "asset_sale",
//               "asset_disposal_depreciation",
//               "buyFixedAsset",
//             ],
//           },
//         },
//         { session }
//       );
//     } else {
//       // 🔒 DELETE ONLY depreciation & sale
//       journalResult = await JournalEntry.deleteMany(
//         {
//           companyId,
//           sourceId: asset._id,
//           source: {
//             $in: [
//               "depreciation",
//               "asset_sale",
//               "asset_disposal_depreciation",
//               "asset_disposal",
//             ],
//           },
//         },
//         { session }
//       );
//       asset.accumulatedDepreciation = 0;
//       asset.netBookValue = asset.cost;
//       asset.status = "active";

//       asset.soldDate = null;
//       asset.saleAmount = null;
//       asset.tradeValue = null;
//       asset.gainLoss = 0;
//       asset.disposalType = null;

//       await asset.save({ session });
//       assetAfter = asset.toObject();
//     }

//     /* ================= 7. Audit Log ================= */
//     // await .create(
//     //   [
//     //     {
//     //       companyId,
//     //       userId,
//     //       action: deleteAsset
//     //         ? "ROLLBACK_DELETE_FIXED_ASSET"
//     //         : "ROLLBACK_FIXED_ASSET",
//     //       refType: "FixedAsset",
//     //       refId: asset._id,
//     //       before: assetBefore,
//     //       after: assetAfter,
//     //       createdAt: new Date(),
//     //     },
//     //   ],
//     //   { session }
//     // );

//     /* ================= 8. Commit ================= */
//     await session.commitTransaction();

//     res.json({
//       success: true,
//       assetId,
//       assetDeleted: deleteAsset,
//       deleted: {
//         depreciationLedgers: depResult.deletedCount,
//         journalEntries: journalResult.deletedCount,
//       },
//     });
//   } catch (err) {
//     await session.abortTransaction();

//     console.error("Rollback Fixed Asset Error:", err);

//     res.status(err.message?.includes("closed period") ? 400 : 500).json({
//       success: false,
//       message: err.message || "Rollback fixed asset failed",
//     });
//   } finally {
//     session.endSession();
//   }
// }

// export async function previewDepreciation(req, res) {
//   try {
//     const { id } = req.params;
//     const companyId = req.user.companyId;

//     /* ================= 1. Load asset ================= */
//     const asset = await FixedAsset.findOne({
//       _id: id,
//       companyId,
//     });

//     if (!asset) {
//       return res.status(404).json({ message: "Asset not found" });
//     }

//     /* ================= 2. Calc base monthly depreciation ================= */
//     const baseMonthly = calcMonthlyDepreciation({
//       cost: asset.cost,
//       salvageValue: asset.salvageValue || 0,
//       usefulLifeYears: asset.usefulLife,
//     });

//     /* ================= 3. Build depreciation schedule ================= */
//     const schedule = buildDepreciationScheduleV2({
//       startUseDate: asset.startUseDate,
//       usefulLifeYears: asset.usefulLife,
//       soldDate: asset.soldDate,
//     });
//     /* ================= 4. Load posted depreciation ledgers ================= */
//     const ledgers = await DepreciationLedger.find({
//       assetId: asset._id,
//       companyId,
//     });

//     const postedMap = new Map(ledgers.map((l) => [`${l.year}-${l.month}`, l]));

//     /* ================= 5. Load accounting periods (only needed months) ================= */
//     const years = [...new Set(schedule.map((s) => s.year))];

//     const periods = await AccountingPeriod.find({
//       companyId,
//       year: { $in: years },
//     });

//     const periodMap = new Map(periods.map((p) => [`${p.year}-${p.month}`, p]));

//     /* ================= 6. Preview calculation ================= */
//     const depreciableBase = asset.cost - (asset.salvageValue || 0);
//     const postedAccumulated = ledgers.reduce(
//       (sum, l) => sum + l.depreciationAmount,
//       0
//     );

//     let previewAccumulated = postedAccumulated;

//     let result = schedule.map((m) => {
//       const key = `${m.year}-${m.month}`;
//       const posted = postedMap.get(key);
//       const period = periodMap.get(key);

//       let amount = 0;
//       let status = "open";
//       let alert = null;

//       /* ===== already posted ===== */
//       if (posted) {
//         amount = posted.depreciationAmount;
//         status = "posted";
//         alert = "Depreciation already posted";
//         previewAccumulated += amount;
//       } else {
//         /* ===== preview only ===== */
//         const perDay = baseMonthly / m.daysInMonth;
//         amount = perDay * m.usedDays;

//         // 🔒 do not exceed depreciable base
//         if (previewAccumulated + amount > depreciableBase) {
//           amount = Math.max(depreciableBase - previewAccumulated, 0);
//         }

//         previewAccumulated += amount;

//         if (period?.isClosed) {
//           status = "closed";
//           alert = "Accounting period is closed";
//         }
//       }

//       return {
//         year: m.year,
//         month: m.month,
//         type: m.type, // first / full / last
//         usedDays: m.usedDays,
//         daysInMonth: m.daysInMonth,
//         factor: Number(m.factor.toFixed(4)),
//         amount: Number(amount.toFixed(2)),
//         status,
//         alert,
//       };
//     });

//     /* ================= 7. If asset sold → show only posted ================= */
//     if (asset.status === "sold") {
//       result = result.filter((r) => r.status === "posted");
//     }

//     /* ================= 8. Load journals (read-only) ================= */
//     const journal = await journalEntry_models
//       .find({
//         sourceId: id,
//       })
//       .populate("lines.accountId", "code name")
//       .select("-status_close -userId -companyId");

//     /* ================= 9. Response ================= */
//     res.json({
//       success: true,
//       asset: {
//         id: asset._id,
//         assetCode: asset.assetCode,
//         name: asset.assetName,
//         cost: asset.cost,
//         salvageValue: asset.salvageValue || 0,
//         postedAccumulated: Number(postedAccumulated.toFixed(2)),
//         previewAccumulated: Number(previewAccumulated.toFixed(2)),
//         remainingValue: Number(
//           Math.max(depreciableBase - previewAccumulated, 0).toFixed(2)
//         ),
//       },
//       baseMonthly: Number(baseMonthly.toFixed(2)),
//       schedule: result,
//       journal,
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({
//       message: "Preview depreciation failed",
//       error: err.message,
//     });
//   }
// }

// //depreiation
// export const depreiation = async (req, res) => {
//   try {
//     const { companyId } = req.user;
//     const { id } = req.params;

//     if (!companyId) {
//       return res.status(400).json({
//         success: false,
//         message: "Do not access !!",
//       });
//     }

//     const det = await DepreciationLedger.find({
//       assetId: id,
//       companyId,
//     });

//     const totalAmounts = det.reduce(
//       (sum, row) => sum + (row.depreciationAmount || 0),
//       0
//     );

//     res.json({
//       success: true,
//       data: det,
//       totalAmounts,
//     });
//   } catch (error) {
//     console.error(error.message);
//     res.status(500).json({
//       success: false,
//       message: "Depreciation failed",
//     });
//   }
// };
