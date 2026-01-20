import express from "express";
import OPO from "../models/OPO.js";
import { authenticate, authorize } from "../middleware/auth.js";
import User from "../models/User.js";
const router = express.Router();
import sanitizeHtml from "sanitize-html";
import Joi from "joi";
import mongoose from "mongoose";
import sanitize from "dompurify";
// Get all OPO records
import AuditLog from "../models/AuditLog.js";
router.get("/", authenticate, async (req, res) => {
  try {
    const {
      status,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    // 1️⃣ pagination (safe)
    const safeLimit = Math.min(parseInt(limit) || 20, 30);
    const safePage = Math.max(parseInt(page) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    // 2️⃣ base query (company isolation)
    const query = {
      companyId: req.user.companyId,
    };

    // 3️⃣ status filter (whitelist)
    const ALLOWED_STATUS = ["PENDING", "APPROVED", "CANCELLED"];
    if (status && status !== "ALL") {
      if (!ALLOWED_STATUS.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      query.status_Ap = status;
    }

    // 4️⃣ search (safe regex)
    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { serial: { $regex: safeSearch, $options: "i" } },
        { number: { $regex: safeSearch, $options: "i" } },
        { "items.description": { $regex: safeSearch, $options: "i" } },
      ];
    }

    // 5️⃣ date filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate + "T23:59:59.999Z");
    }

    // 6️⃣ query
    const [data, total] = await Promise.all([
      OPO.find(query)
        .select("serial number date status_Ap items staff createdBy")
        .populate("staff", "username")
        .sort({ date: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      OPO.countDocuments(query),
    ]);

    return res.json({
      data,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    });
  } catch (error) {
    console.error("GET OPO error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
// Get single OPO record by ID
router.get("/:id", authenticate, async (req, res) => {
  try {
    const opoId = req.params.id;

    // 1️⃣ หาเฉพาะ OPO ที่อยู่ในบริษัทเดียวกัน
    const opo = await OPO.findOne({
      _id: opoId,
      companyId: req.user.companyId,
    }).populate("userId", "username role");

    if (!opo) {
      return res.status(404).json({ message: "ບໍ່ພົບຂໍ້ມູນ OPO" });
    }

    // 2️⃣ RBAC: ตรวจสิทธิ์การเข้าถึง
    const CAN_VIEW_ALL = ["admin", "manager"]; // กำหนด role ที่ดูได้ทุกเอกสาร

    // staff / user → ดูเฉพาะ OPO ที่ตัวเองสร้าง
    if (!CAN_VIEW_ALL.includes(req.user.role)) {
      if (String(opo.userId._id) !== String(req.user._id)) {
        return res.status(403).json({
          message: "ທ່ານບໍ່ມີສິດເບິ່ງ OPO ນີ້",
        });
      }
    }

    return res.json(opo);
  } catch (error) {
    console.error("Error fetching OPO:", error);
    return res.status(500).json({
      message: "ເກີດຂໍ້ຜິດພາດ",
      error: error.message,
    });
  }
});

// dependencies assumed: Joi, sanitize-html or your sanitize util, mongoose

router.post("/", authenticate, async (req, res) => {
  // Optional: start a session if you want atomic multi-collection writes
  // const session = await mongoose.startSession();
  // session.startTransaction();
  try {
    // 1) Validate payload shape with Joi (whitelist)
    const itemSchema = Joi.object({
      description: Joi.string().max(1000).required(),
      paymentMethod: Joi.string().valid("cash", "bank_transfer").required(),
      reason: Joi.string().max(1000).required(),
      currency: Joi.string().max(10).required(),
      amount: Joi.number().min(0).required(),
      accountId: Joi.string().optional().allow("", null),
      // ... any other allowed item fields
    });

    const schema = Joi.object({
      serial: Joi.string().trim().required(),
      status: Joi.string().valid("paid", "unpaid").required(),
      items: Joi.array().items(itemSchema).min(1).required(),
      note: Joi.string().max(2000).allow("", null),
      // allow only these top-level fields
    });

    const { error, value } = schema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({
        message: error.details.map((i) => i.message),
      });
    }

    const { serial, status, items, note } = value;

    // 2) Ensure serial uniqueness WITHIN company (prevent cross-company duplicate)
    const existing = await OPO.findOne({
      serial,
      companyId: req.user.companyId,
    }).lean();
    if (existing) {
      return res.status(400).json({
        message: "ເລກທີ OPO (serial) ມີແລ້ວໃນບໍລິສັດນີ້",
      });
    }

    // 3) Sanitize text fields to prevent stored XSS
    const sanitizedItems = items.map((it) => ({
      description: sanitizeHtml(it.description, {
        allowedTags: [],
        allowedAttributes: {},
      }),
      reason: sanitizeHtml(it.reason, {
        allowedTags: [],
        allowedAttributes: {},
      }),
      paymentMethod: it.paymentMethod,
      currency: it.currency,
      amount: Number(it.amount),
      accountId: it.accountId || null,
    }));

    const sanitizedNote = sanitizeHtml(note || "", {
      allowedTags: [],
      allowedAttributes: {},
    });

    // 4) Recalculate totals
    const totalAmount = sanitizedItems.reduce(
      (s, it) => s + (Number(it.amount) || 0),
      0
    );

    // 5) Build record with whitelist only
    const recordData = {
      serial,
      status,
      items: sanitizedItems,
      note: sanitizedNote,
      totalAmount,
      userId: req.user._id,
      companyId: req.user.companyId,
      manager: req.body.manager,
      requester: req.body.requester,
      createdBy: req.body.createdBy,
      createdAt: new Date(),
      staff: req.user._id,
      status_Ap: "PENDING",
    };

    // 6) Save (optionally within transaction)
    // await Model.create([recordData], { session }); // if using session
    const record = new OPO(recordData);
    await record.save();

    // if using transaction:
    // await session.commitTransaction();
    // session.endSession();

    return res.status(201).json(record);
  } catch (err) {
    // if using transaction:
    // await session.abortTransaction();
    // session.endSession();

    console.error("Error creating OPO:", err);
    return res.status(500).json({
      message: "การสร้าง OPO ล้มเหลว",
      error: err.message,
    });
  }
});

// Update OPO record (Full Update)
router.put("/:id", authenticate, async (req, res) => {
  try {
    const opoId = req.params.id;

    // 1️⃣ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(opoId)) {
      return res.status(400).json({ message: "Invalid OPO ID" });
    }

    // 2️⃣ Find exact OPO
    const opo = await OPO.findOne({
      _id: opoId,
      companyId: req.user.companyId,
    });

    if (!opo) {
      return res.status(404).json({
        message: "ບໍ່ພົບຂໍ້ມູນ OPO",
      });
    }

    // 3️⃣ Permission
    if (
      req.user.role !== "admin" &&
      String(opo.createdBy) !== String(req.user._id)
    ) {
      return res.status(403).json({ message: "ບໍ່ມີສິດແກ້ໄຂ" });
    }

    // 4️⃣ Lock approved / cancelled
    if (["APPROVED", "CANCELLED"].includes(opo.status_Ap)) {
      return res.status(403).json({
        message: "OPO ນີ້ຖືກ lock ແລ້ວ",
      });
    }

    // 5️⃣ Validate input
    if (!req.body.serial?.trim()) {
      return res.status(400).json({ message: "Serial ບໍ່ຖືກຕ້ອງ" });
    }

    if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
      return res.status(400).json({
        message: "ຕ້ອງມີ item ຢ່າງໜ້ອຍ 1 ລາຍການ",
      });
    }

    // 6️⃣ Sanitize & whitelist items
    const safeItems = req.body.items.map((i) => ({
      description: i.description,
      paymentMethod: i.paymentMethod,
      reason: i.reason,
      amount: Number(i.amount || 0),
    }));

    // 7️⃣ Build update (NO status / createdBy)
    const updateData = {
      serial: req.body.serial,
      items: safeItems,
      note: req.body.note || "",
      manager: req.body.manager || "",
      requester: req.body.requester || "",
      updatedBy: req.user._id,
      updatedAt: new Date(),
      totalAmount: safeItems.reduce((s, i) => s + i.amount, 0),
    };

    // 8️⃣ Atomic update
    const updated = await OPO.findOneAndUpdate(
      {
        _id: opoId,
        companyId: req.user.companyId,
        status_Ap: { $nin: ["APPROVED", "CANCELLED"] },
      },
      updateData,
      { new: true }
    );

    if (!updated) {
      return res.status(409).json({
        message: "ข้อมูลถูกเปลี่ยนโดยผู้อื่น",
      });
    }

    return res.json({
      message: "ອັບເດດ OPO ສຳເລັດ",
      data: updated,
    });
  } catch (error) {
    console.error("PUT OPO error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});
// Update OPO status (admin/staff only)

router.patch("/:id/status", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // 1️⃣ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    // 2️⃣ Role-based access
    const CAN_UPDATE_STATUS = ["admin", "finance", "manager"];
    if (!CAN_UPDATE_STATUS.includes(req.user.role)) {
      return res.status(403).json({ message: "ບໍ່ມີສິດປ່ຽນສະຖານະ" });
    }

    // 3️⃣ Validate input
    const schema = Joi.object({
      status: Joi.string()
        .valid("PENDING", "APPROVED", "PAID", "CANCELLED")
        .required(),
      rejectionReason: Joi.string().allow("").max(500).optional(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" });
    }

    // 4️⃣ Fetch existing
    const existing = await OPO.findOne({
      _id: id,
      companyId: req.user.companyId,
    }).lean();

    if (!existing) {
      return res.status(404).json({ message: "ບໍ່ພົບຂໍ້ມູນ" });
    }

    // 5️⃣ State transition rules
    const TRANSITIONS = {
      PENDING: ["APPROVED", "CANCELLED"],
      APPROVED: ["PAID", "CANCELLED"],
      PAID: [],
      CANCELLED: [],
    };

    if (!TRANSITIONS[existing.status]?.includes(value.status)) {
      return res.status(400).json({
        message: `ບໍ່ສາມາດປ່ຽນ ${existing.status} → ${value.status}`,
      });
    }

    // 6️⃣ Build update (server-controlled fields)
    const updateData = {
      status: value.status,
      updatedBy: req.user._id,
      updatedAt: new Date(),
    };

    if (value.status === "APPROVED") {
      updateData.approvedBy = req.user._id;
      updateData.approvedAt = new Date();
    }

    if (value.status === "CANCELLED") {
      updateData.rejectionReason = sanitize(value.rejectionReason || "");
    }

    // 7️⃣ Atomic update (re-check status)
    const updated = await OPO.findOneAndUpdate(
      {
        _id: id,
        companyId: req.user.companyId,
        status: existing.status,
      },
      updateData,
      { new: true }
    );

    if (!updated) {
      return res.status(409).json({
        message: "สถานะถูกเปลี่ยนโดยผู้อื่น กรุณาลองใหม่",
      });
    }

    // 8️⃣ Audit log (สำคัญมาก)
    await AuditLog.create({
      action: "OPO_STATUS_UPDATE",
      userId: req.user._id,
      companyId: req.user.companyId,
      opoId: id,
      beforeStatus: existing.status,
      afterStatus: value.status,
      timestamp: new Date(),
    });

    return res.json({
      message: "ອັບເດດສະຖານະສຳເລັດ",
      data: updated,
    });
  } catch (error) {
    console.error("PATCH status error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// Delete OPO record
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    // 1️⃣ หาเฉพาะเอกสารของบริษัทนี้ + ID ต้องตรง
    const opo = await OPO.findOne({
      _id: id,
      companyId: req.user.companyId,
    });

    if (!opo) {
      return res.status(404).json({
        message: "ບໍ່ພົບຂໍ້ມູນ OPO ຫຼື ທ່ານບໍ່ມີສິດລຶບ",
      });
    }

    // 2️⃣ Only admin or creator may delete
    if (
      req.user.role !== "admin" &&
      String(opo.createdBy) !== String(req.user._id)
    ) {
      return res.status(403).json({
        message: "ທ່ານບໍ່ມີສິດລຶບລາຍການນີ້",
      });
    }

    // 3️⃣ Prevent deletion if approved or cancelled
    if (["APPROVED", "CANCELLED"].includes(opo.status_Ap)) {
      return res.status(403).json({
        message: "OPO ທີ່ອະນຸມັດ ຫຼື ຍົກເລີກ ບໍ່ສາມາດລຶບໄດ້",
      });
    }
    // 5️⃣ ลบเอกสาร
    const result = await OPO.deleteOne({
      _id: id,
      companyId: req.user.companyId,
      status_Ap: { $nin: ["APPROVED", "CANCELLED", "PAID"] },
    });
    if (result.deletedCount !== 1) {
      return res.status(409).json({
        message: "ບໍ່ສາມາດລົບໄດ້ (ສະຖານະຖືກປ່ຽນລະຫວ່າງດຳເນີນງານ)",
      });
    }
    return res.json({
      message: "ລຶບຂໍ້ມູນສຳເລັດ",
      deletedId: id,
    });
  } catch (error) {
    console.error("DELETE OPO error:", error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
});
/////////////check pass list
router.delete("/opoId/:id/item/:itemId", authenticate, async (req, res) => {
  try {
    const { id, itemId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(itemId)
    ) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    // 1️⃣ ค้นหา OPO เฉพาะบริษัทของ user เพื่อป้องกันข้อมูลรั่ว
    const opo = await OPO.findOne({
      _id: id,
      companyId: req.user.companyId,
    });

    if (!opo) {
      return res.status(404).json({ message: "OPO not found" });
    }

    // 2️⃣ Only admin or creator can modify
    if (
      req.user.role !== "admin" &&
      String(opo.createdBy) !== String(req.user._id)
    ) {
      return res.status(403).json({
        message: "ທ່ານບໍ່ມີສິດລຶບລາຍການນີ້",
      });
    }

    // 3️⃣ Prevent modification if approved or cancelled
    const lockedStatuses = ["APPROVED", "CANCELLED"];
    if (lockedStatuses.includes(opo.status_Ap)) {
      return res.status(403).json({
        message: "OPO ທີ່ອະນຸມັດ/ຍົກເລີກ ບໍ່ສາມາດແກ້ໄຂໄດ້",
      });
    }

    // 4️⃣ ตรวจว่ามี itemId ใน OPO จริงไหม
    const exists = opo.items.some((item) => item._id.toString() === itemId);

    if (!exists) {
      return res.status(400).json({
        message: "Item not found in this OPO",
      });
    }

    // 5️⃣ ลบ item
    opo.items = opo.items.filter((item) => item._id.toString() !== itemId);

    // 6️⃣ Recalculate totals after deletion
    opo.totalAmount = opo.items.reduce(
      (sum, i) => sum + Number(i.subTotal || 0),
      0
    );
    opo.taxAmount = (opo.totalAmount * (opo.taxRate || 0)) / 100;
    opo.finalAmount = opo.totalAmount + opo.taxAmount - (opo.discount || 0);
    // 5️⃣ Ensure item exists

    // 7️⃣ Save OPO
    await opo.save();
    // 9️⃣ Audit log (สำคัญมาก)
    await AuditLog.create({
      action: "OPO_ITEM_DELETE",
      userId: req.user._id,
      companyId: req.user.companyId,
      opoId: id,
      itemId,
      timestamp: new Date(),
    });
    return res.json({
      message: "Item removed successfully",
      opo,
    });
  } catch (error) {
    console.error("DELETE /opoId/:id/item/:itemId error:", error);
    return res.status(500).json({
      message: "Error removing item",
    });
  }
});

router.patch("/status/:id", authenticate, async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    // 1️⃣ ดึงข้อมูลก่อนอัปเดต
    const existing = await OPO.findOne({
      _id: id,
      companyId: req.user.companyId,
    }).lean();

    if (!existing) {
      return res.status(404).json({ message: "ບໍ່ພົບຂໍ້ມູນ" });
    }

    // 2️⃣ ป้องกัน user แก้ไขรายการที่ approve แล้ว
    if (req.user.role !== "admin" && existing.status_Ap === "approve") {
      return res.status(403).json({
        message: "ລາຍການນີ້ຖືກອະນຸມັດແລ້ວ ບໍ່ສາມາດປ່ຽນແປງໄດ້",
      });
    }

    // 3️⃣ User ห้ามเปลี่ยน status_Ap (approve)
    if (req.user.role !== "admin" && "status_Ap" in req.body) {
      return res.status(403).json({
        message: "ທ່ານບໍ່ມີສິດປ່ຽນສະຖານະອະນຸມັດ",
      });
    }

    // 4️⃣ Validate allowed status values
    const allowedStatus = ["PENDING", "APPROVED", "PAID", "CANCELLED"];
    const allowedApproval = ["PENDING", "APPROVED", "PAID", "CANCELLED"];

    if (req.body.status && !allowedStatus.includes(req.body.status)) {
      return res.status(400).json({ message: "สถานะไม่ถูกต้อง" });
    }

    if (req.body.status_Ap && !allowedApproval.includes(req.body.status_Ap)) {
      return res.status(400).json({ message: "สถานะอนุมัติไม่ถูกต้อง" });
    }

    // 5️⃣ Whitelist fields ที่แก้ได้เท่านั้น
    const update = {};

    if ("status" in req.body) update.status = req.body.status;

    if (req.user.role === "admin" && "status_Ap" in req.body) {
      update.status_Ap = req.body.status_Ap;
    }

    // ถ้าไม่มี field ให้อัปเดตที่ปลอดภัย
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "ບໍ່ມີຂໍ້ມູນທີ່ສາມາດອັບເດດໄດ້" });
    }

    // 6️⃣ อัปเดตอย่างปลอดภัย
    const updated = await OPO.findByIdAndUpdate(id, update, { new: true });

    return res.json({
      message: "ອັບເດດສະຖານະສຳເລັດ",
      data: updated,
    });
  } catch (error) {
    console.error("update status approve:", error);
    res.status(500).json({
      message: "Something with Wrong please try again ",
    });
  }
});

export default router;
