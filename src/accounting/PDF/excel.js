import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

/* ================= Helpers ================= */
const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "");

const num = (n) =>
  n !== null && n !== undefined && n !== "" ? Number(n) : null;

/* ================= Styles ================= */
const FONT = { name: "Noto Sans Lao", size: 11 };
const FONT_BOLD = { name: "Noto Sans Lao", size: 11, bold: true };

const BORDER_ALL = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};

const styleRow = (row) => {
  row.eachCell((cell, colNumber) => {
    cell.font = FONT;
    cell.border = BORDER_ALL;
    cell.alignment =
      colNumber >= 5
        ? { horizontal: "right", vertical: "middle" }
        : { horizontal: "center", vertical: "middle" };

    if ([5, 7, 8, 9].includes(colNumber)) {
      cell.numFmt = "#,##0.00;[Red]-#,##0.00";
    }
  });
};

/* ================= Export ================= */
export const exportGeneralLedgerToExcel = async ({
  data,
  user,
  dateRange,
  activeTab,
}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Accounting System";
  workbook.created = new Date();

  const headings = {
    CASH: "ປື້ມຕິດຕາມບັນຊີເງິນສົດ",
    BANK: "ປື້ມຕິດຕາມບັນຊີເງິນຝາກ",
    ALL: "ປື້ມຕິດຕາມບັນຊີໃຫຍ່ແຍກປະເພດ",
  };

  const title = headings[activeTab] || "";

  (Array.isArray(data) ? data : [data]).forEach((accData) => {
    const ws = workbook.addWorksheet(accData.accountCode || "Ledger", {
      views: [{ state: "frozen", ySplit: 11 }],
    });

    /* ================= Column Setup ================= */
    ws.columns = [
      { header: "#", width: 5 },
      { header: "ວັນທີ່", width: 12 },
      { header: "ອ້າງອີງ", width: 18 },
      { header: "ເນື່ອໃນລາຍການ", width: 40 },
      { header: "ມູນຄ່າເດີມ", width: 16 },
      { header: "ອັດຕາແລກປ່ຽນ", width: 14 },
      { header: "ໜີ້ (Dr)", width: 16 },
      { header: "ມີ (Cr)", width: 16 },
      { header: "ຍອດເຫຼືອ", width: 18 },
    ];

    /* ================= National Header ================= */
    ws.mergeCells("A1:I1");
    ws.mergeCells("A2:I2");

    ws.getCell("A1").value = "ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ";
    ws.getCell("A2").value = "ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ";

    ["A1", "A2"].forEach((c) => {
      ws.getCell(c).font = { ...FONT_BOLD, size: 12 };
      ws.getCell(c).alignment = { horizontal: "center" };
    });

    /* ================= Company Info ================= */
    /* ================= Company Info ================= */
    ws.mergeCells("A4:F4");
    ws.mergeCells("A5:F5");
    ws.mergeCells("A6:F6");

    ws.getCell("A4").value = user.companyId.name;
    ws.getCell("A5").value = `ທີ່ຢູ່: ${user.companyId.address}`;
    ws.getCell("A6").value = `ເບີໂທ: ${user.companyId.phone}`;

    /* ================= Doc No / Date (ขวา) ================= */
    ws.mergeCells("G5:I5");
    ws.mergeCells("G6:I6");

    ws.getCell("G5").value = "ເລກທີ່.............................";
    ws.getCell("G6").value = "ວັນທີ່............/....../...........";

    ws.getCell("H5").alignment = ws.getCell("H6").alignment = {
      horizontal: "right",
    };

    /* ================= Title ================= */
    ws.mergeCells("A8:I8");
    ws.getCell("A8").value = title;
    ws.getCell("A8").font = { ...FONT_BOLD, size: 16 };
    ws.getCell("A8").alignment = { horizontal: "center" };

    /* ================= Period ================= */
    ws.mergeCells("A9:I9");
    ws.getCell("A9").value = `Reporting Period: ${dateRange}`;
    ws.getCell("A9").font = FONT_BOLD;
    ws.getCell("A9").alignment = { horizontal: "center" };

    /* ================= Account Header ================= */
    ws.mergeCells("A11:F11");
    ws.getCell("A11").value = `${accData.accountCode} - ${accData.accountName}`;
    ws.getCell("A11").font = FONT_BOLD;

    ws.getCell("I11").value = "ສະກຸນ: LAK";
    ws.getCell("I11").font = FONT_BOLD;
    ws.getCell("I11").alignment = { horizontal: "right" };

    /* ================= Table Header ================= */
    const headerRow = ws.getRow(12);
    headerRow.values = ws.columns.map((c) => c.header);

    headerRow.eachCell((cell) => {
      cell.font = FONT_BOLD;
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = BORDER_ALL;
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD9D9D9" },
      };
    });

    let line = 1;

    /* ================= Opening Balance ================= */
    const opening = accData.rows?.find(
      (r) => r.description === "Opening Balance"
    );

    if (opening) {
      const r = ws.addRow([
        line++,
        "",
        "-",
        "ຍອດຍົກມາ",
        null,
        null,
        null,
        null,
        num(opening.balance),
      ]);
      styleRow(r);
    }

    /* ================= Transactions ================= */
    accData.rows
      ?.filter((r) => r.description !== "Opening Balance")
      .forEach((t) => {
        const original = t.side === "dr" ? t.debitOriginal : t.creditOriginal;

        const r = ws.addRow([
          line++,
          formatDate(t.date),
          t.reference || "",
          t.description || "",
          num(original),
          t.exchangeRate || null,
          num(t.dr),
          num(t.cr),
          num(t.balance),
        ]);
        styleRow(r);
      });

    /* ================= Footer ================= */
    ws.addRow([]);
    const f = ws.addRow([]);
    ws.mergeCells(`F${f.number}:I${f.number}`);
    ws.getCell(`F${f.number}`).value =
      "ທີ່............................., ວັນທີ່......../......./.........";
    ws.getCell(`F${f.number}`).alignment = { horizontal: "right" };

    ws.addRow([]);
    const sign = ws.addRow([
      "ຜູ້ອຳນວຍການ",
      "",
      "",
      "ຫົວໜ້າບັນຊີ",
      "",
      "",
      "ຜູ້ສະຫຼຸບ",
    ]);

    ws.mergeCells(`A${sign.number}:C${sign.number}`);
    ws.mergeCells(`D${sign.number}:F${sign.number}`);
    ws.mergeCells(`G${sign.number}:I${sign.number}`);

    ["A", "D", "G"].forEach((col) => {
      ws.getCell(`${col}${sign.number}`).font = FONT_BOLD;
      ws.getCell(`${col}${sign.number}`).alignment = {
        horizontal: "center",
      };
    });
  });

  /* ================= Export ================= */
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), "general-ledger-laos.xlsx");
};

