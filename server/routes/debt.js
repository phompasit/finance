import express from "express";
import Debt from "../models/Debt.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Helper function to calculate debt status
const calculateDebtStatus = (debt) => {
  if (!debt.installments || debt.installments.length === 0) {
    return "ຄ້າງຊຳລະ";
  }

  const totalInstallments = debt.installments.length;
  const paidInstallments = debt.installments.filter((inst) => inst.isPaid)
    .length;

  if (paidInstallments === 0) {
    return "ຄ້າງຊຳລະ";
  } else if (paidInstallments < totalInstallments) {
    return "ຊຳລະບາງສ່ວນ";
  } else {
    return "ຊຳລະຄົບ";
  }
};

// Get all debt records
router.get("/", authenticate, async (req, res) => {
  try {
    const {
      status,
      debtType,
      currency,
      paymentMethod,
      dateFrom,
      dateTo,
    } = req.query;
    const query = { createdBy: req.user.userId };

    if (status) query.status = status;
    if (debtType) query.debtType = debtType;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    if (currency) query["amounts.currency"] = currency;

    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) query.date.$lte = new Date(dateTo);
    }

    const debts = await Debt.find(query)
      .sort({ date: -1, createdAt: -1 })
      .populate("createdBy", "name email");

    const records = debts.map((debt) => {
      const updatedAmounts = debt.amounts.map((amount) => {
        const { currency, amount: totalAmount } = amount;

        // รวมยอดที่จ่ายแล้วของสกุลนี้
        const paidTotal =
          debt.installments
            ?.filter((ins) => ins.currency === currency && ins.isPaid)
            .reduce((sum, ins) => sum + ins.amount, 0) || 0;

        let status = "unpaid";
        if (paidTotal === 0) status = "unpaid";
        else if (paidTotal < totalAmount) status = "partial";
        else if (paidTotal >= totalAmount) status = "paid";

        return {
          ...amount.toObject(),
          paidAmount: paidTotal,
          status,
        };
      });

      // คำนวณสถานะรวมของหนี้
      const allPaid = updatedAmounts.every((a) => a.status === "paid");
      const partialPaid = updatedAmounts.some(
        (a) => a.status === "partial" || a.status === "paid"
      );

      let overallStatus = "ຄ້າງຊຳລະ";
      if (allPaid) overallStatus = "ຊຳລະຄົບ";
      else if (partialPaid) overallStatus = "ຊຳລະບາງສ່ວນ";

      return {
        ...debt.toObject(),
        amounts: updatedAmounts,
        status: overallStatus,
      };
    });

    console.log("Fetched debts with details:", records);
    res.json(records);
  } catch (error) {
    console.error("Error fetching debts:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: error.message });
  }
});

// Get single debt record
router.get("/:id", authenticate, async (req, res) => {
  try {
    const debt = await Debt.findOne({
      _id: req.params.id,
      createdBy: req.user.userId,
    }).populate("createdBy", "name email");

    if (!debt) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }

    res.json(debt);
  } catch (error) {
    console.error("Error fetching debt:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: error.message });
  }
});

