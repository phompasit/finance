// middleware/csrf.js
import Csrf from "csrf";
const tokens = new Csrf();

export const csrfProtection = (req, res, next) => {
  const secret = req.cookies["csrf_secret"];
  const token = req.headers["x-csrf-token"];

  // GET → ສ້າງ secret + token ໃຫ້
  if (req.method === "GET") {
    const newSecret = tokens.secretSync();
    const newToken = tokens.create(newSecret);
    res.cookie("csrf_secret", newSecret, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });
    res.locals.csrfToken = newToken;
    return next();
  }

  // POST/PATCH/DELETE → validate
  if (!secret || !token || !tokens.verify(secret, token)) {
    return res.status(403).json({ message: "Invalid CSRF token" });
  }
  next();
};
