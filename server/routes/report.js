import express from "express";
import Transaction from "../models/IncomeExpense.js";
import OPO from "../models/OPO.js";
import Debt from "../models/Debt.js";
import { authenticate } from "../middleware/auth.js";

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

    let allReportData = [];

    // สร้าง date filter ที่ใช้ร่วมกัน
    const dateFilter = {};
       if (req.user.role === "admin") {
      dateFilter.userId = req.user._id;
    }
    // ✅ ถ้าเป็น staff หรือ user ปกติ ให้ดูเฉพาะของตัวเอง
    else {
      dateFilter.userId = req.user.companyId;
    }
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) {
        dateFilter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        dateFilter.date.$lte = endDateTime;
      }
    }

    // ============================================
    // 1. ดึงข้อมูล OPO (ใบขออนุมัติ)
    // ============================================
    if (!type || type === "OPO") {
      try {
        let opoQuery = { ...dateFilter};
    if (req.user.role === "admin") {
       opoQuery.userId = req.user._id;
    }
    // ✅ ถ้าเป็น staff หรือ user ปกติ ให้ดูเฉพาะของตัวเอง
    else {
       opoQuery.userId = req.user.companyId;
    }
        // Filter by status
        if (status) {
          opoQuery.status = status.toUpperCase();
        }

        // Full-text search
        if (searchText) {
          opoQuery.$or = [
            { serial: { $regex: searchText, $options: "i" } },
            { requester: { $regex: searchText, $options: "i" } },
            { manager: { $regex: searchText, $options: "i" } },
            { createdBy: { $regex: searchText, $options: "i" } },
            { "items.description": { $regex: searchText, $options: "i" } },
            { "items.notes": { $regex: searchText, $options: "i" } },
            { "items.reason": { $regex: searchText, $options: "i" } },
          ];
        }
        opoQuery.status = { $ne: "CANCELLED" };

        const opos = await OPO.find(opoQuery)
          .sort({ date: -1, createdAt: -1 })
          .lean();

        // แยก items ออกมาเป็นแถวแยก
        opos.forEach((opo) => {
          if (opo.items && opo.items.length > 0) {
            allReportData.push({
              _id: `opo_${opo._id}`,
              sourceType: "OPO",
              sourceId: opo._id,
              serial: opo.serial,
              date: opo.date,
              type: "OPO", // OPO คือรายจ่าย
              category: "OPO",
              status_Ap: opo.status_Ap,
              status: opo.status,
              paymentMethod: opo.paymentMethod,
              requester: opo.requester,
              manager: opo.manager,
              createdBy: opo.createdBy,
              listAmount: opo.items,
              createdAt: opo.createdAt,
              updatedAt: opo.updatedAt || opo.createdAt,
            });
          }
        });
      } catch (error) {
        console.error("Error fetching OPO:", error);
      }
    }

    // ============================================
    // 2. ดึงข้อมูลรายรับรายจ่าย (Transaction)
    // ============================================
    if (!type || type === "income" || type === "expense") {
      try {
        let transQuery = {
          ...dateFilter,
        };
    if (req.user.role === "admin") {
       transQuery.userId = req.user._id;
    }
    // ✅ ถ้าเป็น staff หรือ user ปกติ ให้ดูเฉพาะของตัวเอง
    else {
       transQuery.userId = req.user.companyId;
    }
        // Filter by type
        if (type === "income" || type === "expense") {
          transQuery.type = type;
        }

        // Filter by paymentMethod
        if (paymentMethod) {
          transQuery.paymentMethod = paymentMethod;
        }

        // Full-text search
        if (searchText) {
          transQuery.$or = [
            { serial: { $regex: searchText, $options: "i" } },
            { description: { $regex: searchText, $options: "i" } },
            { note: { $regex: searchText, $options: "i" } },
          ];
        }
        transQuery.status_Ap = { $ne: "cancel" };
        const transactions = await Transaction.find(transQuery)
          .sort({ date: -1, createdAt: -1 })
          .lean();

        // แยก amounts ออกมาเป็นแถวแยก
        transactions.forEach((trans) => {
          if (trans.amounts && trans.amounts.length > 0) {
            allReportData.push({
              _id: `trans_${trans._id}`,
              sourceType: trans.type === "income" ? "ລາຍຮັບ" : "ລາຍຈ່າຍ",
              sourceId: trans._id,
              serial: trans.serial,
              date: trans.date,
              description: trans.description,
              type: trans.type,
              category: trans.type === "income" ? "ລາຍຮັບ" : "ລາຍຈ່າຍ",
              paymentMethod: trans.paymentMethod,
              listAmount: trans.amounts,
              status: trans.status,
              status_Ap: trans?.status_Ap,
              notes: trans.note,
              createdAt: trans.createdAt,
              updatedAt: trans.updatedAt || trans.createdAt,
            });
          }
        });
      } catch (error) {
        console.error("Error fetching Transactions:", error);
      }
    }

    // ============================================
    // 3. ดึงข้อมูลหนี้ต้องรับ/ส่ง (Debt)
    // ============================================
    if (!type || type === "receivable" || type === "payable") {
      try {
        let debtQuery = { ...dateFilter };
    if (req.user.role === "admin") {
       debtQuery.userId = req.user._id;
    }
    // ✅ ถ้าเป็น staff หรือ user ปกติ ให้ดูเฉพาะของตัวเอง
    else {
       debtQuery.userId = req.user.companyId;
    }
        // Filter by debtType
        if (type === "receivable") {
          debtQuery.debtType = "receivable";
        } else if (type === "payable") {
          debtQuery.debtType = "payable";
        }
        // Filter by paymentMethod
        if (paymentMethod) {
          debtQuery.paymentMethod = paymentMethod;
        }

        // Filter by status (ใช้ regex เพราะสถานะเป็นภาษาลาว)
        if (status) {
          debtQuery.status = { $regex: status, $options: "i" };
        }

        // Full-text search
        if (searchText) {
          debtQuery.$or = [
            { serial: { $regex: searchText, $options: "i" } },
            { description: { $regex: searchText, $options: "i" } },
            { note: { $regex: searchText, $options: "i" } },
            { reason: { $regex: searchText, $options: "i" } },
          ];
        }

        const debts = await Debt.find(debtQuery)
          .sort({ date: -1, createdAt: -1 })
          .lean();
        // แยก amounts ออกมาเป็นแถวแยก
        debts.forEach((debt) => {
          allReportData.push({
            _id: `debt_${debt._id}`,
            sourceType:
              debt.debtType === "receivable" ? "ໜີ້ຕ້ອງຮັບ" : "ໜີ້ຕ້ອງສົ່ງ",
            sourceId: debt._id,

            serial: debt.serial,
            date: debt.date,
            description: debt.description,
            type: debt.debtType,
            category:
              debt.debtType === "receivable" ? "ໜີ້ຕ້ອງຮັບ" : "ໜີ້ຕ້ອງສົ່ງ",
            paymentMethod: debt.paymentMethod,

            status: debt.status,
            listAmount: debt.amounts,
            reason: debt.reason,
            notes: debt.note,
            installments: debt.installments,
            createdAt: debt.createdAt,
            updatedAt: debt.updatedAt || debt.createdAt,
          });
        });
      } catch (error) {
        console.error("Error fetching Debts:", error);
      }
    }

    // เรียงลำดับตามวันที่ล่าสุด
    allReportData.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB - dateA;
    });

    const summary = {
      totalRecords: allReportData.length,
      byType: {},
      byCurrency: {},
      byPaymentMethod: {},
      byStatus: {},
      trendByDate: {}, // สำหรับแนวโน้มรายวัน
    };

    allReportData.forEach((item) => {
      ///
      item.listAmount?.forEach((sub) => {
        const { currency, amount } = sub;
        const dateKey = new Date(item.date).toISOString().split("T")[0];

        if (!summary.trendByDate[dateKey]) {
          summary.trendByDate[dateKey] = {
            total: {},
            ລາຍຮັບ: {}, // รายรับ แยกตามสกุลเงิน
            ລາຍຈ່າຍ: {}, // รายจ่าย แยกตามสกุลเงิน
            OPO: {}, // OPO แยกตามสกุลเงิน
            ໜີ້ຕ້ອງຮັບ: {}, // ลูกหนี้ แยกตามสกุลเงิน
            ໜີ້ຕ້ອງສົ່ງ: {}, // เจ้าหนี้ แยกตามสกุลเงิน
          };
        }

        // เพิ่มยอดรวมทั้งหมด
        summary.trendByDate[dateKey].total[currency] =
          (summary.trendByDate[dateKey].total[currency] || 0) + amount;

        // แยกตาม sourceType และสกุลเงิน
        const sourceType = item.sourceType;
        if (sourceType) {
          if (!summary.trendByDate[dateKey][sourceType]) {
            summary.trendByDate[dateKey][sourceType] = {};
          }
          summary.trendByDate[dateKey][sourceType][currency] =
            (summary.trendByDate[dateKey][sourceType][currency] || 0) + amount;
        }
      });
      // ✅ ລຽງຈາກໃໝ່ໄປເກົ່າ
      summary.trendByDate = Object.fromEntries(
        Object.entries(summary.trendByDate).sort(
          (a, b) => new Date(b[0]) - new Date(a[0])
        )
      );

      const typeKey = item.type || item.category || "N/A";

      if (!summary.byType[typeKey]) {
        summary.byType[typeKey] = { count: 0, total: {} };
      }

      // total list
      summary.byType[typeKey].count++;

      //  listAmount
      item.listAmount?.forEach(({ amount, currency }) => {
        if (!summary.byType[typeKey].total[currency]) {
          summary.byType[typeKey].total[currency] = 0;
        }
        summary.byType[typeKey].total[currency] += amount;
      });

      // --- 2. currency ---
      //  listAmount
      if (Array.isArray(item.listAmount)) {
        item.listAmount.forEach((amt) => {
          const cur = amt.currency || "N/A";
          const amount = Number(amt.amount) || 0;

          if (!summary.byCurrency[cur]) {
            summary.byCurrency[cur] = {
              count: 0,
              totalAmount: 0,
              income: 0,
              expense: 0,
              receivable: 0,
              payable: 0,
              opo: 0,
            };
          }

          summary.byCurrency[cur].count++;
          summary.byCurrency[cur].totalAmount += amount;

          if (item.type === "income") {
            summary.byCurrency[cur].income += amount;
          } else if (item.type === "expense") {
            summary.byCurrency[cur].expense += amount;
          } else if (item.type === "receivable") {
            summary.byCurrency[cur].receivable += amount;
          } else if (item.type === "payable") {
            summary.byCurrency[cur].payable += amount;
          } else if (item.type === "OPO" && item.status === "APPROVED") {
            summary.byCurrency[cur].opo += amount;
          }

          // --- 3. สรุปตามวิธีชำระ ---
          const payKey = item.paymentMethod || amt.paymentMethod || "N/A";
          if (!summary.byPaymentMethod[payKey]) {
            summary.byPaymentMethod[payKey] = {
              count: 0,
              totalAmount: 0,
              currencies: {},
            };
          }

          summary.byPaymentMethod[payKey].count++;
          summary.byPaymentMethod[payKey].totalAmount += amount;
          summary.byPaymentMethod[payKey].currencies[cur] =
            (summary.byPaymentMethod[payKey].currencies[cur] || 0) + amount;
        });
      }

      // --- 4. สรุปตามสถานะ ---
      const statusKey = item.status || "N/A";
      if (!summary.byStatus[statusKey]) {
        summary.byStatus[statusKey] = { count: 0 };
      }
      summary.byStatus[statusKey].count++;
    });

    // ส่งข้อมูลกลับ
    res.json({
      success: true,
      data: allReportData,
      summary: summary,
      filters: {
        startDate,
        endDate,
        type,
        paymentMethod,
        currency,
        searchText,
        status,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).json({
      success: false,
      message: "ເກີດຂໍ້ຜິດພາດໃນການສ້າງລາຍງານ",
      error: error.message,
    });
  }
});

