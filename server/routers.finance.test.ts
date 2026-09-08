import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  askClaudeForMexiAnalysis: vi.fn(),
  formatMexiAnalysis: vi.fn(),
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

vi.mock("./claude", () => ({
  askClaudeForMexiAnalysis: mocks.askClaudeForMexiAnalysis,
  formatMexiAnalysis: mocks.formatMexiAnalysis,
}));

import { appRouter } from "./routers";

function createContext(userId: number, referenceDate?: string): TrpcContext {
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
    req: { protocol: "https", headers: referenceDate ? { "x-meximoney-reference-date": referenceDate } : {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("finance.dashboard", () => {
  beforeEach(() => {
    mocks.deleteOwnedRow.mockReset();
    mocks.deleteOwnedRow.mockResolvedValue({ success: true });
    mocks.askClaudeForMexiAnalysis.mockReset();
    mocks.askClaudeForMexiAnalysis.mockResolvedValue({ answer: "Análisis preparado por Claude.", facts: [], calculations: [], assumptions: [], recommendations: [], warnings: [], sources: [], canExecute: false });
    mocks.formatMexiAnalysis.mockReset();
    mocks.formatMexiAnalysis.mockReturnValue("Análisis preparado por Claude.");
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

  it("usa la fecha local de Ciudad de México en el resumen que consume el Panel", async () => {
    const caller = appRouter.createCaller(createContext(27, "2026-08-26"));
    await caller.finance.workspace.get();

    expect(mocks.getFinanceSnapshot).toHaveBeenCalledWith(27, new Date("2026-08-26T12:00:00.000Z"));
  });

  it("prioriza el periodo explícito del Panel sobre una cabecera distinta", async () => {
    const caller = appRouter.createCaller(createContext(27, "2026-07-31"));
    await caller.finance.dashboard({ referenceDate: "2026-08-26" });

    expect(mocks.getFinanceSnapshot).toHaveBeenCalledWith(27, new Date("2026-08-26T12:00:00.000Z"));
  });

  it("marca un movimiento aprobado como conciliado y conserva una nota de estado de cuenta", async () => {
    const limit = vi.fn().mockResolvedValue([{ id: 91, status: "confirmed", reviewStatus: "approved" }]);
    const where = vi.fn(() => ({ limit }));
    const from = vi.fn(() => ({ where }));
    const updateWhere = vi.fn().mockResolvedValue([]);
    const set = vi.fn(() => ({ where: updateWhere }));
    const select = vi.fn()
      .mockImplementationOnce(() => ({ from: () => ({ where: () => ({ limit: vi.fn().mockResolvedValue([{ accepted: true }]) }) }) }))
      .mockImplementationOnce(() => ({ from }));
    mocks.requireDb.mockResolvedValue({ select, update: vi.fn(() => ({ set })) });
    const caller = appRouter.createCaller(createContext(27));

    await expect(caller.finance.workspace.reconcileMovement({ id: 91, reconciled: true, note: "Estado de cuenta Santander · junio" })).resolves.toMatchObject({ success: true, reconciled: true });
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ reconciledByUserId: 27, reconciliationNote: "Estado de cuenta Santander · junio", reconciledAt: expect.any(Date) }));
    expect(updateWhere).toHaveBeenCalledTimes(1);
  });

  it("retira la conciliación sin afectar movimientos de otra usuaria", async () => {
    const limit = vi.fn().mockResolvedValue([{ id: 92, status: "confirmed", reviewStatus: "approved" }]);
    const where = vi.fn(() => ({ limit }));
    const from = vi.fn(() => ({ where }));
    const updateWhere = vi.fn().mockResolvedValue([]);
    const set = vi.fn(() => ({ where: updateWhere }));
    const select = vi.fn()
      .mockImplementationOnce(() => ({ from: () => ({ where: () => ({ limit: vi.fn().mockResolvedValue([{ accepted: true }]) }) }) }))
      .mockImplementationOnce(() => ({ from }));
    mocks.requireDb.mockResolvedValue({ select, update: vi.fn(() => ({ set })) });
    const caller = appRouter.createCaller(createContext(27));

    await expect(caller.finance.workspace.reconcileMovement({ id: 92, reconciled: false, note: null })).resolves.toMatchObject({ success: true, reconciled: false });
    expect(set).toHaveBeenCalledWith({ reconciledAt: null, reconciledByUserId: null, reconciliationNote: null });
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

  it("envía a Claude sólo una síntesis del espacio autenticado y devuelve su análisis", async () => {
    mocks.requireDb.mockResolvedValue({ select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ accepted: true }], orderBy: () => ({ limit: async () => [{ title: "Fondo de emergencia", content: "Quiero priorizar seis meses de gastos.", tag: "impuestos", tagColor: "amber", isPinned: true, updatedAt: new Date() }] }) }) }) }), insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([{ insertId: 1 }]) }) });
    mocks.getFinanceSnapshot.mockResolvedValue({
      profile: { currency: "MXN" }, accounts: [], categories: [], transactions: [], debts: [], goals: [], tasks: [], calendarEvents: [], statements: [], dashboard: {},
    });
    mocks.askClaudeForMexiAnalysis.mockResolvedValue({ answer: "Análisis preparado por Claude.", facts: [], calculations: [], assumptions: [], recommendations: [], warnings: [], sources: [], canExecute: false });
    mocks.formatMexiAnalysis.mockReturnValue("Análisis preparado por Claude.");
    const caller = appRouter.createCaller(createContext(27));

    await expect(caller.finance.assistant.chat({ message: "Resume mi situación", noteTag: "impuestos" })).resolves.toMatchObject({ content: "Análisis preparado por Claude.", analysis: { canExecute: false } });
    expect(mocks.getFinanceSnapshot).toHaveBeenCalledWith(27);
    expect(mocks.askClaudeForMexiAnalysis).toHaveBeenCalledWith(expect.objectContaining({
      prompt: expect.stringContaining("PREGUNTA DE LA USUARIA:\nResume mi situación"),
    }));
    expect(mocks.askClaudeForMexiAnalysis.mock.calls[0]?.[0]?.prompt).toContain("Fondo de emergencia");
    expect(mocks.askClaudeForMexiAnalysis.mock.calls[0]?.[0]?.prompt).toContain('"isPinned":true');
    expect(mocks.askClaudeForMexiAnalysis.mock.calls[0]?.[0]?.system).toContain("personalNotes");
    expect(mocks.askClaudeForMexiAnalysis.mock.calls[0]?.[0]?.prompt).toContain('"personalNotesFilter":"impuestos"');
    expect(mocks.askClaudeForMexiAnalysis.mock.calls[0]?.[0]?.prompt).not.toContain("ANTHROPIC_API_KEY");
  });

  it("guarda una nota del diario únicamente bajo la usuaria autenticada", async () => {
    const values = vi.fn().mockResolvedValue([{ insertId: 91 }]);
    const insert = vi.fn().mockReturnValue({ values });
    mocks.requireDb.mockResolvedValue({ select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ accepted: true }] }) }) }), insert });
    const caller = appRouter.createCaller(createContext(27));

    await expect(caller.finance.assistant.notes.save({ title: "Idea", content: "## Revisar flujo\\n\\n$$x^2$$", tag: "inversiones", tagColor: "emerald" })).resolves.toEqual({ id: 91 });
    expect(values).toHaveBeenCalledWith({ userId: 27, title: "Idea", content: "## Revisar flujo\\n\\n$$x^2$$", tag: "inversiones", tagColor: "emerald" });
  });

  it("fija y archiva notas únicamente dentro del espacio autenticado", async () => {
    const set = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    const update = vi.fn().mockReturnValue({ set });
    mocks.requireDb.mockResolvedValue({ select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ accepted: true }] }) }) }), update });
    const caller = appRouter.createCaller(createContext(27));

    await expect(caller.finance.assistant.notes.togglePinned({ id: 14, isPinned: true })).resolves.toEqual({ success: true });
    expect(set).toHaveBeenCalledWith({ isPinned: true });
    await expect(caller.finance.assistant.notes.archive({ id: 14, archived: true })).resolves.toEqual({ success: true });
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ isPinned: false, archivedAt: expect.any(Date) }));
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
      transaction: async (callback: any) => callback({ select: () => ({ from: () => ({ where: () => [] }) }), insert: () => ({ values: inserted }), update: () => ({ set: () => ({ where: vi.fn() }) }) }),
    });
    const caller = appRouter.createCaller(createContext(91));
    await caller.finance.workspace.transactionSave({ type: "income", scope: "business", amountCents: 15000, currency: "USD", reportCurrency: "MXN", reportAmountCents: 270000, exchangeRateMicros: 18000000, exchangeRateDate: Date.now(), incomeNature: "business_revenue", entityId: 4, projectId: null, accountId: null, categoryId: null, goalId: null, debtId: null, occurredAt: Date.now(), isEssential: false, status: "confirmed", transferGroupId: null, notes: "Cobro" });

    expect(inserted).toHaveBeenCalledWith(expect.objectContaining({ userId: 73, createdByUserId: 91, reviewStatus: "pending_review", status: "needs_review" }));
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

  it("actualiza costo y valor de una posición existente al guardar una aportación", async () => {
    const position = { id: 11, userId: 27, currency: "MXN", costBasisCents: 500_00, currentValueCents: 500_00, valuationDate: new Date("2026-08-01T12:00:00Z") };
    const inserted = vi.fn();
    const where = vi.fn();
    const set = vi.fn(() => ({ where }));
    const transaction = vi.fn(async callback => callback({ insert: () => ({ values: inserted }), update: () => ({ set }) }));
    let selectCall = 0;
    const select = () => ({ from: () => ({ where: () => ({ limit: async () => [selectCall++ === 0 ? { accepted: true } : position] }) }) });
    mocks.requireDb.mockResolvedValue({ select, transaction });
    const caller = appRouter.createCaller(createContext(27));

    await caller.finance.workspace.investments.operationSave({ investmentId: 11, type: "contribution", amountCents: 500_00, currency: "MXN", occurredAt: Date.parse("2026-08-24T12:00:00Z"), linkedTransactionId: null, notes: null });

    expect(inserted).toHaveBeenCalledWith(expect.objectContaining({ investmentId: 11, amountCents: 500_00, type: "contribution" }));
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ costBasisCents: 1_000_00, currentValueCents: 1_000_00 }));
  });

  it("recalcula costo y valor de la posición al eliminar una aportación", async () => {
    const operation = { id: 501, investmentId: 11, userId: 27, type: "contribution" as const, amountCents: 500_00 };
    const position = { id: 11, userId: 27, costBasisCents: 1_000_00, currentValueCents: 1_000_00 };
    let sequence = 0;
    const txSelect = () => ({ from: () => ({ where: () => ({ limit: async () => [sequence++ === 0 ? operation : position] }) }) });
    const set = vi.fn(() => ({ where: vi.fn() }));
    const transaction = vi.fn(async callback => callback({ select: txSelect, delete: () => ({ where: vi.fn() }), update: () => ({ set }) }));
    const select = () => ({ from: () => ({ where: () => ({ limit: async () => [{ accepted: true }] }) }) });
    mocks.requireDb.mockResolvedValue({ select, transaction });
    const caller = appRouter.createCaller(createContext(27));

    await caller.finance.workspace.investments.operationRemove({ id: 501 });

    expect(set).toHaveBeenCalledWith({ costBasisCents: 500_00, currentValueCents: 500_00 });
  });

  it("registra el pago de una tarjeta como un traspaso y reduce su saldo sin crear un gasto", async () => {
    const inserted = vi.fn();
    const set = vi.fn(() => ({ where: vi.fn() }));
    const answers = [[{ accepted: true }], [{ id: 91, userId: 27, name: "Tarjeta prueba", currency: "MXN", balanceCents: 1_000_00, status: "active", entityId: null, projectId: null, scope: "personal" }], [{ id: 12, userId: 27, name: "Banco prueba", currency: "MXN", status: "active", entityId: null, projectId: null, scope: "personal" }]];
    const select = () => ({ from: () => ({ where: () => ({ limit: async () => answers.shift() ?? [] }) }) });
    mocks.requireDb.mockResolvedValue({ select, transaction: async (callback: any) => callback({ insert: () => ({ values: inserted }), update: () => ({ set }) }) });
    const caller = appRouter.createCaller(createContext(27));

    await caller.finance.workspace.creditCards.paymentSave({ creditCardId: 91, sourceAccountId: 12, amountCents: 400_00, occurredAt: Date.parse("2026-08-24T12:00:00Z"), status: "confirmed", notes: "Pago de prueba" });

    expect(inserted).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ accountId: 12, type: "transfer_out", amountCents: 400_00 }),
      expect.objectContaining({ creditCardId: 91, type: "transfer_in", amountCents: 400_00 }),
    ]));
    expect(set).toHaveBeenCalledWith({ balanceCents: 600_00 });
  });

  it("permite pagar más que el saldo actual y conserva la referencia bancaria", async () => {
    const inserted = vi.fn();
    const set = vi.fn(() => ({ where: vi.fn() }));
    const answers = [[{ accepted: true }], [{ id: 92, userId: 27, name: "Tarjeta con saldo cero", currency: "MXN", balanceCents: 0, status: "active", entityId: null, projectId: null, scope: "personal" }], [{ id: 13, userId: 27, name: "Cuenta de fondeo", currency: "MXN", status: "active", entityId: null, projectId: null, scope: "personal" }]];
    const select = () => ({ from: () => ({ where: () => ({ limit: async () => answers.shift() ?? [] }) }) });
    mocks.requireDb.mockResolvedValue({ select, transaction: async (callback: any) => callback({ insert: () => ({ values: inserted }), update: () => ({ set }) }) });
    const caller = appRouter.createCaller(createContext(27));

    await caller.finance.workspace.creditCards.paymentSave({ creditCardId: 92, sourceAccountId: 13, amountCents: 746_281, occurredAt: Date.parse("2026-08-24T12:00:00Z"), status: "confirmed", bankReference: "SPEI-5900463", notes: "Aporte para ampliar crédito" });

    expect(inserted).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ type: "transfer_out", bankReference: "SPEI-5900463", amountCents: 746_281 }),
      expect.objectContaining({ type: "transfer_in", bankReference: "SPEI-5900463", amountCents: 746_281 }),
    ]));
    expect(set).toHaveBeenCalledWith({ balanceCents: -746_281 });
  });

  it("registra un pago de préstamo de contacto desde una cuenta como transferencia conciliada y reduce sólo esa deuda", async () => {
    const inserted = vi.fn();
    const updates: unknown[] = [];
    const debt = { id: 44, userId: 27, contactId: 8, entityId: null, projectId: null, scope: "personal" as const, currency: "MXN", balanceCents: 1_000_00, status: "active" as const };
    const source = { id: 12, userId: 27, name: "Santander", currency: "MXN", status: "active" as const, entityId: null, projectId: null, scope: "personal" as const };
    const contact = { id: 8, userId: 27, name: "Sebastian", entityId: null, projectId: null };
    const answers = [[{ accepted: true }], [debt], [source], [contact]];
    const select = () => ({ from: () => ({ where: () => ({ limit: async () => answers.shift() ?? [] }) }) });
    const set = vi.fn((values: unknown) => { updates.push(values); return { where: vi.fn() }; });
    mocks.requireDb.mockResolvedValue({
      select,
      transaction: async (callback: any) => callback({
        insert: () => ({ values: inserted }),
        select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ id: 901 }] }) }) }),
        update: () => ({ set }),
      }),
    });
    const caller = appRouter.createCaller(createContext(27));

    await caller.finance.workspace.contactLoans.paymentFromAccount({ debtId: 44, sourceAccountId: 12, amountCents: 250_00, occurredAt: Date.parse("2026-08-25T12:00:00Z"), nextDueAt: null, status: "confirmed", notes: "Abono agosto" });

    expect(inserted).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ accountId: 12, contactId: 8, type: "transfer_out", amountCents: 250_00 }),
      expect.objectContaining({ debtId: 44, contactId: 8, type: "transfer_in", amountCents: 250_00 }),
    ]));
    expect(inserted).toHaveBeenCalledWith(expect.objectContaining({ debtId: 44, linkedTransactionId: 901, totalPaymentCents: 250_00, principalCents: 250_00 }));
    expect(updates).toEqual(expect.arrayContaining([expect.objectContaining({ balanceCents: 750_00, status: "active" })]));
  });

  it("conserva un saldo inicial sobregirado como pasivo real de la tarjeta", async () => {
    const inserted = vi.fn();
    mocks.requireDb.mockResolvedValue({
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ accepted: true }] }) }) }),
      insert: () => ({ values: inserted }),
    });
    const caller = appRouter.createCaller(createContext(27));

    await expect(caller.finance.workspace.creditCards.save({
      name: "Tarjeta sobregirada", issuer: "Emisor", scope: "pfae", currency: "MXN", creditLimitCents: 750_00, balanceCents: 6_673_88,
      interestRateBps: 18_700, minimumPaymentCents: 200_00, statementClosingDay: 17, paymentDueDay: 27, status: "active", notes: null,
    })).resolves.toEqual({ success: true });

    expect(inserted).toHaveBeenCalledWith(expect.objectContaining({
      userId: 27,
      scope: "pfae",
      creditLimitCents: 750_00,
      balanceCents: 6_673_88,
    }));
  });

  it("actualiza las dos partes de un traspaso como una sola operación", async () => {
    const updates: unknown[] = [];
    const source = { id: 12, userId: 27, name: "Santander", currency: "MXN", status: "active", entityId: null, projectId: null, scope: "personal" };
    const destination = { id: 13, userId: 27, name: "Inbursa", currency: "MXN", status: "active", entityId: null, projectId: null, scope: "personal" };
    const originalTransfers = [
      { id: 301, userId: 27, accountId: 12, creditCardId: null, type: "transfer_out", amountCents: 100_00 },
      { id: 302, userId: 27, accountId: 13, creditCardId: null, type: "transfer_in", amountCents: 100_00 },
    ];
    let selectCall = 0;
    const select = () => {
      const call = selectCall++;
      return {
        from: () => ({
          where: () => call === 3 ? originalTransfers : { limit: async () => [call === 0 ? { accepted: true } : call === 1 ? source : call === 2 ? destination : null].filter(Boolean) },
        }),
      };
    };
    const set = vi.fn((values: unknown) => { updates.push(values); return { where: vi.fn() }; });
    mocks.requireDb.mockResolvedValue({
      select,
      transaction: async (callback: any) => callback({ update: () => ({ set }) }),
    });
    const caller = appRouter.createCaller(createContext(27));

    await caller.finance.workspace.transferUpdate({
      transferGroupId: "3d1e5f63-0cef-4b0a-93aa-4ac2e7dcc064", sourceAccountId: 12, destinationAccountId: 13, amountCents: 250_00,
      occurredAt: Date.parse("2026-08-24T12:00:00Z"), status: "confirmed", notes: "Ajuste",
    });

    expect(updates).toEqual(expect.arrayContaining([
      expect.objectContaining({ accountId: 12, type: "transfer_out", amountCents: 250_00, notes: "Traspaso a Inbursa · Ajuste" }),
      expect.objectContaining({ accountId: 13, type: "transfer_in", amountCents: 250_00, notes: "Traspaso desde Santander · Ajuste" }),
    ]));
  });

  it("reduce sólo el principal de una cuota financiada sin crear un segundo gasto", async () => {
    const inserted = vi.fn();
    const set = vi.fn(() => ({ where: vi.fn() }));
    const debt = { id: 44, userId: 27, currency: "MXN", balanceCents: 10_000_00, status: "active" as const };
    let selectCall = 0;
    const txSelect = () => ({ from: () => ({ where: () => ({ limit: async () => selectCall++ === 0 ? [debt] : [] }) }) });
    mocks.requireDb.mockResolvedValue({
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ accepted: true }] }) }) }),
      transaction: async (callback: any) => callback({ select: txSelect, insert: () => ({ values: inserted }), update: () => ({ set }) }),
    });
    const caller = appRouter.createCaller(createContext(27));

    await caller.finance.debts.paymentSave({ debtId: 44, linkedTransactionId: null, totalPaymentCents: 1_000_00, principalCents: 850_00, currency: "MXN", paidAt: Date.parse("2026-08-25T12:00:00Z"), nextDueAt: null, notes: "Cuota con interés" });

    expect(inserted).toHaveBeenCalledWith(expect.objectContaining({ debtId: 44, totalPaymentCents: 1_000_00, principalCents: 850_00 }));
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ balanceCents: 9_150_00, status: "active" }));
  });

  it("rechaza una cuota cuyo principal supere el importe pagado", async () => {
    mocks.requireDb.mockResolvedValue({
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ accepted: true }] }) }) }),
    });
    const caller = appRouter.createCaller(createContext(27));

    await expect(caller.finance.debts.paymentSave({ debtId: 44, linkedTransactionId: null, totalPaymentCents: 500_00, principalCents: 600_00, currency: "MXN", paidAt: Date.parse("2026-08-25T12:00:00Z"), nextDueAt: null, notes: null })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("guarda un renglón PFAE manual con vínculos del espacio privado, sin modificar los registros enlazados", async () => {
    const inserted = vi.fn();
    const answers = [
      [{ accepted: true }],
      [{ id: 101, userId: 27, currency: "MXN", type: "income" }],
      [{ id: 202, userId: 27, currency: "MXN" }],
      [{ id: 8, userId: 27, name: "Cliente" }],
      [{ id: 303, userId: 27, name: "Factura agosto" }],
    ];
    const select = () => ({ from: () => ({ where: () => ({ limit: async () => answers.shift() ?? [] }) }) });
    mocks.requireDb.mockResolvedValue({ select, insert: () => ({ values: inserted }) });
    const caller = appRouter.createCaller(createContext(27));

    await caller.finance.workspace.fiscalRecords.save({
      entityId: null, projectId: null, transactionId: 101, receivableId: 202, contactId: 8, documentId: 303,
      periodStart: Date.parse("2026-08-01T12:00:00Z"), description: "Factura de servicios agosto", recordType: "income_invoice",
      fiscalReference: "FOLIO-MANUAL", scope: "business", currency: "MXN", totalCents: 1_160_00, taxableBaseCents: 1_000_00,
      vatCents: 160_00, invoiceIssuedAt: Date.parse("2026-08-01T12:00:00Z"), collectedAt: null, deductibility: "pending", reviewStatus: "pending_review", notes: "Revisar evidencia",
    });

    expect(inserted).toHaveBeenCalledWith(expect.objectContaining({ userId: 27, transactionId: 101, receivableId: 202, contactId: 8, documentId: 303, totalCents: 1_160_00, reviewStatus: "pending_review", reviewedByUserId: null }));
  });

  it("impide que una gestora administre el libro PFAE de la propietaria", async () => {
    mocks.resolveWorkspaceAccess.mockResolvedValue({ ownerId: 73, role: "manager", canCreateDrafts: true, canReview: false });
    mocks.requireDb.mockResolvedValue({ select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ accepted: true }] }) }) }) });
    const caller = appRouter.createCaller(createContext(91));

    await expect(caller.finance.workspace.fiscalRecords.save({
      entityId: null, projectId: null, transactionId: null, receivableId: null, contactId: null, documentId: null,
      periodStart: Date.parse("2026-08-01T12:00:00Z"), description: "Borrador fiscal", recordType: "other", fiscalReference: null,
      scope: "business", currency: "MXN", totalCents: 0, taxableBaseCents: 0, vatCents: 0, invoiceIssuedAt: null,
      collectedAt: null, deductibility: "pending", reviewStatus: "draft", notes: null,
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("bloquea un renglón PFAE cuando el proyecto no pertenece a la entidad seleccionada", async () => {
    const answers = [
      [{ accepted: true }],
      [{ id: 10, ownerId: 27 }],
      [{ id: 20, ownerId: 27, entityId: 11 }],
    ];
    const select = () => ({ from: () => ({ where: () => ({ limit: async () => answers.shift() ?? [] }) }) });
    mocks.requireDb.mockResolvedValue({ select, insert: () => ({ values: vi.fn() }) });
    const caller = appRouter.createCaller(createContext(27));

    await expect(caller.finance.workspace.fiscalRecords.save({
      entityId: 10, projectId: 20, transactionId: null, receivableId: null, contactId: null, documentId: null,
      periodStart: Date.parse("2026-08-01T12:00:00Z"), description: "Vínculo incoherente", recordType: "other", fiscalReference: null,
      scope: "business", currency: "MXN", totalCents: 0, taxableBaseCents: 0, vatCents: 0, invoiceIssuedAt: null,
      collectedAt: null, deductibility: "pending", reviewStatus: "draft", notes: null,
    })).rejects.toMatchObject({ code: "BAD_REQUEST", message: "El proyecto seleccionado debe pertenecer a la entidad elegida." });
  });

  it("guarda una rutina PFAE revisada sólo después de confirmar sus tres pasos manuales", async () => {
    const inserted = vi.fn();
    const answers = [[{ accepted: true }], []];
    const select = () => ({ from: () => ({ where: () => ({ limit: async () => answers.shift() ?? [] }) }) });
    mocks.requireDb.mockResolvedValue({ select, insert: () => ({ values: inserted }) });
    const caller = appRouter.createCaller(createContext(27));

    await caller.finance.workspace.fiscalPeriodReviews.save({
      periodStart: Date.parse("2026-08-01T12:00:00Z"), recordsConfirmed: true, evidenceConfirmed: true, collectionsConfirmed: true,
      notes: "Revisión manual completa", markReviewed: true,
    });

    expect(inserted).toHaveBeenCalledWith(expect.objectContaining({ userId: 27, status: "reviewed", recordsConfirmed: true, evidenceConfirmed: true, collectionsConfirmed: true, reviewedByUserId: 27 }));
  });

  it("impide cerrar una rutina PFAE sin confirmar los tres controles manuales", async () => {
    mocks.requireDb.mockResolvedValue({ select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ accepted: true }] }) }) }) });
    const caller = appRouter.createCaller(createContext(27));

    await expect(caller.finance.workspace.fiscalPeriodReviews.save({
      periodStart: Date.parse("2026-08-01T12:00:00Z"), recordsConfirmed: true, evidenceConfirmed: false, collectionsConfirmed: true,
      notes: null, markReviewed: true,
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("vincula una posición con un objetivo propio de la misma moneda sin modificar su valor ni patrimonio", async () => {
    const inserted = vi.fn();
    const answers = [[{ accepted: true }], [{ id: 77, userId: 27, currency: "MXN", status: "active" }]];
    const select = () => ({ from: () => ({ where: () => ({ limit: async () => answers.shift() ?? [] }) }) });
    mocks.requireDb.mockResolvedValue({ select, insert: () => ({ values: inserted }) });
    const caller = appRouter.createCaller(createContext(27));

    await caller.finance.workspace.investments.save({
      goalId: 77, entityId: null, projectId: null, name: "Ahorro de emergencia", type: "savings", institution: "Plata", scope: "personal", currency: "MXN",
      costBasisCents: 1_000_00, currentValueCents: 1_000_00, reportCurrency: null, reportValueCents: null, exchangeRateMicros: null,
      exchangeRateDate: null, valuationDate: Date.parse("2026-08-25T12:00:00Z"), includeInNetWorth: true, status: "active", notes: null,
    });

    expect(inserted).toHaveBeenCalledWith(expect.objectContaining({ userId: 27, goalId: 77, currentValueCents: 1_000_00, includeInNetWorth: true }));
  });

  it("rechaza vincular una posición con un objetivo de moneda distinta", async () => {
    const answers = [[{ accepted: true }], [{ id: 77, userId: 27, currency: "USD", status: "active" }]];
    const select = () => ({ from: () => ({ where: () => ({ limit: async () => answers.shift() ?? [] }) }) });
    mocks.requireDb.mockResolvedValue({ select });
    const caller = appRouter.createCaller(createContext(27));

    await expect(caller.finance.workspace.investments.save({
      goalId: 77, entityId: null, projectId: null, name: "Ahorro MXN", type: "savings", institution: null, scope: "personal", currency: "MXN",
      costBasisCents: 0, currentValueCents: 0, reportCurrency: null, reportValueCents: null, exchangeRateMicros: null,
      exchangeRateDate: null, valuationDate: null, includeInNetWorth: true, status: "active", notes: null,
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("persiste la referencia bancaria en las dos partes de un traspaso", async () => {
    const inserted = vi.fn();
    const answers = [
      [{ accepted: true }],
      [{ id: 11, userId: 27, name: "Santander", currency: "MXN", status: "active", entityId: null, projectId: null, scope: "personal" }],
      [{ id: 12, userId: 27, name: "Efectivo Caja", currency: "MXN", status: "active", entityId: null, projectId: null, scope: "personal" }],
    ];
    const select = vi.fn(() => ({ from: () => ({ where: () => ({ limit: async () => answers.shift() ?? [] }) }) }));
    mocks.requireDb.mockResolvedValue({ select, transaction: async (callback: any) => callback({ insert: () => ({ values: inserted }) }) });
    const caller = appRouter.createCaller(createContext(27));

    await caller.finance.workspace.transferSave({
      sourceAccountId: 11, destinationAccountId: 12, investmentId: null, amountCents: 1_500_00,
      occurredAt: Date.parse("2026-09-05T12:00:00Z"), status: "confirmed", bankReference: " SPEI-TRASPASO-123 ", notes: "Fondeo de caja",
    });

    expect(inserted).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ type: "transfer_out", bankReference: "SPEI-TRASPASO-123" }),
      expect.objectContaining({ type: "transfer_in", bankReference: "SPEI-TRASPASO-123" }),
    ]));
  });

  it("archiva un objetivo sin borrar su saldo manual ni tocar inversiones vinculadas", async () => {
    const set = vi.fn(() => ({ where: vi.fn() }));
    mocks.requireDb.mockResolvedValue({
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ accepted: true }] }) }) }),
      update: () => ({ set }),
    });
    const caller = appRouter.createCaller(createContext(27));

    await caller.finance.goals.save({
      id: 77, entityId: null, projectId: null, name: "Fondo de emergencia", type: "emergency", scope: "personal", targetCents: 45_000_00,
      currentCents: 2_000_00, monthlyContributionCents: 2_000_00, currency: "MXN", targetDate: Date.parse("2027-01-01T12:00:00Z"),
      priority: "medium", status: "cancelled", notes: "Archivado para conservar historial",
    });

    expect(set).toHaveBeenCalledWith(expect.objectContaining({ status: "cancelled", currentCents: 2_000_00, targetCents: 45_000_00 }));
  });
});
