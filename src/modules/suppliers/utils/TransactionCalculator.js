// Helper local para normalizar nombres
const getSafeName = (item) => {
  if (!item) return "";
  if (typeof item === "string") return item;
  return item.name || item.description || item.desc || "";
};

export const TransactionCalculator = {
  // Exponemos el helper por si la vista lo necesita para mostrar nombres
  getSafeName,

  /**
   * Calcula el balance monetario final.
   */
  calculateBalance({
    currentBalance,
    initialAmount,
    initialType,
    newAmount,
    newType,
  }) {
    let balance = parseFloat(currentBalance) || 0;

    // Si editamos, revertimos el anterior
    if (initialAmount !== null) {
      const prev = parseFloat(initialAmount) || 0;
      balance = initialType === "invoice" ? balance - prev : balance + prev;
    }

    // Aplicamos el nuevo
    const next = parseFloat(newAmount) || 0;
    return newType === "invoice" ? balance + next : balance - next;
  },

  /**
   * Calcula la deuda de stock (envases/productos).
   * Usado para actualizar el saldo del proveedor al guardar.
   */
  calculateStockDebt({
    currentStockDebt,
    initialItems,
    initialType,
    newItems,
    newType,
  }) {
    let stockDebt = { ...(currentStockDebt || {}) };

    // Revertir anterior (Edición)
    if (initialItems && initialItems.length > 0) {
      initialItems.forEach((item) => {
        const name = item.name;
        const qty = parseFloat(item.quantity) || 0;
        if (!stockDebt[name]) stockDebt[name] = 0;
        stockDebt[name] += initialType === "invoice" ? -qty : qty;
      });
    }

    // Aplicar nuevo
    if (newItems && newItems.length > 0) {
      newItems.forEach((item) => {
        const name = item.name;
        const qty = parseFloat(item.quantity) || 0;
        if (!stockDebt[name]) stockDebt[name] = 0;
        stockDebt[name] += newType === "invoice" ? qty : -qty;
      });
    }

    // Limpieza de ceros
    Object.keys(stockDebt).forEach((key) => {
      if (Math.abs(stockDebt[key]) < 0.01) delete stockDebt[key];
    });

    return stockDebt;
  },

  /**
   * Reconstruye el estado de la deuda de stock basada en todo el historial.
   * MOVIDO DESDE TransactionModal.
   * @param {Array} movements - Lista completa de transacciones
   * @returns {Object} Mapa de { producto: cantidad_debida }
   */
  calculatePendingFromHistory(movements) {
    const totals = {};
    if (!movements || !Array.isArray(movements)) return totals;

    movements.forEach((m) => {
      const type = m.type ? m.type.toLowerCase() : "";
      const isEntry = type === "invoice" || type === "boleta";

      if (m.items && Array.isArray(m.items)) {
        m.items.forEach((item) => {
          const name = getSafeName(item).trim();
          const qty = parseFloat(item.quantity || item.qty || 0);
          if (name) {
            if (!totals[name]) totals[name] = 0;
            totals[name] += isEntry ? qty : -qty;
          }
        });
      }
    });

    // Filtramos saldos insignificantes
    Object.keys(totals).forEach((key) => {
      if (totals[key] <= 0.01) delete totals[key];
    });
    return totals;
  },
};