/* ================= Export ================= */
export const exportBalanceToExcel = async ({
  user,
  data, // tree / trial balance rows
  activeFilterLabel,
  heading,
  totals,
}) => {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Trial Balance");

  /* ================= Column Width ================= */
  ws.columns = [
    { width: 26 }, // B บัญชี
    { width: 18 }, // C เลขบัญชี
    { width: 16 }, // D Dr opening
    { width: 16 }, // E Cr opening
    { width: 16 }, // F Dr movement
    { width: 16 }, // G Cr movement
    { width: 18 }, // H Dr closing
    { width: 18 }, // I Cr closing
  ];

  /* ================= Header ================= */
  ws.mergeCells("A1:I1");
  ws.mergeCells("A2:I2");
  ws.mergeCells("A3:I3");

  ws.getCell("A1").value = "ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ";
  ws.getCell("A2").value = "ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ";
  ws.getCell("A3").value = "-----------------------------------";

  ["A1", "A2", "A3"].forEach((c) => {
    ws.getCell(c).font = FONT_BOLD;
    ws.getCell(c).alignment = { horizontal: "center" };
  });

  /* ================= Company / Title ================= */
  ws.mergeCells("A4:F4");
  ws.mergeCells("A5:F5");
  ws.mergeCells("A6:F6");

  ws.getCell("A4").value = user.companyId.name;
  ws.getCell("A5").value = `ທີ່ຢູ່: ${user.companyId.address}`;
  ws.getCell("A6").value = `ເບີໂທ: ${user.companyId.phone}`;

  /* ================= Doc No / Date (ขวา) ================= */
  ws.mergeCells("G5:I5");
  ws.mergeCells("G6:I6");

  ws.getCell("G5").value = "ເລກທີ່.............................";
  ws.getCell("G6").value = "ວັນທີ່............/....../...........";

  ws.getCell("G5").alignment = ws.getCell("G6").alignment = {
    horizontal: "right",
  };

  /* ================= Title ================= */
  ws.mergeCells("A8:I8");
  ws.getCell("A8").value = heading;
  ws.getCell("A8").font = { ...FONT_BOLD, size: 16 };
  ws.getCell("A8").alignment = { horizontal: "center" };

  /* ================= Period ================= */
  ws.mergeCells("A9:I9");
  ws.getCell("A9").value = ` ${activeFilterLabel}`;
  ws.getCell("A9").font = FONT_BOLD;
  ws.getCell("A9").alignment = { horizontal: "center" };

  ws.getCell("H11").value = "ຫົວໜ່ວຍ: LAK";
  ws.getCell("A9").font = FONT_BOLD;
  ws.getCell("G9").font = FONT_BOLD;

  /* ================= Table Header ================= */
  ws.mergeCells("A11:A12"); // บัญชี
  ws.mergeCells("B11:B12"); // เลขบัญชี
  ws.mergeCells("C11:D11"); // ยอดยกมา
  ws.mergeCells("E11:F11"); // เคลื่อนไหว
  ws.mergeCells("G11:H11"); // คงเหลือ

  ws.getCell("A11").value = "ບັນຊີ";
  ws.getCell("B11").value = "ເລກລະຫັດບັນຊີ";
  ws.getCell("C11").value = "ຍອດຍົກມາ";
  ws.getCell("E11").value = "ລາຍການເຄື່ອນໄຫວ";
  ws.getCell("G11").value = "ຍອດເຫຼືອ";

  ws.getCell("C12").value = "ໜີ້";
  ws.getCell("D12").value = "ມີ";
  ws.getCell("E12").value = "ໜີ້";
  ws.getCell("F12").value = "ມີ";
  ws.getCell("G12").value = "ໜີ້";
  ws.getCell("H12").value = "ມີ";

  ws.getRows(11, 2).forEach((row) => {
    row.eachCell((cell) => {
      cell.font = FONT_BOLD;
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = BORDER_ALL;
    });
  });

  /* ================= Data ================= */
  let rowIndex = 13;
  let total = {
    od: 0,
    oc: 0,
    md: 0,
    mc: 0,
    cd: 0,
    cc: 0,
  };

  data.forEach((acc, i) => {
    const r = ws.getRow(rowIndex++);

    r.values = [
      " ".repeat(acc.level * 4) + acc.name, // 👈 indent
      " ".repeat(acc.level * 4) + acc.code, // 👈 indent
      num(acc.openingDr),
      num(acc.openingCr),
      num(acc.movementDr),
      num(acc.movementCr),
      num(acc.endingDr),
      num(acc.endingCr),
    ];

    r.eachCell((cell, col) => {
      cell.font = acc.isParent ? { ...FONT_BOLD } : FONT;

      cell.border = BORDER_ALL;
      cell.alignment =
        col >= 4
          ? { horizontal: "right", vertical: "middle" }
          : { horizontal: "left", vertical: "middle" };

      if (col >= 4) {
        cell.numFmt = "#,##0.00;[Red]-#,##0.00";
      }
    });

    total.od = totals.openingDr || 0;
    total.oc = totals.openingCr || 0;
    total.md = totals.movementDr || 0;
    total.mc = totals.movementCr || 0;
    total.cd = totals.endingDr || 0;
    total.cc = totals.endingCr || 0;
  });

  /* ================= Total ================= */
  const tr = ws.getRow(rowIndex);
  ws.mergeCells(`A${rowIndex}:B${rowIndex}`);
  tr.getCell(1).value = "ທັງໝົດ";

  tr.getCell(3).value = total.od;
  tr.getCell(4).value = total.oc;
  tr.getCell(5).value = total.md;
  tr.getCell(6).value = total.mc;
  tr.getCell(7).value = total.cd;
  tr.getCell(8).value = total.cc;

  tr.eachCell((cell, col) => {
    cell.font = FONT_BOLD;
    cell.border = BORDER_ALL;
    cell.alignment =
      col >= 3 ? { horizontal: "right" } : { horizontal: "center" };
    if (col >= 3) {
      cell.numFmt = "#,##0.00;[Red]-#,##0.00";
    }
  });

  /* ================= Footer ================= */
  ws.addRow([]);
  const f = ws.addRow([]);
  ws.mergeCells(`F${f.number}:I${f.number}`);
  ws.getCell(`F${f.number}`).value =
    "ທີ່......................................., ວັນທີ ........../........../..........";

  ws.addRow([]);
  const s = ws.addRow([
    "ຜູ້ອຳນວຍການ",
    "",
    "",
    "ຫົວໜ້າບັນຊີ",
    "",
    "",
    "ພະນັກງານບັນຊີ",
  ]);

  ws.mergeCells(`A${s.number}:C${s.number}`);
  ws.mergeCells(`D${s.number}:F${s.number}`);
  ws.mergeCells(`G${s.number}:I${s.number}`);

  ["A", "D", "G"].forEach((c) => {
    ws.getCell(`${c}${s.number}`).font = FONT_BOLD;
    ws.getCell(`${c}${s.number}`).alignment = { horizontal: "center" };
  });

  /* ================= Export ================= */
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), "trial-balance-laos.xlsx");
};
export const flattenAccountTree = (tree) => {
  const rows = [];

  const walk = (node, level = 0) => {
    const isParent = node.children && node.children.length > 0;

    rows.push({
      code: node.code,
      name: node.name,
      level,
      isParent,

      openingDr: node.openingDr || 0,
      openingCr: node.openingCr || 0,
      movementDr: node.movementDr || 0,
      movementCr: node.movementCr || 0,
      endingDr: node.endingDr || 0,
      endingCr: node.endingCr || 0,
    });

    if (isParent) {
      node.children.forEach((c) => walk(c, level + 1));
    }
  };

  tree.forEach((root) => walk(root, 0));
  return rows;
};
/////

