import { describe, expect, it } from "vitest";
import { filterFiscalRecords, fiscalScopeLabel } from "./fiscalScope";

describe("filtros PFAE manuales", () => {
  const records = [
    { id: 1, entityId: 10, projectId: 100 },
    { id: 2, entityId: 10, projectId: 101 },
    { id: 3, entityId: 20, projectId: 200 },
    { id: 4, entityId: null, projectId: null },
  ];

  it("mantiene el consolidado y filtra sólo vínculos explícitos", () => {
    expect(filterFiscalRecords(records, {})).toHaveLength(4);
    expect(filterFiscalRecords(records, { entityId: 10 }).map(item => item.id)).toEqual([1, 2]);
    expect(filterFiscalRecords(records, { entityId: 10, projectId: 101 }).map(item => item.id)).toEqual([2]);
    expect(filterFiscalRecords(records, { entityId: 99 })).toEqual([]);
  });

  it("describe el alcance sin asignar vínculos inexistentes", () => {
    expect(fiscalScopeLabel({}, [{ id: 10, name: "YMC", shortCode: "YMC" }], [{ id: 100, name: "Servicios" }])).toBe("Todas las entidades · Todos los proyectos");
    expect(fiscalScopeLabel({ entityId: 10, projectId: 100 }, [{ id: 10, name: "YMC", shortCode: "YMC" }], [{ id: 100, name: "Servicios" }])).toBe("YMC · Servicios");
  });
});
