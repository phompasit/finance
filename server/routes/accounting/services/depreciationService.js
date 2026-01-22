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
export async function postDepreciationForAsset(req, res) {
  try {
    const { id: assetId } = req.params;
    const { type, year, month, saleAmount, tradeValue } = req.body;
    const companyId = req.user.companyId;
    const userId = req.user._id;

    /* ================= 1. Load asset ================= */
    const asset = await FixedAsset.findOne({ _id: assetId, companyId });
    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    if (asset.status !== "active") {
      return res.status(400).json({ message: "Asset is not active" });
    }

    /* ================= 2. Last depreciation ================= */
    const lastPosted = await DepreciationLedger.findOne({
      assetId: asset._id,
    }).sort({ year: -1, month: -1 });

    let accumulated = asset.accumulatedDepreciation || 0;
    const depreciableBase = asset.cost;
    const isEvent = ["sale", "trade", "disposal"].includes(type);

    /* ================= 3. NORMAL DEPRECIATION ================= */
    if (!isEvent) {
      const sy = asset.startUseDate.getFullYear();
      const sm = asset.startUseDate.getMonth() + 1;

      if (year < sy || (year === sy && month < sm)) {
        return res
          .status(400)
          .json({ message: "Cannot depreciate before start use date" });
      }

      if (
        lastPosted &&
        !isAfter(year, month, lastPosted.year, lastPosted.month)
      ) {
        return res
          .status(400)
          .json({ message: "This period already depreciated" });
      }

      let amount = calcMonthlyDepreciationDaily({ asset, year, month });
      amount = Math.min(amount, depreciableBase - accumulated);

      if (amount <= 0) {
        return res.status(400).json({ message: "Asset fully depreciated" });
      }

      accumulated += amount;

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

      const journal = await JournalEntry.create({
        companyId,
        userId,
        date: new Date(year, month, 0),
        description: `Depreciation ${month}/${year} - ${asset.name}`,
        reference: asset.assetCode,
        source: "depreciation",
        sourceId: asset._id,
        totalDebitLAK: amount,
        totalCreditLAK: amount,
        lines,
      });
      await DepreciationLedger.create({
        assetId: asset._id,
        companyId,
        year,
        month,
        depreciationAmount: amount,
        journalEntryId: journal._id,
        postedBy: userId,
      });

      asset.accumulatedDepreciation = accumulated;
      asset.netBookValue = asset.cost - accumulated;
      await asset.save();

      return res.json({ success: true });
    }

    /* ================= 4. EVENT : SALE / DISPOSAL ================= */
    let proceeds = 0;
    if (type === "sale") proceeds = Number(saleAmount || 0);
    if (type === "trade") proceeds = Number(tradeValue || 0);

    const eventDate = new Date(year, month, 0);

    let cursor = lastPosted
      ? new Date(lastPosted.year, lastPosted.month - 1, 1)
      : new Date(asset.startUseDate);

    if (lastPosted) cursor.setMonth(cursor.getMonth() + 1);

    while (cursor <= eventDate) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth() + 1;

      let amount = calcMonthlyDepreciationDaily({
        asset,
        year: y,
        month: m,
        soldDate: eventDate,
      });

      amount = Math.min(amount, depreciableBase - accumulated);
      if (amount <= 0) break;

      accumulated += amount;
      cursor.setMonth(cursor.getMonth() + 1);
    }

    /* ================= 5. FINAL DEPRECIATION JOURNAL ================= */
    const addedDepreciation =
      accumulated - (asset.accumulatedDepreciation || 0);

    if (addedDepreciation > 0) {
      const depLines = [
        buildJournalLine({
          accountId: asset.depreciationExpenseAccountId,
          debit: addedDepreciation,
        }),
        buildJournalLine({
          accountId: asset.accumulatedDepreciationAccountId,
          credit: addedDepreciation,
        }),
      ];
      console.log({
        companyId,
        userId,
        date: eventDate,
        description: `Depreciation until disposal - ${asset.name}`,
        reference: asset.assetCode,
        source: "asset_disposal_depreciation",
        sourceId: asset._id,
        totalDebitLAK: addedDepreciation,
        totalCreditLAK: addedDepreciation,
        lines: depLines,
      });
      const j = await JournalEntry.create({
        companyId,
        userId,
        date: eventDate,
        description: `Depreciation until disposal - ${asset.name}`,
        reference: asset.assetCode,
        source: "asset_disposal_depreciation",
        sourceId: asset._id,
        totalDebitLAK: addedDepreciation,
        totalCreditLAK: addedDepreciation,
        lines: depLines,
      });

      await DepreciationLedger.create({
        assetId: asset._id,
        companyId,
        year,
        month,
        journalEntryId: j._id,
        depreciationAmount: addedDepreciation,
        postedBy: userId,
      });
    }

    /* ================= 6. NBV & GAIN / LOSS ================= */
    const netBookValue = asset.cost - accumulated;

    let gainLoss = 0;
    if (type === "sale" || type === "trade") {
      gainLoss = proceeds - netBookValue;
    }
    if (type === "disposal") {
      gainLoss = -netBookValue;
    }

    /* ================= 7. SALE JOURNAL ================= */
    const saleLines = [];

    if (proceeds > 0) {
      saleLines.push(
        buildJournalLine({
          accountId: asset.getMoneyId,
          debit: proceeds,
        })
      );
    }

    saleLines.push(
      buildJournalLine({
        accountId: asset.accumulatedDepreciationAccountId,
        debit: accumulated,
      })
    );

    saleLines.push(
      buildJournalLine({
        accountId: asset.assetAccountId,
        credit: asset.cost,
      })
    );

    if (gainLoss > 0) {
      saleLines.push(
        buildJournalLine({
          accountId: asset.incomeAssetId,
          credit: gainLoss,
        })
      );
    }

    if (gainLoss < 0) {
      saleLines.push(
        buildJournalLine({
          accountId: asset.expenseId,
          debit: Math.abs(gainLoss),
        })
      );
    }

    await JournalEntry.create({
      companyId,
      userId,
      date: eventDate,
      description: `Asset disposal (${type}) - ${asset.name}`,
      reference: asset.assetCode,
      source: "asset_sale",
      sourceId: asset._id,
      totalDebitLAK: saleLines.reduce((s, l) => s + l.debitLAK, 0),
      totalCreditLAK: saleLines.reduce((s, l) => s + l.creditLAK, 0),
      lines: saleLines,
    });

    /* ================= 8. UPDATE ASSET ================= */
    asset.status = type === "sale" ? "sold" : "disposed";
    asset.soldDate = eventDate;
    asset.accumulatedDepreciation = accumulated;
    asset.netBookValue = 0;
    await asset.save();

    res.json({
      success: true,
      assetId: asset._id,
      type,
      proceeds,
      accumulated,
      netBookValue,
      gainLoss,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Post depreciation failed",
      error: err.message,
    });
  }
}

