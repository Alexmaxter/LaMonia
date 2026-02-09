import { FirebaseDB } from "../../core/firebase/db.js";
import { SupplierModel } from "./model.js";
import { TransactionCalculator } from "./utils/TransactionCalculator.js";
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
  // Estado local del controlador
  let isVisible = SupplierModel.getVisibility();

  // Función auxiliar para refrescar la vista actual sin recargar la página
  const reloadCurrentView = (container) => {
    const ctrl = SupplierController();
    ctrl(container);
  };

  const toggleAmountsVisibility = (visible) => {
    // Actualizamos visibilidad en elementos del DOM existentes
    const amountElements = document.querySelectorAll("[data-amount]");
    amountElements.forEach((el) => {
      const amount = parseFloat(el.getAttribute("data-amount"));
      if (!isNaN(amount)) {
        el.textContent = SupplierModel.formatAmount(amount, visible);
      }
    });
  };

  // --- FUNCIÓN PRINCIPAL DEL CONTROLADOR ---
  return async (container) => {
    // 1. Limpieza inicial
    container.innerHTML = "";

    // 2. Leemos la URL de forma robusta
    const hash = window.location.hash;
    // Eliminamos query params (?...) si existen y dividimos por /
    const cleanHash = hash.split("?")[0];
    const parts = cleanHash.split("/");
    const id = parts[1] ? parts[1].trim() : null;

    try {
      if (id) {
        // ============================================================
        // MODO DETALLE (Si hay ID)
        // ============================================================
        showLoader("Cargando proveedor...");

        const supplier = await FirebaseDB.getById("suppliers", id);

        // Si el proveedor no existe
        if (!supplier) {
          console.warn("Proveedor no encontrado con ID:", id);
          hideLoader();
          container.innerHTML = `<div class="error-state">
            <h3>Proveedor no encontrado</h3>
            <p>El proveedor solicitado no existe o fue eliminado.</p>
            <button onclick="window.location.hash='#suppliers'" class="btn-primary">Volver al listado</button>
          </div>`;
          return;
        }

        const rawMovements = await FirebaseDB.getByFilter(
          "supplier_transactions",
          "supplierId",
          id,
          "date",
          "desc",
        );

        // Pre-procesamiento de saldos
        let runningBalance = parseFloat(supplier.balance) || 0;
        const movementsWithBalance = rawMovements.map((m) => {
          const snapshot = runningBalance;
          const amount = parseFloat(m.amount) || 0;

          if (m.type === "invoice") runningBalance -= amount;
          else runningBalance += amount;

          return { ...m, partialBalance: snapshot };
        });

        hideLoader();

        // Limpieza final antes de pintar
        container.innerHTML = "";

        container.appendChild(
          SupplierDetailView({
            supplier,
            movements: movementsWithBalance,
            isVisible,

            // ACCIONES
            onBack: () => {
              window.location.hash = "#suppliers";
            },

            onGenerateReport: () => {
              if (supplier.type === "stock") {
                const modal = StockReportModal({
                  supplier,
                  movements: movementsWithBalance,
                  onClose: () => modal.remove(),
                });
                document.body.appendChild(modal);
              } else {
                PdfReport.generateSupplierReport(
                  supplier,
                  movementsWithBalance,
                );
              }
            },

            onToggleVisibility: () => {
              isVisible = SupplierModel.toggleVisibility();
              toggleAmountsVisibility(isVisible);
              return isVisible;
            },

            onAddMovement: () =>
              showTransactionModal(
                supplier,
                null,
                movementsWithBalance,
                container,
              ),
            onEditMovement: (m) =>
              showTransactionModal(
                supplier,
                m,
                movementsWithBalance,
                container,
              ),
            onDeleteMovement: (m) => handleDelete(m, supplier, container),
            onOpenSettings: () => handleOpenSettings(supplier, container),
            // NUEVA: Función para saldar deuda
            onSettleDebt: () =>
              handleSettleDebt(supplier, movementsWithBalance, container),
          }),
        );
      } else {
        // ============================================================
        // MODO LISTA GENERAL (Si NO hay ID)
        // ============================================================
        showLoader("Cargando proveedores...");

        const rawSuppliers = await FirebaseDB.getAll("suppliers");

        const suppliersData = rawSuppliers.map((s) => ({
          ...s,
          balance: parseFloat(s.balance) || 0,
        }));

        const totalDebt = suppliersData.reduce((acc, s) => acc + s.balance, 0);

        hideLoader();

        container.innerHTML = "";

        container.appendChild(
          SupplierListView({
            suppliers: suppliersData,
            totalDebt,
            isVisible,

            onSelect: (sId) => {
              window.location.hash = `#suppliers/${sId}`;
            },

            onAddQuickTransaction: (s) =>
              showTransactionModal(s, { type: "invoice" }, [], container),
            onNewSupplier: () => handleCreateSupplier(container),
            onGlobalTransaction: () =>
              handleGlobalTransaction(suppliersData, container),

            onToggleVisibility: () => {
              isVisible = SupplierModel.toggleVisibility();
              toggleAmountsVisibility(isVisible);
              return isVisible;
            },

            onEditTransaction: (tx) => {
              const s = suppliersData.find((sup) => sup.id === tx.supplierId);
              if (s) showTransactionModal(s, tx, [], container);
            },

            onDeleteTransaction: (tx) => {
              const s = suppliersData.find((sup) => sup.id === tx.supplierId);
              if (s) handleDelete(tx, s, container);
            },
          }),
        );
      }
    } catch (err) {
      console.error("Error crítico en SupplierController:", err);
      hideLoader();
      container.innerHTML = `<div class="error-state">
          <h3>Ocurrió un error</h3>
          <p>${err.message}</p>
          <button onclick="window.location.reload()" class="btn-primary">Recargar Página</button>
      </div>`;
    }

    // ==========================================
    // MANEJADORES DE MODALES
    // ==========================================

    async function showTransactionModal(
      supplier,
      initialData,
      movements,
      cont,
    ) {
      let activeMovements = movements;
      if (supplier && (!movements || movements.length === 0)) {
        try {
          activeMovements = await FirebaseDB.getByFilter(
            "supplier_transactions",
            "supplierId",
            supplier.id,
            "date",
            "desc",
          );
        } catch (e) {
          activeMovements = [];
        }
      }

      const modal = TransactionModal({
        supplier,
        initialData,
        movements: activeMovements,
        onClose: () => modal.remove(),
        onSave: async (transactionData) => {
          try {
            showLoader("Guardando transacción...");

            if (transactionData.id) {
              await FirebaseDB.update(
                "supplier_transactions",
                transactionData.id,
                transactionData,
              );
            } else {
              const payload = {
                ...transactionData,
                createdAt: new Date(),
              };
              await FirebaseDB.add("supplier_transactions", payload);
            }

            const allMovs = await FirebaseDB.getByFilter(
              "supplier_transactions",
              "supplierId",
              transactionData.supplierId,
            );

            let newBalance = 0;
            allMovs.forEach((m) => {
              const amt = parseFloat(m.amount) || 0;
              if (m.type === "invoice") newBalance += amt;
              else newBalance -= amt;
            });

            await FirebaseDB.update("suppliers", transactionData.supplierId, {
              balance: newBalance,
              lastTransactionDate: new Date(),
            });

            hideLoader();
            modal.remove();
            reloadCurrentView(cont);
          } catch (err) {
            hideLoader();
            console.error(err);
            alert("Error al guardar: " + err.message);
          }
        },
        onDelete: initialData?.id
          ? async (transactionId) => {
              await handleDelete({ id: transactionId }, supplier, cont);
              modal.remove();
            }
          : null,
      });
      document.body.appendChild(modal);
    }

    async function handleDelete(m, supplier, cont) {
      const confirm = ConfirmationModal({
        title: "¿Eliminar registro?",
        message: "Esta acción recalculará el saldo automáticamente.",
        onConfirm: async () => {
          try {
            showLoader("Eliminando...");

            await FirebaseDB.delete("supplier_transactions", m.id);

            const allMovs = await FirebaseDB.getByFilter(
              "supplier_transactions",
              "supplierId",
              supplier.id,
            );

            let newBalance = 0;
            allMovs.forEach((mov) => {
              const amt = parseFloat(mov.amount) || 0;
              if (mov.type === "invoice") newBalance += amt;
              else newBalance -= amt;
            });

            await FirebaseDB.update("suppliers", supplier.id, {
              balance: newBalance,
            });

            hideLoader();
            confirm.remove();
            reloadCurrentView(cont);
          } catch (e) {
            hideLoader();
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
            showLoader("Creando proveedor...");
            const ref = await FirebaseDB.add("suppliers", {
              ...data,
              balance: 0,
              status: "active",
              createdAt: new Date(),
              lastTransactionDate: null,
            });
            hideLoader();
            modal.remove();

            // --- CORRECCIÓN CRÍTICA AQUÍ ---
            // 1. Aseguramos el ID (si ref es objeto usa .id, si es string usa ref)
            const newId = ref.id ? ref.id : ref;

            // 2. Corregimos la ruta: quitamos la '/' sobrante -> #suppliers/ID
            window.location.hash = `#suppliers/${newId}`;
          } catch (e) {
            hideLoader();
            alert("Error al crear: " + e.message);
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
            showLoader("Actualizando...");
            await FirebaseDB.update("suppliers", supplier.id, updatedData);
            hideLoader();
            modal.remove();
            reloadCurrentView(cont);
          } catch (e) {
            hideLoader();
            alert("Error al actualizar: " + e.message);
          }
        },
        onDelete: async (supplierId) => {
          try {
            showLoader("Eliminando proveedor...");

            const transactions = await FirebaseDB.getByFilter(
              "supplier_transactions",
              "supplierId",
              supplierId,
            );

            for (const tx of transactions) {
              await FirebaseDB.delete("supplier_transactions", tx.id);
            }

            await FirebaseDB.delete("suppliers", supplierId);

            hideLoader();
            modal.remove();
            window.location.hash = "#suppliers";
          } catch (e) {
            hideLoader();
            alert("Error al eliminar proveedor: " + e.message);
          }
        },
      });
      document.body.appendChild(modal);
    }

    async function handleSettleDebt(supplier, movements, cont) {
      const totalDebt = parseFloat(supplier.balance) || 0;

      if (totalDebt <= 0) {
        alert("Este proveedor no tiene deuda pendiente.");
        return;
      }

      const modal = TransactionModal({
        supplier,
        initialData: {
          type: "payment",
          amount: totalDebt,
          date: new Date().toISOString().split("T")[0],
          observation: "Cancelación total de deuda",
        },
        movements: movements,
        onClose: () => modal.remove(),
        onSave: async (transactionData) => {
          try {
            showLoader("Guardando pago...");

            const payload = {
              ...transactionData,
              createdAt: new Date(),
            };
            await FirebaseDB.add("supplier_transactions", payload);

            const allMovs = await FirebaseDB.getByFilter(
              "supplier_transactions",
              "supplierId",
              transactionData.supplierId,
            );

            let newBalance = 0;
            allMovs.forEach((m) => {
              const amt = parseFloat(m.amount) || 0;
              if (m.type === "invoice") newBalance += amt;
              else newBalance -= amt;
            });

            await FirebaseDB.update("suppliers", transactionData.supplierId, {
              balance: newBalance,
              lastTransactionDate: new Date(),
            });

            hideLoader();
            modal.remove();
            reloadCurrentView(cont);
          } catch (err) {
            hideLoader();
            console.error(err);
            alert("Error al guardar pago: " + err.message);
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
            showLoader("Guardando...");
            const payload = { ...data, createdAt: new Date() };
            await FirebaseDB.add("supplier_transactions", payload);

            const allMovs = await FirebaseDB.getByFilter(
              "supplier_transactions",
              "supplierId",
              data.supplierId,
            );

            let newBalance = 0;
            allMovs.forEach((m) => {
              const amt = parseFloat(m.amount) || 0;
              if (m.type === "invoice") newBalance += amt;
              else newBalance -= amt;
            });

            await FirebaseDB.update("suppliers", data.supplierId, {
              balance: newBalance,
              lastTransactionDate: new Date(),
            });

            hideLoader();
            modal.remove();
            reloadCurrentView(cont);
          } catch (e) {
            hideLoader();
            alert("Error: " + e.message);
          }
        },
      });
      document.body.appendChild(modal);
    }
  };
};
