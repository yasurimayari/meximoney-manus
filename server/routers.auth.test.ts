import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { hashPassword } from "./credentials";

const mocks = vi.hoisted(() => ({
  createSessionToken: vi.fn(),
  insertedUsers: [] as Record<string, unknown>[],
  insertedCredentials: [] as Record<string, unknown>[],
  credential: null as Record<string, unknown> | null,
  changedPasswordHashes: [] as string[],
  deletedRecoveryTokensFor: [] as number[],
  insertedSecurityEvents: [] as Record<string, unknown>[],
}));

vi.mock("./_core/sdk", () => ({
  sdk: { createSessionToken: mocks.createSessionToken },
}));

vi.mock("./db", () => ({
  deleteAllFinancialData: vi.fn(),
  deleteOwnedRow: vi.fn(),
  getFinanceSnapshot: vi.fn(),
  getProfile: vi.fn(),
  requireDb: async () => ({
    select: () => ({
      from: (table: any) => ({
        where: () => ({
          limit: async () => table[Symbol.for("drizzle:Name")] === "localCredentials" ? (mocks.credential ? [mocks.credential] : []) : [{ id: 44, openId: "local_test", name: "Ana", email: "ana@example.com", loginMethod: "email_password", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }],
          orderBy: () => ({ limit: async () => [] }),
        }),
      }),
    }),
    insert: (table: any) => ({
      values: async (value: Record<string, unknown>) => {
        if (table[Symbol.for("drizzle:Name")] === "localCredentials") mocks.insertedCredentials.push(value);
        else mocks.insertedUsers.push(value);
      },
    }),
    update: () => ({ set: () => ({ where: async () => undefined }) }),
    transaction: async (callback: (tx: any) => Promise<void>) => callback({
      update: (table: any) => ({ set: (value: Record<string, unknown>) => ({ where: async () => { if (table[Symbol.for("drizzle:Name")] === "localCredentials") mocks.changedPasswordHashes.push(String(value.passwordHash)); } }) }),
      delete: (table: any) => ({ where: async () => { if (table[Symbol.for("drizzle:Name")] === "passwordResetTokens") mocks.deletedRecoveryTokensFor.push(44); } }),
      insert: (table: any) => ({ values: async (value: Record<string, unknown>) => { if (table[Symbol.for("drizzle:Name")] === "passwordResetEvents") mocks.insertedSecurityEvents.push(value); } }),
    }),
  }),
}));

import { appRouter } from "./routers";

function createContext() {
  const cookie = vi.fn();
  return {
    ctx: {
      user: null,
      req: { protocol: "https", headers: {} },
      res: { cookie, clearCookie: vi.fn() },
    } as unknown as TrpcContext,
    cookie,
  };
}

