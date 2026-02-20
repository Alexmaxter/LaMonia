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
