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
const GeneralGL = forwardRef(({ dateRange, user, data, activeTab }, ref) => {
  const dataArray = useMemo(
    () => (Array.isArray(data) ? data : data ? [data] : []),
    [data]
  );

  const getTransactionRows = useMemo(() => {
    return (accData) =>
      accData?.rows
        ?.filter((r) => r.description !== "Opening Balance")
        ?.filter(Boolean) || [];
  }, []);

  const headings = {
    CASH: "ປື້ມຕິດຕາມບັນຊີເງິນສົດ",
    BANK: "ປື້ມຕິດຕາມບັນຊີເງິນຝາກ",
    ALL: "ປື້ມຕິດຕາມບັນຊີໃຫ່ຍແຍກປະເພດ",
  };

  const heading = headings[activeTab] || "";
  const renderNumber = (v) =>
    v !== null && v !== undefined ? formatNumber(v) : "-";

  return (
    <div
      ref={ref}
      style={{ width: "100%", padding: 0, margin: 0, background: "#fff" }}
    >
      {dataArray.map((accData, accIndex) => {
        const accountName =
          accData?.accountName || accData?.account?.name || "";
        const accountCode =
          accData?.accountCode || accData?.account?.code || "";
        const openingRow = accData?.rows?.find(
          (r) => r.description === "Opening Balance"
        );
        const transactionRows = getTransactionRows(accData);

        const totalDr = transactionRows.reduce(
          (sum, r) => sum + (Number(r.dr) || 0),
          0
        );
        const totalCr = transactionRows.reduce(
          (sum, r) => sum + (Number(r.cr) || 0),
          0
        );
        const lastBalance =
          transactionRows.length > 0
            ? transactionRows[transactionRows.length - 1].balance
            : openingRow?.balance ?? null;

        return (
          <div
            key={accData.accountId || `account-${accIndex}`}
            style={{
              background: "#fff",
              padding: "12mm 12mm 10mm 12mm",
              pageBreakAfter:
                accIndex === dataArray.length - 1 ? "auto" : "always",
              fontFamily: FONT,
              width: "100%",
              boxSizing: "border-box",
              margin: 0,
            }}
          >
            {/* ===== Header ===== */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 14,
              }}
            >
              {/* Company Info — left */}
              <div
                style={{
                  fontSize: 12,
                  lineHeight: 1.8,
                  color: "#000",
                  fontFamily: FONT,
                }}
              >
                <div
                  style={{  fontFamily: "Noto Sans Lao, sans-serif", fontWeight: "bold", fontSize: 13, marginBottom: 2 }}
                >
                  {user.companyId.name}
                </div>
                <div style={{  fontFamily: "Noto Sans Lao, sans-serif",}}>ທີ່ຢູ່: {user.companyId.address}</div>
                <div style={{  fontFamily: "Noto Sans Lao, sans-serif",}}>ເບີໂທ: {user.companyId.phone}</div>
              </div>

              {/* State title — center */}
              <div style={{ textAlign: "center", flex: 1, fontFamily: FONT }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: "bold",
                    marginBottom: 3,
                    color: "#000",
                    fontFamily: "Noto Sans Lao, sans-serif",
                  }}
                >
                  ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ
                </div>
                <div
                  style={{
                    fontFamily: "Noto Sans Lao, sans-serif",
                    fontSize: 12,
                    fontStyle: "italic",
                    color: "#333",
                  }}
                >
                  ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ
                </div>
              </div>

              {/* Balance spacer */}
              <div style={{ minWidth: 200 }} />
            </div>

            {/* ===== Divider ===== */}
            <div style={{ borderTop: "2px solid #000", marginBottom: 12 }} />

            {/* ===== Title ===== */}
            <div
              style={{
                textAlign: "center",
                marginBottom: 10,
                fontFamily: FONT,
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  color: "#000",
                  letterSpacing: 0.5,
                    fontFamily: "Noto Sans Lao, sans-serif",
                }}
              >
                {heading}
              </div>
              <div style={{  fontFamily: "Noto Sans Lao, sans-serif", fontSize: 12, color: "#333", marginTop: 4 }}>
                {dateRange}
              </div>
            </div>

            {/* ===== Account Info Bar ===== */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1px solid #000",
                borderBottom: "1px solid #000",
                padding: "6px 0",
                marginBottom: 14,
                fontFamily: FONT,
              }}
            >
              <div
                style={{
                  fontFamily: "Noto Sans Lao, sans-serif",
                  fontSize: 13,
                  fontWeight: "bold",
                  color: "#000",
                }}
              >
                {accountCode} — {accountName}
              </div>
              <div style={{ fontSize: 12, color: "#000" }}>
                <strong style={{ fontFamily: "Noto Sans Lao, sans-serif" }}>
                  ສະກຸນ:
                </strong>{" "}
                LAK
              </div>
            </div>

            {/* ===== Table ===== */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 11,
                tableLayout: "auto",
                fontFamily: FONT,
              }}
            >
              <thead>
                <tr>
                  <th rowSpan={2} style={th}>
                    #
                  </th>
                  <th colSpan={2} style={th}>
                    ໃບຢັ້ງຢືນ
                  </th>
                  <th rowSpan={2} style={{ ...th, minWidth: 180 }}>
                    ເນື່ອໃນລາຍການ
                  </th>
                  <th rowSpan={2} style={th}>
                    ມູນຄ່າເດີມ
                  </th>
                  <th rowSpan={2} style={th}>
                    ອັດຕາແລກປ່ຽນ
                  </th>
                  <th colSpan={2} style={th}>
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
                {/* Opening Balance */}
                {openingRow && (
                  <tr style={{ background: "#f0f0f0", fontWeight: "bold" }}>
                    <td style={td} />
                    <td style={td}>{formatDate(openingRow.date)}</td>
                    <td style={td}>—</td>
                    <td style={tdLeft}>ຍອດຍົກມາ</td>
                    <td style={tdRight}>—</td>
                    <td style={td}>—</td>
                    <td style={tdRight}>—</td>
                    <td style={tdRight}>—</td>
                    <td style={{ ...tdRight, fontWeight: "bold" }}>
                      {renderNumber(openingRow.balance)}
                    </td>
                  </tr>
                )}

                {/* Transactions */}
                {transactionRows.map((row, index) => {
                  const originalAmount =
                    row.side === "dr" ? row.debitOriginal : row.creditOriginal;

                  return (
                    <tr
                      key={row._id ?? index}
                      style={{
                        background: index % 2 === 0 ? "#fff" : "#f9f9f9",
                      }}
                    >
                      <td style={td}>{index + 1}</td>
                      <td style={td}>{formatDate(row.date)}</td>
                      <td style={td}>{row.reference ?? "—"}</td>
                      <td style={tdLeft}>{row.description ?? "—"}</td>
                      <td style={tdRight}>{renderNumber(originalAmount)}</td>
                      <td style={td}>{row.exchangeRate ?? "—"}</td>
                      <td style={tdRight}>{renderNumber(row.dr)}</td>
                      <td style={tdRight}>{renderNumber(row.cr)}</td>
                      <td style={{ ...tdRight, fontWeight: "bold" }}>
                        {renderNumber(row.balance)}
                      </td>
                    </tr>
                  );
                })}

                {/* Total Row */}
                <tr style={{ background: "#d4d4d4", fontWeight: "bold" }}>
                  <td
                    style={{
                      ...td,
                      fontFamily: "Noto Sans Lao, sans-serif",
                      fontWeight: "bold",
                    }}
                    colSpan={6}
                  >
                    ຍອດລວມ
                  </td>
                  <td
                    style={{
                      ...tdRight,
                      fontFamily: "Noto Sans Lao, sans-serif",
                      fontWeight: "bold",
                    }}
                  >
                    {formatNumber(totalDr)}
                  </td>
                  <td
                    style={{
                      ...tdRight,
                      fontFamily: "Noto Sans Lao, sans-serif",
                      fontWeight: "bold",
                    }}
                  >
                    {formatNumber(totalCr)}
                  </td>
                  <td
                    style={{
                      ...tdRight,
                      fontFamily: "Noto Sans Lao, sans-serif",
                      fontWeight: "bold",
                    }}
                  >
                    {renderNumber(lastBalance)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* ===== Company note ===== */}
            {user?.companyId.information && (
              <div
                style={{
                  textAlign: "right",
                  fontSize: 11,
                  color: "#333",
                  marginTop: 6,
                  fontFamily: "Noto Sans Lao, sans-serif",
                  fontFamily: FONT,
                }}
              >
                {user.companyId.information}
              </div>
            )}

            {/* ===== Signature Date ===== */}
            <div
              style={{
                textAlign: "right",
                fontSize: 12,
                color: "#000",
                margin: "20px 0 8px",
                fontFamily: FONT,
              }}
            >
              ສະຖານທີ່..................................., ວັນທີ{" "}
              {formatDate(new Date())}
            </div>

            {/* ===== Signatures ===== */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 16,
                fontFamily: FONT,
              }}
            >
              <Signature title="ຜູ້ອຳນວຍການ" />
              <Signature title="ຫົວໜ້າບັນຊີ" />
              <Signature title="ຜູ້ສະຫຼຸບ" />
            </div>
          </div>
        );
      })}
    </div>
  );
});

