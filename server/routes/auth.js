import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Session from "../models/Session.js";
import { authenticate, registerLimiter } from "../middleware/auth.js";
import validator from "validator";
const router = express.Router();
import ErrorLog from "../models/ErrorLog.js";
import AuditLog from "../models/AuditLog.js";
import crypto from "crypto";
import company from "../models/company.js";
import bcrypt from "bcryptjs";
import multer from "multer";
import cloudinary from "../controller/cloudtionary/cloudImage.js";
import IncomeExpense from "../models/IncomeExpense.js";
import AdvanceRequests from "../models/advanceRequests.js";
import Debt from "../models/Debt.js";
import OPO from "../models/OPO.js";
import Employees from "../models/employees.js";
import Partner from "../models/partner.js";
import Category from "../models/category.js";
import mongoose from "mongoose";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { apiLimiter, authLimiter } from "../middleware/security.js";
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});
// Registe
router.post("/register", registerLimiter, authenticate, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    if (!username?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        message: "ກະລຸນາເຕີມຂໍ້ມູນໃຫ້ຄົບຖ້ວນ",
      });
    }
    const isSuperAdmin = req.user;
    if (
      role === "admin" &&
      req.user.role === "admin" &&
      isSuperAdmin.isSuperAdmin !== true
    ) {
      return res.status(403).json({ message: "ບໍ່ມີສິດ ສ້າງ ແອດມຶນໃໝ່" });
    }
    // ตรวจสอบ username (ไม่มีอักขระพิเศษที่เป็นอันตราย)
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return res.status(400).json({
        message:
          "ຊື່ຜູ້ໃຊ້ຕ້ອງມີ 3-30 ຕົວອັກສອນ ແລະປະກອບດ້ວຍ a-z, 0-9, _ ເທົ່ານັ້ນ",
      });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({
        message: "ຮູບແບບອິເມວບໍ່ຖືກຕ້ອງ",
      });
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "ລະຫັດຜ່ານຢ່າງໜ້ອຍ 8 ຕົວອັກສອນ ປະກອບດ້ວຍຕົວພິມໃຫ່ຍ ພິມນ້ອຍ ຕົວອັກສອນ ແລະ ອັກຂະລະພິເສດ",
      });
    }
    const allowedRoles = ["admin", "staff", "master"];
    const userRole = role || "user";
    if (!allowedRoles.includes(userRole)) {
      return res.status(400).json({
        message: "ບົດບາດທີ່ເລືອກບໍ່ຖືກຕ້ອງ",
      });
    }
    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        message: "ຜູ້ໃຊ້ງານນີ້ມີຢູ່ແລ້ວ ກະລຸນາເລືອກໃຊ້ອິເມວ ແລະ ຊື່ໃໝ່",
      });
    }

    // Create new user
    const companyId = await company.findById(req.user.companyId);
    if (!companyId) {
      return res.status(404).json({
        message: "Not found this company please try again !!",
      });
    }
    const user = new User({
      username,
      email,
      password,
      role: role || "user",
      companyId: companyId?._id,
    });
    await user.save();
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is required");
    }
    res.status(201).json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.log("register log", error);
    res.status(500).json({
      message: "Something with Wrong please try again",
    });
  }
});

router.post("/register-superadmin", registerLimiter, async (req, res) => {
  try {
    const { username, email, password, companyInfo } = req.body;
    if (!username.trim() || !email.trim() || !password || !companyInfo) {
      return res.status(400).json({
        message: "ກະລຸນາເຕີມຂໍ້ມູນໃຫ້ຄົບຖ້ວນ",
      });
    }
    // ตรวจสอบ username (ไม่มีอักขระพิเศษที่เป็นอันตราย)
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return res.status(400).json({
        message:
          "ຊື່ຜູ້ໃຊ້ຕ້ອງມີ 3-30 ຕົວອັກສອນ ແລະປະກອບດ້ວຍ a-z, 0-9, _ ເທົ່ານັ້ນ",
      });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({
        message: "ຮູບແບບອິເມວບໍ່ຖືກຕ້ອງ",
      });
    }
    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        message: "ຜູ້ໃຊ້ງານນີ້ມີຢູ່ແລ້ວ ກະລຸນາເລືອກໃຊ້ອິເມວ ແລະ ຊື່ໃໝ່",
      });
    }
    // Create new super admin user
    const companyId = await company.create({
      name: companyInfo.name,
      address: companyInfo.address,
      phone: companyInfo.phone,
      email: companyInfo.email,
      logo: companyInfo.lgo,
    });
    await companyId.save();
    const user = new User({
      username,
      email,
      password,
      role: "admin",
      companyId: companyId._id,
      isSuperAdmin: true,
    });
    await user.save();

    res.status(201).json({
      message: "ສ້າງບັນຊີຜູ້ດູແລລະບົບສໍາເລັດ",
    });
  } catch (error) {
    console.log("register superAdmin log", error);
    res.status(500).json({
      message: "Something with Wrong please try again",
    });
  }
});

