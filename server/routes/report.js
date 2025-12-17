import Transaction from "../models/IncomeExpense.js";
import OPO from "../models/OPO.js";
import Debt from "../models/Debt.js";
import { authenticate } from "../middleware/auth.js";

import express from "express";
const router = express.Router();

// Generate comprehensive report
router.get("/", authenticate, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      type,
      paymentMethod,
      currency,
      searchText,
      status,
    } = req.query;

    /* ---------------- Pagination ---------------- */
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;

    /* ---------------- Date Filter (shared) ---------------- */
    const dateFilter = { companyId: req.user.companyId };
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) {
        const d = new Date(endDate);
        d.setHours(23, 59, 59, 999);
        dateFilter.date.$lte = d;
      }
    }

    /* ======================================================
       1) TRANSACTIONS (income / expense) - paginated
    ====================================================== */
    let transQuery = {
      ...dateFilter,
      status_Ap: { $ne: "cancel" },
    };

    if (type === "income" || type === "expense") transQuery.type = type;
    if (paymentMethod) transQuery.paymentMethod = paymentMethod;
    if (searchText) {
      transQuery.$or = [
        { serial: { $regex: searchText, $options: "i" } },
        { description: { $regex: searchText, $options: "i" } },
        { note: { $regex: searchText, $options: "i" } },
      ];
    }

    const [transactions, transCount] = await Promise.all([
      !type || type === "income" || type === "expense"
        ? Transaction.find(transQuery)
            .sort({ date: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("categoryId")
            .lean()
        : Promise.resolve([]),

      !type || type === "income" || type === "expense"
        ? Transaction.countDocuments(transQuery)
        : Promise.resolve(0),
    ]);

    /* ======================================================
       2) DEBTS (receivable / payable) - paginated
    ====================================================== */
    let debtQuery = { ...dateFilter };

    if (type === "receivable") debtQuery.debtType = "receivable";
    if (type === "payable") debtQuery.debtType = "payable";
    if (paymentMethod) debtQuery.paymentMethod = paymentMethod;
    if (status) debtQuery.status = { $regex: status, $options: "i" };
    if (searchText) {
      debtQuery.$or = [
        { serial: { $regex: searchText, $options: "i" } },
        { description: { $regex: searchText, $options: "i" } },
        { note: { $regex: searchText, $options: "i" } },
      ];
    }

    const [debts, debtCount] = await Promise.all([
      !type || type === "receivable" || type === "payable"
        ? Debt.find(debtQuery)
            .sort({ date: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("categoryId")
            .lean()
        : Promise.resolve([]),

      !type || type === "receivable" || type === "payable"
        ? Debt.countDocuments(debtQuery)
        : Promise.resolve(0),
    ]);

    /* ======================================================
       3) OPO - paginated
    ====================================================== */
    let opoQuery = {
      ...dateFilter,
      status: { $ne: "CANCELLED" },
    };

    if (status) opoQuery.status = status.toUpperCase();
    if (searchText) {
      opoQuery.$or = [
        { serial: { $regex: searchText, $options: "i" } },
        { requester: { $regex: searchText, $options: "i" } },
        { manager: { $regex: searchText, $options: "i" } },
        { "items.description": { $regex: searchText, $options: "i" } },
      ];
    }

    const [opos, opoCount] = await Promise.all([
      !type || type === "OPO"
        ? OPO.find(opoQuery)
            .sort({ date: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean()
        : Promise.resolve([]),

      !type || type === "OPO"
        ? OPO.countDocuments(opoQuery)
        : Promise.resolve(0),
    ]);

    /* ======================================================
       4) Merge paginated DATA (for table)
    ====================================================== */
    const data = [];

    transactions.forEach((t) => {
      data.push({
        _id: `trans_${t._id}`,
        sourceType: t.type === "income" ? "ລາຍຮັບ" : "ລາຍຈ່າຍ",
        serial: t.serial,
        date: t.date,
        type: t.type,
        categoryId: t.categoryId,
        paymentMethod: t.paymentMethod,
        listAmount: t.amounts,
        status: t.status,
        status_Ap: t.status_Ap,
        notes: t.note,
      });
    });

    debts.forEach((d) => {
      data.push({
        _id: `debt_${d._id}`,
        sourceType: d.debtType === "receivable" ? "ໜີ້ຕ້ອງຮັບ" : "ໜີ້ຕ້ອງສົ່ງ",
        serial: d.serial,
        date: d.date,
        type: d.debtType,
        categoryId: d.categoryId,
        paymentMethod: d.paymentMethod,
        listAmount: d.amounts,
        status: d.status,
        installments: d.installments,
      });
    });

    opos.forEach((o) => {
      data.push({
        _id: `opo_${o._id}`,
        sourceType: "OPO",
        serial: o.serial,
        date: o.date,
        type: "OPO",
        listAmount: o.items,
        status: o.status,
        status_Ap: o.status_Ap,
      });
    });

    /* ======================================================
       5) SUMMARY (non-paginated, correct for dashboard)
       ใช้ aggregate (เร็ว)
    ====================================================== */
    const summary = {
      byCurrency: {},
      totalRecords: transCount + debtCount + opoCount,
    };

    const transAgg = await Transaction.aggregate([
      { $match: transQuery },
      { $unwind: "$amounts" },
      {
        $group: {
          _id: "$amounts.currency",
          income: {
            $sum: {
              $cond: [{ $eq: ["$type", "income"] }, "$amounts.amount", 0],
            },
          },
          expense: {
            $sum: {
              $cond: [{ $eq: ["$type", "expense"] }, "$amounts.amount", 0],
            },
          },
          total: { $sum: "$amounts.amount" },
        },
      },
    ]);

    transAgg.forEach((r) => {
      summary.byCurrency[r._id] = {
        income: r.income,
        expense: r.expense,
        total: r.total,
      };
    });

    /* ======================================================
       6) RESPONSE
    ====================================================== */
    const totalPages = Math.ceil(summary.totalRecords / limit);

    res.json({
      success: true,
      data,
      summary,
      pagination: {
        page,
        limit,
        totalRecords: summary.totalRecords,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Report error:", error);
    res.status(500).json({
      success: false,
      message: "ເກີດຂໍ້ຜິດພາດ",
      error: error.message,
    });
  }
});

// ============================================
// GET /api/reports/summary -
// ============================================
router.get("/summary", authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    /* ---------------- Date + Company Filter ---------------- */
    const dateFilter = { companyId: req.user.companyId };

    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) {
        const d = new Date(endDate);
        d.setHours(23, 59, 59, 999);
        dateFilter.date.$lte = d;
      }
    }

    /* ---------------- Counts (fast) ---------------- */
    const [opoCount, transCount, debtCount] = await Promise.all([
      OPO.countDocuments({
        ...dateFilter,
        status: { $ne: "CANCELLED" },
      }),
      Transaction.countDocuments({
        ...dateFilter,
        status_Ap: { $ne: "cancel" },
      }),
      Debt.countDocuments(dateFilter),
    ]);

    /* ---------------- Income / Expense by Currency ---------------- */
    const transactionSummary = await Transaction.aggregate([
      {
        $match: {
          ...dateFilter,
          status_Ap: { $ne: "cancel" },
          type: { $in: ["income", "expense"] },
        },
      },
      { $unwind: "$amounts" },
      {
        $group: {
          _id: {
            currency: "$amounts.currency",
            type: "$type",
          },
          total: { $sum: "$amounts.amount" },
        },
      },
    ]);

    /* ---------------- Normalize result ---------------- */
    const income = {};
    const expense = {};

    transactionSummary.forEach((row) => {
      const cur = row._id.currency || "N/A";
      if (row._id.type === "income") {
        income[cur] = (income[cur] || 0) + row.total;
      } else if (row._id.type === "expense") {
        expense[cur] = (expense[cur] || 0) + row.total;
      }
    });

    /* ---------------- Response ---------------- */
    res.json({
      success: true,
      summary: {
        totalOPO: opoCount,
        totalTransactions: transCount,
        totalDebts: debtCount,
        income,
        expense,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting summary:", error);
    res.status(500).json({
      success: false,
      message: "ເກີດຂໍ້ຜິດພາດ",
      error: error.message,
    });
  }
});

export default router;
