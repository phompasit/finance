import express from "express";
import OPO from "../models/OPO.js";
import { authenticate, authorize } from "../middleware/auth.js";
import User from "../models/User.js";
const router = express.Router();

// Get all OPO records
router.get("/", authenticate, async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    const query = {};
    if (req.user.role === "admin") {
      query.userId = req.user._id;
    } else {
      query.userId = req.user.companyId;
    }
    if (status) query.status = status;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const records = await OPO.find(query)
      .populate("userId", "username email role companyInfo")
      .populate("staff", "username email role")
      .sort({ date: -1 });
      res.json(records);
  } catch (error) {
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: error.message });
  }
});

// Get single OPO record by ID
router.get("/:id", authenticate, async (req, res) => {
  try {
    const query = {};

    // ✅ ถ้าเป็น admin ให้ดูได้ทั้งหมดในบริษัทนั้น
    if (req.user.role === "admin") {
      query.userId = req.user._id;
    }
    // ✅ ถ้าเป็น staff หรือ user ปกติ ให้ดูเฉพาะของตัวเอง
    else {
      query.userId = req.user.companyId;
    }

    const record = await OPO.findOne(query).populate(
      "userId",
      "username email"
    );

    if (!record) {
      return res.status(404).json({ message: "ບໍ່ພົບຂໍ້ມູນ OPO" });
    }

    res.json(record);
  } catch (error) {
    res.status(500).json({ message: "ເກີດຂໍ້ຜິດພລາດ", error: error.message });
  }
});

// Create OPO record
router.post("/", authenticate, async (req, res) => {
  try {
    // Validate required fields manually for better error messages
    const { serial, status, items } = req.body;

    if (!serial) {
      return res.status(400).json({ message: "ກະລຸນາປ້ອນເລກທີ OPO (serial)" });
    }
    if (!status) {
      return res.status(400).json({ message: "ກະລຸນາປ້ອນສະຖານະ (status)" });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ message: "ກະລຸນາປ້ອນລາຍການຢ່າງໜ້ອຍໜຶ່ງລາຍການ" });
    }

    // Validate each item
    for (const item of items) {
      if (!item.description) {
        return res
          .status(400)
          .json({ message: "ກະລຸນາປ້ອນລາຍລະອຽດສຳລັບທຸກລາຍການ" });
      }
      if (!item.paymentMethod) {
        return res
          .status(400)
          .json({ message: "ກະລຸນາປ້ອນວິທີຊຳລະສຳລັບທຸກລາຍການ" });
      }
      if (!item.reason) {
        return res
          .status(400)
          .json({ message: "ກະລຸນາປ້ອນສາເຫດສຳລັບທຸກລາຍການ" });
      }
    }
    const query = {};

    // ✅ ถ้าเป็น admin ให้ดูได้ทั้งหมดในบริษัทนั้น
    if (req.user.role === "admin") {
      query.userId = req.user._id;
    }
    // ✅ ถ้าเป็น staff หรือ user ปกติ ให้ดูเฉพาะของตัวเอง
    else {
      query.userId = req.user.companyId;
    }
    // Create new OPO record
    const record = new OPO({
      ...req.body,
      serial, // Map 'number' from frontend to 'serial' in backend
      userId: query.userId,
      createdBy: req.user.username, // Fallback to authenticated user's username
      createdAt: new Date(),
      staff: req.user._id,
    });

    await record.save();
    res.status(201).json(record);
  } catch (error) {
    console.error("Error creating OPO:", error);
    res.status(400).json({
      message: "ການສ້າງ OPO ລົ້ມເຫລວ",
      error: error.message,
    });
  }
});

