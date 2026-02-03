/**
 * SupplierModel.js
 * Lógica de negocio pura y gestión de estado (Caché) para el módulo de proveedores.
 */

// Variable persistente en memoria mientras la app esté abierta
let cachedSuppliers = null;

export const SupplierModel = {
  // --- GESTIÓN DE ESTADO (CACHÉ) ---
  setCache(data) {
    cachedSuppliers = data;
  },

  getCache() {
    return cachedSuppliers;
  },

  clearCache() {
    console.info(
      "[Model] Caché invalidada (Se forzará recarga desde Firebase)"
    );
    cachedSuppliers = null;
  },

  // --- LÓGICA DE NEGOCIO ---
  calculateNewBalance(currentBalance, amount, type) {
    const current = parseFloat(currentBalance) || 0;
    const val = parseFloat(amount) || 0;
    const isDebt = type === "invoice";

    let result = isDebt ? current + val : current - val;

    // TRUCO PRO: Multiplicar por 100, redondear y dividir.
    // Esto elimina los errores de punto flotante en monedas.
    return Math.round(result * 100) / 100;
  },

  getVisibility() {
    const saved = localStorage.getItem("amounts_visible");
    return saved !== null ? JSON.parse(saved) : true;
  },

  toggleVisibility() {
    const current = this.getVisibility();
    localStorage.setItem("amounts_visible", JSON.stringify(!current));
    return !current;
  },

  formatAmount(amount, isVisible) {
    if (!isVisible) return "••••••";
    return this.formatBalance(amount);
  },

  formatBalance(amount) {
    const value = parseFloat(amount) || 0;
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(value);
  },

  calculateStatus(balance) {
    const b = parseFloat(balance) || 0;
    if (b > 0.01) return "danger";
    if (b < -0.01) return "success";
    return "neutral";
  },

  calculateTotalBalance(transactions = []) {
    console.info(
      `[Model] Calculando balance para ${transactions.length} movimientos.`
    );
    const total = transactions.reduce((acc, t) => {
      const amount = parseFloat(t.amount) || 0;
      return t.type === "invoice" ? acc + amount : acc - amount;
    }, 0);
    return total;
  },

  mapSupplier(rawData) {
    const mapped = {
      id: rawData.id,
      name: rawData.name || "Proveedor sin nombre",
      phone: rawData.phone || "Sin teléfono",
      email: rawData.email || "",
      alias: rawData.alias || "",
      cbu: rawData.cbu || "",
      balance: parseFloat(rawData.balance) || 0,
      defaultItems: rawData.defaultItems || [],
      stockDebt: rawData.stockDebt || {}, // Incluimos stockDebt si existe
      type: rawData.type || "standard",
      lastUpdate: rawData.updatedAt || rawData.createdAt || null,
    };
    return mapped;
  },

  filterSuppliers(suppliers, term) {
    if (!term) return suppliers;
    const search = term.toLowerCase().trim();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(search) ||
        (s.phone && s.phone.includes(search))
    );
  },
};