/* ================= Utils ================= */

const renderPeriodText = ({ period, currentYear, mode }) => {
  if (period?.startDate && period?.endDate) {
    return `ປີການບັນຊີສິ້ນສຸດວັນທີ: ${formatDate(period.endDate)}`;
  }
  if (mode === "month-compare") {
    return `ປະຈຳເດືອນ ${currentYear}`;
  }
  return `ປະຈຳປີ ${currentYear}`;
};

/* ================= Main ================= */
export const exportBalanceSheetExcel = async ({
  current = [],
  previous = [],
  currentYear,
  activeFilterLabel,
  previousYear,
  comparable = true,
  user,
  period,
  mode,
  dateText,
}) => {
  const company = user?.companyId || {};

  /* ================= Group Data (เหมือน Print) ================= */
  const groupBySection = (data = []) => {
    const map = {};
    data.forEach((i) => {
      if (!map[i.section]) {
        map[i.section] = { items: [], total: 0 };
      }
      map[i.section].items.push(i);
      map[i.section].total += Number(i.ending || 0);
    });
    return map;
  };

  const curGroups = groupBySection(current);
  const prevGroups = groupBySection(previous);

  const mergeItems = (cur = [], prev = []) => {
    const map = new Map();
    cur.forEach((c) => map.set(c.key, { cur: c, prev: null }));
    prev.forEach((p) => {
      if (!map.has(p.key)) map.set(p.key, { cur: null, prev: p });
      else map.get(p.key).prev = p;
    });
    return [...map.values()];
  };

  const grandCur = Object.values(curGroups).reduce((s, g) => s + g.total, 0);
  const grandPrev = Object.values(prevGroups).reduce((s, g) => s + g.total, 0);

  /* ================= Workbook ================= */
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Balance Sheet");

  ws.columns = [{ width: 45 }, { width: 10 }, { width: 18 }, { width: 18 }];

  /* ================= Header ================= */
  ws.mergeCells("A1:D1");
  ws.mergeCells("A2:D2");
  ws.mergeCells("A3:D3");

  ws.getCell("A1").value = "ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ";
  ws.getCell("A2").value = "ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ";
  ws.getCell("A3").value = "-----------------------------------------";

  ["A1", "A2", "A3"].forEach((c) => {
    ws.getCell(c).alignment = { horizontal: "center" };
    ws.getCell(c).font = { bold: true };
  });

  ws.getCell("A4").value = company.name;
  ws.getCell("A5").value = company.address;
  ws.getCell("A6").value = `ເບີໂທ: ${company.phone || ""}`;

  ws.mergeCells("C4:D4");
  ws.getCell("C4").value = "ໃບລາຍງານຖານະການເງິນ - ໜີ້ສິນ";
  ws.getCell("C4").font = { bold: true, size: 14 };
  ws.getCell("C4").alignment = { horizontal: "center" };

  ws.mergeCells("C6:D6");
  ws.getCell("C6").value = activeFilterLabel;
  ws.getCell("C6").alignment = { horizontal: "center" };

  ws.getCell("D7").value = "ຫົວໜ່ວຍ: LAK";

  /* ================= Table Header ================= */
  ws.addRow([]);
  const hr = ws.addRow([
    "ໜີ້ສິນ ແລະ ທຶນ",
    "ໝາຍເຫດ",
    `${currentYear}\nມູນຄ່າຍັງເຫຼືອ`,
    comparable ? `${previousYear}\nມູນຄ່າຍັງເຫຼືອ` : "",
  ]);
  hr.height = 34;
  hr.eachCell((c) => {
    c.font = { bold: true };
    c.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    c.border = { top: { style: "double" }, bottom: { style: "double" } };
  });

  /* ================= Body ================= */
  Object.entries(curGroups).forEach(([section, curG]) => {
    const prevG = prevGroups[section] || { items: [], total: 0 };
    const rows = mergeItems(curG.items, prevG.items);

    const sec = ws.addRow([section]);
    ws.mergeCells(`A${sec.number}:D${sec.number}`);
    sec.font = { bold: true };
    sec.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "F2F2F2" },
    };

    rows.forEach((r, i) => {
      const item = r.cur || r.prev;
      const row = ws.addRow([
        `${i + 1}. ${item.label}`,
        item.pattern || "",
        r.cur?.ending || 0,
        comparable ? r.prev?.ending || 0 : "",
      ]);

      [3, 4].forEach((c) => {
        row.getCell(c).numFmt = "#,##0.00;[Red](#,##0.00)";
        row.getCell(c).alignment = { horizontal: "right" };
      });
    });

    const t = ws.addRow([
      `ລວມຍອດ ${section}`,
      "",
      curG.total,
      comparable ? prevG.total : "",
    ]);
    ws.mergeCells(`A${t.number}:B${t.number}`);
    t.font = { bold: true };
    t.getCell(3).numFmt = "#,##0.00;[Red](#,##0.00)";
    if (comparable) t.getCell(4).numFmt = "#,##0.00;[Red](#,##0.00)";
  });

  /* ================= Grand Total ================= */
  const gt = ws.addRow([
    "ລວມຍອດ ໜີ້ສິນ + ທຶນ",
    "",
    grandCur,
    comparable ? grandPrev : "",
  ]);
  ws.mergeCells(`A${gt.number}:B${gt.number}`);
  gt.font = { bold: true };
  gt.getCell(3).numFmt = "#,##0.00;[Red](#,##0.00)";
  if (comparable) gt.getCell(4).numFmt = "#,##0.00;[Red](#,##0.00)";

  /* ================= Export ================= */
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), "statement-of-financial-position.xlsx");
};

