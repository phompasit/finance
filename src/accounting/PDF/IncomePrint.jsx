import React, { forwardRef, useMemo } from "react";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

/** Labels that render bold + slightly larger */
const BOLD_LABEL_SET = new Set([
  "Gross Profit",
  "Operating Profit (Loss)",
  "Profit or Loss before Tax",
  "Profit or Loss for the Year Net of Tax",
  "Other Comprehensive Income Net of Tax",
  "Profit or Loss for the Period Net of Tax",
  "ຜົນໄດ້ຮັບເບື້ອງຕົ້ນ",
  "ຜົນໄດ້ຮັບ ໃນການທຸລະກິດ",
  "ຜົນໄດ້ຮັບ ກ່ອນການເສຍອາກອນ",
  "ຜົນໄດ້ຮັບສຸດທິ ຈາກການດຳເນີນງານ",
  "ຜົນໄດ້ຮັບສັງລວມ ຫຼັງອາກອນ",
  "ຜົນໄດ້ຮັບສຸດທິໃນປີ",
]);

// ─────────────────────────────────────────────────────────────
// Pure utilities (outside component — stable refs)
// ─────────────────────────────────────────────────────────────

/** "1,234,567.89"  |  "-" for null/undefined/empty */
const formatNumber = (num) => {
  if (num === null || num === undefined || num === "") return "-";
  const n = Number(num);
  if (isNaN(n)) return "-";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

/** Date / ISO string → "dd/mm/yyyy" */
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

/** "2025-3" → "3/2025"  |  anything else → as-is */
const formatToMonthYear = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{1,2}$/.test(value))
    return value ?? "";
  const [year, month] = value.split("-");
  return `${Number(month)}/${year}`;
};

/** Today as "dd/mm/yyyy" */
const todayLabel = () => {
  const t = new Date();
  return [
    String(t.getDate()).padStart(2, "0"),
    String(t.getMonth() + 1).padStart(2, "0"),
    t.getFullYear(),
  ].join("/");
};

// ─────────────────────────────────────────────────────────────
// Print styles
// ─────────────────────────────────────────────────────────────
const PRINT_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;500;600;700&display=swap');
  @media print {
    @page { size: A4; margin: 0; }
    body  { margin: 0; padding: 0; }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .no-print { display: none !important; }
  }
