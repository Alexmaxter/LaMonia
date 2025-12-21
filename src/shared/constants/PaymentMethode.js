/**
 * Constantes para los Tipos de Pago.
 * Úsalas en lugar de escribir strings "cash" o "card" manualmente.
 */
export const PAYMENT_METHODS = {
  CASH: "cash", // Efectivo
  CARD: "card", // Tarjeta (Débito/Crédito)
  QR: "qr", // Billeteras virtuales (MercadoPago, MODO)
  TRANSFER: "transfer", // Transferencias bancarias
};

/**
 * Constantes para el Origen de los Gastos.
 * Define si el dinero sale de la caja del día o del bolsillo del dueño.
 */
export const EXPENSE_SOURCE = {
  REGISTER: "register", // Sale de la CAJA CHICA (Resta al efectivo del día)
  OWNER: "owner", // Sale del DUEÑO/EXTERNO (No afecta el arqueo, solo registro)
};
