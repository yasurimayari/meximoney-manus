import { CheckCircle2, CircleDashed } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type Props = {
  movement: { id: number; reconciledAt?: Date | string | null };
  compact?: boolean;
};

export function ReconciliationButton({ movement, compact = false }: Props) {
  const utils = trpc.useUtils();
  const mutation = trpc.finance.workspace.reconcileMovement.useMutation({
    onSuccess: result => {
      toast.success(result.reconciled ? "Movimiento conciliado" : "Conciliación retirada");
      void Promise.all([utils.finance.dashboard.invalidate(), utils.finance.workspace.bankStatements.summary.invalidate()]);
    },
    onError: error => toast.error(error.message),
  });
  const reconciled = Boolean(movement.reconciledAt);
  const label = reconciled ? "Retirar conciliación" : "Marcar como conciliado";
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${reconciled ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300" : "border-muted-foreground/25 bg-background text-muted-foreground hover:border-primary/40 hover:text-primary"}`}
      title={label}
      aria-label={`${label} · movimiento ${movement.id}`}
      aria-pressed={reconciled}
      disabled={mutation.isPending}
      onClick={() => {
        const nextReconciled = !reconciled;
        const note = nextReconciled ? window.prompt("Nota opcional del estado de cuenta", "") : null;
        if (nextReconciled && note === null) return;
        mutation.mutate({ id: movement.id, reconciled: nextReconciled, note });
      }}
    >
      {reconciled ? <CheckCircle2 className="size-3.5" /> : <CircleDashed className="size-3.5" />}
      {compact ? <span className="sr-only">{reconciled ? "Conciliado" : "Sin conciliar"}</span> : <span>{reconciled ? "Conciliado" : "Conciliar"}</span>}
    </button>
  );
}

export function ReconciliationStatus({ movement }: { movement: { reconciledAt?: Date | string | null } }) {
  if (!movement.reconciledAt) return <span className="text-xs text-muted-foreground">Sin conciliar</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="size-3.5" />Conciliado</span>;
}
