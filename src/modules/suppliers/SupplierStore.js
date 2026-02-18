/**
 * SupplierStore
 * Gestor de estado simple (Patrón Singleton)
 * Sirve para compartir datos entre el controlador y las vistas sin prop-drilling excesivo.
 */
class SupplierStore {
  constructor() {
    this.state = {
      suppliers: [], // Lista de proveedores (Vista Lista)
      currentSupplier: null, // Proveedor seleccionado (Vista Detalle)
      transactions: [], // Movimientos del proveedor seleccionado
      loading: false,
      error: null,
    };
    this.listeners = [];
  }

  /**
   * Suscribirse a cambios (Patrón Observador)
   * Útil si quieres que un componente se repinte solo cuando cambia el store.
   */
  subscribe(listener) {
    this.listeners.push(listener);
    // Retorna función para desuscribirse
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notificar a todos los oyentes
   */
  notify() {
    this.listeners.forEach((listener) => listener(this.state));
  }

  // --- ACTIONS (Setters) ---

  setSuppliers(suppliers) {
    this.state.suppliers = suppliers;
    this.notify();
  }

  setCurrentSupplier(supplier) {
    this.state.currentSupplier = supplier;
    this.notify();
  }

  setTransactions(transactions) {
    this.state.transactions = transactions;
    this.notify();
  }

  setLoading(isLoading) {
    this.state.loading = isLoading;
    this.notify();
  }

  setError(error) {
    this.state.error = error;
    this.notify();
  }

  // --- GETTERS ---

  getState() {
    return this.state;
  }
}

// Exportamos una INSTANCIA única (Singleton)
export const supplierStore = new SupplierStore();
