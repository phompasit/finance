// import express from "express";
// import Account_document from "../../models/accouting_system_models/Account_document.js";
// import { authenticate } from "../../middleware/auth.js";
// import JournalEntry from "../../models/accouting_system_models/journalEntry_models.js";
// import OpeningBalance from "../../models/accouting_system_models/OpeningBalance.js";
// import rateLimit, { ipKeyGenerator } from "express-rate-limit";
// import mongoSanitize from "express-mongo-sanitize";
// import { body, param, validationResult } from "express-validator";
// import {
//   DEFAULT_ACCOUNT_CODES,
//   getCurrentDepth,
//   getDepthLimit,
// } from "../../utils/accountCode.js";

// const router = express.Router();

// // ========================
// // CONSTANTS & CONFIGURATION
// // ========================
 const VALID_TYPES = ["asset", "liability", "equity", "income", "expense"];
 const MAX_CODE_LENGTH = 20;
 const MAX_NAME_LENGTH = 255;
 const MAX_CATEGORY_LENGTH = 100;
 const RESTRICTED_PARENT_CODES = [
   "321",
   "1011",
   "329",
   "331",
   "339",
  //  "1391",
  //  "1392",
  //  "1394",
  //  "1395",
  //  "1396",
  //  "1397",
  //  "1398",
  //  "301",
  //  "302",
   "303",
   "308",
   "309",
   "311",
   "312",
  //  "4041",
  //  "4042",
  //  "4043",
  //  "405",
  //  "408",
  //  "4031",
  //  "4032",
  //  "4201",
  //  "4202",
  //  "4203",
  //  "4204",
  //  "4205",
  //  "4206",
  //  "4207",
  //  "4208",
  //  "4211",
  //  "4212",
  //  "4213",
  //  "4218",
  //  "4221",
  //  "4222",
  //  "4226",
  //  "4228",
  //  "430",
  //  "431",
  //  "432",
  //  "433",
  //  "434",
  //  "435",
  //  "436",
  //  "437",
  //  "438",
  //  "441",
  //  "442",
  //  "443",
  //  "447",
  //  "448",
  //  "451",
  //  "452",
  //  "453",
  //  "454",
  //  "455",
  //  "456",
  //  "457",
  //  "458",
  //  "461",
  //  "462",
  //  "463",
  //  "464",
  //  "465",
  //  "466",
  //  "468",
  //  "471",
  //  "472",
  //  "473",
  //  "474",
  //  "475",
  //  "477",
  //  "478",
  //  "4811",
  //  "4812",
  //  "4813",
  //  "4816",
  //  "4818",
  //  "4821",
  //  "4822",
  //  "4829",
  //  "4911",
  //  "4912",
  //  "4913",
  //  "4914",
  //  "4915",
  //  "492",
  //  "493",
  //  "494",
  //  "495",
  //  "496",
  //  "497",
  //  "498",
  //  "501",
  //  "506",
  //  "507",
  //  "511",
  //  "512",
  //  "518",
  //  "581",
  //  "582",
  //  "583",
 ];
  // ========================
  // RATE LIMITING
  // ========================
 const createAccountLimiter = rateLimit({
   windowMs: 15 * 60 * 1000,  //15 minutes
   max: 50, // จำกัด 50 requests ต่อ 15 นาที
  message: "ສ້າງບັນຊີຫຼາຍເກີນໄປ, ກະລຸນາລອງໃໝ່ໃນພາຍຫຼັງ",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?._id ?? ipKeyGenerator(req.ip); // ✅ wrap req.ip
  },
 });

 const generalLimiter = rateLimit({
   windowMs: 15 * 60 * 1000,
   max: 100,
   message: "ຄຳຮ້ອງຂໍຫຼາຍເກີນໄປ, ກະລຸນາລອງໃໝ່ໃນພາຍຫຼັງ",
   keyGenerator: (req) => {
     return req.user?._id ?? ipKeyGenerator(req.ip);  //✅ wrap req.ip
   },
 });

