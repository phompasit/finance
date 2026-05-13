import React, { forwardRef } from "react";
import "./trialBalancePrint.css";

const formatNum = (n) =>
  n !== undefined && n !== null && n !== 0 ? Number(n).toLocaleString() : "-";

const TrialBalancePrint = forwardRef(
  ({ tree = [], totals = {}, filter, user, name }, ref) => {
    const renderRows = (nodes, level = 0) =>
      nodes.map((acc) => {
        const isParent = level === 0;

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
                {acc.name}
              </td>

              <td
                style={{ fontSize:"12px", fontFamily: "Noto Sans Lao, sans-serif" }}
                className="account-code"
              >
                {acc.code}
              </td>

              <td style={{ fontFamily: "Noto Sans Lao, sans-serif" }} className="number">
                {formatNum(acc.openingDr)}
              </td>
              <td style={{ fontFamily: "Noto Sans Lao, sans-serif" }} className="number">
                {formatNum(acc.openingCr)}
              </td>
              <td style={{ fontFamily: "Noto Sans Lao, sans-serif" }} className="number">
                {formatNum(acc.movementDr)}
              </td>
              <td style={{ fontFamily: "Noto Sans Lao, sans-serif" }} className="number">
                {formatNum(acc.movementCr)}
              </td>
              <td style={{ fontFamily: "Noto Sans Lao, sans-serif" }} className="number">
                {formatNum(acc.endingDr)}
              </td>
              <td style={{ fontFamily: "Noto Sans Lao, sans-serif" }} className="number">
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
      if (filter?.startDate && filter?.endDate) {
        return `ຊ່ວງວັນທີ ${formatDate(filter.startDate)} ຫາ ${formatDate(filter.endDate)}`;
      }
      if (filter?.month) {
        return `ປະຈຳເດືອນ ${filter.month} ປີ ${filter.year}`;
      }
      return `ປະຈຳປີ ${filter?.year || ""}`;
    };

    return (
      <div ref={ref} className="print-report">
        {/* ===== TOP TITLE ===== */}
        <div style={{ fontFamily: "Noto Sans Lao, sans-serif" }} className="report-title">
          ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ
        </div>
        <div style={{ fontFamily: "Noto Sans Lao, sans-serif" }} className="report-title">
          ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ
        </div>

        <div className="report-container">
          {/* ===== HEADER ===== */}
          <div className="header">
            {/* Left: Company Info */}
            <div className="header-left">
              <div style={{ fontFamily: "Noto Sans Lao, sans-serif" }} className="company-name">
                {user?.companyId?.name || ""}
              </div>
              <div style={{ fontFamily: "Noto Sans Lao, sans-serif" }} className="company-name-en">
                ທີ່ຢູ່: {user?.companyId?.address || ""}
              </div>
              <div style={{ fontFamily: "Noto Sans Lao, sans-serif" }} className="company-name-en">
                ເລກປະຈຳຕົວຜູ້ເສຍອາກອນ: {user?.companyId?.taxId || ""}
              </div>
              <div style={{ fontFamily: "Noto Sans Lao, sans-serif" }} className="company-name-en">
                ເບີໂທ: {user?.companyId?.phone || ""}
              </div>
            </div>

            {/* Center: Report Title & Period */}
            <div className="header-center">
              <div
                style={{ fontFamily: "Noto Sans Lao, sans-serif", fontSize: "20px", paddingTop: "10px" }}
              >
                {name}
              </div>
              <div
                style={{ fontFamily: "Noto Sans Lao, sans-serif", paddingTop: "10px", fontSize: "14px" }}
              >
                {renderPeriodText()}
              </div>
            </div>

            {/* Right: Doc Number */}
            <div className="header-right">
              <div style={{ fontFamily: "Noto Sans Lao, sans-serif" }} className="currency-info">
                ເລກທີ ......./.......
              </div>
            </div>
          </div>

          {/* ===== TABLE ===== */}
          <table className="dtable">
            <thead>
              <tr>
                <th style={{ fontSize: "10px", fontFamily: "Noto Sans Lao, sans-serif" }} rowSpan="2">
                  ຊື່ບັນຊີ
                </th>
                <th style={{ fontSize: "10px", fontFamily: "Noto Sans Lao, sans-serif" }} rowSpan="2">
                  ເລກໝາຍບັນຊີ
                </th>
                <th style={{ fontSize: "10px  ", fontFamily: "Noto Sans Lao, sans-serif" }} colSpan="2">
                  ຍອດຍົກມາເບື້ອງຕົ້ນ
                </th>
                <th style={{ fontSize: "10px", fontFamily: "Noto Sans Lao, sans-serif" }} colSpan="2">
                  ເຄື່ອນໄຫວໃນເດືອນ
                </th>
                <th style={{ fontSize: "10px", fontFamily: "Noto Sans Lao, sans-serif" }} colSpan="2">
                  ຍອດເຫຼືອ
                </th>
              </tr>
              <tr>
                <th style={{ fontSize: "10px", fontFamily: "Noto Sans Lao, sans-serif" }}>ໜີ້</th>
                <th style={{ fontSize: "10px", fontFamily: "Noto Sans Lao, sans-serif" }}>ມີ</th>
                <th style={{ fontSize: "10px", fontFamily: "Noto Sans Lao, sans-serif" }}>ໜີ້</th>
                <th style={{ fontSize: "10px", fontFamily: "Noto Sans Lao, sans-serif" }}>ມີ</th>
                <th style={{ fontSize: "10px", fontFamily: "Noto Sans Lao, sans-serif" }}>ໜີ້</th>
                <th style={{ fontSize: "10px", fontFamily: "Noto Sans Lao, sans-serif" }}>ມີ</th>
              </tr>
            </thead>

            <tbody>
              {renderRows(tree)}

              <tr className="total-row">
                <td
                  style={{ fontSize: "13px", fontFamily: "Noto Sans Lao, sans-serif" }}
                  colSpan="2"
                >
                  ລວມທັງໝົດ
                </td>
                <td style={{ fontSize: "11px", fontFamily: "Noto Sans Lao, sans-serif" }} className="number">
                  {formatNum(totals.openingDr)}
                </td>
                <td style={{ fontSize: "11px", fontFamily: "Noto Sans Lao, sans-serif" }} className="number">
                  {formatNum(totals.openingCr)}
                </td>
                <td style={{ fontSize: "11px", fontFamily: "Noto Sans Lao, sans-serif" }} className="number">
                  {formatNum(totals.movementDr)}
                </td>
                <td style={{ fontSize: "11px", fontFamily: "Noto Sans Lao, sans-serif" }} className="number">
                  {formatNum(totals.movementCr)}
                </td>
                <td style={{ fontSize: "11px", fontFamily: "Noto Sans Lao, sans-serif" }} className="number">
                  {formatNum(totals.endingDr)}
                </td>
                <td style={{ fontSize: "11px", fontFamily: "Noto Sans Lao, sans-serif" }} className="number">
                  {formatNum(totals.endingCr)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* ===== DATE ===== */}
          <div style={{ fontFamily: "Noto Sans Lao, sans-serif" }} className="texts">
            <div style={{ fontSize: "12px", fontFamily: "Noto Sans Lao, sans-serif" }}>
              ສະຖານທີ່: .....................................
            </div>
            <div style={{ fontSize: "12px", fontFamily: "Noto Sans Lao, sans-serif" }}>
              ວັນທີ: {formatDate(new Date())}
            </div>
          </div>

          {/* ===== FOOTER ===== */}
          <div className="footer">
            <div className="footer-item">
              <div
                style={{ fontFamily: "Noto Sans Lao, sans-serif", fontSize: "14px" }}
                className="footer-label"
              >
                ຜູ້ອຳນວຍການ
              </div>
            </div>
            <div className="footer-item">
              <div
                style={{ fontFamily: "Noto Sans Lao, sans-serif", fontSize: "14px" }}
                className="footer-label"
              >
                ຫົວໜ້າບັນຊີ
              </div>
            </div>
            <div className="footer-item">
              <div
                style={{ fontFamily: "Noto Sans Lao, sans-serif", fontSize: "14px" }}
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