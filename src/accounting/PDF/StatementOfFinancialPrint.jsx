import React, { forwardRef, useMemo } from "react";

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
      mode = "",
      sectionTotals = null,
      activeFilterLabel,
    },
    ref
  ) => {
    console.log(currentYear);
    console.log(current);
    // Section name mapping for display and calculations
    const SECTION_DISPLAY_MAP = {
      Current_Liabilities: "ໜີ້ສິນໝູນວຽນ",
      Non_current_Liabilities: "ໜີ້ສິນບໍ່ໝູນວຽນ",
      Equity: "ທຶນ",
    };

    /* ================= Utils ================= */
    const formatNumber = (num) => {
      if (num === null || num === undefined) return "";
      return Number(num).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    };
      ///1/1/2025
    const formatDate = (d) => {
      if (!d) return "";
      const date = new Date(d);
      if (isNaN(date)) return "";
      return `${String(date.getDate()).padStart(2, "0")}/${String(
        date.getMonth() + 1
      ).padStart(2, "0")}/${date.getFullYear()}`;
    };
    ///12/2025
    function formatToMonthYear(value) {
      if (!/^\d{4}-\d{1,2}$/.test(value)) return value;

      const [year, month] = value.split("-");

      return `${Number(month)}/${year}`;
    }
    
    const renderPeriodText = () => {
      if (period?.startDate && period?.endDate) {
        return `ປີການບັນຊີສິ້ນສຸດວັນທີ: ${formatDate(period.endDate)}`;
      }
      if (mode === "month-compare") {
        return `ປະຈຳເດືອນ ${formatToMonthYear(currentYear)}`;
      }
      return `ປະຈຳປີ ${currentYear}`;
    };

    /* ================= Address ================= */
    const companyAddress = useMemo(
      () =>
        [
          user?.companyId?.name,
          user?.companyId?.address,
          "ເລກທີ່ຜູ້ເສຍອາກອນ: 2837292",
        ].filter(Boolean),
      [user?.companyId?.name, user?.companyId?.address]
    );

    const phone = user?.companyId?.phone;

    /* ================= Group and Merge Data ================= */
    const groupBySection = (data = []) => {
      const grouped = {};
      data.forEach((item) => {
        const section = item.section;
        if (!grouped[section]) {
          grouped[section] = [];
        }
        grouped[section].push(item);
      });
      return grouped;
    };

    const mergeGroupItems = (curItems = [], prevItems = []) => {
      const map = new Map();

      curItems.forEach((c) => {
        map.set(c.key, { cur: c, prev: null });
      });

      prevItems.forEach((p) => {
        if (map.has(p.key)) {
          map.get(p.key).prev = p;
        } else {
          map.set(p.key, { cur: null, prev: p });
        }
      });

      return Array.from(map.values());
    };

    // Memoize grouped data
    const { curGroups, prevGroups } = useMemo(() => {
      return {
        curGroups: groupBySection(current),
        prevGroups: groupBySection(previous),
      };
    }, [current, previous]);

    /* ================= Calculate Section and Grand Totals ================= */
    const {
      sectionTotalsCalculated,
      currentGrandTotal,
      previousGrandTotal,
    } = useMemo(() => {
      const totals = {};
      let curGrandTotal = 0;
      let prevGrandTotal = 0;

      // Calculate totals for each section
      Object.keys(curGroups).forEach((sectionKey) => {
        const curItems = curGroups[sectionKey] || [];
        const prevItems = prevGroups[sectionKey] || [];

        const curTotal = curItems.reduce(
          (sum, item) => sum + (item.ending || 0),
          0
        );
        const prevTotal = prevItems.reduce(
          (sum, item) => sum + (item.ending || 0),
          0
        );

        totals[sectionKey] = {
          cur: curTotal,
          prev: prevTotal,
        };

        curGrandTotal += curTotal;
        prevGrandTotal += prevTotal;
      });

      return {
        sectionTotalsCalculated: totals,
        currentGrandTotal: curGrandTotal,
        previousGrandTotal: prevGrandTotal,
      };
    }, [curGroups, prevGroups]);

    // Use provided sectionTotals if available, otherwise use calculated
    const finalSectionTotals = sectionTotals || sectionTotalsCalculated;

    /* ================= Styles ================= */
    const styles = {
      pageContainer: {
        width: "210mm",
        minHeight: "297mm",
        margin: "0 auto",
        background: "#fff",
        boxShadow: "0 0 10px rgba(0,0,0,0.1)",
        position: "relative",
      },
      content: {
        width: "100%",
        height: "100%",
        padding: "12mm 15mm",
        boxSizing: "border-box",
        fontFamily: "Noto Sans Lao, sans-serif",
        fontSize: "10pt",
        color: "#000",
        lineHeight: "1.3",
      },
      header: {
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "12px",
        fontFamily: "Noto Sans Lao, sans-serif",
        gap: "15px",
      },
      addressSection: {
        flex: "0 0 40%",
        fontSize: "8.5pt",
        lineHeight: "1.5",
        fontFamily: "Noto Sans Lao, sans-serif",
      },
      titleSection: {
        flex: "0 0 60%",
        textAlign: "center",
        fontFamily: "Noto Sans Lao, sans-serif",
      },
      companyTitle: {
        fontSize: "10pt",
        fontWeight: "600",
        marginBottom: "3px",
        lineHeight: "1.3",
        fontFamily: "Noto Sans Lao, sans-serif",
      },
      slogan: {
        fontSize: "8pt",
        marginBottom: "8px",
        lineHeight: "1.2",
        fontFamily: "Noto Sans Lao, sans-serif",
      },
      reportTitle: {
        fontSize: "13pt",
        fontWeight: "bold",
        marginBottom: "5px",
        letterSpacing: "0.2px",
        fontFamily: "Noto Sans Lao, sans-serif",
      },
      periodText: {
        fontSize: "8.5pt",
        marginTop: "3px",
        fontFamily: "Noto Sans Lao, sans-serif",
      },
      currency: {
        textAlign: "right",
        fontSize: "8pt",
        fontStyle: "italic",
        marginBottom: "6px",
        color: "#444",
        fontFamily: "Noto Sans Lao, sans-serif",
      },
      table: {
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "8.5pt",
        marginBottom: "20px",
        fontFamily: "Noto Sans Lao, sans-serif",
      },
      th: {
        border: "1px solid #333",
        borderTop: "2px solid #000",
        borderBottom: "2px solid #000",
        padding: "6px 5px",
        textAlign: "center",
        whiteSpace: "pre-line",
        fontFamily: "Noto Sans Lao, sans-serif",
        fontWeight: "bold",
        background: "#f8f8f8",
        lineHeight: "1.3",
      },
      sectionHeader: {
        background: "#e8e8e8",
        border: "1px solid #555",
        fontWeight: "bold",
        padding: "5px 8px",
        fontSize: "9pt",
        fontFamily: "Noto Sans Lao, sans-serif",
        textAlign: "left",
      },
      cell: {
        border: "1px solid #666",
        padding: "4px 6px",
        textAlign: "center",
        fontFamily: "Noto Sans Lao, sans-serif",
        verticalAlign: "middle",
      },
      cellLabel: {
        textAlign: "left",
        paddingBottom: "7px",
        fontFamily: "Noto Sans Lao, sans-serif",
      },
      cellCenter: {
        textAlign: "center",
        width: "15%",
        fontFamily: "Noto Sans Lao, sans-serif",
      },
      cellNumber: {
        textAlign: "right",
        width: "20%",
        fontFamily: "Noto Sans Lao, sans-serif",
      },
      sectionTotalRow: {
        background: "#f5f5f5",
        fontFamily: "Noto Sans Lao, sans-serif",
      },
      sectionTotalCell: {
        fontWeight: "bold",
        paddingLeft: "10px",
        paddingBottom: "7px",
        fontFamily: "Noto Sans Lao, sans-serif",
      },
      grandTotalRow: {
        background: "#e0e0e0",
      },
      grandTotalCell: {
        borderTop: "2.5px double #000",
        fontWeight: "bold",
        fontSize: "9pt",
        padding: "6px 8px",
        textAlign: "center",
        fontFamily: "Noto Sans Lao, sans-serif",
      },
      footer: {
        display: "flex",
        justifyContent: "space-around",
        marginTop: "25px",
        paddingTop: "15px",
      },
      signatureBox: {
        flex: "1",
        textAlign: "center",
        fontSize: "8.5pt",
        fontFamily: "Noto Sans Lao, sans-serif",
      },
      signatureTitle: {
        marginBottom: "40px",
        fontWeight: "800",
        fontFamily: "Noto Sans Lao, sans-serif",
      },
      signatureLine: {
        borderTop: "1.5px solid #333",
        display: "inline-block",
        minWidth: "120px",
        paddingTop: "4px",
        fontFamily: "Noto Sans Lao, sans-serif",
        fontSize: "7.5pt",
      },
    };

    // Print media query styles
    const printStyles = `
      @media print {
        @page {
          size: A4;
          margin: 0;
        }
        body {
          margin: 0;
          padding: 0;
        }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `;

    /* ================= Render ================= */
    return (
      <>
        <style>{printStyles}</style>
        <div ref={ref} style={styles.pageContainer}>
          <div style={styles.content}>
            {/* ================= HEADER ================= */}
            <div style={styles.header}>
              {/* Address */}
              <div style={styles.addressSection}>
                {companyAddress.map((line, i) => (
                  <div
                    key={i}
                    style={{
                      fontFamily: "Noto Sans Lao, sans-serif",
                      fontWeight: i === 0 ? "bold" : "normal",
                      marginBottom:
                        i === companyAddress.length - 1 ? "0" : "2px",
                    }}
                  >
                    {line}
                  </div>
                ))}
                {phone && (
                  <div
                    style={{
                      fontFamily: "Noto Sans Lao, sans-serif",
                      marginTop: "4px",
                    }}
                  >
                    ເບີໂທ: {phone}
                  </div>
                )}
              </div>

              {/* Title */}
              <div style={styles.titleSection}>
                <div style={styles.companyTitle}>{companyName}</div>
                <div style={styles.slogan}>{slogan}</div>
                <div style={styles.reportTitle}>
                  ໃບລາຍງານຖານະການເງິນ - ໜີ້ສິນ
                </div>
                <div style={styles.periodText}>{activeFilterLabel}</div>
              </div>
            </div>

            {/* Currency */}
            <div style={styles.currency}>(ສະກຸນເງິນ: LAK)</div>

            {/* ================= TABLE ================= */}
            <table style={styles.table}>
              <thead>
                <tr>
                  {[
                    "ໜີ້ສິນ ແລະ ທຶນ",
                    "ໝາຍເຫດ",
                    `${
                      currentYear == null
                        ? activeFilterLabel
                        : renderPeriodText(currentYear)
                    }\nມູນຄ່າຍັງເຫຼືອ`,
                    comparable &&
                      `${renderPeriodText(previousYear)}\nມູນຄ່າຍັງເຫຼືອ`,
                  ]
                    .filter(Boolean)
                    .map((h, i) => {
                      const isFirstCol = i === 0;
                      const isNoteCol = i === 1;
                      return (
                        <th
                          key={i}
                          style={{
                            ...styles.th,
                            width: isFirstCol
                              ? "40%"
                              : isNoteCol
                              ? "15%"
                              : "auto",
                          }}
                        >
                          {h}
                        </th>
                      );
                    })}
                </tr>
              </thead>

              <tbody>
                {Object.keys(curGroups)
                  .sort((a, b) => {
                    const order = [
                      "Current_Liabilities",
                      "Non_current_Liabilities",
                      "Equity",
                    ];
                    return order.indexOf(a) - order.indexOf(b);
                  })
                  .map((sectionKey) => {
                    const curItems = curGroups[sectionKey] || [];
                    const prevItems = prevGroups[sectionKey] || [];
                    const rows = mergeGroupItems(curItems, prevItems);
                    const sectionTotal = finalSectionTotals[sectionKey] || {
                      cur: 0,
                      prev: 0,
                    };
                    const displayName =
                      SECTION_DISPLAY_MAP[sectionKey] || sectionKey;

                    return (
                      <React.Fragment key={sectionKey}>
                        {/* Section Header */}
                        <tr>
                          <td
                            colSpan={comparable ? 4 : 3}
                            style={styles.sectionHeader}
                          >
                            {displayName}
                          </td>
                        </tr>

                        {/* Items */}
                        {rows.length > 0 ? (
                          rows.map((row, idx) => {
                            const item = row.cur || row.prev;
                            if (!item) return null;

                            return (
                              <tr key={item.key || `${sectionKey}-${idx}`}>
                                <td
                                  style={{
                                    ...styles.cell,
                                    ...styles.cellLabel,
                                  }}
                                >
                                  {item.label}
                                </td>
                                <td
                                  style={{
                                    ...styles.cell,
                                    ...styles.cellCenter,
                                  }}
                                >
                                  {/* {item.pattern || ""} */}
                                </td>
                                <td
                                  style={{
                                    ...styles.cell,
                                    ...styles.cellNumber,
                                  }}
                                >
                                  {formatNumber(row.cur?.ending)}
                                </td>
                                {comparable && (
                                  <td
                                    style={{
                                      ...styles.cell,
                                      ...styles.cellNumber,
                                    }}
                                  >
                                    {formatNumber(row.prev?.ending)}
                                  </td>
                                )}
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td
                              colSpan={comparable ? 4 : 3}
                              style={{
                                ...styles.cell,
                                textAlign: "center",
                                fontStyle: "italic",
                                color: "#666",
                              }}
                            >
                              ບໍ່ມີຂໍ້ມູນ
                            </td>
                          </tr>
                        )}

                        {/* Section Total */}
                        <tr style={styles.sectionTotalRow}>
                          <td
                            colSpan="2"
                            style={{
                              ...styles.cell,
                              ...styles.sectionTotalCell,
                            }}
                          >
                            ລວມຍອດ {displayName}
                          </td>
                          <td
                            style={{
                              ...styles.cell,
                              ...styles.cellNumber,
                              fontWeight: "bold",
                            }}
                          >
                            {formatNumber(sectionTotal.cur)}
                          </td>
                          {comparable && (
                            <td
                              style={{
                                ...styles.cell,
                                ...styles.cellNumber,
                                fontWeight: "bold",
                              }}
                            >
                              {formatNumber(sectionTotal.prev)}
                            </td>
                          )}
                        </tr>
                      </React.Fragment>
                    );
                  })}

                {/* GRAND TOTAL */}
                <tr style={styles.grandTotalRow}>
                  <td colSpan="2" style={styles.grandTotalCell}>
                    ລວມຍອດ ໜີ້ສິນ + ທຶນ
                  </td>
                  <td
                    style={{
                      ...styles.cell,
                      ...styles.cellNumber,
                      ...styles.grandTotalCell,
                    }}
                  >
                    {formatNumber(currentGrandTotal)}
                  </td>
                  {comparable && (
                    <td
                      style={{
                        ...styles.cell,
                        ...styles.cellNumber,
                        ...styles.grandTotalCell,
                      }}
                    >
                      {formatNumber(previousGrandTotal)}
                    </td>
                  )}
                </tr>
              </tbody>
            </table>

            {/* Footer Signatures */}
            <div style={styles.footer}>
              {["ຜູ້ອຳນວຍການ", "ຫົວໜ້າບັນຊີ", "ຜູ້ສະຫຼຸບ"].map((title, i) => (
                <div key={i} style={styles.signatureBox}>
                  <div style={styles.signatureTitle}>{title}</div>
                </div>
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
