// utils/depreciation.js

/**
 * คำนวณค่าเสื่อมต่อเดือน (Straight-line, full month)
 */
function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate(); // month = 1-12
}
function daysInYear(year) {
  return new Date(year, 1, 29).getMonth() === 1 ? 366 : 365;
}
export function calcMonthlyDepreciation({
  cost,
  salvageValue = 0,
  usefulLifeYears,
}) {
  if (!cost || !usefulLifeYears) return 0;
  const base = Number(cost);
  const months = usefulLifeYears * 12;

  return Number(base / months);
}

/**
 * สร้าง list เดือนที่ต้องตัดค่าเสื่อม
 * 👉 ตัดเต็มเดือน
 */
export function buildDepreciationSchedule({
  startUseDate,
  usefulLifeYears,
  soldDate = null,
}) {
  const start = new Date(startUseDate);
  const endByLife = new Date(start);
  endByLife.setMonth(endByLife.getMonth() + usefulLifeYears * 12 - 1);

  const end =
    soldDate && new Date(soldDate) < endByLife ? new Date(soldDate) : endByLife;

  const months = [];
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);

  const endCursor = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cursor <= endCursor) {
    months.push({
      year: cursor.getFullYear(),
      month: cursor.getMonth() + 1,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}
/////ຕັດຕາມວັນ
export function buildDepreciationScheduleV2({
  startUseDate,
  usefulLifeYears,
  soldDate = null,
}) {
  const start = new Date(startUseDate);

  const endByLife = new Date(start);
  endByLife.setMonth(endByLife.getMonth() + usefulLifeYears * 12);
  const end =
    soldDate && new Date(soldDate) < endByLife ? new Date(soldDate) : endByLife;

  const result = [];

  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const endCursor = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= endCursor) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth() + 1;
    const dim = daysInMonth(year, month);

    let usedDays = dim;
    let type = "full";

    // เดือนแรก
    if (year === start.getFullYear() && month === start.getMonth() + 1) {
      usedDays = dim - start.getDate() + 1;
      type = "first";
    }

    // เดือนสุดท้าย
    if (year === end.getFullYear() && month === end.getMonth() + 1) {
      usedDays = end.getDate();
      type = type === "first" ? "first_and_last" : "last";
    }

    result.push({
      year,
      start,
      month,
      daysInMonth: dim,
      usedDays,
      factor: usedDays / dim, // 🔑 ใช้คูณค่าเสื่อม
      type,
    });

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return result;
}

//////post
function daysBetween(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  return Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1;
}

function calcDailyDepreciation({
  cost,
  salvageValue,
  usefulLifeYears,
  year,
  month, // 1–12
  usedDays,
}) {
  const depreciableBase = cost;
  const annualDepreciation = depreciableBase / usefulLifeYears;
  const dim = daysInMonth(year, month);
  const diy = daysInYear(year);
  const effectiveDays = usedDays ?? dim;
  return (annualDepreciation / 12 / dim) * effectiveDays;
}

function getMonthStart(year, month) {
  return new Date(year, month - 1, 1);
}

function getMonthEnd(year, month) {
  return new Date(year, month, 0);
}

export function isAfter(y1, m1, y2, m2) {
  return y1 > y2 || (y1 === y2 && m1 > m2);
}
//ຄຳນວນວັນໝົດອາຍຸຂອງຊັບສິນ
function getEndOfUsefulLife(startUseDate, usefulLifeYears) {
  const end = new Date(startUseDate);
  end.setFullYear(end.getFullYear() + usefulLifeYears);
  end.setDate(end.getDate() - 1); // วันสุดท้ายที่ยังตัดได้
  return end;
}

export function calcMonthlyDepreciationDaily({
  asset,
  year,
  month,
  soldDate = null,
}) {
  const monthStart = getMonthStart(year, month);
  const monthEnd = getMonthEnd(year, month);

  const endOfUsefulLife = getEndOfUsefulLife(
    asset.startUseDate,
    asset.usefulLife
  );

  const startDate = new Date(
    Math.max(asset.startUseDate.getTime(), monthStart.getTime())
  );

  const finalEndLimit = soldDate
    ? Math.min(soldDate.getTime(), endOfUsefulLife.getTime())
    : endOfUsefulLife.getTime();

  const endDate = new Date(Math.min(finalEndLimit, monthEnd.getTime()));

  if (startDate > endDate) return 0;
  const usedDays = daysBetween(startDate, endDate);
  const dailyDep = calcDailyDepreciation({
    cost: asset.cost,
    salvageValue: asset.salvageValue,
    usefulLifeYears: asset.usefulLife,
    year,
    month, // 1–12
    usedDays,
  });
  return dailyDep;
}
