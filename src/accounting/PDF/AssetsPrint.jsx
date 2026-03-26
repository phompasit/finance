import React, { forwardRef, useMemo } from "react";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const GROUP_LABEL_MAP = {
  "Current Assets": "ຊັບສິນໝູນວຽນ",
  "Non-current Assets": "ຊັບສິນບໍ່ໝູນວຽນ",
};

/**
 * Keys that are UI-aggregated parents.
 * Parent key → children keys that should render indented beneath it.
 */
const UI_GROUP_MAP = {
  other_receivablesAA: [
    "other_receivables",
    "tax_assets",
    "other_current_assets",
  ],
};

// ─────────────────────────────────────────────────────────────
// Pure utilities  (defined outside component — stable refs)
// ─────────────────────────────────────────────────────────────

/** "1,234,567.89"  |  "" for null/undefined */
const formatNumber = (num) => {
  if (num === null || num === undefined || num === "") return "";
  const n = Number(num);
  if (isNaN(n)) return "";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/** Date object / ISO string → "dd/mm/yyyy" */
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
  if (typeof value !== "string" || !/^\d{4}-\d{1,2}$/.test(value)) {
    return value ?? "";
  }
  const [year, month] = value.split("-");
  return `${Number(month)}/${year}`;
};

/**
 * Merge current + previous group items by key.
 * Returns [{ key, cur, prev }] — one entry per unique key.
 */
const mergeGroupItems = (curGroup, prevGroup) => {
  const keys = new Set([
    ...(curGroup?.items ?? []).map((i) => i.key),
    ...(prevGroup?.items ?? []).map((i) => i.key),
  ]);
  return [...keys].map((key) => ({
    key,
    cur: curGroup?.items?.find((i) => i.key === key) ?? null,
    prev: prevGroup?.items?.find((i) => i.key === key) ?? null,
  }));
};

/**
 * Annotate rows with isParent / children according to UI_GROUP_MAP.
 * Children are embedded under their parent and excluded from the top level.
 */
