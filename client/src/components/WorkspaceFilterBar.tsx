import { Label } from "@/components/ui/label";

export type WorkspaceFilters = {
  entityId: string;
  projectId: string;
  currency: string;
  reviewStatus: string;
};

export const emptyWorkspaceFilters: WorkspaceFilters = { entityId: "", projectId: "", currency: "", reviewStatus: "" };

export function WorkspaceFilterBar({ snapshot, filters, onChange, showReview = true, statusLabel = "Revisión", statusOptions = [{ value: "approved", label: "Aprobados" }, { value: "pending_review", label: "Pendientes de revisión" }, { value: "draft", label: "Borradores" }] }: { snapshot: any; filters: WorkspaceFilters; onChange: (filters: WorkspaceFilters) => void; showReview?: boolean; statusLabel?: string; statusOptions?: Array<{ value: string; label: string }> }) {
  const currencies = Array.from(new Set([...(snapshot.transactions ?? []).map((item: any) => item.currency), ...(snapshot.accounts ?? []).map((item: any) => item.currency), ...(snapshot.debts ?? []).map((item: any) => item.currency)].filter(Boolean))).sort();
  const projects = (snapshot.projects ?? []).filter((project: any) => !filters.entityId || project.entityId === Number(filters.entityId));
  return <div className="grid gap-2 rounded-xl border bg-muted/30 p-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Filtros del espacio"><div className="form-field gap-1"><Label>Entidad</Label><select value={filters.entityId} onChange={event => onChange({ ...filters, entityId: event.target.value, projectId: "" })}><option value="">Todas</option>{(snapshot.entities ?? []).map((entity: any) => <option key={entity.id} value={entity.id}>{entity.shortCode || entity.name}</option>)}</select></div><div className="form-field gap-1"><Label>Proyecto</Label><select value={filters.projectId} onChange={event => onChange({ ...filters, projectId: event.target.value })}><option value="">Todos</option>{projects.map((project: any) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div><div className="form-field gap-1"><Label>Moneda</Label><select value={filters.currency} onChange={event => onChange({ ...filters, currency: event.target.value })}><option value="">Todas</option>{currencies.map(currency => <option key={currency} value={currency}>{currency}</option>)}</select></div>{showReview ? <div className="form-field gap-1"><Label>{statusLabel}</Label><select value={filters.reviewStatus} onChange={event => onChange({ ...filters, reviewStatus: event.target.value })}><option value="">Todos los estados</option>{statusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div> : null}</div>;
}

export function filterWorkspaceSnapshot(snapshot: any, filters: WorkspaceFilters) {
  const entityId = filters.entityId ? Number(filters.entityId) : null;
  const projectId = filters.projectId ? Number(filters.projectId) : null;
  const hasScope = (item: any) => (!entityId || item.entityId === entityId) && (!projectId || item.projectId === projectId);
  const hasCurrency = (item: any) => !filters.currency || item.currency === filters.currency || item.reportCurrency === filters.currency;
  const transactions = (snapshot.transactions ?? []).filter((item: any) => hasScope(item) && hasCurrency(item) && (!filters.reviewStatus || item.reviewStatus === filters.reviewStatus));
  const accounts = (snapshot.accounts ?? []).filter((item: any) => hasScope(item) && hasCurrency(item));
  const debts = (snapshot.debts ?? []).filter((item: any) => hasScope(item) && hasCurrency(item));
  return { ...snapshot, transactions, accounts, debts, budgets: (snapshot.budgets ?? []).filter(hasScope), goals: (snapshot.goals ?? []).filter(hasScope), documents: (snapshot.documents ?? []).filter(hasScope), calendarEvents: (snapshot.calendarEvents ?? []).filter((item: any) => hasScope(item) && hasCurrency(item) && (!filters.reviewStatus || item.status === filters.reviewStatus)), statements: (snapshot.statements ?? []).filter((item: any) => !entityId || item.entityId === entityId) };
}
