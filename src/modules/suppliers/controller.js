import { FirebaseDB } from "../../core/firebase/db.js";
import { SupplierModel } from "./model.js";
import { TransactionCalculator } from "./utils/TransactionCalculator.js";
import { mount } from "../../core/dom.js";
import { PdfReport } from "./utils/PdfReport.js";
// Vistas
import { SupplierListView } from "./views/SupplierListView/index.js";
import { SupplierDetailView } from "./views/SuppplierDetailView/index.js";

// Componentes
import { SupplierModal } from "./Components/SupplierModal/Index.js";
import { TransactionModal } from "./Components/TransactionModal/index.js";
import { showLoader, hideLoader } from "../../shared/ui/Loader/index.js";
import { ConfirmationModal } from "./Components/ConfirmationModal/index.js";
import { StockReportModal } from "./Components/StockReportModal/index.js";
import { SupplierSettingsModal } from "./Components/SupplierSettingModal/index.js";

export const SupplierController = () => {
  let isVisible = SupplierModel.getVisibility();

  // Función para refrescar la vista actual sin recargar la página
  const refresh = (container) => {
    const ctrl = SupplierController();
    ctrl(container);
  };

  /**
   * Actualiza solo la visibilidad de los montos sin re-renderizar toda la vista
   */
  const toggleAmountsVisibility = (visible) => {
    // Buscar todos los elementos con data-amount
    const amountElements = document.querySelectorAll("[data-amount]");

    amountElements.forEach((el) => {
      const amount = parseFloat(el.getAttribute("data-amount"));
      if (!isNaN(amount)) {
        el.textContent = SupplierModel.formatAmount(amount, visible);
      }
    });

    // Actualizar el ícono del botón toggle
    const toggleBtn = document.querySelector(
      ".btn-visibility-list, .btn-toggle-visibility"
    );
    if (toggleBtn) {
      const eyeSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
      const eyeOffSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

      toggleBtn.innerHTML = visible ? eyeSVG : eyeOffSVG;
    }
  };

  return async (container) => {
    const hash = window.location.hash;
    const [base, id] = hash.split("/");

    showLoader("Cargando...");

    try {
      if (id) {
        /** ==========================================
         * MODO DETALLE
         * ========================================== */
        const supplier = await FirebaseDB.getById("suppliers", id);
        if (!supplier) {
          window.location.hash = "#suppliers";
          return;
        }

        // 1. Traemos en DESC
        const rawMovements = await FirebaseDB.getByFilter(
          "supplier_transactions",
          "supplierId",
          id,
          "date",
          "desc"
        );

        // 2. Invertimos para calcular el saldo acumulado cronológicamente
        const chronological = [...rawMovements].reverse();

        let cumulative = 0;
        const history = chronological.map((m) => {
          const amount = parseFloat(m.amount) || 0;
          if (m.type === "invoice") {
            cumulative += amount;
          } else {
            cumulative -= amount;
          }
          return {
            ...m,
            runningBalance: Math.round(cumulative * 100) / 100,
          };
        });

        // 3. Volvemos a invertir para la vista (Más nuevo arriba)
        const movementsWithBalance = [...history].reverse();

        container.innerHTML = "";
        container.appendChild(
          SupplierDetailView({
            supplier,
            movements: movementsWithBalance,
            isVisible,
            onGenerateReport: () => {
              PdfReport.generateSupplierReport(supplier, movementsWithBalance);
            },
            onBack: () => (window.location.hash = "#suppliers"),
            onToggleVisibility: () => {
              isVisible = SupplierModel.toggleVisibility();
              // ✅ Solo actualizamos los montos, no toda la vista
              toggleAmountsVisibility(isVisible);
              return isVisible;
            },
            onAddMovement: () =>
              showTransactionModal(
                supplier,
                null,
                movementsWithBalance,
                container
              ),
            onEditMovement: (m) =>
              showTransactionModal(
                supplier,
                m,
                movementsWithBalance,
                container
              ),
            onDeleteMovement: (m) => handleDelete(m, supplier, container),
            onOpenSettings: () => handleOpenSettings(supplier, container),
          })
        );
      } else {
        /** ==========================================
         * MODO LISTA GENERAL
         * ========================================== */
        const rawSuppliers = await FirebaseDB.getAll("suppliers");
        const suppliersData = rawSuppliers.map((s) =>
          SupplierModel.mapSupplier(s)
        );

        const totalDebt = suppliersData.reduce(
          (acc, s) => acc + (parseFloat(s.balance) || 0),
          0
        );

        container.innerHTML = "";
        container.appendChild(
          SupplierListView({
            suppliers: suppliersData,
            totalDebt,
            isVisible,
            onSelect: (sId) => (window.location.hash = `#suppliers/${sId}`),
            onAddQuickTransaction: (s) =>
              showTransactionModal(s, { type: "invoice" }, [], container),
            onNewSupplier: () => handleCreateSupplier(container),
            onGlobalTransaction: () =>
              handleGlobalTransaction(suppliersData, container),
            onToggleVisibility: () => {
              isVisible = SupplierModel.toggleVisibility();
              // ✅ Solo actualizamos los montos, no toda la vista
              toggleAmountsVisibility(isVisible);
              return isVisible;
            },
          })
        );
      }
    } catch (err) {
      console.error(err);
      container.innerHTML = `<div class="error-v1">Error: ${err.message}</div>`;
    } finally {
      // 2. Lo ocultamos siempre al finalizar (éxito o error)
      hideLoader();
    }

    /** ==========================================
     * MANEJADORES (HANDLERS)
     * ========================================== */

    async function showTransactionModal(
      supplier,
      initialData,
      movements,
      cont
    ) {
      // Si el modal se abre desde la lista (sin movimientos cargados), los buscamos
      let activeMovements = movements;
      if (supplier && (!movements || movements.length === 0)) {
        activeMovements = await FirebaseDB.getByFilter(
          "supplier_transactions",
          "supplierId",
          supplier.id,
          "date",
          "desc"
        );
      }

      const modal = TransactionModal({
        supplier,
        initialData,
        movements: activeMovements,
        onClose: () => modal.remove(),
        onSave: async (newData) => {
          try {
            const finalBalance = TransactionCalculator.calculateBalance({
              currentBalance: supplier.balance,
              initialAmount: initialData ? initialData.amount : null,
              initialType: initialData ? initialData.type : null,
              newAmount: newData.amount,
              newType: newData.type,
            });

            const finalStockDebt = TransactionCalculator.calculateStockDebt({
              currentStockDebt: supplier.stockDebt,
              initialItems: initialData ? initialData.items : null,
              initialType: initialData ? initialData.type : null,
              newItems: newData.items,
              newType: newData.type,
            });

            const operations = [];

            // 1. Operación de Transacción
            if (initialData && initialData.id) {
              operations.push({
                type: "update",
                collection: "supplier_transactions",
                id: initialData.id,
                data: newData,
              });
            } else {
              operations.push({
                type: "add",
                collection: "supplier_transactions",
                data: { ...newData, supplierId: supplier.id },
              });
            }

            // 2. Operación de Actualización de Proveedor
            operations.push({
              type: "update",
              collection: "suppliers",
              id: supplier.id,
              data: {
                balance: finalBalance,
                stockDebt: finalStockDebt,
              },
            });

            await FirebaseDB.executeBatch(operations);

            modal.remove();
            refresh(cont);
          } catch (err) {
            alert("Error al guardar: " + err.message);
          }
        },
      });
      document.body.appendChild(modal);
    }

    async function handleDelete(m, supplier, cont) {
      const confirm = ConfirmationModal({
        title: "¿Eliminar registro?",
        onConfirm: async () => {
          try {
            // Revertimos el efecto de la transacción antes de borrarla
            const newBalance = TransactionCalculator.calculateBalance({
              currentBalance: supplier.balance,
              initialAmount: m.amount,
              initialType: m.type,
              newAmount: 0,
              newType: "payment",
            });
            const newStockDebt = TransactionCalculator.calculateStockDebt({
              currentStockDebt: supplier.stockDebt,
              initialItems: m.items,
              initialType: m.type,
              newItems: [],
              newType: "payment",
            });

            await FirebaseDB.executeBatch([
              { type: "delete", collection: "supplier_transactions", id: m.id },
              {
                type: "update",
                collection: "suppliers",
                id: supplier.id,
                data: { balance: newBalance, stockDebt: newStockDebt },
              },
            ]);

            confirm.remove();
            refresh(cont);
          } catch (e) {
            alert("Error al eliminar: " + e.message);
          }
        },
        onCancel: () => confirm.remove(),
      });
      document.body.appendChild(confirm);
    }

    async function handleCreateSupplier(cont) {
      const modal = SupplierModal({
        onClose: () => modal.remove(),
        onSave: async (data) => {
          try {
            await FirebaseDB.add("suppliers", {
              ...data,
              balance: 0,
              stockDebt: {},
            });
            modal.remove();
            refresh(cont);
          } catch (e) {
            alert("Error: " + e.message);
          }
        },
      });
      document.body.appendChild(modal);
    }

    async function handleOpenSettings(supplier, cont) {
      const modal = SupplierSettingsModal({
        supplier,
        onClose: () => modal.remove(),
        onSave: async (updatedData) => {
          try {
            await FirebaseDB.update("suppliers", supplier.id, updatedData);
            modal.remove();
            refresh(cont);
          } catch (e) {
            alert("Error: " + e.message);
          }
        },
      });
      document.body.appendChild(modal);
    }

    async function handleGlobalTransaction(suppliers, cont) {
      const modal = TransactionModal({
        suppliers,
        onClose: () => modal.remove(),
        onSave: async (data) => {
          try {
            const s = suppliers.find((sup) => sup.id === data.supplierId);
            const newBal = TransactionCalculator.calculateBalance({
              currentBalance: s.balance,
              newAmount: data.amount,
              newType: data.type,
            });

            await FirebaseDB.executeBatch([
              {
                type: "add",
                collection: "supplier_transactions",
                data: { ...data },
              },
              {
                type: "update",
                collection: "suppliers",
                id: s.id,
                data: { balance: newBal },
              },
            ]);

            modal.remove();
            refresh(cont);
          } catch (e) {
            alert("Error: " + e.message);
          }
        },
      });
      document.body.appendChild(modal);
    }
  };
};
