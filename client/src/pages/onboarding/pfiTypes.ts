export type PfiAnswers = {
  displayName: string;
  avatarUrl: string;
  financialKnowledgeLevel: "beginner" | "intermediate" | "advanced" | null;
  occupationTags: string[];
  residenceCountries: string[];
  activeCurrencies: string[];
  incomeSourceTags: string[];
  businesses: Array<{ name: string; activityDescription: string; countryCode: string }>;
  hasActiveDebtsDeclared: boolean | null;
  approxDebtCount: number | null;
  approxAccountCount: number | null;
  taxRegime: "pfae_general" | "resico" | "other" | "not_applicable" | null;
  riskScenario1Answer: "retiro" | "espero" | "invierto_mas" | null;
  riskScenario2Answer: "retiro" | "espero" | "invierto_mas" | null;
  goals: Array<{ name: string; targetCents: number; targetDate: number | null }>;
  communicationStyle: "direct" | "detailed" | "motivational" | null;
  channels: { inApp: boolean; telegram: boolean; email: boolean };
  consentAccepted: boolean;
};

export function emptyPfiAnswers(seed: Partial<PfiAnswers> = {}): PfiAnswers {
  return {
    displayName: "",
    avatarUrl: "",
    financialKnowledgeLevel: null,
    occupationTags: [],
    residenceCountries: [],
    activeCurrencies: [],
    incomeSourceTags: [],
    businesses: [],
    hasActiveDebtsDeclared: null,
    approxDebtCount: null,
    approxAccountCount: null,
    taxRegime: null,
    riskScenario1Answer: null,
    riskScenario2Answer: null,
    goals: [],
    communicationStyle: null,
    channels: { inApp: true, telegram: false, email: false },
    consentAccepted: false,
    ...seed,
  };
}

export const OCCUPATION_OPTIONS = [
  { value: "self_employed", label: "Trabajo por cuenta propia / soy autónoma" },
  { value: "business", label: "Tengo uno o más negocios" },
  { value: "employee", label: "Trabajo para alguien más (empleada)" },
  { value: "retired", label: "Estoy jubilada / vivo de una pensión" },
  { value: "no_income", label: "Actualmente no tengo ingreso propio" },
  { value: "other", label: "Otra situación" },
];

export const INCOME_SOURCE_OPTIONS = [
  { value: "salary", label: "Salario" },
  { value: "pension", label: "Pensión" },
  { value: "business", label: "Negocio propio" },
  { value: "rental", label: "Rentas / alquiler" },
  { value: "investment", label: "Inversiones" },
  { value: "family_support", label: "Apoyo familiar" },
  { value: "other", label: "Otro" },
];

export const COUNTRY_OPTIONS = [
  { value: "México", label: "México" },
  { value: "España", label: "España" },
  { value: "Estados Unidos", label: "Estados Unidos" },
  { value: "Otro", label: "Otro" },
];

export const CURRENCY_OPTIONS = [
  { value: "MXN", label: "MXN · Peso mexicano" },
  { value: "USD", label: "USD · Dólar estadounidense" },
  { value: "EUR", label: "EUR · Euro" },
];

export const RISK_SCENARIO_OPTIONS = [
  { value: "retiro", label: "Lo retiro de inmediato" },
  { value: "espero", label: "Espero sin hacer nada" },
  { value: "invierto_mas", label: "Aprovecho para poner más" },
] as const;
