import express from "express";
import mongoose from "mongoose";
import IncomeExpense from "../models/IncomeExpense.js";
import OPO from "../models/OPO.js";
import Debt from "../models/Debt.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

/* ======================================================
  HELPERS
====================================================== */
const buildDateQuery = (startDate, endDate) => {
  if (!startDate && !endDate) return {};
  return {
    date: {
      ...(startDate && { $gte: new Date(startDate) }),
      ...(endDate && { $lte: new Date(endDate) }),
    },
  };
};

const normalizeStatus = (s) => {
  if (!s) return s;
  if (["paid", "ຈ່າຍແລ້ວ"].includes(s)) return "paid";
  if (["pending", "ລໍຖ້າ"].includes(s)) return "pending";
  if (["unpaid", "ຍັງບໍ່ຈ່າຍ"].includes(s)) return "unpaid";
  return s;
};

/* ======================================================
  GET /api/reports
====================================================== */
router.get("/", authenticate, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      type,
      debtType,
      paymentMethod,
      currency,
      status,
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = Math.max(Number(page), 1);
    const limitNum = Math.min(Math.max(Number(limit), 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const dateQuery = buildDateQuery(startDate, endDate);
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const normalizedStatus = normalizeStatus(status);

    /* ===================== DEBT ===================== */
    const debts = await Debt.find({
      createdBy: userId,
      ...dateQuery,
      ...(debtType && { debtType }),
      ...(normalizedStatus && { status: normalizedStatus }),
    }).lean();

    /* ================= INCOME / EXPENSE ============== */
    const incomeExpenses = await IncomeExpense.find({
      createdBy: userId,
      ...dateQuery,
      ...(type && { type }),
      ...(paymentMethod && { paymentMethod }),
      ...(currency && { currency }),
      ...(normalizedStatus && { status: normalizedStatus }),
    }).lean();

    /* ======================= OPO ===================== */
    const opos = await OPO.find({
      createdBy: userId,
      ...dateQuery,
      ...(normalizedStatus && { status: normalizedStatus }),
    }).lean();

    /* ==================== NORMALIZE ================== */
    let records = [];

    // Debt
    debts.forEach((d) => {
      d.amounts?.forEach((a) => {
        if (currency && a.currency !== currency) return;
        if (paymentMethod && a.paymentMethod !== paymentMethod) return;

        records.push({
          date: d.date,
          documentNumber: d.documentNumber || d.debtNumber || "-",
          description:
            d.description || `ໜີ້${d.debtType === "payable" ? "ຈ່າຍ" : "ຮັບ"}`,
          type: d.debtType === "payable" ? "debt_payable" : "debt_receivable",
          amount: a.amount,
          currency: a.currency,
          paymentMethod: a.paymentMethod,
          status: normalizeStatus(d.status),
          source: "DEBT",
          note: d.note || "-",
        });
      });
    });

    // Income / Expense
    incomeExpenses.forEach((r) => {
      records.push({
        date: r.date,
        documentNumber: r.documentNumber || "-",
        description:
          r.description || (r.type === "income" ? "ລາຍຮັບ" : "ລາຍຈ່າຍ"),
        type: r.type,
        amount: r.amount,
        currency: r.currency,
        paymentMethod: r.paymentMethod,
        status: normalizeStatus(r.status),
        source: "INCOME_EXPENSE",
        note: r.note || "-",
      });
    });

    // OPO
    opos.forEach((o) => {
      const currencyMap = {};
      o.items?.forEach((i) => {
        currencyMap[i.currency] =
          (currencyMap[i.currency] || 0) + i.price * i.quantity;
      });

      Object.entries(currencyMap).forEach(([cur, amt]) => {
        if (currency && cur !== currency) return;

        records.push({
          date: o.date,
          documentNumber: o.opoNumber || "-",
          description: o.description || "OPO",
          type: "opo",
          amount: amt,
          currency: cur,
          paymentMethod: o.paymentMethod || "cash",
          status: normalizeStatus(o.status),
          source: "OPO",
          note: o.note || "-",
        });
      });
    });

    /* ===================== SORT ====================== */
    records.sort((a, b) => new Date(b.date) - new Date(a.date));

    /* ================= TOTAL BY CURRENCY ============== */
    const totalPerCurrency = {};
    records.forEach((r) => {
      if (!totalPerCurrency[r.currency]) {
        totalPerCurrency[r.currency] = {
          income: 0,
          expense: 0,
          debt_receivable: 0,
          debt_payable: 0,
          opo: 0,
          total: 0,
        };
      }
      const amt = Number(r.amount) || 0;
      totalPerCurrency[r.currency][r.type] += amt;
      totalPerCurrency[r.currency].total += amt;
    });

    /* ==================== PAGINATION ================= */
    const totalItems = records.length;
    const paginated = records.slice(skip, skip + limitNum);

    res.json({
      success: true,
      data: paginated,
      totalPerCurrency,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems,
        totalPages: Math.ceil(totalItems / limitNum),
      },
    });
  } catch (err) {
    console.error("REPORT ERROR:", err);
    res.status(500).json({
      success: false,
      message: "ບໍ່ສາມາດດຶງລາຍງານໄດ້",
    });
  }
});

