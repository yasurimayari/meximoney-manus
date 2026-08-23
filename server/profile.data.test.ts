import { describe, expect, it } from "vitest";
import { financialProfiles } from "../drizzle/schema";
import { requiresPersonalProfileConsent } from "./profilePrivacy";

describe("perfil privado", () => {
  it("declara campos personales y una referencia de avatar, sin almacenar bytes de imagen", () => {
    const columns = financialProfiles as typeof financialProfiles & Record<string, { name?: string }>;

    expect(columns.displayName?.name).toBe("displayName");
    expect(columns.birthDate?.name).toBe("birthDate");
    expect(columns.residenceCity?.name).toBe("residenceCity");
    expect(columns.contactEmail?.name).toBe("contactEmail");
    expect(columns.avatarKey?.name).toBe("avatarKey");
    expect(columns.avatarUrl?.name).toBe("avatarUrl");
    expect(columns.personalProfileConsent?.name).toBe("personalProfileConsent");
    expect(Object.keys(columns)).not.toContain("avatarBytes");
  });

  it("requiere consentimiento de servidor sólo cuando se envían datos personales", () => {
    expect(requiresPersonalProfileConsent({}, false)).toBe(false);
    expect(requiresPersonalProfileConsent({ displayName: "Yasuri" }, false)).toBe(true);
    expect(requiresPersonalProfileConsent({ contactEmail: "persona@example.com" }, true)).toBe(false);
  });
});
