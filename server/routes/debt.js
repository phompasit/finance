import express from "express";
import Debt from "../models/Debt.js";
import { authenticate } from "../middleware/auth.js";
import Partner from "../models/partner.js";
import mongoose from "mongoose";
const router = express.Router();
import employees from "../models/employees.js";
import IncomeExpense from "../models/IncomeExpense.js";
import Company from "../models/company.js";
import Joi from "joi";
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
    const partners = await Partner.find({ companyId: req.user.companyId });
    res.json({ success: true, data: partners });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
router.get("/employees", authenticate, async (req, res) => {
  try {
    const employeesx = await employees.find({ companyId: req.user.companyId });
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
    query.companyId = req.user.companyId;

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
      .populate("partnerId")
      .populate("categoryId");
    const company = await Company.findById(req.user.companyId).lean();
    const accountMap = new Map();

    const records = debts.map((debt) => {
      const updatedAmounts = debt.amounts.map((amount) => {
        const { currency, amount: totalAmount, accountId } = amount;
        // bank accounts
        company.bankAccounts.forEach((acc) => {
          accountMap.set(String(acc._id), { ...acc, type: "bank" });
        });

        // cash accounts
        company.cashAccounts.forEach((acc) => {
          accountMap.set(String(acc._id), { ...acc, type: "cash" });
        });

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
          account: accountMap.get(String(accountId)) || null,
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
    if (!validateObjectId(req.params.id))
      return res.status(400).json({ message: "Invalid ID" });
    const debt = await Debt.findOne({
      _id: req.params.id,
      companyId: req.user._id,
    })
      .populate("createdBy", "name email")
      .populate("partnerId")
      .populate("categoryId");

    if (!debt) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }
    if (!["admin", "master", "staff"].includes(req.user.role)) {
      if (String(debt.userId) !== String(req.user._id)) {
        return res.status(403).json({ message: "Permission denied" });
      }
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
      categoryId,
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
      !partnerId ||
      !categoryId
    ) {
      return res.status(400).json({ message: "ກະລຸນາລະບຸຂໍ້ມູນໃຫ້ຄົບຖ້ວນ" });
    }

    if (!Array.isArray(amounts) || amounts.length === 0) {
      return res
        .status(400)
        .json({ message: "ຈຳນວນເງິນຕ້ອງມີຢ່າງໜ້ອຍ 1 ລາຍການ" });
    }

    const duplicate = await Debt.findOne({ serial });
    if (duplicate) {
      return res.status(400).json({ message: "ເລກທີ່ເອກະສານຊໍ້າກັນ" });
    }
    const company = await Company.findById(req.user.companyId).lean();

    const cashAccounts = company.cashAccounts || [];
    const bankAccounts = company.bankAccounts || [];
    ///ກວດສອບສະກຸນເງິນຕ້ອງມີພຽງສະກຸນເງິນດຽວເທົ່ານັ້ນ
    for (const i of amounts) {
      if (!i.currency || !i.amount || !i.accountId) {
        throw new Error(` ກະລຸນາກອກ currency, amount, accountId ໃຫ້ຄົບ`);
      }

      if (parseFloat(i.amount) <= 0) {
        throw new Error(` ຈໍານວນເງິນຕ້ອງຫຼາຍກວ່າ 0`);
      }

      let accounts = [];
      if (paymentMethod === "ເງິນສົດ") {
        accounts = cashAccounts;
      } else if (paymentMethod === "ໂອນ") {
        accounts = bankAccounts;
      }
      const accountMatch = accounts.find(
        (acc) => acc._id.toString() === i.accountId
      );
      if (!accountMatch) {
        throw new Error(` ບັນຊີນີ້ບໍ່ຢູ່ໃນ ${paymentMethod}`);
      }

      if (accountMatch.currency !== i.currency) {
        throw new Error(`ສະກຸນເງິນບໍ່ກົງກັນກັບບັນຊີ`);
      }

      if (isNaN(Number(i.amount))) {
        throw new Error(`Amount ບໍ່ຖືກຕ້ອງ`);
      }
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
    // โหลดข้อมูลบริษัทครั้งเดียว
    if (Array.isArray(installments) && installments.length > 0) {
      // validate amount per install
      for (const amt of amounts) {
        /////
        const instInCurrency = installments.filter(
          (inst) => inst.currency === amt.currency
        );

        if (instInCurrency.length > 0) {
          const total = instInCurrency.reduce((s, i) => s + i.amount, 0);

          if (Math.abs(total - amt.amount) > 0.01) {
            return res.status(400).json({
              message: `ຍອດລວມງວດ ${amt.currency} ບໍ່ກົງກັບຍອດໜີ້`,
            });
          }
        }
      }

      // add _id to each installment
      formattedInstallments = installments.map((inst, index) => {
        return {
          _id: new mongoose.Types.ObjectId(),
          dueDate: inst.dueDate,
          amount: inst.amount,
          currency: inst.currency,
          isPaid: inst.isPaid || false,
          paidDate: inst.paidDate || null,
        };
      });
    }

    // -------------------------------
    // 3) Create Debt
    // -------------------------------
    const debt = await Debt.create(
      [
        {
          userId: req.user._id,
          serial,
          companyId: req.user.companyId,
          description,
          debtType,
          paymentMethod,
          date,
          amounts,
          note,
          reason,
          categoryId,
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
    if (!paidInstallments) {
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
        categoryId: categoryId,
        companyId: req.user.companyId,
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
      message: "server wrong",
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
        companyId: req.user._id,
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
      categoryId,
    } = req.body;
    // -----------------------------------------
    // 1) หา debt เดิม
    // -----------------------------------------
    const oldDebt = await Debt.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    }).session(session);

    if (!oldDebt) {
      await session.abortTransaction();
      return res.status(404).json({ message: "ບໍ່ພົບຂໍ້ມູນໜີ້ສິນ" });
    }
    if (!categoryId) {
      return res.status(404).json({ message: "ກະລຸນາລະບຸໝວດໝູ່" });
    }
    // -----------------------------------------
    // 2) เช็ค serial ไม่ให้ซ้ำ
    // -----------------------------------------
    if (serial && serial !== oldDebt.serial) {
      const dup = await Debt.findOne({ serial }).session(session);
      if (dup) {
        await session.abortTransaction();
        return res.status(400).json({ message: "ເລກທີ່ເອກະສານຊໍ້າກັນ" });
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
    // โหลดข้อมูลบริษัทครั้งเดียว
    const company = await Company.findById(req.user.companyId).lean();

    const cashAccounts = company.cashAccounts || [];
    const bankAccounts = company.bankAccounts || [];
    if (Array.isArray(installments) && installments.length > 0) {
      for (const a of amounts) {
        if (!a.currency || !a.amount || !a.accountId) {
          throw new Error(` ກະລຸນາກອກ currency, amount, accountId ໃຫ້ຄົບ`);
        }

        if (parseFloat(a.amount) <= 0) {
          throw new Error(` ຈໍານວນເງິນຕ້ອງຫຼາຍກວ່າ 0`);
        }

        let accounts = [];
        if (paymentMethod === "ເງິນສົດ") {
          accounts = cashAccounts;
        } else if (paymentMethod === "ໂອນ") {
          accounts = bankAccounts;
        }
        const accountMatch = accounts.find(
          (acc) => acc._id.toString() === a.accountId
        );
        if (!accountMatch) {
          throw new Error(` ບັນຊີນີ້ບໍ່ຢູ່ໃນ ${paymentMethod}`);
        }

        if (accountMatch.currency !== a.currency) {
          throw new Error(`ສະກຸນເງິນບໍ່ກົງກັນກັບບັນຊີ`);
        }

        if (isNaN(Number(a.amount))) {
          throw new Error(`Amount ບໍ່ຖືກຕ້ອງ`);
        }
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
    if (categoryId) oldDebt.categoryId = categoryId;
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
                companyId: req.user.companyId,
                type: oldDebt.debtType === "payable" ? "expense" : "income",
                paymentMethod: oldDebt.paymentMethod,
                date: inst.paidDate ? new Date(inst.paidDate) : new Date(), // แก้ไข
                status: "paid",
                status_Ap: "success_approve",
                note: `ຊຳລະງວດໃໝ່`,
                referance: oldDebt._id,
                createdBy: req.user._id,
                categoryId: oldDebt.categoryId,
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
              companyId: req.user.companyId,
              categoryId: oldDebt.categoryId,
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
      companyId: req.user.companyId,
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
    const debts = await Debt.find({ companyId: req.user.companyId });

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

/* ================================
   VALIDATION SCHEMAS
================================ */
const partnerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  phone: Joi.string().trim().min(6).max(20).required(),
  email: Joi.string().email().allow("", null),
  address: Joi.string().max(255).allow("", null),
  type: Joi.string().valid("customer", "supplier").required(),
});

const employeeSchema = Joi.object({
  name: Joi.string().trim().min(2).max(15).required(),
  phone: Joi.string().trim().min(11).max(11).required(),
  email: Joi.string().email().allow("", null),
  position: Joi.string().max(100).allow("", null),
});

/* ================================
   PARTNER ROUTES
================================ */

/* CREATE PARTNER */
router.post("/partners", authenticate, async (req, res) => {
  try {
    const { error, value } = partnerSchema.validate(req.body, {
      stripUnknown: true,
      abortEarly: false,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
        errors: error.details.map((d) => d.message),
      });
    }

    const data = pick(value, ["name", "phone", "email", "address", "type"]);

    const partner = await Partner.create({
      ...data,
      userId: req.user._id,
      companyId: req.user.companyId,
    });

    res.status(201).json({ success: true, data: partner });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* GET PARTNER BY ID (company isolated) */
router.get(
  "/partners/:id",
  authenticate,
  validateObjectId,
  async (req, res) => {
    try {
      const partner = await Partner.findOne({
        _id: req.params.id,
        companyId: req.user.companyId,
      });

      if (!partner) {
        return res
          .status(404)
          .json({ success: false, message: "Partner not found" });
      }

      res.json({ success: true, data: partner });
    } catch (err) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

/* UPDATE PARTNER */
router.put(
  "/partners/:id",
  authenticate,
  validateObjectId,
  async (req, res) => {
    try {
      const { error, value } = partnerSchema.validate(req.body, {
        stripUnknown: true,
      });

      if (error) {
        return res.status(400).json({
          success: false,
          message: "ກະລຸນາລະບຸຂໍ້ມູນໃຫ້ຄົບຖ້ວນ",
          errors: error.details.map((d) => d.message),
        });
      }

      const data = pick(value, ["name", "phone", "email", "address", "type"]);

      const partner = await Partner.findOneAndUpdate(
        { _id: req.params.id, companyId: req.user.companyId },
        data,
        { new: true, runValidators: true }
      );

      if (!partner) {
        return res
          .status(404)
          .json({ success: false, message: "Partner not found" });
      }

      res.json({ success: true, data: partner });
    } catch (err) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

/* DELETE PARTNER */
router.delete(
  "/partners/:id",
  authenticate,
  validateObjectId,
  async (req, res) => {
    try {
      const partner = await Partner.findOneAndDelete({
        _id: req.params.id,
        companyId: req.user.companyId,
      });

      if (!partner) {
        return res
          .status(404)
          .json({ success: false, message: "Partner not found" });
      }

      res.json({
        success: true,
        message: "Partner deleted successfully",
      });
    } catch (err) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

/* ================================
   EMPLOYEE ROUTES
================================ */

/* CREATE EMPLOYEE */
router.post("/employees", authenticate, async (req, res) => {
  try {
    const { error, value } = employeeSchema.validate(req.body, {
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
        errors: error.details.map((d) => d.message),
      });
    }

    const employee = await Employee.create({
      ...value,
      userId: req.user._id,
      companyId: req.user.companyId,
    });

    res.status(201).json({ success: true, data: employee });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* UPDATE EMPLOYEE */
router.put(
  "/employees/:id",
  authenticate,
  validateObjectId,
  async (req, res) => {
    try {
      const { error, value } = employeeSchema.validate(req.body, {
        stripUnknown: true,
      });

      if (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid input",
          errors: error.details.map((d) => d.message),
        });
      }

      const updated = await Employee.findOneAndUpdate(
        { _id: req.params.id, companyId: req.user.companyId },
        value,
        { new: true, runValidators: true }
      );

      if (!updated) {
        return res
          .status(404)
          .json({ success: false, message: "Employee not found" });
      }

      res.json({ success: true, data: updated });
    } catch (err) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

/* DELETE EMPLOYEE */
router.delete(
  "/employees/:id",
  authenticate,
  validateObjectId,
  async (req, res) => {
    try {
      const deleted = await Employee.findOneAndDelete({
        _id: req.params.id,
        companyId: req.user.companyId,
      });

      if (!deleted) {
        return res
          .status(404)
          .json({ success: false, message: "Employee not found" });
      }

      res.json({ success: true, message: "Deleted successfully" });
    } catch (err) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

export default router;
