type InvestmentAsset = { id: number; name?: string | null; institution?: string | null; type?: string | null };
type FinancedAsset = { investmentId?: number | null; debt?: { name?: string | null; balanceCents?: number | null; nextDueAt?: Date | string | null } | null; };

export type InvestmentAssetFilterOptions = {
  type: string;
  query: string;
  situation: string;
  sort: string;
  now?: number;
};

function linkedDebtFor(asset: InvestmentAsset, financedAssets: FinancedAsset[]) {
  return financedAssets.find(entry => entry.investmentId === asset.id)?.debt ?? null;
}

export function filterAndSortInvestmentAssets<T extends InvestmentAsset>(assets: T[], financedAssets: FinancedAsset[], options: InvestmentAssetFilterOptions) {
  const query = options.query.trim().toLocaleLowerCase("es-MX");
  const now = options.now ?? Date.now();
  const filtered = assets.filter(asset => {
    const debt = linkedDebtFor(asset, financedAssets);
    const isOverdue = Boolean(debt?.nextDueAt && new Date(debt.nextDueAt).getTime() < now && (debt.balanceCents ?? 0) > 0);
    const matchesType = options.type === "all" || asset.type === options.type;
    const matchesSituation = options.situation === "all"
      || (options.situation === "overdue" && isOverdue)
      || (options.situation === "with_debt" && Boolean(debt && (debt.balanceCents ?? 0) > 0))
      || (options.situation === "without_debt" && !debt);
    const searchable = `${asset.name ?? ""} ${asset.institution ?? ""} ${debt?.name ?? ""}`.toLocaleLowerCase("es-MX");
    return matchesType && matchesSituation && (!query || searchable.includes(query));
  });

  return [...filtered].sort((a, b) => {
    const debtA = linkedDebtFor(a, financedAssets);
    const debtB = linkedDebtFor(b, financedAssets);
    if (options.sort === "balance_desc" || options.sort === "balance_asc") {
      const difference = (debtA?.balanceCents ?? 0) - (debtB?.balanceCents ?? 0);
      return options.sort === "balance_desc" ? -difference : difference;
    }
    if (options.sort === "next_due") {
      const dueA = debtA?.nextDueAt ? new Date(debtA.nextDueAt).getTime() : Number.POSITIVE_INFINITY;
      const dueB = debtB?.nextDueAt ? new Date(debtB.nextDueAt).getTime() : Number.POSITIVE_INFINITY;
      return dueA - dueB;
    }
    return String(a.name ?? "").localeCompare(String(b.name ?? ""), "es-MX");
  });
}
