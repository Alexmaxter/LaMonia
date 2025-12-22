// src/core/utils/currency.js

/**
 * Formatea un número como moneda Argentina (ARS)
 * @param {number|string} amount - El monto a formatear
 * @returns {string} - El monto formateado (ej: "$ 1.234,56")
 */
export function formatCurrency(amount) {
  const value = parseFloat(amount);

  if (isNaN(value)) {
    return "$ 0,00";
  }

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(value);
}
