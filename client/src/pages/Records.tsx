import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatMoney, fromCents, scopeLabel, toCents } from "@/lib/finance";
import { trpc } from "@/lib/trpc";
import { Archive, ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Building2, FileText, FolderPlus, Landmark, Pencil, Plus, ReceiptText, Trash2, WalletCards } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

type RecordMode = "movement" | "account" | "category" | "document";

const typeLabel = {
  income: "Ingreso",
  expense: "Gasto",
  transfer_out: "Transferencia salida",
  transfer_in: "Transferencia entrada",
} as const;

function ScopePill({ scope }: { scope: "personal" | "business" | "mixed" }) {
  return <span className={`scope-pill scope-${scope}`}>{scopeLabel[scope]}</span>;
}

export default function Records() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.finance.dashboard.useQuery();
  const [mode, setMode] = useState<RecordMode>("movement");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<any>(null);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingDocument, setEditingDocument] = useState<any>(null);
  const [initialMovementType, setInitialMovementType] = useState<keyof typeof typeLabel>("expense");

  const refresh = async () => {
    await utils.finance.dashboard.invalidate();
    setDialogOpen(false);
    setEditingMovement(null);
    setEditingAccount(null);
    setEditingCategory(null);
    setEditingDocument(null);
  };

  const removeTransaction = trpc.finance.transactions.remove.useMutation({ onSuccess: refresh, onError: error => toast.error(error.message) });
  const removeAccount = trpc.finance.accounts.remove.useMutation({ onSuccess: refresh, onError: error => toast.error(error.message) });
  const removeCategory = trpc.finance.categories.remove.useMutation({ onSuccess: refresh, onError: error => toast.error(error.message) });
  const removeDocument = trpc.finance.documents.remove.useMutation({ onSuccess: refresh, onError: error => toast.error(error.message) });

  const accounts = data?.accounts ?? [];
  const categories = data?.categories ?? [];
  const transactions = useMemo(() => (data?.transactions ?? []).slice().sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()), [data?.transactions]);

  const openCreate = (nextMode: RecordMode, movementType: keyof typeof typeLabel = "expense") => {
    setMode(nextMode);
    setInitialMovementType(movementType);
    setEditingMovement(null);
    setEditingAccount(null);
    setEditingCategory(null);
    setEditingDocument(null);
    setDialogOpen(true);
  };

  if (isLoading) return <div className="page-loading">Cargando tus registros privados…</div>;

  return (
    <div className="space-y-8">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Registro manual</p>
          <h1>Movimientos y recursos</h1>
          <p>Registra información confirmada, estimada o pendiente de revisar. Meximoney no conecta cuentas ni mueve dinero.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary" onClick={() => openCreate("movement")}><Plus className="size-4" /> Nuevo registro</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingMovement ? "Editar movimiento" : editingAccount ? "Editar cuenta o activo" : editingCategory ? "Editar categoría" : editingDocument ? "Editar documento" : "Crear un registro"}</DialogTitle>
              <DialogDescription>Los cambios solo afectan tus registros manuales de Meximoney.</DialogDescription>
            </DialogHeader>
            <Tabs value={mode} onValueChange={value => setMode(value as RecordMode)}>
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="movement">Movimiento</TabsTrigger>
                <TabsTrigger value="account">Cuenta</TabsTrigger>
                <TabsTrigger value="category">Categoría</TabsTrigger>
                <TabsTrigger value="document">Documento</TabsTrigger>
              </TabsList>
            </Tabs>
            {mode === "movement" && <MovementForm accounts={accounts} categories={categories} defaultCurrency={data?.profile?.currency ?? "MXN"} initialType={initialMovementType} editing={editingMovement} onDone={refresh} />}
            {mode === "account" && <AccountForm defaultCurrency={data?.profile?.currency ?? "MXN"} editing={editingAccount} onDone={refresh} />}
            {mode === "category" && <CategoryForm editing={editingCategory} onDone={refresh} />}
            {mode === "document" && <DocumentForm editing={editingDocument} onDone={refresh} />}
          </DialogContent>
        </Dialog>
      </header>

      <section className="record-shortcuts" aria-label="Crear registros">
        {[
          { mode: "movement" as const, movementType: "income" as const, icon: ArrowDownLeft, title: "Ingreso", note: "Cobros y entradas manuales" },
          { mode: "movement" as const, movementType: "expense" as const, icon: ArrowUpRight, title: "Gasto", note: "Pagos y salidas manuales" },
          { mode: "account" as const, icon: WalletCards, title: "Cuenta o activo", note: "Efectivo, banco, inversión o empresa" },
          { mode: "document" as const, icon: FileText, title: "Documento", note: "Enlace de respaldo y vencimientos" },
        ].map(item => (
          <button key={item.title} onClick={() => openCreate(item.mode, "movementType" in item ? item.movementType : "expense")} className="shortcut-card">
            <item.icon className="size-5" /><span><strong>{item.title}</strong><small>{item.note}</small></span><Plus className="size-4 shortcut-plus" />
          </button>
        ))}
      </section>

      <section className="content-card overflow-hidden">
        <div className="card-title-row"><div><h2>Movimientos recientes</h2><p>{transactions.length} registros manuales en total</p></div><button className="text-link" onClick={() => openCreate("movement")}>Registrar movimiento</button></div>
        {transactions.length === 0 ? <EmptyRecords icon={ReceiptText} title="Todavía no hay movimientos" description="Empieza con un ingreso, gasto o transferencia. Los indicadores del panel se actualizarán con tus registros." action={() => openCreate("movement")} actionLabel="Registrar primer movimiento" /> : (
          <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Detalle</th><th>Área</th><th>Cuenta</th><th>Importe</th><th></th></tr></thead><tbody>{transactions.slice(0, 16).map(item => {
            const account = accounts.find(accountItem => accountItem.id === item.accountId);
            const category = categories.find(categoryItem => categoryItem.id === item.categoryId);
            const negative = item.type === "expense" || item.type === "transfer_out";
            return <tr key={item.id}><td>{formatDate(item.occurredAt, { day: "2-digit", month: "short" })}</td><td><div className="table-main"><span className={`movement-icon type-${item.type}`}>{item.type === "income" || item.type === "transfer_in" ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}</span><span><strong>{item.notes || typeLabel[item.type]}</strong><small>{category?.name ?? "Sin categoría"} · {item.status === "needs_review" ? "Revisar" : item.status === "estimated" ? "Estimado" : "Confirmado"}</small></span></div></td><td><ScopePill scope={item.scope} /></td><td>{account?.name ?? "Sin cuenta"}</td><td className={negative ? "amount-negative" : "amount-positive"}>{negative ? "−" : "+"}{formatMoney(item.amountCents, item.currency)}</td><td><div className="row-actions"><button aria-label="Editar movimiento" onClick={() => { setMode("movement"); setEditingMovement(item); setDialogOpen(true); }}><Pencil className="size-4" /></button><button aria-label="Eliminar movimiento" onClick={() => { if (confirm("¿Eliminar este movimiento manual?") ) removeTransaction.mutate({ id: item.id }); }}><Trash2 className="size-4" /></button></div></td></tr>;
          })}</tbody></table></div>)}
      </section>

      <div className="grid xl:grid-cols-2 gap-6">
        <section className="content-card">
          <div className="card-title-row"><div><h2>Cuentas y activos</h2><p>Valores manuales con fecha de valoración.</p></div><button className="icon-text-button" onClick={() => openCreate("account")}><Plus className="size-4" /> Añadir</button></div>
          {accounts.length === 0 ? <EmptyRecords icon={Landmark} title="Sin cuentas ni activos" description="Registra efectivo, cuentas, inversiones, inmuebles o activos empresariales." action={() => openCreate("account")} actionLabel="Añadir cuenta" compact /> : <div className="mini-list">{accounts.map(account => <div className="mini-list-row" key={account.id}><div className="mini-icon"><Landmark className="size-4" /></div><div><strong>{account.name}</strong><small>{account.type} · {account.isLiquid ? "Liquidez inmediata" : "No líquido"}</small></div><div className="mini-value"><strong>{formatMoney(account.currentValueCents, account.currency)}</strong><small>{formatDate(account.valuationDate)}</small></div><div className="row-actions"><button aria-label="Editar cuenta" onClick={() => { setMode("account"); setEditingAccount(account); setDialogOpen(true); }}><Pencil className="size-4" /></button><button aria-label="Eliminar cuenta" onClick={() => { if (confirm("¿Eliminar esta cuenta o activo?") ) removeAccount.mutate({ id: account.id }); }}><Trash2 className="size-4" /></button></div></div>)}</div>}
        </section>
        <section className="content-card">
          <div className="card-title-row"><div><h2>Categorías</h2><p>Clasifica y separa lo personal de lo empresarial.</p></div><button className="icon-text-button" onClick={() => openCreate("category")}><Plus className="size-4" /> Añadir</button></div>
          {categories.length === 0 ? <EmptyRecords icon={FolderPlus} title="Crea tus primeras categorías" description="Las categorías permiten comparar gastos reales y presupuesto." action={() => openCreate("category")} actionLabel="Crear categoría" compact /> : <div className="category-grid">{categories.map(category => <div key={category.id} className="category-token"><span><strong>{category.name}</strong><small>{category.type} · {scopeLabel[category.scope]}</small></span><div className="row-actions"><button aria-label="Editar categoría" onClick={() => { setMode("category"); setEditingCategory(category); setDialogOpen(true); }}><Pencil className="size-4" /></button><button aria-label="Eliminar categoría" onClick={() => { if (confirm("¿Eliminar esta categoría?") ) removeCategory.mutate({ id: category.id }); }}><Trash2 className="size-4" /></button></div></div>)}</div>}
        </section>
      </div>

      <section className="content-card">
        <div className="card-title-row"><div><h2>Documentos de respaldo</h2><p>Registra enlaces seguros, tipo de documento y vencimientos. No se procesan pagos ni datos bancarios.</p></div><button className="icon-text-button" onClick={() => openCreate("document")}><Plus className="size-4" /> Añadir documento</button></div>
        {(data?.documents.length ?? 0) === 0 ? <EmptyRecords icon={Archive} title="Sin documentos registrados" description="Puedes guardar el enlace de un contrato, extracto, factura o comprobante." action={() => openCreate("document")} actionLabel="Añadir documento" compact /> : <div className="document-list">{data?.documents.map(document => <div className="mini-list-row" key={document.id}><div className="mini-icon"><FileText className="size-4" /></div><div><strong>{document.name}</strong><small>{document.type} · {scopeLabel[document.scope]} · {document.verified ? "Verificado" : "Por verificar"}</small></div>{document.referenceUrl ? <a className="text-link" href={document.referenceUrl} target="_blank" rel="noreferrer">Abrir enlace</a> : <span className="text-muted">Sin enlace</span>}<div className="row-actions"><button aria-label="Editar documento" onClick={() => { setMode("document"); setEditingDocument(document); setDialogOpen(true); }}><Pencil className="size-4" /></button><button aria-label="Eliminar documento" onClick={() => { if (confirm("¿Eliminar este documento?") ) removeDocument.mutate({ id: document.id }); }}><Trash2 className="size-4" /></button></div></div>)}</div>}
      </section>
    </div>
  );
}

