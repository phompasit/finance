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

export async function postDepreciationForAsset(req, res) {
  try {
    const { id: assetId } = req.params;
    const { type, year, month, saleAmount, tradeValue } = req.body;
    const companyId = req.user.companyId;
    const userId = req.user._id;

    /* ================= 1. Load asset ================= */
    const asset = await FixedAsset.findOne({ _id: assetId, companyId });
    if (!asset) return res.status(404).json({ message: "Asset not found" });

    if (asset.status !== "active")
      return res.status(400).json({ message: "Asset is not active" });

    /* ================= 2. Last depreciation ================= */
    const lastPosted = await DepreciationLedger.findOne({
      assetId: asset._id,
    }).sort({ year: -1, month: -1 });

    let accumulated = asset.accumulatedDepreciation || 0;
    const depreciableBase = asset.cost;
    // - asset.salvageValue;

    const isEvent = ["sale", "trade", "disposal"].includes(type);

    /* ================= 3. NORMAL : ตัดต่อ ================= */
    if (!isEvent) {
      // ห้ามตัดก่อนเริ่มใช้
      const sy = asset.startUseDate.getFullYear();
      const sm = asset.startUseDate.getMonth() + 1;

      if (year < sy || (year === sy && month < sm)) {
        return res.status(400).json({
          message: "Cannot depreciate before start use date",
        });
      }

      // ห้ามตัดซ้ำ
      if (
        lastPosted &&
        !isAfter(year, month, lastPosted.year, lastPosted.month)
      ) {
        return res.status(400).json({
          message: "This period already depreciated",
        });
      }

      let amount = calcMonthlyDepreciationDaily({
        asset,
        year,
        month,
      });
      amount = Math.min(amount, depreciableBase - accumulated);
      if (amount <= 0) {
        return res.status(400).json({
          message: "Asset fully depreciated",
        });
      }

      accumulated += amount;

      // TODO: Journal + Ledger
      const currency = "LAK";
      const exchangeRate = 1;
      const amountLAK = amount; // amount คือค่าที่คำนวณมา
      // ================= CREATE JOURNAL =================
      const journal = await JournalEntry.create({
        companyId,
        userId: req.user._id,
        date: new Date(year, month, 0),
        description: `Depreciation ${month}/${year} - ${asset.name}`,
        reference: asset.assetCode,
        source: "depreciation",
        sourceId: asset._id,
        createdBy: userId,
        totalDebitLAK: amountLAK,
        totalCreditLAK: amountLAK,
        lines: [
          //     // ================= DR Depreciation Expense =================
          {
            accountId: asset.depreciationExpenseAccountId,

            currency,
            exchangeRate,

            debitOriginal: amountLAK,
            creditOriginal: 0,

            debitLAK: amountLAK,
            creditLAK: 0,

            amountLAK: amountLAK,
            side: "dr",
          },

          //     // ================= CR Accumulated Depreciation =================
          {
            accountId: asset.accumulatedDepreciationAccountId,

            currency,
            exchangeRate,

            debitOriginal: 0,
            creditOriginal: amountLAK,

            debitLAK: 0,
            creditLAK: amountLAK,

            amountLAK: amountLAK,
            side: "cr",
          },
        ],
      });
      const exists = await DepreciationLedger.findOne({
        assetId: asset._id,
        year: year,
        month: month,
      });

      if (exists) {
        cursor.setMonth(cursor.getMonth() + 1);
      }
      // ================= CREATE LEDGER =================
      await DepreciationLedger.create({
        assetId: asset._id,
        companyId,
        year: year,
        month: month,
        depreciationAmount: amount,
        journalEntryId: journal._id,
        postedBy: userId,
      });
    }

    /* ================= 4. EVENT : ขาย / ทิ้ง ================= */
    let proceeds = 0;
    let eventDate = null;

    if (isEvent) {
      if (type === "sale") proceeds = Number(saleAmount || 0);
      if (type === "trade") proceeds = Number(tradeValue || 0);

      eventDate = new Date(year, month, 0);

      // เริ่มไล่ตั้งแต่เดือนเริ่มใช้ หรือ เดือนถัดจาก lastPosted
      let cursor = new Date(asset.startUseDate);

      if (lastPosted) {
        cursor = new Date(lastPosted.year, lastPosted.month - 1, 1);
        cursor.setMonth(cursor.getMonth() + 1);
      }
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
    }

    /* ================= 5. NBV & Gain/Loss ================= */
    const netBookValue = asset.cost - accumulated;

    let gainLoss = 0;
    if (type === "sale" || type === "trade") {
      gainLoss = proceeds - netBookValue;
    }
    if (type === "disposal") {
      gainLoss = -netBookValue;
    }

    /* ================= 6. Update asset ================= */
    asset.status = type === "sale" ? "sold" : isEvent ? "disposed" : "active";
    asset.soldDate = isEvent ? eventDate : null;
    asset.accumulatedDepreciation = accumulated;
    asset.netBookValue = isEvent ? 0 : netBookValue;

    // await asset.save();
    console.log({
      success: true,
      assetId: asset._id,
      type: type || "depreciation",
      period: `${year}-${month}`,
      accumulated,
      netBookValue,
      proceeds,
      gainLoss,
    });
    res.json({
      success: true,
      assetId: asset._id,
      type: type || "depreciation",
      period: `${year}-${month}`,
      accumulated,
      netBookValue,
      proceeds,
      gainLoss,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Post depreciation failed",
      error: err.message,
    });
  }
}

// // 🧾 create journal
// const journal = await JournalEntry.create({
//   companyId,
//   date: new Date(year, month - 1, 1),
//   description: `Depreciation ${month}/${year} - ${asset.assetName}`,
//   reference: asset.assetCode,
//   lines: [
//     {
//       accountId: asset.depreciationExpenseAccountId,
//       debit: monthlyDep,
//       credit: 0,
//     },
//     {
//       accountId: asset.accumulatedDepreciationAccountId,
//       debit: 0,
//       credit: monthlyDep,
//     },
//   ],
//   source: "depreciation",
//   sourceId: asset._id,
//   createdBy: userId,
// });

// await DepreciationLedger.create({
//   assetId: asset._id,
//   companyId,
//   year,
//   month,
//   depreciationAmount: monthlyDep,
//   journalEntryId: journal._id,
//   postedBy: userId,
// });

// // 🔒 update asset
// asset.accumulatedDepreciation += monthlyDep;
// asset.lastDepreciationPostedAt = `${year}-${month}`;
// await asset.save();

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
