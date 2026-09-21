import type { ReactNode } from "react";
import { MoneyText } from "@/components/MoneyText";
import { WorkspaceFilterBar, emptyWorkspaceFilters, filterWorkspaceSnapshot } from "@/components/WorkspaceFilterBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { budgetTypeLabel, calculateBudgetVsActual, latestBudgetPeriodValue } from "@/lib/budgetVsActual";
import { displayAmountCents } from "@/lib/amountTone";
import { formatDate, formatMoney, fromCents, toCents } from "@/lib/finance";
import { trpc } from "@/lib/trpc";
import { dashboardPeriodQuery } from "@/lib/dashboardPeriod";
import { allocateSurplus, applyCashFlowScenario, buildCashFlowBaseline, collectSimulationDebts, debtSimulationSummaryState, simulateDebtPayoff, type DebtStrategy, type SimulationDebt } from "../../../shared/financialSimulation";
import { AlertTriangle, Calculator, CircleAlert, Coins, CreditCard, Landmark, PiggyBank, Save, Scale, ShieldCheck, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type SimulationTab = "debts" | "cashflow" | "budget" | "surplus";
type PolicyForm = { reserve: string; debt: string; savings: string; investment: string; notes: string };

const emptyPolicy: PolicyForm = { reserve: "100", debt: "0", savings: "0", investment: "0", notes: "" };

function sameMonth(value: Date | string, period: Date) {
  const date = new Date(value);
  return date.getFullYear() === period.getFullYear() && date.getMonth() === period.getMonth();
}

function budgetDisplayCents(type: string, cents: number) {
  return displayAmountCents(cents, type === "expense" ? "expense" : type === "savings" || type === "investment" ? "asset" : "income");
}

function SimulationBoundary() {
  return <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-sm text-amber-950"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-700"/><p><strong>Solo simulación.</strong> Los resultados usan tus registros manuales y las hipótesis de esta pantalla. No ejecutan pagos, inversiones, transferencias ni cambios de presupuesto.</p></div>;
}

function MetricCard({ label, value, attention = false }: { label: string; value: ReactNode; attention?: boolean }) {
  return <div className="rounded-xl bg-muted/60 p-4"><span className="text-xs text-muted-foreground">{label}</span><strong className={`mt-1 block text-xl ${attention ? "text-amber-800" : ""}`}>{value}</strong></div>;
}

function AllocationCard({ icon: Icon, label, value, currency }: { icon: typeof Landmark; label: string; value: number; currency: string }) {
  return <article className="rounded-xl border bg-muted/30 p-4"><Icon className="size-4 text-primary"/><p className="mt-3 text-sm text-muted-foreground">{label}</p><strong className="mt-1 block text-xl"><MoneyText cents={value} currency={currency} /></strong></article>;
}

export default function Simulations() {
  const { data, isLoading } = trpc.finance.dashboard.useQuery(dashboardPeriodQuery);
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<SimulationTab>("debts");
  const [workspaceFilters, setWorkspaceFilters] = useState(emptyWorkspaceFilters);
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [budgetPeriod, setBudgetPeriod] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<DebtStrategy>("avalanche");
  const [extraPayment, setExtraPayment] = useState("0");
  const [debtInputs, setDebtInputs] = useState<Record<string, { rate: string; minimum: string }>>({});
  const [incomeAdjustment, setIncomeAdjustment] = useState("0");
  const [expenseAdjustment, setExpenseAdjustment] = useState("0");
  const [scenarioDebtExtra, setScenarioDebtExtra] = useState("0");
  const [budgetAdjustment, setBudgetAdjustment] = useState("0");
  const [surplus, setSurplus] = useState("0");
  const [policy, setPolicy] = useState<PolicyForm>(emptyPolicy);

  const scopedData = data ? filterWorkspaceSnapshot(data, workspaceFilters) : null;
  const currency = data?.profile?.currency ?? data?.dashboard.reportCurrency ?? "MXN";
  const periodStart = useMemo(() => new Date(`${period}-01T12:00:00`), [period]);
  const latestBudgetPeriod = useMemo(() => latestBudgetPeriodValue(data?.budgets ?? []), [data?.budgets]);
  const activeBudgetPeriod = budgetPeriod ?? latestBudgetPeriod ?? period;
  const budgetPeriodStart = useMemo(() => new Date(`${activeBudgetPeriod}-01T12:00:00`), [activeBudgetPeriod]);
  const savePolicy = trpc.finance.surplusPolicy.save.useMutation({
    onSuccess: async () => { await utils.finance.dashboard.invalidate(); toast.success("Política de excedentes guardada. No se creó ningún movimiento."); },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    const saved = data?.surplusAllocationPolicy;
    if (!saved) return;
    setPolicy({ reserve: (saved.reserveBps / 100).toString(), debt: (saved.debtBps / 100).toString(), savings: (saved.savingsBps / 100).toString(), investment: (saved.investmentBps / 100).toString(), notes: saved.notes ?? "" });
  }, [data?.surplusAllocationPolicy?.updatedAt]);

  if (isLoading || !data || !scopedData) return <div className="page-loading">Preparando simulaciones manuales…</div>;

  const { included: sourceDebts, excludedNames } = collectSimulationDebts(scopedData, currency);
  const simulationDebts: SimulationDebt[] = sourceDebts.map(debt => {
    const override = debtInputs[debt.id];
    return {
      ...debt,
      interestRateBps: override?.rate === "" ? null : override?.rate !== undefined ? Math.round(Number(override.rate) * 100) : debt.interestRateBps,
      minimumPaymentCents: override?.minimum !== undefined ? toCents(override.minimum || "0") : debt.minimumPaymentCents,
    };
  });
  const debtResult = simulateDebtPayoff(simulationDebts, strategy, toCents(extraPayment || "0"));
  const baseline = buildCashFlowBaseline(scopedData, periodStart, currency);
  const flowScenario = applyCashFlowScenario(baseline, toCents(incomeAdjustment || "0"), toCents(expenseAdjustment || "0"), toCents(scenarioDebtExtra || "0"));
  const budgetResults = calculateBudgetVsActual(scopedData, currency).filter(result => sameMonth(result.budget.periodStart, budgetPeriodStart));
  const budgetPercent = Number(budgetAdjustment || "0") / 100;
  const policyValues = { reserveBps: Math.round(Number(policy.reserve || "0") * 100), debtBps: Math.round(Number(policy.debt || "0") * 100), savingsBps: Math.round(Number(policy.savings || "0") * 100), investmentBps: Math.round(Number(policy.investment || "0") * 100) };
  const policyTotal = policyValues.reserveBps + policyValues.debtBps + policyValues.savingsBps + policyValues.investmentBps;
  const allocation = allocateSurplus(toCents(surplus || "0"), policyValues);
  const debtSummaryState = debtSimulationSummaryState(debtResult);
  const hasDebtModelGap = debtSummaryState !== "ready";

  const updateDebtInput = (id: string, field: "rate" | "minimum", value: ReactNode, debt: SimulationDebt) => {
    setDebtInputs(current => ({ ...current, [id]: { rate: current[id]?.rate ?? (debt.interestRateBps === null ? "" : (debt.interestRateBps / 100).toString()), minimum: current[id]?.minimum ?? fromCents(debt.minimumPaymentCents), [field]: value } }));
  };
  const sensitivity = [
    { label: "Tensión hipotética", income: -0.1, expense: 0.1, tone: "text-rose-700" },
    { label: "Base registrada", income: 0, expense: 0, tone: "text-foreground" },
    { label: "Mejora hipotética", income: 0.1, expense: -0.1, tone: "text-emerald-700" },
  ].map(item => ({ ...item, result: applyCashFlowScenario(baseline, Math.round(baseline.incomeCents * item.income), Math.round(baseline.expenseCents * item.expense), toCents(scenarioDebtExtra || "0")) }));

  return <div className="space-y-7">
    <header className="page-heading"><div><p className="eyebrow">Fase D · decisión transparente</p><h1>Simulaciones</h1><p>Compara hipótesis sobre deudas, flujo, presupuesto y excedentes. Son modelos informativos, no asesoría financiera garantizada ni instrucciones de ejecución.</p></div><div className="rounded-xl border bg-muted/40 px-3 py-2 text-sm"><span className="font-semibold">Moneda de reporte:</span> {currency}</div></header>
    <WorkspaceFilterBar snapshot={data} filters={workspaceFilters} onChange={setWorkspaceFilters} />
    <Tabs className="w-full" value={tab} onValueChange={value => setTab(value as SimulationTab)}><TabsList className="planning-tabs"><TabsTrigger value="debts"><WalletCards className="mr-1.5 size-4"/>Deudas</TabsTrigger><TabsTrigger value="cashflow"><Scale className="mr-1.5 size-4"/>Flujo</TabsTrigger><TabsTrigger value="budget"><Calculator className="mr-1.5 size-4"/>Presupuesto</TabsTrigger><TabsTrigger value="surplus"><Coins className="mr-1.5 size-4"/>Excedentes</TabsTrigger></TabsList></Tabs>

    {tab === "debts" ? <section className="space-y-4"><SimulationBoundary/><section className="content-card"><div className="flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="text-lg font-semibold">Avalancha y bola de nieve</h2><p className="mt-1 text-sm text-muted-foreground">Se conserva el pago mínimo de cada obligación y el pago extra temporal se dirige a la prioridad del método elegido.</p></div><div className="flex flex-wrap gap-3"><div className="form-field min-w-44"><Label>Pago extra mensual</Label><Input type="number" min="0" step="0.01" value={extraPayment} onChange={event => setExtraPayment(event.target.value)} /></div><div className="form-field min-w-44"><Label>Método</Label><select value={strategy} onChange={event => setStrategy(event.target.value as DebtStrategy)}><option value="avalanche">Avalancha · mayor tasa</option><option value="snowball">Bola de nieve · menor saldo</option></select></div></div></div>
      {sourceDebts.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No hay deudas o tarjetas activas comparables en {currency} con los filtros elegidos.</p> : <><div className="mt-5 grid gap-3 md:grid-cols-3"><MetricCard label="Horizonte modelado" value={debtSummaryState === "incomplete" ? "Datos por completar" : debtResult.cappedAtMaximum ? "600+ meses" : `${debtResult.months} meses`} attention={hasDebtModelGap}/><MetricCard label="Interés proyectado" value={debtSummaryState === "incomplete" ? "—" : <MoneyText cents={debtResult.totalInterestCents} currency={currency} />} attention={hasDebtModelGap}/><MetricCard label="Saldo no liquidado" value={debtSummaryState === "incomplete" ? "—" : <MoneyText cents={debtResult.remainingBalanceCents} currency={currency} />} attention={hasDebtModelGap}/></div>{debtSummaryState === "partial" ? <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-sm text-amber-950"><CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-700" />Resultado parcial: los indicadores usan sólo las obligaciones con tasa y pago mínimo amortizable. Completa o ajusta las señaladas abajo para incorporarlas.</p> : null}
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead className="border-b text-left text-muted-foreground"><tr><th className="p-3">Obligación</th><th className="p-3">Origen</th><th className="p-3 text-right">Saldo</th><th className="p-3">Tasa anual usada</th><th className="p-3">Pago mínimo usado</th></tr></thead><tbody>{sourceDebts.map(debt => { const input = debtInputs[debt.id]; return <tr className="border-b" key={debt.id}><td className="p-3 font-medium">{debt.name}</td><td className="p-3">{debt.source === "credit_card" ? "Tarjeta" : "Deuda"}</td><td className="p-3 text-right"><MoneyText cents={debt.balanceCents} currency={currency} /></td><td className="p-3"><Input className="h-8 w-28" type="number" min="0" step="0.01" placeholder="Pendiente" value={input?.rate ?? (debt.interestRateBps === null ? "" : (debt.interestRateBps / 100).toString())} onChange={event => updateDebtInput(debt.id, "rate", event.target.value, debt)} /></td><td className="p-3"><Input className="h-8 w-28" type="number" min="0" step="0.01" value={input?.minimum ?? fromCents(debt.minimumPaymentCents)} onChange={event => updateDebtInput(debt.id, "minimum", event.target.value, debt)} /></td></tr>; })}</tbody></table></div>
      </>}
      {debtResult.invalidDebtNames.length || debtResult.nonAmortizingDebtNames.length || excludedNames.length ? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><div className="flex gap-2"><CircleAlert className="mt-0.5 size-4 shrink-0"/><div>{debtResult.invalidDebtNames.length ? <p><strong>No modeladas por tasa pendiente:</strong> {debtResult.invalidDebtNames.join(", ")}.</p> : null}{debtResult.nonAmortizingDebtNames.length ? <p className={debtResult.invalidDebtNames.length ? "mt-1" : ""}><strong>Pago mínimo insuficiente para cubrir el interés del primer mes:</strong> {debtResult.nonAmortizingDebtNames.join(", ")}. Ajusta sólo la hipótesis de pago mínimo para compararla.</p> : null}{excludedNames.length ? <p className={debtResult.invalidDebtNames.length || debtResult.nonAmortizingDebtNames.length ? "mt-1" : ""}><strong>Excluidas por moneda no comparable:</strong> {excludedNames.join(", ")}.</p> : null}</div></div></div> : null}
      <p className="mt-4 text-xs leading-5 text-muted-foreground">Fórmula: interés mensual = saldo inicial × tasa anual en puntos base ÷ 120,000; después se descuenta el pago mínimo y el extra. No se proyecta una obligación cuando su pago mínimo no cubre el interés inicial.</p>
    </section></section> : null}

    {tab === "cashflow" ? <section className="space-y-4"><SimulationBoundary/><section className="content-card"><div className="flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="text-lg font-semibold">Escenario de flujo mensual</h2><p className="mt-1 text-sm text-muted-foreground">Base: registros aprobados del periodo, sin traspasos ni divisas sin conversión manual.</p></div><Input className="w-[170px]" type="month" value={period} onChange={event => setPeriod(event.target.value)} /></div><div className="mt-5 grid gap-3 md:grid-cols-3"><MetricCard label="Ingresos base" value={<MoneyText cents={baseline.incomeCents} currency={currency} />}/><MetricCard label="Gastos base" value={<MoneyText cents={baseline.expenseCents} currency={currency} />}/><MetricCard label="Flujo neto base" value={<MoneyText cents={baseline.netCashFlowCents} currency={currency} />}/></div><div className="mt-5 grid gap-4 md:grid-cols-3"><div className="form-field"><Label>Ajuste hipotético de ingreso</Label><Input type="number" step="0.01" value={incomeAdjustment} onChange={event => setIncomeAdjustment(event.target.value)} /><small>Puede ser negativo.</small></div><div className="form-field"><Label>Ajuste hipotético de gasto</Label><Input type="number" step="0.01" value={expenseAdjustment} onChange={event => setExpenseAdjustment(event.target.value)} /><small>Positivo aumenta gastos.</small></div><div className="form-field"><Label>Pago extra hipotético</Label><Input type="number" min="0" step="0.01" value={scenarioDebtExtra} onChange={event => setScenarioDebtExtra(event.target.value)} /></div></div><div className="mt-5 rounded-xl border bg-primary/5 p-4"><span className="text-sm text-muted-foreground">Resultado del escenario elegido</span><strong className={`mt-1 block text-2xl ${flowScenario.netCashFlowCents >= 0 ? "amount-positive" : "amount-negative"}`}><MoneyText cents={flowScenario.netCashFlowCents} currency={currency} /></strong><p className="mt-1 text-sm text-muted-foreground"><MoneyText cents={flowScenario.incomeCents} currency={currency} /> de ingresos − <MoneyText cents={flowScenario.expenseCents} currency={currency} /> de gastos − <MoneyText cents={flowScenario.debtExtraCents} currency={currency} /> de pago extra.</p></div>{baseline.excludedForCurrencyCount ? <p className="mt-4 text-sm text-amber-800"><AlertTriangle className="mr-1 inline size-4"/>{baseline.excludedForCurrencyCount} movimiento(s) con conversión pendiente quedaron fuera de la base.</p> : null}</section><section className="content-card"><h2 className="text-lg font-semibold">Sensibilidad de ingreso y gasto</h2><p className="mt-1 text-sm text-muted-foreground">Variaciones deliberadamente simples de ±10%; no son predicciones.</p><div className="mt-4 grid gap-3 md:grid-cols-3">{sensitivity.map(item => <div className="rounded-xl border p-4" key={item.label}><p className={`font-semibold ${item.tone}`}>{item.label}</p><p className="mt-2 text-sm text-muted-foreground">Ingreso {item.income > 0 ? "+" : ""}{(item.income * 100).toFixed(0)}% · gasto {item.expense > 0 ? "+" : ""}{(item.expense * 100).toFixed(0)}%</p><strong className={`mt-3 block text-xl ${item.result.netCashFlowCents >= 0 ? "amount-positive" : "amount-negative"}`}><MoneyText cents={item.result.netCashFlowCents} currency={currency} /></strong></div>)}</div></section></section> : null}

    {tab === "budget" ? <section className="space-y-4"><SimulationBoundary/><section className="content-card"><div className="flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="text-lg font-semibold">Presupuesto adaptativo</h2><p className="mt-1 text-sm text-muted-foreground">Compara el plan y lo real con un ajuste temporal único. Al abrirse, muestra el último mes con una partida presupuestaria manual; no crea ni modifica partidas.</p></div><div className="flex gap-3"><Input className="w-[160px]" type="month" value={activeBudgetPeriod} onChange={event => setBudgetPeriod(event.target.value)} /><div className="form-field w-40"><Label>Ajuste temporal %</Label><Input type="number" step="1" value={budgetAdjustment} onChange={event => setBudgetAdjustment(event.target.value)} /></div></div></div>{budgetResults.length ? <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead className="border-b text-left text-muted-foreground"><tr><th className="p-3">Partida</th><th className="p-3">Tipo</th><th className="p-3 text-right">Planeado</th><th className="p-3 text-right">Real</th><th className="p-3 text-right">Escenario temporal</th></tr></thead><tbody>{budgetResults.map(result => { const title = result.budget.categoryId ? scopedData.categories.find((category: any) => category.id === result.budget.categoryId)?.name ?? "Categoría pendiente" : budgetTypeLabel(result.budget.type); return <tr className="border-b" key={result.budget.id}><td className="p-3 font-medium">{title}</td><td className="p-3">{budgetTypeLabel(result.budget.type)}</td><td className="p-3 text-right"><MoneyText cents={budgetDisplayCents(result.budget.type, result.budget.plannedCents)} currency={currency} /></td><td className="p-3 text-right"><MoneyText cents={budgetDisplayCents(result.budget.type, result.actualCents)} currency={currency} /></td><td className="p-3 text-right font-semibold"><MoneyText cents={budgetDisplayCents(result.budget.type, Math.max(0, Math.round(result.actualCents * (1 + budgetPercent))))} currency={currency} /></td></tr>; })}</tbody></table></div> : <p className="py-8 text-center text-sm text-muted-foreground">No hay partidas presupuestarias para {formatDate(budgetPeriodStart, { month: "long", year: "numeric" })} con los filtros elegidos. Esta vista sólo compara los presupuestos que registraste manualmente.</p>}<p className="mt-4 text-xs text-muted-foreground">Fórmula temporal: real del periodo × (1 + ajuste manual %). Las partidas de moneda no comparable conservan su exclusión actual.</p></section></section> : null}

    {tab === "surplus" ? <section className="space-y-4"><SimulationBoundary/><section className="content-card"><div className="border-b pb-4"><h2 className="text-lg font-semibold">Política personal de excedentes</h2><p className="mt-1 text-sm text-muted-foreground">Define cómo distribuirías una cifra hipotética. Esta política es una preferencia privada; no mueve dinero ni representa una recomendación de inversión.</p></div><div className="mt-5 grid gap-4 md:grid-cols-4"><PercentageInput label="Reserva %" value={policy.reserve} onChange={value => setPolicy(current => ({ ...current, reserve: value }))}/><PercentageInput label="Deuda %" value={policy.debt} onChange={value => setPolicy(current => ({ ...current, debt: value }))}/><PercentageInput label="Ahorro %" value={policy.savings} onChange={value => setPolicy(current => ({ ...current, savings: value }))}/><PercentageInput label="Inversión %" value={policy.investment} onChange={value => setPolicy(current => ({ ...current, investment: value }))}/></div><div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div className="form-field flex-1"><Label>Nota de política</Label><Textarea maxLength={2000} placeholder="Condiciones o límites personales para aplicar esta política." value={policy.notes} onChange={event => setPolicy(current => ({ ...current, notes: event.target.value }))} /></div><div><p className={`mb-2 text-sm font-semibold ${policyTotal === 10000 ? "text-emerald-700" : "text-destructive"}`}>{(policyTotal / 100).toFixed(0)}% de 100%</p><Button className="btn-primary" disabled={policyTotal !== 10000 || savePolicy.isPending} onClick={() => savePolicy.mutate({ ...policyValues, notes: policy.notes || null })}><Save className="size-4"/>{savePolicy.isPending ? "Guardando…" : "Guardar política"}</Button></div></div></section><section className="content-card"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-lg font-semibold">Aplicar a un excedente hipotético</h2><p className="mt-1 text-sm text-muted-foreground">Introduce una cifra que tú consideres disponible; Richeon no la deriva ni la ejecuta.</p></div><div className="form-field w-full sm:w-52"><Label>Excedente hipotético</Label><Input type="number" min="0" step="0.01" value={surplus} onChange={event => setSurplus(event.target.value)} /></div></div><div className="mt-5 grid gap-3 md:grid-cols-4"><AllocationCard icon={Landmark} label="Reserva" value={allocation.reserveCents} currency={currency}/><AllocationCard icon={CreditCard} label="Deuda" value={allocation.debtCents} currency={currency}/><AllocationCard icon={PiggyBank} label="Ahorro" value={allocation.savingsCents} currency={currency}/><AllocationCard icon={Coins} label="Inversión" value={allocation.investmentCents} currency={currency}/></div></section></section> : null}
  </div>;
}

function PercentageInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div className="form-field"><Label>{label}</Label><Input type="number" min="0" max="100" step="1" value={value} onChange={event => onChange(event.target.value)} /></div>;
}
