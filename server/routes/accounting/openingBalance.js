import express from "express";
import OpeningBalance from "../../models/accouting_system_models/OpeningBalance.js";
import Account_document from "../../models/accouting_system_models/Account_document.js";
import { authenticate } from "../../middleware/auth.js";
import mongoose from "mongoose";
import accountingPeriod from "../../models/accouting_system_models/accountingPeriod.js";

const router = express.Router();
async function blockClosedJournal(req, res, next) {
  try {
    if (!req.params.id) return next();

    // 1) Find opening record
    const opening = await OpeningBalance.findById(req.params.id)
      .select("year companyId")
      .lean();
    ///✅ Step 1: หา OpeningBalance ก่อนว่าอยู่ปีไหน
    if (!opening) {
      return res.status(404).json({
        success: false,
        error: "Opening balance not found",
      });
    }
    ///
    // 2) Ensure same company
    if (String(opening.companyId) !== String(req.user.companyId)) {
      return res.status(403).json({
        success: false,
        error: "Not allowed",
      });
    }

    // 3) Find period of that year
    const period = await accountingPeriod
      .findOne({
        companyId: req.user.companyId,
        year: opening.year,
      })
      .select("status_close");

    // 4) Block if locked
    if (period?.status_close === "locked") {
      return res.status(403).json({
        success: false,
        error: "❌ ປີນີ້ຖືກປິດແລ້ວ ບໍ່ສາມາດແກ້ໄຂໄດ້",
      });
    }

    next();
  } catch (err) {
    console.error("blockClosedJournal error:", err);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
}

/**
 * Helper: validate amounts and account relation
 */
async function validateOpeningInput({ companyId, accountId, debit, credit }) {
  if (!accountId) throw new Error("accountId is required");

  if (!mongoose.Types.ObjectId.isValid(accountId)) {
    throw new Error("accountId is not a valid ObjectId");
  }

  const account = await Account_document.findById(accountId).lean();
  if (!account) throw new Error("Account not found");

  if (!account.companyId || String(account.companyId) !== String(companyId)) {
    throw new Error("Account does not belong to your company");
  }

  // normalize numbers
  const d = Number(debit || 0);
  const c = Number(credit || 0);

  if (isNaN(d) || isNaN(c)) throw new Error("debit and credit must be numbers");

  if (d < 0 || c < 0) throw new Error("debit and credit must be >= 0");

  // both > 0 is not allowed
  if (d > 0 && c > 0) {
    throw new Error(
      "Both debit and credit cannot be greater than zero at the same time"
    );
  }

  // at least one > 0 (change this rule if you want to allow zero-zero)
  if (d === 0 && c === 0) {
    throw new Error("Please provide an amount on either debit or credit");
  }

  // enforce normal side
  if (account.normalSide === "Dr" && c > 0) {
    throw new Error(
      `Account normal side is Dr — please put amount in debit (not credit)`
    );
  }
  if (account.normalSide === "Cr" && d > 0) {
    throw new Error(
      `Account normal side is Cr — please put amount in credit (not debit)`
    );
  }

  return { account, debit: d, credit: c };
}
/* -------------------------- GET OPENING BALANCE BY YEAR -------------------------- */
router.get("/", authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const selectedYear = req.query.year ? Number(req.query.year) : null;
    if (req.query.year) {
      if (!Number.isInteger(selectedYear)) {
        return res.status(400).json({ error: "Invalid year" });
      }

      if (selectedYear < 2000 || selectedYear > 2100) {
        return res.status(400).json({ error: "Year out of range" });
      }
    }
    /* ============================================================
       1) GET CLOSED PERIODS
    ============================================================ */
    const closedPeriods = await accountingPeriod
      .find({ companyId, isClosed: true })
      .select("year -_id")
      .lean()
      .limit(500);

    const closedYears = closedPeriods.map((p) => p.year);

    /* ============================================================
       2) CALCULATE SYSTEM DEFAULT YEAR
       - ปีถัดไปจากปีที่ปิดล่าสุด
       - ถ้าไม่มีปีปิด → ปีปัจจุบัน
    ============================================================ */
    const defaultYear =
      closedYears.length > 0
        ? Math.max(...closedYears) + 1
        : new Date().getFullYear();

    /* ============================================================
       3) DECIDE TARGET YEAR
    ============================================================ */
    const targetYear = selectedYear ?? defaultYear;

    /* ============================================================
       4) BUILD QUERY
    ============================================================ */
    const query = {
      companyId,
      year: targetYear,
    };

    /* ============================================================
       5) GET OPENING BALANCE
    ============================================================ */
    const list = await OpeningBalance.find(query)
      .populate({
        path: "accountId",
        model: "Account_document",
        select: "code name normalSide type",
      })
      .select("year debit credit note accountId")
      .lean()
      .limit(500);

    /* ============================================================
       6) META FOR MODAL
    ============================================================ */
    const editable = !closedYears.includes(targetYear);
    return res.json({
      success: true,
      list,
      meta: {
        selectedYear: targetYear,
        defaultYear,
        editable,
        closedYears,
      },
    });
  } catch (err) {
    console.error("GET OpeningBalance error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

/* ---------------------------- ADD OPENING ---------------------------- */
router.post("/", authenticate, async (req, res) => {
  try {
    const { accountId, debit, credit, year, note } = req.body;

    // ✅ Validate year
    const y = Number(year);
    if (!Number.isInteger(y) || y < 2000 || y > 2100) {
      return res.status(400).json({ error: "Invalid year" });
    }

    // ✅ Get closed years
    const periods = await accountingPeriod
      .find({ companyId: req.user.companyId }, { year: 1, _id: 0 })
      .lean();

    const closedYears = periods.map((p) => Number(p.year));

    if (closedYears.includes(y)) {
      return res.status(400).json({
        error: `Year ${y} is closed`,
      });
    }

    // ✅ Validate amounts and account ownership
    const { debit: d, credit: c } = await validateOpeningInput({
      companyId: req.user.companyId,
      accountId,
      debit,
      credit,
    });

    // ✅ Safe note
    const safeNote = String(note || "").slice(0, 500);

    // ✅ Create record
    const data = await OpeningBalance.create({
      companyId: req.user.companyId,
      userId: req.user._id,
      accountId,
      year: y,
      debit: d,
      credit: c,
      note: safeNote,
    });

    const populated = await data.populate({
      path: "accountId",
      select: "code name normalSide type",
    });

    res.json({ success: true, data: populated });
  } catch (err) {
    console.error("POST OpeningBalance error:", err);

    if (err.code === 11000) {
      return res.status(400).json({
        error: "Opening balance already exists for this account/year",
      });
    }

    res.status(400).json({ error: "Invalid request" });
  }
});

/* ---------------------------- UPDATE OPENING --------------------------- */
router.patch("/:id", authenticate, blockClosedJournal, async (req, res) => {
  try {
    const found = await OpeningBalance.findById(req.params.id);
    if (!found) return res.status(404).json({ error: "Not found" });

    // ✅ Ensure company
    if (String(found.companyId) !== String(req.user.companyId))
      return res.status(403).json({ error: "Not allowed" });

    // ✅ Closed years
    const periods = await accountingPeriod
      .find({ companyId: req.user.companyId }, { year: 1, _id: 0 })
      .lean();

    const closedYears = periods.map((p) => Number(p.year));

    // ✅ Validate new year
    const newYear = req.body.year ?? found.year;
    const y = Number(newYear);

    if (!Number.isInteger(y) || y < 2000 || y > 2100)
      return res.status(400).json({ error: "Invalid year" });

    if (closedYears.includes(y)) {
      return res.status(400).json({
        error: `Year ${y} is closed`,
      });
    }

    // ✅ Validate debit/credit/accountId
    const accountIdToValidate = req.body.accountId || found.accountId;
    const debit = "debit" in req.body ? req.body.debit : found.debit;
    const credit = "credit" in req.body ? req.body.credit : found.credit;

    const { debit: d, credit: c } = await validateOpeningInput({
      companyId: req.user.companyId,
      accountId: accountIdToValidate,
      debit,
      credit,
    });

    // ✅ Update safe
    const updated = await OpeningBalance.findByIdAndUpdate(
      req.params.id,
      {
        accountId: accountIdToValidate,
        debit: d,
        credit: c,
        year: y,
        note: String(req.body.note ?? found.note).slice(0, 500),
        userId: req.user._id,
      },
      { new: true }
    ).populate({ path: "accountId", select: "code name normalSide type" });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("PATCH OpeningBalance error:", err);
    res.status(400).json({ error: "Invalid request" });
  }
});

/* ---------------------------- DELETE OPENING --------------------------- */
router.delete("/:id", authenticate, blockClosedJournal, async (req, res) => {
  try {
    const found = await OpeningBalance.findById(req.params.id).lean();

    if (!found)
      return res.status(404).json({ error: "Opening balance not found" });

    // ✅ Ensure same company
    if (String(found.companyId) !== String(req.user.companyId))
      return res.status(403).json({ error: "Not allowed" });

    // ✅ Block closed year
    const periods = await accountingPeriod
      .find({ companyId: req.user.companyId }, { year: 1, _id: 0 })
      .lean();

    const closedYears = periods.map((p) => Number(p.year));

    if (closedYears.includes(found.year)) {
      return res.status(403).json({
        error: `Year ${found.year} is closed`,
      });
    }

    // ✅ Atomic delete
    const result = await OpeningBalance.deleteOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (result.deletedCount === 0)
      return res.status(404).json({ error: "Not found" });

    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("DELETE OpeningBalance error:", err);
    res.status(400).json({ error: "Invalid request" });
  }
});

export default router;
