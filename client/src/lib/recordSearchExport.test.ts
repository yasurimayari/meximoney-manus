import { describe, expect, it } from "vitest";
import { buildRecordSearchCsv, buildRecordSearchExportRows } from "./recordSearchExport";

describe("exportación de búsqueda en Registro", () => {
  it("exporta únicamente los resultados visibles con fecha, tipo, detalle e importe", () => {
    const rows = buildRecordSearchExportRows([{ id: 7, key: "transaction-7", kind: "transaction", title: "Notion mensual", detail: "Gasto · Suscripciones", date: new Date("2026-08-04T12:00:00Z"), amountCents: 34900, currency: "MXN", href: "/movimientos#transaction-7" }]);
    expect(rows).toEqual([{ Fecha: "2026-08-04", Tipo: "Movimiento", Resultado: "Notion mensual", Detalle: "Gasto · Suscripciones", Importe: 349, Moneda: "MXN", Destino: "/movimientos#transaction-7" }]);
    expect(buildRecordSearchCsv(rows)).toContain('"Resultado"');
    expect(buildRecordSearchCsv(rows)).toContain('"Notion mensual"');
  });
});
