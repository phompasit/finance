import express from "express";
import OPO from "../models/OPO.js";
import { authenticate, authorize } from "../middleware/auth.js";
import User from "../models/User.js";
const router = express.Router();
import sanitizeHtml from "sanitize-html";
import Joi from "joi";
// Get all OPO records
router.get("/", authenticate, async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    const query = {};
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const page = parseInt(req.query.page) || 30;
    const skip = (page - 1) * limit;
    /////
    query.companyId = req.user.companyId;
    /////
    if (status) query.status = status;
    /////
    if (startDate || endDate) {
      query.date = {};
      if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate))
        return res.status(400).json({ message: "Invalid startDate format" });
      if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate))
        return res.status(400).json({ message: "Invalid endDate format" });
    }
    /////
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

    // 1️⃣ Find exact OPO of this company
    const opo = await OPO.findOne({
      _id: opoId,
      companyId: req.user.companyId,
    });

    if (!opo) {
      return res.status(404).json({
        message: "ບໍ່ພົບຂໍ້ມູນ OPO ຫຼື ບໍ່ມີສິດແກ້ໄຂ",
      });
    }

    // 2️⃣ Check permission (creator or admin)
    if (
      req.user.role !== "admin" &&
      String(opo.createdBy) !== String(req.user._id)
    ) {
      return res.status(403).json({
        message: "ທ່ານບໍ່ມີສິດແກ້ໄຂ OPO ນີ້",
      });
    }

    // 3️⃣ Prevent editing approved/cancelled OPO
    if (["APPROVED", "CANCELLED"].includes(opo.status_Ap)) {
      return res.status(403).json({
        message: "OPO ທີ່ອະນຸມັດ ຫຼື ຍົກເລີກ ບໍ່ສາມາດແກ້ໄຂໄດ້",
      });
    }

    // 4️⃣ Validate input (server side)
    if (!req.body.serial) {
      return res.status(400).json({ message: "Serial ບໍ່ຖືກຕ້ອງ" });
    }

    if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
      return res.status(400).json({
        message: "ກະລຸນາປ້ອນລາຍການຢ່າງໜ້ອຍ 1 ລາຍການ",
      });
    }

    // 5️⃣ Validate each item
    for (const item of req.body.items) {
      if (!item.description || !item.paymentMethod || !item.reason) {
        return res.status(400).json({
          message: "ລາຍການບໍ່ຄົບຖ້ວນ",
        });
      }
    }

    // 6️⃣ Allowed fields only
    const allowedUpdate = {
      serial: req.body.serial,
      status: req.body.status,
      items: req.body.items,
      note: req.body.note || "",
      manager: req.body.manager,
      requester: req.body.requester,
      createdBy: req.body.createdBy,
      updatedBy: req.user.username,
      updatedAt: new Date(),
    };

    // 7️⃣ Recalculate totals
    allowedUpdate.totalAmount = req.body.items.reduce(
      (sum, i) => sum + Number(i.amount || 0),
      0
    );

    // 8️⃣ Update safely
    const updated = await OPO.findOneAndUpdate(
      { _id: opoId, companyId: req.user.companyId },
      allowedUpdate,
      { new: true }
    );

    return res.json({
      message: "ອັບເດດ OPO ສຳເລັດ",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating OPO:", error);
    return res.status(500).json({
      message: "ການອັບເດດ OPO ລົ້ມເຫລວ",
      error: error.message,
    });
  }
});

// Update OPO status (admin/staff only)
router.patch("/:id/status", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // 1️⃣ Allowed roles for approving / rejecting / cancel
    const CAN_UPDATE_STATUS = ["admin", "finance", "manager"];

    if (!CAN_UPDATE_STATUS.includes(req.user.role)) {
      return res.status(403).json({ message: "ບໍ່ມີສິດປ່ຽນສະຖານະ" });
    }

    // 2️⃣ Validate input
    const schema = Joi.object({
      status: Joi.string()
        .valid("PENDING", "APPROVED", "PAID", "CANCELLED")
        .required(),
      approvedBy: Joi.string().allow("").optional(),
      rejectionReason: Joi.string().allow("").optional(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" });

    // 3️⃣ Get existing record (important for business rules)
    const existing = await OPO.findOne({
      _id: id,
      companyId: req.user.companyId,
    });

    if (!existing) {
      return res.status(404).json({ message: "ບໍ່ພົບຂໍ້ມູນ" });
    }

    // 4️⃣ Prevent modifications on locked statuses
    if (["PAID", "CANCELLED"].includes(existing.status)) {
      return res.status(403).json({
        message: "ບໍ່ສາມາດປ່ຽນສະຖານະໄດ້ເມື່ອລາຍການແມ່ນ PAID ຫຼື CANCELLED",
      });
    }

    // 5️⃣ Sanitize only unsafe inputs
    const sanitizedReason = sanitize(value.rejectionReason || "");

    // 6️⃣ Only update allowed fields (whitelist)
    const updateData = {
      status: value.status,
      approvedBy: CAN_UPDATE_STATUS.includes(req.user.role)
        ? value.approvedBy
        : existing.approvedBy,
      rejectionReason: sanitizedReason,
      updatedBy: sanitize(req.user.username),
      updatedAt: new Date(),
    };

    // 7️⃣ Update safely
    const updated = await OPO.findOneAndUpdate(
      { _id: id, companyId: req.user.companyId },
      updateData,
      { new: true }
    );

    return res.json({
      message: "ອັບເດດສະຖານະສຳເລັດ",
      data: updated,
    });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ message: "ເກີດຂໍ້ຜິດພາດ" });
  }
});

// Delete OPO record
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
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

    // 4️⃣ ตรวจว่ามีการเชื่อมโยงกับ Invoice หรือ Payment ไหม
    // const linked = await Invoice.findOne({ opoId: id });
    // if (linked) {
    //   return res.status(400).json({
    //     message: "OPO ຖືກນຳໃຊ້ໃນ Invoice ແລ້ວ ບໍ່ສາມາດລຶບ",
    //   });
    // }

    // TODO: เพิ่มตรวจใน Stock, Payment, GRN ถ้ามีระบบนั้น

    // 5️⃣ ลบเอกสาร
    await OPO.deleteOne({ _id: id });

    return res.json({
      message: "ລຶບຂໍ້ມູນສຳເລັດ",
      deletedId: id,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "ເກີດຂໍ້ຜິດພາດ",
      error: error.message,
    });
  }
});

router.delete("/opoId/:id/item/:itemId", authenticate, async (req, res) => {
  try {
    const { id, itemId } = req.params;

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

    // 7️⃣ Save OPO
    await opo.save();

    return res.json({
      message: "Item removed successfully",
      opo,
    });
  } catch (error) {
    console.error("DELETE /opoId/:id/item/:itemId error:", error);
    return res.status(500).json({
      message: "Error removing item",
      error: error.message,
    });
  }
});

router.patch("/status/:id", authenticate, async (req, res) => {
  try {
    const id = req.params.id;

    // 1️⃣ ดึงข้อมูลก่อนอัปเดต
    const existing = await OPO.findOne({
      _id: id,
      companyId: req.user.companyId,
    }).lean();

    if (!existing) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
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
      return res.status(400).json({ message: "ไม่มีข้อมูลที่สามารถอัปเดตได้" });
    }

    // 6️⃣ อัปเดตอย่างปลอดภัย
    const updated = await OPO.findByIdAndUpdate(id, update, { new: true });

    return res.json({
      message: "อัปเดตสถานะสำเร็จ",
      data: updated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "เกิดข้อผิดพลาด",
      error: error.message,
    });
  }
});

export default router;
