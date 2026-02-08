import express from "express";
import Account_document from "../../models/accouting_system_models/Account_document.js";
import { authenticate } from "../../middleware/auth.js";
import JournalEntry from "../../models/accouting_system_models/journalEntry_models.js";
import OpeningBalance from "../../models/accouting_system_models/OpeningBalance.js";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import { body, param, validationResult } from "express-validator";

const router = express.Router();

// ========================
// CONSTANTS & CONFIGURATION
// ========================
const VALID_TYPES = ["asset", "liability", "equity", "income", "expense"];
const MAX_CODE_LENGTH = 20;
const MAX_NAME_LENGTH = 255;
const MAX_CATEGORY_LENGTH = 100;
const RESTRICTED_PARENT_CODES = ["321", "329", "331", "339"];
// ========================
// RATE LIMITING
// ========================
const createAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // จำกัด 50 requests ต่อ 15 นาที
  message: "ສ້າງບັນຊີຫຼາຍເກີນໄປ, ກະລຸນາລອງໃໝ່ໃນພາຍຫຼັງ",
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "ຄຳຮ້ອງຂໍຫຼາຍເກີນໄປ, ກະລຸນາລອງໃໝ່ໃນພາຍຫຼັງ",
});

// ========================
// VALIDATION MIDDLEWARE
// ========================
const validateCreateAccount = [
  body("code")
    .trim()
    .notEmpty()
    .withMessage("ກະລຸນາລະບຸລະຫັດບັນຊີ")
    .isLength({ max: MAX_CODE_LENGTH })
    .withMessage(`ລະຫັດບັນຊີຕ້ອງບໍ່ເກີນ ${MAX_CODE_LENGTH} ຕົວອັກສອນ`)
    .matches(/^[a-zA-Z0-9\-._]+$/)
    .withMessage("ລະຫັດບັນຊີມີຕົວອັກສອນທີ່ບໍ່ຖືກຕ້ອງ"),

  body("name")
    .trim()
    .notEmpty()
    .withMessage("ກະລຸນາລະບຸຊື່ບັນຊີ")
    .isLength({ max: MAX_NAME_LENGTH })
    .withMessage(`ຊື່ບັນຊີຕ້ອງບໍ່ເກີນ ${MAX_NAME_LENGTH} ຕົວອັກສອນ`),

  body("type")
    .trim()
    .notEmpty()
    .withMessage("ກະລຸນາເລືອກປະເພດບັນຊີ")
    .isIn(VALID_TYPES)
    .withMessage("ປະເພດບັນຊີບໍ່ຖືກຕ້ອງ"),

  body("parentCode")
    .optional()
    .trim()
    .isLength({ max: MAX_CODE_LENGTH })
    .withMessage(`ລະຫັດບັນຊີແມ່ຕ້ອງບໍ່ເກີນ ${MAX_CODE_LENGTH} ຕົວອັກສອນ`),

  body("category")
    .optional()
    .trim()
    .isLength({ max: MAX_CATEGORY_LENGTH })
    .withMessage(`ໝວດໝູ່ຕ້ອງບໍ່ເກີນ ${MAX_CATEGORY_LENGTH} ຕົວອັກສອນ`),

  body("normalSide")
    .optional()
    .trim()
    .isIn(["debit", "credit"])
    .withMessage("normalSide ຕ້ອງເປັນ debit ຫຼື credit ເທົ່ານັ້ນ"),
];

const validateUpdateAccount = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("ກະລຸນາລະບຸ ID")
    .isMongoId()
    .withMessage("ID ບໍ່ຖືກຕ້ອງ"),
  ...validateCreateAccount,
];

const validateAccountId = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("ກະລຸນາລະບຸ ID")
    .isMongoId()
    .withMessage("ID ບໍ່ຖືກຕ້ອງ"),
];

// ========================
// HELPER FUNCTIONS
// ========================
const checkAuth = (req, res) => {
  const userId = req.user?._id;
  const companyId = req.user?.companyId;

  if (!companyId || !userId) {
    res.status(401).json({
      success: false,
      error: "ກະລຸນາເຂົ້າສູ່ລະບົບກ່ອນ",
    });
    return false;
  }
  return true;
};

const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  return null;
};

const sanitizeInput = (data) => {
  // ลบ NoSQL injection characters
  return mongoSanitize.sanitize(data);
};

// ========================
// ROUTES
// ========================

/**
 * 1) CREATE — เพิ่มบัญชีหลักหรือบัญชีย่อย
 */