/* ================= CONSTANT ================= */

const moneyFmt = "#,##0.00;[Red](#,##0.00)";

/* ================= GROUP MAP (เหมือน PDF) ================= */

const UI_GROUP_MAP = {
  other_receivablesAA: [
    "other_receivables",
    "tax_assets",
    "other_current_assets",
  ],
};

/* ================= HELPERS ================= */

const mergeItems = (curItems = [], prevItems = []) => {
  const map = new Map();

  curItems.forEach((c) => map.set(c.key, { key: c.key, cur: c, prev: null }));

  prevItems.forEach((p) => {
    if (!map.has(p.key)) {
      map.set(p.key, { key: p.key, cur: null, prev: p });
    } else {
      map.get(p.key).prev = p;
    }
  });

  return [...map.values()];
};

const buildUIRows = (rows) => {
  const used = new Set();
  const result = [];

  rows.forEach((row) => {
    const childrenKeys = UI_GROUP_MAP[row.key];
    if (childrenKeys) {
      const children = rows.filter((r) => childrenKeys.includes(r.key));
      result.push({ ...row, isParent: true, children });
      used.add(row.key);
      childrenKeys.forEach((k) => used.add(k));
    }
  });

  rows.forEach((row) => {
    if (!used.has(row.key)) result.push(row);
  });

  return result;
};

