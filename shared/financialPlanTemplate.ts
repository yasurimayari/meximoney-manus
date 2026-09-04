export const NOTION_FINANCIAL_PLAN_URL = "https://app.notion.com/p/yasurimayari-consulting/Plan-Financiero-Jul-Dic-2026-Ingresos-Irregulares-6db95fd49ae448b88d42857e50dd23c0";

export const financialPlanTemplate = {
  title: "Plan Financiero Jul–Dic 2026 · Ingresos Irregulares",
  currency: "MXN",
  status: "active" as const,
  startsAt: "2026-07-13",
  endsAt: "2026-12-31",
  guidingRule: "No planeas sobre lo que esperas ganar; planeas sobre lo que ya entró.",
  notes: `Fuente: ${NOTION_FINANCIAL_PLAN_URL}\n\nPlan diseñado para ingresos irregulares e inestables. Revisión mensual el día 1, cobro antes que pago los lunes y revisión de escenario el día 20. Los ingresos extraordinarios reciben un destino asignado antes de aumentar el estilo de vida.\n\nObjetivo operativo: cubrir el piso vital, frenar el daño financiero, mantener compromisos operativos, regularizar SAT y personas, construir colchón y dirigir excedentes a avalancha. Este contenido es una guía editable; no ejecuta pagos ni crea movimientos.`,
  levels: [
    { position: 0, title: "Piso vital", monthlyTargetCents: 1452000, activationRule: "Primero cubrir vivienda, alimentación, salud, internet, transporte y agua.", notes: "Supermercado, renta, salud, internet, transporte y agua." },
    { position: 1, title: "Frenar el daño", monthlyTargetCents: 532600, activationRule: "Activar después del piso vital; cubrir mínimos y servicios críticos.", notes: "Movistar y mínimos de tarjetas; no contratar deuda nueva de alta tasa." },
    { position: 2, title: "Obligatorio operativo", monthlyTargetCents: 706100, activationRule: "Cubrir financiaciones y herramientas operativas después de los niveles 0 y 1.", notes: "Financiaciones, software esencial y combustible; revisar recortes." },
    { position: 3, title: "SAT + personas", monthlyTargetCents: 465000, activationRule: "Regularizar obligaciones fiscales y compromisos personales con pagos documentados.", notes: "Parcialidades SAT, abonos a personas y compromisos prioritarios." },
    { position: 4, title: "Colchón", monthlyTargetCents: 182300, activationRule: "Activar sólo cuando los niveles obligatorios estén cubiertos.", notes: "Fondo de emergencia y apartados para seguros o activos." },
    { position: 5, title: "Avalancha", monthlyTargetCents: 0, activationRule: "Todo excedente se dirige a la deuda prioritaria por coste, sin ejecutar pagos desde la app.", notes: "Priorizar deuda cara y reducir utilización de tarjetas." },
    { position: 6, title: "Opcional", monthlyTargetCents: 100000, activationRule: "Sólo si el nivel 4 está cubierto y el ingreso real lo permite.", notes: "Restaurante y ocio quedan subordinados al plan." },
  ],
  scenarios: [
    { title: "Mes malo", incomeFloorCents: null, incomeCeilingCents: 1600000, allocationThroughPosition: 0, guidance: "Cubrir sólo el piso vital y servicios críticos; activar cobranza intensiva y avisar antes de incumplir.", colorKey: "rose" as const },
    { title: "Mes base", incomeFloorCents: 1600000, incomeCeilingCents: 2500000, allocationThroughPosition: 2, guidance: "Cubrir piso, frenar daño y parte de lo operativo; no asignar gasto opcional.", colorKey: "amber" as const },
    { title: "Mes medio", incomeFloorCents: 2500000, incomeCeilingCents: 3500000, allocationThroughPosition: 4, guidance: "Cubrir obligaciones, SAT, personas, fondo de emergencia y apartados.", colorKey: "emerald" as const },
    { title: "Mes bueno", incomeFloorCents: 3500000, incomeCeilingCents: null, allocationThroughPosition: 5, guidance: "Dirigir el excedente completo a la avalancha; no convertir ingresos extraordinarios en estilo de vida.", colorKey: "sky" as const },
  ],
  periods: [
    { periodStart: "2026-07", expectedIncomeCents: 0, plannedCommitmentsCents: 3114600, plannedSavingsCents: 0, status: "complete" as const, notes: "ISR/IVA de junio, DIOT y cortes de tarjetas identificados en el plan original." },
    { periodStart: "2026-08", expectedIncomeCents: 2000000, plannedCommitmentsCents: 3324600, plannedSavingsCents: 50000, status: "complete" as const, notes: "Liquidez de emergencia, cobranza de CxC y primera parcialidad SAT." },
    { periodStart: "2026-09", expectedIncomeCents: 2500000, plannedCommitmentsCents: 3114600, plannedSavingsCents: 150000, status: "draft" as const, notes: "Avalancha en marcha y reactivación de ingresos propios." },
    { periodStart: "2026-10", expectedIncomeCents: 3000000, plannedCommitmentsCents: 3324600, plannedSavingsCents: 110000, status: "draft" as const, notes: "Estabilización, SAT al corriente y reducción de utilización." },
    { periodStart: "2026-11", expectedIncomeCents: 3500000, plannedCommitmentsCents: 3982500, plannedSavingsCents: 72500, status: "draft" as const, notes: "Mes pesado por renovación del seguro; usar apartados acumulados." },
    { periodStart: "2026-12", expectedIncomeCents: 3500000, plannedCommitmentsCents: 3264600, plannedSavingsCents: 100000, status: "draft" as const, notes: "Cierre anual, deducciones y asignación de ingresos extraordinarios a tarjetas." },
  ],
} as const;

export const dateAtNoonUtc = (value: string) => {
  const timestamp = value.length === 7 ? `${value}-01` : value;
  return new Date(`${timestamp}T12:00:00Z`);
};

export const centsForPlanTemplate = (value: number) => Math.max(0, Math.round(value));