// Account lockout tracking (ใช้ Redis หรือ Memory) ປ້ອງກັນການໂຈມຕີແບບ  Ddos
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 10 * 60 * 1000; // 1 นาที

// Login
// ฟังก์ชันตรวจสอบและบันทึกความพยายาม login
const checkLoginAttempts = (identifier) => {
  const attempts = loginAttempts.get(identifier);
  //ถ้ายังไม่มีข้อมูล (หมายถึงพยายาม login ครั้งแรก)
  //→ อนุญาตให้ login (allowed: true) และคืนค่าจำนวนครั้งที่เหลือ (remainingAttempts)
  if (!attempts) {
    return { allowed: true, remainingAttempts: MAX_LOGIN_ATTEMPTS };
  }

  // ตรวจสอบว่าถูกล็อคอยู่หรือไม่
  //เช็กว่ามีการตั้งเวลา “ล็อก” ไว้ไหม (เพราะ login ผิดบ่อย
  // ถ้ามี และเวลานั้นยังไม่หมด (lockedUntil > Date.now())
  //→ ห้าม login (allowed: false)
  //→ ส่งข้อมูลกลับว่า “ยังถูกล็อกอยู่” และเหลืออีกกี่นาที (minutesLeft)
  if (attempts.lockedUntil && attempts.lockedUntil > Date.now()) {
    const minutesLeft = Math.ceil((attempts.lockedUntil - Date.now()) / 60000);
    return {
      allowed: false,
      lockedUntil: attempts.lockedUntil,
      minutesLeft,
    };
  }

  // ถ้าหมดเวลาล็อค ให้รีเซ็ต
  if (attempts.lockedUntil && attempts.lockedUntil <= Date.now()) {
    loginAttempts.delete(identifier);
    return { allowed: true, remainingAttempts: MAX_LOGIN_ATTEMPTS };
  }

  return {
    allowed: attempts.count < MAX_LOGIN_ATTEMPTS,
    remainingAttempts: MAX_LOGIN_ATTEMPTS - attempts.count,
  };
};
//ใช้ตอน login ล้มเหลว เพื่อ "บันทึกความพยายามที่ล้มเหลว"
const recordFailedAttempt = (identifier) => {
  const attempts = loginAttempts.get(identifier) || {
    count: 0,
    firstAttempt: Date.now(),
  };
  // เพิ่มจำนวนครั้งที่พยายาม
  attempts.count++;
  attempts.lastAttempt = Date.now();
  // ถ้าพยายามเกิน MAX_LOGIN_ATTEMPTS → ล็อค
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    attempts.lockedUntil = Date.now() + LOCKOUT_TIME; ///plus ເວລາລ໋ອກໃຫ້ລ໋ອກໃໍ້ງານຂອງຕໍ່ໄປ
  }

  loginAttempts.set(identifier, attempts);
  return attempts;
};
//ฟังก์ชันนี้ทำหน้าที่ ล้างข้อมูลความพยายามล็อกอินผิด ของผู้ใช้คนนั้นออกจากหน่วยความจำ
const clearLoginAttempts = (identifier) => {
  loginAttempts.delete(identifier);
};
// Middleware สำหรับตรวจสอบ suspicious activity
// นี่คือ Middleware สำหรับกรองการเข้าถึงที่น่าสงสัย
// ทำหน้าที่เหมือน “ยามหน้า API” คอยดูว่ามีบอทหรือเครื่องมือเจาะระบบเข้ามาหรือไม่
const detectSuspiciousActivity = (req, res, next) => {
  const userAgent = req.get("user-agent");
  const ip = req.ip;

  // ตรวจสอบ User Agent
  // 🔹 ถ้าไม่มี user-agent หรือสั้นเกินไป (บอทบางตัวจะไม่ส่ง)
  if (!userAgent || userAgent.length < 10) {
    return res.status(403).json({
      message: "ການເຂົ້າເຖິງຖືກປະຕິເສດ",
    });
  }

  // ตรวจสอบ Common attack patterns
  const suspiciousPatterns = ["sqlmap", "nikto", "nmap", "masscan"];
  if (
    // 🔹 ตรวจจับเครื่องมือโจมตีทั่วไป
    suspiciousPatterns.some((pattern) =>
      userAgent.toLowerCase().includes(pattern)
    )
  ) {
    console.warn(`Suspicious user agent detected: ${userAgent} from IP: ${ip}`);
    return res.status(403).json({
      message: "ການເຂົ້າເຖິງຖືກປະຕິເສດ",
    });
  }

  next();
};

