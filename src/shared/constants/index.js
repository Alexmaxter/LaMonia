/**
 * src/shared/constants/index.js
 * Centralización de constantes para evitar "Magic Strings" en toda la aplicación.
 */

// 1. Tipos de Transacciones / Comprobantes (Los valores que se guardan en Firebase)
export const TRANSACTION_TYPES = {
  INVOICE: "invoice",
  BOLETA: "boleta",
  PURCHASE: "compra",
  PAYMENT: "payment",
  PAGO: "pago",
  CREDIT_NOTE: "credit",
  DEBIT_NOTE: "debit",
  NOTE: "note",
  NOTA: "nota",
  DEBT: "deuda",
};

// 2. Agrupaciones Lógicas (Útiles para el controlador, calculadoras y filtros)
// Permite agrupar rápidamente qué tipos suman deuda y cuáles la restan.
export const TRANSACTION_GROUPS = {
  // Lo que nos genera deuda con el proveedor
  DEBTS: [
    TRANSACTION_TYPES.INVOICE,
    TRANSACTION_TYPES.BOLETA,
    TRANSACTION_TYPES.PURCHASE,
    TRANSACTION_TYPES.DEBT,
    TRANSACTION_TYPES.DEBIT_NOTE,
  ],
  // Lo que salda deuda con el proveedor
  PAYMENTS: [
    TRANSACTION_TYPES.PAYMENT,
    TRANSACTION_TYPES.PAGO,
    TRANSACTION_TYPES.CREDIT_NOTE,
  ],
  // Otros tipos de notas/ajustes
  NOTES: [
    TRANSACTION_TYPES.NOTE,
    TRANSACTION_TYPES.NOTA,
    TRANSACTION_TYPES.CREDIT_NOTE,
    TRANSACTION_TYPES.DEBIT_NOTE,
  ],
};

// 3. Métodos de Pago (Recuperados de tu versión anterior y actualizados)
export const PAYMENT_METHODS = {
  CASH: "cash", // Efectivo
  CARD: "card", // Tarjeta (Débito/Crédito)
  QR: "qr", // Billeteras virtuales (MercadoPago, MODO)
  TRANSFER: "transfer", // Transferencia bancaria
};

// 4. Estados de Transacción (Para facturas o pagos)
export const TRANSACTION_STATUS = {
  PENDING: "pending", // Pendiente de pago / impago
  PARTIAL: "partial", // Pago parcial
  PAID: "paid", // Pagado en su totalidad
  CANCELLED: "cancelled", // Anulado / Cancelado
};

// 5. Filtros de la Interfaz de Usuario (UI)
export const UI_FILTERS = {
  ALL: "all",
  INVOICES: "invoice",
  PAYMENTS: "payment",
  NOTES: "note",
};
