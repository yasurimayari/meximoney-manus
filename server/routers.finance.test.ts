import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  deleteOwnedRow: vi.fn(),
  getFinanceSnapshot: vi.fn(),
  requireDb: vi.fn(),
  resolveWorkspaceAccess: vi.fn(),
}));

vi.mock("./db", () => ({
  deleteAllFinancialData: vi.fn(),
  deleteOwnedRow: mocks.deleteOwnedRow,
  getFinanceSnapshot: mocks.getFinanceSnapshot,
  getProfile: vi.fn(),
  requireDb: mocks.requireDb,
  resolveWorkspaceAccess: mocks.resolveWorkspaceAccess,
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
    mocks.resolveWorkspaceAccess.mockReset();
    mocks.resolveWorkspaceAccess.mockResolvedValue({ ownerId: 27, role: "owner", canCreateDrafts: true, canReview: true });
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

  it("impide que un revisor sin permiso cree borradores en el espacio de otra persona", async () => {
    mocks.resolveWorkspaceAccess.mockResolvedValue({ ownerId: 73, role: "reviewer", canCreateDrafts: false, canReview: true });
    mocks.requireDb.mockResolvedValue({ select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ accepted: true }] }) }) }) });
    const caller = appRouter.createCaller(createContext(91));

    await expect(caller.finance.workspace.transactionSave({ type: "income", scope: "business", amountCents: 15000, currency: "USD", reportCurrency: "MXN", reportAmountCents: null, exchangeRateMicros: null, exchangeRateDate: null, incomeNature: "business_revenue", entityId: null, projectId: null, accountId: null, categoryId: null, goalId: null, debtId: null, occurredAt: Date.now(), isEssential: false, status: "confirmed", transferGroupId: null, notes: "Cobro" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("guarda el borrador de un gestor bajo la propietaria y exige revisión humana", async () => {
    const inserted = vi.fn();
    mocks.resolveWorkspaceAccess.mockResolvedValue({ ownerId: 73, role: "manager", canCreateDrafts: true, canReview: false });
    mocks.requireDb.mockResolvedValue({
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ accepted: true }] }) }) }),
      insert: () => ({ values: inserted }),
    });
    const caller = appRouter.createCaller(createContext(91));
    await caller.finance.workspace.transactionSave({ type: "income", scope: "business", amountCents: 15000, currency: "USD", reportCurrency: "MXN", reportAmountCents: 270000, exchangeRateMicros: 18000000, exchangeRateDate: Date.now(), incomeNature: "business_revenue", entityId: 4, projectId: null, accountId: null, categoryId: null, goalId: null, debtId: null, occurredAt: Date.now(), isEssential: false, status: "confirmed", transferGroupId: null, notes: "Cobro" });

    expect(inserted).toHaveBeenCalledWith(expect.objectContaining({ userId: 73, createdByUserId: 91, reviewStatus: "pending_review", status: "needs_review" }));
  });

  it("crea ambas partes de un traspaso entre cuentas propias sin usar ingreso ni gasto", async () => {
    const inserted = vi.fn();
    const results = [
      [{ accepted: true }],
      [{ id: 10, name: "Santander", entityId: null, projectId: null, scope: "personal", currency: "MXN", status: "active" }],
      [{ id: 11, name: "Inbursa", entityId: null, projectId: null, scope: "personal", currency: "MXN", status: "active" }],
    ];
    mocks.requireDb.mockResolvedValue({
      select: () => ({ from: () => ({ where: () => ({ limit: async () => results.shift() }) }) }),
      transaction: async (callback: any) => callback({ insert: () => ({ values: inserted }) }),
    });
    const caller = appRouter.createCaller(createContext(27));

    await expect(caller.finance.workspace.transferSave({ sourceAccountId: 10, destinationAccountId: 11, amountCents: 125000, occurredAt: Date.now(), status: "confirmed", notes: "Fondeo" })).resolves.toMatchObject({ success: true });
    expect(inserted).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ userId: 27, accountId: 10, type: "transfer_out", amountCents: 125000, currency: "MXN", notes: "Traspaso a Inbursa · Fondeo" }),
      expect.objectContaining({ userId: 27, accountId: 11, type: "transfer_in", amountCents: 125000, currency: "MXN", notes: "Traspaso desde Santander · Fondeo" }),
    ]));
  });

  it("impide un traspaso a la misma cuenta antes de crear registros", async () => {
    mocks.requireDb.mockResolvedValue({ select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ accepted: true }] }) }) }) });
    const caller = appRouter.createCaller(createContext(27));

    await expect(caller.finance.workspace.transferSave({ sourceAccountId: 10, destinationAccountId: 10, amountCents: 5000, occurredAt: Date.now(), status: "confirmed", notes: null })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("guarda una cuenta por cobrar en el espacio de la propietaria, separada del ingreso recibido", async () => {
    const inserted = vi.fn();
    mocks.requireDb.mockResolvedValue({
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ accepted: true }] }) }) }),
      insert: () => ({ values: inserted }),
    });
    const caller = appRouter.createCaller(createContext(27));

    await caller.finance.workspace.receivables.save({ entityId: null, projectId: null, counterparty: "Cliente de prueba", origin: "Servicio YMC", scope: "personal", amountCents: 40000, currency: "MXN", issuedAt: Date.now(), dueAt: null, paidAt: null, status: "pending", notes: null });
    expect(inserted).toHaveBeenCalledWith(expect.objectContaining({ userId: 27, counterparty: "Cliente de prueba", origin: "Servicio YMC", amountCents: 40000, status: "pending" }));
  });

  it("permite a la propietaria revocar una colaboración sin afectar otro espacio", async () => {
    const where = vi.fn();
    const set = vi.fn(() => ({ where }));
    mocks.requireDb.mockResolvedValue({
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ accepted: true }] }) }) }),
      update: () => ({ set }),
    });
    const caller = appRouter.createCaller(createContext(27));

    await expect(caller.finance.workspace.revokeInvite({ inviteId: 81 })).resolves.toEqual({ success: true });
    expect(set).toHaveBeenCalledWith({ status: "revoked" });
    expect(where).toHaveBeenCalledTimes(1);
  });

  it("impide que un gestor revoque colaboraciones", async () => {
    mocks.resolveWorkspaceAccess.mockResolvedValue({ ownerId: 73, role: "manager", canCreateDrafts: true, canReview: false });
    mocks.requireDb.mockResolvedValue({ select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ accepted: true }] }) }) }) });
    const caller = appRouter.createCaller(createContext(91));

    await expect(caller.finance.workspace.revokeInvite({ inviteId: 81 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