const styleAmountRow = (row) => {
  row.eachCell((cell, col) => {
    cell.border = BORDER_ALL;
    if (col >= 3) {
      cell.alignment = { horizontal: "right", vertical: "middle" };
      cell.numFmt = moneyFmt;
    } else {
      cell.alignment = { vertical: "middle" };
    }
  });
};

/* ================= MAIN EXPORT ================= */

export const exportAsset = async ({
  current, // ✅ current object
  previous, // ✅ previous object
  currentYear,
  previousYear,
  comparable = true,
  user,
  activeFilterLabel,
  period,
  mode,
  dateText,
}) => {
  const company = user?.companyId || {};

  /* ================= WORKBOOK ================= */

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Statement of Financial Position");

  ws.columns = [{ width: 45 }, { width: 10 }, { width: 18 }, { width: 18 }];

  /* ================= HEADER ================= */

  ws.mergeCells("A1:D1");
  ws.mergeCells("A2:D2");
  ws.mergeCells("A3:D3");

  ws.getCell("A1").value = "ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ";
  ws.getCell("A2").value = "ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ";
  ws.getCell("A3").value = "-----------------------------------------";

  ["A1", "A2", "A3"].forEach((c) => {
    ws.getCell(c).font = { bold: true };
    ws.getCell(c).alignment = { horizontal: "center" };
  });

  ws.getCell("A4").value = company.name || "";
  ws.getCell("A5").value = company.address || "";
  ws.getCell("A6").value = `ເບີໂທ: ${company.phone || ""}`;

  ws.mergeCells("C4:D4");
  ws.getCell("C4").value = "ໃບລາຍງານຖານະການເງິນ ຊັບສິນ";
  ws.getCell("C4").font = { bold: true, size: 14 };
  ws.getCell("C4").alignment = { horizontal: "center" };

  ws.mergeCells("C6:D6");
  ws.getCell("C6").value = activeFilterLabel;
  ws.getCell("C6").alignment = { horizontal: "center" };

  ws.getCell("D7").value = "ຫົວໜ່ວຍເງິນ: LAK";

  /* ================= TABLE HEADER ================= */

  ws.addRow([]);

  const hr = ws.addRow([
    "ຊັບສິນ",
    "ໝາຍເຫດ",
    `${currentYear}\nມູນຄ່າຍັງເຫຼືອ`,
    comparable ? `${previousYear}\nມູນຄ່າຍັງເຫຼືອ` : "",
  ]);

  hr.height = 36;
  hr.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    cell.border = {
      top: { style: "double" },
      bottom: { style: "double" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
  });

  /* ================= BODY ================= */

  const curGroups = current.groups;
  const prevGroups = previous.groups;

  Object.entries(curGroups).forEach(([sectionName, curGroup]) => {
    const prevGroup = prevGroups[sectionName] || {
      items: [],
      total: 0,
    };

    const merged = mergeItems(curGroup.items, prevGroup.items);
    const uiRows = buildUIRows(merged);

    // ===== SECTION HEADER =====
    const sec = ws.addRow([sectionName]);
    ws.mergeCells(`A${sec.number}:D${sec.number}`);
    sec.font = { bold: true };
    sec.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "F2F2F2" },
    };
    sec.border = BORDER_ALL;

    let index = 1;

    uiRows.forEach((row) => {
      if (row.isParent) {
        const r = ws.addRow([
          `${index}. ${row.cur?.label || row.prev?.label}`,
          "",
          row.cur?.amount || 0,
          comparable ? row.prev?.amount || 0 : "",
        ]);
        r.font = { bold: true };
        styleAmountRow(r);

        row.children.forEach((c, i) => {
          const cr = ws.addRow([
            `${index}.${i + 1} ${c.cur?.label || c.prev?.label}`,
            "",
            c.cur?.amount || 0,
            comparable ? c.prev?.amount || 0 : "",
          ]);
          cr.getCell(1).alignment = { indent: 2 };
          styleAmountRow(cr);
        });

        index++;
        return;
      }

      const nr = ws.addRow([
        `${index}. ${row.cur?.label || row.prev?.label}`,
        "",
        row.cur?.amount || 0,
        comparable ? row.prev?.amount || 0 : "",
      ]);
      styleAmountRow(nr);
      index++;
    });

    // ===== SECTION TOTAL =====
    const tr = ws.addRow([
      `ລວມຍອດ ${sectionName}`,
      "",
      curGroup.total,
      comparable ? prevGroup.total : "",
    ]);

    ws.mergeCells(`A${tr.number}:B${tr.number}`);
    tr.font = { bold: true };

    tr.eachCell((c) => {
      c.border = {
        top: { style: "double" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });

    tr.getCell(3).numFmt = moneyFmt;
    if (comparable) tr.getCell(4).numFmt = moneyFmt;
  });

  /* ================= GRAND TOTAL ================= */

  const gt = ws.addRow([
    "ລວມຍອດ ຊັບສິນທັງໝົດ",
    "",
    current.totalAssets,
    comparable ? previous.totalAssets : "",
  ]);

  ws.mergeCells(`A${gt.number}:B${gt.number}`);
  gt.font = { bold: true };

  gt.eachCell((c) => {
    c.border = {
      top: { style: "double" },
      bottom: { style: "double" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
  });

  gt.getCell(3).numFmt = moneyFmt;
  if (comparable) gt.getCell(4).numFmt = moneyFmt;
  /* ================= Footer ================= */
  ws.addRow([]);
  const f = ws.addRow([]);
  ws.mergeCells(`B${f.number}:D${f.number}`);
  ws.getCell(`B${f.number}`).value =
    "ທີ່......................................., ວັນທີ ........../........../..........";

  ws.addRow([]);
  const s = ws.addRow(["ຜູ້ອຳນວຍການ", "ຫົວໜ້າບັນຊີ", "", "ພະນັກງານບັນຊີ"]);
  /* ================= EXPORT ================= */

  ["A", "B"].forEach((c) => {
    ws.getCell(`${c}${s.number}`).font = FONT_BOLD;
    ws.getCell(`${c}${s.number}`).alignment = { horizontal: "center" };
  });

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), "statement-of-financial-position.xlsx");
};