// // ========================
// // VALIDATION MIDDLEWARE
// // ========================
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

// // ========================
// // HELPER FUNCTIONS
// // ========================
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

// // ========================
// // ROUTES
// // ========================

// /**
//  * 1) CREATE — เพิ่มบัญชีหลักหรือบัญชีย่อย
//  */
// router.post(
//   "/create",
//   authenticate,
//   createAccountLimiter,
//   validateCreateAccount,
//   async (req, res) => {
//     try {
//       // ตรวจสอบ validation errors
//       const validationError = handleValidationErrors(req, res);
//       if (validationError) return;

//       // ตรวจสอบ authentication
//       if (!checkAuth(req, res)) return;

//       const {
//         code,
//         name,
//         type,
//         parentCode,
//         normalSide,
//         category,
//       } = sanitizeInput(req.body);
//       const userId = req.user._id;
//       const companyId = req.user.companyId;
//       // ========================
//       // ✅ BLOCK SUBACCOUNT UNDER 321/329
//       // ========================
//       if (parentCode && RESTRICTED_PARENT_CODES.includes(parentCode)) {
//         return res.status(403).json({
//           success: false,
//           error: `ບໍ່ອະນຸຍາດໃຫ້ສ້າງບັນຊີຍ່ອຍພາຍໃຕ້ ${parentCode}`,
//         });
//       }
//       ////
//       // ========================
//       // ✅ ตรวจสอบ Depth Limit
//       // ========================
//       if (parentCode) {
//         // หาว่า parentCode อยู่ใต้ root ที่มี depth limit ไหม
//         const depthConfig = getDepthLimit(parentCode);

//         if (depthConfig !== null) {
//           // นับว่า parentCode อยู่ระดับที่เท่าไหร่จาก root
//           const currentDepth = await getCurrentDepth(
//             parentCode,
//             companyId,
//             Account_document
//           );

//           // currentDepth = ระดับที่ parent อยู่
//           // ถ้าสร้างลูกเพิ่ม จะเป็น currentDepth + 1
//           if (currentDepth + 1 > depthConfig.maxDepth) {
//             return res.status(403).json({
//               success: false,
//               error: `ບໍ່ອະນຸຍາດໃຫ້ສ້າງບັນຊີຍ່ອຍເກີນ ${depthConfig.maxDepth} ລະດັບ ພາຍໃຕ້ ${depthConfig.rootCode}`,
//             });
//           }
//         }
//       }

//       ////
//       // Normalize
//       const accountCode = String(code).trim();
//       const accountCategory = String(category || "").trim();

//       // ตรวจสอบรหัสซ้ำ (ป้องกัน race condition ด้วย unique index ใน model)
//       const existingAccount = await Account_document.findOne({
//         code: accountCode,
//         companyId: companyId,
//       })
//         .select("_id")
//         .lean();

//       if (existingAccount) {
//         return res.status(409).json({
//           success: false,
//           error: "ເລກບັນຊີນີ້ມີແລ້ວ ກະລຸນາລະບຸເລກບັນຊີອື່ນ",
//         });
//       }

//       // ตรวจสอบ parent account (ถ้ามี)
//       if (parentCode) {
//         const parentExists = await Account_document.findOne({
//           code: parentCode,
//           companyId: companyId,
//         })
//           .select("_id")
//           .lean();

//         if (!parentExists) {
//           return res.status(400).json({
//             success: false,
//             error: "ບັນຊີແມ່ທີ່ລະບຸບໍ່ມີຢູ່ໃນລະບົບ",
//           });
//         }
//       }

