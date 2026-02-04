/**
 * SupplierModel.js
 * Lógica de negocio pura y gestión de estado (Caché).
 */

let cachedSuppliers = null;

export const SupplierModel = {
  setCache(data) {
    cachedSuppliers = data;
  },
  getCache() {
    return cachedSuppliers;
  },
  clearCache() {
    console.info("[Model] Caché invalidada");
    cachedSuppliers = null;
  },

  // --- LÓGICA DE NEGOCIO ---
  calculateNewBalance(currentBalance, amount, type) {
    const current = parseFloat(currentBalance) || 0;
    const val = parseFloat(amount) || 0;
    const isDebt = type === "invoice";
    // Evita errores de punto flotante
    return Math.round((isDebt ? current + val : current - val) * 100) / 100;
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
    if (b > 0.01) return "danger"; // Debe plata
    if (b < -0.01) return "success"; // A favor
    return "neutral";
  },

  calculateTotalBalance(transactions = []) {
    return transactions.reduce((acc, t) => {
      const amount = parseFloat(t.amount) || 0;
      return t.type === "invoice" ? acc + amount : acc - amount;
    }, 0);
  },

  // --- MAPEO DE DATOS ---
  mapSupplier(rawData) {
    return {
      id: rawData.id,
      name: rawData.name || "Proveedor sin nombre",
      // Unificamos Alias y CBU
      alias: rawData.alias || rawData.cbu || "",

      balance: parseFloat(rawData.balance) || 0,

      // El tipo ahora es crucial: "monetary" vs "stock"
      type: rawData.type || "monetary",

      // CORRECCIÓN: Aseguramos que pasen los items por defecto
      defaultItems: rawData.defaultItems || [],

      stockDebt: rawData.stockDebt || {},
      lastUpdate: rawData.updatedAt || rawData.createdAt || null,
    };
  },

  filterSuppliers(suppliers, term) {
    if (!term) return suppliers;
    const search = term.toLowerCase().trim();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(search) ||
        (s.alias && s.alias.toLowerCase().includes(search)),
    );
  },
};
