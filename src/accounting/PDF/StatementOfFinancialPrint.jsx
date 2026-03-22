import React, { forwardRef, useMemo } from "react";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const SECTION_ORDER = [
  "Current_Liabilities",
  "Non_current_Liabilities",
  "Equity",
];

const SECTION_DISPLAY_MAP = {
  Current_Liabilities: "ໜີ້ສິນໝູນວຽນ",
  Non_current_Liabilities: "ໜີ້ສິນບໍ່ໝູນວຽນ",
  Equity: "ທຶນ",
};

// ─────────────────────────────────────────────
// Pure utility functions (outside component)
// ─────────────────────────────────────────────

/** Format a number to 2 decimal places with thousands separator */
const formatNumber = (num) => {
  if (num === null || num === undefined || num === "") return "–";
  const parsed = Number(num);
  if (isNaN(parsed)) return "–";
  return parsed.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/** Format a Date/string to dd/mm/yyyy */
const formatDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  return [
    String(date.getDate()).padStart(2, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    date.getFullYear(),
  ].join("/");
};

/** Convert "YYYY-M" → "M/YYYY" */
const formatToMonthYear = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{1,2}$/.test(value))
    return value ?? "";
  const [year, month] = value.split("-");
  return `${Number(month)}/${year}`;
};

/** Group flat array by item.section */
const groupBySection = (data = []) =>
  data.reduce((acc, item) => {
    (acc[item.section] = acc[item.section] ?? []).push(item);
    return acc;
  }, {});

/**
 * Merge current + previous arrays by item.key.
 * Returns [{ cur, prev }] preserving union of both sets.
 */
const mergeGroupItems = (curItems = [], prevItems = []) => {
  const map = new Map();
  curItems.forEach((c) => map.set(c.key, { cur: c, prev: null }));
  prevItems.forEach((p) => {
    if (map.has(p.key)) {
      map.get(p.key).prev = p;
    } else {
      map.set(p.key, { cur: null, prev: p });
    }
  });
  return Array.from(map.values());
};

// ─────────────────────────────────────────────
// Print styles (injected once)
// ─────────────────────────────────────────────
const PRINT_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;500;600;700&display=swap');

  @media print {
    @page { size: A4; margin: 0; }
    body   { margin: 0; padding: 0; }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
          font-family: "Noto Sans Lao, sans-serif",
    }
    .no-print { display: none !important; }
  }
