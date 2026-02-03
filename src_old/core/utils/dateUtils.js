export const dateUtils = {
  /**
   * Convierte un input (String o Date) a un objeto Date válido
   */
  parse: (dateInput) => {
    if (!dateInput) return new Date();

    // Si ya es un objeto Date, lo devolvemos tal cual (ESTO SOLUCIONA EL ERROR)
    if (dateInput instanceof Date) {
      return dateInput;
    }

    // Si es un Timestamp de Firestore (tiene método toDate)
    if (dateInput && typeof dateInput.toDate === "function") {
      return dateInput.toDate();
    }

    // Si es string formato YYYY-MM-DD
    if (typeof dateInput === "string" && dateInput.includes("-")) {
      // Intentar solucionar problemas de zona horaria agregando T12:00:00
      if (dateInput.length === 10) {
        return new Date(dateInput + "T12:00:00");
      }
      return new Date(dateInput);
    }

    return new Date(dateInput);
  },

  /**
   * Formatea una fecha para mostrar al usuario (DD/MM/YYYY)
   */
  formatDate: (dateInput) => {
    if (!dateInput) return "-";
    const date = dateUtils.parse(dateInput);
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  },

  /**
   * Formatea para el value de un input type="date" (YYYY-MM-DD)
   */
  toInputDate: (dateInput) => {
    const date = dateUtils.parse(dateInput);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  },

  /**
   * Devuelve la fecha de hoy para inputs
   */
  todayInput: () => {
    return dateUtils.toInputDate(new Date());
  },
};
