const salesTimeZone = "Asia/Tashkent";
const openMinutes = 9 * 60;
const closeMinutes = 19 * 60;
const salesDays = new Set(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);

export function isWithinSalesHours(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: salesTimeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);

  if (!weekday || Number.isNaN(hour) || Number.isNaN(minute)) return false;
  if (!salesDays.has(weekday)) return false;

  const currentMinutes = hour * 60 + minute;
  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}
