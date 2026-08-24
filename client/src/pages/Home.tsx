import { Button } from "@/components/ui/button";
import { formatDate, formatMoney, priorityLabel, scopeLabel } from "@/lib/finance";
import { trpc } from "@/lib/trpc";
import { emptyWorkspaceFilters, filterWorkspaceSnapshot, WorkspaceFilterBar } from "@/components/WorkspaceFilterBar";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, CheckCircle2, CircleDollarSign, Landmark, ListTodo, Plus, ShieldCheck, Target, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

function MetricCard({ icon: Icon, label, value, note, tone = "neutral" }: { icon: typeof WalletCards; label: string; value: string; note: string; tone?: "neutral" | "positive" | "warm" | "danger" }) {
  return <article className={`metric-card metric-${tone}`}><div className="metric-icon"><Icon className="size-5" /></div><p>{label}</p><strong>{value}</strong><small>{note}</small></article>;
}

export default function Home() {
  const { data: rawData, isLoading, error } = trpc.finance.dashboard.useQuery();
  const [workspaceFilters, setWorkspaceFilters] = useState(emptyWorkspaceFilters);
  const data = useMemo(() => {
    if (!rawData) return rawData;
    const hasFilters = Object.values(workspaceFilters).some(Boolean);
    if (!hasFilters) return rawData;
    const scoped = filterWorkspaceSnapshot(rawData, workspaceFilters);
    const currency = rawData.dashboard.reportCurrency || rawData.profile?.currency || "MXN";
    const start = new Date(rawData.dashboard.periodStart);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const reportAmount = (item: any) => item.reportCurrency === currency && typeof item.reportAmountCents === "number" ? item.reportAmountCents : item.currency === currency ? item.amountCents : null;
    const currentTransactions = scoped.transactions.filter((item: any) => new Date(item.occurredAt) >= start && new Date(item.occurredAt) < end);
    const incomeCents = currentTransactions.filter((item: any) => item.type === "income").reduce((total: number, item: any) => total + (reportAmount(item) ?? 0), 0);
    const expenseCents = currentTransactions.filter((item: any) => item.type === "expense").reduce((total: number, item: any) => total + (reportAmount(item) ?? 0), 0);
    const pendingConversionCount = currentTransactions.filter((item: any) => (item.type === "income" || item.type === "expense") && reportAmount(item) === null).length;
    const accounts = scoped.accounts.filter((item: any) => item.status === "active" && item.currency === currency);
    const debts = scoped.debts.filter((item: any) => (item.status === "active" || item.status === "review") && item.currency === currency);
    const assetCents = accounts.reduce((total: number, item: any) => total + item.currentValueCents, 0);
    const liabilityCents = debts.reduce((total: number, item: any) => total + item.balanceCents, 0);
    const essentialExpensesCents = currentTransactions.filter((item: any) => item.type === "expense" && item.isEssential).reduce((total: number, item: any) => total + (reportAmount(item) ?? 0), 0);
    const liquidCents = accounts.filter((item: any) => item.isLiquid).reduce((total: number, item: any) => total + item.currentValueCents, 0);
    return { ...scoped, dashboard: { ...rawData.dashboard, cashFlow: { incomeCents, expenseCents, netCashFlowCents: incomeCents - expenseCents, pendingConversionCount }, netWorth: { assetCents, liabilityCents, netWorthCents: assetCents - liabilityCents }, liquidity: { liquidCents, coverageMonths: essentialExpensesCents > 0 ? liquidCents / essentialExpensesCents : null }, essentialExpensesCents } } as typeof rawData;
  }, [rawData, workspaceFilters]);
  if (isLoading) return <div className="page-loading">Preparando tu visión financiera…</div>;
  if (error || !data) return <div className="error-state"><AlertTriangle className="size-6" /><h1>No hemos podido cargar tu espacio financiero</h1><p>Inténtalo de nuevo. Tus datos siguen protegidos y no se ha realizado ninguna acción.</p></div>;

  const currency = data.dashboard.reportCurrency ?? data.profile?.currency ?? "MXN";
  const pendingTasks = data.tasks.filter(task => task.status !== "completed" && task.status !== "cancelled").slice().sort((a, b) => (a.dueAt ? new Date(a.dueAt).getTime() : Infinity) - (b.dueAt ? new Date(b.dueAt).getTime() : Infinity));
  const activeGoals = data.goals.filter(goal => goal.status === "active");
  const activeDebts = data.debts.filter(debt => debt.status === "active" || debt.status === "review");
  const reportCurrencyDebts = activeDebts.filter(debt => debt.currency === currency);
  const debtBalance = reportCurrencyDebts.reduce((total, debt) => total + debt.balanceCents, 0);
  const pendingDebtCurrencyCount = activeDebts.length - reportCurrencyDebts.length;
  const hasData = data.accounts.length + data.transactions.length + data.debts.length + data.goals.length > 0;

  return <div className="space-y-8">
    <section className="hero-panel">
      <div><p className="eyebrow">Espacio privado · {currency}</p><h1>Decide con claridad.<br /><em>Gestiona con calma.</em></h1><p className="hero-description">Una visión manual, trazable y separada de tus finanzas personales y empresariales. Sin bancos conectados, sin pagos, sin automatismos invisibles.</p></div>
      <div className="hero-aside"><div className="privacy-dot"><ShieldCheck className="size-5" /></div><div><strong>Control total de tus datos</strong><p>Solo analizamos lo que registras en Meximoney.</p></div></div>
    </section>

    <WorkspaceFilterBar snapshot={data} filters={workspaceFilters} onChange={setWorkspaceFilters} />

    {!hasData ? <section className="onboarding-card"><div><p className="eyebrow">Primeros pasos</p><h2>Construye una base fiable antes de analizar.</h2><p>Registra una cuenta, crea tus categorías y añade tus primeros movimientos. El panel calculará tu situación a partir de datos confirmados.</p></div><div className="onboarding-actions"><Link href="/movimientos"><Button className="btn-primary"><Plus className="size-4" /> Registrar una cuenta</Button></Link><Link href="/movimientos"><Button variant="outline">Añadir movimiento</Button></Link></div></section> : null}

    <section><div className="section-heading"><div><p className="eyebrow">Resumen del periodo · {currency}</p><h2>Tu situación actual</h2></div><span className="period-chip">{formatDate(data.dashboard.periodStart, { month: "long", year: "numeric" })}</span></div><div className="metric-grid"><MetricCard icon={CircleDollarSign} label="Flujo neto" value={formatMoney(data.dashboard.cashFlow.netCashFlowCents, currency)} note={`${formatMoney(data.dashboard.cashFlow.incomeCents, currency)} ingresos · ${formatMoney(data.dashboard.cashFlow.expenseCents, currency)} gastos`} tone={data.dashboard.cashFlow.netCashFlowCents >= 0 ? "positive" : "danger"} /><MetricCard icon={Landmark} label="Patrimonio neto" value={formatMoney(data.dashboard.netWorth.netWorthCents, currency)} note={`${formatMoney(data.dashboard.netWorth.assetCents, currency)} activos · ${formatMoney(data.dashboard.netWorth.liabilityCents, currency)} deudas`} /><MetricCard icon={WalletCards} label="Liquidez disponible" value={formatMoney(data.dashboard.liquidity.liquidCents, currency)} note={data.dashboard.liquidity.coverageMonths === null ? "Registra gastos esenciales para estimar cobertura" : `${data.dashboard.liquidity.coverageMonths.toFixed(1)} meses de cobertura estimada`} tone="warm" /><MetricCard icon={CircleDollarSign} label="Deuda activa" value={formatMoney(debtBalance, currency)} note={pendingDebtCurrencyCount ? `${reportCurrencyDebts.length} en ${currency} · ${pendingDebtCurrencyCount} pendiente de valorar` : `${activeDebts.length} obligaciones activas o por revisar`} tone={activeDebts.length ? "danger" : "positive"} /></div></section>

    <div className="dashboard-grid">
      <section className="content-card main-card"><div className="card-title-row"><div><h2>Flujo manual del mes</h2><p>Los ingresos y gastos excluyen transferencias internas y usan sólo conversión confirmada a {currency}.</p></div><Link className="text-link" href="/movimientos">Ver movimientos</Link></div><div className="flow-visual"><div className="flow-row"><span><i className="flow-dot dot-income"><ArrowDownLeft className="size-3" /></i>Ingresos</span><strong>{formatMoney(data.dashboard.cashFlow.incomeCents, currency)}</strong></div><div className="flow-bar"><span className="income-bar" style={{ width: `${data.dashboard.cashFlow.incomeCents > 0 ? 100 : 0}%` }} /></div><div className="flow-row"><span><i className="flow-dot dot-expense"><ArrowUpRight className="size-3" /></i>Gastos</span><strong>{formatMoney(data.dashboard.cashFlow.expenseCents, currency)}</strong></div><div className="flow-bar"><span className="expense-bar" style={{ width: `${data.dashboard.cashFlow.incomeCents ? Math.min(100, (data.dashboard.cashFlow.expenseCents / data.dashboard.cashFlow.incomeCents) * 100) : 0}%` }} /></div><div className="flow-footer"><span>Resultado del periodo</span><strong className={data.dashboard.cashFlow.netCashFlowCents >= 0 ? "amount-positive" : "amount-negative"}>{formatMoney(data.dashboard.cashFlow.netCashFlowCents, currency)}</strong></div>{data.dashboard.cashFlow.pendingConversionCount > 0 ? <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900"><AlertTriangle className="mr-1 inline size-3.5" />{data.dashboard.cashFlow.pendingConversionCount} {data.dashboard.cashFlow.pendingConversionCount === 1 ? "partida quedó" : "partidas quedaron"} fuera del total hasta confirmar su conversión manual a {currency}.</div> : null}</div></section>
    </div>

    <div className="dashboard-grid">
      <section className="content-card"><div className="card-title-row"><div><h2>Objetivos en marcha</h2><p>Progreso medido con el último valor manual.</p></div><Link href="/planificacion" className="text-link">Gestionar</Link></div>{activeGoals.length === 0 ? <div className="inline-empty"><Target className="size-5" /><span>No hay objetivos activos. Define una meta para convertir prioridades en un plan.</span></div> : <div className="goal-list">{activeGoals.slice(0, 4).map(goal => { const progress = goal.targetCents > 0 ? Math.min(100, (goal.currentCents / goal.targetCents) * 100) : 0; return <div className="goal-row" key={goal.id}><div className="goal-head"><span><strong>{goal.name}</strong><small>{scopeLabel[goal.scope]} · {priorityLabel[goal.priority]}</small></span><b>{progress.toFixed(0)}%</b></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><div className="goal-meta"><span>{formatMoney(goal.currentCents, goal.currency)} de {formatMoney(goal.targetCents, goal.currency)}</span><span>{goal.targetDate ? `Meta: ${formatDate(goal.targetDate)}` : "Fecha pendiente"}</span></div></div>; })}</div>}</section>
      <section className="content-card"><div className="card-title-row"><div><h2>Próximas acciones</h2><p>Prioridades manuales que requieren atención.</p></div><Link href="/planificacion" className="text-link">Ver tareas</Link></div>{pendingTasks.length === 0 ? <div className="inline-empty"><ListTodo className="size-5" /><span>No hay tareas pendientes. Añade las próximas acciones de tu revisión financiera.</span></div> : <div className="task-list">{pendingTasks.slice(0, 4).map(task => <div className="task-row" key={task.id}><span className={`priority-dot priority-${task.priority}`} /><div><strong>{task.title}</strong><small>{task.dueAt ? `Vence ${formatDate(task.dueAt)}` : "Sin fecha límite"} · {scopeLabel[task.scope]}</small></div><span className="task-priority">{priorityLabel[task.priority]}</span></div>)}</div>}</section>
    </div>
  </div>;
}