// ============================================
// GET /api/reports/summary -
// ============================================
router.get("/summary", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        dateFilter.date.$lte = endDateTime;
      }
    }

    // นับจำนวนแต่ละประเภท
    const [opoCount, transCount, debtCount] = await Promise.all([
      OPO.countDocuments(dateFilter),
      Transaction.countDocuments(dateFilter),
      Debt.countDocuments(dateFilter),
    ]);

    // สรุปยอดรายรับรายจ่าย
    const incomeData = await Transaction.find({
      ...dateFilter,
      type: "income",
      userId: req?.user?._id,
    }).lean();

    const expenseData = await Transaction.find({
      ...dateFilter,
      type: "expense",
      userId: req?.user?._id,
    }).lean();

    // คำนวณยอดรวม
    const calculateTotal = (data) => {
      const totals = {};
      data.forEach((item) => {
        if (item.amounts) {
          item.amounts.forEach((amt) => {
            if (!totals[amt.currency]) totals[amt.currency] = 0;
            totals[amt.currency] += amt.amount;
          });
        }
      });
      return totals;
    };

    res.json({
      success: true,
      summary: {
        totalOPO: opoCount,
        totalTransactions: transCount,
        totalDebts: debtCount,
        income: calculateTotal(incomeData),
        expense: calculateTotal(expenseData),
      },
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