router.post(
  "/login",
  registerLimiter,
  detectSuspiciousActivity,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const { email, password } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get("user-agent");

      // 1. Input Validation
      if (!email || !password) {
        return res.status(400).json({
          message: "ກະລຸນາກວດສອບອິເມວແລະລະຫັດຜ່ານ",
        });
      }

      // ตรวจสอบรูปแบบ email
      if (!validator.isEmail(email)) {
        // ใช้เวลาเท่ากันเพื่อป้องกัน timing attack
        await new Promise((resolve) => setTimeout(resolve, 100));
        return res.status(401).json({
          message: "ອິເມວຫຼືລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ",
        });
      }

      const sanitizedEmail = validator.normalizeEmail(email);
      const identifier = `${sanitizedEmail}:${ipAddress}`;

      // 2. Check Account Lockout
      const attemptCheck = checkLoginAttempts(identifier);
      if (!attemptCheck.allowed) {
        await AuditLog.create({
          action: "LOGIN_BLOCKED_LOCKOUT",
          email: sanitizedEmail,
          ipAddress,
          userAgent,
          details: `Account locked for ${attemptCheck.minutesLeft} minutes`,
          timestamp: new Date(),
        });

        return res.status(429).json({
          message: ` ບັນຊີຂອງທ່ານຖືກບ໋ອກຊົ່ວຄາວ ກະລຸນາລອງໃໝ່ໃນອີກ ${attemptCheck.minutesLeft} ນາທີ`,
          lockedUntil: attemptCheck.lockedUntil,
        });
      }

      // 3. Find user - ใช้ lean() และ select เฉพาะฟิลด์ที่จำเป็น
      const user = await User.findOne({ email: sanitizedEmail }).select(
        "+password +loginAttempts +lockedUntil +isActive +lastLogin +twoFactorEnabled +twoFactorSecret"
      );
      const plainUser = user;
      // 4. Timing-safe user check
      const userExists = !!user;

      // ถ้าไม่พบ user ให้ใช้เวลาเท่ากับการ compare password
      if (!userExists) {
        // Fake password comparison เพื่อป้องกัน timing attack
        await new Promise((resolve) => setTimeout(resolve, 100));
        recordFailedAttempt(identifier);

        await AuditLog.create({
          action: "LOGIN_FAILED_USER_NOT_FOUND",
          email: sanitizedEmail,
          ipAddress,
          userAgent,
          timestamp: new Date(),
        });

        return res.status(401).json({
          message: "ອິເມວຫຼືລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ",
        });
      }

      // 5. Check if account is active
      if (!user.isActive) {
        await AuditLog.create({
          action: "LOGIN_FAILED_INACTIVE_ACCOUNT",
          userId: user._id,
          email: sanitizedEmail,
          ipAddress,
          userAgent,
          timestamp: new Date(),
        });

        return res.status(403).json({
          message: "ບັນຊີຂອງທ່ານຖືກລະງັບການໃຊ້ງານ ກະລຸນາຕິດຕໍ່ຜູ້ດູແລລະບົບ",
        });
      }

      // 6. Check password with timing-safe comparison
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        const attempts = recordFailedAttempt(identifier);
        await AuditLog.create({
          action: "LOGIN_FAILED_WRONG_PASSWORD",
          userId: user._id,
          email: sanitizedEmail,
          ipAddress,
          userAgent,
          attemptNumber: attempts.count,
          timestamp: new Date(),
        });

        // อัพเดท failed attempts ใน database
        await User.findByIdAndUpdate(user._id, {
          $inc: { loginAttempts: 1 },
          lastFailedLogin: new Date(),
        });

        const remainingAttempts = MAX_LOGIN_ATTEMPTS - attempts.count;
        const message =
          remainingAttempts > 0
            ? `ອີເມວຫຼືລະຫັັດຜ່ານບໍ່ຖືກຕ້ອງ ເຫຼືອໂອກາດອີກ ${remainingAttempts} ຄັ້ງ)`
            : "ບັນຊີຂອງທ່ານຖືກບ໋ອກຊົ່ວຄາວ";

        return res.status(401).json({ message });
      }

      // 7. Check for suspicious login patterns
      // ถ้า login จาก IP ใหม่หรือ location ใหม่ ให้ส่ง notification
      const suspiciousLogin = await checkSuspiciousLogin(
        user._id,
        ipAddress,
        userAgent
      );

      if (suspiciousLogin.isSuspicious) {
        await sendSecurityAlert(user.email, {
          type: "suspicious_login",
          ipAddress,
          location: suspiciousLogin.location,
          device: userAgent,
        });
      }

      // 8. Two-Factor Authentication (ถ้าเปิดใช้งาน)
      if (user.twoFactorEnabled) {
        // สร้าง temporary token สำหรับ 2FA
        //สร้าง token แบบสุ่ม 32 bytes

        //ใช้เป็น token ชั่วคราว สำหรับขั้นตอนยืนยัน 2FA
        const tempToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto
          .createHash("sha256")
          .update(tempToken)
          .digest("hex");

        await User.findByIdAndUpdate(user._id, {
          twoFactorTempToken: hashedToken,
          twoFactorTempTokenExpires: Date.now() + 10 * 60 * 1000, // 10 นาที
        });

        // ✅ แก้แล้ว — เก็บ tempToken ใน httpOnly cookie แทน
        res.cookie("2fa_temp_token", tempToken, {
          httpOnly: true,
          secure: true,
          sameSite: "None",
          maxAge: 10 * 60 * 1000, // 10 นาที
        });
        return res.status(200).json({
          requiresTwoFactor: true,
          message: "กรุณากรอกรหัส 2FA",
          // ❌ ไม่ส่ง tempToken กลับใน body อีกต่อไป
        });
      }

      // 9. Generate secure JWT token
      const sessionId = crypto.randomBytes(16).toString("hex");
      if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is required");
      }
      const token = jwt.sign(
        {
          userId: user._id,
          role: user.role,
          sessionId,
          companyId: user.companyId,
          iat: Math.floor(Date.now() / 1000),
          isSuperAdmin: plainUser?.isSuperAdmin,
        },
        process.env.JWT_SECRET || "secret",
        {
          expiresIn: process.env.JWT_EXPIRE,
          algorithm: "HS256",
          issuer: "admin",
          audience: "admin",
        }
      );
      // 10. Generate refresh token
      const refreshToken = crypto.randomBytes(40).toString("hex");
      const refreshTokenExpiry = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ); // 30 วัน

      // 11. Update user login info
      await User.findByIdAndUpdate(user._id, {
        lastLogin: new Date(),
        lastLoginIp: ipAddress,
        lastLoginUserAgent: userAgent,
        loginAttempts: 0,
        refreshToken,
        refreshTokenExpiry,
        $push: {
          loginHistory: {
            timestamp: new Date(),
            ipAddress,
            userAgent,
            sessionId,
          },
        },
      });

      // 12. Clear failed login attempts
      clearLoginAttempts(identifier);

      // 13. Create session record
      await Session.create({
        userId: user._id,
        sessionId,
        token,
        refreshToken,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isActive: true,
      });

      // 14. Log successful login
      await AuditLog.create({
        action: "LOGIN_SUCCESS",
        userId: user._id,
        email: sanitizedEmail,
        ipAddress,
        userAgent,
        sessionId,
        suspicious: suspiciousLogin.isSuspicious,
        timestamp: new Date(),
      });

      // 15. Calculate response time (เพื่อตรวจสอบ timing attack)
      const responseTime = Date.now() - startTime;
      // ⭐ set cooki
      res.cookie("access_token", token, {
        // httpOnly: true,
        // secure: process.env.NODE_ENV === "production",
        // sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      // 16. Send response
      res.json({
        expiresIn: 7 * 24 * 60 * 60,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          lastLogin: user.lastLogin,
        },
        session: {
          sessionId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    } catch (error) {
      // 17. Secure error handling
      console.error("Login error:", error);

      await ErrorLog.create({
        endpoint: "/login",
        error: error.message,
        stack: error.stack,
        ipAddress: req.ip,
        timestamp: new Date(),
      });

      // ไม่เปิดเผยรายละเอียดข้อผิดพลาด
      res.status(500).json({
        message: "Something with Wrong please try again",
      });
    }
  }
);

// Helper function: ตรวจสอบ suspicious login
async function checkSuspiciousLogin(userId, ipAddress, userAgent) {
  try {
    // ตรวจสอบ login history
    const recentLogins = await User.findById(userId)
      .select("loginHistory")
      .lean();

    if (!recentLogins || !recentLogins.loginHistory) {
      return { isSuspicious: false };
    }

    const lastLogin =
      recentLogins.loginHistory[recentLogins.loginHistory.length - 1];

    // ถ้า IP เปลี่ยน
    const ipChanged = lastLogin && lastLogin.ipAddress !== ipAddress;

    // ถ้า device/browser เปลี่ยน
    const deviceChanged =
      lastLogin && !userAgent.includes(lastLogin.userAgent?.split("/")[0]);

    return {
      isSuspicious: ipChanged || deviceChanged,
      previousIp: lastLogin?.ipAddress,
      currentIp: ipAddress,
      location: await getLocationFromIp(ipAddress),
    };
  } catch (error) {
    console.error("Error checking suspicious login:", error);
    return { isSuspicious: false };
  }
}

// Helper function: ส่ง security alert
async function sendSecurityAlert(email, details) {
  // ใช้ email service หรือ notification service
  // TODO: Implement actual email/notification service
}

// Helper function: Get location from IP
async function getLocationFromIp(ip) {
  // ใช้ IP geolocation service
  // TODO: Implement IP geolocation
  return "Unknown";
}
// Endpoint สำหรับ logout
router.post("/logout", authenticate, async (req, res) => {
  try {
    const sessionId = req.user?.sessionId;

    // ปิด session ถ้ามี
    if (sessionId) {
      await Session.updateOne(
        { sessionId },
        {
          isActive: false,
          logoutAt: new Date(),
        }
      );

      await AuditLog.create({
        action: "LOGOUT",
        userId: req.user._id,
        sessionId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        timestamp: new Date(),
      });
    }

    // ⭐ สำคัญ: clear httpOnly cookie
    res.clearCookie("access_token", {
      httpOnly: true,
      sameSite: "None",
      secure: process.env.NODE_ENV === "production",
    });

    return res.status(200).json({
      message: "ອອກຈາກລະບົບສຳເລັດ",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      message: "Something with Wrong please try again",
    });
  }
});

// Get current user
router.get("/me", authenticate, async (req, res) => {
  try {
    // 1️⃣ Validate ObjectId (กัน token ปลอม / broken token)
    if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 2️⃣ Fetch user + whitelist fields เท่านั้น
    const user = await User.findById(req.user._id)
      .select(
        "username email fullName role companyId twoFactorEnabled isSuperAdmin"
      )
      .populate({
        path: "companyId",
        select: "name address taxId information phone", // เลือกเฉพาะ field ที่ใช้จริง
      })
      .lean(); // 3️⃣ ป้องกัน mutation / performance ดีขึ้น
    // 4️⃣ User ไม่พบ / ถูกลบ
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 5️⃣ เช็กสถานะ user
    if (user.isActive === false) {
      return res.status(403).json({
        message: "Account is disabled",
      });
    }

    // 6️⃣ Response (ไม่ส่งข้อมูลอ่อนไหว)
    return res.status(200).json(user);
  } catch (error) {
    // 7️⃣ Secure error logging
    console.error("GET /me error:", {
      userId: req.user?._id,
      error: error.message,
    });

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
});
// Get all users (admin only)
router.get("/users", authenticate, async (req, res) => {
  try {
    let users = [];

    // SUPER ADMIN → เห็นทุกคนใน company
    if (req.user.role === "admin" && req.user.isSuperAdmin === true) {
      users = await User.find({ companyId: req.user.companyId })
        .select("-password")
        .populate("companyId");

      // ADMIN / MASTER → เห็นเฉพาะตัวเอง
    } else if (["admin", "master"].includes(req.user.role)) {
      const user = await User.findById(req.user._id)
        .select("-password")
        .populate("companyId");

      if (user) users = [user];
    }

    res.json(users);
  } catch (error) {
    console.log("user log", error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

// Update user role (admin only)
router.patch("/users/:id/role", authenticate, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    const allowedRoles = ["staff", "master", "admin"];
    const { role } = req.body;
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "ไม่มีสิทธิ์เข้าถึง" });
    }
    if (req.user.role === "admin" && req.user.isSuperAdmin !== true) {
      return res.status(403).json({ message: "ບໍ່ມີສິດ ສ້າງ ແອດມຶນໃໝ່" });
    }
    if (
      req.params.id === req.user._id.toString() &&
      req.user.role === "admin" &&
      req.user.isSuperAdmin === true
    ) {
      return res.status(403).json({ message: "ບໍ່ສາມາດປ່ຽນສະຖານະຕົນເອງໄດ້" });
    }
    const targetUser = await User.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-password");

    res.json(user);
  } catch (error) {
    console.log("update log role", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Delete user (admin only)
router.delete("/users/:id", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.isSuperAdmin === true) {
      return res
        .status(403)
        .json({ success: false, message: "ບໍ່ມີສິດເຂົ້າເຖິງ" });
    }
    if (!req.user.isSuperAdmin) {
      return res
        .status(403)
        .json({ message: "Only super admin can delete users" });
    }

    const userId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    const targetUser = await User.findOne({
      _id: userId,
      companyId: req.user.companyId,
    });
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }
    if (req.user._id.toString() === userId) {
      return res
        .status(400)
        .json({ success: false, message: "ບໍ່ສາມາດລົບຕົນເອງໄດ້" });
    }

    const hasIncomeExpense = await IncomeExpense.exists({ userId });
    const hasAdvance = await AdvanceRequests.exists({ userId });
    const OPOS = await OPO.exists({ userId });
    const Debts = await Debt.exists({ userId });
    const hasEmployees = await Employees.exists({ userId });
    const hasPartner = await Partner.exists({ userId });
    const HasCategory = await Category.exists({ userId });

    if (
      hasIncomeExpense ||
      hasEmployees ||
      hasAdvance ||
      OPOS ||
      HasCategory ||
      hasPartner ||
      Debts
    ) {
      return res.status(400).json({
        success: false,
        message: "ບໍ່ສາມາດລົບຜູ້ໃຊ້ງານໄດ້ ເນື່ອງຈາກມີຂໍ້ມູນລາຍການອື່ນຢູ່",
      });
    }

    // 4) ลบผู้ใช้ได้ (ถ้าไม่มีข้อมูลผูกอยู่)
    await User.findByIdAndDelete(userId);
    res.json({ success: true, message: "ລົບຜູ້ໃຊ້ງານສຳເລັດ" });
  } catch (error) {
    console.log("delete user:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// PATCH /api/auth/users/:id
// PATCH /api/auth/users/:id
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

const uploadImageLogo = async (image) => {
  try {
    return new Promise((resolve, reject) => {
      if (!image) throw new Error("No file uploaded");
      if (image.size > MAX_FILE_SIZE) {
        throw new Error("File too large (max 2MB)");
      }
      if (!ALLOWED_MIME.includes(image.mimetype)) {
        throw new Error("Invalid file type");
      }
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "finance/image_company",
          resource_type: "image",
          transformation: [
            { width: 500, height: 500, crop: "limit", fetch_format: "auto" },
          ],
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result.secure_url);
        }
      );
      stream.end(image.buffer);
    });
  } catch (error) {
    console.error("❌ Cloudinary upload error:", error);
    throw new Error("Image upload failed");
  }
};
// ✅ แก้แล้ว — ย้าย const publicId ขึ้นมาก่อน
const deleteCloudinaryImage = async (imageUrl) => {
  try {
    if (!imageUrl) return;
    const publicId = imageUrl.split("/").pop().split(".")[0];
    if (!publicId.startsWith("finance/image_company/")) {
      throw new Error("Invalid publicId");
    }
    await cloudinary.uploader.destroy(`finance/image_company/${publicId}`);
  } catch (err) {
    console.error("⚠️ Failed to delete old image from Cloudinary:", err);
  }
};
router.patch(
  "/user/:id",
  upload.single("logo"),
  authenticate,
  async (req, res) => {
    try {
      const updater = req.user;
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).end();
      }
      const targetUser = await User.findById(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // ดึงข้อมูลจาก body
      let { username, email, password, role, companyId } = req.body;
      console.log("companyId", companyId);
      // ถ้า companyId ส่งมาเป็น string → parse
      if (companyId && typeof companyId === "string") {
        companyId = JSON.parse(companyId);
      }

      const updateData = { username, email };

      // ---------------------------------------------------
      // 1) Hash password (ถ้ามี)
      // ---------------------------------------------------
      if (password) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(password, salt);
      }

      // ---------------------------------------------------
      // 2) Role Permission Logic
      // ---------------------------------------------------
      if (!updater.isSuperAdmin) {
        if (targetUser.role === "admin") {
          return res.status(403).json({ message: "ບໍ່ມີສິດແກ້ໄຂ admin" });
        }
        if (role === "admin") {
          return res.status(403).json({
            message: "ບໍ່ມີສິດສ້າງ ຫຼື ປ່ຽນ role admin",
          });
        }
      }

      if (!updater.isSuperAdmin && updater.role !== "admin") {
        if (role) {
          return res.status(403).json({
            message: "ບໍ່ມີສິດປ່ຽນ role ຂອງຜູ້ໃຊ້",
          });
        }
      }

      // superadmin แก้ role ได้หมด
      if (updater.isSuperAdmin) {
        updateData.role = role;
      } else if (role === "master" || role === "staff") {
        updateData.role = role;
      }

      // ---------------------------------------------------
      // 3) อัปเดต Company (ถ้ามีส่งมา)
      // ---------------------------------------------------
      if (companyId && companyId._id) {
        const companyDoc = await company.findById(companyId._id);

        if (!companyDoc)
          return res.status(404).json({ message: "Company not found" });

        const companyUpdate = {
          name: companyId.name,
          address: companyId.address,
          phone: companyId.phone,
          email: companyId.email,
          taxId: companyId.taxId,
          information: companyId.information,
        };
        // 📌 ถ้ามีไฟล์โลโก้ใหม่
        if (req.file) {
          // ลบรูปเก่าออกก่อน
          if (companyDoc.logo) {
            await deleteCloudinaryImage(companyDoc.logo);
          }

          // อัปโหลดรูปใหม่
          const newLogoUrl = await uploadImageLogo(req.file);
          companyUpdate.logo = newLogoUrl;
        }

        // update company
        await company.findByIdAndUpdate(companyId._id, companyUpdate);
      }

      // ---------------------------------------------------
      // 4) อัปเดต User
      // ---------------------------------------------------
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).end();
      }
      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      ).select("-password");

      res.json({
        success: true,
        message: "User updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

//2FA
/////สร้าง endpoint สำหรับ setup 2FA
// ================= SETUP 2FA =================
router.get("/user/2fa/setup", apiLimiter, authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "+twoFactorSecret +twoFactorEnabled"
    );

    // ถ้า 2FA เปิดอยู่แล้ว ไม่ต้อง setup ซ้ำ
    if (user.twoFactorEnabled) {
      return res.status(400).json({ message: "2FA is already enabled" });
    }

    let secretBase32 = user.twoFactorSecret;

    // สร้าง secret ใหม่เฉพาะตอนที่ยังไม่มี
    if (!secretBase32) {
      const secret = speakeasy.generateSecret({
        length: 20,
        name: `FinanceApp (${req.user.role})`,
      });
      secretBase32 = secret.base32;
      await User.findByIdAndUpdate(req.user._id, {
        twoFactorSecret: secretBase32,
      });
    }

    const otpauthUrl = speakeasy.otpauthURL({
      secret: secretBase32,
      label: `FinanceApp (${req.user.role})`,
      encoding: "base32",
    });
    const qr = await QRCode.toDataURL(otpauthUrl);

    res.json({ qr, secret: secretBase32 });
  } catch (error) {
    console.error("2FA setup error:", error);
    res.status(500).json({ message: "2FA setup failed" });
  }
});
//สร้าง endpoint สำหรับ setup 2FA
// ================= ENABLE 2FA =================
router.post("/user/2fa/enable", authLimiter, authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== "string" || token.length !== 6) {
      return res.status(400).json({
        message: "Invalid 2FA code format",
      });
    }
    const user = await User.findById(req.user._id).select("+twoFactorSecret");
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token,
      window: 1,
    });
    if (!verified) {
      return res.status(400).json({
        message: "Invalid 2FA code",
      });
    }

    user.twoFactorEnabled = true;
    await user.save();

    res.json({ message: "2FA enabled successfully" });
  } catch (error) {
    console.error("2FA enable error:", error);
    res.status(500).json({ message: "2FA enable failed" });
  }
});
//endpoint ยืนยัน 2FA ตอน login

