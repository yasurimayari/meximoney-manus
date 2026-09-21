import type { ReactNode } from "react";
import { MoneyText } from "@/components/MoneyText";
import { Button } from "@/components/ui/button";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, XAxis } from "recharts";
import { formatDate, formatMoney, priorityLabel, scopeLabel } from "@/lib/finance";
import { isMonthlyClosingPending } from "@/lib/monthlyClosing";
import { displayAmountCents } from "@/lib/amountTone";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { dashboardPeriodQuery } from "@/lib/dashboardPeriod";
import { emptyWorkspaceFilters, filterWorkspaceSnapshot, WorkspaceFilterBar } from "@/components/WorkspaceFilterBar";
import { buildPfaePanelSummary } from "../../../shared/pfaePanelSummary";
import { creditCardUtilizationAlerts } from "../../../shared/creditCardSummary";
import { buildExpenseCategories, buildMonthlySeries } from "@/lib/financeAnalytics";
import { richeonModules } from "@/lib/richeonModules";
import { IconContext } from "@phosphor-icons/react";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, CalendarClock, CheckCircle2, CircleDollarSign, HeartPulse, Landmark, ListTodo, PieChart as PieChartIcon, Plus, ReceiptText, ShieldCheck, Target, TrendingUp, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { habitMetrics } from "@/lib/habitMetrics";

function MetricCard({ badgeClass, icon: Icon, label, value, note }: { badgeClass: string; icon: typeof WalletCards; label: string; value: ReactNode; note: ReactNode }) {
  return <article className="coreview-kpi-card"><span className={`module-badge ${badgeClass}`}><Icon className="size-[1.15rem]" /></span><p>{label}</p><strong>{value}</strong><small>{note}</small></article>;
}

const flowChartConfig: ChartConfig = { ingresos: { label: "Ingresos", color: "#06B6D4" }, gastos: { label: "Gastos", color: "#0058FD" } };
const donutPalette = ["#0058FD", "#06B6D4", "#E28405", "#0F8A4B", "#F53409", "#2D2DF4", "#E31C7A"];

const richiSuggestedPrompts = [
  "Resume mi situación financiera de este periodo.",
  "¿Qué revisión debería priorizar hoy?",
  "Explica mi flujo neto con sus fuentes.",
];

