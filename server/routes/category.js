import express from "express";
import Category from "../models/category.js";
import { authenticate } from "../middleware/auth.js";
const router = express.Router();

router.post("/create-category", authenticate, async (req, res) => {
  try {
    const { name, type, description } = req.body;
    // 🛑 1) Validate only letters + numbers + spaces
    const nameRegex = /^[\u0E80-\u0EFFA-Za-z ]+$/;

    if (!nameRegex.test(name)) {
      return res.status(400).json({
        success: false,
        message: "ຊື່ຕ້ອງມີແຕ່ອັກສອນ  ບໍ່ອະນຸຍາດອັກຄະລະພິເສດ",
      });
      z;
    }
    // 🛑 2) Validate duplicate
    const categoryExisting = await Category.findOne({
      name: name,
      type: type,
      companyId: req.user.companyId,
    });

    if (categoryExisting) {
      return res.status(400).json({
        success: false,
        message: "ຊື່ໝວດນີ້ມີໃນລະບົບແລ້ວ ກະລຸນາປ່ຽນຊື່ໃໝ່",
      });
    }

    // 🛑 3) Validate type
    if (
      ![
        "income",
        "expense",
        "selling-expense",
        "admin-expense",
        "cogs",
        "asset",
      ].includes(type)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid type",
      });
    }

    // 🟢 4) Create category
    const category = await Category.create({
      name,
      type,
      description,
      userId: req.user._id,
      companyId: req.user.companyId,
    });

    res.json({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/get-category", authenticate, async (req, res) => {
  try {
    const categories = await Category.find({
      companyId: req.user.companyId,
    }).sort({ createdAt: -1 });

    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});
router.patch("/update-category/:id", authenticate, async (req, res) => {
  try {
    const { name, type, description } = req.body;

    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      { name, type, description },
      { new: true }
    );
    // 🛑 1) Validate only letters + numbers + spaces
    const nameRegex = /^[\u0E80-\u0EFFA-Za-z ]+$/;

    if (!nameRegex.test(name)) {
      return res.status(400).json({
        success: false,
        message: "ຊື່ຕ້ອງມີແຕ່ອັກສອນ  ບໍ່ອະນຸຍາດອັກຄະລະພິເສດ",
      });
    }
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({
      success: true,
      category,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});
router.delete("/delete-category/:id", authenticate, async (req, res) => {
  try {
    const category = await Category.findOneAndDelete({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({ success: true, message: "Category deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});
export default router;
