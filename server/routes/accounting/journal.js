import express from "express";
import JournalEntry from "../../models/accouting_system_models/journalEntry_models.js";
import { authenticate } from "../../middleware/auth.js";

const router = express.Router();

/* =====================================================
   GET ALL JOURNALS
===================================================== */
router.get("/", authenticate, async (req, res) => {
  try {
    const list = await JournalEntry.find({
      companyId: req.user.companyId,
    })
      .populate("lines.accountId")
      .sort({ createdAt: -1 });

    res.json({ success: true, journals: list });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* =====================================================
   GET JOURNAL BY ID
===================================================== */
router.get("/:id", authenticate, async (req, res) => {
  try {
    const journal = await JournalEntry.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    }).populate("lines.accountId");

    if (!journal) return res.status(404).json({ error: "Not found" });

    res.json({ success: true, journal });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* =====================================================
   CREATE JOURNAL ENTRY
===================================================== */
router.post("/", authenticate, async (req, res) => {
  try {
    const { date, description, reference, lines } = req.body;

    if (!lines || lines.length === 0) {
      return res.status(400).json({ error: "At least one journal line required" });
    }

    // Calculate totals
    let totalDebit = 0;
    let totalCredit = 0;

    const validatedLines = lines.map((ln) => {
      if (!ln.amountOriginal || ln.amountOriginal <= 0) {
        throw new Error("Invalid amountOriginal");
      }

      if (!ln.exchangeRate || ln.exchangeRate <= 0) {
        throw new Error("Invalid exchange rate");
      }

      const amountLAK = ln.amountOriginal * ln.exchangeRate;

      if (ln.side === "dr") totalDebit += amountLAK;
      if (ln.side === "cr") totalCredit += amountLAK;

      return {
        ...ln,
        amountLAK,
        debitLAK: ln.side === "dr" ? amountLAK : 0,
        creditLAK: ln.side === "cr" ? amountLAK : 0,
      };
    });

    // DR must equal CR
    if (Math.round(totalDebit) !== Math.round(totalCredit)) {
      return res.status(400).json({
        error: "Total Debit LAK must equal Total Credit LAK",
      });
    }

    const newJournal = await JournalEntry.create({
      companyId: req.user.companyId,
      userId: req.user._id,
      date,
      description,
      reference,
      totalDebitLAK: totalDebit,
      totalCreditLAK: totalCredit,
      lines: validatedLines,
    });

    res.json({ success: true, journal: newJournal });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* =====================================================
   UPDATE JOURNAL ENTRY
===================================================== */
router.patch("/:id", authenticate, async (req, res) => {
  try {
    const { date, description, reference, lines } = req.body;

    // Validate same rules as create
    let totalDebit = 0;
    let totalCredit = 0;

    const validatedLines = lines.map((ln) => {
      if (!ln.amountOriginal || ln.amountOriginal <= 0) {
        throw new Error("Invalid amountOriginal");
      }

      if (!ln.exchangeRate || ln.exchangeRate <= 0) {
        throw new Error("Invalid exchange rate");
      }

      const amountLAK = ln.amountOriginal * ln.exchangeRate;

      if (ln.side === "dr") totalDebit += amountLAK;
      if (ln.side === "cr") totalCredit += amountLAK;

      return {
        ...ln,
        amountLAK,
        debitLAK: ln.side === "dr" ? amountLAK : 0,
        creditLAK: ln.side === "cr" ? amountLAK : 0,
      };
    });

    if (Math.round(totalDebit) !== Math.round(totalCredit)) {
      return res.status(400).json({
        error: "Total Debit LAK must equal Total Credit LAK",
      });
    }

    const journal = await JournalEntry.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId: req.user.companyId,
      },
      {
        date,
        description,
        reference,
        lines: validatedLines,
        totalDebitLAK: totalDebit,
        totalCreditLAK: totalCredit,
      },
      { new: true }
    );

    if (!journal) return res.status(404).json({ error: "Not found" });

    res.json({ success: true, journal });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* =====================================================
   DELETE JOURNAL ENTRY
===================================================== */
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const deleted = await JournalEntry.findOneAndDelete({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!deleted) return res.status(404).json({ error: "Not found" });

    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
