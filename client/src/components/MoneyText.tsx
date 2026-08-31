import { amountToneClass } from "@/lib/amountTone";
import { formatMoney } from "@/lib/finance";

type Props = { cents: number | null | undefined; currency: string; className?: string; signed?: boolean };

export function MoneyText({ cents, currency, className = "", signed = false }: Props) {
  const value = Number(cents ?? 0);
  const sign = signed && value > 0 ? "+" : "";
  return <span className={`tabular-nums ${amountToneClass(value)} ${className}`}>{sign}{formatMoney(value, currency)}</span>;
}