////rollback
export async function rollbackFixedAsset(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id: assetId } = req.params;
    const { deleteAsset = false } = req.body;
    const companyId = req.user.companyId;

    /* ================= 1. Load Asset ================= */
    const asset = await FixedAsset.findOne({
      _id: assetId,
      companyId,
    }).session(session);

    if (!asset) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Asset not found" });
    }

    /* ================= 2. Delete Depreciation Ledgers ================= */
    const depResult = await DepreciationLedger.deleteMany(
      { assetId: asset._id, companyId },
      { session }
    );

    /* ================= 3. Delete Journal Entries ================= */
    const journalResult = await JournalEntry.deleteMany(
      {
        companyId,
        sourceId: asset._id,
        source: {
          $in: ["depreciation", "asset_sale", "asset_disposal_depreciation"],
        },
      },
      { session }
    );

    /* ================= 4. Reset or Delete Asset ================= */
    if (deleteAsset) {
      await FixedAsset.deleteOne({ _id: asset._id }, { session });
      await JournalEntry.findOne({
        sourceId: asset._id,
        source: {
          $in: ["buyFixedAsset"],
        },
      });
    } else {
      asset.accumulatedDepreciation = 0;
      asset.netBookValue = asset.cost;
      asset.status = "active";
      asset.soldDate = null;
      await asset.save({ session });
    }

    /* ================= 5. Commit ================= */
    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      assetId,
      deletedDepreciationLedgers: depResult.deletedCount,
      deletedJournalEntries: journalResult.deletedCount,
      assetDeleted: deleteAsset,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    console.error(err);
    res.status(500).json({
      message: "Rollback fixed asset failed",
      error: err.message,
    });
  }
}

