const DAY_MS = 24 * 60 * 60 * 1000;

export type MoratoriumInput = {
  balanceCents: number;
  annualRateBps: number | null | undefined;
  overdueSinceAt: Date | string | number | null | undefined;
  asOf?: Date | string | number;
  basisCents?: number | null;
};

export type MoratoriumResult = {
  daysLate: number;
  baseCents: number;
  annualRateBps: number;
  interestCents: number;
  formula: string;
  isConfigured: boolean;
};

function toTimestamp(value: Date | string | number | null | undefined) {
  if (value == null) return null;
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function calculateDaysLate(overdueSinceAt: Date | string | number | null | undefined, asOf: Date | string | number = Date.now()) {
  const start = toTimestamp(overdueSinceAt);
  const end = toTimestamp(asOf);
  if (start === null || end === null || end <= start) return 0;
  return Math.max(0, Math.floor((end - start) / DAY_MS));
}

/**
 * Simple-interest estimate using a 365-day convention:
 * base × (annual rate / 10,000) × (days late / 365).
 * This is an estimate for review and does not replace the creditor statement.
 */
export function calculateMoratoriumInterest(input: MoratoriumInput): MoratoriumResult {
  const baseCents = Math.max(0, Math.round(input.basisCents ?? input.balanceCents));
  const annualRateBps = Math.max(0, Math.round(input.annualRateBps ?? 0));
  const daysLate = calculateDaysLate(input.overdueSinceAt, input.asOf ?? Date.now());
  const interestCents = Math.max(0, Math.round((baseCents * annualRateBps * daysLate) / (10_000 * 365)));
  return {
    daysLate,
    baseCents,
    annualRateBps,
    interestCents,
    formula: `${baseCents} × (${annualRateBps} / 10,000) × (${daysLate} / 365)`,
    isConfigured: baseCents > 0 && annualRateBps > 0 && daysLate > 0,
  };
}
