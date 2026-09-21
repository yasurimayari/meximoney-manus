import { jsPDF } from "jspdf";
import { actualsForFinancialPlanMonth, financialPlanCoverage, financialPlanScenarioProjectedIncomeCents } from "@/lib/financialPlanUtils";

export type FinancialPlanExportInput = {
  plan: { id: number; projectId: number; title: string; currency: string; guidingRule?: string | null };
  periods: Array<{ periodStart: Date | string; expectedIncomeCents: number; plannedCommitmentsCents: number; plannedSavingsCents: number; status?: string | null }>;
  scenarios: Array<{ title: string; incomeFloorCents: number | null; incomeCeilingCents: number | null; allocationThroughPosition?: number | null; guidance?: string | null }>;
  transactions: Array<{ projectId: number | null; type: "income" | "expense" | "transfer_in" | "transfer_out" | "transfer"; status: "confirmed" | "estimated" | "needs_review"; currency: string; reportCurrency?: string | null; amountCents: number; reportAmountCents?: number | null; occurredAt: Date | string; goalId?: number | null; investmentId?: number | null }>;
};

function money(value: number, currency: string) { return new Intl.NumberFormat("es-MX", { style: "currency", currency, minimumFractionDigits: 2 }).format(value / 100); }
function safeName(value: string) { return value.toLocaleLowerCase("es-MX").replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/(^-|-$)/g, "") || "plan-financiero"; }
function scenarioRange(scenario: FinancialPlanExportInput["scenarios"][number], currency: string) { const floor = scenario.incomeFloorCents == null ? "sin mínimo" : money(scenario.incomeFloorCents, currency); const ceiling = scenario.incomeCeilingCents == null ? "sin máximo" : money(scenario.incomeCeilingCents, currency); return `${floor} – ${ceiling}`; }

export function exportFinancialPlanPdf({ plan, periods, scenarios, transactions }: FinancialPlanExportInput) {
  const document = new jsPDF({ unit: "pt", format: "a4" });
  const width = document.internal.pageSize.getWidth();
  const height = document.internal.pageSize.getHeight();
  let y = 46;
  const header = (continued = false) => { document.setFillColor(0, 91, 81); document.rect(0, 0, width, continued ? 48 : 108, "F"); document.setTextColor(255, 255, 255); document.setFont("helvetica", "bold"); document.setFontSize(17); document.text(continued ? "Plan financiero · continuación" : "Richeon · Plan financiero", 42, 37); if (!continued) { document.setFont("helvetica", "normal"); document.setFontSize(9); document.text(plan.title, 42, 60); document.text(`Generado el ${new Date().toLocaleDateString("es-MX")} · Información manual`, 42, 80); } y = continued ? 76 : 138; };
  const ensureSpace = (space: number) => { if (y + space > height - 44) { document.addPage(); header(true); } };
  const section = (title: string) => { ensureSpace(30); document.setTextColor(28, 56, 54); document.setFont("helvetica", "bold"); document.setFontSize(12); document.text(title, 42, y); y += 20; };
  const line = (text: string, color: [number, number, number] = [28, 56, 54]) => { ensureSpace(16); document.setTextColor(...color); document.setFont("helvetica", "normal"); document.setFontSize(8); document.text(text, 50, y); y += 13; };
  const tableHeader = (labels: string[], positions: number[]) => { ensureSpace(28); document.setFillColor(238, 245, 243); document.rect(42, y - 15, width - 84, 19, "F"); document.setTextColor(44, 75, 71); document.setFont("helvetica", "bold"); document.setFontSize(7); labels.forEach((label, index) => document.text(label, positions[index], y - 3, { align: index ? "right" : "left" })); y += 14; };

  header();
  document.setTextColor(28, 56, 54); document.setFont("helvetica", "normal"); document.setFontSize(9); document.text(`Moneda: ${plan.currency}`, 42, y); y += 15;
  if (plan.guidingRule) { const wrapped = document.splitTextToSize(`Regla guía: ${plan.guidingRule}`, width - 84); ensureSpace(wrapped.length * 12 + 8); document.setTextColor(90, 107, 104); document.text(wrapped, 42, y); y += wrapped.length * 12 + 10; }

  section("Escenarios de ingresos irregulares");
  if (!scenarios.length) line("Sin escenarios definidos.", [90, 107, 104]);
  scenarios.forEach(scenario => { const range = scenarioRange(scenario, plan.currency); line(`${scenario.title} · Rango: ${range} · Hasta prioridad ${scenario.allocationThroughPosition ?? 0}`); if (scenario.guidance) line(`Guía: ${scenario.guidance}`, [90, 107, 104]); });

  section("Cobertura mensual y seguimiento");
  const positions = [50, 146, 238, 332, 426, width - 50];
  tableHeader(["MES", "INGRESO PLAN", "COMPROMISOS", "AHORRO", "INGRESO REAL", "COBERTURA"], positions);
  if (!periods.length) line("Sin meses planificados.", [90, 107, 104]);
  periods.forEach(period => { const actuals = actualsForFinancialPlanMonth(transactions, plan.projectId, plan.currency, period.periodStart); const coverage = financialPlanCoverage(period.expectedIncomeCents, period.plannedCommitmentsCents); ensureSpace(18); document.setFont("helvetica", "normal"); document.setFontSize(7.3); const tone: [number, number, number] = coverage.isCovered ? [28, 56, 54] : [167, 35, 55]; document.setTextColor(...tone); const values = [new Date(period.periodStart).toLocaleDateString("es-MX", { month: "short", year: "numeric" }), money(period.expectedIncomeCents, plan.currency), money(period.plannedCommitmentsCents, plan.currency), money(period.plannedSavingsCents, plan.currency), money(actuals.incomeCents, plan.currency), coverage.isCovered ? `${coverage.coveragePercent}%` : `Déficit ${money(coverage.shortfallCents, plan.currency)}`]; values.forEach((value, index) => document.text(value, positions[index], y, { align: index ? "right" : "left" })); y += 14; });

  section("Detalle de escenarios por mes");
  scenarios.forEach(scenario => { ensureSpace(24); document.setFont("helvetica", "bold"); document.setFontSize(9); document.setTextColor(28, 56, 54); document.text(scenario.title, 42, y); y += 14; periods.forEach(period => { const projected = financialPlanScenarioProjectedIncomeCents(scenario, period.expectedIncomeCents); const coverage = financialPlanCoverage(projected, period.plannedCommitmentsCents); line(`${new Date(period.periodStart).toLocaleDateString("es-MX", { month: "short", year: "numeric" })}: proyectado ${money(projected, plan.currency)} · compromisos ${money(period.plannedCommitmentsCents, plan.currency)} · ${coverage.isCovered ? `${coverage.coveragePercent}% cubierto` : `déficit ${money(coverage.shortfallCents, plan.currency)}`}`, coverage.isCovered ? [28, 56, 54] : [167, 35, 55]); }); });

  const pageCount = document.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) { document.setPage(page); document.setFont("helvetica", "normal"); document.setFontSize(7.2); document.setTextColor(90, 107, 104); document.text(`Richeon · Página ${page} de ${pageCount} · Revisión manual`, width - 42, height - 24, { align: "right" }); }
  document.save(`meximoney-plan-financiero-${safeName(plan.title)}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
