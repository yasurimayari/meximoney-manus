export type CreditScoreRange = {
  key: "red" | "orange" | "yellow" | "green" | "unclassified";
  label: string;
  title: string;
  description: string;
  className: string;
  badgeClassName: string;
  solidColor: string;
};

export const creditScoreSourceUrl = "https://www.burodecredito.com.mx/generales/blog/todo-sobre-bur%C3%B3/tu-mi-score-de-riesgo-crediticio-ha-cambiado-como-quedo-tu-puntuacion.html";

export const creditScoreRanges: Array<CreditScoreRange & { min: number; max: number }> = [
  { key: "red", min: 356, max: 577, label: "356–577", title: "Riesgo alto", description: "Mi Score más bajo", className: "border-rose-200 bg-rose-50 text-rose-950", badgeClassName: "border-rose-200 bg-rose-100 text-rose-950", solidColor: "#e11d48" },
  { key: "orange", min: 587, max: 659, label: "587–659", title: "Regular", description: "Rango regular", className: "border-orange-200 bg-orange-50 text-orange-950", badgeClassName: "border-orange-200 bg-orange-100 text-orange-950", solidColor: "#ea580c" },
  { key: "yellow", min: 660, max: 696, label: "660–696", title: "Bueno", description: "Rango bueno", className: "border-amber-300 bg-amber-50 text-amber-950", badgeClassName: "border-amber-300 bg-amber-100 text-amber-950", solidColor: "#ca8a04" },
  { key: "green", min: 697, max: 848, label: "697–848", title: "Excelente", description: "Menor riesgo", className: "border-emerald-200 bg-emerald-50 text-emerald-950", badgeClassName: "border-emerald-200 bg-emerald-100 text-emerald-950", solidColor: "#059669" },
];

export function creditScoreRange(score: number | null | undefined): CreditScoreRange {
  const range = typeof score === "number" ? creditScoreRanges.find(item => score >= item.min && score <= item.max) : undefined;
  return range ?? { key: "unclassified", label: "Sin clasificación publicada", title: "Sin rango publicado", description: "Valor fuera de los intervalos publicados", className: "border-muted bg-muted/50 text-muted-foreground", badgeClassName: "border-muted bg-muted text-muted-foreground", solidColor: "#64748b" };
}
