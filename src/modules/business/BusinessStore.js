/**
 * BusinessStore
 * Estado global reactivo para la configuración del negocio.
 * Sigue el mismo patrón que SupplierStore para consistencia.
 */

class BusinessStore {
  constructor() {
    this.state = {
      business: null,
      loading: false,
      error: null,
    };
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach((l) => l(this.state));
  }

  setBusiness(data) {
    this.state.business = data;
    this.state.loading = false;
    this.state.error = null;
    this.notify();
  }

  setLoading(val) {
    this.state.loading = val;
    this.notify();
  }

  setError(msg) {
    this.state.error = msg;
    this.state.loading = false;
    this.notify();
  }

  getState() {
    return this.state;
  }

  /**
   * Devuelve el nombre del negocio para uso global
   * (header, reportes, etc.)
   */
  getBusinessName() {
    return this.state.business?.name || "Mi Negocio";
  }
}

export const businessStore = new BusinessStore();
