import express from "express";
import Account_document from "../../models/accouting_system_models/Account_document.js";
import { authenticate } from "../../middleware/auth.js";

const router = express.Router();

/**
 * 1) CREATE — เพิ่มบัญชีหลักหรือบัญชีย่อย
 * body: { code, name, type, parentCode?, normalSide?, category? }
 */
router.post("/create", authenticate, async (req, res) => {
  try {
    const { code, name, type, parentCode, normalSide, category } = req.body;

    const acc = await Account_document.create({
      companyId: req.user.companyId,
      userId: req.user._id,
      code,
      name,
      type,
      parentCode: parentCode || null,
      normalSide,
      category,
    });

    res.json({ success: true, account: acc });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * 2) GET ALL — ดึงบัญชีทั้งหมดของบริษัท
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const accounts = await Account_document.find({
      companyId: req.user.companyId,
    }).sort({ code: 1 });

    res.json({ success: true, accounts });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * 3) CREATE CHILD ACCOUNT — เพิ่มบัญชีย่อย
 * body: { parentCode, code, name, type, normalSide? }
 */
router.post("/create-child", authenticate, async (req, res) => {
  try {
    const { parentCode, code, name, type, normalSide, category } = req.body;

    // ตรวจสอบว่าบัญชีหลักมีจริง
    const parent = await Account_document.findOne({
      companyId: req.user.companyId,
      code: parentCode,
    });

    if (!parent) {
      return res.status(400).json({
        success: false,
        error: "ไม่พบบัญชีหลัก (parentCode)",
      });
    }

    const account = await Account_document.create({
      companyId: req.user.companyId,
      parentCode,
      code,
      name,
      type: type || parent.type,
      normalSide,
      category,
    });

    res.json({ success: true, account });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * 4) UPDATE — แก้ไขบัญชี
 */
router.patch("/:id", authenticate, async (req, res) => {
  try {
    const account = await Account_document.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      req.body,
      { new: true }
    );

    res.json({ success: true, account });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * 5) DELETE — ลบบัญชี (เช็คก่อนว่ามีลูกไหม)
 */
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const acc = await Account_document.findById(req.params.id);
    if (!acc) return res.status(404).json({ error: "ไม่พบบัญชี" });

    // ตรวจสอบว่ามีบัญชีย่อยไหม
    const child = await Account_document.findOne({
      parentCode: acc.code,
      companyId: acc.companyId,
    });

    if (child) {
      return res.status(400).json({
        success: false,
        error: "ลบไม่ได้: ยังมีบัญชีย่อยอยู่",
      });
    }

    await acc.deleteOne();

    res.json({ success: true, message: "ลบสำเร็จ" });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * 6) GET TREE — ดึงผังบัญชีแบบ Tree View
 */
router.get("/tree", authenticate, async (req, res) => {
  try {
    const list = await Account_document.find({
      companyId: req.user.companyId,
    }).lean();

    const map = {};
    list.forEach((acc) => {
      map[acc.code] = { ...acc, children: [] };
    });

    const tree = [];

    list.forEach((acc) => {
      if (acc.parentCode) {
        map[acc.parentCode]?.children.push(map[acc.code]);
      } else {
        tree.push(map[acc.code]);
      }
    });

    res.json({ success: true, tree });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
