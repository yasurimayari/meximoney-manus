import { describe, expect, it } from "vitest";
import { createOfflineSnapshot } from "./offlineVault";

describe("bóveda offline personal", () => {
  it("conserva el resumen financiero y excluye datos personales no necesarios y enlaces de documentos", () => {
    const snapshot = createOfflineSnapshot({
      profile: { workspaceName: "Personal", currency: "MXN", birthDate: "1990-01-01", contactEmail: "persona@example.com", avatarUrl: "https://private/avatar", notes: "privado" },
      dashboard: { cashFlow: { income: 1 } },
      accounts: [{ id: 1 }], creditCards: [{ id: 2 }], debts: [{ id: 3 }], transactions: [{ id: 4 }], budgets: [{ id: 5 }], investments: [{ id: 6 }], calendarEvents: [{ id: 7 }],
      categories: [], investmentOperations: [], goals: [], statements: [], fiscalRecords: [],
      documents: [{ id: 8, name: "Factura", referenceUrl: "https://private/file", notes: "detalle privado" }],
    });
    expect(snapshot.profile).toMatchObject({ workspaceName: "Personal", currency: "MXN" });
    expect(snapshot.profile).not.toHaveProperty("birthDate");
    expect(snapshot.profile).not.toHaveProperty("contactEmail");
    expect(snapshot.documents[0]).toEqual({ id: 8, name: "Factura" });
    expect(snapshot.transactions).toHaveLength(1);
  });
});
