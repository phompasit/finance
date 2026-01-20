import React, { forwardRef, useMemo } from "react";

/* ================= Helpers ================= */
const formatNumber = (n) =>
  n !== null && n !== undefined
    ? Number(n).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "-";

const formatDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date)) return d;
  return date.toLocaleDateString("en-GB");
};

/* ================= Component ================= */
const GeneralGL = forwardRef(
  ({ dateRange = "", user, data, activeTab }, ref) => {
    /* ================= Normalize data ================= */
    const dataArray = useMemo(
      () => (Array.isArray(data) ? data : data ? [data] : []),
      [data]
    );

    /* ================= Process transactions ================= */
    const getTransactionRows = useMemo(() => {
      return (accData) => {
        return (
          accData?.rows
            ?.filter((r) => r.description !== "Opening Balance")
            ?.filter(Boolean) || []
        );
      };
    }, []);
    const headings = {
      CASH: "ປື້ມຕິດຕາມບັນຊີເງິນສົດ",
      BANK: "ປື້ມຕິດຕາມບັນຊີເງິນຝາກ",
      ALL: "ປື້ມຕິດຕາມບັນຊີໃຫ່ຍແຍກປະເພດ",
    };

    const heading = headings[activeTab] || "";
    const tableStyle = {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 12,
      marginTop: 20,
    };

    const tdRight = { ...td, textAlign: "right" };
    const tdLeft = { ...td, textAlign: "left", paddingLeft: 10 };

    const renderNumber = (v) =>
      v !== null && v !== undefined ? formatNumber(v) : "-";

    return (
      <div ref={ref}>
        {dataArray.map((accData, accIndex) => {
          const accountName =
            accData?.accountName || accData?.account?.name || "";
          const accountCode =
            accData?.accountCode || accData?.account?.code || "";

          /* ================= Opening Balance ================= */
          const openingRow = accData?.rows?.find(
            (r) => r.description === "Opening Balance"
          );

          /* ================= Transactions ================= */
          const transactionRows = getTransactionRows(accData);

          return (
            <div
              key={accData.accountId || `account-${accIndex}`}
              style={{
                background: "#fff",
                padding: "40px 30px",
                marginBottom: 40,
                pageBreakAfter:
                  accIndex === dataArray.length - 1 ? "auto" : "always",
                fontFamily: "'Noto Sans Lao', 'Phetsarath OT', sans-serif",
                maxWidth: 1200,
                margin: "0 auto 40px",
              }}
            >
              {/* ================= Header ================= */}
              <div
                style={{
                  textAlign: "center",
                  marginBottom: 20,
                  paddingBottom: 15,
                }}
              >
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    marginBottom: 5,
                    fontFamily: "Noto Sans Lao, sans-serif",
                  }}
                >
                  ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontStyle: "italic",
                    fontFamily: "Noto Sans Lao, sans-serif",
                  }}
                >
                  ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ
                </div>
              </div>

              {/* ================= Company Info ================= */}
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontFamily: "Noto Sans Lao, sans-serif",
                    fontWeight: "bold",
                    fontSize: 14,
                    marginBottom: 3,
                  }}
                >
                  {user.companyId.name}
                </div>
                <div
                  style={{
                    fontFamily: "Noto Sans Lao, sans-serif",
                    fontSize: 12,
                    color: "#333",
                    lineHeight: 1.6,
                  }}
                >
                  ທີ່ຢູ່: {user.companyId.address}
                </div>
                <div
                  style={{
                    fontFamily: "Noto Sans Lao, sans-serif",
                    fontSize: 12,
                    color: "#333",
                  }}
                >
                  ເບີໂທ: {user.companyId.phone}
                </div>
              </div>

              {/* ================= Title Section ================= */}
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div
                  style={{
                    fontFamily: "Noto Sans Lao, sans-serif",
                    fontSize: 20,
                    fontWeight: "bold",
                    marginBottom: 10,
                  }}
                >
                  {heading}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontFamily: "Noto Sans Lao, sans-serif",
                  }}
                >
                  <strong>Reporting Period:</strong> {dateRange}
                </div>
              </div>

              {/* ================= Info Bar ================= */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 20,
                  fontFamily: "Noto Sans Lao, sans-serif",
                  padding: "10px 15px",
                  borderRadius: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    color: "#1a5490",
                    fontFamily: "Noto Sans Lao, sans-serif",
                  }}
                >
                  {accountCode} - {accountName}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontFamily: "Noto Sans Lao, sans-serif",
                  }}
                >
                  <strong
                    style={{
                      fontFamily: "Noto Sans Lao, sans-serif",
                    }}
                  >
                    ສະກຸນ:
                  </strong>{" "}
                  LAK
                </div>
              </div>

              {/* ================= Table ================= */}
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th rowSpan={2} style={th}>
                      #
                    </th>

                    <th colSpan={2} style={{ ...th, background: "#e8e8e8" }}>
                      ໃບຢັ້ງຢືນ
                    </th>

                    <th rowSpan={2} style={th}>
                      ເນື່ອໃນລາຍການ
                    </th>
                    <th rowSpan={2} style={th}>
                      ມູນຄ່າເດີມ
                    </th>
                    <th rowSpan={2} style={th}>
                      ອັດຕາແລກປ່ຽນ
                    </th>

                    <th colSpan={2} style={{ ...th, background: "#e8e8e8" }}>
                      ການເຄື່ອນໄຫວ
                    </th>

                    <th rowSpan={2} style={th}>
                      ຍອດເຫຼືອ
                    </th>
                  </tr>

                  <tr>
                    <th style={thSub}>ວັນທີ່</th>
                    <th style={thSub}>ອ້າງອີງ</th>

                    <th style={thSub}>ໜີ້</th>
                    <th style={thSub}>ມີ</th>
                  </tr>
                </thead>

                <tbody>
                  {/* ===== Opening Balance ===== */}
                  {openingRow && (
                    <tr style={{ background: "#fffef0", fontWeight: "bold" }}>
                      <td style={td}>1</td>
                      <td style={td}>{formatDate(openingRow.date)}</td>
                      <td style={td}>-</td>

                      <td style={tdLeft}>ຍອດຍົກມາ</td>

                      <td style={tdRight}>-</td>
                      <td style={td}>-</td>

                      <td style={tdRight}>-</td>
                      <td style={tdRight}>-</td>

                      <td style={tdRight}>
                        {renderNumber(openingRow.balance)}
                      </td>
                    </tr>
                  )}

                  {/* ===== Transactions ===== */}
                  {transactionRows.map((row, index) => {
                    const lineNo = openingRow ? index + 2 : index + 1;
                    const originalAmount =
                      row.side === "dr"
                        ? row.debitOriginal
                        : row.creditOriginal;

                    return (
                      <tr key={row._id ?? index}>
                        <td style={td}>{lineNo}</td>
                        <td style={td}>{formatDate(row.date)}</td>
                        <td style={td}>{row.reference ?? "-"}</td>

                        <td style={tdLeft}>{row.description ?? "-"}</td>

                        <td style={tdRight}>{renderNumber(originalAmount)}</td>
                        <td style={td}>{row.exchangeRate ?? "-"}</td>

                        <td style={tdRight}>{renderNumber(row.dr)}</td>
                        <td style={tdRight}>{renderNumber(row.cr)}</td>

                        <td style={{ ...tdRight, fontWeight: "bold" }}>
                          {renderNumber(row.balance)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div
                style={{
                  marginBottom: 5,
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Noto Sans Lao', sans-serif",
                    marginBottom: 5,
                    fontSize: 12,
                  }}
                >
                  ທີ່........................................., ວັນທີ່:
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans Lao', sans-serif",
                    fontSize: 12,
                  }}
                >
                  {new Date().toLocaleDateString("en-GB")}
                </div>
              </div>
              {/* ================= Footer Signatures ================= */}
              <div
                style={{
                  marginTop: 20,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <Signature title="ຜູ້ອຳນວຍການ" />
                <Signature title="ຫົວໜ້າບັນຊີ" />
                <Signature title=" ຜູ້ສະຫຼຸບ" />
              </div>
            </div>
          );
        })}
      </div>
    );
  }
);

