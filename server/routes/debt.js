import express from "express";
import Debt from "../models/Debt.js";
import { authenticate } from "../middleware/auth.js";
import Partner from "../models/partner.js";
import mongoose from "mongoose";
const router = express.Router();
import employees from "../models/employees.js";
import IncomeExpense from "../models/IncomeExpense.js";
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
// ดึง Partner ทั้งหมด
router.get("/partners", authenticate, async (req, res) => {
  try {
    const query = {};
    if (req.user.role === "admin") {
      query.userId = req.user._id;
    }
    // ✅ ถ้าเป็น staff หรือ user ปกติ ให้ดูเฉพาะของตัวเอง
    else {
      query.userId = req.user.companyId;
    }
    const partners = await Partner.find(query);
    res.json({ success: true, data: partners });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
router.get("/employees", authenticate, async (req, res) => {
  try {
    const query = {};
    if (req.user.role === "admin") {
      query.userId = req.user._id;
    }
    // ✅ ถ้าเป็น staff หรือ user ปกติ ให้ดูเฉพาะของตัวเอง
    else {
      query.userId = req.user.companyId;
    }
    const employeesx = await employees.find(query);
    res.json({ success: true, data: employeesx });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
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

    const query = {};
    if (req.user.role === "admin") {
      query.userId = req.user._id;
    }
    // ✅ ถ้าเป็น staff หรือ user ปกติ ให้ดูเฉพาะของตัวเอง
    else {
      query.userId = req.user.companyId;
    }
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
      .populate("createdBy", "name email")
      .populate("partnerId");

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
      userId: req.user._id,
    })
      .populate("createdBy", "name email")
      .populate("partnerId");

    if (!debt) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }

    res.json(debt);
  } catch (error) {
    console.error("Error fetching debt:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: error.message });
  }
});

router.post("/", authenticate, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

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
      partnerId,
    } = req.body;

    // -------------------------------
    // 1) Validate required fields
    // -------------------------------
    if (
      !serial ||
      !description ||
      !debtType ||
      !paymentMethod ||
      !date ||
      !reason ||
      !partnerId
    ) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    if (!Array.isArray(amounts) || amounts.length === 0) {
      return res
        .status(400)
        .json({ message: "amounts ต้องเป็น array และมีอย่างน้อย 1 รายการ" });
    }

    const duplicate = await Debt.findOne({ serial });
    if (duplicate) {
      return res.status(400).json({ message: "เลขที่เอกสารซ้ำ" });
    }
    ///ກວດສອບສະກຸນເງິນຕ້ອງມີພຽງສະກຸນເງິນດຽວເທົ່ານັ້ນ
    for (const i of amounts) {
      const countCurrency = amounts.filter(
        (inst) => inst.currency === "USD" || "THB" || "LAK" || "EUR" || "CNY"
      ).length;
      if (countCurrency > 1) {
        return res.status(400).json({
          message: `ສະກຸນເງິນ ${i.currency} ສາມາດມີພຽງໄດ້ 1 ລາຍການເທົ່ານັ້ນ`,
        });
      }
    }
    // -------------------------------
    // 2) Validate installments and attach _id
    // -------------------------------
    let formattedInstallments = [];

    if (Array.isArray(installments) && installments.length > 0) {
      // validate amount per install
      for (const amt of amounts) {
        const instInCurrency = installments.filter(
          (inst) => inst.currency === amt.currency
        );

        if (instInCurrency.length > 0) {
          const total = instInCurrency.reduce((s, i) => s + i.amount, 0);

          if (Math.abs(total - amt.amount) > 0.01) {
            return res.status(400).json({
              message: `ยอดรวมงวดของสกุล ${amt.currency} ไม่ตรงกับยอดหนี้`,
            });
          }
        }
      }

      // add _id to each installment
      formattedInstallments = installments.map((inst) => ({
        _id: new mongoose.Types.ObjectId(),
        dueDate: inst.dueDate,
        amount: inst.amount,
        currency: inst.currency,
        isPaid: inst.isPaid || false,
        paidDate: inst.paidDate || null,
      }));
    }

    // -------------------------------
    // 3) Create Debt
    // -------------------------------
    const debt = await Debt.create(
      [
        {
          userId: req.user._id,
          serial,
          description,
          debtType,
          paymentMethod,
          date,
          amounts,
          note,
          reason,
          installments: formattedInstallments,
          status:
            formattedInstallments.length > 0
              ? calculateDebtStatus({ installments: formattedInstallments })
              : "ຄ້າງຊຳລະ",
          createdBy: req.user.userId,
          partnerId,
        },
      ],
      { session }
    );
    const savedDebt = debt[0].toObject();

    // -------------------------------
    // 4) Create IncomeExpense automatically
    // Only if NO installment has been paid
    // -------------------------------
    const paidInstallments = savedDebt.installments.filter(
      (i) => i.isPaid === true
    );
    console.log("paidInstallments:", paidInstallments);
    if (!paidInstallments ) {
      let amountList = [];
      if (savedDebt.installments.length > 0) {
        // Use first installment
        const first = savedDebt.installments[0];
        amountList.push({ currency: first.currency, amount: first.amount });
      } else {
        // Use amounts from debt directly
        amountList = savedDebt.amounts.map((a) => ({
          currency: a.currency,
          amount: a.amount,
        }));
      }

      if (amountList.length === 0) {
        await session.abortTransaction();
        return res
          .status(400)
          .json({ message: "ไม่พบยอดเงินสำหรับสร้างรายจ่าย" });
      }

      const incomeexpense = new IncomeExpense({
        serial: `IE-${savedDebt.serial}-${Date.now()}`,
        description: savedDebt.description,
        userId: req.user._id,
        type: savedDebt.debtType === "payable" ? "expense" : "income",
        paymentMethod: savedDebt.paymentMethod,
        date: new Date(),
        status: "paid",
        status_Ap: "success_approve",
        note: ` ເລກທີ່ ${savedDebt.serial} `,
        referance: savedDebt._id,
        createdBy: req.user._id,
        amounts: amountList,
      });

      await incomeexpense.save({ session });
    }

    // -------------------------------
    // 5) Commit
    // -------------------------------
    await session.commitTransaction();
    session.endSession();

    return res.status(201).json(savedDebt);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("❌ Error creating debt:", error);

    return res.status(500).json({
      message: "เกิดข้อผิดพลาด",
      error: error.message,
    });
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
        userId: req.user._id,
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
  const session = await mongoose.startSession();
  session.startTransaction();

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
      partnerId,
    } = req.body;
    // -----------------------------------------
    // 1) หา debt เดิม
    // -----------------------------------------
    const oldDebt = await Debt.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).session(session);

    if (!oldDebt) {
      await session.abortTransaction();
      return res.status(404).json({ message: "ไม่พบข้อมูลหนี้" });
    }

    // -----------------------------------------
    // 2) เช็ค serial ไม่ให้ซ้ำ
    // -----------------------------------------
    if (serial && serial !== oldDebt.serial) {
      const dup = await Debt.findOne({ serial }).session(session);
      if (dup) {
        await session.abortTransaction();
        return res.status(400).json({ message: "เลขที่เอกสารซ้ำ" });
      }
    }
    ///ກວດສອບສະກຸນເງິນຕ້ອງມີພຽງສະກຸນເງິນດຽວເທົ່ານັ້ນ
    for (const i of installments) {
      const countCurrency = amounts.filter(
        (inst) => inst.currency === i.currency
      ).length;
      if (countCurrency > 1) {
        return res.status(400).json({
          message: `ສະກຸນເງິນ ${i.currency} ມີແລ້ວ`,
        });
      }
    }

    // -----------------------------------------
    // 3) Validate Installments (ถ้ามี)
    // -----------------------------------------
    if (Array.isArray(installments) && installments.length > 0) {
      for (const a of amounts) {
        const instGroup = installments.filter((i) => i.currency === a.currency);
        if (instGroup.length > 0) {
          const total = instGroup.reduce((s, i) => s + i.amount, 0);
          if (Math.abs(total - a.amount) > 0.01) {
            await session.abortTransaction();
            return res.status(400).json({
              message: `ຍອດລວມງວດຂອງ ${a.currency} ບໍ່ຕົງກັບຍອດຫນີ້`,
            });
          }
        }
      }
    }

    // -----------------------------------------
    // 4) ทำสำเนาข้อมูลเดิมไว้เช็คว่าอะไรถูกแก้
    // -----------------------------------------
    const oldInstallments = oldDebt.installments.map((i) => i.toObject());

    // -----------------------------------------
    // 5) อัปเดต debt
    // -----------------------------------------
    if (serial) oldDebt.serial = serial;
    if (description) oldDebt.description = description;
    if (debtType) oldDebt.debtType = debtType;
    if (paymentMethod) oldDebt.paymentMethod = paymentMethod;
    if (date) oldDebt.date = date;
    if (amounts) oldDebt.amounts = amounts;
    if (note !== undefined) oldDebt.note = note;
    if (reason) oldDebt.reason = reason;
    if (partnerId) oldDebt.partnerId = partnerId;

    // format installments ใหม่ (เพิ่ม _id หากไม่มี)
    let newInstallments = [];
    if (Array.isArray(installments)) {
      newInstallments = installments.map((inst) => ({
        _id: inst._id || new mongoose.Types.ObjectId(),
        dueDate: inst.dueDate,
        amount: inst.amount,
        currency: inst.currency,
        isPaid: inst.isPaid ?? false,
        paidDate: inst.isPaid ? inst.paidDate || new Date() : null,
      }));
      oldDebt.installments = newInstallments;
    }

    oldDebt.status = calculateDebtStatus(oldDebt);

    await oldDebt.save({ session });

    // -----------------------------------------
    // 6) Sync IncomeExpense
    // -----------------------------------------
    // -----------------------------------------
    // 6) Sync IncomeExpense สำหรับทุกรูปแบบการชำระ
    // -----------------------------------------

    // 6.1) หา installmentIds ที่ถูกลบออกจากระบบ
    const oldInstallmentIds = oldInstallments.map((i) => i._id.toString());
    const newInstallmentIds = newInstallments.map((i) => i._id.toString());
    const deletedInstallmentIds = oldInstallmentIds.filter(
      (id) => !newInstallmentIds.includes(id)
    );

    // 6.2) ลบ IncomeExpense ของงวดที่ถูกลบ
    if (deletedInstallmentIds.length > 0) {
      await IncomeExpense.deleteMany(
        {
          referance: req.params.id,
          installmentId: { $in: deletedInstallmentIds },
        },
        { session }
      );
    }

    // 6.3) วนลูปจัดการแต่ละงวด
    for (const inst of newInstallments) {
      const old = oldInstallments.find(
        (o) => o._id.toString() === inst._id.toString()
      );

      // --- Case A: งวดใหม่ (ไม่เคยมีในระบบ)
      // --- Case A: งวดใหม่ (ไม่เคยมีในระบบ)
      if (!old) {
        if (inst.isPaid) {
          await IncomeExpense.create(
            [
              {
                serial: `debt-${oldDebt.serial}-${Date.now()}`,
                description: `${oldDebt.description} (ງວດທີ່ ${
                  newInstallments.indexOf(inst) + 1
                }) ເລກທີ່ ${oldDebt.serial}`,
                userId: req.user._id,
                type: oldDebt.debtType === "payable" ? "expense" : "income",
                paymentMethod: oldDebt.paymentMethod,
                date: inst.paidDate ? new Date(inst.paidDate) : new Date(), // แก้ไข
                status: "paid",
                status_Ap: "success_approve",
                note: `ຊຳລະງວດໃໝ່`,
                referance: oldDebt._id,
                createdBy: req.user._id,
                amounts: [{ currency: inst.currency, amount: inst.amount }],
                installmentId: inst._id,
              },
            ],
            { session }
          );
        }
        continue;
      }

      // --- Case B: เปลี่ยนจาก ไม่ชำระ → ชำระ
      if (old.isPaid === false && inst.isPaid === true) {
        await IncomeExpense.create(
          [
            {
              serial: `debt-${oldDebt.serial}-${Date.now()}`,
              description: `${oldDebt.description} (ງວດທີ່ ${
                newInstallments.indexOf(inst) + 1
              } ເລກທີ່ ${oldDebt.serial})`,
              userId: req.user._id,
              type: oldDebt.debtType === "payable" ? "expense" : "income",
              paymentMethod: oldDebt.paymentMethod,
              date: inst.paidDate ? new Date(inst.paidDate) : new Date(), // แก้ไข
              status: "paid",
              status_Ap: "success_approve",
              note: `ຊຳລະງວດທີ່ ${newInstallments.indexOf(inst) + 1} ເລກທີ່ ${
                oldDebt.serial
              }`,
              referance: oldDebt._id,
              createdBy: req.user._id,
              amounts: [{ currency: inst.currency, amount: inst.amount }],
              installmentId: inst._id,
            },
          ],
          { session }
        );
        continue;
      }

      // --- Case C: เปลี่ยนจาก ชำระ → ไม่ชำระ (ยกเลิกการชำระ)
      if (old.isPaid === true && inst.isPaid === false) {
        await IncomeExpense.deleteMany(
          {
            referance: req.params.id,
            installmentId: inst._id,
          },
          { session }
        );
        continue;
      }

      // --- Case D: งวดยังคงชำระอยู่ แต่มีการแก้ไขข้อมูล
      // --- Case D: งวดยังคงชำระอยู่ แต่มีการแก้ไขข้อมูล
      if (old.isPaid === true && inst.isPaid === true) {
        // เช็คว่ามีการเปลี่ยนแปลงจำนวนเงินหรือวันที่หรือไม่
        const amountChanged =
          old.amount !== inst.amount || old.currency !== inst.currency;

        // แก้ไขการเปรียบเทียบวันที่
        const oldDate = old.paidDate
          ? new Date(old.paidDate).toISOString().split("T")[0]
          : null;
        const newDate = inst.paidDate
          ? new Date(inst.paidDate).toISOString().split("T")[0]
          : null;
        const dateChanged = oldDate !== newDate;

        if (amountChanged || dateChanged) {
          await IncomeExpense.updateOne(
            {
              referance: req.params.id,
              installmentId: inst._id,
            },
            {
              $set: {
                amounts: [{ currency: inst.currency, amount: inst.amount }],
                date: inst.paidDate ? new Date(inst.paidDate) : new Date(),
              },
            },
            { session }
          );
        }
        continue;
      }

      // --- Case E: งวดยังคงไม่ชำระ (ไม่ต้องทำอะไร)
      // if (old.isPaid === false && inst.isPaid === false) { ... }
    }
    // -----------------------------------------
    // 7) Commit Transaction
    // -----------------------------------------
    await session.commitTransaction();
    session.endSession();

    return res.json(oldDebt);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error updating debt:", error);
    return res
      .status(500)
      .json({ message: "เกิดข้อผิดพลาด", error: error.message });
  }
});

