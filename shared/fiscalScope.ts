export type FiscalScope = { entityId?: number | null; projectId?: number | null };

export function filterFiscalRecords<T extends { entityId?: number | null; projectId?: number | null }>(records: T[], scope: FiscalScope) {
  return records.filter(record =>
    (scope.entityId == null || record.entityId === scope.entityId) &&
    (scope.projectId == null || record.projectId === scope.projectId),
  );
}

export function fiscalScopeLabel(scope: FiscalScope, entities: Array<{ id: number; name: string; shortCode?: string | null }>, projects: Array<{ id: number; name: string }>) {
  const entity = scope.entityId == null ? "Todas las entidades" : (entities.find(item => item.id === scope.entityId)?.shortCode || entities.find(item => item.id === scope.entityId)?.name || "Entidad seleccionada");
  const project = scope.projectId == null ? "Todos los proyectos" : (projects.find(item => item.id === scope.projectId)?.name || "Proyecto seleccionado");
  return `${entity} · ${project}`;
}
