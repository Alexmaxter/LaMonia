export const TransactionCalculator = {
  /**
   * Procesa el historial de transacciones, aplica filtros de fecha
   * y calcula los saldos acumulados fila por fila.
   */
  processHistory(supplier, transactions, dateFrom, dateTo) {
    const isStock = supplier.providerType === "stock";

    // Helper interno para fechas
    const parseDate = (d) => {
      if (!d) return new Date();
      if (d.seconds) return new Date(d.seconds * 1000);
      return new Date(d);
    };

    const fromDate = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
    const toDate = dateTo ? new Date(dateTo + "T23:59:59") : null;

    // 1. ORDENAR CRONOLÓGICAMENTE (Viejo -> Nuevo)
    const allSorted = [...transactions].sort((a, b) => {
      return parseDate(a.date).getTime() - parseDate(b.date).getTime();
    });

    // 2. CALCULAR SALDO INICIAL "REAL" (Matemática Inversa)
    // Partimos del saldo actual y restamos todo el historial para hallar el "Cero real"
    let startBalance = 0;
    if (!isStock) {
      const currentRealBalance = parseFloat(supplier.balance || 0);
      const totalHistorySum = allSorted.reduce((sum, t) => {
        const amount = parseFloat(t.amount || 0);
        return t.type === "invoice" ? sum + amount : sum - amount;
      }, 0);

      startBalance = currentRealBalance - totalHistorySum;
      startBalance = Math.round(startBalance * 100) / 100; // Ajuste decimales
    }

    // 3. PROCESAR FILAS
    let runningBalance = startBalance; // Saldo técnico global
    let balanceBeforeRange = startBalance; // Saldo acumulado hasta justo antes del filtro 'Desde'
    const transactionsInRange = [];

    allSorted.forEach((t) => {
      const tDate = parseDate(t.date);

      // Calcular impacto (+ o -)
      let impact = 0;
      if (!isStock) {
        const amount = parseFloat(t.amount || 0);
        impact = t.type === "invoice" ? amount : -amount;
      }

      // Lógica de Corte por Fechas
      if (fromDate && tDate < fromDate) {
        // Pasado: solo acumula al saldo inicial del reporte
        balanceBeforeRange += impact;
      } else if (!toDate || tDate <= toDate) {
        // Presente (en rango): se agrega a la lista y calculamos su saldo final
        const balanceAfterTransaction = runningBalance + impact;

        transactionsInRange.push({
          original: t,
          dateObj: tDate,
          impact: impact,
          runningBalance: balanceBeforeRange + impact, // Saldo visual tras esta operación
        });

        // Actualizamos el acumulador visual dentro del rango
        balanceBeforeRange += impact;
      }

      // Actualizamos el global
      runningBalance += impact;
    });

    return {
      isStock,
      initialBalance: startBalance, // El cero absoluto
      balanceBeforeRange, // El saldo "Arrastre" (Saldo Anterior)
      records: transactionsInRange, // Filas listas para mostrar
      showInitialRow: !isStock && (fromDate || Math.abs(startBalance) > 1),
    };
  },
};
