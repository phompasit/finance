import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const authenticate = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    console.log(token);
    if (!token) {
      return res.status(401).json({ message: "กรุณาเข้าสู่ระบบ" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "secret"
    );
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "ไม่พบผู้ใช้หรือบัญชีถูกระงับ" });
    }

    req.user = user;
    console.log(req.user )
    next();
  } catch (error) {
    console.log(error)
    res.status(401).json({ message: "การยืนยันตัวตนล้มเหลว" });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "คุณไม่มีสิทธิ์เข้าถึงส่วนนี้" });
    }
    next();
  };
};
