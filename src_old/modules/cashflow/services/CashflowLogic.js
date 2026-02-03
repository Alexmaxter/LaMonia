export const CashflowLogic = {
  calculateMetrics(data) {
    // 1. Ingresos (Lo que entró por sistema)
    const cash = Number(data.payments.cash || 0);
    const digital =
      Number(data.payments.transfer || 0) +
      Number(data.payments.qr || 0) +
      Number(data.payments.card || 0);

    const totalIncome = cash + digital;

    // 2. Egresos (Vienen sumados desde la lista de gastos en el Form)
    const expenses = Number(data.expenses_cash || 0);
    const observations = Number(data.observations_amount || 0);

    // 3. Validación de Ventas (Comanda vs Pagos)
    const salesTotal = Number(data.sales_total || 0);
    const diffSales = totalIncome - salesTotal;
    // Consideramos "matching" si la diferencia es menor a $10 (por redondeos)
    const isSalesMatching = Math.abs(diffSales) < 10;

    // 4. Utilidad Neta (Ventas - Gastos Operativos)
    const netIncome = salesTotal - expenses;

    // 5. Arqueo de Caja (Teórico vs Real)
    // Efectivo que DEBERÍA haber: (Efectivo Entrante - Gastos Efvo - Retiros Efvo)
    const expectedCash = cash - expenses - observations;

    // Efectivo que el usuario DICE que hay
    const declaredCash = Number(data.cash_declared || 0);

    // Diferencia (Positivo = Sobra dinero, Negativo = Falta dinero)
    const cashDifference = declaredCash - expectedCash;

    return {
      totalIncome,
      totalOutflows: expenses + observations,
      expectedCash,
      declaredCash,
      netIncome,
      diffSales,
      isSalesMatching,
      cashDifference, // Métrica clave para seguridad
    };
  },
};
