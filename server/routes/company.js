import express from "express";
import mongoose from "mongoose";

import { authenticate } from "../middleware/auth.js";
import Company from "../models/company.js";
import IncomeExpense from "../models/IncomeExpense.js";
import AdvanceRequests from "../models/advanceRequests.js";
import Debts from "../models/Debt.js";

const router = express.Router();

/* =========================
   🔐 Middlewares
========================= */

// Validate ObjectId
const validateObjectId = (param) => (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params[param])) {
    return res.status(400).json({
      success: false,
      message: "ID ບໍ່ຖືກຕ້ອງ",
    });
  }
  next();
};

// Role-based access
const authorizeRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "ບໍ່ມີສິດເຂົ້າເຖິງ",
    });
  }
  next();
};

// Company isolation
const verifyCompany = (req, res, next) => {
  if (req.params.id !== req.user.companyId.toString()) {
    return res.status(403).json({
      success: false,
      message: "ບໍ່ອະນຸຍາດ",
    });
  }
  next();
};

/* =========================
   🏦 ADD BANK ACCOUNT
========================= */
router.patch(
  "/:id/add-bank",
  authenticate,
  authorizeRoles("admin", "master"),
  validateObjectId("id"),
  verifyCompany,
  async (req, res) => {
    try {
      const { bankName, accountNumber, currency, balance } = req.body;

      if (!bankName || !accountNumber || !currency || balance == null) {
        return res.status(400).json({
          success: false,
          message: "ຂໍ້ມູນບໍ່ຄົບຖ້ວນ",
        });
      }

      const company = await Company.findByIdAndUpdate(
        req.user.companyId,
        {
          $push: {
            bankAccounts: {
              bankName: bankName.trim(),
              accountNumber: accountNumber.trim(),
              currency,
              balance: Number(balance),
            },
          },
        },
        { new: true }
      );

      res.json({ success: true, company });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "ບໍ່ສາມາດເພີ່ມບັນຊີໄດ້",
      });
    }
  }
);

/* =========================
   💵 ADD CASH ACCOUNT
========================= */
router.patch(
  "/:id/add-cash",
  authenticate,
  authorizeRoles("admin", "master"),
  validateObjectId("id"),
  verifyCompany,
  async (req, res) => {
    try {
      const { name, currency, balance } = req.body;

      if (!name || !currency || balance == null) {
        return res.status(400).json({
          success: false,
          message: "ຂໍ້ມູນບໍ່ຄົບຖ້ວນ",
        });
      }

      const company = await Company.findByIdAndUpdate(
        req.user.companyId,
        {
          $push: {
            cashAccounts: {
              name: name.trim(),
              currency,
              balance: Number(balance),
            },
          },
        },
        { new: true }
      );

      res.json({ success: true, company });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "ບໍ່ສາມາດເພີ່ມບັນຊີເງິນສົດໄດ້",
      });
    }
  }
);

/* =========================
   ✏️ UPDATE BANK
========================= */
router.patch(
  "/update-bank/:bankId",
  authenticate,
  authorizeRoles("admin", "master"),
  validateObjectId("bankId"),
  async (req, res) => {
    try {
      const { bankName, accountNumber, currency, balance } = req.body;

      const company = await Company.findOneAndUpdate(
        {
          _id: req.user.companyId,
          "bankAccounts._id": req.params.bankId,
        },
        {
          $set: {
            "bankAccounts.$.bankName": bankName?.trim(),
            "bankAccounts.$.accountNumber": accountNumber?.trim(),
            "bankAccounts.$.currency": currency,
            "bankAccounts.$.balance": Number(balance),
          },
        },
        { new: true }
      );

      if (!company) {
        return res.status(404).json({
          success: false,
          message: "ບໍ່ພົບບັນຊີ",
        });
      }

      res.json({ success: true, company });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "ບໍ່ສາມາດອັບເດດບັນຊີໄດ້",
      });
    }
  }
);

/* =========================
   ✏️ UPDATE CASH
========================= */
router.patch(
  "/update-cash/:cashId",
  authenticate,
  authorizeRoles("admin", "master"),
  validateObjectId("cashId"),
  async (req, res) => {
    try {
      const { name, currency, balance } = req.body;

      const company = await Company.findOneAndUpdate(
        {
          _id: req.user.companyId,
          "cashAccounts._id": req.params.cashId,
        },
        {
          $set: {
            "cashAccounts.$.name": name?.trim(),
            "cashAccounts.$.currency": currency,
            "cashAccounts.$.balance": Number(balance),
          },
        },
        { new: true }
      );

      if (!company) {
        return res.status(404).json({
          success: false,
          message: "ບໍ່ພົບບັນຊີ",
        });
      }

      res.json({ success: true, company });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "ບໍ່ສາມາດອັບເດດບັນຊີໄດ້",
      });
    }
  }
);

/* =========================
   🗑️ REMOVE BANK
========================= */
router.patch(
  "/remove-bank/:bankId",
  authenticate,
  authorizeRoles("admin", "master"),
  validateObjectId("bankId"),
  async (req, res) => {
    try {
      const bankId = req.params.bankId;

      const isUsed =
        (await IncomeExpense.exists({
          companyId: req.user.companyId,
          "amounts.accountId": bankId,
        })) ||
        (await AdvanceRequests.exists({
          companyId: req.user.companyId,
          "amount_requested.accountId": bankId,
        })) ||
        (await Debts.exists({
          companyId: req.user.companyId,
          "amounts.accountId": bankId,
        }));

      if (isUsed) {
        return res.status(400).json({
          success: false,
          message: "ບັນຊີນີ້ກຳລັງໃຊ້ຢູ່",
        });
      }

      const company = await Company.findByIdAndUpdate(
        req.user.companyId,
        { $pull: { bankAccounts: { _id: bankId } } },
        { new: true }
      );

      res.json({ success: true, company });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "ບໍ່ສາມາດລົບບັນຊີໄດ້",
      });
    }
  }
);

/* =========================
   🗑️ REMOVE CASH
========================= */
router.patch(
  "/remove-cash/:cashId",
  authenticate,
  authorizeRoles("admin", "master"),
  validateObjectId("cashId"),
  async (req, res) => {
    try {
      const cashId = req.params.cashId;

      const isUsed =
        (await IncomeExpense.exists({
          companyId: req.user.companyId,
          "amounts.accountId": cashId,
        })) ||
        (await AdvanceRequests.exists({
          companyId: req.user.companyId,
          "amount_requested.accountId": cashId,
        })) ||
        (await Debts.exists({
          companyId: req.user.companyId,
          "amounts.accountId": cashId,
        }));

      if (isUsed) {
        return res.status(400).json({
          success: false,
          message: "ບັນຊີນີ້ກຳລັງໃຊ້ຢູ່",
        });
      }

      const company = await Company.findByIdAndUpdate(
        req.user.companyId,
        { $pull: { cashAccounts: { _id: cashId } } },
        { new: true }
      );

      res.json({ success: true, company });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "ບໍ່ສາມາດລົບບັນຊີໄດ້",
      });
    }
  }
);

export default router;
