export type RecordSearchKind = "all" | "transaction" | "investment" | "statement" | "document";

export type RecordSearchResult = {
  id: number;
  key: string;
  kind: Exclude<RecordSearchKind, "all">;
  title: string;
  detail: string;
  date: Date | string | null;
  amountCents?: number | null;
  currency?: string | null;
  transactionType?: string;

  href: string;
};

type SearchOptions = { query?: string; kind?: RecordSearchKind; month?: string };

const normalize = (value: unknown) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("es-MX");

const dateValue = (value: Date | string | null | undefined) => value ? new Date(value) : null;
const periodText = (value: Date | string | null | undefined) => {
  const date = dateValue(value);
  return date ? new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(date) : "Sin fecha";
};
const monthValue = (value: Date | string | null | undefined) => {
  const date = dateValue(value);
  if (!date || Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

function hasMatch(result: RecordSearchResult, query: string, month: string) {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  const searchable = normalize([result.title, result.detail, result.kind, periodText(result.date), result.date].join(" "));
  return (!month || monthValue(result.date) === month) && terms.every(term => searchable.includes(term));
}

export function findRecordSearchResults(snapshot: any, options: SearchOptions = {}): RecordSearchResult[] {
  const accountName = new Map((snapshot?.accounts ?? []).map((item: any) => [item.id, item.name]));
  const categoryName = new Map((snapshot?.categories ?? []).map((item: any) => [item.id, item.name]));
  const contactName = new Map((snapshot?.contacts ?? []).map((item: any) => [item.id, item.name]));
  const entityName = new Map((snapshot?.entities ?? []).map((item: any) => [item.id, item.shortCode || item.name]));
  const projectName = new Map((snapshot?.projects ?? []).map((item: any) => [item.id, item.name]));
  const transactions: RecordSearchResult[] = (snapshot?.transactions ?? []).map((item: any) => ({
    id: item.id,
    key: `transaction-${item.id}`,
    kind: "transaction" as const,
    title: item.notes || (item.type === "income" ? "Ingreso" : item.type === "expense" ? "Gasto" : "Traspaso"),
    detail: [item.type === "income" ? "Ingreso" : item.type === "expense" ? "Gasto" : "Traspaso", categoryName.get(item.categoryId), accountName.get(item.accountId), contactName.get(item.contactId), entityName.get(item.entityId), projectName.get(item.projectId), periodText(item.occurredAt)].filter(Boolean).join(" · "),
    date: item.occurredAt,
    amountCents: item.amountCents,
    currency: item.currency,
    transactionType: item.type,
    href: `/movimientos#transaction-${item.id}`,
  }));
  const investments: RecordSearchResult[] = (snapshot?.investments ?? []).map((item: any) => ({
    id: item.id,
    key: `investment-${item.id}`,
    kind: "investment" as const,
    title: item.name,
    detail: [item.institution, item.type, entityName.get(item.entityId), projectName.get(item.projectId), item.status === "active" ? "Activa" : item.status === "paused" ? "En pausa" : "Cerrada"].filter(Boolean).join(" · "),
    date: item.valuationDate,
    amountCents: item.currentValueCents,
    currency: item.currency,
    href: `/inversiones#investment-${item.id}`,
  }));
  const statements: RecordSearchResult[] = (snapshot?.statements ?? []).map((item: any) => ({
    id: item.id,
    key: `statement-${item.id}`,
    kind: "statement" as const,
    title: `Estado financiero · ${periodText(item.periodStart)}`,
    detail: [item.scope === "business" ? "Empresarial" : item.scope === "mixed" ? "Consolidado" : "Personal", entityName.get(item.entityId), projectName.get(item.projectId), item.status === "closed" ? "Cerrado" : "Borrador", item.notes].filter(Boolean).join(" · "),
    date: item.periodStart,
    amountCents: item.netWorthCents,
    currency: item.filterCurrency ?? snapshot?.dashboard?.reportCurrency ?? snapshot?.profile?.currency ?? null,
    href: `/estados#statement-${item.id}`,
  }));
  const documents: RecordSearchResult[] = (snapshot?.documents ?? []).map((item: any) => ({
    id: item.id,
    key: `document-${item.id}`,
    kind: "document" as const,
    title: item.name,
    detail: [item.type === "statement" ? "Estado de cuenta / extracto" : item.type ?? "Documento", entityName.get(item.entityId), projectName.get(item.projectId), item.notes].filter(Boolean).join(" · "),
    date: item.issuedAt,
    href: `/movimientos#document-${item.id}`,
  }));
  const selected = options.kind && options.kind !== "all" ? [...transactions, ...investments, ...statements, ...documents].filter(result => result.kind === options.kind) : [...transactions, ...investments, ...statements, ...documents];
  return selected
    .filter(result => hasMatch(result, options.query ?? "", options.month ?? ""))
    .sort((left, right) => (dateValue(right.date)?.getTime() ?? 0) - (dateValue(left.date)?.getTime() ?? 0));
}

export function recordSearchKindLabel(kind: Exclude<RecordSearchKind, "all">) {
  return kind === "transaction" ? "Movimiento" : kind === "investment" ? "Inversión" : kind === "statement" ? "Estado" : "Documento";
}
