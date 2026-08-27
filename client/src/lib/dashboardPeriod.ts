export function mexicoCityReferenceDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const readPart = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? "";
  return `${readPart("year")}-${readPart("month")}-${readPart("day")}`;
}

export const dashboardPeriodQuery = { referenceDate: mexicoCityReferenceDate() };