/* ======================================================
  GET /api/reports/summary
====================================================== */
/* ======================================================
  GET /api/reports/ceo-summary
====================================================== */

const CURRENCIES = ["LAK", "THB", "USD", "CNY"];
const TYPES = ["income", "expense", "debt_receivable", "debt_payable", "opo"];

const emptyBucket = () => ({
  income: 0,
  expense: 0,
  debt_receivable: 0,
  debt_payable: 0,
  opo: 0,
});

router.get("/summary", authenticate, async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 20 } = req.query;

    const userId = new mongoose.Types.ObjectId(req.user._id);
    const dateQuery = buildDateQuery(startDate, endDate);

    const [incomes, debts, opos] = await Promise.all([
      IncomeExpense.find({ createdBy: userId, ...dateQuery }).lean(),
      Debt.find({ createdBy: userId, ...dateQuery }).lean(),
      OPO.find({ createdBy: userId, ...dateQuery }).lean(),
    ]);

    /* ================= INIT STRUCT ================= */
    const summary = {};
    const trend = {};
    CURRENCIES.forEach((c) => {
      summary[c] = {
        today: { ...emptyBucket(), net: 0 },
        yesterday: { ...emptyBucket(), net: 0 },
        changePercent: 0,
        status: { pending: 0, unpaid: 0, paid: 0 },
        totals: { ...emptyBucket(), transactions: 0 },
      };
      trend[c] = [];
    });

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const sameDay = (a, b) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    /* ================= INCOME / EXPENSE ================= */
    incomes.forEach((r) => {
      const c = r.currency;
      if (!summary[c]) return;
      const d = new Date(r.date);
      const amt = Number(r.amount);

      summary[c].totals[r.type] += amt;
      summary[c].totals.transactions++;

      if (sameDay(d, today)) summary[c].today[r.type] += amt;
      if (sameDay(d, yesterday)) summary[c].yesterday[r.type] += amt;

      summary[c].status[r.status] = (summary[c].status[r.status] || 0) + 1;

      const key = d.toISOString().slice(0, 10);
      let day = trend[c].find((x) => x.date === key);
      if (!day) {
        day = { date: key, income: 0, expense: 0 };
        trend[c].push(day);
      }
      if (r.type === "income") day.income += amt;
      if (r.type === "expense") day.expense += amt;
    });

    /* ================= DEBT ================= */
    debts.forEach((d) => {
      d.amounts?.forEach((a) => {
        const c = a.currency;
        if (!summary[c]) return;
        const amt = Number(a.amount);
        const type =
          d.debtType === "payable" ? "debt_payable" : "debt_receivable";

        summary[c].totals[type] += amt;
        summary[c].totals.transactions++;

        if (sameDay(new Date(d.date), today)) summary[c].today[type] += amt;
        if (sameDay(new Date(d.date), yesterday))
          summary[c].yesterday[type] += amt;

        summary[c].status[d.status] = (summary[c].status[d.status] || 0) + 1;
      });
    });

    /* ================= OPO ================= */
    opos.forEach((o) => {
      const map = {};
      o.items?.forEach((i) => {
        map[i.currency] = (map[i.currency] || 0) + i.price * i.quantity;
      });

      Object.entries(map).forEach(([c, amt]) => {
        if (!summary[c]) return;

        summary[c].totals.opo += amt;
        summary[c].totals.transactions++;

        if (sameDay(new Date(o.date), today)) summary[c].today.opo += amt;
        if (sameDay(new Date(o.date), yesterday))
          summary[c].yesterday.opo += amt;

        summary[c].status[o.status] = (summary[c].status[o.status] || 0) + 1;
      });
    });

    /* ================= NET + CHANGE ================= */
    CURRENCIES.forEach((c) => {
      const t = summary[c].today;
      const y = summary[c].yesterday;
      t.net = t.income - t.expense;
      y.net = y.income - y.expense;

      if (y.net !== 0) {
        summary[c].changePercent = ((t.net - y.net) / Math.abs(y.net)) * 100;
      }
    });

    res.json({
      success: true,
      summary,
      trend,
      table: {
        data: [], // ใช้ endpoint list แยก
        pagination: {},
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false });
  }
});
export default router;
