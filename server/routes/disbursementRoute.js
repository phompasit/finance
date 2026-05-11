import express from "express";
import mongoose from "mongoose";
import Joi from "joi";
import OPO from "../models/OPO.js";
import { authenticate } from "../middleware/auth.js";
import Disbursement from "../models/disbursement.js";
import IncomeExpense from "../models/IncomeExpense.js";
const router = express.Router();

// ─── GET all ───────────────────────────────────────────
router.get("/", authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, startDate, endDate } = req.query;

    const safeLimit = Math.min(parseInt(limit) || 20, 50);
    const safePage = Math.max(parseInt(page) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const query = { companyId: req.user.companyId };

    if (search) {
      const s = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.serial = { $regex: s, $options: "i" };
    }

    if (startDate || endDate) {
      query.disbursedAt = {};
      if (startDate) query.disbursedAt.$gte = new Date(startDate);
      if (endDate)
        query.disbursedAt.$lte = new Date(endDate + "T23:59:59.999Z");
    }

    const [data, total] = await Promise.all([
      Disbursement.find(query)
        .populate({
          path: "opoId",
          select: "serial number items requester manager createdBy partnerId",
          populate: { path: "partnerId", select: "name phone" }, // ✅ nested populate
        })
        .populate("createdBy", "username")

        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      Disbursement.countDocuments(query),
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ─── GET single ────────────────────────────────────────
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid ID" });

    const doc = await Disbursement.findOne({
      _id: id,
      companyId: req.user.companyId,
    })
      .populate({
        path: "opoId",
        populate: { path: "partnerId", select: "name phone" },
      })
      .populate("createdBy", "username");

    if (!doc) return res.status(404).json({ message: "ບໍ່ພົບຂໍ້ມູນ" });

    return res.json(doc);
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ─── POST create ───────────────────────────────────────

// ─── POST create ───────────────────────────────────────
router.post("/", authenticate, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "ສະເພາະ admin ເທົ່ານັ້ນ" });
  }

  const schema = Joi.object({
    opoId: Joi.string().required(),
    note: Joi.string().max(2000).allow("", null),
    categoryId: Joi.string().required(), // ✅ ต้องส่งมาด้วยเพื่อสร้าง IncomeExpense
    paymentMethod: Joi.string().valid("cash", "bank_transfer").required(),
    amounts: Joi.array()
      .items(
        Joi.object({
          currency: Joi.string().required(),
          amount: Joi.number().min(0).required(),
          accountId: Joi.string().required(),
        })
      )
      .min(1)
      .required(),
  });

  const { error, value } = schema.validate(req.body, { stripUnknown: true });
  if (error) return res.status(400).json({ message: error.details[0].message });

  if (!mongoose.Types.ObjectId.isValid(value.opoId))
    return res.status(400).json({ message: "opoId ບໍ່ຖືກຕ້ອງ" });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const opo = await OPO.findOne({
      _id: value.opoId,
      companyId: req.user.companyId,
    }).session(session);

    if (!opo) {
      await session.abortTransaction();
      return res.status(404).json({ message: "ບໍ່ພົບ OPO" });
    }

    if (opo.status_Ap !== "APPROVED") {
      await session.abortTransaction();
      return res.status(400).json({ message: "OPO ຕ້ອງຖືກອະນຸມັດກ່ອນ" });
    }

    if (opo.status === "paid") {
      await session.abortTransaction();
      return res.status(400).json({ message: "OPO ນີ້ຖືກເບີກຈ່າຍແລ້ວ" });
    }

    const existing = await Disbursement.findOne({
      opoId: value.opoId,
      companyId: req.user.companyId,
    }).session(session);

    if (existing) {
      await session.abortTransaction();
      return res.status(400).json({ message: "ມີໃບເບີກຈ່າຍສຳລັບ OPO ນີ້ແລ້ວ" });
    }

    const totalAmount = (opo.items || []).reduce(
      (s, i) => s + Number(i.amount || 0),
      0
    );

    const count = await Disbursement.countDocuments({
      companyId: req.user.companyId,
    }).session(session);

    const serial = `DBT-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    // ✅ 1) สร้าง Disbursement
    const [disbursement] = await Disbursement.create(
      [
        {
          serial,
          opoId: opo._id,
          note: value.note || "",
          totalAmount,
          createdBy: req.user._id,
          companyId: req.user.companyId,
          disbursedAt: new Date(),
        },
      ],
      { session }
    );

    // ✅ 2) สร้าง IncomeExpense รายจ่ายอัตโนมัติ
    const ieSerial = `IE-${serial}`; // serial ของ IncomeExpense
    await IncomeExpense.create(
      [
        {
          userId: req.user._id,
          companyId: req.user.companyId,
          categoryId: value.categoryId,
          serial: ieSerial,
          description: `ເບີກຈ່າຍ OPO: ${opo.serial || opo._id}`,
          type: "expense",
          paymentMethod: value.paymentMethod,
          date: new Date(),
          amounts: value.amounts,
          note: value.note || "",
          createdBy: req.user._id,
          status: "paid",
          status_Ap: "approve",
          disbursementId: disbursement._id, // ✅ link กลับ
        },
      ],
      { session }
    );

    // ✅ 3) อัปเดต OPO → paid
    await OPO.findByIdAndUpdate(opo._id, { status: "paid" }, { session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json(disbursement);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Create disbursement error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ─── DELETE ────────────────────────────────────────────
// ─── DELETE ────────────────────────────────────────────
router.delete("/:id", authenticate, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "ສະເພາະ admin ເທົ່ານັ້ນ" });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid ID" });

    const doc = await Disbursement.findOne({
      _id: id,
      companyId: req.user.companyId,
    }).session(session);

    if (!doc) {
      await session.abortTransaction();
      return res.status(404).json({ message: "ບໍ່ພົບຂໍ້ມູນ" });
    }

    // ✅ ลบ IncomeExpense ที่ link กับ Disbursement นี้ด้วย
    await IncomeExpense.deleteOne(
      { disbursementId: id, companyId: req.user.companyId },
      { session }
    );

    // คืนสถานะ OPO → unpaid
    await OPO.findByIdAndUpdate(doc.opoId, { status: "unpaid" }, { session });

    await Disbursement.deleteOne({ _id: id }).session(session);

    await session.commitTransaction();
    session.endSession();

    return res.json({ message: "ລຶບສຳເລັດ", deletedId: id });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