//       // ตรวจสอบกฎเฉพาะสำหรับต้นทุนขาย
//       if (
//         ["ຕົ້ນທຸນຂາຍ", "ຕົ້ນທຸນຈຳຫນ່າຍ", "ຕົ້ນທຸນບໍລິຫານ"].includes(
//           accountCategory
//         ) &&
//         !accountCode.startsWith("6")
//       ) {
//         return res.status(400).json({
//           success: false,
//           error:
//             "ຖ້າເລືອກ 'ຕົ້ນທຶນຂາຍ' ລະຫັດບັນຊີຕ້ອງຂຶ້ນຕົ້ນດ້ວຍ 6 ເທົ່ານັ້ນ. ຖ້າຕ້ອງການລົງເລກບັນຊີອື່ນທີ່ບໍ່ແມ່ນຫຼັກ 6 ກະລຸນາເລືອກ 'ອື່ນໆ'",
//         });
//       }

//       // สร้างบัญชีใหม่
//       const acc = await Account_document.create({
//         companyId,
//         userId,
//         code: accountCode,
//         name: name.trim(),
//         type,
//         parentCode: parentCode || null,
//         normalSide,
//         category: accountCategory,
//       });

//       // ส่งกลับเฉพาะข้อมูลที่จำเป็น (ไม่ส่ง sensitive data)
//       res.status(201).json({
//         success: true,
//         account: {
//           _id: acc._id,
//           code: acc.code,
//           name: acc.name,
//           type: acc.type,
//           parentCode: acc.parentCode,
//           category: acc.category,
//         },
//       });
//     } catch (err) {
//       console.error("Create account error:", err);
//       res.status(500).json({
//         success: false,
//         error: "ເກີດຂໍ້ຜິດພາດໃນການສ້າງບັນຊີ",
//       });
//     }
//   }
// );

// /**
//  * 2) GET ALL — ดึงบัญชีทั้งหมดของบริษัท
//  */
// router.get("/", authenticate, generalLimiter, async (req, res) => {
//   try {
//     if (!checkAuth(req, res)) return;

//     const companyId = req.user.companyId;

//     // ใช้ lean() เพื่อ performance และ select เฉพาะ fields ที่ต้องการ
//     const accounts = await Account_document.find({ companyId })
//       .select("-__v -userId") // ไม่ส่ง version key และ userId
//       .sort({ code: 1 })
//       .lean();

//     res.json({ success: true, accounts });
//   } catch (err) {
//     console.error("Get accounts error:", err);
//     res.status(500).json({
//       success: false,
//       error: "ເກີດຂໍ້ຜິດພາດໃນການດຶງຂໍ້ມູນ",
//     });
//   }
// });

// /**
//  * 3) UPDATE — แก้ไขบัญชี
//  */
// router.patch(
//   "/:id",
//   authenticate,
//   generalLimiter,
//   validateUpdateAccount,
//   async (req, res) => {
//     try {
//       const validationError = handleValidationErrors(req, res);
//       if (validationError) return;

//       if (!checkAuth(req, res)) return;

//       const { id } = req.params;
//       const {
//         code,
//         name,
//         type,
//         parentCode,
//         normalSide,
//         category,
//       } = sanitizeInput(req.body);
//       const companyId = req.user.companyId;

//       // Normalize
//       const accountCode = String(code).trim();
//       const accountCategory = String(category || "").trim();

//       // ✅ 1. ตรวจสอบว่าบัญชีนี้เป็นของบริษัทนี้จริง
//       const existingAccount = await Account_document.findOne({
//         _id: id,
//         companyId,
//       }).lean();

//       if (!existingAccount) {
//         return res.status(404).json({
//           success: false,
//           error: "ບໍ່ພົບບັນຊີທີ່ຕ້ອງການແກ້ໄຂ",
//         });
//       }

//       // ✅ 2. DEFAULT account: เช็ค hasOtherChanges ผ่าน block นี้
//       if (DEFAULT_ACCOUNT_CODES.has(accountCode)) {
//         const incomingName = name?.trim() ?? existingAccount.name;
//         const incomingType = type ?? existingAccount.type;
//         const incomingCode = code ?? existingAccount.code;
//         const incomingParent =
//           parentCode !== undefined
//             ? parentCode?.trim() || null
//             : existingAccount.parentCode;
//         const incomingNormalSide = normalSide ?? existingAccount.normalSide;

