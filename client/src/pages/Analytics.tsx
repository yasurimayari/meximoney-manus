import type { ReactNode } from "react";
import { MoneyText } from "@/components/MoneyText";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { buildAssetAllocation, buildExpenseCategories, buildMonthlySeries, buildMonthlySeriesForYear, investmentValue } from "@/lib/financeAnalytics";
import { formatDate, formatMoney } from "@/lib/finance";
import { trpc } from "@/lib/trpc";
import { dashboardPeriodQuery } from "@/lib/dashboardPeriod";
import { emptyWorkspaceFilters, filterWorkspaceSnapshot, WorkspaceFilterBar } from "@/components/WorkspaceFilterBar";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { BarChart3, CalendarClock, ChartNoAxesCombined, Landmark, PiggyBank, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

const chartConfig = {
  ingresos: { label: "Ingresos", color: "oklch(0.62 0.11 180)" },
  gastos: { label: "Gastos", color: "oklch(0.62 0.16 28)" },
  ahorro: { label: "Ahorro", color: "oklch(0.7 0.13 151)" },
} satisfies ChartConfig;
const palette = ["oklch(0.52 0.11 180)", "oklch(0.67 0.12 151)", "oklch(0.7 0.13 74)", "oklch(0.61 0.16 28)", "oklch(0.54 0.08 250)", "oklch(0.64 0.09 320)"];

function ChartEmpty({ text }: { text: string }) {
  return <div className="chart-empty"><ChartNoAxesCombined className="size-5" /><span>{text}</span></div>;
}

function Metric({ icon: Icon, label, value, note }: { icon: typeof PiggyBank; label: string; value: ReactNode; note: string }) {
  return <article className="analytics-metric"><Icon className="size-5" /><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></article>;
}

export default function Analytics() {
  const { data: rawData, isLoading } = trpc.finance.dashboard.useQuery(dashboardPeriodQuery);
  const [months, setMonths] = useState(6);
  const [selectedYear, setSelectedYear] = useState("");
  const [entityId, setEntityId] = useState("");
  const [workspaceFilters, setWorkspaceFilters] = useState(emptyWorkspaceFilters);

  const data = useMemo(() => rawData ? filterWorkspaceSnapshot(rawData, { ...workspaceFilters, entityId: workspaceFilters.entityId || entityId }) : rawData, [rawData, entityId, workspaceFilters]);
  if (isLoading || !data || !rawData) return <div className="page-loading">Preparando tus gráficos financieros…</div>;

  const currency = rawData.dashboard.reportCurrency ?? rawData.profile?.currency ?? "MXN";
  const referenceDate = new Date(rawData.dashboard.periodStart);
  const years = Array.from({ length: 5 }, (_, index) => referenceDate.getFullYear() - index);
  const series = selectedYear ? buildMonthlySeriesForYear(data, Number(selectedYear)) : buildMonthlySeries(data, months, referenceDate);
  const expenses = buildExpenseCategories(data);
  const allocation = buildAssetAllocation(data);
  const currentStart = referenceDate;
  const currentEnd = new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 1);
  const reportAmount = (item: any) => item.reportCurrency === currency && typeof item.reportAmountCents === "number" ? item.reportAmountCents : item.currency === currency ? item.amountCents : null;
  const currentTransactions = data.transactions.filter((item: any) => new Date(item.occurredAt) >= currentStart && new Date(item.occurredAt) < currentEnd);
  const incomeCents = currentTransactions.filter((item: any) => item.type === "income").reduce((total: number, item: any) => total + (reportAmount(item) ?? 0), 0);
  const expenseCents = currentTransactions.filter((item: any) => item.type === "expense").reduce((total: number, item: any) => total + (reportAmount(item) ?? 0), 0);
  const savingRate = incomeCents > 0 ? Math.round(((incomeCents - expenseCents) / incomeCents) * 100) : null;
  const investmentCents = investmentValue(data);
  const liquidityCents = data.accounts.filter((item: any) => item.status === "active" && item.isLiquid && item.currency === currency).reduce((total: number, item: any) => total + item.currentValueCents, 0);
  const netWorth = data.accounts.filter((item: any) => item.status === "active" && item.currency === currency).reduce((total: number, item: any) => total + item.currentValueCents, 0) - [...data.debts, ...data.creditCards.filter((item: any) => item.status !== "closed")].filter((item: any) => item.currency === currency).reduce((total: number, item: any) => total + item.balanceCents, 0);
  const timeLabel = selectedYear ? `enero a diciembre de ${selectedYear}` : `últimos ${months} meses`;

  return <div className="analytics-page space-y-7"><header className="page-heading"><div><p className="eyebrow">Analítica visual</p><h1>Entiende las tendencias, no solo los saldos.</h1><p>Los gráficos usan registros manuales comparables. Las transferencias internas no son ingreso ni gasto.</p></div><div className="range-control" aria-label="Periodo y entidad analizados"><select aria-label="Entidad analizada" className="h-9 rounded-md border bg-background px-2 text-sm" value={entityId} onChange={event => setEntityId(event.target.value)}><option value="">Todas las entidades</option>{rawData.entities.map((entity: any) => <option key={entity.id} value={entity.id}>{entity.shortCode || entity.name}</option>)}</select><div className="period-options" role="group" aria-label="Ventana móvil">{[3, 6, 12, 18, 24, 36].map(value => <Button key={value} type="button" variant={!selectedYear && months === value ? "default" : "outline"} size="sm" aria-pressed={!selectedYear && months === value} onClick={() => { setMonths(value); setSelectedYear(""); }}>{value} meses</Button>)}</div></div></header><WorkspaceFilterBar snapshot={rawData} filters={workspaceFilters} onChange={setWorkspaceFilters} /><section className="content-card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="eyebrow">Vista anual</p><h2 className="text-base font-semibold">Analiza un año completo</h2><p className="mt-1 text-sm text-muted-foreground">Muestra de enero a diciembre; no crea ni cierra estados.</p></div><select aria-label="Año analizado" className="h-10 rounded-md border bg-background px-3 text-sm" value={selectedYear} onChange={event => setSelectedYear(event.target.value)}><option value="">Ventana móvil</option>{years.map(year => <option key={year} value={year}>{year}</option>)}</select></section><section className="analytics-kpi-grid"><Metric icon={PiggyBank} label="Tasa de ahorro" value={savingRate === null ? "—" : `${savingRate}%`} note={savingRate === null ? "Registra ingresos para calcularla" : "Flujo neto / ingresos del mes vigente"} /><Metric icon={Landmark} label="Inversiones manuales" value={<MoneyText cents={investmentCents} currency={currency} />} note="Posiciones y cuentas de inversión comparables" /><Metric icon={WalletCards} label="Liquidez disponible" value={<MoneyText cents={liquidityCents} currency={currency} />} note="Activos líquidos en moneda de reporte" /><Metric icon={CalendarClock} label="Patrimonio neto" value={<MoneyText cents={netWorth} currency={currency} />} note={`Referencia: ${formatDate(referenceDate, { month: "long", year: "numeric" })}`} /></section><section className="analytics-grid analytics-grid-main"><article className="content-card chart-card chart-wide"><div className="card-title-row"><div><h2>Ingresos y gastos</h2><p>Evolución mensual: {timeLabel}.</p></div><BarChart3 className="size-5 text-primary" /></div>{series.every(item => item.ingresos === 0 && item.gastos === 0) ? <ChartEmpty text="No hay ingresos o gastos comparables en el periodo elegido." /> : <ChartContainer config={chartConfig} className="mt-5 h-[270px] w-full"><AreaChart data={series}><CartesianGrid vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} /><YAxis hide /><ChartTooltip content={<ChartTooltipContent formatter={value => formatMoney(Math.round(Number(value) * 100), currency)} />} /><Area type="monotone" dataKey="ingresos" stroke="var(--color-ingresos)" fill="var(--color-ingresos)" fillOpacity={0.12} strokeWidth={2} /><Area type="monotone" dataKey="gastos" stroke="var(--color-gastos)" fill="var(--color-gastos)" fillOpacity={0.08} strokeWidth={2} /></AreaChart></ChartContainer>}</article><article className="content-card chart-card"><div className="card-title-row"><div><h2>Ahorro mensual</h2><p>Resultado después de ingresos y gastos.</p></div><PiggyBank className="size-5 text-primary" /></div>{series.every(item => item.ahorro === 0) ? <ChartEmpty text="Aparecerá al registrar movimientos comparables." /> : <ChartContainer config={chartConfig} className="mt-5 h-[270px] w-full"><BarChart data={series}><CartesianGrid vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} /><YAxis hide /><ChartTooltip content={<ChartTooltipContent formatter={value => formatMoney(Math.round(Number(value) * 100), currency)} />} /><Bar dataKey="ahorro" fill="var(--color-ahorro)" radius={[6, 6, 0, 0]} /></BarChart></ChartContainer>}</article></section><section className="analytics-grid"><article className="content-card chart-card"><div className="card-title-row"><div><h2>Gastos por categoría</h2><p>Distribución de gastos comparables registrados.</p></div><ChartNoAxesCombined className="size-5 text-primary" /></div>{expenses.length === 0 ? <ChartEmpty text="Clasifica gastos para visualizar su distribución." /> : <ChartContainer config={{}} className="mt-5 h-[240px] w-full"><PieChart><ChartTooltip content={<ChartTooltipContent hideLabel formatter={value => formatMoney(Math.round(Number(value) * 100), currency)} />} /><Pie data={expenses} dataKey="value" nameKey="name" innerRadius={56} outerRadius={84} paddingAngle={3}>{expenses.map((entry, index) => <Cell key={entry.name} fill={palette[index % palette.length]} />)}</Pie></PieChart></ChartContainer>}</article><article className="content-card chart-card"><div className="card-title-row"><div><h2>Distribución de activos</h2><p>Valores manuales vigentes y comparables.</p></div><Landmark className="size-5 text-primary" /></div>{allocation.length === 0 ? <ChartEmpty text="Registra cuentas o activos para visualizar su composición." /> : <ChartContainer config={{}} className="mt-5 h-[240px] w-full"><PieChart><ChartTooltip content={<ChartTooltipContent hideLabel formatter={value => formatMoney(Math.round(Number(value) * 100), currency)} />} /><Pie data={allocation} dataKey="value" nameKey="name" innerRadius={56} outerRadius={84} paddingAngle={3}>{allocation.map((entry, index) => <Cell key={entry.name} fill={palette[(index + 2) % palette.length]} />)}</Pie></PieChart></ChartContainer>}</article></section><section className="tax-insight"><div><p className="eyebrow">Reserva fiscal manual</p><h2>La fecha y el importe los configuras tú.</h2><p>{rawData.profile?.futureTaxDueAt ? `Fecha configurada: ${formatDate(rawData.profile.futureTaxDueAt)}.` : "Aún no hay fecha fiscal configurada."} No hay cálculo tributario automático.</p></div><Link href="/calendario"><Button variant="outline">Abrir Calendario</Button></Link></section></div>;
}
