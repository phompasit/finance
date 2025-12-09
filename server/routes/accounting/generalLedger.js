import express from "express";
import { authenticate } from "../../middleware/auth.js";
import Account from "../../models/accouting_system_models/Account_document.js";
import OpeningBalance from "../../models/accouting_system_models/OpeningBalance.js";
import JournalEntry from "../../models/accouting_system_models/journalEntry_models.js";

const router = express.Router();

/* ------------------------- Helper: compute running bal ------------------------- */
function applyBalanceSide(normalSide, balance, dr, cr) {
  if (normalSide === "Dr") {
    return balance + dr - cr;
  } else {
    return balance + cr - dr;
  }
}

/* -------------------------- MAIN API: General Ledger -------------------------- */
router.get("/general-ledger", authenticate, async (req, res) => {
  try {
    const { accountId, startDate, endDate } = req.query;
    const companyId = req.user.companyId;

    if (!accountId)
      return res.status(400).json({ success: false, error: "accountId required" });

    const account = await Account.findOne({ _id: accountId, companyId }).lean();
    if (!account)
      return res.status(404).json({ success: false, error: "Account not found" });

    const start = startDate ? new Date(startDate) : new Date("2000-01-01");
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    /* --- Opening Balance --- */
    const opening = await OpeningBalance.findOne({
      companyId,
      accountId,
      year: start.getFullYear(),
    }).lean();

    let openingDr = opening?.debit || 0;
    let openingCr = opening?.credit || 0;

    /* --- Sum journals BEFORE start date (running balance forward) --- */
    const journalsBefore = await JournalEntry.find({
      companyId,
      date: { $lt: start },
      "lines.accountId": accountId,
    }).lean();

    journalsBefore.forEach(j => {
      j.lines.forEach(ln => {
        if (String(ln.accountId) !== String(accountId)) return;
        if (ln.side === "dr") openingDr += ln.amountLAK;
        else openingCr += ln.amountLAK;
      });
    });

    /* --- Get journals inside the period --- */
    const journals = await JournalEntry.find({
      companyId,
      date: { $gte: start, $lte: end },
      "lines.accountId": accountId,
    })
      .sort({ date: 1 })
      .lean();

    /* --- Build ledger rows --- */
    const rows = [];
    let runningBalance = applyBalanceSide(account.normalSide, 0, openingDr, openingCr);

    rows.push({
      date: startDate || start.toISOString().slice(0, 10),
      description: "Opening Balance",
      reference: "-",
      dr: openingDr,
      cr: openingCr,
      balance: runningBalance,
    });

    journals.forEach(j => {
      j.lines.forEach(ln => {
        if (String(ln.accountId) !== String(accountId)) return;

        const dr = ln.side === "dr" ? ln.amountLAK : 0;
        const cr = ln.side === "cr" ? ln.amountLAK : 0;

        runningBalance = applyBalanceSide(account.normalSide, runningBalance, dr, cr);

        rows.push({
          date: j.date.toISOString().slice(0, 10),
          description: j.description || "",
          reference: j.reference || "",
          dr,
          cr,
          balance: runningBalance,
        });
      });
    });

    return res.json({
      success: true,
      account: { code: account.code, name: account.name },
      rows,
      totals: {
        dr: rows.reduce((s, r) => s + r.dr, 0),
        cr: rows.reduce((s, r) => s + r.cr, 0),
        ending: runningBalance,
      },
    });
  } catch (err) {
    console.error("GL ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