function EmptyRecords({ icon: Icon, title, description, action, actionLabel, compact = false }: { icon: typeof Landmark; title: string; description: string; action: () => void; actionLabel: string; compact?: boolean }) {
  return <div className={`empty-state ${compact ? "empty-compact" : ""}`}><div className="empty-icon"><Icon className="size-5" /></div><div><h3>{title}</h3><p>{description}</p>{!compact && <Button variant="outline" className="mt-4" onClick={action}>{actionLabel}</Button>}</div>{compact && <Button variant="outline" onClick={action}>{actionLabel}</Button>}</div>;
}

function MovementForm({ accounts, categories, defaultCurrency, initialType, editing, onDone }: { accounts: any[]; categories: any[]; defaultCurrency: string; initialType: keyof typeof typeLabel; editing: any; onDone: () => void }) {
  const mutation = trpc.finance.transactions.save.useMutation({ onSuccess: () => { toast.success("Movimiento guardado"); onDone(); }, onError: error => toast.error(error.message) });
  const [form, setForm] = useState(() => ({ type: editing?.type ?? initialType, scope: editing?.scope ?? "personal", amount: editing ? fromCents(editing.amountCents) : "", currency: editing?.currency ?? defaultCurrency, accountId: editing?.accountId?.toString() ?? "", categoryId: editing?.categoryId?.toString() ?? "", occurredAt: editing?.occurredAt ? new Date(editing.occurredAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10), isEssential: editing?.isEssential ?? false, status: editing?.status ?? "confirmed", transferGroupId: editing?.transferGroupId ?? "", notes: editing?.notes ?? "" }));
  const submit = (event: FormEvent) => { event.preventDefault(); mutation.mutate({ id: editing?.id, type: form.type, scope: form.scope, amountCents: toCents(form.amount), currency: form.currency.toUpperCase(), accountId: form.accountId ? Number(form.accountId) : null, categoryId: form.categoryId ? Number(form.categoryId) : null, occurredAt: new Date(`${form.occurredAt}T12:00:00`).getTime(), isEssential: form.isEssential, status: form.status, transferGroupId: form.transferGroupId || null, notes: form.notes || null }); };
  const isTransfer = form.type.startsWith("transfer");
  return <form className="form-grid" onSubmit={submit}><div className="form-field"><Label>Tipo</Label><select value={form.type} onChange={event => setForm({ ...form, type: event.target.value as any })}>{Object.entries(typeLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="form-field"><Label>Área</Label><select value={form.scope} onChange={event => setForm({ ...form, scope: event.target.value as any })}><option value="personal">Personal</option><option value="business">Empresarial</option><option value="mixed">Mixto</option></select></div><div className="form-field"><Label>Importe</Label><Input type="number" min="0.01" step="0.01" required value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} /></div><div className="form-field"><Label>Moneda</Label><Input maxLength={3} required value={form.currency} onChange={event => setForm({ ...form, currency: event.target.value.toUpperCase() })} /></div><div className="form-field"><Label>Fecha</Label><Input type="date" required value={form.occurredAt} onChange={event => setForm({ ...form, occurredAt: event.target.value })} /></div><div className="form-field"><Label>Cuenta</Label><select value={form.accountId} onChange={event => setForm({ ...form, accountId: event.target.value })}><option value="">Sin cuenta / pendiente</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div>{!isTransfer && <div className="form-field"><Label>Categoría</Label><select value={form.categoryId} onChange={event => setForm({ ...form, categoryId: event.target.value })}><option value="">Sin categoría / pendiente</option>{categories.filter(category => category.isActive).map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>}{isTransfer && <div className="form-field"><Label>Grupo de transferencia</Label><Input placeholder="Mismo identificador para entrada y salida" value={form.transferGroupId} onChange={event => setForm({ ...form, transferGroupId: event.target.value })} /></div>}<div className="form-field"><Label>Calidad del dato</Label><select value={form.status} onChange={event => setForm({ ...form, status: event.target.value as any })}><option value="confirmed">Confirmado</option><option value="estimated">Estimado</option><option value="needs_review">Pendiente de revisar</option></select></div><div className="switch-row"><Switch checked={form.isEssential} onCheckedChange={checked => setForm({ ...form, isEssential: checked })} /><span>Gasto esencial</span></div><div className="form-field span-2"><Label>Descripción o nota</Label><Textarea placeholder="Ej. Compra semanal, factura, aclaración" value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /></div><div className="form-actions span-2"><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Guardando…" : editing ? "Guardar cambios" : "Guardar movimiento"}</Button></div></form>;
}

function AccountForm({ defaultCurrency, editing, onDone }: { defaultCurrency: string; editing: any; onDone: () => void }) {
  const mutation = trpc.finance.accounts.save.useMutation({ onSuccess: () => { toast.success("Cuenta o activo guardado"); onDone(); }, onError: error => toast.error(error.message) });
  const [form, setForm] = useState(() => ({ name: editing?.name ?? "", type: editing?.type ?? "bank", scope: editing?.scope ?? "personal", value: editing ? fromCents(editing.currentValueCents) : "", currency: editing?.currency ?? defaultCurrency, isLiquid: editing?.isLiquid ?? true, valuationDate: editing?.valuationDate ? new Date(editing.valuationDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10), status: editing?.status ?? "active", notes: editing?.notes ?? "" }));
  const submit = (event: FormEvent) => { event.preventDefault(); mutation.mutate({ id: editing?.id, name: form.name, type: form.type, scope: form.scope, currentValueCents: toCents(form.value), currency: form.currency.toUpperCase(), isLiquid: form.isLiquid, valuationDate: form.valuationDate ? new Date(`${form.valuationDate}T12:00:00`).getTime() : null, status: form.status, notes: form.notes || null }); };
  return <form className="form-grid" onSubmit={submit}><div className="form-field span-2"><Label>Nombre</Label><Input required placeholder="Ej. Cuenta operativa, fondo de emergencia" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></div><div className="form-field"><Label>Tipo</Label><select value={form.type} onChange={event => setForm({ ...form, type: event.target.value as any })}><option value="cash">Efectivo</option><option value="bank">Cuenta bancaria</option><option value="investment">Inversión</option><option value="pension">Pensión</option><option value="property">Inmueble</option><option value="business">Empresa</option><option value="other">Otro</option></select></div><div className="form-field"><Label>Área</Label><select value={form.scope} onChange={event => setForm({ ...form, scope: event.target.value as any })}><option value="personal">Personal</option><option value="business">Empresarial</option><option value="mixed">Mixto</option></select></div><div className="form-field"><Label>Valor actual</Label><Input type="number" min="0" step="0.01" required value={form.value} onChange={event => setForm({ ...form, value: event.target.value })} /></div><div className="form-field"><Label>Moneda</Label><Input maxLength={3} required value={form.currency} onChange={event => setForm({ ...form, currency: event.target.value.toUpperCase() })} /></div><div className="form-field"><Label>Fecha de valoración</Label><Input type="date" value={form.valuationDate} onChange={event => setForm({ ...form, valuationDate: event.target.value })} /></div><div className="form-field"><Label>Estado</Label><select value={form.status} onChange={event => setForm({ ...form, status: event.target.value as any })}><option value="active">Activa</option><option value="closed">Cerrada</option></select></div><div className="switch-row"><Switch checked={form.isLiquid} onCheckedChange={checked => setForm({ ...form, isLiquid: checked })} /><span>Disponible como liquidez</span></div><div className="form-field span-2"><Label>Notas</Label><Textarea value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /></div><div className="form-actions span-2"><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Guardando…" : "Guardar cuenta o activo"}</Button></div></form>;
}

function CategoryForm({ editing, onDone }: { editing: any; onDone: () => void }) {
  const mutation = trpc.finance.categories.save.useMutation({ onSuccess: () => { toast.success("Categoría guardada"); onDone(); }, onError: error => toast.error(error.message) });
  const [form, setForm] = useState(() => ({ name: editing?.name ?? "", type: editing?.type ?? "expense", scope: editing?.scope ?? "personal", isEssential: editing?.isEssential ?? false, isActive: editing?.isActive ?? true }));
  const submit = (event: FormEvent) => { event.preventDefault(); mutation.mutate({ id: editing?.id, ...form } as any); };
  return <form className="form-grid" onSubmit={submit}><div className="form-field span-2"><Label>Nombre de la categoría</Label><Input required placeholder="Ej. Alimentación, clientes, impuestos" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></div><div className="form-field"><Label>Tipo</Label><select value={form.type} onChange={event => setForm({ ...form, type: event.target.value })}><option value="income">Ingreso</option><option value="expense">Gasto</option><option value="transfer">Transferencia</option><option value="mixed">Mixta</option></select></div><div className="form-field"><Label>Área</Label><select value={form.scope} onChange={event => setForm({ ...form, scope: event.target.value })}><option value="personal">Personal</option><option value="business">Empresarial</option><option value="mixed">Mixto</option></select></div><div className="switch-row span-2"><Switch checked={form.isEssential} onCheckedChange={checked => setForm({ ...form, isEssential: checked })} /><span>Esta categoría es esencial</span></div><div className="switch-row span-2"><Switch checked={form.isActive} onCheckedChange={checked => setForm({ ...form, isActive: checked })} /><span>Categoría disponible para nuevos registros</span></div><div className="form-actions span-2"><Button type="submit" disabled={mutation.isPending}>Guardar categoría</Button></div></form>;
}

function DocumentForm({ editing, onDone }: { editing: any; onDone: () => void }) {
  const mutation = trpc.finance.documents.save.useMutation({ onSuccess: () => { toast.success("Documento registrado"); onDone(); }, onError: error => toast.error(error.message) });
  const [form, setForm] = useState(() => ({ name: editing?.name ?? "", type: editing?.type ?? "receipt", scope: editing?.scope ?? "personal", referenceUrl: editing?.referenceUrl ?? "", issuedAt: editing?.issuedAt ? new Date(editing.issuedAt).toISOString().slice(0, 10) : "", expiresAt: editing?.expiresAt ? new Date(editing.expiresAt).toISOString().slice(0, 10) : "", verified: editing?.verified ?? false, notes: editing?.notes ?? "" }));
  const submit = (event: FormEvent) => { event.preventDefault(); mutation.mutate({ id: editing?.id, ...form, issuedAt: form.issuedAt ? new Date(`${form.issuedAt}T12:00:00`).getTime() : null, expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T12:00:00`).getTime() : null, referenceUrl: form.referenceUrl || null, notes: form.notes || null } as any); };
  return <form className="form-grid" onSubmit={submit}><div className="form-field span-2"><Label>Nombre</Label><Input required placeholder="Ej. Factura de proveedor · agosto 2026" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></div><div className="form-field"><Label>Tipo</Label><select value={form.type} onChange={event => setForm({ ...form, type: event.target.value })}><option value="statement">Extracto</option><option value="invoice">Factura</option><option value="contract">Contrato</option><option value="policy">Póliza</option><option value="tax">Fiscal</option><option value="receipt">Comprobante</option><option value="other">Otro</option></select></div><div className="form-field"><Label>Área</Label><select value={form.scope} onChange={event => setForm({ ...form, scope: event.target.value })}><option value="personal">Personal</option><option value="business">Empresarial</option><option value="mixed">Mixto</option></select></div><div className="form-field span-2"><Label>URL segura de referencia</Label><Input type="url" placeholder="https://…" value={form.referenceUrl} onChange={event => setForm({ ...form, referenceUrl: event.target.value })} /></div><div className="form-field"><Label>Fecha de emisión</Label><Input type="date" value={form.issuedAt} onChange={event => setForm({ ...form, issuedAt: event.target.value })} /></div><div className="form-field"><Label>Vencimiento</Label><Input type="date" value={form.expiresAt} onChange={event => setForm({ ...form, expiresAt: event.target.value })} /></div><div className="switch-row span-2"><Switch checked={form.verified} onCheckedChange={checked => setForm({ ...form, verified: checked })} /><span>Documento revisado y verificado</span></div><div className="form-field span-2"><Label>Notas</Label><Textarea value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /></div><div className="form-actions span-2"><Button type="submit" disabled={mutation.isPending}>Registrar documento</Button></div></form>;
}
