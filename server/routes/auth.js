import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Session from "../models/Session.js";
import { authenticate, registerLimiter } from "../middleware/auth.js";
import validator from "validator";
const router = express.Router();
import ErrorLog from "../models/ErrorLog.js";
import AuditLog from "../models/AuditLog.js";
import crypto from "crypto"
// Register
router.post("/register", registerLimiter, authenticate, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password) {
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
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "ລະຫັດຜ່ານຢ່າງໜ້ອຍ 8 ຕົວອັກສອນ ປະກອບດ້ວຍຕົວພິມໃຫ່ຍ ພິມນ້ອຍ ຕົວອັກສອນ ແລະ ອັກຂະລະພິເສດ",
      });
    }
    const allowedRoles = ["user", "admin", "staff"];
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
    const user = new User({
      username,
      email,
      password,
      role: role || "user",
      companyId: req.user._id,
    });
    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || "secret",
      {
        expiresIn: "7d",
      }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "เกิดข้อผิดพลาดในการสมัครสมาชิก",
      error: error.message,
    });
  }
});
// Account lockout tracking (ใช้ Redis หรือ Memory) ປ້ອງກັນການໂຈມຕີແບບ  Ddos
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 1 * 60 * 1000; // 30 นาที

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
      message:  "ການເຂົ້າເຖິງຖືກປະຕິເສດ",
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
          message: ` ບັນຊີຂອງທ່ານຖືກບ໋ອກຊົ່ວຄາວ ກະລຸນາລອງໃໝ່ ${attemptCheck.minutesLeft} ນາທີ`,
          lockedUntil: attemptCheck.lockedUntil,
        });
      }

      // 3. Find user - ใช้ lean() และ select เฉพาะฟิลด์ที่จำเป็น
      const user = await User.findOne({ email: sanitizedEmail })
        .select(
          "+password +loginAttempts +lockedUntil +isActive +lastLogin +twoFactorEnabled +twoFactorSecret"
        )
        

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
        const tempToken = crypto.randomBytes(32).toString("hex");

        await User.findByIdAndUpdate(user._id, {
          twoFactorTempToken: tempToken,
          twoFactorTempTokenExpires: Date.now() + 10 * 60 * 1000, // 10 นาที
        });

        return res.status(200).json({
          requiresTwoFactor: true,
          tempToken,
          message: "กรุณากรอกรหัส 2FA",
        });
      }

      // 9. Generate secure JWT token
      const sessionId = crypto.randomBytes(16).toString("hex");

      const token = jwt.sign(
        {
          userId: user._id,
          role: user.role,
          sessionId,
          companyId: user.companyId,
          iat: Math.floor(Date.now() / 1000),
        },
        process.env.JWT_SECRET ||'secret',
        {
          expiresIn: "7d",
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

      // 16. Send response
      res.json({
        token,
        refreshToken,
        expiresIn: 7 * 24 * 60 * 60, // seconds
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
        message: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง",
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
  console.log(`Security alert sent to ${email}:`, details);
  // TODO: Implement actual email/notification service
}

// Helper function: Get location from IP
async function getLocationFromIp(ip) {
  // ใช้ IP geolocation service
  // TODO: Implement IP geolocation
  return "Unknown";
}

// Endpoint สำหรับ refresh token
router.post("/refresh-token", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "ไม่พบ refresh token" });
    }

    // ตรวจสอบ refresh token
    const session = await Session.findOne({
      refreshToken,
      isActive: true,
      expiresAt: { $gt: new Date() },
    }).populate("userId");

    if (!session) {
      return res
        .status(401)
        .json({ message: "Refresh token ไม่ถูกต้องหรือหมดอายุ" });
    }

    // สร้าง token ใหม่
    const newToken = jwt.sign(
      {
        userId: session.userId._id,
        role: session.userId.role,
        sessionId: session.sessionId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d", algorithm: "HS256" }
    );

    res.json({
      token: newToken,
      expiresIn: 7 * 24 * 60 * 60,
    });
  } catch (error) {
    res.status(500).json({ message: "เกิดข้อผิดพลาด" });
  }
});

// Endpoint สำหรับ logout
router.post("/logout", authenticate, async (req, res) => {
  try {
    const sessionId = req.user.sessionId;

    // ทำให้ session ไม่ active
    await Session.updateOne(
      { sessionId },
      { isActive: false, logoutAt: new Date() }
    );

    await AuditLog.create({
      action: "LOGOUT",
      userId: req.user._id,
      sessionId,
      ipAddress: req.ip,
      timestamp: new Date(),
    });

    res.json({ message: "ออกจากระบบสำเร็จ" });
  } catch (error) {
    res.status(500).json({ message: "เกิดข้อผิดพลาด" });
  }
});

// Get current user
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: error.message });
  }
});

// Get all users (admin only)
router.get("/users", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "ไม่มีสิทธิ์เข้าถึง" });
    }

    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: error.message });
  }
});

// Update user role (admin only)
router.patch("/users/:id/role", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "ไม่มีสิทธิ์เข้าถึง" });
    }

    const { role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-password");

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: error.message });
  }
});

// Delete user (admin only)
router.delete("/users/:id", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "ไม่มีสิทธิ์เข้าถึง" });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "ลบผู้ใช้งานสำเร็จ" });
  } catch (error) {
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: error.message });
  }
});
// PATCH /api/auth/users/:id
// PATCH /api/auth/users/:id
router.patch("/user/:id", authenticate, async (req, res) => {
  try {
    const { username, email, role, companyInfo } = req.body;
    const updateData = { username, email, role, companyInfo };
    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    }).select("-password");

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});
export default router;
