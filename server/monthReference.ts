export function mexicoCityReferenceMonth(rawDate?: string | null, fallback = new Date()) {
  const match = rawDate?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, yearRaw, monthRaw, dayRaw] = match;
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const day = Number(dayRaw);
    if (year >= 2020 && year <= 2040 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month - 1, day, 12));
    }
  }
  return fallback;
}
