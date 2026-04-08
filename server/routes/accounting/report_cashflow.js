import express from "express";
import mongoose from "mongoose";
import JournalEntry from "../../models/accouting_system_models/journalEntry_models.js";
import OpeningBalance from "../../models/accouting_system_models/OpeningBalance.js";
import Period from "../../models/accouting_system_models/accountingPeriod.js"; // adjust path as needed
import { resolveReportFilter } from "../../utils/balanceSheetFuntions.js";
import { authenticate } from "../../middleware/auth.js";

const router = express.Router();

// ============================================================
// CASH FLOW ACCOUNT CODE MAPPING (Indirect Method)
// Based on your chart of accounts structure
// ============================================================

const CASH_FLOW_MAP = {
  // ──────────────────────────────────────────────
  // SECTION A: OPERATING ACTIVITIES
  // ──────────────────────────────────────────────

  operating: {
    // ค่าเสื่อมราคา
    depreciation: {
      label: "ຄ່າຫຼຸ້ຍຫ້ຽນ , ຄ່າສູນເສຍມຼນຄ່າ ,ເງິນແຮ ແລະ ອື່ນໆ", ///ยอดเหลื้อท้าย บวก
      codes: ["681", "682", "683", "684", "685", "686", "687", "688"],
      reverseCodes: ["78"],
    },

    otherAdjustments: {
      label: "ອາກອນເຍື່ອງຊຳລະ",
      codes: ["694"],
      reverseCodes: ["699"],
    },

    investory: {
      label: "ສິນຄ້າໃນສາງ", /// ส่วนเปียนแปลง   ถ้าเพี่ม ติดลบ
      codes: ["137"],
    },
    // Working Capital sub-items
    workingCapital: {
      subItems: {
        receivables: {
          label: "ລູກໜີ້ການຄ້າ ແລະ ຄ່າໃຊ້ຈ່າຍລ່ວງໜ້າ",
          // 12, 142-148, 155, 160-167 | reverse: 129, 149, 159, 169
          prefixes: [
            "12",
            "142",
            "143",
            "144",
            "145",
            "146",
            "147",
            "148",
            "155",
            "160",
            "161",
            "162",
            "163",
            "164",
            "167",
          ],
          reversePrefixes: ["129", "149", "159", "169"],
        }, ///สินชับหมุนเวียน  ถ้าเพี่ม ติดลบ  ภ้า หลุด ติด บวก  เอาส่วนเปียนแปง
        payables: {
          label: "ເຈົ້າໜີ້ການຄ້າ ແລະ ຄ່າໃຊ້ຈ່າຍຄ້າງຈ່າຍ",
          // 401-403, 420-422, 430-438, 442, 447, 448, 455, 482
          prefixes: [
            "401",
            "402",
            "403",
            "420",
            "421",
            "422",
            "430",
            "431",
            "432",
            "433",
            "436",
            "437",
            "438",
            "442",
            "447",
            "448",
            "455",
            "482",
          ],
          reversePrefixes: [],
        }, //หนี้สินหมุนเวียน  บวก  เอาส่วนเปียนแปง
        otherWC: {
          label: "ລາຍການ Working Capital ອື່ນໆ",
          // 652, 752
          prefixes: ["752"],
          reversePrefixes: ["652"],
        }, //เอายอดเหลือท้าย
      },
    },
  },

  // ──────────────────────────────────────────────
  // SECTION B: INVESTING ACTIVITIES
  // ──────────────────────────────────────────────

  investing: {
    purchaseAssets: {
      label: "ຈ່າຍຊື້ສິນຊັບຖາວອນ",
      // 20, 21, 22, 237, 24, 25, 231, 232, 238
      codes: ["20", "21", "22", "237", "24", "25", "231", "232", "238"],
    },
    proceedsFromAssets: {
      label: "ຮັບເງິນຈາກການຂາຍ/ຄ່າຕ່ອນຄືນສິນຊັບ",
      // 1611, 404, 405, 4xx
      codes: ["1611", "404", "405"],
      //   prefixes: ["4"],
    },
  },

  // ──────────────────────────────────────────────
  // SECTION C: FINANCING ACTIVITIES
  // ──────────────────────────────────────────────

  financing: {
    loans: {
      label: "ຮັບເງິນກູ້ລະຍະຍາວ",
      // 154, 452, 453, 454, 456
      codes: ["154", "452", "453", "454", "456"],
    },
    capitalChanges: {
      label: "ເພີ່ມທຶນ / ຊຳລະທຶນຄືນ",
      // 153, 301, 302, 303, 304, 457
      codes: ["153", "301", "302", "303", "304", "457"],
    },
    intercompanyLoans: {
      label: "ຮັບ/ຈ່າຍກູ້ຢືມ ແລະ ສິ່ງຂອງຮ່ວມກັນ",
      // 412, 413, 417, 418, 443, 471-478, 481, 451, 458
      codes: ["412", "413", "417", "418", "443", "451", "458"],
      ranges: [
        { from: 471, to: 478 },
        { from: 481, to: 481 },
      ],
    },
  },

  // ──────────────────────────────────────────────
  // CASH & CASH EQUIVALENTS — 10, 11 | (109, 119, 411, 1139)
  // ──────────────────────────────────────────────
  cashAccounts: {
    codes: ["10", "11"],
    reverseCodes: ["109", "119", "411", "1139"],
  },
};