// ✅ ใหม่ — ไม่ต้อง reorder เลย แค่ buildUIRows ให้ถูก
const buildUIRows = (rows) => {
  const childKeySet = new Set(
    Object.values(UI_GROUP_MAP).flat() // keys ทั้งหมดที่เป็น children
  );

  return rows
    .filter((row) => !childKeySet.has(row.key)) // ตัด children ออกจาก top-level
    .map((row) => {
      const childKeys = UI_GROUP_MAP[row.key];
      if (!childKeys) return row; // row ปกติ
      // row นี้คือ parent → attach children
      return {
        ...row,
        isParent: true,
        children: childKeys
          .map((k) => rows.find((r) => r.key === k))
          .filter(Boolean),
      };
    });
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
    minHeight: "297mm",
    margin: "0 auto",
    background: "#fff",
    boxShadow: "0 2px 16px rgba(0,0,0,0.10)",
    fontFamily: "'Noto Sans Lao', sans-serif",
    boxSizing: "border-box",
  },
  content: {
    padding: "13mm 16mm",
    boxSizing: "border-box",
    fontSize: "10pt",
    color: "#111",
    lineHeight: "1.4",
    fontFamily: "'Noto Sans Lao', sans-serif",
  },

  // ── Header ──
  header: {
    display: "grid",
    gridTemplateColumns: "40% 60%",
    marginBottom: "14px",
    gap: "12px",
    fontFamily: "'Noto Sans Lao', sans-serif",
  },
  addrBlock: {
    fontSize: "8.5pt",
    lineHeight: "1.65",
    paddingTop: "30px",
    fontFamily: "'Noto Sans Lao', sans-serif",
  },
  addrName: { fontWeight: "700", fontFamily: "'Noto Sans Lao', sans-serif" },
  phone: { marginTop: "4px", fontFamily: "'Noto Sans Lao', sans-serif" },
  titleBlock: {
    textAlign: "center",
    fontFamily: "'Noto Sans Lao', sans-serif",
  },
  govTitle: {
    fontSize: "11pt",
    fontWeight: "700",
    marginBottom: "2px",
    fontFamily: "'Noto Sans Lao', sans-serif",
  },
  slogan: {
    fontSize: "8.5pt",
    color: "#444",
    marginBottom: "10px",
    fontFamily: "'Noto Sans Lao', sans-serif",
  },
  reportTitle: {
    fontSize: "14pt",
    fontWeight: "800",
    letterSpacing: "0.2px",
    marginBottom: "4px",
    fontFamily: "'Noto Sans Lao', sans-serif",
  },
  periodSubtitle: {
    fontSize: "8.5pt",
    color: "#333",
    marginTop: "4px",
    fontFamily: "'Noto Sans Lao', sans-serif",
  },

  currency: {
    textAlign: "right",
    fontSize: "8pt",
    fontStyle: "italic",
    color: "#555",
    marginBottom: "7px",
    fontFamily: "'Noto Sans Lao', sans-serif",
  },

  // ── Table ──
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "8.5pt",
    marginBottom: "10px",
    fontFamily: "'Noto Sans Lao', sans-serif",
  },
  th: {
    border: "1px solid #666",
    borderTop: "2px solid #000",
    borderBottom: "2px solid #000",
    padding: "6px 7px",
    textAlign: "center",
    background: "#f0f0f0",
    fontWeight: "700",
    lineHeight: "1.4",
    fontSize: "9pt",
    fontFamily: "'Noto Sans Lao', sans-serif",
  },
  thLabel: {
    textAlign: "left",
    width: "45%",
    fontFamily: "'Noto Sans Lao', sans-serif",
  },
  thNote: { width: "8%", fontFamily: "'Noto Sans Lao', sans-serif" },

  groupHeaderRow: {
    background: "#e4e4e4",
    borderTop: "1.5px solid #555",
    fontFamily: "'Noto Sans Lao', sans-serif",
  },
  groupHeaderCell: {
    border: "1px solid #777",
    fontWeight: "700",
    padding: "5px 8px",
    fontSize: "9pt",
    fontFamily: "'Noto Sans Lao', sans-serif",
  },

  cell: {
    border: "1px solid #bbb",
    padding: "4px 7px",
    fontFamily: "'Noto Sans Lao', sans-serif",
  },
  cellLabel: { textAlign: "left", fontFamily: "'Noto Sans Lao', sans-serif" },
  cellLabelIndent: {
    textAlign: "left",
    paddingLeft: "22px",
    fontFamily: "'Noto Sans Lao', sans-serif",
  },
  cellNote: {
    textAlign: "center",
    color: "#888",
    fontFamily: "'Noto Sans Lao', sans-serif",
  },
  cellNum: {
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
    fontFamily: "'Noto Sans Lao', sans-serif",
  },

  parentRow: {
    background: "#fafafa",
    fontFamily: "'Noto Sans Lao', sans-serif",
  },
  parentLabel: { fontWeight: "600", fontFamily: "'Noto Sans Lao', sans-serif" },

  groupTotalRow: {
    background: "#f5f5f5",
    fontFamily: "'Noto Sans Lao', sans-serif",
  },
  groupTotalLabel: {
    fontWeight: "700",
    borderTop: "1.5px solid #444",
    padding: "5px 8px",
    fontFamily: "'Noto Sans Lao', sans-serif",
  },
  groupTotalNum: {
    fontWeight: "700",
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
    borderTop: "1.5px solid #444",
    padding: "5px 8px",
    fontFamily: "'Noto Sans Lao', sans-serif",
  },

  grandRow: {
    background: "#e8e8e8",
    fontFamily: "'Noto Sans Lao', sans-serif",
  },
  grandCell: {
    borderTop: "2.5px double #000",
    fontWeight: "800",
    fontSize: "9.5pt",
    padding: "6px 8px",
    fontFamily: "'Noto Sans Lao', sans-serif",
  },
  grandNum: {
    borderTop: "2.5px double #000",
    fontWeight: "800",
    fontSize: "9.5pt",
    padding: "6px 8px",
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
    fontFamily: "'Noto Sans Lao', sans-serif",
  },

  // ── Footer ──
  dateLine: {
    display: "flex",
    justifyContent: "flex-end",
    fontSize: "8pt",
    color: "#555",
    marginTop: "10px",
    marginBottom: "4px",
    fontFamily: "'Noto Sans Lao', sans-serif",
  },
  sigRow: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "22px",
    fontFamily: "'Noto Sans Lao', sans-serif",
  },
  sigBox: {
    flex: 1,
    textAlign: "center",
    fontSize: "8.5pt",
    fontFamily: "'Noto Sans Lao', sans-serif",
  },
  sigTitle: {
    fontWeight: "700",
    marginBottom: "42px",
    fontFamily: "'Noto Sans Lao', sans-serif",
  },
  credit: {
    marginTop: "28px",
    fontSize: "7pt",
    color: "#888",
    textAlign: "center",
    paddingTop: "80px",
    fontFamily: "'Noto Sans Lao', sans-serif",
  },
};

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

const Th = ({ children, style }) => (
  <th style={{ ...S.th, ...style }}>{children}</th>
);

const Td = ({ style, children }) => (
  <td style={{ ...S.cell, ...style }}>{children}</td>
);

