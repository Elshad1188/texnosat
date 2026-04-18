export const slugify = (text: string): string => {
  const map: Record<string, string> = {
    ə: "e", ı: "i", ö: "o", ü: "u", ş: "s", ç: "c", ğ: "g",
    Ə: "e", I: "i", İ: "i", Ö: "o", Ü: "u", Ş: "s", Ç: "c", Ğ: "g",
  };
  return text
    .split("")
    .map((c) => map[c] || c)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
};

export const estimateReadingMinutes = (html: string): number => {
  const text = html.replace(/<[^>]+>/g, " ").trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
};

export const stripHtml = (html: string, maxLen = 160): string => {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > maxLen ? text.slice(0, maxLen).trimEnd() + "…" : text;
};