// ============================================================
// HELPER: Check if account code matches codes / prefixes / ranges
// ============================================================

function matchesCode(accountCode, codes = [], prefixes = [], ranges = []) {
  const code = accountCode?.toString() ?? "";

  // ✅ codes และ prefixes ใช้ regex เหมือนกัน
  const matchPattern = (list) =>
    list.some((p) => new RegExp(`^${p}(\\.|\\d|$)`).test(code));

  if (matchPattern(codes)) return true;
  if (matchPattern(prefixes)) return true;

  // Range match
  const baseCode = code.split(".")[0];
  const num = parseInt(baseCode, 10);
  if (!isNaN(num) && ranges.some((r) => num >= r.from && num <= r.to))
    return true;

  return false;
}
// ============================================================
// HELPER: Net movement of matching lines
// positive = net Dr side, negative = net Cr side
// reverseCodes/reversePrefixes flip the sign (parentheses in template)
// ============================================================

function getNetMovement(
  lines,
  codes = [],
  reverseCodes = [],
  prefixes = [],
  reversePrefixes = [],
  ranges = []
) {
  let total = 0;
  for (const line of lines) {
    const code = line.accountCode;
    const netDr = (line.debitLAK || 0) - (line.creditLAK || 0);
    if (matchesCode(code, codes, prefixes, ranges)) {
      total += netDr;
    } else if (matchesCode(code, reverseCodes, reversePrefixes, [])) {
      total -= netDr;
    }
  }
  return total;
}