export default function Home() {
  const { data: rawData, isLoading, error } = trpc.finance.dashboard.useQuery(dashboardPeriodQuery);
  const { data: notificationData } = trpc.finance.notifications.get.useQuery(undefined, { staleTime: 60_000 });
  const { data: habitsData } = trpc.finance.habits.overview.useQuery();
  const { user } = useAuth();
  const [workspaceFilters, setWorkspaceFilters] = useState(emptyWorkspaceFilters);
  const [richiMessages, setRichiMessages] = useState<Message[]>([]);
  const richiChat = trpc.finance.assistant.chat.useMutation({
    onSuccess: response => setRichiMessages(previous => [...previous, { role: "assistant", content: response.content }]),
    onError: error => setRichiMessages(previous => [...previous, { role: "assistant", content: `No pude preparar la respuesta: ${error.message}` }]),
  });
  const sendRichiMessage = (content: string) => {
    setRichiMessages(previous => [...previous, { role: "user", content }]);
    richiChat.mutate({ message: content });
  };
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
  const creditAlertThreshold = notificationData?.preferences.creditUtilizationThresholdPercent ?? 20;
  const pendingTasks = data.tasks.filter(task => task.status !== "completed" && task.status !== "cancelled").slice().sort((a, b) => (a.dueAt ? new Date(a.dueAt).getTime() : Infinity) - (b.dueAt ? new Date(b.dueAt).getTime() : Infinity));
  const activeGoals = data.goals.filter(goal => goal.status === "active");
  const activeDebts = data.debts.filter(debt => debt.status === "active" || debt.status === "review");
  const reportCurrencyDebts = activeDebts.filter(debt => debt.currency === currency);
  const debtBalance = reportCurrencyDebts.reduce((total, debt) => total + debt.balanceCents, 0);
  const pendingDebtCurrencyCount = activeDebts.length - reportCurrencyDebts.length;
  const hasData = data.accounts.length + data.transactions.length + data.debts.length + data.goals.length > 0;
  const closingPending = isMonthlyClosingPending(data.statements ?? [], data.dashboard.periodStart);
  const pfaeSummary = buildPfaePanelSummary({ records: data.fiscalRecords ?? [], fiscalReviews: data.fiscalPeriodReviews ?? [], calendarEvents: data.calendarEvents ?? [], periodStart: data.dashboard.periodStart, futureTaxDueAt: data.profile?.futureTaxDueAt });
  const creditUtilizationAlerts = creditCardUtilizationAlerts(data.creditCards ?? [], currency, creditAlertThreshold);

  const monthlySeries = buildMonthlySeries(data, 6);
  const expenseCategories = buildExpenseCategories(data);
  const expenseCategoriesTotal = expenseCategories.reduce((total, item) => total + item.value, 0);

  return <div className="space-y-9">
    <div className="coreview-greeting">
      <div><p className="eyebrow">Espacio privado · {currency}</p><h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Hola, {user?.name?.split(" ")[0] || "de nuevo"}</h1><p className="mt-1 text-sm text-muted-foreground">Aquí tienes un resumen de tu situación financiera.</p></div>
      <span className="period-chip">{formatDate(data.dashboard.periodStart, { month: "long", year: "numeric" })}</span>
    </div>

    <WorkspaceFilterBar snapshot={data} filters={workspaceFilters} onChange={setWorkspaceFilters} />

    {closingPending ? <section className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-amber-950 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="mt-0.5 rounded-xl bg-amber-200 p-2 text-amber-800"><AlertTriangle className="size-4" /></span><div><p className="font-semibold">Cierre mensual pendiente</p><p className="mt-1 text-sm">Aún no hay un cierre guardado para {formatDate(data.dashboard.periodStart, { month: "long", year: "numeric" })}. Revisa pendientes y confirma el control mensual antes de guardar la fotografía histórica.</p></div></div><Link href="/control-mensual"><Button variant="outline" className="shrink-0 border-amber-400 bg-white text-amber-950 hover:bg-amber-100">Abrir control mensual</Button></Link></section> : null}

    {creditUtilizationAlerts.length ? <section className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-950"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><span className="mt-0.5 rounded-xl bg-rose-100 p-2 text-rose-700"><AlertTriangle className="size-4" /></span><div><p className="font-semibold">Utilización de crédito por encima del {creditAlertThreshold}%</p><p className="mt-1 text-sm text-rose-900">Estas tarjetas ya superan el umbral configurado. Revisa su saldo antes de asumir nuevos cargos.</p></div></div><Link href="/tarjetas" className="shrink-0 text-sm font-semibold text-rose-800 underline-offset-4 hover:underline">Revisar tarjetas</Link></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{creditUtilizationAlerts.slice(0, 6).map(card => <Link href={`/tarjetas#credit-card-${card.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-white/70 px-3 py-2.5 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500" key={card.id}><div className="min-w-0"><p className="truncate text-sm font-semibold">{card.name || "Tarjeta sin nombre"}</p><p className="truncate text-xs text-rose-800">{card.issuer || "Entidad no especificada"} · Saldo {formatMoney(card.balanceCents, card.currency)}</p></div><span className="shrink-0 text-sm font-bold text-rose-700">{card.utilizationPercent?.toFixed(1)}%</span></Link>)}</div>{creditUtilizationAlerts.length > 6 ? <p className="mt-3 text-xs text-rose-800">Hay {creditUtilizationAlerts.length - 6} tarjeta(s) adicional(es) por encima del umbral.</p> : null}</section> : null}

    {!hasData ? <section className="onboarding-card"><div><p className="eyebrow">Primeros pasos</p><h2>Construye una base fiable antes de analizar.</h2><p>Registra una cuenta, crea tus categorías y añade tus primeros movimientos. El panel calculará tu situación a partir de datos confirmados.</p></div><div className="onboarding-actions"><Link href="/movimientos"><Button className="btn-primary"><Plus className="size-4" /> Registrar una cuenta</Button></Link><Link href="/movimientos"><Button variant="outline">Añadir movimiento</Button></Link></div></section> : null}

    <div className="coreview-layout">
      <div className="coreview-main">
        <section><div className="section-heading"><div><p className="eyebrow">Resumen del periodo · {currency}</p><h2>Tu situación actual</h2></div><span className="period-chip">{formatDate(data.dashboard.periodStart, { month: "long", year: "numeric" })}</span></div>
          <IconContext.Provider value={{ weight: "duotone" }}>
            <div className="coreview-kpi-grid mt-4">
              <MetricCard badgeClass="module-cashflow" icon={CircleDollarSign} label="Flujo neto" value={<MoneyText cents={data.dashboard.cashFlow.netCashFlowCents} currency={currency} />} note={<><MoneyText cents={data.dashboard.cashFlow.incomeCents} currency={currency} /> ingresos · <MoneyText cents={displayAmountCents(data.dashboard.cashFlow.expenseCents, "expense")} currency={currency} /> gastos</>} />
              <MetricCard badgeClass="module-wealthmap" icon={Landmark} label="Patrimonio neto" value={<MoneyText cents={data.dashboard.netWorth.netWorthCents} currency={currency} />} note={<><MoneyText cents={data.dashboard.netWorth.assetCents} currency={currency} /> activos · <MoneyText cents={displayAmountCents(data.dashboard.netWorth.liabilityCents, "liability")} currency={currency} /> deudas</>} />
              <MetricCard badgeClass="module-moneylink" icon={WalletCards} label="Liquidez disponible" value={<MoneyText cents={data.dashboard.liquidity.liquidCents} currency={currency} />} note={data.dashboard.liquidity.coverageMonths === null ? "Registra gastos esenciales para estimar cobertura" : `${data.dashboard.liquidity.coverageMonths.toFixed(1)} meses de cobertura estimada`} />
              <MetricCard badgeClass="module-debtcenter" icon={CircleDollarSign} label="Deuda activa" value={<MoneyText cents={displayAmountCents(debtBalance, "liability")} currency={currency} />} note={pendingDebtCurrencyCount ? `${reportCurrencyDebts.length} en ${currency} · ${pendingDebtCurrencyCount} pendiente de valorar` : `${activeDebts.length} obligaciones activas o por revisar`} />
            </div>
          </IconContext.Provider>
        </section>

        <section className="coreview-dark-card">
          <div className="card-title-row"><div><h2>Resumen financiero</h2><p>Tu flujo de caja y distribución de gastos en una sola vista.</p></div><Link className="text-link text-white/80" href="/movimientos">Ver movimientos</Link></div>
          <div className="coreview-dark-grid">
            {monthlySeries.every(item => item.ingresos === 0 && item.gastos === 0) ? (
              <div className="coreview-empty-chart">
                <span className="coreview-empty-chart-icon"><TrendingUp className="size-5" /></span>
                <strong>Aún no hay flujo que mostrar</strong>
                <p>Registra tu primer ingreso o gasto y esta tendencia empieza a dibujarse.</p>
                <Link href="/movimientos" className="coreview-empty-chart-cta">Registrar un movimiento</Link>
              </div>
            ) : (
              <ChartContainer config={flowChartConfig} className="h-[220px] w-full">
                <AreaChart data={monthlySeries}>
                  <defs>
                    <linearGradient id="richeonFlowGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#0058FD" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} stroke="rgba(255,255,255,0.4)" fontSize={11} />
                  <ChartTooltip content={<ChartTooltipContent formatter={value => formatMoney(Math.round(Number(value) * 100), currency)} />} />
                  <Area type="monotone" dataKey="ingresos" stroke="#06B6D4" fill="url(#richeonFlowGradient)" strokeWidth={2} />
                  <Area type="monotone" dataKey="gastos" stroke="#0058FD" fill="transparent" strokeWidth={2} strokeDasharray="4 3" />
                </AreaChart>
              </ChartContainer>
            )}
            {expenseCategories.length === 0 ? (
              <div className="coreview-empty-chart">
                <span className="coreview-empty-chart-icon"><PieChartIcon className="size-5" /></span>
                <strong>Sin gastos clasificados</strong>
                <p>Asigna una categoría a tus gastos para ver su distribución aquí.</p>
                <Link href="/movimientos" className="coreview-empty-chart-cta">Clasificar gastos</Link>
              </div>
            ) : (
              <div className="coreview-donut-wrap">
                <ChartContainer config={{}} className="h-[150px] w-[150px] shrink-0">
                  <PieChart>
                    <Pie data={expenseCategories} dataKey="value" nameKey="name" innerRadius={44} outerRadius={68} paddingAngle={2}>
                      {expenseCategories.map((entry, index) => <Cell key={entry.name} fill={donutPalette[index % donutPalette.length]} stroke="transparent" />)}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="coreview-donut-legend">
                  {expenseCategories.slice(0, 5).map((item, index) => (
                    <div className="coreview-donut-legend-row" key={item.name}>
                      <span><i className="coreview-donut-dot" style={{ background: donutPalette[index % donutPalette.length] }} />{item.name}</span>
                      <strong>{expenseCategoriesTotal > 0 ? `${Math.round((item.value / expenseCategoriesTotal) * 100)}%` : "—"}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="section-heading"><div><p className="eyebrow">Richeon</p><h2>Tus módulos</h2></div><span className="text-xs text-muted-foreground">{richeonModules.length} módulos activos</span></div>
          <IconContext.Provider value={{ weight: "duotone" }}>
            <div className="coreview-modules-grid mt-4">
              {richeonModules.map(module => (
                <Link href={module.routes[0].path} key={module.id} className="coreview-module-card">
                  <span className={`module-badge ${module.badgeClass}`}><module.icon weight="duotone" /></span>
                  <span className="coreview-module-card-body">
                    <strong>{module.brand}</strong>
                    <p>{module.description}</p>
                    <span className="module-status-pill module-status-active">Activo</span>
                  </span>
                </Link>
              ))}
            </div>
          </IconContext.Provider>
        </section>

        {closingPending ? <section className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-amber-950 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="mt-0.5 rounded-xl bg-amber-200 p-2 text-amber-800"><AlertTriangle className="size-4" /></span><div><p className="font-semibold">Cierre mensual pendiente</p><p className="mt-1 text-sm">Aún no hay un cierre guardado para {formatDate(data.dashboard.periodStart, { month: "long", year: "numeric" })}. Revisa pendientes y confirma el control mensual antes de guardar la fotografía histórica.</p></div></div><Link href="/control-mensual"><Button variant="outline" className="shrink-0 border-amber-400 bg-white text-amber-950 hover:bg-amber-100">Abrir control mensual</Button></Link></section> : null}

        {creditUtilizationAlerts.length ? <section className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-950"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><span className="mt-0.5 rounded-xl bg-rose-100 p-2 text-rose-700"><AlertTriangle className="size-4" /></span><div><p className="font-semibold">Utilización de crédito por encima del {creditAlertThreshold}%</p><p className="mt-1 text-sm text-rose-900">Estas tarjetas ya superan el umbral configurado. Revisa su saldo antes de asumir nuevos cargos.</p></div></div><Link href="/tarjetas" className="shrink-0 text-sm font-semibold text-rose-800 underline-offset-4 hover:underline">Revisar tarjetas</Link></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{creditUtilizationAlerts.slice(0, 6).map(card => <Link href={`/tarjetas#credit-card-${card.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-white/70 px-3 py-2.5 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500" key={card.id}><div className="min-w-0"><p className="truncate text-sm font-semibold">{card.name || "Tarjeta sin nombre"}</p><p className="truncate text-xs text-rose-800">{card.issuer || "Entidad no especificada"} · Saldo {formatMoney(card.balanceCents, card.currency)}</p></div><span className="shrink-0 text-sm font-bold text-rose-700">{card.utilizationPercent?.toFixed(1)}%</span></Link>)}</div>{creditUtilizationAlerts.length > 6 ? <p className="mt-3 text-xs text-rose-800">Hay {creditUtilizationAlerts.length - 6} tarjeta(s) adicional(es) por encima del umbral.</p> : null}</section> : null}

        {!hasData ? <section className="onboarding-card"><div><p className="eyebrow">Primeros pasos</p><h2>Construye una base fiable antes de analizar.</h2><p>Registra una cuenta, crea tus categorías y añade tus primeros movimientos. El panel calculará tu situación a partir de datos confirmados.</p></div><div className="onboarding-actions"><Link href="/movimientos"><Button className="btn-primary"><Plus className="size-4" /> Registrar una cuenta</Button></Link><Link href="/movimientos"><Button variant="outline">Añadir movimiento</Button></Link></div></section> : null}

        <div className="dashboard-grid">
          <section className="content-card"><div className="card-title-row"><div><p className="eyebrow">Preparación fiscal manual</p><h2>Seguimiento PFAE</h2><p>Indicadores registrados para {formatDate(data.dashboard.periodStart, { month: "long", year: "numeric" })}.</p></div><Link className="text-link" href="/fiscal">Abrir Libro</Link></div><div className="mt-5 space-y-3"><div className="rounded-xl bg-amber-50 p-3"><span className="flex items-center gap-2 text-sm font-medium text-amber-950"><ReceiptText className="size-4" /> IVA manual registrado</span><strong className="mt-1 block text-xl text-amber-950"><MoneyText cents={pfaeSummary.vatRegisteredCents} currency={currency} /></strong><small className="mt-1 block text-amber-900">Dato capturado; no es IVA a pagar ni cálculo tributario.</small></div><div className="flex items-start justify-between gap-3 border-b border-border pb-3"><div><strong className="block text-sm">Revisión del periodo</strong><small className="text-muted-foreground">{pfaeSummary.recordCount ? `${pfaeSummary.pendingReviewCount} renglón(es) pendientes de revisión.` : "Sin renglones PFAE registrados en este periodo."}</small></div><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${pfaeSummary.reviewStatus === "reviewed" ? "bg-emerald-500/10 text-emerald-800" : "bg-amber-500/10 text-amber-800"}`}>{pfaeSummary.reviewStatus === "reviewed" ? "Revisado manualmente" : "Rutina abierta"}</span></div><div className="flex items-start gap-3"><CalendarClock className="mt-0.5 size-4 text-primary" /><div><strong className="block text-sm">Próxima fecha fiscal manual</strong><p className="text-sm text-muted-foreground">{pfaeSummary.nextDate ? `${formatDate(pfaeSummary.nextDate)} · ${pfaeSummary.nextDateLabel}` : "Sin fecha fiscal configurada. Regístrala en Calendario o Perfil."}</p></div></div></div></section>
          <section className="content-card"><div className="card-title-row"><div><h2>Objetivos en marcha</h2><p>Progreso medido con el último valor manual.</p></div><Link href="/planificacion" className="text-link">Gestionar</Link></div>{activeGoals.length === 0 ? <div className="inline-empty"><Target className="size-5" /><span>No hay objetivos activos. Define una meta para convertir prioridades en un plan.</span></div> : <div className="goal-list">{activeGoals.slice(0, 4).map(goal => { const progress = goal.targetCents > 0 ? Math.min(100, (goal.currentCents / goal.targetCents) * 100) : 0; return <div className="goal-row" key={goal.id}><div className="goal-head"><span><strong>{goal.name}</strong><small>{scopeLabel[goal.scope]} · {priorityLabel[goal.priority]}</small></span><b>{progress.toFixed(0)}%</b></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><div className="goal-meta"><span><MoneyText cents={goal.currentCents} currency={goal.currency} /> de <MoneyText cents={goal.targetCents} currency={goal.currency} /></span><span>{goal.targetDate ? `Meta: ${formatDate(goal.targetDate)}` : "Fecha pendiente"}</span></div></div>; })}</div>}</section>
        </div>

        <section className="content-card"><div className="card-title-row"><div><h2>ToDo prioritario</h2><p>Las próximas acciones de todos tus módulos, ordenadas para decidir qué sigue.</p></div><Link href="/todo" className="text-link">Abrir ToDo</Link></div>{pendingTasks.length === 0 ? <div className="inline-empty"><ListTodo className="size-5" /><span>No hay tareas pendientes. Añade una próxima acción desde ToDo o desde su módulo de origen.</span></div> : <div className="task-list">{pendingTasks.slice(0, 4).map(task => <Link href="/todo" className="task-row transition-colors hover:bg-muted/60" key={task.id}><span className={`priority-dot priority-${task.priority}`} /><div><strong>{task.title}</strong><small>{task.dueAt ? `Vence ${formatDate(task.dueAt)}` : "Sin fecha límite"} · {scopeLabel[task.scope]}</small></div><span className="task-priority">{priorityLabel[task.priority]}</span></Link>)}</div>}</section>

        {habitsData?.preferences.enabled && habitsData.preferences.showOnDashboard ? <section className="content-card"><div className="card-title-row"><div><h2>Hábitos voluntarios</h2><p>Seguimiento manual, separado de tu Score.</p></div><Link href="/habitos" className="text-link">Abrir hábitos</Link></div><HabitsPanel habits={habitsData.habits} /></section> : null}
      </div>

      <aside className="coreview-richi-panel">
        <div className="coreview-richi-header">
          <span className="sidebar-richi-avatar"><CheckCircle2 className="size-4" /></span>
          <div><strong>Richi Copilot</strong><span className="coreview-richi-status">En línea</span></div>
        </div>
        <AIChatBox
          messages={richiMessages}
          onSendMessage={sendRichiMessage}
          isLoading={richiChat.isPending}
          height="520px"
          placeholder="Pregúntale a Richi…"
          emptyStateMessage="Hola, ¿en qué puedo ayudarte hoy?"
          suggestedPrompts={richiSuggestedPrompts}
          className="border-0 shadow-none"
        />
      </aside>
    </div>
  </div>;
}

function HabitsPanel({ habits }: { habits: Array<{ id: number; title: string; isActive: boolean; checkins: Array<{ completedAt: Date | string }> }> }) {
  const metrics = habitMetrics(habits);
  if (metrics.activeCount === 0) return <div className="inline-empty"><HeartPulse className="size-5" /><span>No hay hábitos activos. Configúralos sólo si deseas seguirlos.</span></div>;
  return <div className="space-y-4"><div className="flex items-end justify-between gap-4"><div><strong className="text-3xl tabular-nums text-primary">{metrics.completionRate ?? "—"}{metrics.completionRate !== null ? "%" : ""}</strong><p className="mt-1 text-sm text-muted-foreground">Cobertura semanal elegida por ti</p></div><span className="rounded-xl bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">{metrics.completedThisWeek}/{metrics.activeCount}</span></div><div className="task-list">{habits.filter(habit => habit.isActive).slice(0, 3).map(habit => <Link href="/habitos" key={habit.id} className="task-row transition-colors hover:bg-muted/60"><HeartPulse className="size-4 text-primary" /><div><strong>{habit.title}</strong><small>{habit.checkins.length ? "Con registros manuales" : "Aún sin registro"}</small></div></Link>)}</div></div>;
}
