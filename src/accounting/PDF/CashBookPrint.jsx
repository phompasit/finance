import React, { forwardRef } from "react";

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

/* แยก counterAccounts เป็น Dr / Cr */
const splitCounterAccounts = (counterAccounts = []) =>
  counterAccounts.reduce(
    (acc, a) => {
      const side = a.side?.toLowerCase();
      if (side === "dr") acc.dr.push(a);
      if (side === "cr") acc.cr.push(a);
      return acc;
    },
    { dr: [], cr: [] }
  );

/* ================= Component ================= */
const GeneralGL = forwardRef(
  (
    {
      companyName = "ບໍລິສັດ ໂມເດີນ ອິນເຕີເນຊັນ ຈໍາກັດຜູ້ຍ່ຽວ",
      companyAddress = "ບ້ານນາເຊາະກໍ່ລ້ອງ ເມືອງສີສັດຕະນາກແຂວງ ແລະວງພຍອມຕລາດວງວຽງຈັນ",
      phone = "020 55891229",
      dateRange = "01/01/2026 to 31/01/2026",
      currency = "LAK",
      data,
    },
    ref
  ) => {
    const accountName = data?.account?.name || "";
    const accountCode = data?.account?.code || "";

    /* แยก Opening Balance ออกมา (ไม่ลบ) */
    const openingRow = data?.rows?.find(
      (row) => row.description === "Opening Balance"
    );

    /* Transaction rows (ไม่รวม Opening) */
    const transactionRows =
      data?.rows?.filter((row) => row.description !== "Opening Balance") || [];

    return (
      <div ref={ref}>
        <div
          style={{
            background: "#fff",
            padding: "40px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          {/* ================= Header ================= */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 14 }}>
              Peace Independence Democracy Unity Prosperity
            </div>
          </div>

          {/* ================= Company / Title ================= */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: "bold" }}>
                {companyName}
              </div>
              <div style={{ fontSize: 12 }}>{companyAddress}</div>
              <div style={{ fontSize: 12 }}>{phone}</div>
            </div>

            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: "bold" }}>
                General Ledgers Report
              </div>
              <div style={{ fontSize: 14, fontWeight: "bold" }}>
                {accountCode} {accountName}
              </div>
            </div>

            <div style={{ flex: 1 }}></div>
          </div>

          {/* ================= Report Info ================= */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              marginBottom: 15,
            }}
          >
            <div>
              <strong>Reporting period from: {dateRange}</strong>
            </div>
            <div>
              <strong>Currency: {currency}</strong>
            </div>
          </div>

          {/* ================= Table ================= */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 11,
            }}
          >
            <thead>
              <tr>
                <th rowSpan="2" style={th}>#</th>
                <th colSpan="3" style={th}>Reference</th>
                <th colSpan="2" style={th}>Account Code</th>
                <th rowSpan="2" style={th}>Items</th>
                <th rowSpan="2" style={th}>Original<br />Amount</th>
                <th rowSpan="2" style={th}>Exchange<br />Rate</th>
                <th colSpan="2" style={th}>Activities</th>
                <th colSpan="2" style={th}>Balance</th>
              </tr>
              <tr>
                <th style={th}>Date</th>
                <th style={th}>Number</th>
                <th style={th}>Reference</th>
                <th style={th}>Debit</th>
                <th style={th}>Credit</th>
                <th style={th}>Debit</th>
                <th style={th}>Credit</th>
                <th style={th}>Debit</th>
                <th style={th}>Credit</th>
              </tr>
            </thead>

            <tbody>
              {/* ===== Opening Balance (ใช้ค่าจาก backend ตรง ๆ) ===== */}
              {openingRow && (
                <tr>
                  <td style={td}>1</td>
                  <td style={td}>{formatDate(openingRow.date)}</td>
                  <td style={td}></td>
                  <td style={td}>{openingRow.reference || "-"}</td>
                  <td style={td}></td>
                  <td style={td}></td>
                  <td style={{ ...td, textAlign: "left", fontWeight: "bold" }}>
                    Opening Balance
                  </td>
                  <td style={td}></td>
                  <td style={td}></td>

                  {/* Activities */}
                  <td style={{ ...td, textAlign: "right" }}>
                    {openingRow.dr ? formatNumber(openingRow.dr) : "-"}
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    {openingRow.cr ? formatNumber(openingRow.cr) : "-"}
                  </td>

                  {/* Balance */}
                  <td style={{ ...td, textAlign: "right" }}>
                    {openingRow.balance > 0
                      ? formatNumber(openingRow.balance)
                      : "-"}
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    {openingRow.balance < 0
                      ? formatNumber(Math.abs(openingRow.balance))
                      : "-"}
                  </td>
                </tr>
              )}

              {/* ===== Transaction Rows (แตกหลาย Dr) ===== */}
              {transactionRows.map((row, index) => {
                const { dr } = splitCounterAccounts(row.counterAccounts);

                return (
                  <React.Fragment key={index}>
                    {dr.map((d, i) => (
                      <tr key={`${index}-${i}`}>
                        <td style={td}>
                          {openingRow ? index + 2 : index + 1}
                        </td>
                        <td style={td}>{formatDate(row.date)}</td>
                        <td style={td}></td>
                        <td style={td}>{row.reference}</td>

                        {/* Account Code */}
                        <td style={td}>{d.code}</td>
                        <td style={td}>{accountCode}</td>

                        <td style={{ ...td, textAlign: "left" }}>
                          {i === 0 ? row.description : ""}
                        </td>

                        <td style={td}></td>
                        <td style={td}></td>

                        {/* Activities */}
                        <td style={{ ...td, textAlign: "right" }}>-</td>
                        <td style={{ ...td, textAlign: "right" }}>
                          {formatNumber(d.amount)}
                        </td>

                        {/* Balance */}
                        <td style={{ ...td, textAlign: "right" }}>
                          {row.balance > 0
                            ? formatNumber(row.balance)
                            : "-"}
                        </td>
                        <td style={{ ...td, textAlign: "right" }}>
                          {row.balance < 0
                            ? formatNumber(Math.abs(row.balance))
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {/* ================= Footer ================= */}
          <div
            style={{
              marginTop: 40,
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
            }}
          >
            <Signature title="Managing Director" />
            <Signature title="Accountant" />
            <div style={{ textAlign: "center", minWidth: 200 }}>
              <div>
                at ......................................., Date{" "}
                {new Date().toLocaleDateString("en-GB")}
              </div>
              <div>Summarized by</div>
              <div style={{ marginTop: 30 }}>_____________________</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

GeneralGL.displayName = "GeneralGL";

/* ================= Styles ================= */
const th = {
  border: "1px solid #000",
  padding: 6,
  background: "#f0f0f0",
  textAlign: "center",
  fontWeight: "bold",
  fontSize: 11,
};

const td = {
  border: "1px solid #000",
  padding: 6,
  textAlign: "center",
  fontSize: 11,
};

const Signature = ({ title }) => (
  <div style={{ textAlign: "center", minWidth: 200 }}>
    <div>{title}</div>
    <div style={{ marginTop: 50 }}>_____________________</div>
  </div>
);

export default GeneralGL;
