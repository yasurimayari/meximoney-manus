export type PatrimonyDistributionEntry = {
  key: string;
  label: string;
  kind: "asset" | "liability";
  valueCents: number;
  color: string;
};

export type PatrimonyDistribution = {
  entries: PatrimonyDistributionEntry[];
  assetTotalCents: number;
  liabilityTotalCents: number;
};

type DistributionInput = {
  accounts: Array<{ currentBalanceCents: number }>;
  investments: Array<{ valueCents: number }>;
  debts: Array<{ balanceCents: number }>;
  creditCards: Array<{ balanceCents: number }>;
};

const colors = {
  accounts: "#0f766e",
  investments: "#2563eb",
  overdrafts: "#be123c",
  debts: "#c2410c",
  creditCards: "#9333ea",
} as const;

export function buildPatrimonyDistribution(input: DistributionInput): PatrimonyDistribution {
  const entries: PatrimonyDistributionEntry[] = [];
  let assetTotalCents = 0;
  let liabilityTotalCents = 0;

  const addAsset = (key: string, label: string, valueCents: number, color: string) => {
    if (valueCents > 0) {
      entries.push({ key, label, kind: "asset", valueCents, color });
      assetTotalCents += valueCents;
    } else if (valueCents < 0) {
      const overdraftCents = Math.abs(valueCents);
      entries.push({ key: `${key}-negative`, label: `${label} en negativo`, kind: "liability", valueCents: overdraftCents, color: colors.overdrafts });
      liabilityTotalCents += overdraftCents;
    }
  };

  const accountPositiveCents = input.accounts.reduce((sum, item) => sum + Math.max(0, item.currentBalanceCents), 0);
  const accountNegativeCents = input.accounts.reduce((sum, item) => sum + Math.max(0, -item.currentBalanceCents), 0);
  addAsset("accounts", "Cuentas y efectivo", accountPositiveCents, colors.accounts);
  if (accountNegativeCents > 0) {
    entries.push({ key: "accounts-negative", label: "Cuentas y efectivo en negativo", kind: "liability", valueCents: accountNegativeCents, color: colors.overdrafts });
    liabilityTotalCents += accountNegativeCents;
  }

  const investmentPositiveCents = input.investments.reduce((sum, item) => sum + Math.max(0, item.valueCents), 0);
  const investmentNegativeCents = input.investments.reduce((sum, item) => sum + Math.max(0, -item.valueCents), 0);
  addAsset("investments", "Ahorro e inversiones", investmentPositiveCents, colors.investments);
  if (investmentNegativeCents > 0) {
    entries.push({ key: "investments-negative", label: "Ahorro e inversiones en negativo", kind: "liability", valueCents: investmentNegativeCents, color: colors.overdrafts });
    liabilityTotalCents += investmentNegativeCents;
  }

  const debtsCents = input.debts.reduce((sum, item) => sum + Math.max(0, item.balanceCents), 0);
  if (debtsCents > 0) {
    entries.push({ key: "debts", label: "Deudas y préstamos", kind: "liability", valueCents: debtsCents, color: colors.debts });
    liabilityTotalCents += debtsCents;
  }

  const creditCardsCents = input.creditCards.reduce((sum, item) => sum + Math.max(0, item.balanceCents), 0);
  if (creditCardsCents > 0) {
    entries.push({ key: "credit-cards", label: "Tarjetas", kind: "liability", valueCents: creditCardsCents, color: colors.creditCards });
    liabilityTotalCents += creditCardsCents;
  }

  return { entries, assetTotalCents, liabilityTotalCents };
}