// Create debt record
router.post("/", authenticate, async (req, res) => {
  try {
    const {
      serial,
      description,
      debtType,
      paymentMethod,
      date,
      amounts,
      note,
      reason,
      installments,
    } = req.body;
    console.log("Create Debt - req.body:", req.body);
    // Validate required fields
    if (
      !serial ||
      !description ||
      !debtType ||
      !paymentMethod ||
      !date ||
      !reason
    ) {
      return res.status(400).json({
        message: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน",
      });
    }

    // Validate amounts
    if (!amounts || amounts.length === 0) {
      return res.status(400).json({
        message: "กรุณาระบุจำนวนเงินอย่างน้อย 1 สกุล",
      });
    }

    // Check for duplicate serial
    const existingDebt = await Debt.findOne({ serial });
    if (existingDebt) {
      return res.status(400).json({
        message: "เลขที่เอกสารซ้ำ กรุณาใช้เลขที่อื่น",
      });
    }

    // Validate installments match amounts
    if (installments && installments.length > 0) {
      for (const amount of amounts) {
        const currencyInstallments = installments.filter(
          (inst) => inst.currency === amount.currency
        );

        if (currencyInstallments.length > 0) {
          const totalInstallmentAmount = currencyInstallments.reduce(
            (sum, inst) => sum + inst.amount,
            0
          );

          if (Math.abs(totalInstallmentAmount - amount.amount) > 0.01) {
            return res.status(400).json({
              message: `ยอดงวดรวมของ ${amount.currency} ไม่ตรงกับยอดทั้งหมด`,
            });
          }
        }
      }
    }

    // Calculate initial status
    const initialStatus =
      installments && installments.length > 0
        ? calculateDebtStatus({ installments })
        : "ຄ້າງຊຳລະ";

    const record = new Debt({
      userId: req.user._id,
      serial,
      description,
      debtType,
      paymentMethod,
      date,
      amounts,
      note,
      reason,
      installments: installments || [],
      status: initialStatus,
      createdBy: req.user.userId,
    });

    await record.save();
    res.status(201).json(record);
  } catch (error) {
    console.error("Error creating debt:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: error.message });
  }
});

// Update installment payment status
router.patch(
  "/:id/installment/:installmentId",
  authenticate,
  async (req, res) => {
    try {
      const { isPaid, paidDate } = req.body;

      const debt = await Debt.findOne({
        _id: req.params.id,
        createdBy: req.user.userId,
      });

      if (!debt) {
        return res.status(404).json({ message: "ไม่พบข้อมูล" });
      }

      const installment = debt.installments.id(req.params.installmentId);
      if (!installment) {
        return res.status(404).json({ message: "ไม่พบงวดที่ระบุ" });
      }

      installment.isPaid = isPaid;
      if (isPaid && paidDate) {
        installment.paidDate = new Date(paidDate);
      } else if (!isPaid) {
        installment.paidDate = null;
      }

      // Recalculate status
      debt.status = calculateDebtStatus(debt);

      await debt.save();
      res.json(debt);
    } catch (error) {
      console.error("Error updating installment:", error);
      res.status(500).json({ message: "เกิดข้อผิดพลาด", error: error.message });
    }
  }
);

// Update debt record
router.put("/:id", authenticate, async (req, res) => {
  try {
    const {
      serial,
      description,
      debtType,
      paymentMethode,
      date,
      amounts,
      note,
      reason,
      installments,
    } = req.body;

    // Find existing debt
    const existingDebt = await Debt.findOne({
      _id: req.params.id,
      createdBy: req.user.userId,
    });

    if (!existingDebt) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }

    // Check for duplicate serial (excluding current record)
    if (serial && serial !== existingDebt.serial) {
      const duplicateDebt = await Debt.findOne({ serial });
      if (duplicateDebt) {
        return res.status(400).json({
          message: "เลขที่เอกสารซ้ำ กรุณาใช้เลขที่อื่น",
        });
      }
    }

    // Validate installments if provided
    if (
      installments &&
      installments.length > 0 &&
      amounts &&
      amounts.length > 0
    ) {
      for (const amount of amounts) {
        const currencyInstallments = installments.filter(
          (inst) => inst.currency === amount.currency
        );

        if (currencyInstallments.length > 0) {
          const totalInstallmentAmount = currencyInstallments.reduce(
            (sum, inst) => sum + inst.amount,
            0
          );

          if (Math.abs(totalInstallmentAmount - amount.amount) > 0.01) {
            return res.status(400).json({
              message: `ยอดงวดรวมของ ${amount.currency} ไม่ตรงกับยอดทั้งหมด`,
            });
          }
        }
      }
    }

    // Update fields
    if (serial) existingDebt.serial = serial;
    if (description) existingDebt.description = description;
    if (debtType) existingDebt.debtType = debtType;
    if (paymentMethode) existingDebt.paymentMethode = paymentMethode;
    if (date) existingDebt.date = date;
    if (amounts) existingDebt.amounts = amounts;
    if (note !== undefined) existingDebt.note = note;
    if (reason) existingDebt.reason = reason;
    if (installments !== undefined) existingDebt.installments = installments;

    // Recalculate status
    existingDebt.status = calculateDebtStatus(existingDebt);

    await existingDebt.save();
    res.json(existingDebt);
  } catch (error) {
    console.error("Error updating debt:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: error.message });
  }
});

// Delete debt record
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const record = await Debt.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user.userId,
    });

    if (!record) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }

    res.json({ message: "ลบข้อมูลสำเร็จ", deletedRecord: record });
  } catch (error) {
    console.error("Error deleting debt:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: error.message });
  }
});

// Get debt statistics
router.get("/stats/summary", authenticate, async (req, res) => {
  try {
    const debts = await Debt.find({ createdBy: req.user.userId });

    const stats = {
      total: debts.length,
      byType: {
        payable: debts.filter((d) => d.debtType === "payable").length,
        receivable: debts.filter((d) => d.debtType === "receivable").length,
      },
      byStatus: {
        ຄ້າງຊຳລະ: debts.filter((d) => d.status === "ຄ້າງຊຳລະ").length,
        ຊຳລະບາງສ່ວນ: debts.filter((d) => d.status === "ຊຳລະບາງສ່ວນ").length,
        ຊຳລະຄົບ: debts.filter((d) => d.status === "ຊຳລະຄົບ").length,
      },
      byCurrency: {},
    };

    // Calculate total by currency
    debts.forEach((debt) => {
      debt.amounts.forEach((amount) => {
        if (!stats.byCurrency[amount.currency]) {
          stats.byCurrency[amount.currency] = {
            payable: 0,
            receivable: 0,
          };
        }
        stats.byCurrency[amount.currency][debt.debtType] += amount.amount;
      });
    });

    res.json(stats);
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: error.message });
  }
});

export default router;