export async function previewDepreciation(req, res) {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    /* ================= 1. Load asset ================= */
    const asset = await FixedAsset.findOne({
      _id: id,
      companyId,
    });

    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    /* ================= 2. Calc monthly ================= */
    const monthlyAmount = calcMonthlyDepreciation({
      cost: asset.cost,
      salvageValue: asset.salvageValue,
      usefulLifeYears: asset.usefulLife,
    });
    const baseMonthly = calcMonthlyDepreciation({
      cost: asset.cost,
      salvageValue: asset.salvageValue,
      usefulLifeYears: asset.usefulLife,
    });
    /* ================= 3. Build schedule ================= */
    const schedule = buildDepreciationScheduleV2({
      startUseDate: asset.startUseDate,
      usefulLifeYears: asset.usefulLife,
      soldDate: asset.soldDate,
    });

    /* ================= 4. Load posted ledger ================= */
    const ledgers = await DepreciationLedger.find({
      assetId: asset._id,
    });

    const postedMap = new Map(ledgers.map((l) => [`${l.year}-${l.month}`, l]));

    /* ================= 5. Load accounting periods ================= */
    const periods = await AccountingPeriod.find({ companyId });
    const periodMap = new Map(periods.map((p) => [`${p.year}-${p.month}`, p]));
    /* ================= 6. Merge result ================= */
    let accumulatedPreview = asset.accumulatedDepreciation || 0;
    const depreciableBase = asset.cost;

    const result = schedule.map((m) => {
      const monthInday = baseMonthly / m.daysInMonth;
      let amount = monthInday * m.usedDays;
      // 🔒 กันไม่ให้เกิน salvage value
      if (accumulatedPreview + amount > depreciableBase) {
        amount = depreciableBase - accumulatedPreview;
      }

      accumulatedPreview += amount;

      const key = `${m.year}-${m.month}`;
      const posted = postedMap.get(key);
      const period = periodMap.get(key);

      let status = "open";
      let alert = null;

      if (posted) {
        status = "posted";
        alert = "Depreciation already posted";
      } else if (period?.isClosed) {
        status = "closed";
        alert = "Accounting period is closed";
      }

      return {
        year: m.year,
        month: m.month,
        type: m.type, // first / full / last
        usedDays: m.usedDays,
        daysInMonth: m.daysInMonth,
        factor: Number(m.factor.toFixed(4)),
        amount: Number(amount.toFixed(2)),
        status,
        alert,
      };
    });
    const journal = await journalEntry_models
      .find({
        sourceId: id,
      })
      .populate("lines.accountId", "code name")
      .select("-status_close -userId -companyId");

    res.json({
      success: true,
      asset: {
        id: asset._id,
        assetCode: asset.assetCode,
        name: asset.assetName,
        accumulated: Number(accumulatedPreview.toFixed(2)), // 👈 ตรงนี้
      },
      journal,
      monthlyAmount,
      schedule: result,
    });
  } catch (err) {
    res.status(500).json({
      message: "Preview depreciation failed",
      error: err.message,
    });
  }
}
//depreiation
export const depreiation = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Do not access !!",
      });
    }

    const det = await DepreciationLedger.find({
      assetId: id,
      companyId,
    });

    const totalAmounts = det.reduce(
      (sum, row) => sum + (row.depreciationAmount || 0),
      0
    );

    res.json({
      success: true,
      data: det,
      totalAmounts,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: "Depreciation failed",
    });
  }
};