//         const hasOtherChanges =
//           incomingName !== existingAccount.name ||
//           incomingType !== existingAccount.type ||
//           incomingCode !== existingAccount.code ||
//           incomingParent !== (existingAccount.parentCode || null) ||
//           incomingNormalSide !== existingAccount.normalSide;

//         const LOCKED_CATEGORY_PREFIXES = [
//           "65",
//           "66",
//           "67",
//           "694",
//           "699",
//           "691",
//         ];
//         const isCategoryLocked = LOCKED_CATEGORY_PREFIXES.some((prefix) =>
//           accountCode.startsWith(prefix)
//         );

//         if (isCategoryLocked) {
//           const incomingCategory = category ?? existingAccount.category;
//           if (incomingCategory !== existingAccount.category) {
//             return res.status(403).json({
//               success: false,
//               error: "ບໍ່ສາມາດແກ້ໄຂ Category ຂອງບັນຊີນີ້ໄດ້",
//             });
//           }
//         }

//         if (hasOtherChanges) {
//           return res.status(403).json({
//             success: false,
//             error:
//               "ບໍ່ສາມາດອັບເດດບັນຊີເລີ່ມຕົ້ນ (Default) ໄດ້ (ສາມາດແກ້ໄຂໄດ້ສະເພາະ Category)",
//           });
//         }
//       }

//       // ✅ 3. NON-DEFAULT account: ห้ามแก้ code และ parentCode
//       // ✅ 3. NON-DEFAULT account: ห้ามแก้ code และ parentCode (ยกเว้น level 5)
//       if (!DEFAULT_ACCOUNT_CODES.has(accountCode)) {
//         const isLevel5 = existingAccount.level === 5;

//         if (!isLevel5) {
//           if (existingAccount.code !== accountCode) {
//             return res.status(403).json({
//               success: false,
//               error: "ບໍ່ສາມາດແກ້ໄຂລະຫັດບັນຊີໄດ້",
//             });
//           }

//           const incomingParent =
//             parentCode !== undefined
//               ? parentCode?.trim() || null
//               : existingAccount.parentCode;

//           if (incomingParent !== (existingAccount.parentCode || null)) {
//             return res.status(403).json({
//               success: false,
//               error: "ບໍ່ສາມາດແກ້ໄຂ parentCode ຂອງບັນຊີນີ້ໄດ້",
//             });
//           }
//         }
//       }

//       // ✅ 4. ตรวจสอบรหัสซ้ำ (ยกเว้นตัวเอง)
//       const duplicate = await Account_document.findOne({
//         companyId,
//         code: accountCode,
//         _id: { $ne: id },
//       })
//         .select("_id")
//         .lean();

//       if (duplicate) {
//         return res.status(409).json({
//           success: false,
//           error: "ເລກບັນຊີນີ້ມີແລ້ວ ກະລຸນາລະບຸເລກບັນຊີອື່ນ",
//         });
//       }

//       // ✅ 5. ตรวจสอบ parent account (ถ้ามี)
//       if (parentCode) {
//         const parentExists = await Account_document.findOne({
//           code: parentCode,
//           companyId,
//         })
//           .select("_id")
//           .lean();

//         if (!parentExists) {
//           return res.status(400).json({
//             success: false,
//             error: "ບັນຊີແມ່ທີ່ລະບຸບໍ່ມີຢູ່ໃນລະບົບ",
//           });
//         }

//         if (parentCode === accountCode) {
//           return res.status(400).json({
//             success: false,
//             error: "ບໍ່ສາມາດຕັ້ງບັນຊີແມ່ເປັນຕົວເອງໄດ້",
//           });
//         }
//       }