GeneralGL.displayName = "GeneralGL";

/* ================= Font ================= */
const FONT = "Noto Sans Lao, sans-serif";

/* ================= Styles ================= */
const th = {
  border: "1px solid #000",
  padding: "8px 7px",
  background: "#d4d4d4",
  color: "#000",
  textAlign: "center",
  fontWeight: "bold",
  fontFamily: FONT,
  fontSize: 11,
  verticalAlign: "middle",
  lineHeight: 1.4,
  whiteSpace: "nowrap",
};

const thSub = {
  border: "1px solid #000",
  padding: "6px 7px",
  background: "#e8e8e8",
  color: "#000",
  textAlign: "center",
  fontWeight: "bold",
  fontFamily: FONT,
  fontSize: 10,
  whiteSpace: "nowrap",
};

const td = {
  border: "1px solid #555",
  padding: "6px 5px",
  textAlign: "center",
  fontFamily: FONT,
  fontSize: 11,
  verticalAlign: "middle",
  lineHeight: 1.4,
  whiteSpace: "nowrap",
  color: "#000",
};

const tdRight = { ...td, textAlign: "right" };

const tdLeft = {
  ...td,
  textAlign: "left",
  paddingLeft: 10,
  whiteSpace: "normal",
  minWidth: 160,
  width: "100%",
};

const Signature = ({ title }) => (
  <div
    style={{
      textAlign: "center",
      minWidth: 180,
      fontFamily: "Noto Sans Lao, sans-serif",
    }}
  >
    <div
      style={{
        fontWeight: "bold",
        fontSize: 13,
        marginBottom: 50,
        color: "#000",
        fontFamily: "Noto Sans Lao, sans-serif",
      }}
    >
      {title}
    </div>
  </div>
);

export default GeneralGL;
