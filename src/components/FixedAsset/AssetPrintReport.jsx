import React, { forwardRef, useMemo } from "react";
import "./assetPrint.css";

/* =========================
   ✅ Helpers
========================= */
const formatNum = (n) =>
  n !== undefined && n !== null ? Number(n).toLocaleString() : "-";

const formatDate = (d) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-GB");
};

/* =========================
   ✅ Component
========================= */
const AssetPrintReport = forwardRef(
  (
    {
      assets = [],
      depreciationBeforeYearAmount = 0,
      depreciationThisYearAmount = 0,
      company,
      activeFilterLabel,
    },
    ref
  ) => {
    /* =========================
       ✅ Totals Calculation
    ========================= */
    const totals = useMemo(() => {
      let totalOriginal = 0;
      let totalCost = 0;

      assets.forEach((a) => {
        totalOriginal += a.original || 0;
        totalCost += a.cost || 0;
      });

      const totalBeforeYear = depreciationBeforeYearAmount;
      const totalThisYear = depreciationThisYearAmount;
      const totalAccumulated = totalBeforeYear + totalThisYear;
      const totalNetBookValue = totalCost - totalAccumulated;

      return {
        totalOriginal,
        totalCost,
        totalBeforeYear,
        totalThisYear,
        totalAccumulated,
        totalNetBookValue,
      };
    }, [assets, depreciationBeforeYearAmount, depreciationThisYearAmount]);

    return (
      <div ref={ref} className="print-report lao-font">
        {/* ===== HEADER ===== */}
        <div
          style={{ fontFamily: "Noto Sans Lao, sans-serif",fontWeight:"800" }}
          className="report-title"
        >
          ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ
        </div>

        <div
          style={{ fontFamily: "Noto Sans Lao, sans-serif",fontWeight:"800" }}
          className="report-subtitle"
        >
          ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ
        </div>

        {/* ===== COMPANY HEADER ===== */}
        <div className="header">
          {/* Left */}
          <div>
            <div
              style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
              className="company-name"
            >
              {company?.name}
            </div>

            <div
              style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
              className="company-info"
            >
              ທີ່ຢູ່: {company?.address}
            </div>

            <div
              style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
              className="company-info"
            >
              ເບີໂທ: {company?.phone}
            </div>
          </div>

          {/* Center */}
          <div className="report-period">
            <div
              style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
              className="report-name"
            >
              ລາຍງານຊັບສິນ
            </div>

            <div
              style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
              className="report-date"
            >
              {activeFilterLabel}
            </div>
          </div>

          {/* Right */}
          <div
            style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
            className="report-no"
          >
            ເລກທີ .........../...........
          </div>
        </div>

        {/* ===== TABLE ===== */}
        <table className="dtable">
          <thead>
            <tr>
              <th>#</th>

              <th style={{ fontFamily: "Noto Sans Lao, sans-serif" }}>
                ລະຫັດ
              </th>

              <th style={{ fontFamily: "Noto Sans Lao, sans-serif" }}>
                ຊື່ຊັບສິນ
              </th>

              <th  style={{ fontFamily: "Noto Sans Lao, sans-serif" }} className="number">ຕົ້ນທຶນເດິມ</th>
              <th  style={{ fontFamily: "Noto Sans Lao, sans-serif" }} className="number">ອັດຕາແລກປ່ຽນ</th>
              <th  style={{ fontFamily: "Noto Sans Lao, sans-serif" }} className="number">ສະກຸນເງິນ</th>
              <th  style={{ fontFamily: "Noto Sans Lao, sans-serif" }} className="number">ຕົ້ນທຶນຊື້</th>

              <th style={{ fontFamily: "Noto Sans Lao, sans-serif" }}>
                ອາຍຸນຳໃຊ້ (ປີ)
              </th>

              <th style={{ fontFamily: "Noto Sans Lao, sans-serif" }}>
                ວັນເລີ່ມໃຊ້
              </th>

              <th  style={{ fontFamily: "Noto Sans Lao, sans-serif" }} className="number">ຄ່າຫຼຸ້ຍຫ້ຽນສະສົມຜ່ານມາ</th>
              <th   style={{ fontFamily: "Noto Sans Lao, sans-serif" }} className="number">ຄ່າຫຼຸ້ຍຫ້ຽນປີນີ້</th>
              <th  style={{ fontFamily: "Noto Sans Lao, sans-serif" , width: "250px",}} className="number">ຄ່າຫຼຸ້ຍຫ້ຽນສະສົມທັງໝົດ</th>
              <th  style={{ fontFamily: "Noto Sans Lao, sans-serif" }} className="number">ມູນຄ່າຍັງເຫຼືອ</th>
            </tr>
          </thead>

          <tbody>
            {assets.map((a, i) => {
              const cost = a.cost || 0;

              const beforeYear = a.depreciationBeforeYear || 0;
              const thisYear = a.depreciationThisYear || 0;
              const accumulated = beforeYear + thisYear;

              const nbv = cost - accumulated;

              return (
                <tr key={a._id}>
                  <td>{i + 1}</td>
                  <td>{a.assetCode}</td>

                  <td style={{ fontFamily: "Noto Sans Lao, sans-serif" }}>
                    {a.name}
                  </td>

                  <td className="number">{formatNum(a.original)}</td>
                  <td className="number">{formatNum(a.exchangeRate)}</td>
                  <td className="number">{a.currency}</td>
                  <td className="number">{formatNum(a.cost)}</td>

                  <td style={{ fontFamily: "Noto Sans Lao, sans-serif" }}>
                    {a.usefulLife ?? "-"}
                  </td>

                  <td>{formatDate(a.startUseDate)}</td>

                  <td className="number">{formatNum(beforeYear)}</td>
                  <td className="number">{formatNum(thisYear)}</td>
                  <td className="number">{formatNum(accumulated)}</td>
                  <td className="number">{formatNum(nbv)}</td>
                </tr>
              );
            })}

            {/* ===== TOTAL ROW ===== */}
            <tr className="total-row">
              <td
                style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
                colSpan="3"
              >
                ລວມທັງໝົດ
              </td>

              {/* Original */}
              <td className="number">{formatNum(totals.totalOriginal)}</td>

              {/* Exchange Rate */}
              <td></td>

              {/* Currency */}
              <td></td>

              {/* Cost */}
              <td className="number">{formatNum(totals.totalCost)}</td>

              {/* UsefulLife + StartDate */}
              <td colSpan="2"></td>

              {/* Depreciation */}
              <td className="number">{formatNum(totals.totalBeforeYear)}</td>
              <td className="number">{formatNum(totals.totalThisYear)}</td>
              <td className="number">{formatNum(totals.totalAccumulated)}</td>

              {/* NBV */}
              <td className="number">{formatNum(totals.totalNetBookValue)}</td>
            </tr>
          </tbody>
        </table>

        {/* ===== SIGNATURE ===== */}
        <div
          style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
          className="texts"
        >
          ທີ່.............................., ວັນທີ່...../...../.....
        </div>

        <div className="footer">
          <div
            style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
            className="footer-item"
          >
            ຜູ້ອຳນວຍການ
          </div>
          <div
            style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
            className="footer-item"
          >
            ຫົວໜ້າບັນຊີ
          </div>
          <div
            style={{ fontFamily: "Noto Sans Lao, sans-serif" }}
            className="footer-item"
          >
            ຜູ້ສະຫຼຸບ
          </div>
        </div>
      </div>
    );
  }
);

export default AssetPrintReport;