`;

// ─────────────────────────────────────────────────────────────
// Style tokens
// ─────────────────────────────────────────────────────────────
const S = {
  page: {
    width: "210mm",
    minHeight: "290mm",
    margin: "0 auto",
    background: "#fff",
    boxShadow: "0 2px 16px rgba(0,0,0,0.10)",
    fontFamily: "'Noto Sans Lao', sans-serif",
    boxSizing: "border-box",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  content: {
    padding: "12mm 15mm",
    boxSizing: "border-box",
    fontSize: "9pt",
    color: "#111",
    lineHeight: "1.4",
    fontFamily: "Noto Sans Lao, sans-serif",
  },

  // ── Header ──
  header: {
    display: "grid",
    gridTemplateColumns: "40% 60%",
    marginBottom: "16px",
    gap: "12px",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  addrBlock: {
    fontSize: "8.5pt",
    lineHeight: "1.65",
    paddingLeft: "6px",
    paddingTop: "32px",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  addrName: { fontWeight: "700", fontFamily: "Noto Sans Lao, sans-serif" },
  phone: { marginTop: "4px", fontFamily: "Noto Sans Lao, sans-serif" },
  titleBlock: { textAlign: "center", fontFamily: "Noto Sans Lao, sans-serif" },
  govTitle: {
    fontSize: "11pt",
    fontWeight: "700",
    marginBottom: "2px",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  slogan: {
    fontSize: "8.5pt",
    color: "#444",
    marginBottom: "10px",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  reportTitle: {
    fontSize: "14pt",
    fontWeight: "800",
    letterSpacing: "0.2px",
    marginBottom: "4px",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  periodSubtitle: {
    fontSize: "8.5pt",
    color: "#333",
    marginTop: "4px",
    fontFamily: "Noto Sans Lao, sans-serif",
  },

  // ── Currency bar ──
  currencyBar: {
    display: "flex",
    justifyContent: "flex-end",
    fontSize: "8pt",
    fontStyle: "italic",
    color: "#555",
    marginBottom: "7px",
    fontFamily: "Noto Sans Lao, sans-serif",
  },

  // ── Table ──
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "8.5pt",
    border: "1px solid #444",
    marginBottom: "12px",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  th: {
    border: "1px solid #555",
    borderTop: "2px solid #000",
    borderBottom: "2px solid #000",
    padding: "6px 7px",
    background: "#f0f0f0",
    fontWeight: "700",
    fontSize: "9pt",
    lineHeight: "1.4",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  thLabel: {
    textAlign: "left",
    width: "45%",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  thNote: {
    textAlign: "center",
    width: "8%",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  thNum: { textAlign: "center", fontFamily: "Noto Sans Lao, sans-serif" },

  cell: {
    border: "1px solid #ccc",
    padding: "4px 8px",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  cellLabel: { textAlign: "left" },
  cellLabelIndent: {
    textAlign: "left",
    paddingLeft: "20px",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  cellNote: {
    textAlign: "center",
    color: "#aaa",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
  cellNum: {
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
    fontFamily: "Noto Sans Lao, sans-serif",
  },

  boldRow: { background: "#fafafa" },
  boldLabel: {
    fontWeight: "700",
    fontSize: "9pt",
    fontFamily: "Noto Sans Lao, sans-serif",
  },

  // ── Post-table ──
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

  // ── Signatures ──
  sigRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    marginTop: "30px",
    fontSize: "8.5pt",
    textAlign: "center",
  },
  sigTitle: {
    fontWeight: "700",
    marginBottom: "44px",
    fontFamily: "Noto Sans Lao, sans-serif",
  },
};

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

const Th = ({ children, style }) => (
  <th style={{ ...S.th, ...style }}>{children}</th>
);

/** Single income statement line row */
const LineRow = ({ line, comparable }) => {
  const isBold = BOLD_LABEL_SET.has(line.label);
  const isSection =
    line.label === "Of which:" || line.label?.startsWith("Of which");

  const labelStyle = {
    ...S.cell,
    ...(isSection ? S.cellLabelIndent : S.cellLabel),
    ...(isBold ? S.boldLabel : {}),
  };

  return (
    <tr style={isBold ? S.boldRow : undefined}>
      <td style={labelStyle}>{line.label}</td>
      <td style={{ ...S.cell, ...S.cellNote }} />
      <td style={{ ...S.cell, ...S.cellNum }}>{formatNumber(line.cur)}</td>
      {comparable && (
        <td style={{ ...S.cell, ...S.cellNum }}>{formatNumber(line.prev)}</td>
      )}
    </tr>
  );
};

/** Signature block */
const SigBox = ({ title }) => (
  <div>
    <div style={S.sigTitle}>{title}</div>
    <span style={S.sigLine}>&nbsp;</span>
  </div>
);

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

const IncomePrint = forwardRef(
  (
    {
      companyName = "ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ",
      slogan = "ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ",
      user,
      currentYear = "2025-12",
      previousYear = "2024-12",
      comparable = true,
      period = {},
      start = null,
      end = null,
      mode = "",
      activeFilterLabel = "",
      mergedLines = [],
    },
    ref
  ) => {
    // ── Company info ─────────────────────────────────────
    const companyAddress = useMemo(
      () =>
        [
          user?.companyId?.name,
          `ທີ່ຢູ່: ${user?.companyId?.address}`,
          `ເລກປະຈຳຕົວຜູ້ເສຍອາກອນ ${user?.companyId.taxId}`,
        ].filter(Boolean),
      [user?.companyId?.name, user?.companyId?.address]
    );
    const phone = ` ${user?.companyId?.phone}`;
    console.log("speriod ", user);
    // ── Period subtitle ──────────────────────────────────
    const periodText = useMemo(() => {
      // ✅ รองรับทั้ง "startDate" และ "statDate" (typo จาก API)
      const startDate = period?.startDate ?? period?.statDate;
      const endDate = period?.endDate;

      if (startDate && endDate) {
        return `ແຕ່ວັນທີ່: ${formatDate(startDate)} ຫາ: ${formatDate(endDate)}`;
      }

      if (mode === "month-compare") {
        const yr = currentYear ?? previousYear;
        return yr != null
          ? `ປະຈຳເດືອນ ${formatToMonthYear(yr)}`
          : activeFilterLabel;
      }

      if (mode === "custom") {
        // ✅ เดิม mode=custom ยังใช้ period.startDate แต่ค่าเป็น undefined
        //    ใช้ startDate ที่ resolve แล้วแทน
        return `ແຕ່ວັນທີ່: ${formatDate(startDate)} ຫາ: ${formatDate(endDate)}`;
      }

      if (mode === "default-compare") {
        const yr = currentYear ?? previousYear;
        return yr != null ? `ປະຈຳປີ ${yr}` : activeFilterLabel;
      }

      return activeFilterLabel;
    }, [
      period?.startDate,
      period?.statDate, // ✅ เพิ่ม dependency
      period?.endDate,
      mode,
      currentYear,
      previousYear,
      start,
      end,
      activeFilterLabel,
    ]);
    // ── Column header labels ─────────────────────────────
    const currentColLabel = useMemo(() => {
      switch (mode) {
        case "month-compare":
          return currentYear != null
            ? `ງວດປັດຈຸບັນ\n${formatToMonthYear(currentYear)}\nມູນຄ່າຍັງເຫຼືອ`
            : `${activeFilterLabel}\nມູນຄ່າຍັງເຫຼືອ`;

        case "default-compare":
          return `ປະຈຳປີ ${currentYear ?? activeFilterLabel}\nມູນຄ່າຍັງເຫຼືອ`;

        case "custom": {
          // ✅ ใช้ startDate/statDate เหมือน periodText
          const startDate = period?.startDate ?? period?.statDate;
          const endDate = period?.endDate;
          return startDate && endDate
            ? `ແຕ່ ${formatDate(startDate)}\nຫາ ${formatDate(
                endDate
              )}\nມູນຄ່າຍັງເຫຼືອ`
            : `${activeFilterLabel}\nມູນຄ່າຍັງເຫຼືອ`;
        }

        default:
          return `${activeFilterLabel}\nມູນຄ່າຍັງເຫຼືອ`;
      }
    }, [
      mode,
      currentYear,
      activeFilterLabel,
      period?.startDate,
      period?.statDate,
      period?.endDate,
    ]);

    const previousColLabel = useMemo(() => {
      if (!comparable) return null;

      switch (mode) {
        case "month-compare":
          return previousYear != null
            ? `ງວດກ່ອນ\n${formatToMonthYear(previousYear)}\nມູນຄ່າຍັງເຫຼືອ`
            : `${activeFilterLabel}\nມູນຄ່າຍັງເຫຼືອ`;

        case "default-compare":
          return `ປະຈຳປີ ${previousYear ?? activeFilterLabel}\nມູນຄ່າຍັງເຫຼືອ`;

        case "custom":
          // custom มักไม่มี previous column แต่ fallback ไว้
          return `${activeFilterLabel}\nມູນຄ່າຍັງເຫຼືອ`;

        default:
          return `${previousYear ?? activeFilterLabel}\nມູນຄ່າຍັງເຫຼືອ`;
      }
    }, [comparable, mode, previousYear, activeFilterLabel]);
    // ────────────────────────────────────────────────────
    return (
      <>
        <style>{PRINT_STYLES}</style>

        <div ref={ref} style={S.page}>
          <div style={S.content}>
            {/* ── HEADER ───────────────────────────── */}
            <div style={S.header}>
              {/* Address */}
              <div style={S.addrBlock}>
                {companyAddress.map((line, i) => (
                  <div key={i} style={S.addrName}>
                    {line}
                  </div>
                ))}
                {phone && <div style={S.phone}>ເບີໂທ: {phone}</div>}
              </div>

              {/* Title */}
              <div style={S.titleBlock}>
                <div style={S.govTitle}>{companyName}</div>
                <div style={S.slogan}>{slogan}</div>
                <div style={S.reportTitle}>ໃບລາຍງານຜົນດຳເນີນງານ</div>
                <div style={S.periodSubtitle}>{periodText}</div>
              </div>
            </div>

            {/* Currency */}
            <div style={S.currencyBar}>(ສະກຸນເງິນ: LAK)</div>

            {/* ── TABLE ────────────────────────────── */}
            <table style={S.table}>
              <thead>
                <tr>
                  <Th style={S.thLabel}>ເນື້ອໃນລາຍການ</Th>
                  <Th style={S.thNote}>ໝາຍເຫດ</Th>
                  <Th style={{ ...S.thNum, whiteSpace: "pre-line" }}>
                    {currentColLabel}
                  </Th>
                  {comparable && (
                    <Th style={{ ...S.thNum, whiteSpace: "pre-line" }}>
                      {previousColLabel}
                    </Th>
                  )}
                </tr>
              </thead>

              <tbody>
                {mergedLines.length > 0 ? (
                  mergedLines.map((line) => (
                    <LineRow
                      key={line.key}
                      line={line}
                      comparable={comparable}
                    />
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={comparable ? 4 : 3}
                      style={{
                        ...S.cell,
                        textAlign: "center",
                        fontStyle: "italic",
                        color: "#999",
                        padding: "12px",
                      }}
                    >
                      ບໍ່ມີຂໍ້ມູນ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* ── POST-TABLE ───────────────────────── */}
            <div style={S.postTable}>
              <div style={S.footNote}>
                (1) ໃຫ້ນຳໃຊ້ພຽງແຕ່ ເພື່ອສະເໜີ ເອກະສານລາຍງານການເງິນ ລວມກິດຈະການ.
              </div>
              <div style={S.dateLine}>{user?.companyId.information || ""}</div>
            </div>

            {/* ── SIGNATURES ───────────────────────── */}
            <div style={S.sigRow}>
              {["ຜູ້ອຳນວຍການ", "ຫົວໜ້າບັນຊີ", "ຜູ້ສະຫຼຸບ"].map((title) => (
                <SigBox key={title} title={title} />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }
);

IncomePrint.displayName = "IncomePrint";
export default IncomePrint;
