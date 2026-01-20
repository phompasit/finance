import express from "express";
import { authenticate } from "../../middleware/auth.js";
import Account from "../../models/accouting_system_models/Account_document.js";
import OpeningBalance from "../../models/accouting_system_models/OpeningBalance.js";
import JournalEntry from "../../models/accouting_system_models/journalEntry_models.js";
import { resolveReportFilter } from "../../utils/balanceSheetFuntions.js";

const router = express.Router();

/* ========================================================================== */
/*                                   Helpers                                  */
/* ========================================================================== */

// คำนวณ balance ตาม normal side
const applyBalanceSide = (normalSide, balance, dr, cr) =>
  normalSide === "Dr" ? balance + dr - cr : balance + cr - dr;

// YYYY-MM-DD
const isoDate = (d) => d.toISOString().slice(0, 10);

const ACCOUNT_GROUP_MAP = {
  cash: /^101/,
  bank: /^102/,
};

/* ========================================================================== */
/*                                GENERAL LEDGER                               */
/* ========================================================================== */
router.get("/general-ledger", authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId;

    /* ================= Query ================= */
    let {
      accountId = "ALL",
      accountGroup,
      page = 1,
      limit = 10,
      forPdf = "false",
    } = req.query;

    const isPdf = forPdf === "true";
    page = Math.max(1, Number(page) || 1);
    limit = Math.max(1, Number(limit) || 10);
    if (accountId === "ALL") accountId = null;

    /* ================= Date Filter ================= */
    const { startDate, endDate, year } = resolveReportFilter({
      query: req.query,
    });

    const start = startDate ? new Date(startDate) : new Date(year, 0, 1);
    const end = endDate ? new Date(endDate) : new Date(year, 11, 31);
    end.setHours(23, 59, 59, 999);

    /* ================= Account Filter ================= */
    const accountFilter = {
      companyId,
      parentCode: { $ne: null },
      ...(accountId && { _id: accountId }),
    };

    if (accountGroup && ACCOUNT_GROUP_MAP[accountGroup]) {
      accountFilter.code = ACCOUNT_GROUP_MAP[accountGroup];
    }

    const accounts = await Account.find(accountFilter).lean();
    if (accountId && accounts.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Account not found",
      });
    }

    /* ================= Opening Balance (ปีก่อน) ================= */
    const openings = await OpeningBalance.find({
      companyId,
      year: start.getFullYear(),
      ...(accountId && { accountId }),
    }).lean();

    const openingMap = Object.fromEntries(
      openings.map((o) => [
        String(o.accountId),
        {
          dr: Number(o.debit || 0),
          cr: Number(o.credit || 0),
        },
      ])
    );

    /* ================= Build Account Map ================= */
    // ❗ ต้องสร้าง accountMap ก่อน carry
    const accountMap = {};

    for (const acc of accounts) {
      const ob = openingMap[String(acc._id)] || { dr: 0, cr: 0 };
      const openingBalance = applyBalanceSide(acc.normalSide, 0, ob.dr, ob.cr);

      accountMap[String(acc._id)] = {
        accountId: acc._id,
        accountCode: acc.code,
        accountName: acc.name,
        normalSide: acc.normalSide,
        opening: {
          date: "",
          description: "Opening Balance",
          dr: ob.dr,
          cr: ob.cr,
          balance: openingBalance,
        },
        running: openingBalance, // running เริ่มจาก opening ปีก่อน
      };
    }

    /* ================= Carry Forward (เดือนก่อน) ================= */
    // 👉 เอาไปบวก running เท่านั้น (ไม่โชว์ row)
    const carryJournals = await JournalEntry.find({
      companyId,
      date: {
        $gte: new Date(year, 0, 1), // ปีเดียวกัน
        $lt: start,                // ก่อน startDate
      },
      ...(accountId && { "lines.accountId": accountId }),
    }).lean();

    for (const j of carryJournals) {
      for (const line of j.lines || []) {
        const acc = accountMap[String(line.accountId)];
        if (!acc) continue;

        const dr = line.side === "dr" ? Number(line.amountLAK || 0) : 0;
        const cr = line.side === "cr" ? Number(line.amountLAK || 0) : 0;

        acc.running = applyBalanceSide(acc.normalSide, acc.running, dr, cr);
      }
    }

    // 🔥 สำคัญที่สุด: sync opening row หลังรวม carry
    for (const acc of Object.values(accountMap)) {
      acc.opening.balance = acc.running;
    }

    /* ================= Movement (ช่วงที่เลือกจริง) ================= */
    const journals = await JournalEntry.find({
      companyId,
      date: { $gte: start, $lte: end },
      ...(accountId && { "lines.accountId": accountId }),
    })
      .sort({ date: 1 })
      .lean();

    const flatRows = [];

    for (const j of journals) {
      for (const line of j.lines || []) {
        const acc = accountMap[String(line.accountId)];
        if (!acc) continue;

        const dr = line.side === "dr" ? Number(line.amountLAK || 0) : 0;
        const cr = line.side === "cr" ? Number(line.amountLAK || 0) : 0;

        acc.running = applyBalanceSide(acc.normalSide, acc.running, dr, cr);

        flatRows.push({
          accountId: acc.accountId,
          date: isoDate(j.date),
          debitOriginal: line.debitOriginal,
          creditOriginal: line.creditOriginal,
          exchangeRate: line.exchangeRate,
          description: j.description || "",
          reference: j.reference || "",
          dr,
          cr,
          balance: acc.running,
        });
      }
    }

    /* ================= Pagination ================= */
    const totalRows = flatRows.length;
    const totalPages = isPdf ? 1 : Math.ceil(totalRows / limit);

    const pagedRows = isPdf
      ? flatRows
      : flatRows.slice((page - 1) * limit, page * limit);

    /* ================= Group Result ================= */
    const result = {};

    for (const row of pagedRows) {
      if (!result[row.accountId]) {
        const acc = accountMap[String(row.accountId)];
        result[row.accountId] = {
          accountId: acc.accountId,
          accountCode: acc.accountCode,
          accountName: acc.accountName,
          normalSide: acc.normalSide,
          rows: [acc.opening], // opening (รวม carry แล้ว)
        };
      }
      result[row.accountId].rows.push(row);
    }

    /* ================= Response ================= */
    return res.json({
      success: true,
      mode: accountId
        ? "SINGLE"
        : accountGroup
        ? accountGroup.toUpperCase()
        : "ALL",
      page,
      limit,
      total: totalRows,
      totalPages,
      accounts: Object.values(result),
    });
  } catch (err) {
    console.error("GENERAL LEDGER ERROR:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;
