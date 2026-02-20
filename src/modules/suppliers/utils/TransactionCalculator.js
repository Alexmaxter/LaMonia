import { TRANSACTION_GROUPS } from "../../../shared/constants/index.js";

export const TransactionCalculator = {
  /**
   * Determina si un monto suma o resta a la deuda basándose en su tipo.
   */
  getSignedAmount(type, amount) {
    const t = (type || "").toLowerCase();
    const a = parseFloat(amount || 0);
    if (TRANSACTION_GROUPS.DEBTS.includes(t)) return a;
    return -a; // Pagos y notas de crédito restan a la deuda
  },

  /**
   * Define la prioridad visual para el desempate cuando comparten fecha.
   */
  getTypePriority(type) {
    const t = (type || "").toLowerCase();
    if (TRANSACTION_GROUPS.PAYMENTS.includes(t)) return 2; // Prioridad ALTA (Arriba)
    if (TRANSACTION_GROUPS.DEBTS.includes(t)) return 1; // Prioridad MEDIA
    return 0; // Prioridad BAJA
  },

  /**
   * Ordena transacciones (Smart Sorting):
   * 1. Cronológico descendente
   * 2. Desempate por prioridad (Pagos primero)
   */
  sortTransactionsDescending(transactions) {
    return [...transactions].sort((a, b) => {
      const dateA = a.date?.seconds
        ? new Date(a.date.seconds * 1000)
        : new Date(a.date);
      const dateB = b.date?.seconds
        ? new Date(b.date.seconds * 1000)
        : new Date(b.date);

      const isSameDay = dateA.toDateString() === dateB.toDateString();
      if (isSameDay) {
        const priorityA = this.getTypePriority(a.type);
        const priorityB = this.getTypePriority(b.type);
        if (priorityA !== priorityB) return priorityB - priorityA;
        return dateB - dateA;
      }
      return dateB - dateA;
    });
  },

  /**
   * Genera el libro mayor (Ledger) con los saldos parciales calculados.
   * Recibe el saldo actual del proveedor y la lista ordenada cronológicamente.
   */
  processLedger(currentBalance, sortedMovements) {
    let fallbackBalance = parseFloat(currentBalance) || 0;

    return sortedMovements.map((m) => {
      let balanceDisplay = 0;
      if (m.savedBalance !== undefined && m.savedBalance !== null) {
        balanceDisplay = m.savedBalance;
        fallbackBalance =
          m.savedBalance - this.getSignedAmount(m.type, m.amount);
      } else {
        const snapshot = fallbackBalance;
        fallbackBalance -= this.getSignedAmount(m.type, m.amount);
        balanceDisplay = snapshot;
      }
      return { ...m, partialBalance: balanceDisplay };
    });
  },
};
