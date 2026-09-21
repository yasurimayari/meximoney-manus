export type TaxRegime = "pfae_general" | "resico" | "estimacion_directa_simplificada" | "estimacion_directa_normal" | "other" | "not_applicable";

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
  taxRegime: TaxRegime | null;
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

type TaxRegimeOption = { value: TaxRegime; label: string };

const DEFAULT_TAX_REGIME_OPTIONS: readonly TaxRegimeOption[] = [{ value: "other", label: "Otro / no estoy segura" }];

// Un país sin lista propia cae en DEFAULT_TAX_REGIME_OPTIONS. Agregar un país
// nuevo es solo agregar una entrada aquí -- no toca ScreenTaxSituation.
export const TAX_REGIME_OPTIONS_BY_COUNTRY: Record<string, readonly TaxRegimeOption[]> = {
  "México": [
    { value: "pfae_general", label: "PFAE · Régimen general" },
    { value: "resico", label: "RESICO" },
    { value: "other", label: "Otro / no estoy segura" },
  ],
  "España": [
    { value: "estimacion_directa_simplificada", label: "Estimación Directa Simplificada" },
    { value: "estimacion_directa_normal", label: "Estimación Directa Normal" },
    { value: "other", label: "Otro / no estoy segura" },
  ],
};

export function taxRegimeOptionsForCountry(country: string | undefined): readonly TaxRegimeOption[] {
  return (country && TAX_REGIME_OPTIONS_BY_COUNTRY[country]) || DEFAULT_TAX_REGIME_OPTIONS;
}
