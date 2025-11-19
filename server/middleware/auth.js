import jwt from "jsonwebtoken";
import User from "../models/User.js";
import rateLimit from "express-rate-limit";
export const authenticate = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ message: "ກະລຸນາເຂົ້າສູ່ລະບົບກ່ອນ" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    const user = await User.findById(decoded.userId).lean()

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "ບໍ່ພົບບັນຊີ" });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "ການຢືນຢັນຕົວຕົ້ນລົ້ມເຫລວ" });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "ບໍ່ມີສິດເຂົ້າເຖິງສ່ວນນີ້" });
    }
    next();
  };
};

export const registerLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      status: "error",
      message: "ພະຍາຍາມຫຼາຍເກີນໄປ ກະລຸນາລອງໃໝ່ພາຍຫຼັງ",
    });
  },
});
