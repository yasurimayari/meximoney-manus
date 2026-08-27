export type CreditScoreRange = {
  key: "red" | "orange" | "yellow" | "green" | "unclassified";
  label: string;
  className: string;
};

const ranges: Array<CreditScoreRange & { min: number; max: number }> = [
  { key: "red", min: 356, max: 577, label: "356–577", className: "border-rose-200 bg-rose-50 text-rose-900" },
  { key: "orange", min: 587, max: 659, label: "587–659", className: "border-orange-200 bg-orange-50 text-orange-900" },
  { key: "yellow", min: 660, max: 696, label: "660–696", className: "border-amber-200 bg-amber-50 text-amber-900" },
  { key: "green", min: 697, max: 848, label: "697–848", className: "border-emerald-200 bg-emerald-50 text-emerald-900" },
];

export function creditScoreRange(score: number | null | undefined): CreditScoreRange {
  const range = typeof score === "number" ? ranges.find(item => score >= item.min && score <= item.max) : undefined;
  return range ?? { key: "unclassified", label: "Sin clasificación publicada", className: "border-muted bg-muted/50 text-muted-foreground" };
}
