import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  createSessionToken: vi.fn(),
  insertedUsers: [] as Record<string, unknown>[],
  insertedCredentials: [] as Record<string, unknown>[],
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
          limit: async () => table[Symbol.for("drizzle:Name")] === "localCredentials" ? [] : [{ id: 44, openId: "local_test", name: "Ana", email: "ana@example.com", loginMethod: "email_password", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }],
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