/* ================= CONSTANT ================= */



/* ================= MAIN ================= */

export const exportReport = async ({
  current,          // { lines: [], totals: {} }
  previous,         // { lines: [], totals: {} }
  currentYear,
  previousYear,
  comparable = true,
  user,
  activeFilterLabel,
  period,
  mode,
  dateText,
}) => {
  const company = user?.companyId || {};

  /* ================= WORKBOOK ================= */

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Income Statement");

  ws.columns = [
    { width: 45 }, // รายการ
    { width: 12 }, // หมายเหตุ
    { width: 18 }, // Current
    { width: 18 }, // Previous
  ];

  /* ================= HEADER ================= */

  ws.mergeCells("A1:D1");
  ws.mergeCells("A2:D2");
  ws.mergeCells("A3:D3");

  ws.getCell("A1").value =
    "ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ";
  ws.getCell("A2").value =
    "ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ";
  ws.getCell("A3").value = "-----------------------------------";

  ["A1", "A2", "A3"].forEach((c) => {
    ws.getCell(c).font = { bold: true };
    ws.getCell(c).alignment = { horizontal: "center" };
  });

  ws.getCell("A4").value = company.name || "";
  ws.getCell("A5").value = company.address || "";
  ws.getCell("A6").value = company.phone || "";

  ws.mergeCells("C4:D4");
  ws.getCell("C4").value = "ໃບລາຍງານຜົນການດຳເນີນງານ";
  ws.getCell("C4").font = { bold: true, size: 14 };
  ws.getCell("C4").alignment = { horizontal: "center" };

  ws.mergeCells("C6:D6");
  ws.getCell("C6").value = activeFilterLabel;
  ws.getCell("C6").alignment = { horizontal: "center" };

  ws.getCell("D7").value = "ຫົວໜ່ວຍເງິນ: LAK";

  /* ================= TABLE HEADER ================= */

  ws.addRow([]);

  const hr = ws.addRow([
    "ເນື້ອໃນລາຍການ",
    "ໝາຍເຫດ",
    `ເດືອນ ${currentYear}`,
    comparable ? `ເດືອນ ${previousYear}` : "",
  ]);

  hr.height = 32;
  hr.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    cell.border = {
      top: { style: "double" },
      bottom: { style: "double" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
  });

  /* ================= BODY ================= */

  const prevMap = new Map(
    previous.lines.map((l) => [l.key, l])
  );

  current.lines.forEach((line) => {
    const prevLine = prevMap.get(line.key);

    const r = ws.addRow([
      line.label,
      "",
      line.amount || 0,
      comparable ? prevLine?.amount || 0 : "",
    ]);

    r.eachCell((cell, col) => {
      cell.border = BORDER_ALL;
      if (col >= 3) {
        cell.numFmt = moneyFmt;
        cell.alignment = { horizontal: "right" };
      }
    });

    // 🔹 Bold rows (summary lines)
    if (
      [
        "gross_profit",
        "operating_profit",
        "profit_before_tax",
        "net_profit",
        "out5",
      ].includes(line.key)
    ) {
      r.font = { bold: true };
    }
  });

  /* ================= FOOTNOTE ================= */

  ws.addRow([]);
  const note = ws.addRow([
    "(1) ໃຫ້ນຳໃຊ້ພຽງແຕ່ ເພື່ອສະເໜີ ເອກະສານລາຍງານການເງິນ ລວມກິດຈະການ",
  ]);
  ws.mergeCells(`A${note.number}:D${note.number}`);
  note.font = { italic: true };

  /* ================= SIGNATURE ================= */

  ws.addRow([]);
  const sign = ws.addRow([
    "ຜູ້ອຳນວຍການ",
    "",
    "ຫົວໜ້າບັນຊີ",
    "ພະນັກງານບັນຊີ",
  ]);

  sign.eachCell((c) => {
    c.alignment = { horizontal: "center" };
    c.font = { bold: true };
  });

  /* ================= EXPORT ================= */

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), "income-statement.xlsx");
};
