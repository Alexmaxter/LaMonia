export const DailyReportModel = {
  create(date, data = {}) {
    return {
      date: date,
      sales_total: Number(data.sales_total || 0),

      payments: {
        cash: Number(data.payments?.cash || 0),
        transfer: Number(data.payments?.transfer || 0),
        qr: Number(data.payments?.qr || 0),
        card: Number(data.payments?.card || 0),
      },

      // LISTA DETALLADA DE GASTOS
      // Reemplaza el input manual único.
      // Se sumará automáticamente para obtener expenses_cash y observations_amount
      expenses_list: Array.isArray(data.expenses_list)
        ? data.expenses_list
        : [],

      expenses_cash: Number(data.expenses_cash || 0), // Suma de gastos operativos
      observations_amount: Number(data.observations_amount || 0), // Suma de retiros

      // ARQUEO DE CAJA
      cash_declared: Number(data.cash_declared || 0), // Lo que el usuario cuenta físicamente

      // Justificación opcional si los números no cierran
      justification: data.justification || "",

      updatedAt: new Date(),
    };
  },
};
