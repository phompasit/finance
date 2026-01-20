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

    const opennigbalance = await accountingPeriod
      .findOne({
        companyId: req.user.companyId,
      })
      .select("status_close");

    if (!opennigbalance) {
      return res.status(404).json({
        success: false,
        error: "Journal not found",
      });
    }

    if (opennigbalance.status_close === "locked") {
      return res.status(403).json({
        success: false,
        error: "❌ ປີນີ້ຖືກປິດແລ້ວບໍ່ສາມາດແກ້ໄຂໄດ້",
      });
    }

    next();
  } catch (err) {
    console.error("blockClosedJournal error:", err);
    res.status(500).json({ success: false });
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

    /* ============================================================
       1) GET CLOSED PERIODS
    ============================================================ */
    const closedPeriods = await accountingPeriod
      .find({ companyId, isClosed: true })
      .select("year -_id")
      .lean();

    const closedYears = closedPeriods.map(p => p.year);

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
      .select("-companyId -status_close")
      .lean();

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
        closedYears,
        editable,
      },
    });

  } catch (err) {
    console.error("GET OpeningBalance error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});



/* ---------------------------- ADD OPENING ---------------------------- */
router.post("/", authenticate, async (req, res) => {
  try {
    const { accountId, debit, credit, year, note } = req.body;
    // 1️⃣ ดึงปีที่ปิดแล้ว
    const periods = await accountingPeriod
      .find({ companyId: req.user.companyId }, { year: 1, _id: 0 })
      .lean();
    console.log(year);
    const closedYears = periods.map((p) => Number(p.year));

    // 3️⃣ ตรวจสอบ ❌ ห้ามบันทึกในปีที่ปิดแล้ว
    if (closedYears.includes(year)) {
      return res.status(400).json({
        success: false,
        error: `❌ ປີ${year} ຖືກປິດໄປແລ້ວ ກະລຸນາລະບຸປີຖັດໄປ`,
      });
    }
    // validation (throws error message)
    const { account, debit: d, credit: c } = await validateOpeningInput({
      companyId: req.user.companyId,
      accountId,
      debit,
      credit,
    });
    const data = await OpeningBalance.create({
      companyId: req.user.companyId,
      userId: req.user._id,
      accountId,
      year,
      debit: d,
      credit: c,
      note: note || "",
    });

    // return populated
    const populated = await data.populate({
      path: "accountId",
      select: "code name normalSide type",
    });

    res.json({ success: true, data: populated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ---------------------------- UPDATE OPENING --------------------------- */
router.patch("/:id", authenticate, blockClosedJournal, async (req, res) => {
  try {
    const found = await OpeningBalance.findById(req.params.id);
    if (!found)
      return res.status(404).json({ error: "Opening balance not found" });
    const periods = await accountingPeriod
      .find({ companyId: req.user.companyId }, { year: 1, _id: 0 })
      .lean();

    const closedYears = periods.map((p) => Number(p.year));

    // 3️⃣ ตรวจสอบ ❌ ห้ามบันทึกในปีที่ปิดแล้ว
    if (closedYears.includes(found.year)) {
      return res.status(400).json({
        success: false,
        error: `❌ ປີ${found.year} ຖືກປິດໄປແລ້ວ ກະລຸນາລະບຸປີຖັດໄປ`,
      });
    }
    // ensure same company
    if (String(found.companyId) !== String(req.user.companyId)) {
      return res.status(403).json({ error: "Not allowed" });
    }

    // Determine accountId for validation: either new provided or existing
    const accountIdToValidate = req.body.accountId || found.accountId;
    const debit = "debit" in req.body ? req.body.debit : found.debit;
    const credit = "credit" in req.body ? req.body.credit : found.credit;

    const { account, debit: d, credit: c } = await validateOpeningInput({
      companyId: req.user.companyId,
      accountId: accountIdToValidate,
      debit,
      credit,
    });

    const updated = await OpeningBalance.findByIdAndUpdate(
      req.params.id,
      {
        ...(req.body.accountId && { accountId: req.body.accountId }),
        debit: d,
        credit: c,
        note: req.body.note ?? found.note,
        year: req.body.year ?? found.year,
        userId: req.user._id, // last modified user
      },
      { new: true }
    ).populate({ path: "accountId", select: "code name normalSide type" });

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ---------------------------- DELETE OPENING --------------------------- */
router.delete("/:id", authenticate, blockClosedJournal, async (req, res) => {
  try {
    const found = await OpeningBalance.findById(req.params.id);
    if (!found)
      return res.status(404).json({ error: "Opening balance not found" });
    const periods = await accountingPeriod
      .find({ companyId: req.user.companyId }, { year: 1, _id: 0 })
      .lean();

    const closedYears = periods.map((p) => Number(p.year));

    // 3️⃣ ตรวจสอบ ❌ ห้ามบันทึกในปีที่ปิดแล้ว
    if (closedYears.includes(found.year)) {
      return res.status(400).json({
        success: false,
        error: `❌ ປີ${found.year} ຖືກປິດໄປແລ້ວ ກະລຸນາລະບຸປີຖັດໄປ`,
      });
    }
    if (String(found.companyId) !== String(req.user.companyId)) {
      return res.status(403).json({ error: "Not allowed" });
    }

    await OpeningBalance.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
