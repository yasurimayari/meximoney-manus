import { describe, expect, it } from "vitest";
import { derivePfiActiveModules, derivePfiRiskTolerance } from "./pfi";

describe("derivePfiRiskTolerance", () => {
  it("ambas respuestas conservadoras dan riesgo bajo", () => {
    expect(derivePfiRiskTolerance("retiro", "retiro")).toBe("low");
  });
  it("una conservadora y una neutral dan riesgo bajo-medio", () => {
    expect(derivePfiRiskTolerance("retiro", "espero")).toBe("medium_low");
  });
  it("ambas neutrales dan riesgo medio", () => {
    expect(derivePfiRiskTolerance("espero", "espero")).toBe("medium");
  });
  it("una neutral y una arriesgada dan riesgo medio-alto", () => {
    expect(derivePfiRiskTolerance("espero", "invierto_mas")).toBe("medium_high");
  });
  it("ambas arriesgadas dan riesgo alto", () => {
    expect(derivePfiRiskTolerance("invierto_mas", "invierto_mas")).toBe("high");
  });
});

describe("derivePfiActiveModules", () => {
  it("sin negocio, sin deudas y sin objetivos solo activa el núcleo siempre disponible", () => {
    const result = derivePfiActiveModules({ occupationTags: ["employee"], hasActiveDebtsDeclared: false, goalCount: 0 });
    expect(result).toEqual(["coreview", "controlhub", "moneylink", "wealthmap", "crediscore"]);
  });

  it("declarar deudas activa DebtCenter", () => {
    const result = derivePfiActiveModules({ occupationTags: ["employee"], hasActiveDebtsDeclared: true, goalCount: 0 });
    expect(result).toContain("debtcenter");
  });

  it("declarar negocio activa BookPro+TaxZen y NetLink", () => {
    const result = derivePfiActiveModules({ occupationTags: ["business"], hasActiveDebtsDeclared: false, goalCount: 0 });
    expect(result).toContain("bookpro_taxzen");
    expect(result).toContain("netlink");
  });

  it("ser autónoma activa BookPro+TaxZen pero no NetLink", () => {
    const result = derivePfiActiveModules({ occupationTags: ["self_employed"], hasActiveDebtsDeclared: false, goalCount: 0 });
    expect(result).toContain("bookpro_taxzen");
    expect(result).not.toContain("netlink");
  });

  it("agregar al menos un objetivo activa LifeGoals", () => {
    const result = derivePfiActiveModules({ occupationTags: ["employee"], hasActiveDebtsDeclared: false, goalCount: 2 });
    expect(result).toContain("lifegoals");
  });

  it("nunca incluye GrowVault (queda diferido a Configuración)", () => {
    const result = derivePfiActiveModules({ occupationTags: ["business", "self_employed"], hasActiveDebtsDeclared: true, goalCount: 3 });
    expect(result).not.toContain("growvault");
  });

  it("tags de ocupación vacíos o ausentes no rompen el cálculo", () => {
    expect(() => derivePfiActiveModules({ occupationTags: null, hasActiveDebtsDeclared: null, goalCount: 0 })).not.toThrow();
  });
});
