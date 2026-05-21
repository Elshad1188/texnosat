// Unified locale-aware date/time formatting.
// Reads current app language from localStorage so it works in non-React code too.

export const getLocale = (): string => {
  try {
    const lang = localStorage.getItem("app_language");
    return lang === "ru" ? "ru-RU" : "az-AZ";
  } catch {
    return "az-AZ";
  }
};

type Input = string | number | Date | null | undefined;

const toDate = (d: Input): Date | null => {
  if (d === null || d === undefined || d === "") return null;
  const dt = d instanceof Date ? d : new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
};

export const formatDate = (d: Input, opts?: Intl.DateTimeFormatOptions): string => {
  const dt = toDate(d);
  return dt ? dt.toLocaleDateString(getLocale(), opts) : "";
};

export const formatTime = (d: Input, opts?: Intl.DateTimeFormatOptions): string => {
  const dt = toDate(d);
  return dt ? dt.toLocaleTimeString(getLocale(), opts ?? { hour: "2-digit", minute: "2-digit" }) : "";
};

export const formatDateTime = (d: Input, opts?: Intl.DateTimeFormatOptions): string => {
  const dt = toDate(d);
  return dt ? dt.toLocaleString(getLocale(), opts) : "";
};

// Relative time ("2 dəq əvvəl" / "2 мин назад") with az/ru fallback
export const formatRelative = (d: Input): string => {
  const dt = toDate(d);
  if (!dt) return "";
  const lang = localStorage.getItem("app_language") === "ru" ? "ru" : "az";
  const diff = Math.floor((Date.now() - dt.getTime()) / 1000);
  const r = (n: number, u: { az: string; ru: string }) =>
    lang === "ru" ? `${n} ${u.ru} назад` : `${n} ${u.az} əvvəl`;
  if (diff < 60) return lang === "ru" ? "только что" : "indicə";
  if (diff < 3600) return r(Math.floor(diff / 60), { az: "dəq", ru: "мин" });
  if (diff < 86400) return r(Math.floor(diff / 3600), { az: "saat", ru: "ч" });
  if (diff < 604800) return r(Math.floor(diff / 86400), { az: "gün", ru: "дн" });
  return formatDate(dt);
};
