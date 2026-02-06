// Helper local para normalizar nombres
const getSafeName = (item) => {
  if (!item) return "";
  if (typeof item === "string") return item;
  return item.name || item.description || item.desc || "";
};

export const TransactionCalculator = {
  getSafeName,

  /**
   * Calcula el balance monetario final.
   * FIX: Normalización agresiva (.toLowerCase) para detectar Deuda vs Pago.
   */
  calculateBalance({
    currentBalance,
    initialAmount,
    initialType,
    newAmount,
    newType,
  }) {
    let balance = parseFloat(currentBalance) || 0;

    // 1. Revertir transacción anterior (si es edición)
    if (initialAmount !== null) {
      const prev = parseFloat(initialAmount) || 0;
      const type = initialType ? initialType.toLowerCase().trim() : "";
      // Consideramos deuda cualquier variante: invoice, boleta, debt
      const isDebt =
        type === "invoice" || type === "boleta" || type === "deuda";

      // Si era deuda, sumaba. Para revertir, restamos.
      balance = isDebt ? balance - prev : balance + prev;
    }

    // 2. Aplicar nueva transacción
    const next = parseFloat(newAmount) || 0;
    const type = newType ? newType.toLowerCase().trim() : "";
    const isDebt = type === "invoice" || type === "boleta" || type === "deuda";

    // LÓGICA CENTRAL:
    // Deuda (Invoice) -> SUMA al saldo (Más deuda = Más positivo/Rojo)
    // Pago (Payment)  -> RESTA al saldo (Menos deuda)
    return isDebt ? balance + next : balance - next;
  },

  /**
   * Calcula el estado del stock
   */
  calculateStockDebt({
    currentStockDebt,
    initialItems,
    initialType,
    newItems,
    newType,
  }) {
    let stockDebt = { ...(currentStockDebt || {}) };

    // Helper para actualizar el mapa de deuda
    const updateDebt = (items, type, revert = false) => {
      if (!items || !Array.isArray(items)) return;
      const t = type ? type.toLowerCase().trim() : "";
      const isEntry = t === "invoice" || t === "boleta" || t === "deuda"; // Entrada de stock

      items.forEach((item) => {
        const name = getSafeName(item);
        const qty = parseFloat(item.quantity || item.qty) || 0;
        if (!stockDebt[name]) stockDebt[name] = 0;

        // Lógica de signos:
        // Entrada (Invoice) aumenta deuda de stock (+).
        // Si revertimos (revert=true), restamos (-).
        let change = isEntry ? qty : -qty;
        if (revert) change = -change;

        stockDebt[name] += change;
      });
    };

    // Revertir anterior
    updateDebt(initialItems, initialType, true);
    // Aplicar nuevo
    updateDebt(newItems, newType, false);

    // Limpieza de ceros
    Object.keys(stockDebt).forEach((key) => {
      if (Math.abs(stockDebt[key]) < 0.01) delete stockDebt[key];
    });

    return stockDebt;
  },
};
