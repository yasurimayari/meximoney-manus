import { MoneyText } from "@/components/MoneyText";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatMoney, toCents } from "@/lib/finance";
import { trpc } from "@/lib/trpc";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

type Props = { debt: any; transactions?: any[]; onDone: () => void | Promise<void> };

export function FinancedAssetPaymentForm({ debt, transactions = [], onDone }: Props) {
  const utils = trpc.useUtils();
  const mutation = trpc.finance.debts.paymentSave.useMutation({
    onSuccess: async () => {
      await utils.finance.debts.amortization.invalidate({ debtId: debt.id });
      toast.success("Pago vencido registrado y saldo actualizado correctamente.");
      await onDone();
    },
    onError: error => toast.error(error.message),
  });
  const eligibleExpenses = useMemo(() => transactions
    .filter(transaction => transaction.type === "expense" && transaction.accountId && transaction.currency === debt.currency && transaction.reviewStatus === "approved")
    .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()), [debt.currency, transactions]);
  const [form, setForm] = useState(() => ({
    transactionId: "",
    total: "",
    principal: "",
    interest: "0",
    lateInterest: "0",
    fee: "0",
    paidAt: new Date().toISOString().slice(0, 10),
    nextDue: debt.nextDueAt ? new Date(debt.nextDueAt).toISOString().slice(0, 10) : "",
    notes: "",
  }));
  const selectExpense = (id: string) => {
    const selected = eligibleExpenses.find(item => item.id === Number(id));
    setForm(current => ({ ...current, transactionId: id, total: selected ? (selected.amountCents / 100).toFixed(2) : current.total, principal: selected ? (selected.amountCents / 100).toFixed(2) : current.principal }));
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!window.confirm("Confirma este pago de la cuota vencida. El principal reducirá el saldo; intereses y cargos se conservarán como desglose. No se realizará ninguna transferencia.")) return;
    mutation.mutate({
      debtId: debt.id,
      linkedTransactionId: form.transactionId ? Number(form.transactionId) : null,
      totalPaymentCents: toCents(form.total),
      principalCents: toCents(form.principal),
      interestCents: toCents(form.interest),
      lateInterestCents: toCents(form.lateInterest),
      feeCents: toCents(form.fee),
      currency: debt.currency,
      paidAt: new Date(`${form.paidAt}T12:00:00`).getTime(),
      nextDueAt: form.nextDue ? new Date(`${form.nextDue}T12:00:00`).getTime() : null,
      notes: form.notes || null,
    });
  };
  return <form className="form-grid" onSubmit={submit}>
    <div className="form-field span-2"><Label>Gasto real ya registrado</Label><select value={form.transactionId} onChange={event => selectExpense(event.target.value)}><option value="">Selecciona un gasto aprobado (opcional)</option>{eligibleExpenses.map(transaction => <option key={transaction.id} value={transaction.id}>{formatDate(transaction.occurredAt)} · {transaction.notes || "Gasto sin nota"} · <MoneyText cents={transaction.amountCents} currency={debt.currency} /></option>)}</select><p className="text-xs text-muted-foreground">Sólo aparecen gastos aprobados, con cuenta y moneda compatible. No se crea un segundo gasto.</p></div>
    <div className="form-field"><Label>Pago total</Label><Input required type="number" min="0.01" step="0.01" value={form.total} onChange={event => setForm({ ...form, total: event.target.value })} /></div>
    <div className="form-field"><Label>Capital</Label><Input required type="number" min="0" step="0.01" value={form.principal} onChange={event => setForm({ ...form, principal: event.target.value })} /></div>
    <div className="form-field"><Label>Interés ordinario</Label><Input required type="number" min="0" step="0.01" value={form.interest} onChange={event => setForm({ ...form, interest: event.target.value })} /></div>
    <div className="form-field"><Label>Interés vencido</Label><Input required type="number" min="0" step="0.01" value={form.lateInterest} onChange={event => setForm({ ...form, lateInterest: event.target.value })} /></div>
    <div className="form-field"><Label>Cargos</Label><Input required type="number" min="0" step="0.01" value={form.fee} onChange={event => setForm({ ...form, fee: event.target.value })} /></div>
    <div className="form-field"><Label>Fecha de pago</Label><Input required type="date" value={form.paidAt} onChange={event => setForm({ ...form, paidAt: event.target.value })} /></div>
    <div className="form-field"><Label>Próximo vencimiento</Label><Input type="date" value={form.nextDue} onChange={event => setForm({ ...form, nextDue: event.target.value })} /></div>
    <div className="form-field span-2"><Label>Notas de conciliación</Label><Textarea placeholder="Referencia del comprobante o estado de cuenta" value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /></div>
    <div className="form-actions span-2"><Button type="submit" disabled={mutation.isPending || !form.total || !form.principal}>{mutation.isPending ? "Guardando…" : "Confirmar pago vencido"}</Button></div>
  </form>;
}
