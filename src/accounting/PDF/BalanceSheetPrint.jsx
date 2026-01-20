import React, { forwardRef } from "react";
import "./trialBalancePrint.css";

const formatNum = (n) =>
  n !== undefined && n !== null && n !== 0 ? Number(n).toLocaleString() : "-";

const TrialBalancePrint = forwardRef(
  ({ tree = [], totals = {}, filter, user, name }, ref) => {
    let index = 1;
    const renderRows = (nodes, level = 0) =>
      nodes.map((acc) => {
        const isParent = level === 0;
        const hasChildren = acc.children && acc.children.length > 0;

        return (
          <React.Fragment key={acc.code}>
            <tr className={isParent ? "parent-row" : "child-row"}>
  

              <td
                className={`account-name ${isParent ? "parent-name" : ""}`}
                style={{
                  fontFamily: "Noto Sans Lao, sans-serif",
                  paddingLeft: `${level * 18 + 6}px`,
                }}
              >
                {isParent && hasChildren ? "▸ " : ""}
                {acc.name}
              </td>

              <td
                style={{
                  fontFamily: "Noto Sans Lao, sans-serif",
                }}
                className="account-code"
              >
                {acc.code}
              </td>

              <td
                style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
                className="number"
              >
                {formatNum(acc.openingDr)}
              </td>
              <td
                style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
                className="number"
              >
                {formatNum(acc.openingCr)}
              </td>
              <td
                style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
                className="number"
              >
                {formatNum(acc.movementDr)}
              </td>
              <td
                style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
                className="number"
              >
                {formatNum(acc.movementCr)}
              </td>
              <td
                style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
                className="number"
              >
                {formatNum(acc.endingDr)}
              </td>
              <td
                style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
                className="number"
              >
                {formatNum(acc.endingCr)}
              </td>
            </tr>

            {acc.children && renderRows(acc.children, level + 1)}
          </React.Fragment>
        );
      });

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
      // 1️⃣ ช่วงวันที่
      if (filter.startDate && filter.endDate) {
        return `ຊ່ວງວັນທີ ${formatDate(filter.startDate)} ຫາ ${formatDate(
          filter.endDate
        )}`;
      }

      // 2️⃣ ประจำเดือน
      if (filter.month) {
        return `ປະຈຳເດືອນ ${filter.month} ປີ ${filter.year}`;
      }

      // 3️⃣ ประจำปี
      return `ປະຈຳປີ ${filter.year}`;
    };

    return (
      <div ref={ref} className="print-report">
        <div>
          <div
            style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
            class="report-title"
          >
            ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ
          </div>
          <div
            style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
            class="report-title"
          >
            ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ
          </div>
        </div>

        <div class="report-container">
          <div class="header">
            <div>
              <div
                style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
                class="company-name"
              >
                {user?.companyId?.name || ""}
              </div>
              <div
                style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
                class="company-name-en"
              >
                ທີ່ຢູ່: {user?.companyId?.address || ""}
              </div>
              <div
                style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
                class="company-name-en"
              >
                ເລກປະຈຳຕົວຜູ້ເສຍອາກອນ: 022920-101
              </div>
              <div
                style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
                class="company-name-en"
              >
                ເບີໂທ:{user?.companyId?.phone || ""}
              </div>
            </div>
            <div class="report-period">
              <div
                style={{
                  fontFamily: "Noto Sans Lao, sans-serif",
                  fontSize: "20px",
                  paddingTop: "10px",
                }}
              >
                {name}
              </div>
              <div
                style={{
                  fontFamily: "Noto Sans Lao, sans-serif",
                  paddingTop: "10px",
                  fontSize: "14px",
                }}
              >
                {renderPeriodText()}
              </div>
            </div>
            <div
              style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
              class="currency-info"
            >
              ເລກທີ ......./.......
            </div>
          </div>

          {/* ===== TABLE ===== */}
          <table className="dtable">
            <thead>
              <tr>
                <th
                  style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
                  rowSpan="2"
                >
                  ຊື່ບັນຊີ
                </th>
                <th
                  style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
                  rowSpan="2"
                >
                  ເລກໝາຍບັນຊີ
                </th>
                <th
                  style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
                  colSpan="2"
                >
                  ຍອດຍົກມາເບື້ອງຕົ້ນ
                </th>
                <th
                  style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
                  colSpan="2"
                >
                  ເຄື່ອນໄຫວໃນເດືອນ
                </th>
                <th
                  style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
                  colSpan="2"
                >
                  ຍອດເຫຼືອ
                </th>
              </tr>
              <tr>
                <th style={{ fontFamily: "Noto Sans Lao, sans-serif" }}>ໜີ້</th>
                <th style={{ fontFamily: "Noto Sans Lao, sans-serif" }}>ມີ</th>
                <th style={{ fontFamily: "Noto Sans Lao, sans-serif" }}>ໜີ້</th>
                <th style={{ fontFamily: "Noto Sans Lao, sans-serif" }}>ມີ</th>
                <th style={{ fontFamily: "Noto Sans Lao, sans-serif" }}>ໜີ້</th>
                <th style={{ fontFamily: "Noto Sans Lao, sans-serif" }}>ມີ</th>
              </tr>
            </thead>

            <tbody>
              {renderRows(tree)}

              <tr className="total-row">
                <td
                  style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
                  colSpan="2"
                >
                  ລວມທັງໝົດ
                </td>
                <td className="number">{formatNum(totals.openingDr)}</td>
                <td className="number">{formatNum(totals.openingCr)}</td>
                <td className="number">{formatNum(totals.movementDr)}</td>
                <td className="number">{formatNum(totals.movementCr)}</td>
                <td className="number">{formatNum(totals.endingDr)}</td>
                <td className="number">{formatNum(totals.endingCr)}</td>
              </tr>
            </tbody>
          </table>
          <div
            style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
            className="texts"
          >
            {" "}
            ທີ່.............................., ວັນທີ່...../...../.....
          </div>
          {/* ===== FOOTER ===== */}
          <div className="footer">
            <div className="footer-item">
              <div
                style={{
                  fontFamily: "Noto Sans Lao, sans-serif",
                  fontSize: "14px",
                }}
                className="footer-label"
              >
                ຜູ້ອຳນວຍການ
              </div>
            </div>
            <div className="footer-item">
              <div
                style={{
                  fontFamily: "Noto Sans Lao, sans-serif",
                  fontSize: "14px",
                }}
                className="footer-label"
              >
                ຫົວໜ້າບັນຊີ
              </div>
            </div>
            <div className="footer-item">
              <div
                style={{
                  fontFamily: "Noto Sans Lao, sans-serif",
                  fontSize: "14px",
                }}
                className="footer-label"
              >
                ຜູ້ສະຫຼຸບ
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

export default TrialBalancePrint;