// ================= VERIFY LOGIN 2FA =================

// ================= VERIFY LOGIN 2FA =================
// ✅ อ่าน tempToken จาก cookie แทน req.body
router.post("/user/verify-2fa", async (req, res) => {
  try {
    const { code } = req.body;
    const tempToken = req.cookies["2fa_temp_token"]; // ✅ อ่านจาก cookie
    console.log("tempToken", tempToken);
    if (!tempToken || !code) {
      return res.status(400).json({ message: "Missing verification data" });
    }
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: "Invalid code format" });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(tempToken)
      .digest("hex");

    const user = await User.findOne({
      twoFactorTempToken: hashedToken,
      twoFactorTempTokenExpires: { $gt: Date.now() },
    }).select("+twoFactorSecret +twoFactorAttempts +twoFactorLockedUntil");
    if (!user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // ✅ Check lockout ก่อน verify (Fix 4 รวมอยู่ที่นี่)
    if (user.twoFactorLockedUntil && user.twoFactorLockedUntil > Date.now()) {
      const minutesLeft = Math.ceil(
        (user.twoFactorLockedUntil - Date.now()) / 60000
      );
      return res.status(429).json({
        message: `ລອງໃໝ່ໃນອີກ ${minutesLeft} ນາທີ`,
      });
    }
    console.log("secret:", user.twoFactorSecret);
    console.log("code received:", code);
    console.log("server unix time:", Math.floor(Date.now() / 1000));
    console.log(
      "expected token:",
      speakeasy.totp({
        secret: user.twoFactorSecret,
        encoding: "base32",
      })
    );

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: code,
      window: 1,
    });
    console.log("verified", verified);
    if (!verified) {
      user.twoFactorAttempts = (user.twoFactorAttempts || 0) + 1;
      if (user.twoFactorAttempts >= 5) {
        user.twoFactorLockedUntil = Date.now() + 15 * 60 * 1000;
        user.twoFactorAttempts = 0;
      }
      await user.save();
      return res.status(401).json({ message: "Invalid authentication code" });
    }

    // Clear temp token + attempts
    user.twoFactorAttempts = 0;
    user.twoFactorLockedUntil = undefined;
    user.twoFactorTempToken = undefined;
    user.twoFactorTempTokenExpires = undefined;

    const sessionId = crypto.randomBytes(16).toString("hex");
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        sessionId,
        companyId: user.companyId,
        isSuperAdmin: user.isSuperAdmin === true,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRE,
        algorithm: "HS256",
        issuer: "admin",
        audience: "admin",
      }
    );

    // ✅ Clear 2fa temp cookie
    res.clearCookie("2fa_temp_token", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });

    res.cookie("access_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const ipAddress = req.ip;
    const userAgent = req.get("user-agent");
    await Session.create({
      userId: user._id,
      sessionId,
      token,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isActive: true,
    });

    await user.save();
    res.json({ message: "Login success" });
  } catch (error) {
    console.error("2FA verify error:", error);
    res.status(500).json({ message: "2FA verification failed" });
  }
});