// ============================================================
// GET /api/reports/cashflow
//
// Query params:
//   companyId  (required)
//   year       → full fiscal year  (default: max period year + 1)
//   month      → single month filter (1-12)
//   preset     → trailing months: 1 | 3 | 6 | 12
//   startDate  → custom range start (ISO string)
//   endDate    → custom range end   (ISO string)
//
// All date/period resolution is delegated to resolveReportFilter()
// ============================================================
// ── คำนวณ netIncome จาก signed ending balance ──
// function calcNetMovementSigned(lines, prefixes) {
//   return lines
//     .filter((l) => {
//       const code = l.accountCode ?? "";
//       return prefixes.some((p) => {
//         const pattern = new RegExp(`^${p}(\\.|\\d|$)`);
//         return pattern.test(code);
//       });
//     })
//     .reduce((sum, l) => {
//       const netDr = (l.debitLAK || 0) - (l.creditLAK || 0);
//       return sum + -netDr;
//     }, 0);
// }
function getDrOnly(lines, codes = [], prefixes = [], ranges = []) {
  let total = 0;
  for (const line of lines) {
    if (matchesCode(line.accountCode, codes, prefixes, ranges)) {
      total += (line.debitLAK || 0);
    }
  }
  return total;
}
function calcNetMovementSigned(lines, prefixes, excludePrefixes = []) {
  return lines
    .filter((l) => {
      const code = l.accountCode ?? "";
      const included = prefixes.some((p) =>
        new RegExp(`^${p}(\\.|\\d|$)`).test(code)
      );
      const excluded = excludePrefixes.some((p) =>
        new RegExp(`^${p}(\\.|\\d|$)`).test(code)
      );
      return included && !excluded;
    })
    .reduce((sum, l) => {
      const netDr = (l.debitLAK || 0) - (l.creditLAK || 0);
      return sum + -netDr;
    }, 0);
}
router.get("/", authenticate, async (req, res) => {
  try {
    const { ...queryRest } = req.query;

    const companyId = req.user.companyId;

    const companyObjId = new mongoose.Types.ObjectId(companyId);

    // ── 0. Load periods so resolveReportFilter can pick the default year ──
    const periods = await Period.find({ companyId: companyObjId })
      .select("year")
      .lean();

    // ── 1. Resolve date filter ──
    let filter;
    try {
      filter = resolveReportFilter({ query: queryRest, periods });
    } catch (filterErr) {
      return res.status(400).json({ message: filterErr.message });
    }

    const { year: fiscalYear, startDate: start, endDate: end, mode } = filter;

    // ── 2. Fetch posted JournalEntries in resolved period ──
    const entries = await JournalEntry.find({
      companyId: companyObjId,
      status: "posted",
      date: { $gte: start, $lte: end },
    })
      .populate({
        path: "lines.accountId",
        select: "code name type normalSide",
      })
      .lean();

    // Flatten lines with accountCode attached
    const allLines = [];
    for (const entry of entries) {
      for (const line of entry.lines) {
        allLines.push({
          ...line,
          accountCode: line.accountId?.code ?? "",
          accountName: line.accountId?.name ?? "",
          accountType: line.accountId?.type ?? "",
          entryDate: entry.date,
        });
      }
    }

    // ── 3. Opening Cash (OpeningBalance filtered to cash accounts only) ──
    const openingBalanceDocs = await OpeningBalance.find({
      companyId: companyObjId,
      year: fiscalYear,
    })
      .populate({ path: "accountId", select: "code" })
      .lean();

    const openingCash = openingBalanceDocs
      .filter((ob) =>
        matchesCode(
          ob.accountId?.code,
          CASH_FLOW_MAP.cashAccounts.codes,
          [],
          []
        )
      )
      .reduce((sum, ob) => sum + (ob.debit || 0) - (ob.credit || 0), 0);

    // ── 4. Operating Activities ──
    const map = CASH_FLOW_MAP;
    const wc = map.operating.workingCapital.subItems;

    const depreciation = getNetMovement(
      allLines,
      map.operating.depreciation.codes,
      map.operating.depreciation.reverseCodes
    );

    const otherAdjustments = getNetMovement(
      allLines,
      map.operating.otherAdjustments.codes,
      map.operating.otherAdjustments.reverseCodes
    );

    // สินค้าคงเหลือ: สินทรัพย์เพิ่ม = Dr เพิ่ม = netDr บวก = เงินสดออก → * -1
    const changeInventory =
      getNetMovement(
        allLines,
        [],
        [],
        [map.operating.investory.codes[0]] // prefix "13"
      ) * -1;

    // ลูกหนี้: สินทรัพย์เพิ่ม = เงินสดออก → * -1
    const changeReceivables =
      getNetMovement(
        allLines,
        [],
        [],
        wc.receivables.prefixes,
        wc.receivables.reversePrefixes
      ) * -1;

    // เจ้าหนี้: หนี้สินเพิ่ม = Cr เพิ่ม = netDr ลบ → * -1 เพื่อให้ได้บวก
    const changePayables =
      getNetMovement(
        allLines,
        [],
        [],
        wc.payables.prefixes,
        wc.payables.reversePrefixes
      ) * -1;

    // const changeOtherWC = getNetMovement(
    //   allLines,
    //   [],
    //   [],
    //   wc.otherWC.prefixes,
    //   wc.otherWC.reversePrefixes
    // ) * -1;
    const changeOtherWC =
      calcNetMovementSigned(allLines, ["752"]) +
      calcNetMovementSigned(allLines, ["652"]);
    // รายได้ 7xx - ค่าใช้จ่าย 6xx
    const totalRevenue7xx = calcNetMovementSigned(allLines, ["7"], ["752"]);
    const totalExpense6xx = calcNetMovementSigned(allLines, ["6"], ["652"]);

    const netIncome = totalRevenue7xx + totalExpense6xx + changeOtherWC;
    console.log("changeOtherWC", changeOtherWC);
    const totalOperating =
      netIncome +
      depreciation +
      otherAdjustments +
      changeInventory +
      changeReceivables +
      changePayables;

    // ── 5. Investing Activities ──
    // purchaseAssets: Dr movement on fixed-asset accounts = outflow → negate
   const purchaseAssets = getDrOnly(allLines, map.investing.purchaseAssets.codes) * -1;
    const proceedsFromAssets = getNetMovement(
      allLines,
      map.investing.proceedsFromAssets.codes,
      [],
      map.investing.proceedsFromAssets.prefixes
    );

    const totalInvesting = purchaseAssets + proceedsFromAssets;

    // ── 6. Financing Activities ──
    const loansReceived =
      getNetMovement(allLines, map.financing.loans.codes) * -1;

    const capitalChanges =
      getNetMovement(allLines, map.financing.capitalChanges.codes) * -1;

    const intercompany = getNetMovement(
      allLines,
      map.financing.intercompanyLoans.codes,
      [],
      [],
      [],
      map.financing.intercompanyLoans.ranges
    );

    const totalFinancing = loansReceived + capitalChanges + intercompany;

    // ── 7. Net Change & Closing Cash ──
    const netChange = totalOperating + totalInvesting + totalFinancing;
    const closingCash = openingCash + netChange;

    // ── 8. Build response ──
    // ── 8. Build response ──
    const report = {
      companyId,
      year: fiscalYear,
      mode,
      period: { from: start, to: end },
      currency: "LAK",

      operating: {
        label: "ກະແສເງິນສົດທີ່ໄດ້ຮັບ/ໃຊ້ຈາກກິດຈະການດຳເນີນງານ",
        items: [
          {
            label: "ກຳໄລ (ຂາດທຶນ) ສຸດທິປະຈຳປີ", // ✅ คำนวณเอง
            amount: netIncome,
          },
          { label: map.operating.depreciation.label, amount: depreciation },
          {
            label: map.operating.otherAdjustments.label,
            amount: otherAdjustments,
          },
          { label: map.operating.investory.label, amount: changeInventory }, // ✅ เพิ่ม
          { label: wc.receivables.label, amount: changeReceivables },
          { label: wc.payables.label, amount: changePayables },
          { label: wc.otherWC.label, amount: changeOtherWC },
        ],
        total: totalOperating,
      },

      investing: {
        label: "ກະແສເງິນສົດທີ່ໄດ້ຮັບ/ໃຊ້ຈາກກິດຈະການລົງທຶນ",
        items: [
          { label: map.investing.purchaseAssets.label, amount: purchaseAssets },
          {
            label: map.investing.proceedsFromAssets.label,
            amount: proceedsFromAssets,
          },
        ],
        total: totalInvesting,
      },

      financing: {
        label: "ກະແສເງິນສົດທີ່ໄດ້ຮັບ/ໃຊ້ຈາກກິດຈະການດ້ານການເງິນ",
        items: [
          { label: map.financing.loans.label, amount: loansReceived },
          { label: map.financing.capitalChanges.label, amount: capitalChanges },
          {
            label: map.financing.intercompanyLoans.label,
            amount: intercompany,
          },
        ],
        total: totalFinancing,
      },

      summary: {
        openingCash,
        netCashChange: netChange,
        closingCash,
      },
    };

    return res.status(200).json({ success: true, data: report });
  } catch (err) {
    console.error("[CashFlow Error]", err);
    return res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
});

export default router;
