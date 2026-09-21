import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { amountFromDebitCredit, inferImportMapping, inferImportType, parseImportAmount, parseImportDate, parseSpreadsheet, type ImportColumn, type ImportMapping, type SpreadsheetRow } from "@/lib/importSpreadsheet";
import { formatDate, formatMoney } from "@/lib/finance";
import { trpc } from "@/lib/trpc";
import { FileCheck2, FileUp, RefreshCw, SearchCheck, Upload, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const mappingFields: Array<{ key: ImportColumn; label: string; required?: boolean }> = [
  { key: "date", label: "Fecha", required: true },
  { key: "description", label: "Descripción" },
  { key: "amount", label: "Importe (con signo)" },
  { key: "debit", label: "Cargo" },
  { key: "credit", label: "Abono" },
  { key: "type", label: "Tipo" },
  { key: "bankReference", label: "Referencia" },
];

type AccountOption = { id: number; name: string; currency: string; status?: string };
type StatementImportView = { id: number; accountId: number; fileName: string; currency: string };
type StatementRowView = { id: number; accountId: number; occurredAt: Date | string; type: "income" | "expense"; amountCents: number; currency: string; bankReference: string | null; description: string | null; matchStatus: "unmatched" | "auto_matched" | "reconciled" | "ignored"; matchedTransactionId: number | null };
type AccountSummaryView = AccountOption & { rowCount: number; unmatchedCount: number; autoMatchedCount: number; pendingCount: number; reconciledCount: number; differenceCents: number };
type TransactionView = { id: number; accountId: number | null; type: "income" | "expense" | "transfer_in" | "transfer_out"; amountCents: number; currency: string; bankReference: string | null; occurredAt: Date | string; reconciledAt: Date | string | null; notes?: string | null };
type StatementSummaryView = { imports: StatementImportView[]; rows: StatementRowView[]; accounts: AccountSummaryView[]; transactions: TransactionView[] };

function selectOptions(headers: string[], selected: string | undefined) {
  return <><option value="">No usar</option>{headers.map(header => <option value={header} key={header}>{header}</option>)}</>;
}

export function BankStatementReconciliationPanel({ accounts, autoOpen = false }: { accounts: AccountOption[]; autoOpen?: boolean }) {
  const [importOpen, setImportOpen] = useState(autoOpen);
  const [accountId, setAccountId] = useState("");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<SpreadsheetRow[]>([]);
  const [mapping, setMapping] = useState<ImportMapping>({});
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [resolutionNotes, setResolutionNotes] = useState<Record<number, string>>({});
  const utils = trpc.useUtils();
  const summaryQuery = trpc.finance.workspace.bankStatements.summary.useQuery(undefined, { enabled: accounts.length > 0 });
  const summary = summaryQuery.data as StatementSummaryView | undefined;
  const importCsv = trpc.finance.workspace.bankStatements.importCsv.useMutation({
    onSuccess: async result => {
      toast.success(`Estado importado: ${result.autoMatchedCount} coincidencia(s) automática(s) y ${result.unmatchedCount} diferencia(s) para revisar.`);
      await Promise.all([utils.finance.workspace.bankStatements.summary.invalidate(), utils.finance.dashboard.invalidate()]);
      resetImport();
    },
    onError: error => toast.error(error.message),
  });
  const autoMatch = trpc.finance.workspace.bankStatements.autoMatch.useMutation({
    onSuccess: async result => { toast.success(`${result.autoMatchedCount} coincidencia(s) automática(s) encontrada(s).`); await utils.finance.workspace.bankStatements.summary.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const resolveRow = trpc.finance.workspace.bankStatements.resolveRow.useMutation({
    onSuccess: async () => { toast.success("Diferencia actualizada."); await Promise.all([utils.finance.workspace.bankStatements.summary.invalidate(), utils.finance.dashboard.invalidate()]); },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (autoOpen) document.getElementById("conciliacion-bancaria")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [autoOpen]);

  const selectedAccountRecord = accounts.find(account => String(account.id) === accountId);
  const filteredRows = useMemo(() => {
    const rows = summary?.rows ?? [];
    return selectedAccount === "all" ? rows : rows.filter((row: StatementRowView) => row.accountId === Number(selectedAccount));
  }, [selectedAccount, summary?.rows]);
  const pendingRows = filteredRows.filter((row: StatementRowView) => row.matchStatus !== "reconciled");
  const candidateTransactions = summary?.transactions ?? [];

  function resetImport() {
    setImportOpen(false);
    setFileName("");
    setHeaders([]);
    setRawRows([]);
    setMapping({});
  }

  async function loadFile(file?: File) {
    if (!file) return;
    try {
      const parsed = await parseSpreadsheet(file);
      if (!parsed.rows.length) throw new Error("El archivo no contiene filas de datos.");
      if (parsed.rows.length > 2000) throw new Error("Importa un máximo de 2,000 filas por estado de cuenta.");
      setFileName(file.name);
      setHeaders(parsed.headers);
      setRawRows(parsed.rows);
      setMapping(inferImportMapping(parsed.headers));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible leer el CSV.");
    }
  }

  function buildRows() {
    if (!accountId || !selectedAccountRecord) throw new Error("Selecciona la cuenta a la que pertenece el estado de cuenta.");
    // Muchos bancos mexicanos (HSBC entre ellos) no traen un "Importe" único
    // con signo, sino Cargo/Abono en columnas separadas -- ambos formatos se
    // auto-detectan y aceptan.
    const usesDebitCredit = Boolean(mapping.debit || mapping.credit);
    if (!mapping.date || (!mapping.amount && !usesDebitCredit)) throw new Error("Asigna las columnas de fecha e importe (o Cargo/Abono) antes de importar.");
    const rows = rawRows.flatMap((row, index) => {
      const occurredAt = parseImportDate(row[mapping.date!]);
      if (usesDebitCredit) {
        const parsed = amountFromDebitCredit(mapping.debit ? row[mapping.debit] : null, mapping.credit ? row[mapping.credit] : null);
        if (!parsed) return []; // fila sin cargo ni abono (saldo, encabezado repetido, etc.) -- no es un movimiento, se omite
        if (!occurredAt) throw new Error(`La fila ${index + 2} tiene un importe pero no una fecha válida.`);
        return [{
          rowNumber: index + 2, occurredAt: occurredAt.getTime(), type: parsed.type, amountCents: parsed.amountCents,
          currency: selectedAccountRecord.currency,
          bankReference: mapping.bankReference ? String(row[mapping.bankReference] ?? "").trim() || null : null,
          description: mapping.description ? String(row[mapping.description] ?? "").trim() || null : null,
          rawData: JSON.stringify(row),
        }];
      }
      const amountCents = parseImportAmount(row[mapping.amount!]);
      if (!occurredAt || amountCents <= 0) throw new Error(`La fila ${index + 2} no tiene una fecha o importe válido.`);
      return [{
        rowNumber: index + 2,
        occurredAt: occurredAt.getTime(),
        type: inferImportType(row, mapping),
        amountCents,
        currency: selectedAccountRecord.currency,
        bankReference: mapping.bankReference ? String(row[mapping.bankReference] ?? "").trim() || null : null,
        description: mapping.description ? String(row[mapping.description] ?? "").trim() || null : null,
        rawData: JSON.stringify(row),
      }];
    });
    if (!rows.length) throw new Error("No se encontró ningún movimiento con importe, cargo o abono en el archivo.");
    const dates = rows.map(row => row.occurredAt).sort((a, b) => a - b);
    return { rows, periodStart: dates[0], periodEnd: dates[dates.length - 1] };
  }

  function submitImport() {
    try {
      if (!fileName) throw new Error("Selecciona un archivo CSV o Excel.");
      const payload = buildRows();
      importCsv.mutate({ accountId: Number(accountId), fileName, currency: selectedAccountRecord!.currency, ...payload });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Revisa el mapeo del estado de cuenta.");
    }
  }

  return <section className="content-card scroll-mt-6 space-y-5" id="conciliacion-bancaria" aria-labelledby="bank-reconciliation-title">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div><p className="eyebrow">Conciliación bancaria manual</p><h2 id="bank-reconciliation-title">Estados de cuenta y diferencias</h2><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Importa un CSV, encuentra coincidencias exactas por referencia e importe y confirma cada resultado. La conciliación automática nunca crea, edita ni elimina movimientos por sí sola.</p></div>
      <Button type="button" variant="outline" onClick={() => setImportOpen(current => !current)}><FileUp className="size-4" /> {importOpen ? "Cerrar importación" : "Importar estado CSV"}</Button>
    </div>

    {importOpen ? <div className="rounded-xl border border-primary/20 bg-primary/5 p-4" aria-label="Importar estado de cuenta">
      <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">Importar estado de cuenta</h3><p className="mt-1 text-sm text-muted-foreground">La vista previa se procesa localmente y sólo se guardan las filas después de confirmar.</p></div><Button type="button" variant="ghost" size="icon" aria-label="Cerrar importación" onClick={resetImport}><X className="size-4" /></Button></div>
      {!accounts.length ? (
        <p className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Para importar un estado de cuenta primero necesitas una cuenta registrada — <Link href="/movimientos" className="font-medium text-primary underline">te llevo a crear una</Link>.</p>
      ) : (<>
      <div className="mt-4 grid gap-3 md:grid-cols-2"><label className="form-field"><span>Cuenta bancaria</span><select value={accountId} onChange={event => setAccountId(event.target.value)}><option value="">Selecciona una cuenta</option>{accounts.filter(account => account.status !== "closed").map(account => <option value={account.id} key={account.id}>{account.name} · {account.currency}</option>)}</select></label><label className="form-field"><span>Archivo CSV o Excel</span><input type="file" accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={event => loadFile(event.target.files?.[0])} /></label></div>
      {fileName ? <p className="mt-3 text-sm font-medium text-foreground"><FileCheck2 className="mr-1 inline size-4 text-emerald-600" />{fileName} · {rawRows.length} fila(s)</p> : null}
      {headers.length ? <><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{mappingFields.map(field => <label className="form-field" key={field.key}><span>{field.label}{field.required ? " *" : ""}</span><select value={mapping[field.key] ?? ""} onChange={event => setMapping(current => ({ ...current, [field.key]: event.target.value || undefined }))}>{selectOptions(headers, mapping[field.key])}</select></label>)}</div><div className="mt-4 overflow-x-auto rounded-lg border bg-background"><table className="w-full min-w-[620px] text-xs"><thead className="border-b bg-muted/40 text-left uppercase tracking-wide text-muted-foreground"><tr><th className="p-2">Fila</th>{headers.slice(0, 5).map(header => <th className="p-2" key={header}>{header}</th>)}</tr></thead><tbody>{rawRows.slice(0, 4).map((row, index) => <tr className="border-b last:border-0" key={index}><td className="p-2 text-muted-foreground">{index + 2}</td>{headers.slice(0, 5).map(header => <td className="max-w-[180px] truncate p-2" key={header}>{String(row[header] ?? "")}</td>)}</tr>)}</tbody></table></div><div className="mt-4 flex flex-wrap justify-end gap-2"><Button type="button" variant="ghost" onClick={resetImport}>Cancelar</Button><Button type="button" onClick={submitImport} disabled={importCsv.isPending}><Upload className="size-4" /> {importCsv.isPending ? "Importando…" : "Importar y conciliar"}</Button></div></> : <p className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Selecciona un archivo para detectar sus columnas y revisar las primeras filas.</p>}
      </>)}
    </div> : null}

    {summaryQuery.isLoading ? <p className="text-sm text-muted-foreground">Cargando diferencias de conciliación…</p> : <>
      <div className="flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-end lg:justify-between"><div><h3 className="font-semibold">Resumen por cuenta</h3><p className="mt-1 text-sm text-muted-foreground">Las diferencias son filas sin confirmar o excluidas del estado importado.</p></div><label className="form-field w-full lg:w-80"><span>Cuenta</span><select value={selectedAccount} onChange={event => setSelectedAccount(event.target.value)}><option value="all">Todas las cuentas importadas</option>{(summary?.accounts ?? []).map((account: AccountSummaryView) => <option value={account.id} key={account.id}>{account.name} · {account.currency}</option>)}</select></label></div>
      {(summary?.accounts ?? []).length ? <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{summary!.accounts.map((account: AccountSummaryView) => <button type="button" className={`rounded-xl border p-4 text-left transition hover:border-primary/50 ${selectedAccount === String(account.id) ? "border-primary bg-primary/5" : "bg-background"}`} onClick={() => setSelectedAccount(String(account.id))} key={account.id}><div className="flex items-start justify-between gap-3"><div><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cuenta</span><h4 className="mt-1 font-semibold">{account.name}</h4></div><SearchCheck className={`size-5 ${account.unmatchedCount ? "text-rose-600" : "text-emerald-600"}`} /></div><div className="mt-3 grid grid-cols-3 gap-2 text-xs"><span><strong className="block text-lg">{account.rowCount}</strong>Total</span><span><strong className="block text-lg text-emerald-700 dark:text-emerald-400">{account.reconciledCount}</strong>Conciliadas</span><span><strong className={`block text-lg ${account.pendingCount ? "text-rose-700 dark:text-rose-400" : "text-muted-foreground"}`}>{account.pendingCount}</strong>Pendientes</span></div>{account.differenceCents ? <p className="mt-3 text-xs font-semibold text-rose-700 dark:text-rose-400">Importe sin resolver: {formatMoney(account.differenceCents, account.currency)}</p> : <p className="mt-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400">Sin diferencias pendientes</p>}</button>)}</div> : <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Todavía no hay estados de cuenta importados.</div>}
      {pendingRows.length ? <div className="mt-5 space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold">Diferencias para revisar</h3><p className="mt-1 text-sm text-muted-foreground">Confirma coincidencias automáticas o marca una fila como no aplicable.</p></div><div className="flex gap-2">{(summary?.imports ?? []).filter((item: StatementImportView) => selectedAccount === "all" || item.accountId === Number(selectedAccount)).map((item: StatementImportView) => <Button type="button" size="sm" variant="outline" key={item.id} onClick={() => autoMatch.mutate({ importId: item.id })} disabled={autoMatch.isPending}><RefreshCw className="size-4" />Reintentar automático</Button>)}</div></div><div className="space-y-2">{pendingRows.slice(0, 20).map((row: StatementRowView) => { const candidates = candidateTransactions.filter((transaction: TransactionView) => transaction.accountId === row.accountId && transaction.amountCents === row.amountCents && transaction.currency === row.currency && !transaction.reconciledAt); const selectedCandidate = row.matchedTransactionId ?? candidates[0]?.id ?? ""; return <div className="rounded-xl border bg-background p-3" key={row.id}><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="truncate">{row.description || "Movimiento bancario"}</strong><span className={`status-pill ${row.matchStatus === "auto_matched" ? "status-pill-positive" : "status-pill-negative"}`}>{row.matchStatus === "auto_matched" ? "Coincidencia encontrada" : "Sin coincidencia"}</span></div><p className="mt-1 text-xs text-muted-foreground">{formatDate(row.occurredAt)} · {row.bankReference || "Sin referencia"} · {formatMoney(row.amountCents, row.currency)}</p></div><div className="flex flex-wrap items-center gap-2"><input className="min-w-44" aria-label="Nota de ajuste" placeholder="Nota de ajuste" value={resolutionNotes[row.id] ?? ""} onChange={event => setResolutionNotes(current => ({ ...current, [row.id]: event.target.value }))} /><select aria-label="Movimiento local candidato" defaultValue={selectedCandidate}><option value="">Selecciona movimiento local</option>{candidates.map((candidate: TransactionView) => <option value={candidate.id} key={candidate.id}>{formatDate(candidate.occurredAt)} · {candidate.notes || "Movimiento"} · {formatMoney(candidate.amountCents, candidate.currency)}</option>)}</select><Button type="button" size="sm" onClick={event => { const select = event.currentTarget.parentElement?.querySelector("select") as HTMLSelectElement | null; resolveRow.mutate({ rowId: row.id, action: "confirm", transactionId: select?.value ? Number(select.value) : row.matchedTransactionId, note: resolutionNotes[row.id] || null }); }} disabled={resolveRow.isPending || (!row.matchedTransactionId && !candidates.length)}><FileCheck2 className="size-4" />Confirmar</Button><Button type="button" size="sm" variant="ghost" onClick={() => resolveRow.mutate({ rowId: row.id, action: "ignore", note: resolutionNotes[row.id] || null })} disabled={resolveRow.isPending}>Ignorar</Button></div></div></div>; })}</div>{pendingRows.length > 20 ? <p className="text-xs text-muted-foreground">Mostrando 20 de {pendingRows.length} filas pendientes; utiliza el filtro por cuenta para revisarlas por partes.</p> : null}</div> : null}
    </>}
  </section>;
}
