export type PatrimonyAccountInput = {
  currentBalanceCents: number;
  currency: string;
  status: "active" | "closed";
};

export type PatrimonyInvestmentInput = {
  valueCents: number;
  currency: string;
  includeInNetWorth: boolean;
  status: "active" | "paused" | "closed";
};

export type PatrimonyDebtInput = {
  balanceCents: number;
  currency: string;
  status: "active" | "paid" | "review";
};

export type PatrimonyCardInput = {
  balanceCents: number;
  currency: string;
  status: "active" | "paused" | "closed";
};

export type PatrimonySummary = {
  assetCents: number;
  liabilityCents: number;
  netWorthCents: number;
};

export function calculatePatrimonySummary(input: {
  currency: string;
  accounts: PatrimonyAccountInput[];
  investments: PatrimonyInvestmentInput[];
  debts: PatrimonyDebtInput[];
  creditCards: PatrimonyCardInput[];
}): PatrimonySummary {
  const currency = input.currency.toUpperCase();
  const assetCents = input.accounts
    .filter(item => item.status === "active" && item.currency.toUpperCase() === currency)
    .reduce((sum, item) => sum + item.currentBalanceCents, 0)
    + input.investments
      .filter(item => item.includeInNetWorth && item.status !== "closed" && item.currency.toUpperCase() === currency)
      .reduce((sum, item) => sum + item.valueCents, 0);
  const liabilityCents = input.debts
    .filter(item => (item.status === "active" || item.status === "review") && item.currency.toUpperCase() === currency)
    .reduce((sum, item) => sum + Math.max(0, item.balanceCents), 0)
    + input.creditCards
      .filter(item => item.status !== "closed" && item.currency.toUpperCase() === currency)
      .reduce((sum, item) => sum + Math.max(0, item.balanceCents), 0);
  return { assetCents, liabilityCents, netWorthCents: assetCents - liabilityCents };
}