router.post(
  "/create",
  authenticate,
  createAccountLimiter,
  validateCreateAccount,
  async (req, res) => {
    try {
      // ตรวจสอบ validation errors
      const validationError = handleValidationErrors(req, res);
      if (validationError) return;

      // ตรวจสอบ authentication
      if (!checkAuth(req, res)) return;

      const {
        code,
        name,
        type,
        parentCode,
        normalSide,
        category,
      } = sanitizeInput(req.body);
      const userId = req.user._id;
      const companyId = req.user.companyId;
      // ========================
      // ✅ BLOCK SUBACCOUNT UNDER 321/329
      // ========================
      if (parentCode && RESTRICTED_PARENT_CODES.includes(parentCode)) {
        return res.status(403).json({
          success: false,
          error: `ບໍ່ອະນຸຍາດໃຫ້ສ້າງບັນຊີຍ່ອຍພາຍໃຕ້ ${parentCode} (ກຳໄລ/ຂາດ)`,
        });
      }
      // Normalize
      const accountCode = String(code).trim();
      const accountCategory = String(category || "").trim();

      // ตรวจสอบรหัสซ้ำ (ป้องกัน race condition ด้วย unique index ใน model)
      const existingAccount = await Account_document.findOne({
        code: accountCode,
        companyId: companyId,
      })
        .select("_id")
        .lean();

      if (existingAccount) {
        return res.status(409).json({
          success: false,
          error: "ເລກບັນຊີນີ້ມີແລ້ວ ກະລຸນາລະບຸເລກບັນຊີອື່ນ",
        });
      }

      // ตรวจสอบ parent account (ถ้ามี)
      if (parentCode) {
        const parentExists = await Account_document.findOne({
          code: parentCode,
          companyId: companyId,
        })
          .select("_id")
          .lean();

        if (!parentExists) {
          return res.status(400).json({
            success: false,
            error: "ບັນຊີແມ່ທີ່ລະບຸບໍ່ມີຢູ່ໃນລະບົບ",
          });
        }
      }

      // ตรวจสอบกฎเฉพาะสำหรับต้นทุนขาย
      if (
        ["ຕົ້ນທຸນຂາຍ", "ຕົ້ນທຸນຈຳຫນ່າຍ", "ຕົ້ນທຸນບໍລິຫານ"].includes(
          accountCategory
        ) &&
        !accountCode.startsWith("6")
      ) {
        return res.status(400).json({
          success: false,
          error:
            "ຖ້າເລືອກ 'ຕົ້ນທຶນຂາຍ' ລະຫັດບັນຊີຕ້ອງຂຶ້ນຕົ້ນດ້ວຍ 6 ເທົ່ານັ້ນ. ຖ້າຕ້ອງການລົງເລກບັນຊີອື່ນທີ່ບໍ່ແມ່ນຫຼັກ 6 ກະລຸນາເລືອກ 'ອື່ນໆ'",
        });
      }

      // สร้างบัญชีใหม่
      const acc = await Account_document.create({
        companyId,
        userId,
        code: accountCode,
        name: name.trim(),
        type,
        parentCode: parentCode || null,
        normalSide,
        category: accountCategory,
      });

      // ส่งกลับเฉพาะข้อมูลที่จำเป็น (ไม่ส่ง sensitive data)
      res.status(201).json({
        success: true,
        account: {
          _id: acc._id,
          code: acc.code,
          name: acc.name,
          type: acc.type,
          parentCode: acc.parentCode,
          category: acc.category,
        },
      });
    } catch (err) {
      console.error("Create account error:", err);
      res.status(500).json({
        success: false,
        error: "ເກີດຂໍ້ຜິດພາດໃນການສ້າງບັນຊີ",
      });
    }
  }
);

/**
 * 2) GET ALL — ดึงบัญชีทั้งหมดของบริษัท
 */
router.get("/", authenticate, generalLimiter, async (req, res) => {
  try {
    if (!checkAuth(req, res)) return;

    const companyId = req.user.companyId;

    // ใช้ lean() เพื่อ performance และ select เฉพาะ fields ที่ต้องการ
    const accounts = await Account_document.find({ companyId })
      .select("-__v -userId") // ไม่ส่ง version key และ userId
      .sort({ code: 1 })
      .lean();

    res.json({ success: true, accounts });
  } catch (err) {
    console.error("Get accounts error:", err);
    res.status(500).json({
      success: false,
      error: "ເກີດຂໍ້ຜິດພາດໃນການດຶງຂໍ້ມູນ",
    });
  }
});

/**
 * 3) UPDATE — แก้ไขบัญชี
 */
