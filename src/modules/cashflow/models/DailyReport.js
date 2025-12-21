import {
  PAYMENT_METHODS,
  EXPENSE_SOURCE,
} from "../../../shared/constants/PaymentMethode.js";

// Fíjate que diga "export class", NO solo "class"
export class DailyReport {
  constructor({ date = new Date(), sales = {}, expenses = [] } = {}) {
    this.date = new Date(date);

    // 1. Inicializamos las ventas en 0
    this.sales = {
      [PAYMENT_METHODS.CASH]: Number(sales[PAYMENT_METHODS.CASH] || 0),
      [PAYMENT_METHODS.CARD]: Number(sales[PAYMENT_METHODS.CARD] || 0),
      [PAYMENT_METHODS.QR]: Number(sales[PAYMENT_METHODS.QR] || 0),
      [PAYMENT_METHODS.TRANSFER]: Number(sales[PAYMENT_METHODS.TRANSFER] || 0),
    };

    // 2. Inicializamos gastos
    this.expenses = Array.isArray(expenses) ? expenses : [];
  }

  /**
   * Calcula cuánto EFECTIVO debería haber en el cajón.
   */
  getExpectedCashInDrawer() {
    const cashSales = this.sales[PAYMENT_METHODS.CASH];

    const cashExpenses = this.expenses
      .filter((exp) => exp.source === EXPENSE_SOURCE.REGISTER)
      .reduce((sum, exp) => sum + exp.amount, 0);

    return cashSales - cashExpenses;
  }

  /**
   * Calcula el total de ventas brutas
   */
  getTotalSales() {
    return Object.values(this.sales).reduce((sum, val) => sum + val, 0);
  }
}
