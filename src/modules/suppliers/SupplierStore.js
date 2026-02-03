/**
 * SupplierStore - Fuente de verdad para el módulo de proveedores
 */
class SupplierStore {
  constructor() {
    this.state = {
      suppliers: [],
      currentSupplier: null,
      movements: [],
      loading: false,
      error: null,
    };
    this.listeners = [];
  }

  /**
   * Suscribe un componente a los cambios del estado
   * @param {Function} callback
   * @returns {Function} Función para desuscribirse
   */
  subscribe(callback) {
    this.listeners.push(callback);
    // Retornamos una función para limpiar la suscripción
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  /**
   * Actualiza el estado y notifica a los suscriptores
   * @param {Object} newState
   */
  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.notify();
  }

  getState() {
    return this.state;
  }

  notify() {
    this.listeners.forEach((callback) => callback(this.state));
  }
}

export const supplierStore = new SupplierStore();