router.patch(
  "/:id",
  authenticate,
  generalLimiter,
  validateUpdateAccount,
  async (req, res) => {
    try {
      const validationError = handleValidationErrors(req, res);
      if (validationError) return;

      if (!checkAuth(req, res)) return;

      const { id } = req.params;
      const {
        code,
        name,
        type,
        parentCode,
        normalSide,
        category,
      } = sanitizeInput(req.body);
      const companyId = req.user.companyId;

      // Normalize
      const accountCode = String(code).trim();
      const accountCategory = String(category || "").trim();

      // ตรวจสอบว่าบัญชีนี้เป็นของบริษัทนี้จริง
      const existingAccount = await Account_document.findOne({
        _id: id,
        companyId,
      }).lean();

      if (!existingAccount) {
        return res.status(404).json({
          success: false,
          error: "ບໍ່ພົບບັນຊີທີ່ຕ້ອງການແກ້ໄຂ",
        });
      }

      // ตรวจสอบรหัสซ้ำ (ยกเว้นตัวเอง)
      const duplicate = await Account_document.findOne({
        companyId,
        code: accountCode,
        _id: { $ne: id },
      })
        .select("_id")
        .lean();

      if (duplicate) {
        return res.status(409).json({
          success: false,
          error: "ເລກບັນຊີນີ້ມີແລ້ວ ກະລຸນາລະບຸເລກບັນຊີອື່ນ",
        });
      }

      // ตรวจสอบ parent account (ถ้ามี)
      if (parentCode) {
        const parentExists = await Account_document.findOne({
          code: parentCode,
          companyId,
        })
          .select("_id")
          .lean();

        if (!parentExists) {
          return res.status(400).json({
            success: false,
            error: "ບັນຊີແມ່ທີ່ລະບຸບໍ່ມີຢູ່ໃນລະບົບ",
          });
        }

        // ป้องกันการตั้ง parent เป็นตัวเอง
        if (parentCode === accountCode) {
          return res.status(400).json({
            success: false,
            error: "ບໍ່ສາມາດຕັ້ງບັນຊີແມ່ເປັນຕົວເອງໄດ້",
          });
        }
      }

      // ตรวจสอบกฎเฉพาะสำหรับต้นทุนขาย
      if (
        ["ຕົ້ນທຸນຂາຍ", "ຕົ້ນທຸນຈຳຫນ່າຍ", "ຕົ້ນທຸນບໍລິຫານ"].includes(
          accountCategory
        ) &&
        !accountCode.startsWith("6")
      ) {
        return res.status(400).json({
          success: false,
          error:
            "ຖ້າເລືອກ 'ຕົ້ນທຶນຂາຍ' ລະຫັດບັນຊີຕ້ອງຂຶ້ນຕົ້ນດ້ວຍ 6 ເທົ່ານັ້ນ. ຖ້າຕ້ອງການລົງເລກບັນຊີອື່ນທີ່ບໍ່ແມ່ນຫຼັກ 6 ກະລຸນາເລືອກ 'ອື່ນໆ'",
        });
      }

      // อัพเดตบัญชี
      const account = await Account_document.findOneAndUpdate(
        { _id: id, companyId },
        {
          code: accountCode,
          name: name.trim(),
          type,
          parentCode: parentCode || null,
          normalSide,
          category: accountCategory,
        },
        { new: true, runValidators: true }
      ).select("-__v -userId");

      res.json({ success: true, account });
    } catch (err) {
      console.error("Update account error:", err);
      res.status(500).json({
        success: false,
        error: "ເກີດຂໍ້ຜິດພາດໃນການແກ້ໄຂບັນຊີ",
      });
    }
  }
);

/**
 * 4) GET TREE — ดึงผังบัญชีแบบ Tree View
 */
router.get("/tree", authenticate, generalLimiter, async (req, res) => {
  try {
    if (!checkAuth(req, res)) return;

    const companyId = req.user.companyId;

    const list = await Account_document.find({ companyId })
      .select("-__v -userId")
      .lean();

    const map = {};
    list.forEach((acc) => {
      map[acc.code] = { ...acc, children: [] };
    });

    const tree = [];

    list.forEach((acc) => {
      if (acc.parentCode && map[acc.parentCode]) {
        map[acc.parentCode].children.push(map[acc.code]);
      } else if (!acc.parentCode) {
        tree.push(map[acc.code]);
      }
    });

    res.json({ success: true, tree });
  } catch (err) {
    console.error("Get tree error:", err);
    res.status(500).json({
      success: false,
      error: "ເກີດຂໍ້ຜິດພາດໃນການດຶງຂໍ້ມູນ",
    });
  }
});

/**
 * 5) DELETE — ลบบัญชีย่อย
 */
