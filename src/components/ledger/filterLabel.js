// utils/filterLabel.js  (หรือใส่ใน constants ที่ใช้ร่วมกัน)

const formatDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return [
    String(date.getDate()).padStart(2, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    date.getFullYear(),
  ].join("/");
};

export const getFilterLabel = (filter) => {
  if (!filter) return "";
  switch (filter.mode) {
    case "YEAR":
      return `ປີບັນຊີ: ${filter.year}`;
    case "MONTH":
      return `ເດືອນ: ${String(filter.month).padStart(2, "0")}/${filter.year}`;
    case "RANGE":
      return `ຊ່ວງວັນທີ: ${formatDate(filter.startDate)} – ${formatDate(filter.endDate)}`;
    case "PRESET":
      return `Preset: ${filter.preset}`;
    default:
      return "";
  }
};