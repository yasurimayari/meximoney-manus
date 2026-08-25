export function formatMoney(cents: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatDate(value?: Date | string | null, options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" }) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-MX", options).format(new Date(value));
}

export function monthStartTimestamp(reference = new Date()) {
  return new Date(reference.getFullYear(), reference.getMonth(), 1).getTime();
}

export function toCents(value: string | number) {
  const normalized = typeof value === "number" ? value : Number(value.replace(",", "."));
  return Number.isFinite(normalized) ? Math.round(normalized * 100) : 0;
}

export function fromCents(cents: number) {
  return (cents / 100).toFixed(2);
}

export const scopeLabel: Record<string, string> = {
  personal: "Personal",
  pfae: "PFAE",
  business: "Empresarial",
  mixed: "Mixto",
} as const;

export const priorityLabel: Record<string, string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Media",
  low: "Baja",
} as const;