// Delete debt record
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const exsing = await IncomeExpense.findOne({ referance: req.params.id });
    if (exsing) {
      return res.status(400).json({
        success: false,
        message:
          "ບໍ່ສາມາດລົບໄດ້ ເພາະມີລາຍຈ່າຍໄດ້ສ້າງຂື້ນແລ້ວ ກະລຸນາລຶບລາຍຈ່າຍກ່ອນ",
      });
    }
    const record = await Debt.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!record) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }

    res.json({ message: "ລົບຂໍ້ມູນສຳເລັດ", deletedRecord: record });
  } catch (error) {
    console.error("Error deleting debt:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: error.message });
  }
});

// Get debt statistics
router.get("/stats/summary", authenticate, async (req, res) => {
  try {
    const debts = await Debt.find({ userId: req.user._id });

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
// Validation middleware
const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
    });
  }
  next();
};

///partner
router.post("/partners", authenticate, async (req, res) => {
  try {
    const query = {};
    if (req.user.role === "admin") {
      query.userId = req.user._id;
    }
    // ✅ ถ้าเป็น staff หรือ user ปกติ ให้ดูเฉพาะของตัวเอง
    else {
      query.userId = req.user.companyId;
    }
    const partnerData = req.body;
    const partner = new Partner({
      ...partnerData,
      userId: query.userId,
    });
    await partner.save();
    res.status(201).json({ success: true, data: partner });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ดึง Partner ตาม ID
router.get(
  "/partners/:id",
  authenticate,
  validateObjectId,
  async (req, res) => {
    try {
      const partner = await Partner.findById(req?.params?.id);
      if (!partner)
        return res
          .status(404)
          .json({ success: false, message: "Partner not found" });
      res.json({ success: true, data: partner });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// อัปเดต Partner ตาม ID
router.put(
  "/partners/:id",
  authenticate,
  validateObjectId,
  async (req, res) => {
    try {
      const partner = await Partner.findByIdAndUpdate(
        req?.params?.id,
        req.body,
        { new: true, runValidators: true } // return object ใหม่หลัง update
      );
      if (!partner)
        return res
          .status(404)
          .json({ success: false, message: "Partner not found" });
      res.json({ success: true, data: partner });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);
// ลบ Partner ตาม ID
router.delete(
  "/partners/:id",
  authenticate,
  validateObjectId,
  async (req, res) => {
    try {
      const partner = await Partner.findByIdAndDelete(req.params.id);
      if (!partner)
        return res
          .status(404)
          .json({ success: false, message: "Partner not found" });
      res.json({ success: true, message: "Partner deleted successfully" });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);
router.post("/employees", authenticate, async (req, res) => {
  try {
    const query = {};
    if (req.user.role === "admin") {
      query.userId = req.user._id;
    }
    // ✅ ถ้าเป็น staff หรือ user ปกติ ให้ดูเฉพาะของตัวเอง
    else {
      query.userId = req.user.companyId;
    }
    const employee = new employees({
      ...req.body,
      userId: query.userId,
    });
    await employee.save();
    res.json({ success: true, data: employee });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put("/employees/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await employees.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!updated)
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});
router.delete("/employees/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await employees.findByIdAndDelete(id);
    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});
export default router;
