export function formatDateInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(Boolean).join("-");
}

export function isValidDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1000 || month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(year, month, 0).getDate();
}