router.delete(
  "/account-document/:id",
  authenticate,
  generalLimiter,
  validateAccountId,
  async (req, res) => {
    try {
      const validationError = handleValidationErrors(req, res);
      if (validationError) return;

      if (!checkAuth(req, res)) return;

      const { id } = req.params;
      const companyId = req.user.companyId;

      // ตรวจสอบว่าบัญชีมีอยู่และเป็นของบริษัทนี้
      const account = await Account_document.findOne({
        _id: id,
        companyId,
      }).lean();
      // ========================
      // ✅ PROTECT RETAINED EARNINGS
      // ========================
      if (RESTRICTED_PARENT_CODES.includes(account.code)) {
        return res.status(403).json({
          success: false,
          error: "ບໍ່ສາມາດລົບບັນຊີກຳໄລ/ຂາດທຶນສະສົມໄດ້",
        });
      }
      if (!account) {
        return res.status(404).json({
          success: false,
          error: "ບໍ່ພົບບັນຊີທີ່ຕ້ອງການລົບ",
        });
      }

      // กันลบบัญชีหลัก
      if (account.parentCode === null) {
        return res.status(403).json({
          success: false,
          error: "ບໍ່ສາມາດລົບເລກບັນຊີຫຼັກໄດ້",
        });
      }

      // ตรวจสอบว่ามีบัญชีลูกหรือไม่
      const hasChildren = await Account_document.exists({
        parentCode: account.code,
        companyId,
      });

      if (hasChildren) {
        return res.status(400).json({
          success: false,
          error: "ບໍ່ສາມາດລົບໄດ້ ເພາະບັນຊີນີ້ມີບັນຊີຍ່ອຍ",
        });
      }

      // ตรวจสอบ Opening Balance
      const hasOpeningBalance = await OpeningBalance.exists({
        accountId: id,
        companyId,
      });

      if (hasOpeningBalance) {
        return res.status(400).json({
          success: false,
          error: "ບໍ່ສາມາດລົບໄດ້ ເພາະເລກບັນຊີນີ້ມີຢູ່ໃນຍອກຍົກມາ",
        });
      }

      // ตรวจสอบการใช้งานใน Journal
      const usedInJournal = await JournalEntry.exists({
        "lines.accountId": id,
        companyId,
      });

      if (usedInJournal) {
        return res.status(400).json({
          success: false,
          error: "ບໍ່ສາມາດລົບໄດ້ ເພາະເລກບັນຊີນີ້ມີຢູ່ໃນປື້ມປະຈຳວັນ",
        });
      }

      // ลบบัญชี
      await Account_document.findOneAndDelete({ _id: id, companyId });

      res.json({
        success: true,
        message: "ລົບສຳເລັດແລ້ວ",
      });
    } catch (err) {
      console.error("Delete account error:", err);
      res.status(500).json({
        success: false,
        error: "ເກີດຂໍ້ຜິດພາດໃນການລົບບັນຊີ",
      });
    }
  }
);

export default router;

// /**
//  * 5) DELETE — ลบบัญชี (เช็คก่อนว่ามีลูกไหม)
//  */
// router.delete("/:id", authenticate, async (req, res) => {
//   try {
//     const acc = await Account_document.findById(req.params.id);
//     if (!acc) return res.status(404).json({ error: "ไม่พบบัญชี" });

//     // ตรวจสอบว่ามีบัญชีย่อยไหม
//     const child = await Account_document.findOne({
//       parentCode: acc.code,
//       companyId: acc.companyId,
//     });

//     if (child) {
//       return res.status(400).json({
//         success: false,
//         error: "ลบไม่ได้: ยังมีบัญชีย่อยอยู่",
//       });
//     }

//     await acc.deleteOne();

//     res.json({ success: true, message: "ลบสำเร็จ" });
//   } catch (err) {
//     res.status(400).json({ success: false, error: err.message });
//   }
// });
// /**
//  * 3) CREATE CHILD ACCOUNT — เพิ่มบัญชีย่อย
//  */
// router.post("/create-child", authenticate, async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const companyId = req.user.companyId;
//     if (!companyId && !userId) {
//       return res.status(400).json({
//         error: "please login before",
//       });
//     }
//     const { parentCode, code, name, type, normalSide, category } = req.body;
//     if (!code || !name || !type) {
//       return res.status(400).json({ error: "Missing required fields" });
//     }

//     const exists = await Account_document.findOne({
//       companyId,
//       code,
//     });

//     if (exists) {
//       return res.status(409).json({ error: "Account code already exists" });
//     }
//     // ตรวจสอบว่าบัญชีหลักมีจริง
//     const parent = await Account_document.findOne({
//       companyId: req.user.companyId,
//       code: parentCode,
//     });

//     if (!parent) {
//       return res.status(400).json({
//         success: false,
//         error: "ไม่พบบัญชีหลัก (parentCode)",
//       });
//     }

//     const account = await Account_document.create({
//       companyId: req.user.companyId,
//       parentCode,
//       code,
//       name,
//       type: type || parent.type,
//       normalSide,
//       category,
//     });

//     res.json({ success: true, account });
//   } catch (err) {
//     res.status(400).json({ success: false, error: err.message });
//   }
// });