//       // ✅ 6. ตรวจสอบกฎเฉพาะสำหรับต้นทุนขาย
//       if (
//         ["ຕົ້ນທຸນຂາຍ", "ຕົ້ນທຸນຈຳຫນ່າຍ", "ຕົ້ນທຸນບໍລິຫານ"].includes(
//           accountCategory
//         ) &&
//         !accountCode.startsWith("6")
//       ) {
//         return res.status(400).json({
//           success: false,
//           error:
//             "ຖ້າເລືອກ 'ຕົ້ນທຶນຂາຍ' ລະຫັດບັນຊີຕ້ອງຂຶ້ນຕົ້ນດ້ວຍ 6 ເທົ່ານັ້ນ. ຖ້າຕ້ອງການລົງເລກບັນຊີອື່ນທີ່ບໍ່ແມ່ນຫຼັກ 6 ກະລຸນາເລືອກ 'ອື່ນໆ'",
//         });
//       }

//       // ✅ 7. อัพเดตบัญชี
//       const updateFields = DEFAULT_ACCOUNT_CODES.has(accountCode)
//         ? { category: accountCategory }
//         : {
//             code: accountCode,
//             name: name.trim(),
//             type,
//             parentCode: parentCode || null,
//             normalSide,
//             category: accountCategory,
//           };

//       const account = await Account_document.findOneAndUpdate(
//         { _id: id, companyId },
//         updateFields,
//         { new: true, runValidators: true }
//       ).select("-__v -userId");

//       res.json({ success: true, account });
//     } catch (err) {
//       console.error("Update account error:", err);
//       res.status(500).json({
//         success: false,
//         error: "ເກີດຂໍ້ຜິດພາດໃນການແກ້ໄຂບັນຊີ",
//       });
//     }
//   }
// );

// /**
//  * 4) GET TREE — ดึงผังบัญชีแบบ Tree View
//  */
// router.get("/tree", authenticate, generalLimiter, async (req, res) => {
//   try {
//     if (!checkAuth(req, res)) return;

//     const companyId = req.user.companyId;

//     const list = await Account_document.find({ companyId })
//       .select("-__v -userId")
//       .lean();

//     const map = {};
//     list.forEach((acc) => {
//       map[acc.code] = { ...acc, children: [] };
//     });

//     const tree = [];

//     list.forEach((acc) => {
//       if (acc.parentCode && map[acc.parentCode]) {
//         map[acc.parentCode].children.push(map[acc.code]);
//       } else if (!acc.parentCode) {
//         tree.push(map[acc.code]);
//       }
//     });

//     res.json({ success: true, tree });
//   } catch (err) {
//     console.error("Get tree error:", err);
//     res.status(500).json({
//       success: false,
//       error: "ເກີດຂໍ້ຜິດພາດໃນການດຶງຂໍ້ມູນ",
//     });
//   }
// });

// /**
//  * 5) DELETE — ลบบัญชีย่อย
//  */
// // constants/restrictedAccounts.js

// // ใน route
// router.delete(
//   "/account-document/:id",
//   authenticate,
//   generalLimiter,
//   validateAccountId,
//   async (req, res) => {
//     try {
//       const validationError = handleValidationErrors(req, res);
//       if (validationError) return;

//       if (!checkAuth(req, res)) return;

//       const { id } = req.params;
//       const companyId = req.user.companyId;

//       // ✅ หา account ก่อนเสมอ
//       const account = await Account_document.findOne({
//         _id: id,
//         companyId,
//       }).lean();

//       if (!account) {
//         return res.status(404).json({
//           success: false,
//           error: "ບໍ່ພົບບັນຊີທີ່ຕ້ອງການລົບ",
//         });
//       }

//       // ✅ ป้องกันบัญชีที่อยู่ใน DEFAULT chart of accounts
//       if (DEFAULT_ACCOUNT_CODES.has(account.code)) {
//         return res.status(403).json({
//           success: false,
//           error: "ບໍ່ສາມາດລົບບັນຊີເລີ່ມຕົ້ນ (Default) ໄດ້",
//         });
//       }

