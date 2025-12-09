import express from "express";
import IncomeExpense from "../models/IncomeExpense.js";
import OPO from "../models/OPO.js";
import Debt from "../models/Debt.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// GET /api/reports
router.get("/", async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      debtType,
      type,
      paymentMethod,
      currency,
      status,
    } = req.query;

    // สร้าง query สำหรับ date range
    const dateQuery = {};
    if (startDate || endDate) {
      dateQuery.date = {};
      if (startDate) dateQuery.date.$gte = new Date(startDate);
      if (endDate) dateQuery.date.$lte = new Date(endDate);
    }

    // Query DEBT Collection
    let debtQuery = {
      ...dateQuery,
      createdBy: mongoose.Types.ObjectId(req.user._id),
    };
    if (debtType) debtQuery.debtType = debtType;
    if (status) debtQuery.status = status;

    const debts = await Debt.find(debtQuery).lean();

    // Query Income/Expense Collection
    let incomeExpenseQuery = { ...dateQuery };
    if (type) incomeExpenseQuery.type = type;
    if (paymentMethod) incomeExpenseQuery.paymentMethod = paymentMethod;
    if (currency) incomeExpenseQuery.currency = currency;
    if (status) incomeExpenseQuery.status = status;

    const incomeExpenses = await IncomeExpense.find(incomeExpenseQuery).lean();

    // Query OPO Collection
    let opoQuery = { ...dateQuery };
    if (status) opoQuery.status = status;

    const opos = await OPO.find(opoQuery).lean();

    // รวมข้อมูลทั้งหมด
    let allRecords = [];

    // แปลง DEBT records (แยกตาม amounts array)
    debts.forEach((debt) => {
      if (debt.amounts && debt.amounts.length > 0) {
        debt.amounts.forEach((amt) => {
          // ตรวจสอบ filter currency และ paymentMethod
          if (currency && amt.currency !== currency) return;
          if (paymentMethod && amt.paymentMethod !== paymentMethod) return;

          allRecords.push({
            date: debt.date,
            documentNumber: debt.documentNumber || debt.debtNumber || "-",
            description:
              debt.description ||
              `ໜີ້${debt.debtType === "payable" ? "ຈ່າຍ" : "ຮັບ"}`,
            type: debt.debtType === "payable" ? "ໜີ້ຈ່າຍ" : "ໜີ້ຮັບ",
            amount: amt.amount,
            currency: amt.currency,
            paymentMethod: amt.paymentMethod,
            status: debt.status,
            categoryId:debt.categoryId,
            note: debt.note || "-",
            source: "DEBT",
          });
        });
      }
    });

    // แปลง Income/Expense records
    incomeExpenses.forEach((record) => {
      allRecords.push({
        date: record.date,
        documentNumber: record.documentNumber || "-",
        description:
          record.description ||
          (record.type === "income" ? "ລາຍຮັບ" : "ລາຍຈ່າຍ"),
        type: record.type === "income" ? "ລາຍຮັບ" : "ລາຍຈ່າຍ",
        amount: record.amount,
        currency: record.currency,
        paymentMethod: record.paymentMethod,
        status: record.status,
        note: record.note || "-",
        categoryId:record.categoryId,
        source: "INCOME_EXPENSE",
      });
    });

    // แปลง OPO records (แยกตาม items array)
    opos.forEach((opo) => {
      if (opo.items && opo.items.length > 0) {
        // Group items by currency
        const currencyGroups = {};

        opo.items.forEach((item) => {
          if (!currencyGroups[item.currency]) {
            currencyGroups[item.currency] = {
              totalAmount: 0,
              paymentMethod: item.paymentMethod || "cash",
            };
          }
          currencyGroups[item.currency].totalAmount +=
            item.price * item.quantity;
        });

        // สร้าง record สำหรับแต่ละสกุลเงิน
        Object.keys(currencyGroups).forEach((curr) => {
          // ตรวจสอบ filter
          if (currency && curr !== currency) return;
          if (
            paymentMethod &&
            currencyGroups[curr].paymentMethod !== paymentMethod
          )
            return;

          allRecords.push({
            date: opo.date,
            documentNumber: opo.opoNumber || "-",
            description: opo.description || "ใบสั่งซื้อ OPO",
            type: "OPO",
            amount: currencyGroups[curr].totalAmount,
            currency: curr,
            paymentMethod: currencyGroups[curr].paymentMethod,
            status: opo.status,
            note: opo.note || "-",
            source: "OPO",
            
          });
        });
      }
    });

    // เรียงข้อมูลจากปัจจุบันไปเก่า (ล่าสุดก่อน)
    allRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

    // คำนวณผลรวมตามสกุลเงิน
    const totalPerCurrency = {};
    allRecords.forEach((record) => {
      if (!totalPerCurrency[record.currency]) {
        totalPerCurrency[record.currency] = {
          income: 0,
          expense: 0,
          debt_receivable: 0,
          debt_payable: 0,
          opo: 0,
          total: 0,
        };
      }

      const amount = parseFloat(record.amount) || 0;

      if (record.type === "ລາຍຮັບ") {
        totalPerCurrency[record.currency].income += amount;
      } else if (record.type === "ລາຍຈ່າຍ") {
        totalPerCurrency[record.currency].expense += amount;
      } else if (record.type === "ໜີ້ຮັບ") {
        totalPerCurrency[record.currency].debt_receivable += amount;
      } else if (record.type === "ໜີ້ຈ່າຍ") {
        totalPerCurrency[record.currency].debt_payable += amount;
      } else if (record.type === "OPO") {
        totalPerCurrency[record.currency].opo += amount;
      }

      totalPerCurrency[record.currency].total += amount;
    });

    res.json({
      success: true,
      data: allRecords,
      totalPerCurrency,
      count: allRecords.length,
    });
  } catch (error) {
    console.error("Reports Error:", error);
    res.status(500).json({
      success: false,
      message: "ເກີດຂໍ້ຜິດພາດໃນການດຶງຂໍ້ມູນລາຍງານ",
      error: error.message,
    });
  }
});

