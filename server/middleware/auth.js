import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Session from "../models/Session.js";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

/* ===============================================
   🔒 AUTHENTICATE MIDDLEWARE (HARDENED)
   - ตรวจ JWT
   - ตรวจ sessionId (ป้องกัน token ที่ถูกขโมย)
   - ไม่บอก error detail → ป้องกัน attacker เดาได้
   - ใช้ timing-safe comparison
=============================================== */
export const authenticate = async (req, res, next) => {
  try {
    // const authHeader = req.headers.authorization || "";
    // const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const token = req.cookies.access_token;
    if (!token) {
      return res.status(401).json({
        message: "ກະລຸນາເຂົ້າລະບົບກ່ອນ",
      });
    }
    let decoded;
    try {
      decoded = jwt.verify(req.cookies.access_token, process.env.JWT_SECRET, {
        algorithms: "HS256",
        issuer: "admin",
        audience: "admin",
      });
    } catch (err) {
      return res.status(401).json({
        message: "Token ບໍ່ຖືກຕ້ອງ",
      });
    }

    // --- Load user ---
    const user = await User.findById(decoded.userId).lean();

    if (!user || !user.isActive) {
      return res.status(401).json({
        message: "ບໍ່ພົບບັນຊີຜູ້ໃຊ້",
      });
    }

    // --- Optional Hard Security: ตรวจจับ session ถูกลบ/หมดอายุ ---
    if (decoded.sessionId) {
      const session = await Session.findOne({
        sessionId: decoded.sessionId,
        userId: user._id,
        isActive: true,
        expiresAt: { $gt: new Date() },
      });

      if (!session) {
        return res.status(401).json({
          message: "Session ໝົດອາຍຸ ຫຼື ຖືກປິດ",
        });
      }
    }

    // เพิ่มข้อมูลลง req.user
    req.user = {
      _id: user._id,
      role: user.role,
      companyId: user.companyId,
      isSuperAdmin: user.isSuperAdmin === true,
      sessionId: decoded.sessionId,
    };

    next();
  } catch (error) {
    console.error("AUTH ERROR:", error);
    res.status(401).json({
      message: "ການຢືນຢັນຕົວຕົ້ນລົ້ມເຫລວ",
    });
  }
};

/* ===============================================
   🔒 AUTHORIZE (ROLE CHECK)
=============================================== */
export const authorize = (...roles) => {
  return (req, res, next) => {
    // superadmin override
    if (req.user?.isSuperAdmin) return next();

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "ບໍ່ມີສິດເຂົ້າເຖິງ",
      });
    }
    next();
  };
};

/* ===============================================
   🔒 RATE LIMIT — register & login
=============================================== */
export const registerLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?._id ?? ipKeyGenerator(req.ip); // ✅ wrap req.ip
  },
  handler: (req, res) => {
    res.status(429).json({
      status: "error",
      message: "ພະຍາຍາມຫຼາຍເກີນໄປ. ກະລຸນາລອງໃໝ່ພາຍຫຼັງ",
    });
  },
});