//       // ตรวจสอบว่ามีบัญชีลูกหรือไม่
//       const hasChildren = await Account_document.exists({
//         parentCode: account.code,
//         companyId,
//       });

//       if (hasChildren) {
//         return res.status(400).json({
//           success: false,
//           error: "ບໍ່ສາມາດລົບໄດ້ ເພາະບັນຊີນີ້ມີບັນຊີຍ່ອຍ",
//         });
//       }

//       // ตรวจสอบ Opening Balance
//       const hasOpeningBalance = await OpeningBalance.exists({
//         accountId: id,
//         companyId,
//       });

//       if (hasOpeningBalance) {
//         return res.status(400).json({
//           success: false,
//           error: "ບໍ່ສາມາດລົບໄດ້ ເພາະເລກບັນຊີນີ້ມີຢູ່ໃນຍອກຍົກມາ",
//         });
//       }

//       // ตรวจสอบการใช้งานใน Journal
//       const usedInJournal = await JournalEntry.exists({
//         "lines.accountId": id,
//         companyId,
//       });

//       if (usedInJournal) {
//         return res.status(400).json({
//           success: false,
//           error: "ບໍ່ສາມາດລົບໄດ້ ເພາະເລກບັນຊີນີ້ມີຢູ່ໃນປື້ມປະຈຳວັນ",
//         });
//       }

//       await Account_document.findOneAndDelete({ _id: id, companyId });

//       res.json({
//         success: true,
//         message: "ລົບສຳເລັດແລ້ວ",
//       });
//     } catch (err) {
//       console.error("Delete account error:", err);
//       res.status(500).json({
//         success: false,
//         error: "ເກີດຂໍ້ຜິດພາດໃນການລົບບັນຊີ",
//       });
//     }
//   }
// );

// export default router;
import express from "express";
import Account_document from "../../models/accouting_system_models/Account_document.js";
import { authenticate } from "../../middleware/auth.js";
import JournalEntry from "../../models/accouting_system_models/journalEntry_models.js";
import OpeningBalance from "../../models/accouting_system_models/OpeningBalance.js";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import { body, param, validationResult } from "express-validator";
import {
  DEFAULT_ACCOUNT_CODES,
  getCurrentDepth,
  getDepthLimit,
} from "../../utils/accountCode.js";
import redis from "../../utils/redisClient.js"; // ✅ import redis client

const router = express.Router();

// ========================
// REDIS HELPERS
// ========================
const CACHE_TTL = 60 * 5; // 5 นาที

const cacheKey = {
  accounts: (companyId) => `accounts:${companyId}`,
  tree: (companyId) => `accounts:tree:${companyId}`,
};

const getCache = async (key) => {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null; // redis ล้มก็ยังทำงานได้
  }
};

const setCache = async (key, value, ttl = CACHE_TTL) => {
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttl);
  } catch {
    // ไม่ทำอะไรถ้า redis ล้ม
  }
};

const invalidateCache = async (companyId) => {
  try {
    await redis.del(cacheKey.accounts(companyId));
    await redis.del(cacheKey.tree(companyId));
  } catch {
    // ไม่ทำอะไรถ้า redis ล้ม
  }
};

// ... (CONSTANTS, RATE LIMITING, VALIDATION, HELPERS เหมือนเดิมทุกอย่าง)

// ========================
// ROUTES
// ========================

/**
 * 1) CREATE
 */
