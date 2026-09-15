export type BaselineSnapshot = {
  profile?: { humanReviewRequired?: boolean; personalProfileConsent?: boolean } | null;
  entities?: Array<{ status?: string }>;
  accounts?: unknown[];
  creditCards?: unknown[];
  transactions?: Array<{ accountId?: number | null; creditCardId?: number | null; debtId?: number | null; categoryId?: number | null; reconciledAt?: Date | string | null; status?: string; reviewStatus?: string; type?: string }>;
  debts?: unknown[];
  investments?: unknown[];
  documents?: unknown[];
  goals?: unknown[];
  tasks?: unknown[];
  calendarEvents?: unknown[];
  qualityIssues?: unknown[];
};

export type BaselineMetric = {
  key: "payment" | "category" | "review" | "reconciliation";
  label: string;
  value: number;
  total: number;
  ratio: number | null;
  target: number;
};

const percent = (value: number, total: number) => total > 0 ? Math.round((value / total) * 1000) / 10 : null;

export function buildBaselineMetrics(snapshot: BaselineSnapshot) {
  const transactions = snapshot.transactions ?? [];
  const cashFlow = transactions.filter(item => item.type === "income" || item.type === "expense");
  const linkedPayment = transactions.filter(item => item.accountId || item.creditCardId || item.debtId);
  const categorised = cashFlow.filter(item => item.categoryId);
  const reviewed = transactions.filter(item => item.status === "confirmed" && item.reviewStatus === "approved");
  const reconciled = linkedPayment.filter(item => item.reconciledAt);

  const metrics: BaselineMetric[] = [
    { key: "payment", label: "Medio de pago", value: linkedPayment.length, total: transactions.length, ratio: percent(linkedPayment.length, transactions.length), target: 100 },
    { key: "category", label: "Categoría", value: categorised.length, total: cashFlow.length, ratio: percent(categorised.length, cashFlow.length), target: 95 },
    { key: "review", label: "Revisión", value: reviewed.length, total: transactions.length, ratio: percent(reviewed.length, transactions.length), target: 95 },
    { key: "reconciliation", label: "Conciliación", value: reconciled.length, total: linkedPayment.length, ratio: percent(reconciled.length, linkedPayment.length), target: 80 },
  ];

  return {
    metrics,
    inventory: [
      { label: "Entidades", value: snapshot.entities?.length ?? 0, detail: `${snapshot.entities?.filter(entity => entity.status === "active").length ?? 0} activas` },
      { label: "Medios de pago", value: (snapshot.accounts?.length ?? 0) + (snapshot.creditCards?.length ?? 0), detail: `${snapshot.accounts?.length ?? 0} cuentas · ${snapshot.creditCards?.length ?? 0} tarjetas` },
      { label: "Movimientos", value: transactions.length, detail: `${cashFlow.length} ingresos o gastos` },
      { label: "Documentos", value: snapshot.documents?.length ?? 0, detail: "Metadatos privados" },
      { label: "Planificación", value: (snapshot.goals?.length ?? 0) + (snapshot.tasks?.length ?? 0) + (snapshot.calendarEvents?.length ?? 0), detail: `${snapshot.goals?.length ?? 0} objetivos · ${snapshot.tasks?.length ?? 0} tareas` },
      { label: "Patrimonio", value: (snapshot.debts?.length ?? 0) + (snapshot.investments?.length ?? 0), detail: `${snapshot.debts?.length ?? 0} deudas · ${snapshot.investments?.length ?? 0} inversiones` },
    ],
    privacy: {
      humanReviewRequired: snapshot.profile?.humanReviewRequired ?? true,
      personalProfileConsent: snapshot.profile?.personalProfileConsent ?? false,
      openQualityIssues: snapshot.qualityIssues?.length ?? 0,
    },
  };
}