GeneralGL.displayName = "GeneralGL";

/* ================= Styles ================= */
const th = {
  border: "1px solid #333",
  padding: "12px 8px",
  background: "#d4d4d4",
  textAlign: "center",
  fontWeight: "bold",
  fontFamily: "'Noto Sans Lao', sans-serif",
  fontSize: 12,
  verticalAlign: "middle",
  lineHeight: 1.4,
};

const thSub = {
  border: "1px solid #333",
  padding: "10px 8px",
  background: "#e8e8e8",
  textAlign: "center",
  fontWeight: "bold",
  fontFamily: "'Noto Sans Lao', sans-serif",
  fontSize: 11,
};

const td = {
  border: "1px solid #999",
  padding: "8px 6px",
  textAlign: "center",
  fontFamily: "'Noto Sans Lao', sans-serif",
  fontSize: 11,
  verticalAlign: "middle",
  lineHeight: 1.4,
};

const Signature = ({ title }) => (
  <div style={{ textAlign: "center", minWidth: 180 }}>
    <div
      style={{
        fontWeight: "bold",
        fontFamily: "'Noto Sans Lao', sans-serif",
        marginBottom: 5,
        fontSize: "14px",
      }}
    >
      {title}
    </div>
  </div>
);

export default GeneralGL;
