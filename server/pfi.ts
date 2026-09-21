// Perfil Financiero Inteligente (PFI) — lógica pura del onboarding conversacional
// guiado por Richi. Sin llamadas a base de datos ni a LLM: solo deriva valores a
// partir de las respuestas ya recolectadas, para que sea fácil de probar.

export type RiskScenarioAnswer = "retiro" | "espero" | "invierto_mas";
export type RiskTolerance = "low" | "medium_low" | "medium" | "medium_high" | "high";

const RISK_SCENARIO_SCORE: Record<RiskScenarioAnswer, number> = {
  retiro: 0,
  espero: 1,
  invierto_mas: 2,
};

/**
 * Deriva la tolerancia al riesgo (enum de 5 niveles ya existente en
 * financialProfiles) a partir de las 2 preguntas de escenario de la pantalla 9.
 * La usuaria nunca ve "conservador/moderado/agresivo" ni los nombres del enum.
 */
export function derivePfiRiskTolerance(answer1: RiskScenarioAnswer, answer2: RiskScenarioAnswer): RiskTolerance {
  const total = RISK_SCENARIO_SCORE[answer1] + RISK_SCENARIO_SCORE[answer2];
  if (total === 0) return "low";
  if (total === 1) return "medium_low";
  if (total === 2) return "medium";
  if (total === 3) return "medium_high";
  return "high";
}

export type PfiModuleInputs = {
  occupationTags: string[] | null | undefined;
  hasActiveDebtsDeclared: boolean | null | undefined;
  goalCount: number;
};

export const PFI_ALWAYS_ON_MODULES = ["coreview", "controlhub", "moneylink", "wealthmap", "crediscore"] as const;

/**
 * Calcula qué módulos quedan activos al completar el PFI (pantalla 14). Los
 * módulos que no aparecen aquí quedan "disponibles, no activados" — se activan
 * después manualmente desde Configuración (coherente con el documento de diseño).
 * No incluye GrowVault: siempre se difiere a Configuración, nunca se activa en
 * el onboarding.
 */
export function derivePfiActiveModules(inputs: PfiModuleInputs): string[] {
  const modules = new Set<string>(PFI_ALWAYS_ON_MODULES);
  const occupationTags = inputs.occupationTags ?? [];
  const hasBusiness = occupationTags.includes("business");
  const isSelfEmployed = occupationTags.includes("self_employed");

  if (inputs.hasActiveDebtsDeclared) modules.add("debtcenter");
  if (hasBusiness || isSelfEmployed) modules.add("bookpro_taxzen");
  if (hasBusiness) modules.add("netlink");
  if (inputs.goalCount > 0) modules.add("lifegoals");

  return Array.from(modules);
}