router.post(
  "/create",
  authenticate,
  createAccountLimiter,
  validateCreateAccount,
  async (req, res) => {
    try {
      const validationError = handleValidationErrors(req, res);
      if (validationError) return;
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

      if (parentCode && RESTRICTED_PARENT_CODES.includes(parentCode)) {
        return res.status(403).json({
          success: false,
          error: `ບໍ່ອະນຸຍາດໃຫ້ສ້າງບັນຊີຍ່ອຍພາຍໃຕ້ ${parentCode}`,
        });
      }

      if (parentCode) {
        const depthConfig = getDepthLimit(parentCode);
        if (depthConfig !== null) {
          const currentDepth = await getCurrentDepth(
            parentCode,
            companyId,
            Account_document
          );
          if (currentDepth + 1 > depthConfig.maxDepth) {
            return res.status(403).json({
              success: false,
              error: `ບໍ່ອະນຸຍາດໃຫ້ສ້າງບັນຊີຍ່ອຍເກີນ ${depthConfig.maxDepth} ລະດັບ ພາຍໃຕ້ ${depthConfig.rootCode}`,
            });
          }
        }
      }

      const accountCode = String(code).trim();
      const accountCategory = String(category || "").trim();

      const existingAccount = await Account_document.findOne({
        code: accountCode,
        companyId,
      })
        .select("_id")
        .lean();

      if (existingAccount) {
        return res.status(409).json({
          success: false,
          error: "ເລກບັນຊີນີ້ມີແລ້ວ ກະລຸນາລະບຸເລກບັນຊີອື່ນ",
        });
      }

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
      }

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

      // ✅ invalidate cache
      await invalidateCache(companyId);

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
      res
        .status(500)
        .json({ success: false, error: "ເກີດຂໍ້ຜິດພາດໃນການສ້າງບັນຊີ" });
    }
  }
);

/**
 * 2) GET ALL ✅ with Redis cache
 */
router.get("/", authenticate, generalLimiter, async (req, res) => {
  try {
    if (!checkAuth(req, res)) return;

    const companyId = req.user.companyId;
    const key = cacheKey.accounts(companyId);

    // ✅ ลอง cache ก่อน
    const cached = await getCache(key);
    if (cached) {
      return res.json({ success: true, accounts: cached, fromCache: true });
    }

    const accounts = await Account_document.find({ companyId })
      .select("-__v -userId")
      .sort({ code: 1 })
      .lean();

    // ✅ เก็บ cache
    await setCache(key, accounts);

    res.json({ success: true, accounts });
  } catch (err) {
    console.error("Get accounts error:", err);
    res
      .status(500)
      .json({ success: false, error: "ເກີດຂໍ້ຜິດພາດໃນການດຶງຂໍ້ມູນ" });
  }
});

