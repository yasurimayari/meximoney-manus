import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  deletedTables: [] as string[],
}));

vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: vi.fn(() => ({
    transaction: async (callback: (tx: { delete: (table: { [key: symbol]: string }) => { where: () => Promise<void> } }) => Promise<void>) => callback({
      delete: table => ({
        where: async () => {
          state.deletedTables.push(table[Symbol.for("drizzle:Name")]);
        },
      }),
    }),
  })),
}));

import { deleteAllFinancialData } from "./db";

describe("deleteAllFinancialData", () => {
  it("elimina los eventos privados de seguridad y colaboración junto con los demás datos de la cuenta", async () => {
    state.deletedTables.length = 0;

    await deleteAllFinancialData(44);

    expect(state.deletedTables).toContain("passwordResetEvents");
    expect(state.deletedTables).toContain("passwordResetTokens");
    expect(state.deletedTables).toContain("fiscalPeriodReviews");
    expect(state.deletedTables).toContain("workspaceAuditEvents");
    expect(state.deletedTables).toContain("collaborationInvites");
  });
});