/** Normal (non-parent) data row */
const DataRow = ({ row, idx, comparable }) => {
  const label = row.cur?.label ?? row.prev?.label ?? "";
  return (
    <tr>
      <Td style={S.cellLabel}>
        {idx + 1}. {label}
      </Td>
      <Td style={S.cellNote} />
      <Td style={S.cellNum}>{formatNumber(row.cur?.amount)}</Td>
      {comparable && (
        <Td style={S.cellNum}>{formatNumber(row.prev?.amount)}</Td>
      )}
    </tr>
  );
};

/** Parent row + indented children */
const ParentRow = ({ row, idx, comparable }) => {
  const label = row.cur?.label ?? row.prev?.label ?? "";
  return (
    <React.Fragment>
      <tr style={S.parentRow}>
        <Td style={{ ...S.cellLabel, ...S.parentLabel }}>
          {idx + 1}. {label}
        </Td>
        <Td style={S.cellNote} />
        <Td style={S.cellNum}>{formatNumber(row.cur?.amount)}</Td>
        {comparable && (
          <Td style={S.cellNum}>{formatNumber(row.prev?.amount)}</Td>
        )}
      </tr>
      {(row.children ?? []).map((c, ci) => (
        <tr key={c.key}>
          <Td style={S.cellLabelIndent}>
            {idx + 1}.{ci + 1} {c.cur?.label ?? c.prev?.label ?? ""}
          </Td>
          <Td style={S.cellNote} />
          <Td style={S.cellNum}>{formatNumber(c.cur?.amount)}</Td>
          {comparable && (
            <Td style={S.cellNum}>{formatNumber(c.prev?.amount)}</Td>
          )}
        </tr>
      ))}
    </React.Fragment>
  );
};

/** Group header + items + subtotal */
const GroupSection = ({ groupName, curGroup, prevGroup, comparable }) => {
  const rows = buildUIRows(mergeGroupItems(curGroup, prevGroup));
  const colSpan = comparable ? 4 : 3;
  const displayName = GROUP_LABEL_MAP[groupName] ?? groupName;

  return (
    <React.Fragment>
      {/* Group header */}
      <tr style={S.groupHeaderRow}>
        <td colSpan={colSpan} style={S.groupHeaderCell}>
          {displayName}
        </td>
      </tr>

      {/* Rows */}
      {rows.length > 0 ? (
        rows.map((row, idx) =>
          row.isParent ? (
            <ParentRow
              key={row.key}
              row={row}
              idx={idx}
              comparable={comparable}
            />
          ) : (
            <DataRow
              key={row.key}
              row={row}
              idx={idx}
              comparable={comparable}
            />
          )
        )
      ) : (
        <tr>
          <td
            colSpan={colSpan}
            style={{
              ...S.cell,
              textAlign: "center",
              fontStyle: "italic",
              color: "#999",
            }}
          >
            ບໍ່ມີຂໍ້ມູນ
          </td>
        </tr>
      )}

      {/* Group subtotal */}
      <tr style={S.groupTotalRow}>
        <td colSpan={2} style={{ ...S.cell, ...S.groupTotalLabel }}>
          ລວມຍອດ {displayName}
        </td>
        <td style={{ ...S.cell, ...S.groupTotalNum }}>
          {formatNumber(curGroup?.total)}
        </td>
        {comparable && (
          <td style={{ ...S.cell, ...S.groupTotalNum }}>
            {formatNumber(prevGroup?.total)}
          </td>
        )}
      </tr>
    </React.Fragment>
  );
};

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

