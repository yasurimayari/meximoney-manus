import { describe, expect, it } from "vitest";
import { passwordResetRequestResponse } from "./passwordResetResponse";

describe("respuesta de solicitud de recuperación", () => {
  it("mantiene un aviso no enumerativo y ofrece una acción segura cuando el canal está activo", () => {
    expect(passwordResetRequestResponse(true)).toEqual({
      success: true,
      deliveryReady: true,
      message: "Si existe una cuenta con ese correo, enviaremos instrucciones. Si no ves el mensaje en unos minutos, revisa spam o solicita otro enlace.",
    });
  });

  it("no afirma entrega mientras el canal está deshabilitado", () => {
    expect(passwordResetRequestResponse(false).message).toContain("se activará");
  });
});