// Update OPO record (Full Update)
router.put("/:id", authenticate, async (req, res) => {
  try {
    const { serial, status, items } = req.body;

    // Validate required fields
    if (!serial) {
      return res.status(400).json({ message: "ກະລຸນາປ້ອນເລກທີ OPO (serial)" });
    }
    if (!status) {
      return res.status(400).json({ message: "ກະລຸນາປ້ອນສະຖານະ (status)" });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ message: "ກະລຸນາປ້ອນລາຍການຢ່າງໜ້ອຍໜຶ່ງລາຍການ" });
    }

    // Validate each item
    for (const item of items) {
      if (!item.description) {
        return res
          .status(400)
          .json({ message: "ກະລຸນາປ້ອນລາຍລະອຽດສຳລັບທຸກລາຍການ" });
      }
      if (!item.paymentMethod) {
        return res
          .status(400)
          .json({ message: "ກະລຸນາປ້ອນວິທີຊຳລະສຳລັບທຸກລາຍການ" });
      }
      if (!item.reason) {
        return res
          .status(400)
          .json({ message: "ກະລຸນາປ້ອນສາເຫດສຳລັບທຸກລາຍການ" });
      }
    }

    const query = {};

    // ✅ ถ้าเป็น admin ให้ดูได้ทั้งหมดในบริษัทนั้น
    if (req.user.role === "admin") {
      query.userId = req.user._id;
    }
    // ✅ ถ้าเป็น staff หรือ user ปกติ ให้ดูเฉพาะของตัวเอง
    else {
      query.userId = req.user.companyId;
    }

    // Find the record first to check permissions
    const existingRecord = await OPO.findOne(query);

    if (!existingRecord) {
      return res.status(404).json({
        message: "ບໍ່ພົບຂໍ້ມູນ OPO ຫຼື ທ່ານບໍ່ມີສິດແກ້ໄຂ",
      });
    }

    // Prevent editing if already approved (unless admin/staff)
    if (existingRecord.status === "approved" && req.user.role === "user") {
      return res.status(403).json({
        message: "ບໍ່ສາມາດແກ້ໄຂ OPO ທີ່ອະນຸມັດແລ້ວໄດ້",
      });
    }

    // Update the record
    const updatedRecord = await OPO.findOneAndUpdate(
      query,
      {
        ...req.body,
        serial,
        updatedBy: req.user.username,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    ).populate("userId", "username email");

    res.json({
      message: "ອັບເດດ OPO ສຳເລັດ",
      data: updatedRecord,
    });
  } catch (error) {
    console.error("Error updating OPO:", error);
    res.status(400).json({
      message: "ການອັບເດດ OPO ລົ້ມເຫລວ",
      error: error.message,
    });
  }
});

// Update OPO status (admin/staff only)
router.patch("/:id/status", authenticate, async (req, res) => {
  try {
    if (req.user.role === "user") {
      return res.status(403).json({ message: "ບໍ່ມີສິດເຂົ້າເຖິງ" });
    }

    const { status, approvedBy, rejectionReason } = req.body;
    const record = await OPO.findByIdAndUpdate(
      req.params.id,
      {
        status,
        approvedBy,
        rejectionReason,
        updatedBy: req.user.username,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!record) {
      return res.status(404).json({ message: "ບໍ່ພົບຂໍ້ມູນ" });
    }

    res.json({
      message: "ອັບເດດສະຖານະສຳເລັດ",
      data: record,
    });
  } catch (error) {
    res.status(500).json({ message: "ເກີດຂໍ້ຜິດພລາດ", error: error.message });
  }
});

// Delete OPO record
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const query = {};

    // ✅ ถ้าเป็น admin ให้ดูได้ทั้งหมดในบริษัทนั้น
    if (req.user.role === "admin") {
      query.userId = req.user._id;
    }
    // ✅ ถ้าเป็น staff หรือ user ปกติ ให้ดูเฉพาะของตัวเอง
    else {
      query.userId = req.user.companyId;
    }

    // Find the record first to check status
    const existingRecord = await OPO.findOne(query);

    if (!existingRecord) {
      return res.status(404).json({
        message: "ບໍ່ພົບຂໍ້ມູນ OPO ຫຼື ທ່ານບໍ່ມີສິດລຶບ",
      });
    }

    // Prevent deletion if already approved (unless admin)
    if (existingRecord.status === "approved" && req.user.role !== "admin") {
      return res.status(403).json({
        message: "ບໍ່ສາມາດລຶບ OPO ທີ່ອະນຸມັດແລ້ວໄດ້",
      });
    }

    const record = await OPO.findOneAndDelete(query);

    res.json({
      message: "ລຶບຂໍ້ມູນສຳເລັດ",
      deletedId: record._id,
    });
  } catch (error) {
    res.status(500).json({ message: "ເກີດຂໍ້ຜິດພລາດ", error: error.message });
  }
});

router.delete("/opoId/:id/item/:itemId", authenticate, async (req, res) => {
  try {
    const { id, itemId } = req.params;

    const opo = await OPO.findById(id);
    if (!opo) {
      return res.status(404).json({ message: "OPO not found" });
    }

    // Remove the item from the items array
    opo.items = opo.items.filter((item) => item._id.toString() !== itemId);

    await opo.save();
    res.json({ message: "Item removed successfully", opo });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error removing item", error: error.message });
  }
});
export default router;
