import React, { forwardRef } from "react";

const IncomePrint = forwardRef(
  (
    {
      companyName = "ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ",
      slogan = "ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ",
      user,
      currentYear = "This Month 12/2025",
      previousYear = "Previous Month 12/2024",
      comparable = true,
      period = {},
      mode = "",
      mergedLines = [],
    },
    ref
  ) => {
    const formatNumber = (num) => {
      if (num === null || num === undefined || num === "") return "-";
      return Number(num).toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    };

    const companyAddress = [
      user?.companyId?.name,
      user?.companyId?.address,
      "ເລກທີ່ຜູ້ເສຍອາກອນ:2837292",
    ];
    const phone = user?.companyId?.phone;

    const formatDate = (d) => {
      if (!d) return "";
      const date = new Date(d);
      if (isNaN(date)) return "";

      const dd = String(date.getDate()).padStart(2, "0");
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const yyyy = date.getFullYear();

      return `${dd}/${mm}/${yyyy}`;
    };

    const renderPeriodText = () => {
      if (period?.startDate && period?.endDate) {
        return `ແຕ່ວັນທີ່: ${formatDate(period.startDate)} ຫາ: ${formatDate(
          period.endDate
        )}`;
      }

      if (previousYear && currentYear && mode === "month-compare") {
        return `ປະຈຳເດືອນ ${currentYear} ${previousYear}`;
      }

      return `ປະຈຳປີ: ${currentYear}`;
    };
    const renderCurrentColumnLabel = () => {
      if (mode === "month-compare") return `ງວດປັດຈຸບັນ ${currentYear}`;
      return currentYear;
    };

    const renderPreviousColumnLabel = () => {
      if (mode === "month-compare") return `ງວດກ່ອນ ${previousYear}`;
      return previousYear;
    };

    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, "0")}/${String(
      today.getMonth() + 1
    ).padStart(2, "0")}/${today.getFullYear()}`;

    return (
      <div
        ref={ref}
        style={{
          width: "210mm",
          minHeight: "290mm",
          padding: "12mm 15mm",
          margin: "0 auto",
          background: "#fff",
          fontFamily: "Noto Sans Lao, sans-serif",
          fontSize: "9pt",
          color: "#000",
          boxSizing: "border-box",
          pageBreakAfter: "always",
        }}
      >
        {/* ================= HEADER ================= */}
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
              ໃບລາຍງານຜົນດຳເນີນງານ
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

        {/* Period and Currency */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "8.5pt",
            marginBottom: "8px",
          }}
        >
          <div></div>
          <div
            style={{
              fontFamily: "Noto Sans Lao, sans-serif",
            }}
          >
            ສະກຸນເງິນ: LAK
          </div>
        </div>

        {/* ================= TABLE ================= */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "8.5pt",
            border: "1px solid #000",
          }}
        >
          <thead>
            {/* ===== Row 1 : Column headers ===== */}
            <tr>
              <th
                style={{
                  border: "1px solid #000",
                  padding: "6px",
                  width: "45%",
                  background: "#f5f5f5",
                  fontFamily: "Noto Sans Lao, sans-serif",
                }}
              >
                ເນື້ອໃນລາຍການ
              </th>
              <th
                style={{
                  border: "1px solid #000",
                  padding: "6px",
                  width: "8%",
                  background: "#f5f5f5",
                  fontFamily: "Noto Sans Lao, sans-serif",
                }}
              >
                ໝາຍເຫດ
              </th>
              <th
                style={{
                  border: "1px solid #000",
                  padding: "6px",
                  background: "#f5f5f5",
                  fontFamily: "Noto Sans Lao, sans-serif",
                }}
              >
                {renderCurrentColumnLabel()} <br />
                ມູນຄ່າຍັງເຫຼືອ
              </th>

              {comparable && (
                <th
                  style={{
                    border: "1px solid #000",
                    padding: "6px",
                    background: "#f5f5f5",
                    fontFamily: "Noto Sans Lao, sans-serif",
                  }}
                >
                  {renderPreviousColumnLabel()} <br />
                  ມູນຄ່າຍັງເຫຼືອ
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {mergedLines?.map((l) => {
              const boldLabels = [
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
              ];

              const isBold = boldLabels.includes(l.label);
              const isSection =
                l.label === "Of which:" || l.label.startsWith("Of which");

              return (
                <tr key={l.key}>
                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "4px 8px",
                      paddingBottom: "7px",
                      fontFamily: "Noto Sans Lao, sans-serif",
                      fontWeight: isBold ? "bold" : "normal",
                      fontSize: isBold ? "9pt" : "8.5pt",
                      paddingLeft: isSection ? "12px" : "8px",
                    }}
                  >
                    {l.label}
                  </td>
                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "4px 8px",
                      textAlign: "center",
                      fontFamily: "Noto Sans Lao, sans-serif",
                    }}
                  ></td>
                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "4px 8px",
                      textAlign: "right",
                      fontFamily: "Noto Sans Lao, sans-serif",
                    }}
                  >
                    {formatNumber(l.cur)}
                  </td>
                  {comparable && (
                    <td
                      style={{
                        border: "1px solid #000",
                        padding: "4px 8px",
                        textAlign: "right",
                        fontFamily: "Noto Sans Lao, sans-serif",
                      }}
                    >
                      {formatNumber(l.prev)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginTop: "16px",
            width: "100%",
          }}
        >
          {/* Footer note (ซ้าย) */}
          <div
            style={{
              fontSize: "7.5pt",
              fontStyle: "italic",
              fontFamily: "Noto Sans Lao, sans-serif",
              maxWidth: "60%",
              lineHeight: 1.4,
            }}
          >
            (1) ໃຫ້ນຳໃຊ້ພຽງແຕ່ ເພື່ອສະເໜີ ເອກະສານລາຍງານການເງິນ ລວມກິດຈະການ.
          </div>

          {/* Date (ขวา) */}
          <div
            style={{
              fontSize: "8pt",
              fontFamily: "Noto Sans Lao, sans-serif",
              textAlign: "right",
              whiteSpace: "nowrap",
            }}
          >
            ທີ່ .......................................,ວັນທີ່ {formattedDate}
          </div>
        </div>

        {/* ================= FOOTER SIGNATURES ================= */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            marginTop: "33px",
            fontSize: "8.5pt",
            textAlign: "center",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "Noto Sans Lao, sans-serif",
                textDecoration: "underline",
                fontWeight: "normal",
              }}
            >
              ຜູ້ອຳນວຍການ
            </div>
          </div>
          <div>
            <div
              style={{
                fontFamily: "Noto Sans Lao, sans-serif",
                textDecoration: "underline",
                fontWeight: "normal",
              }}
            >
              ຫົວໜ້າບັນຊີ
            </div>
          </div>
          <div>
            <div
              style={{
                fontFamily: "Noto Sans Lao, sans-serif",
                textDecoration: "underline",
                fontWeight: "normal",
              }}
            >
              ຜູ້ສະຫຼຸບ
            </div>
          </div>
        </div>
      </div>
    );
  }
);

IncomePrint.displayName = "IncomePrint";
export default IncomePrint;