/**
 * 3) UPDATE
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

      const accountCode = String(code).trim();
      const accountCategory = String(category || "").trim();

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

      if (DEFAULT_ACCOUNT_CODES.has(accountCode)) {
        const incomingName = name?.trim() ?? existingAccount.name;
        const incomingType = type ?? existingAccount.type;
        const incomingCode = code ?? existingAccount.code;
        const incomingParent =
          parentCode !== undefined
            ? parentCode?.trim() || null
            : existingAccount.parentCode;
        const incomingNormalSide = normalSide ?? existingAccount.normalSide;

        const hasOtherChanges =
          incomingName !== existingAccount.name ||
          incomingType !== existingAccount.type ||
          incomingCode !== existingAccount.code ||
          incomingParent !== (existingAccount.parentCode || null) ||
          incomingNormalSide !== existingAccount.normalSide;

        const LOCKED_CATEGORY_PREFIXES = [
          "65",
          "66",
          "67",
          "694",
          "699",
          "691",
        ];
        const isCategoryLocked = LOCKED_CATEGORY_PREFIXES.some((prefix) =>
          accountCode.startsWith(prefix)
        );

        if (isCategoryLocked) {
          const incomingCategory = category ?? existingAccount.category;
          if (incomingCategory !== existingAccount.category) {
            return res.status(403).json({
              success: false,
              error: "ບໍ່ສາມາດແກ້ໄຂ Category ຂອງບັນຊີນີ້ໄດ້",
            });
          }
        }

        if (hasOtherChanges) {
          return res.status(403).json({
            success: false,
            error:
              "ບໍ່ສາມາດອັບເດດບັນຊີເລີ່ມຕົ້ນ (Default) ໄດ້ (ສາມາດແກ້ໄຂໄດ້ສະເພາະ Category)",
          });
        }
      }

      if (!DEFAULT_ACCOUNT_CODES.has(accountCode)) {
        const isLevel5 = existingAccount.level === 5;

        if (!isLevel5) {
          if (existingAccount.code !== accountCode) {
            return res.status(403).json({
              success: false,
              error: "ບໍ່ສາມາດແກ້ໄຂລະຫັດບັນຊີໄດ້",
            });
          }

          const incomingParent =
            parentCode !== undefined
              ? parentCode?.trim() || null
              : existingAccount.parentCode;

          if (incomingParent !== (existingAccount.parentCode || null)) {
            return res.status(403).json({
              success: false,
              error: "ບໍ່ສາມາດແກ້ໄຂ parentCode ຂອງບັນຊີນີ້ໄດ້",
            });
          }
        }
      }

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

        if (parentCode === accountCode) {
          return res.status(400).json({
            success: false,
            error: "ບໍ່ສາມາດຕັ້ງບັນຊີແມ່ເປັນຕົວເອງໄດ້",
          });
        }
      }

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

      const updateFields = DEFAULT_ACCOUNT_CODES.has(accountCode)
        ? { category: accountCategory }
        : {
            code: accountCode,
            name: name.trim(),
            type,
            parentCode: parentCode || null,
            normalSide,
            category: accountCategory,
          };

      const account = await Account_document.findOneAndUpdate(
        { _id: id, companyId },
        updateFields,
        { new: true, runValidators: true }
      ).select("-__v -userId");

      // ✅ invalidate cache
      await invalidateCache(companyId);

      res.json({ success: true, account });
    } catch (err) {
      console.error("Update account error:", err);
      res
        .status(500)
        .json({ success: false, error: "ເກີດຂໍ້ຜິດພາດໃນການແກ້ໄຂບັນຊີ" });
    }
  }
);

/**
 * 4) GET TREE ✅ with Redis cache
 */
router.get("/tree", authenticate, generalLimiter, async (req, res) => {
  try {
    if (!checkAuth(req, res)) return;

    const companyId = req.user.companyId;
    const key = cacheKey.tree(companyId);

    // ✅ ลอง cache ก่อน
    const cached = await getCache(key);
    if (cached) {
      return res.json({ success: true, tree: cached, fromCache: true });
    }

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

    // ✅ เก็บ cache
    await setCache(key, tree);

    res.json({ success: true, tree });
  } catch (err) {
    console.error("Get tree error:", err);
    res
      .status(500)
      .json({ success: false, error: "ເກີດຂໍ້ຜິດພາດໃນການດຶງຂໍ້ມູນ" });
  }
});

/**
 * 5) DELETE
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

      const account = await Account_document.findOne({
        _id: id,
        companyId,
      }).lean();

      if (!account) {
        return res.status(404).json({
          success: false,
          error: "ບໍ່ພົບບັນຊີທີ່ຕ້ອງການລົບ",
        });
      }

      if (DEFAULT_ACCOUNT_CODES.has(account.code)) {
        return res.status(403).json({
          success: false,
          error: "ບໍ່ສາມາດລົບບັນຊີເລີ່ມຕົ້ນ (Default) ໄດ້",
        });
      }

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

      await Account_document.findOneAndDelete({ _id: id, companyId });

      // ✅ invalidate cache
      await invalidateCache(companyId);

      res.json({ success: true, message: "ລົບສຳເລັດແລ້ວ" });
    } catch (err) {
      console.error("Delete account error:", err);
      res
        .status(500)
        .json({ success: false, error: "ເກີດຂໍ້ຜິດພາດໃນການລົບບັນຊີ" });
    }
  }
);

export default router;
