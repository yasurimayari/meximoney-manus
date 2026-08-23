import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  deleteOwnedRow: vi.fn(),
  getFinanceSnapshot: vi.fn(),
  requireDb: vi.fn(),
}));

vi.mock("./db", () => ({
  deleteAllFinancialData: vi.fn(),
  deleteOwnedRow: mocks.deleteOwnedRow,
  getFinanceSnapshot: mocks.getFinanceSnapshot,
  getProfile: vi.fn(),
  requireDb: mocks.requireDb,
}));

import { appRouter } from "./routers";

function createContext(userId: number): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `user-${userId}`,
      email: `user-${userId}@example.com`,
      name: "Usuario de prueba",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("finance.dashboard", () => {
  beforeEach(() => {
    mocks.deleteOwnedRow.mockReset();
    mocks.deleteOwnedRow.mockResolvedValue({ success: true });
    mocks.getFinanceSnapshot.mockReset();
    mocks.requireDb.mockReset();
    mocks.getFinanceSnapshot.mockResolvedValue({ dashboard: {}, accounts: [], transactions: [] });
  });

  it("consulta el resumen usando exclusivamente el identificador del usuario autenticado", async () => {
    const caller = appRouter.createCaller(createContext(27));
    await caller.finance.dashboard();

    expect(mocks.getFinanceSnapshot).toHaveBeenCalledTimes(1);
    expect(mocks.getFinanceSnapshot).toHaveBeenCalledWith(27);
  });

  it("bloquea el asistente si no existe consentimiento de almacenamiento manual", async () => {
    mocks.requireDb.mockResolvedValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [],
          }),
        }),
      }),
    });
    const caller = appRouter.createCaller(createContext(27));

    await expect(caller.finance.assistant.chat({ message: "Resume mi situación" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("aplica el identificador autenticado al eliminar calendario, estados y documentos", async () => {
    const caller = appRouter.createCaller(createContext(27));

    await caller.finance.calendar.remove({ id: 81 });
    await caller.finance.statements.remove({ id: 82 });
    await caller.finance.documents.remove({ id: 83 });

    expect(mocks.deleteOwnedRow).toHaveBeenCalledTimes(3);
    expect(mocks.deleteOwnedRow.mock.calls.map(call => [call[1], call[2]])).toEqual([[81, 27], [82, 27], [83, 27]]);
  });
});
