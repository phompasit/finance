import React, { forwardRef } from "react";

const FinancialStatement = forwardRef(
  (
    {
      companyName = "ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ",
      slogan = "ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ",
      user,
      dateText = "31/12/2025",
      currentYear = "This Month 12/2025",
      previousYear = "Previous Month 12/2024",
      comparable = true,
      current = {},
      previous = {},
      period = {},
      mode = "",
    },
    ref
  ) => {
    const curGroups = current?.groups || {};
    const prevGroups = previous?.groups || {};
    const UI_GROUP_MAP = {
      other_receivablesAA: [
        "other_receivables",
        "tax_assets",
        "other_current_assets",
      ],
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

    const formatNumber = (num) => {
      if (num === null || num === undefined || num === "") return "";
      return Number(num).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    };
    const companyAddress = [
      user?.companyId?.name,
      user?.companyId?.address,
      "ເລກທີ່ຜູ້ເສຍອາກອນ:2837292",
    ];
    const phone = user?.companyId?.phone;
    const mergeGroupItems = (curGroup, prevGroup) => {
      const keys = new Set([
        ...(curGroup?.items || []).map((i) => i.key),
        ...(prevGroup?.items || []).map((i) => i.key),
      ]);

      return [...keys].map((key) => ({
        key,
        cur: curGroup?.items?.find((i) => i.key === key),
        prev: prevGroup?.items?.find((i) => i.key === key),
      }));
    };
    const formatDate = (d) => {
      if (!d) return "";
      const date = new Date(d);
      if (isNaN(date)) return "";

      const dd = String(date.getDate()).padStart(2, "0");
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const yyyy = date.getFullYear();

      return `${dd}/${mm}/${yyyy}`;
    };
    ///12/2025
    function formatToMonthYear(value) {
      if (!/^\d{4}-\d{1,2}$/.test(value)) return value;

      const [year, month] = value.split("-");

      return `${Number(month)}/${year}`;
    }
    const renderPeriodText = () => {
      // 1️⃣ ช่วงวันที่
      if (period.startDate && period.endDate) {
        return `ແຕ່ວັນທີ ${formatDate(period.startDate)} ຫາ ${formatDate(
          period.endDate
        )}`;
      }

      // 2️⃣ ประจำเดือน
      if (previousYear && currentYear && mode === "month-compare") {
        return `ປະຈຳເດືອນ ${formatToMonthYear(currentYear)} `;
      }

      // 3️⃣ ประจำปี
      return `ປະຈຳປີ ${currentYear}`;
    };

    return (
      <div
        ref={ref}
        style={{
          width: "210mm",
          minHeight: "297mm",
          padding: "15mm 18mm",
          margin: "0 auto",
          background: "#fff",
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: "10pt",
          color: "#000",
          boxSizing: "border-box",
          pageBreakAfter: "always",
        }}
      >
        {/* ================= HEADER ================= */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "40% 60%",
            marginBottom: "18px",
          }}
        >
          {/* Left : Address */}
          <div
            style={{
              fontSize: "9pt",
              lineHeight: "1.45",
              paddingLeft: "8px",
              paddingTop: "35px",
            }}
          >
            {companyAddress.map((line, i) => (
              <div
                key={i}
                style={{
                  fontFamily: "Noto Sans Lao, sans-serif",
                  fontWeight: i === 0 ? "bold" : "normal",
                }}
              >
                {line}
              </div>
            ))}
            <div
              style={{
                marginTop: "4px",
                fontFamily: "Noto Sans Lao, sans-serif",
              }}
            >
              ເບີໂທ: {phone}
            </div>
          </div>

          {/* Center : Title */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "12pt",
                fontFamily: "Noto Sans Lao, sans-serif",
              }}
            >
              {companyName}
            </div>
            <div
              style={{
                fontSize: "10pt",
                marginBottom: "10px",
                fontFamily: "Noto Sans Lao, sans-serif",
              }}
            >
              {slogan}
            </div>

            <div
              style={{
                fontSize: "14pt",
                fontWeight: "bold",
                textTransform: "uppercase",
                fontFamily: "Noto Sans Lao, sans-serif",
              }}
            >
              ໃບລາຍງານຖານະການເງິນ - ຊັບສິນ
            </div>
            <div
              style={{
                fontFamily: "Noto Sans Lao, sans-serif",
                fontSize: "9pt",
                marginTop: "6px",
              }}
            >
              {renderPeriodText()}
            </div>
          </div>
        </div>

        {/* Currency */}
        <div
          style={{
            textAlign: "right",
            fontSize: "8.5pt",
            fontStyle: "italic",
            marginBottom: "6px",
            fontFamily: "Noto Sans Lao, sans-serif",
          }}
        >
          (ສະກຸນເງິນ: – LAK)
        </div>

        {/* ================= TABLE ================= */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "9pt",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  borderTop: "2px solid #000",
                  borderBottom: "2px solid #000",
                  borderLeft: "1px solid #666",
                  borderRight: "1px solid #666",
                  padding: "6px",
                  textAlign: "center",
                  width: "45%",
                  fontSize:'12px',
                  fontFamily: "Noto Sans Lao, sans-serif",
                }}
              >
                ຊັບສິນ
              </th>
              <th
                style={{
                  borderTop: "2px solid #000",
                  borderBottom: "2px solid #000",
                  borderLeft: "1px solid #666",
                  borderRight: "1px solid #666",
                  padding: "6px",
                  width: "8%",
                  textAlign: "center",
                     fontSize:'12px',
                  fontFamily: "Noto Sans Lao, sans-serif",
                }}
              >
                ໝາຍເຫດ
              </th>
              <th
                style={{
                  borderTop: "2px solid #000",
                  borderBottom: "2px solid #000",
                  borderLeft: "1px solid #666",
                  borderRight: "1px solid #666",
                  padding: "6px",
                  textAlign: "center",
                     fontSize:'12px',
                  fontFamily: "Noto Sans Lao, sans-serif",
                }}
              >
                {renderPeriodText(currentYear)}
                <br />
                ມູນຄ່າຍັງເຫຼືອ
              </th>
              {comparable && (
                <th
                  style={{
                       fontSize:'12px',
                    borderTop: "2px solid #000",
                    borderBottom: "2px solid #000",
                    borderLeft: "1px solid #666",
                    borderRight: "1px solid #666",
                    padding: "6px",
                    textAlign: "center",
                    fontFamily: "Noto Sans Lao, sans-serif",
                  }}
                >
                  {renderPeriodText(previousYear)}
                  <br />
                  ມູນຄ່າຍັງເຫຼືອ
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {Object.entries(curGroups).map(([groupName, curGroup]) => {
              const prevGroup = prevGroups[groupName] || {
                items: [],
                total: 0,
              };
              const rows = buildUIRows(mergeGroupItems(curGroup, prevGroup));
              const orderedRows = [
                ...rows.filter((r) => !r.isParent),
                ...rows.filter((r) => r.isParent),
              ];
              return (
                <React.Fragment key={groupName}>
                  {/* Group */}
                  <tr>
                    <td
                      colSpan={comparable ? 4 : 3}
                      style={{
                        border: "1px solid #666",
                        background: "#f2f2f2",
                        fontWeight: "bold",
                        padding: "5px 8px",
                        fontFamily: "Noto Sans Lao, sans-serif",
                      }}
                    >
                      {groupName === "Current Assets"
                        ? "ຊັບສິນໝູນວຽນ"
                        : "ຊັບສິນບໍ່ໝູນວຽນ"}
                    </td>
                  </tr>

                  {/* Items */}
                  {orderedRows.map((row, idx) => {
                    // ===== PARENT =====
                    if (row.isParent) {
                      return (
                        <React.Fragment key={row.key}>
                          <tr>
                            <td
                              style={{
                                border: "1px solid #666",
                                padding: "4px 8px",
                                fontWeight: "bold",
                                fontFamily: "Noto Sans Lao, sans-serif",
                              }}
                            >
                              {idx + 1}. {row.cur?.label || row.prev?.label}
                            </td>
                            <td style={{ border: "1px solid #666" }} />
                            <td
                              style={{
                                border: "1px solid #666",
                                textAlign: "right",
                                padding: "4px 8px",
                              }}
                            >
                              {formatNumber(row.cur?.amount)}
                            </td>
                            {comparable && (
                              <td
                                style={{
                                  border: "1px solid #666",
                                  textAlign: "right",
                                  padding: "4px 8px",
                                }}
                              >
                                {formatNumber(row.prev?.amount)}
                              </td>
                            )}
                          </tr>

                          {/* ===== CHILDREN ===== */}
                          {row.children.map((c, i) => (
                            <tr key={c.key}>
                              <td
                                style={{
                                  border: "1px solid #666",
                                  padding: "4px 8px 4px 28px",
                                  fontFamily: "Noto Sans Lao, sans-serif",
                                }}
                              >
                                {idx + 1}.{i + 1}{" "}
                                {c.cur?.label || c.prev?.label}
                              </td>
                              <td style={{ border: "1px solid #666" }} />
                              <td
                                style={{
                                  border: "1px solid #666",
                                  textAlign: "right",
                                  padding: "4px 8px",
                                }}
                              >
                                {formatNumber(c.cur?.amount)}
                              </td>
                              {comparable && (
                                <td
                                  style={{
                                    border: "1px solid #666",
                                    textAlign: "right",
                                    padding: "4px 8px",
                                  }}
                                >
                                  {formatNumber(c.prev?.amount)}
                                </td>
                              )}
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    }

                    // ===== NORMAL ROW =====
                    return (
                      <tr key={row.key}>
                        <td
                          style={{
                            border: "1px solid #666",
                            padding: "4px 8px",
                            fontFamily: "Noto Sans Lao, sans-serif",
                          }}
                        >
                          {idx + 1}. {row.cur?.label || row.prev?.label}
                        </td>
                        <td style={{ border: "1px solid #666" }} />
                        <td
                          style={{
                            border: "1px solid #666",
                            textAlign: "right",
                            padding: "4px 8px",
                          }}
                        >
                          {formatNumber(row.cur?.amount)}
                        </td>
                        {comparable && (
                          <td
                            style={{
                              border: "1px solid #666",
                              textAlign: "right",
                              padding: "4px 8px",
                            }}
                          >
                            {formatNumber(row.prev?.amount)}
                          </td>
                        )}
                      </tr>
                    );
                  })}

                  {/* Group Total */}
                  <tr>
                    <td
                      style={{
                        borderTop: "2px solid #000",
                        borderLeft: "1px solid #666",
                        borderRight: "1px solid #666",
                        borderBottom: "1px solid #666",
                        fontWeight: "bold",
                        padding: "5px 8px",
                        fontFamily: "Noto Sans Lao, sans-serif",
                      }}
                    >
                      ລວມຍອດ{" "}
                      {groupName === "Current Assets"
                        ? "ຊັບສິນໝູນວຽນ"
                        : "ຊັບສິນບໍ່ໝູນວຽນ"}
                    </td>
                    <td style={{ border: "1px solid #666" }} />
                    <td
                      style={{
                        border: "1px solid #666",
                        textAlign: "right",
                        fontWeight: "bold",
                        padding: "5px 8px",
                      }}
                    >
                      {formatNumber(curGroup.total)}
                    </td>
                    {comparable && (
                      <td
                        style={{
                          border: "1px solid #666",
                          textAlign: "right",
                          fontWeight: "bold",
                          padding: "5px 8px",
                        }}
                      >
                        {formatNumber(prevGroup.total)}
                      </td>
                    )}
                  </tr>
                </React.Fragment>
              );
            })}

            {/* GRAND TOTAL */}
            <tr style={{ background: "#e6e6e6" }}>
              <td
                style={{
                  borderTop: "3px double #000",
                  borderLeft: "1px solid #666",
                  borderRight: "1px solid #666",
                  borderBottom: "1px solid #666",
                  fontWeight: "bold",
                  padding: "6px 8px",
                  fontFamily: "Noto Sans Lao, sans-serif",
                }}
              >
                ລວມຍອດ ຊັບສິນທັງໝົດ
              </td>
              <td style={{ border: "1px solid #666" }} />
              <td
                style={{
                  border: "1px solid #666",
                  textAlign: "right",
                  fontWeight: "bold",
                  padding: "6px 8px",
                }}
              >
                {formatNumber(current?.totalAssets)}
              </td>
              {comparable && (
                <td
                  style={{
                    border: "1px solid #666",
                    textAlign: "right",
                    fontWeight: "bold",
                    padding: "6px 8px",
                  }}
                >
                  {formatNumber(previous?.totalAssets)}
                </td>
              )}
            </tr>
          </tbody>
        </table>
        <div
          style={{
            marginBottom: "30px",
            display: "flex",
            justifyContent: "flex-end",
            fontSize: "8pt",
            fontFamily: "Noto Sans Lao, sans-serif",
          }}
        >
          {`ທີ່.......................,ວັນທີ່:....../...../.....`}
        </div>

        {/* ================= FOOTER ================= */}
        <footer
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "20px",
            fontSize: "9pt",
          }}
        >
          {["ຜູ້ອຳນວຍການ", "ຫົວໜ້າບັນຊີ", "ຜູ້ສະຫຼຸບ"].map((title, i) => (
            <div key={i} style={{ textAlign: "center", flex: 1 }}>
              <div
                style={{
                  paddingTop: "4px",
                  minWidth: "140px",
                  display: "inline-block",
                  fontFamily: "Noto Sans Lao, sans-serif",
                }}
              >
                {title}
              </div>
            </div>
          ))}
        </footer>

        <div
          style={{
            marginTop: "100px",
            fontSize: "7pt",
            color: "#555",
            textAlign: "center",
            borderTop: "1px solid #ccc",
            paddingTop: "6px",
            fontFamily: "Noto Sans Lao, sans-serif",
          }}
        >
          ພັດທະນາໂດຍ | ບໍລິສັດ : SmartAcc Co., Ltd |
          {new Date().toLocaleString("en-GB")}
        </div>
      </div>
    );
  }
);

FinancialStatement.displayName = "FinancialStatement";
export default FinancialStatement;