// ================= DISABLE 2FA =================
router.post(
  "/user/2fa/disable",
  authLimiter,
  authenticate,
  async (req, res) => {
    try {
      const { token } = req.body;

      // ต้องยืนยัน code ก่อนปิด — กัน attacker ที่ขโมย session มาปิด 2FA
      if (!token || typeof token !== "string" || token.length !== 6) {
        return res
          .status(400)
          .json({ message: "ກະລຸນາຢືນຢັນດ້ວຍລະຫັດ 2FA ກ່ອນ" });
      }

      const user = await User.findById(req.user._id).select(
        "+twoFactorSecret +twoFactorEnabled"
      );

      if (!user.twoFactorEnabled) {
        return res.status(400).json({ message: "2FA ຍັງບໍ່ໄດ້ເປີດໃຊ້ງານ" });
      }

      // ยืนยัน code ก่อนเสมอ
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: "base32",
        token,
        window: 2,
      });

      if (!verified) {
        return res.status(401).json({ message: "ລະຫັດ 2FA ບໍ່ຖືກຕ້ອງ" });
      }

      // ปิด 2FA และ clear ทุก field ที่เกี่ยวข้อง
      await User.findByIdAndUpdate(req.user._id, {
        $unset: {
          twoFactorSecret: "",
          twoFactorTempToken: "",
          twoFactorTempTokenExpires: "",
          twoFactorLockedUntil: "",
          twoFactorAttempts: "",
        },
        $set: { twoFactorEnabled: false },
      });

      res.json({ message: "ປິດ 2FA ສຳເລັດ" });
    } catch (error) {
      console.error("2FA disable error:", error);
      res.status(500).json({ message: "2FA disable failed" });
    }
  }
);
export default router;