describe("auth.register", () => {
  it("crea credenciales locales y una cookie de sesión para un registro válido", async () => {
    mocks.createSessionToken.mockResolvedValue("local-session-token");
    mocks.insertedUsers.length = 0;
    mocks.insertedCredentials.length = 0;
    const { ctx, cookie } = createContext();

    const result = await appRouter.createCaller(ctx).auth.register({
      name: "Ana",
      email: "Ana@Example.com",
      password: "UnaClaveMuyLarga#2026",
    });

    expect(result).toEqual({ success: true, sessionToken: "local-session-token", user: { name: "Ana", email: "ana@example.com" } });
    expect(mocks.insertedUsers[0]).toMatchObject({ email: "ana@example.com", loginMethod: "email_password" });
    expect(mocks.insertedCredentials[0]).toMatchObject({ userId: 44, email: "ana@example.com" });
    expect(String(mocks.insertedCredentials[0]?.passwordHash)).not.toContain("UnaClaveMuyLarga#2026");
    expect(cookie).toHaveBeenCalledWith("app_session_id", "local-session-token", expect.objectContaining({ httpOnly: true, secure: true }));
  });

  it("rechaza una contraseña corta antes de persistir una cuenta", async () => {
    const { ctx } = createContext();
    mocks.insertedUsers.length = 0;
    mocks.insertedCredentials.length = 0;

    await expect(appRouter.createCaller(ctx).auth.register({
      name: "Ana",
      email: "ana@example.com",
      password: "corta",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(mocks.insertedUsers).toHaveLength(0);
    expect(mocks.insertedCredentials).toHaveLength(0);
  });
});

describe("auth.requestPasswordReset", () => {
  it("expone la ruta de recuperación como habilitada sin revelar ni enviar correo para una cuenta inexistente", async () => {
    const { ctx } = createContext();
    const result = await appRouter.createCaller(ctx).auth.requestPasswordReset({ email: "prueba-controlada-sin-cuenta@example.invalid" });

    expect(result).toMatchObject({
      success: true,
      deliveryReady: true,
      message: "Si existe una cuenta con ese correo, enviaremos instrucciones. Si no ves el mensaje en unos minutos, revisa spam o solicita otro enlace.",
    });
  });
});

describe("auth.securityStatus", () => {
  it("muestra el estado técnico y eventos propios sin exponer correos, tokens ni hashes", async () => {
    const { ctx } = createContext();
    ctx.user = { id: 44, openId: "local_test", name: "Ana", email: "ana@example.com", loginMethod: "email_password", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };

    const result = await appRouter.createCaller(ctx).auth.securityStatus();

    expect(result).toMatchObject({ emailRecoveryEnabled: true, channelLabel: "Canal habilitado", senderLabel: "Remitente configurado", events: [] });
    expect(JSON.stringify(result)).not.toMatch(/ana@example\.com|token|hash/i);
  });
});

describe("auth.changePassword", () => {
  const authenticatedUser = { id: 44, openId: "local_test", name: "Ana", email: "ana@example.com", loginMethod: "email_password", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };

  it("rechaza el cambio cuando no existe una sesión autenticada", async () => {
    const { ctx } = createContext();

    await expect(appRouter.createCaller(ctx).auth.changePassword({ currentPassword: "ContraseñaAnterior#2026", newPassword: "ContraseñaNueva#2026" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("exige la contraseña actual y no altera credenciales cuando no coincide", async () => {
    const { ctx } = createContext();
    ctx.user = authenticatedUser;
    mocks.credential = { id: 7, userId: 44, passwordHash: await hashPassword("ContraseñaAnterior#2026") };
    mocks.changedPasswordHashes.length = 0;

    await expect(appRouter.createCaller(ctx).auth.changePassword({ currentPassword: "NoCoincide#2026", newPassword: "ContraseñaNueva#2026" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    expect(mocks.changedPasswordHashes).toHaveLength(0);
  });

  it("actualiza únicamente la contraseña de la sesión, invalida recuperaciones y registra un evento mínimo", async () => {
    const { ctx } = createContext();
    ctx.user = authenticatedUser;
    mocks.credential = { id: 7, userId: 44, passwordHash: await hashPassword("ContraseñaAnterior#2026") };
    mocks.changedPasswordHashes.length = 0;
    mocks.deletedRecoveryTokensFor.length = 0;
    mocks.insertedSecurityEvents.length = 0;

    const result = await appRouter.createCaller(ctx).auth.changePassword({ currentPassword: "ContraseñaAnterior#2026", newPassword: "ContraseñaNueva#2026" });

    expect(result).toEqual({ success: true });
    expect(mocks.changedPasswordHashes[0]).toBeTruthy();
    expect(mocks.changedPasswordHashes[0]).not.toContain("ContraseñaNueva#2026");
    expect(mocks.deletedRecoveryTokensFor).toEqual([44]);
    expect(mocks.insertedSecurityEvents).toEqual([{ userId: 44, eventType: "password_changed", sourceLabel: "authenticated_session" }]);
    expect(JSON.stringify(mocks.insertedSecurityEvents)).not.toMatch(/Contraseña|hash|token/i);
  });
});
