import express from "express";
import IncomeExpense from "../models/IncomeExpense.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

// Get all income/expense records
router.get("/", authenticate, async (req, res) => {
  try {
    const { type, category, startDate, endDate, search } = req.query;
    const query = { userId: req.user._id };

    if (type) query.type = type;
    if (category) query.category = category;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: "i" } },
        { reference: { $regex: search, $options: "i" } },
      ];
    }

    const records = await IncomeExpense.find(query).sort({ date: -1 });
    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: error.message });
  }
});

// Bulk creation endpoint
router.post("/bulk", authenticate, async (req, res) => {
  try {
    const { transactions } = req.body;
    console.log(transactions);
    // Insert all records at once
    const savedRecords = await IncomeExpense.insertMany({
      userId: req.user._id,
      serial: transactions.serial,
      description: transactions.description,
      type: transactions.type,
      paymentMethod: transactions.paymentMethod,
      date: transactions.date,
      amounts: transactions.amounts,
      note: transactions.note,
      createdBy: req.user.userId,
    });

    res.status(201).json({
      message: `ບັນທຶກ ${savedRecords.length} ລາຍການສຳເລັດ`,
      count: savedRecords.length,
      records: savedRecords,
    });
  } catch (error) {
    res.status(500).json({
      message: "เกิดข้อผิดพลาดในการบันทึกหลายรายการ",
      error: error.message,
    });
  }
});

// Update income/expense record
router.put("/:id", authenticate, async (req, res) => {
  try {
    const record = await IncomeExpense.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      {
        new: true,
      }
    );
    if (!record) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }
    res.json(record);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: error.message });
  }
});

// Delete income/expense record
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const record = await IncomeExpense.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!record) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }
    res.json({ message: "ลบข้อมูลสำเร็จ" });
  } catch (error) {
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: error.message });
  }
});

export default router;
