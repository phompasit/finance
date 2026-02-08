import express from "express";
import { authenticate } from "../../middleware/auth.js";
import Account from "../../models/accouting_system_models/Account_document.js";
import OpeningBalance from "../../models/accouting_system_models/OpeningBalance.js";
import JournalEntry from "../../models/accouting_system_models/journalEntry_models.js";
import { resolveReportFilter } from "../../utils/balanceSheetFuntions.js";

const router = express.Router();

/* ================= Helpers ================= */
const applyBalanceSide = (normalSide, balance, dr, cr) =>
  normalSide === "Dr" ? balance + dr - cr : balance + cr - dr;

const isoDate = (d) => d.toISOString().slice(0, 10);

/* ================= CASH BOOK ================= */
router.get("/cash-book", authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    let { page = 1, limit = 10 } = req.query;

    page = Math.max(1, Number(page));
    limit = Math.max(1, Number(limit));

    /* ---------- Date Filter ---------- */
    const { startDate, endDate, year } = resolveReportFilter({
      query: req.query,
    });

    const start = startDate ? new Date(startDate) : new Date(`${year}-01-01`);
    const end = endDate ? new Date(endDate) : new Date(`${year}-12-31`);
    end.setHours(23, 59, 59, 999);

    /* ---------- Cash Accounts (101x) ---------- */
    const cashAccounts = await Account.find({
      companyId,
      code: /^101/, // เงินสด / เงินฝาก
      parentCode: { $ne: null },
    }).lean();

    if (!cashAccounts.length) {
      return res.json({
        success: true,
        rows: [],
        page,
        totalPages: 1,
        total: 0,
      });
    }

    const cashIds = cashAccounts.map((a) => String(a._id));

    /* ---------- Opening Balances ---------- */
    const openings = await OpeningBalance.find({
      companyId,
      year: start.getFullYear(),
      accountId: { $in: cashIds },
    }).lean();

    let running = 0;
    for (const o of openings) {
      running = applyBalanceSide("Dr", running, o.debit || 0, o.credit || 0);
    }

    /* ---------- Journals ---------- */
    const journals = await JournalEntry.find({
      companyId,
      date: { $gte: start, $lte: end },
      "lines.accountId": { $in: cashIds },
    })
      .sort({ date: 1 })
      .lean();

    /* ---------- preload accounts ---------- */
    const accIds = [
      ...new Set(
        journals.flatMap((j) =>
          j.lines.map((l) => String(l.accountId))
        )
      ),
    ];

    const accList = await Account.find(
      { _id: { $in: accIds }, companyId },
      { code: 1, name: 1 }
    ).lean();

    const accMap = Object.fromEntries(
      accList.map((a) => [String(a._id), a])
    );

    /* ---------- Build rows ---------- */
    const rows = [];

    /* ===== Opening Balance Row ===== */
    rows.push({
      date: isoDate(start),
      description: "Opening Balance",
      dr: running > 0 ? running : 0,
      cr: running < 0 ? Math.abs(running) : 0,
      balance: running,
      counterAccounts: [],
      isOpening: true,
    });

    /* ===== Transaction Rows ===== */
    for (const j of journals) {
      const cashLine = j.lines.find((l) =>
        cashIds.includes(String(l.accountId))
      );
      if (!cashLine) continue;

      const dr = cashLine.side === "dr" ? cashLine.amountLAK : 0;
      const cr = cashLine.side === "cr" ? cashLine.amountLAK : 0;

      running = applyBalanceSide("Dr", running, dr, cr);
      const counterAccounts = j.lines
        .filter((l) => cashIds.includes(String(l.accountId))) // ✅ เอาเฉพาะฝั่งตรงข้าม
        .map((l) => {
          const acc = accMap[String(l.accountId)];
          return {
            accountId: l.accountId,
            code: acc?.code,
            name: acc?.name,
            side: l.side,
            amount: l.amountLAK,
          };
        });

      rows.push({
        date: isoDate(j.date),
        description: j.description || "",
        reference: j.reference || "",
        dr,
        cr,
        balance: running,
        counterAccounts,
      });
    }

    /* ---------- Pagination ---------- */
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const paged = rows.slice((page - 1) * limit, page * limit);

    /* ---------- Response ---------- */
    res.json({
      success: true,
      rows: paged,
      page,
      limit,
      total,
      totalPages,
    });
  } catch (err) {
    console.error("CASH BOOK ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
