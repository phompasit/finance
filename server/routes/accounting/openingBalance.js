import express from "express";
import OpeningBalance from "../../models/accouting_system_models/OpeningBalance.js";
import Account_document from "../../models/accouting_system_models/Account_document.js";
import { authenticate } from "../../middleware/auth.js";
import mongoose from "mongoose";

const router = express.Router();

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
    throw new Error("Both debit and credit cannot be greater than zero at the same time");
  }

  // at least one > 0 (change this rule if you want to allow zero-zero)
  if (d === 0 && c === 0) {
    throw new Error("Please provide an amount on either debit or credit");
  }

  // enforce normal side
  if (account.normalSide === "Dr" && c > 0) {
    throw new Error(`Account normal side is Dr — please put amount in debit (not credit)`);
  }
  if (account.normalSide === "Cr" && d > 0) {
    throw new Error(`Account normal side is Cr — please put amount in credit (not debit)`);
  }

  return { account, debit: d, credit: c };
}

/* -------------------------- GET ALL BY YEAR -------------------------- */
router.get("/:year", authenticate, async (req, res) => {
  try {
    const list = await OpeningBalance.find({
      companyId: req.user.companyId,
      year: req.params.year,
    })
      .populate({
        path: "accountId",
        model: "Account_document",
        select: "code name normalSide type",
      })
      .lean();

    res.json({ success: true, list });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ---------------------------- ADD OPENING ---------------------------- */
router.post("/", authenticate, async (req, res) => {
  try {
    const { accountId, debit, credit, year, note } = req.body;

    // validation (throws error message)
    const { account, debit: d, credit: c } = await validateOpeningInput({
      companyId: req.user.companyId,
      accountId,
      debit,
      credit,
    });

    // optional: check duplicate for same account/year
    const exists = await OpeningBalance.findOne({
      companyId: req.user.companyId,
      accountId,
      year,
    });
    if (exists) {
      return res.status(400).json({ error: "Opening balance for this account and year already exists" });
    }

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
router.patch("/:id", authenticate, async (req, res) => {
  try {
    const found = await OpeningBalance.findById(req.params.id);
    if (!found) return res.status(404).json({ error: "Opening balance not found" });

    // ensure same company
    if (String(found.companyId) !== String(req.user.companyId)) {
      return res.status(403).json({ error: "Not allowed" });
    }

    // Determine accountId for validation: either new provided or existing
    const accountIdToValidate = req.body.accountId || found.accountId;
    const debit = ("debit" in req.body) ? req.body.debit : found.debit;
    const credit = ("credit" in req.body) ? req.body.credit : found.credit;

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
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const found = await OpeningBalance.findById(req.params.id);
    if (!found) return res.status(404).json({ error: "Opening balance not found" });

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
