export const TransactionCalculator = {
  /**
   * Procesa las transacciones para calcular saldo inicial, final y saldos históricos.
   * Retorna los datos listos para mostrar en la tabla.
   */
  processHistory(supplier, transactions = [], dateFrom, dateTo) {
    // 1. Ordenar cronológicamente (del más antiguo al más nuevo) para calcular
    let sorted = [...transactions].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    // 2. Filtrar por fecha si aplica
    let filtered = sorted;
    if (dateFrom) {
      filtered = filtered.filter((t) => t.date >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter((t) => t.date <= dateTo);
    }

    // 3. Calcular Saldo Inicial (antes del rango de fecha)
    // Si filtramos desde el día 10, el saldo inicial es la suma de todo lo anterior al día 10.
    let initialBalance = 0;

    // Si hay filtrado, calculamos lo previo
    if (dateFrom) {
      const previousTxs = sorted.filter((t) => t.date < dateFrom);
      previousTxs.forEach((tx) => {
        if (tx.type === "invoice") initialBalance += parseFloat(tx.amount);
        else initialBalance -= parseFloat(tx.amount);
      });
    }

    // 4. Calcular "Saldo Histórico" fila por fila sobre los filtrados
    let runningBalance = initialBalance;
    const recordsWithBalance = filtered.map((tx) => {
      const amount = parseFloat(tx.amount);

      if (tx.type === "invoice") {
        runningBalance += amount; // Boleta aumenta deuda
      } else {
        runningBalance -= amount; // Pago baja deuda
      }

      return {
        ...tx,
        amount: amount,
        historicalBalance: runningBalance, // Guardamos el saldo en ese momento exacto
      };
    });

    // 5. Invertir para mostrar el más reciente arriba en la vista (UX standard)
    const finalRecords = recordsWithBalance.reverse();

    return {
      initialBalance,
      finalBalance: runningBalance, // El saldo final del periodo seleccionado
      records: finalRecords,
    };
  },
};
