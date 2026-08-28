export type ProjectTaskFinancialReference = { id: number; title: string; linkedTransactionId?: number | null };
export type ProjectFinancialTransaction = { id: number; occurredAt: Date | string; type: string; currency: string; amountCents: number; notes?: string | null };

export type ProjectFinancialReference = {
  transaction: ProjectFinancialTransaction;
  tasks: ProjectTaskFinancialReference[];
};

export function projectFinancialReferences(tasks: ProjectTaskFinancialReference[], transactions: ProjectFinancialTransaction[]) {
  const transactionById = new Map(transactions.map(transaction => [transaction.id, transaction]));
  const references = new Map<number, ProjectFinancialReference>();

  tasks.forEach(task => {
    if (!task.linkedTransactionId) return;
    const transaction = transactionById.get(task.linkedTransactionId);
    if (!transaction) return;
    const current = references.get(transaction.id) ?? { transaction, tasks: [] };
    current.tasks.push(task);
    references.set(transaction.id, current);
  });

  return Array.from(references.values()).sort((left, right) => new Date(right.transaction.occurredAt).getTime() - new Date(left.transaction.occurredAt).getTime());
}