const FinancialStatement = forwardRef(
  (
    {
      companyName = "ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ",
      slogan = "ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ",
      user,
      currentYear = "2025-12",
      previousYear = "2024-12",
      comparable = true,
      current = {},
      previous = {},
      period = {},
      start = null,
      end = null,
      mode = "",
      activeFilterLabel = "",
    },
    ref
  ) => {
    const curGroups = current?.groups ?? {};
    const prevGroups = previous?.groups ?? {};

    // ── Period text (header subtitle) ──────────────────────
    const periodText = useMemo(() => {
      if (period?.startDate && period?.endDate) {
        return `ແຕ່ວັນທີ ${formatDate(period.startDate)} ຫາ ${formatDate(
          period.endDate
        )}`;
      }
      if (mode === "month-compare") {
        const yr = currentYear ?? previousYear;
        return yr != null
          ? `ປະຈຳເດືອນ ${formatToMonthYear(yr)}`
          : activeFilterLabel;
      }
      if (mode === "custom") {
        return `ແຕ່ ${formatDate(start)} – ${formatDate(end)}`;
      }
      if (mode === "default-compare") {
        const yr = currentYear ?? previousYear;
        return yr != null ? `ປະຈຳປີ ${yr}` : activeFilterLabel;
      }
      return activeFilterLabel;
    }, [
      period?.startDate,
      period?.endDate,
      mode,
      currentYear,
      previousYear,
      start,
      end,
      activeFilterLabel,
    ]);

    // ── Column header labels ───────────────────────────────
    const currentColLabel = useMemo(() => {
      const text =
        mode === "month-compare" && currentYear != null
          ? `ປະຈຳເດືອນ ${formatToMonthYear(currentYear)}`
          : periodText;
      return `${text}\nມູນຄ່າຍັງເຫຼືອ`;
    }, [mode, currentYear, periodText]);

    const previousColLabel = useMemo(() => {
      if (!comparable) return null;
      let text;
      if (mode === "month-compare") {
        text =
          previousYear != null
            ? `ປະຈຳເດືອນ ${formatToMonthYear(previousYear)}`
            : activeFilterLabel;
      } else if (mode === "default-compare") {
        text =
          previousYear != null ? `ປະຈຳປີ ${previousYear}` : activeFilterLabel;
      } else {
        text =
          previousYear != null ? `ປະຈຳປີ ${previousYear}` : activeFilterLabel;
      }
      return `${text}\nມູນຄ່າຍັງເຫຼືອ`;
    }, [comparable, mode, previousYear, activeFilterLabel]);

    // ── Company info ───────────────────────────────────────
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

    // ── Ordered group keys ────────────────────────────────
    const groupKeys = useMemo(() => {
      const preferred = ["Current Assets", "Non-Current Assets"];
      const all = new Set([
        ...Object.keys(curGroups),
        ...Object.keys(prevGroups),
      ]);
      const ordered = preferred.filter((k) => all.has(k));
      all.forEach((k) => {
        if (!preferred.includes(k)) ordered.push(k);
      });
      return ordered;
    }, [curGroups, prevGroups]);

    const colSpan = comparable ? 4 : 3;

    // ──────────────────────────────────────────────────────
    return (
      <>
        <style>{PRINT_STYLES}</style>

        <div ref={ref} style={S.page}>
          <div style={S.content}>
            {/* ── HEADER ─────────────────────────────── */}
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
                <div style={S.reportTitle}>ໃບລາຍງານຖານະການເງິນ - ຊັບສິນ</div>
                <div style={S.periodSubtitle}>{periodText}</div>
              </div>
            </div>

            {/* Currency */}
            <div style={S.currency}>(ສະກຸນເງິນ: LAK)</div>

            {/* ── TABLE ──────────────────────────────── */}
            <table style={S.table}>
              <thead>
                <tr>
                  <Th style={S.thLabel}>ຊັບສິນ</Th>
                  <Th style={S.thNote}>ໝາຍເຫດ</Th>
                  <Th style={{ whiteSpace: "pre-line" }}>{currentColLabel}</Th>
                  {comparable && (
                    <Th style={{ whiteSpace: "pre-line" }}>
                      {previousColLabel}
                    </Th>
                  )}
                </tr>
              </thead>

              <tbody>
                {groupKeys.map((groupName) => (
                  <GroupSection
                    key={groupName}
                    groupName={groupName}
                    curGroup={curGroups[groupName] ?? { items: [], total: 0 }}
                    prevGroup={prevGroups[groupName] ?? { items: [], total: 0 }}
                    comparable={comparable}
                  />
                ))}

                {/* Grand total */}
                <tr style={S.grandRow}>
                  <td colSpan={2} style={{ ...S.cell, ...S.grandCell }}>
                    ລວມຍອດ ຊັບສິນທັງໝົດ
                  </td>
                  <td style={{ ...S.cell, ...S.grandNum }}>
                    {formatNumber(current?.totalAssets)}
                  </td>
                  {comparable && (
                    <td style={{ ...S.cell, ...S.grandNum }}>
                      {formatNumber(previous?.totalAssets)}
                    </td>
                  )}
                </tr>
              </tbody>
            </table>

            {/* ── FOOTER ─────────────────────────────── */}
            <div style={S.dateLine}>{user?.companyId?.information || ""}</div>

            <div style={S.sigRow}>
              {["ຜູ້ອຳນວຍການ", "ຫົວໜ້າບັນຊີ", "ຜູ້ສະຫຼຸບ"].map((title) => (
                <div key={title} style={S.sigBox}>
                  <div style={S.sigTitle}>{title}</div>
                </div>
              ))}
            </div>

            <div style={S.credit}>
              ພັດທະນາໂດຍ | ບໍລິສັດ: SmartAcc Co., Ltd |{" "}
              {new Date().toLocaleString("en-GB")}
            </div>
          </div>
        </div>
      </>
    );
  }
);

FinancialStatement.displayName = "FinancialStatement";
export default FinancialStatement;
