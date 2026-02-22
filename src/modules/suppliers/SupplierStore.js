import { SupplierModel } from "./model.js";
import { UI_FILTERS } from "../../shared/constants/index.js";

class SupplierStore {
  constructor() {
    this.state = {
      // Dados puros
      suppliers: [],
      currentSupplier: null,
      transactions: [],

      // Estado da Interface (UI State)
      amountsVisible: SupplierModel.getVisibility(), // Recupera do localStorage
      activeFilter: UI_FILTERS.ALL,

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

  /**
   * FIX #7: Actualiza supplier + transactions en una sola notificación.
   * Evita doble render cuando loadDetailData actualiza ambos juntos.
   */
  setDetailData(supplier, transactions) {
    this.state.currentSupplier = supplier;
    this.state.transactions = transactions;
    this.notify();
  }

  /**
   * FIX #7: Limpia el estado de detalle al salir de la vista.
   * Previene datos stale si se navega a otro proveedor.
   */
  clearDetail() {
    this.state.currentSupplier = null;
    this.state.transactions = [];
    this.state.activeFilter = UI_FILTERS.ALL;
    // No notificamos porque la vista ya se desmontó
  }

  // --- ACTIONS PARA A UI ---

  toggleAmountsVisibility() {
    // CORREÇÃO AQUI: Usamos o método original que inverte e guarda no disco
    const isVisible = SupplierModel.toggleVisibility();
    this.state.amountsVisible = isVisible;
    this.notify(); // Avisa toda a app para redesenhar os números
    return isVisible;
  }

  setFilter(filterType) {
    this.state.activeFilter = filterType;
    this.notify();
  }

  getState() {
    return this.state;
  }
}

export const supplierStore = new SupplierStore();