`;

// ─────────────────────────────────────────────
// Styles object
// ─────────────────────────────────────────────
const S = {
  page: {
    width: "210mm",
    minHeight: "297mm",
    margin: "0 auto",
    background: "#fff",
    boxShadow: "0 2px 16px rgba(0,0,0,0.12)",
    position: "relative",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  content: {
    padding: "12mm 15mm",
    boxSizing: "border-box",
    fontSize: "10pt",
    color: "#111",
    lineHeight: "1.4",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  /* ── Header ── */
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "14px",
    gap: "16px",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  addressBlock: {
    flex: "0 0 42%",
    fontSize: "8.5pt",
    lineHeight: "1.6",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  addressName: {
    fontWeight: "700",
    marginBottom: "2px",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  titleBlock: {
    flex: "1",
    textAlign: "center",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  govTitle: {
    fontSize: "10pt",
    fontWeight: "700",
    marginBottom: "2px",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  slogan: {
    fontSize: "8pt",
    marginBottom: "10px",
    color: "#444",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  reportTitle: {
    fontSize: "14pt",
    fontWeight: "800",
    letterSpacing: "0.3px",
    marginBottom: "4px",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  periodLabel: {
    fontSize: "8.5pt",
    color: "#333",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  currency: {
    textAlign: "right",
    fontSize: "8pt",
    fontStyle: "italic",
    color: "#555",
    marginBottom: "8px",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  /* ── Table ── */
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "8.5pt",
    marginBottom: "24px",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  th: {
    border: "1px solid #555",
    borderTop: "2px solid #111",
    borderBottom: "2px solid #111",
    padding: "7px 6px",
    textAlign: "center",
    whiteSpace: "pre-line",
    fontWeight: "700",
    background: "#f0f0f0",
    lineHeight: "1.4",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  sectionHeader: {
    background: "#e4e4e4",
    borderTop: "1.5px solid #444",
    borderBottom: "1px solid #888",
    fontWeight: "700",
    padding: "5px 8px",
    fontSize: "9pt",
    textAlign: "left",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  cell: {
    border: "1px solid #bbb",
    padding: "4px 7px",
    verticalAlign: "middle",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  cellLabel: { textAlign: "left" },
  cellNote: { textAlign: "center", width: "14%", color: "#666" },
  cellNumber: { textAlign: "right", width: "22%" },
  sectionTotalRow: { background: "#f7f7f7" },
  sectionTotalLabel: {
    fontWeight: "700",
    paddingLeft: "12px",
  },
  sectionTotalNumber: {
    fontWeight: "700",
    textAlign: "right",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  grandTotalRow: {
    background: "#e8e8e8",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  grandTotalCell: {
    borderTop: "2.5px double #111",
    fontWeight: "800",
    fontSize: "9.5pt",
    padding: "7px 8px",
    textAlign: "center",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  grandTotalNumber: {
    borderTop: "2.5px double #111",
    fontWeight: "800",
    fontSize: "9.5pt",
    padding: "7px 8px",
    textAlign: "right",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  emptyCell: {
    textAlign: "center",
    fontStyle: "italic",
    color: "#888",
    padding: "6px",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  /* ── Footer ── */
  footer: {
    display: "flex",
    justifyContent: "space-around",
    marginTop: "28px",
    paddingTop: "10px",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  sigBox: {
    flex: "1",
    textAlign: "center",
    fontSize: "8.5pt",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  sigTitle: {
    fontWeight: "800",
    marginBottom: "44px",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  postTable: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: "14px",
    width: "100%",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  footNote: {
    fontSize: "7.5pt",
    fontStyle: "italic",
    maxWidth: "58%",
    lineHeight: "1.4",
    color: "#555",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  dateLine: {
    fontSize: "8pt",
    textAlign: "right",
    whiteSpace: "nowrap",
    color: "#333",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
};

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

/** Single table header cell */
const Th = ({ children, width }) => (
  <th style={{ ...S.th, ...(width ? { width } : {}) }}>{children}</th>
);

/** Empty-state row */
const EmptyRow = ({ colSpan }) => (
  <tr>
    <td colSpan={colSpan} style={{ ...S.cell, ...S.emptyCell }}>
      ບໍ່ມີຂໍ້ມູນ
    </td>
  </tr>
);

/** Data row */
const DataRow = ({ row, comparable }) => {
  const item = row.cur ?? row.prev;
  if (!item) return null;
  return (
    <tr>
      <td style={{ ...S.cell, ...S.cellLabel }}>{item.label}</td>
      <td style={{ ...S.cell, ...S.cellNote }}>{/* note placeholder */}</td>
      <td style={{ ...S.cell, ...S.cellNumber }}>
        {formatNumber(row.cur?.ending)}
      </td>
      {comparable && (
        <td style={{ ...S.cell, ...S.cellNumber }}>
          {formatNumber(row.prev?.ending)}
        </td>
      )}
    </tr>
  );
};

/** Section total row */
const SectionTotalRow = ({ label, curTotal, prevTotal, comparable }) => (
  <tr style={S.sectionTotalRow}>
    <td colSpan={2} style={{ ...S.cell, ...S.sectionTotalLabel }}>
      ລວມຍອດ {label}
    </td>
    <td style={{ ...S.cell, ...S.sectionTotalNumber }}>
      {formatNumber(curTotal)}
    </td>
    {comparable && (
      <td style={{ ...S.cell, ...S.sectionTotalNumber }}>
        {formatNumber(prevTotal)}
      </td>
    )}
  </tr>
);

/** Grand total row */
const GrandTotalRow = ({ curTotal, prevTotal, comparable }) => (
  <tr style={S.grandTotalRow}>
    <td colSpan={2} style={S.grandTotalCell}>
      ລວມຍອດ ໜີ້ສິນ + ທຶນ
    </td>
    <td style={S.grandTotalNumber}>{formatNumber(curTotal)}</td>
    {comparable && (
      <td style={S.grandTotalNumber}>{formatNumber(prevTotal)}</td>
    )}
  </tr>
);

/** Signature block */
const SignatureBox = ({ title }) => (
  <div style={S.sigBox}>
    <div style={S.sigTitle}>{title}</div>
    <span style={S.sigLine}>&nbsp;</span>
  </div>
);

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

const StatementOfFinancialPrint = forwardRef(
  (
    {
      companyName = "ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ",
      slogan = "ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ",
      user,
      currentYear = "1/2026",
      previousYear = "1/2025",
      comparable = true,
      current = [],
      previous = [],
      period = {},
      start = null,
      end = null,
      mode = "",
      sectionTotals = null,
      activeFilterLabel = "",
    },
    ref
  ) => {
    // ── Period text ──────────────────────────────
    const periodText = useMemo(() => {
      // 1. Custom date range from period object
      if (period?.startDate && period?.endDate) {
        return `ປີການບັນຊີສິ້ນສຸດວັນທີ: ${formatDate(period.endDate)}`;
      }

      // 2. Month comparison mode
      if (mode === "month-compare") {
        const year = currentYear ?? previousYear;
        return year != null
          ? `ປະຈຳເດືອນ ${formatToMonthYear(year)}`
          : activeFilterLabel;
      }

      // 3. Custom start–end range
      if (mode === "custom") {
        return `ແຕ່ ${formatDate(start)} – ${formatDate(end)}`;
      }

      // 4. Default year comparison
      if (mode === "default-compare") {
        const year = currentYear ?? previousYear;
        return year != null ? `ປະຈຳປີ ${year}` : activeFilterLabel;
      }

      // 5. Fallback
      return activeFilterLabel;
    }, [
      period?.startDate, // ✅ เจาะจง field แทน object ทั้งก้อน
      period?.endDate, //    → ป้องกัน re-compute จาก reference ใหม่
      mode,
      currentYear,
      previousYear,
      start,
      end,
      activeFilterLabel,
    ]);
    console.log("periodText", periodText, previousYear);
    // Column header label helpers
    const currentColLabel = useMemo(() => {
      let curText;

      if (mode === "month-compare") {
        // ✅ "2026-3" → "ປະຈຳເດືອນ 3/2026"
        curText =
          currentYear != null
            ? `ປະຈຳເດືອນ ${formatToMonthYear(currentYear)}`
            : activeFilterLabel;
      } else {
        // ใช้ periodText ที่คำนวณไว้แล้ว (ครอบคลุม custom, default-compare ฯลฯ)
        curText = periodText;
      }

      return `${curText}\nມູນຄ່າຍັງເຫຼືອ`;
    }, [mode, currentYear, periodText, activeFilterLabel]);

    const previousColLabel = useMemo(() => {
      if (!comparable) return null;

      let prevText;

      if (mode === "month-compare") {
        // ✅ "2025-3" → "ປະຈຳເດືອນ 3/2025"
        prevText =
          previousYear != null
            ? `ປະຈຳເດືອນ ${formatToMonthYear(previousYear)}`
            : activeFilterLabel;
      } else if (mode === "default-compare") {
        prevText =
          previousYear != null ? `ປະຈຳປີ ${previousYear}` : activeFilterLabel;
      } else if (mode === "custom") {
        // custom mode มักไม่มี previous column แต่ fallback ไว้
        prevText = activeFilterLabel;
      } else {
        prevText =
          previousYear != null ? `ປະຈຳປີ ${previousYear}` : activeFilterLabel;
      }

      return `${prevText}\nມູນຄ່າຍັງເຫຼືອ`;
    }, [comparable, mode, previousYear, activeFilterLabel]);

    // ── Address ──────────────────────────────────
    const companyAddress = useMemo(
      () =>
        [
          user?.companyId?.name,
          user?.companyId?.address,
          user?.companyId?.taxId,
        ].filter(Boolean),
      [user?.companyId?.name, user?.companyId?.address]
    );
    const phone = user?.companyId?.phone;

    // ── Grouped data ─────────────────────────────
    const { curGroups, prevGroups } = useMemo(
      () => ({
        curGroups: groupBySection(current),
        prevGroups: groupBySection(previous),
      }),
      [current, previous]
    );

    // ── Section & grand totals ────────────────────
    const {
      sectionTotalsCalc,
      currentGrandTotal,
      previousGrandTotal,
    } = useMemo(() => {
      const totals = {};
      let curGrand = 0;
      let prevGrand = 0;

      // Use all section keys from both current and previous
      const allKeys = new Set([
        ...Object.keys(curGroups),
        ...Object.keys(prevGroups),
      ]);

      allKeys.forEach((key) => {
        const curTotal = (curGroups[key] ?? []).reduce(
          (s, i) => s + (i.ending ?? 0),
          0
        );
        const prevTotal = (prevGroups[key] ?? []).reduce(
          (s, i) => s + (i.ending ?? 0),
          0
        );
        totals[key] = { cur: curTotal, prev: prevTotal };
        curGrand += curTotal;
        prevGrand += prevTotal;
      });

      return {
        sectionTotalsCalc: totals,
        currentGrandTotal: curGrand,
        previousGrandTotal: prevGrand,
      };
    }, [curGroups, prevGroups]);

    const finalSectionTotals = sectionTotals ?? sectionTotalsCalc;

    // ── Section keys in display order ─────────────
    const orderedSectionKeys = useMemo(() => {
      const allKeys = new Set([
        ...Object.keys(curGroups),
        ...Object.keys(prevGroups),
      ]);
      const ordered = SECTION_ORDER.filter((k) => allKeys.has(k));
      // Append any unknown sections not in SECTION_ORDER
      allKeys.forEach((k) => {
        if (!SECTION_ORDER.includes(k)) ordered.push(k);
      });
      return ordered;
    }, [curGroups, prevGroups]);

    const colCount = comparable ? 4 : 3;

    // ────────────────────────────────────────────
    return (
      <>
        <style>{PRINT_STYLES}</style>

        <div ref={ref} style={S.page}>
          <div style={S.content}>
            {/* ── HEADER ─────────────────────────── */}
            <div style={S.header}>
              {/* Left: address */}
              <div style={S.addressBlock}>
                {companyAddress.map((line, i) => (
                  <div key={i} style={i === 0 ? S.addressName : undefined}>
                    {line}
                  </div>
                ))}
                {phone && (
                  <div style={{ marginTop: "4px" }}>ເບີໂທ: {phone}</div>
                )}
              </div>

              {/* Right: title */}
              <div style={S.titleBlock}>
                <div style={S.govTitle}>{companyName}</div>
                <div style={S.slogan}>{slogan}</div>
                <div style={S.reportTitle}>ໃບລາຍງານຖານະການເງິນ - ໜີ້ສິນ</div>
                <div style={S.periodLabel}>{activeFilterLabel}</div>
              </div>
            </div>

            {/* Currency note */}
            <div style={S.currency}>(ສະກຸນເງິນ: LAK)</div>

            {/* ── TABLE ──────────────────────────── */}
            <table style={S.table}>
              <thead>
                <tr>
                  <Th width="40%">ໜີ້ສິນ ແລະ ທຶນ</Th>
                  <Th width="14%">ໝາຍເຫດ</Th>
                  <Th>{currentColLabel}</Th>
                  {comparable && <Th>{previousColLabel}</Th>}
                </tr>
              </thead>

              <tbody>
                {orderedSectionKeys.map((sectionKey) => {
                  const curItems = curGroups[sectionKey] ?? [];
                  const prevItems = prevGroups[sectionKey] ?? [];
                  const rows = mergeGroupItems(curItems, prevItems);
                  const sectionTotal = finalSectionTotals[sectionKey] ?? {
                    cur: 0,
                    prev: 0,
                  };
                  const displayName =
                    SECTION_DISPLAY_MAP[sectionKey] ?? sectionKey;

                  return (
                    <React.Fragment key={sectionKey}>
                      {/* Section heading */}
                      <tr>
                        <td colSpan={colCount} style={S.sectionHeader}>
                          {displayName}
                        </td>
                      </tr>

                      {/* Data rows */}
                      {rows.length > 0 ? (
                        rows.map((row, idx) => (
                          <DataRow
                            key={
                              row.cur?.key ??
                              row.prev?.key ??
                              `${sectionKey}-${idx}`
                            }
                            row={row}
                            comparable={comparable}
                          />
                        ))
                      ) : (
                        <EmptyRow colSpan={colCount} />
                      )}

                      {/* Section total */}
                      <SectionTotalRow
                        label={displayName}
                        curTotal={sectionTotal.cur}
                        prevTotal={sectionTotal.prev}
                        comparable={comparable}
                      />
                    </React.Fragment>
                  );
                })}

                {/* Grand total */}
                <GrandTotalRow
                  curTotal={currentGrandTotal}
                  prevTotal={previousGrandTotal}
                  comparable={comparable}
                />
              </tbody>
            </table>
            <div style={S.postTable}>
              <div style={S.footNote}>
                (1) ໃຫ້ນຳໃຊ້ພຽງແຕ່ ເພື່ອສະເໜີ ເອກະສານລາຍງານການເງິນ ລວມກິດຈະການ.
              </div>
              <div style={S.dateLine}>{user?.companyId.information || ""}</div>
            </div>

            {/* ── FOOTER SIGNATURES ──────────────── */}
            <div style={S.footer}>
              {["ຜູ້ອຳນວຍການ", "ຫົວໜ້າບັນຊີ", "ຜູ້ສະຫຼຸບ"].map((title) => (
                <SignatureBox key={title} title={title} />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }
);

StatementOfFinancialPrint.displayName = "StatementOfFinancialPrint";
export default StatementOfFinancialPrint;
