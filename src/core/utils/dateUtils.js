/**
 * Utilidades para manejo consistente de fechas en la App.
 * Usa Intl.DateTimeFormat para evitar problemas de zona horaria manuales.
 */

const LOCALE = "es-AR";

export const dateUtils = {
  /**
   * Formatea una fecha para mostrar en texto (ej: 21/12/2025)
   * Soporta objetos Date, timestamps de Firebase o strings ISO.
   */
  format(dateInput) {
    const date = this.parse(dateInput);
    if (!date) return "-";

    return new Intl.DateTimeFormat(LOCALE, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric", // o '2-digit' si prefieres 25
    }).format(date);
  },

  /**
   * Devuelve la fecha actual en formato YYYY-MM-DD (para inputs type="date")
   */
  todayInput() {
    return new Date().toISOString().split("T")[0];
  },

  /**
   * Devuelve el primer día del mes actual en formato YYYY-MM-DD
   */
  firstDayOfMonthInput() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    // Ajustamos la zona horaria local para que no reste un día al convertir a ISO
    const offset = firstDay.getTimezoneOffset();
    const localDate = new Date(firstDay.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split("T")[0];
  },

  /**
   * Convierte cualquier entrada (Firebase timestamp, string, Date) a objeto Date nativo
   */
  parse(dateInput) {
    if (!dateInput) return null;
    if (dateInput instanceof Date) return dateInput;
    if (dateInput.seconds) return new Date(dateInput.seconds * 1000); // Firebase
    // Si viene "2025-12-21", agregamos hora para evitar problemas de UTC medianoche
    if (typeof dateInput === "string" && dateInput.includes("-")) {
      if (dateInput.length === 10) return new Date(dateInput + "T12:00:00");
      return new Date(dateInput);
    }
    return new Date(dateInput);
  },
};
