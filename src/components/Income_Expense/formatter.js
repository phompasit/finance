export function formatDate(dateString) {
  const d = new Date(dateString);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function shortDesc(str, length = 7) {
  if (!str) return "-";
  return str.length > length ? str.slice(0, length) + "..." : str;
}
