import express from "express";

import { authenticate } from "../middleware/auth.js";
import Company from "../models/company.js";
import IncomeExpense from "../models/IncomeExpense.js";
import AdvanceRequests from "../models/advanceRequests.js";
import Debts from "../models/Debt.js";
const router = express.Router();

router.patch("/:id/add-bank", authenticate, async (req, res) => {
  try {
    const { bankName, accountNumber, currency, balance } = req.body;

    const company = await Company.findByIdAndUpdate(
      req.user.companyId,
      {
        $push: {
          bankAccounts: {
            bankName,
            accountNumber,
            currency,
            balance,
          },
        },
      },
      { new: true }
    );

    res.json({ success: true, company });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
router.patch("/:id/add-cash", authenticate, async (req, res) => {
  try {
    const { name, currency, balance } = req.body;

    const company = await Company.findByIdAndUpdate(
      req.user.companyId,
      {
        $push: {
          cashAccounts: {
            name,
            currency,
            balance,
          },
        },
      },
      { new: true }
    );

    res.json({ success: true, company });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
router.patch("/update-bank/:bankId", authenticate, async (req, res) => {
  try {
    const { bankName, accountNumber, currency, balance } = req.body;

    const company = await Company.findOneAndUpdate(
      {
        _id: req.user.companyId,
        "bankAccounts._id": req.params.bankId,
      },
      {
        $set: {
          "bankAccounts.$.bankName": bankName,
          "bankAccounts.$.accountNumber": accountNumber,
          "bankAccounts.$.currency": currency,
          "bankAccounts.$.balance": balance,
        },
      },
      { new: true }
    );

    res.json({ success: true, company });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
router.patch("/update-cash/:cashId", authenticate, async (req, res) => {
  try {
    const { name, currency, balance } = req.body;

    const company = await Company.findOneAndUpdate(
      {
        _id: req.user.companyId,
        "cashAccounts._id": req.params.cashId,
      },
      {
        $set: {
          "cashAccounts.$.name": name,
          "cashAccounts.$.currency": currency,
          "cashAccounts.$.balance": balance,
        },
      },
      { new: true }
    );

    res.json({ success: true, company });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
router.patch("/remove-bank/:bankId", authenticate, async (req, res) => {
  try {
    const bankId = req.params.bankId;

    // 1) ตรวจสอบว่าบัญชีถูกใช้ใน IncomeExpense หรือไม่
    const usedInIncomeExpense = await IncomeExpense.findOne({
      companyId: req.user.companyId,
      "amounts.accountId": bankId,
    });

    // 2) ตรวจสอบว่าใช้ใน AdvanceRequests หรือไม่
    const usedInAdvance = await AdvanceRequests.findOne({
      companyId: req.user.companyId,
      "amount_requested.accountId": bankId,
    });

    // 3) ตรวจสอบว่าถูกใช้ใน Debts หรือไม่
    const usedInDebts = await Debts.findOne({
      companyId: req.user.companyId,
      "amounts.accountId": bankId,
    });

    if (usedInIncomeExpense || usedInAdvance || usedInDebts) {
      return res.status(400).json({
        success: false,
        message: "ບໍ່ສາມາດລົບໄດ້, ບັນຊີນີ້ກຳລັງໃຊ້ຢູ່.",
      });
    }

    // 4) ถ้าไม่ถูกใช้งาน → ลบได้
    const company = await Company.findByIdAndUpdate(
      req.user.companyId,
      {
        $pull: { bankAccounts: { _id: bankId } },
      },
      { new: true }
    );

    return res.json({ success: true, company });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch("/remove-cash/:cashId", authenticate, async (req, res) => {
  try {
    const cashId = req.params.cashId;

    // ตรวจสอบการใช้งานก่อน
    const usedInIncomeExpense = await IncomeExpense.findOne({
      companyId: req.user.companyId,
      "amounts.accountId": cashId,
    });

    const usedInAdvance = await AdvanceRequests.findOne({
      companyId: req.user.companyId,
      "amount_requested.accountId": cashId,
    });

    const usedInDebts = await Debts.findOne({
      companyId: req.user.companyId,
      "amounts.accountId": cashId,
    });

    if (usedInIncomeExpense || usedInAdvance || usedInDebts) {
      return res.status(400).json({
        success: false,
        message: "ບໍ່ສາມາດລົບໄດ້, ບັນຊີນີ້ກຳລັງໃຊ້ຢູ່.",
      });
    }
    const company = await Company.findByIdAndUpdate(
      req.user.companyId,
      { $pull: { cashAccounts: { _id: cashId } } },
      { new: true }
    );

    res.json({ success: true, company });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