// GET /api/reports/summary - สำหรับกราฟ
router.get("/summary", async (req, res) => {
  try {
    const { startDate, endDate, groupBy = "month" } = req.query;
    const userQuery = { createdBy: mongoose.Types.ObjectId(req.user.userId) };
    const dateQuery = {};
    if (startDate || endDate) {
      dateQuery.date = {};
      if (startDate) dateQuery.date.$gte = new Date(startDate);
      if (endDate) dateQuery.date.$lte = new Date(endDate);
    }

    // รวม query ทั้งสอง
    const finalQuery = { ...dateQuery, ...userQuery };

    // Query ข้อมูลเฉพาะของผู้ใช้
    const debts = await Debt.find(finalQuery).lean();
    const incomeExpenses = await IncomeExpense.find(finalQuery).lean();
    const opos = await OPO.find(finalQuery).lean();
    // จัดกลุ่มข้อมูลตามช่วงเวลา
    const summary = {};

    const addToSummary = (date, type, amount, currency) => {
      const key =
        groupBy === "month"
          ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
              2,
              "0"
            )}`
          : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
              2,
              "0"
            )}-${String(date.getDate()).padStart(2, "0")}`;

      if (!summary[key]) {
        summary[key] = {
          date: key,
          income: {},
          expense: {},
          debt_receivable: {},
          debt_payable: {},
          opo: {},
        };
      }

      if (!summary[key][type][currency]) {
        summary[key][type][currency] = 0;
      }
      summary[key][type][currency] += amount;
    };

    // Process debts
    debts.forEach((debt) => {
      const date = new Date(debt.date);
      const type =
        debt.debtType === "payable" ? "debt_payable" : "debt_receivable";
      debt.amounts?.forEach((amt) => {
        addToSummary(date, type, amt.amount, amt.currency);
      });
    });

    // Process income/expenses
    incomeExpenses.forEach((record) => {
      const date = new Date(record.date);
      const type = record.type === "income" ? "income" : "expense";
      addToSummary(date, type, record.amount, record.currency);
    });

    // Process OPOs
    opos.forEach((opo) => {
      const date = new Date(opo.date);
      const currencyTotals = {};
      opo.items?.forEach((item) => {
        if (!currencyTotals[item.currency]) {
          currencyTotals[item.currency] = 0;
        }
        currencyTotals[item.currency] += item.price * item.quantity;
      });
      Object.keys(currencyTotals).forEach((currency) => {
        addToSummary(date, "opo", currencyTotals[currency], currency);
      });
    });

    const summaryArray = Object.values(summary).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    res.json({
      success: true,
      data: summaryArray,
    });
  } catch (error) {
    console.error("Summary Error:", error);
    res.status(500).json({
      success: false,
      message: "ເກີດຂໍ້ຜິດພາດໃນການສ້າງສະຫຼຸບ",
      error: error.message,
    });
  }
});

export default router;
