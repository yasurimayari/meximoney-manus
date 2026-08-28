import { describe, expect, it } from "vitest";
import { projectFinancialReferences } from "./projectFinancialReferences";

describe("projectFinancialReferences", () => {
  it("agrupa varias tareas ligadas al mismo movimiento sin duplicar la referencia", () => {
    const result = projectFinancialReferences(
      [{ id: 1, title: "Revisar pago", linkedTransactionId: 9 }, { id: 2, title: "Guardar evidencia", linkedTransactionId: 9 }, { id: 3, title: "Sin vínculo" }],
      [{ id: 9, occurredAt: "2026-08-15T12:00:00.000Z", type: "expense", currency: "MXN", amountCents: 25000 }],
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.transaction.id).toBe(9);
    expect(result[0]?.tasks.map(task => task.id)).toEqual([1, 2]);
  });

  it("omite referencias ausentes y ordena los movimientos por fecha descendente", () => {
    const result = projectFinancialReferences(
      [{ id: 1, title: "Anterior", linkedTransactionId: 1 }, { id: 2, title: "Reciente", linkedTransactionId: 2 }, { id: 3, title: "Eliminado", linkedTransactionId: 3 }],
      [{ id: 1, occurredAt: "2026-08-01T12:00:00.000Z", type: "income", currency: "MXN", amountCents: 10000 }, { id: 2, occurredAt: "2026-08-20T12:00:00.000Z", type: "transfer", currency: "MXN", amountCents: 20000 }],
    );
    expect(result.map(item => item.transaction.id)).toEqual([2, 1]);
  });
});
