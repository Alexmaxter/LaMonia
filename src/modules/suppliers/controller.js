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

// --- HELPER: Calcular Valor Signado ---
// Invoice (Deuda) = Positivo
// Payment (Pago) = Negativo
const getSignedAmount = (type, amount) => {
  const t = (type || "").toLowerCase();
  const a = parseFloat(amount || 0);
  return t === "invoice" || t === "boleta" ? a : -a;
};

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

        // Pre-procesamiento de saldos (Visualización)
        // Usamos el saldo guardado en DB como punto de partida si queremos ser precisos,
        // o recalculamos al vuelo para el historial visual.
        // Aquí mantenemos tu lógica visual de "Running Balance" inverso.
        let runningBalance = parseFloat(supplier.balance) || 0;
        const movementsWithBalance = rawMovements.map((m) => {
          const snapshot = runningBalance;
          const amount = parseFloat(m.amount) || 0;

          // Nota: Esta lógica asume que rawMovements está ordenado DESC (del más nuevo al más viejo)
          const isDebt = (m.type || "").toLowerCase() === "invoice";
          if (isDebt) runningBalance -= amount;
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

            // --- AQUÍ ESTÁ EL CAMBIO CLAVE PARA QUE FUNCIONE EL SNACKBAR ---
            // Pasamos los argumentos (amount, note) que vienen de la vista al controlador
            onSettleDebt: (amount, note) =>
              handleSettleDebt(
                supplier,
                movementsWithBalance,
                container,
                amount,
                note,
              ),
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

        // --- LOGICA OPTIMIZADA CON REACTIVIDAD MANUAL ---
        onSave: async (transactionData) => {
          try {
            showLoader("Guardando transacción...");

            // 1. Calcular Delta y Guardar Transacción
            let balanceDelta = 0;
            const newSigned = getSignedAmount(
              transactionData.type,
              transactionData.amount,
            );

            if (transactionData.id) {
              // MODO EDICIÓN
              const oldTx = await FirebaseDB.getById(
                "supplier_transactions",
                transactionData.id,
              );
              const oldSigned = oldTx
                ? getSignedAmount(oldTx.type, oldTx.amount)
                : 0;
              balanceDelta = newSigned - oldSigned;

              await FirebaseDB.update(
                "supplier_transactions",
                transactionData.id,
                transactionData,
              );
            } else {
              // MODO CREACIÓN
              balanceDelta = newSigned;
              const payload = { ...transactionData, createdAt: new Date() };
              await FirebaseDB.add("supplier_transactions", payload);
            }

            // 2. Actualizar Proveedor (Suma Delta)
            const freshSupplier = await FirebaseDB.getById(
              "suppliers",
              transactionData.supplierId,
            );
            const currentBalance = parseFloat(freshSupplier.balance || 0);
            const finalBalance = currentBalance + balanceDelta;

            await FirebaseDB.update("suppliers", transactionData.supplierId, {
              balance: finalBalance,
              lastTransactionDate: new Date(),
            });

            hideLoader();
            modal.remove();

            // --- INTENTO DE REACTIVIDAD QUIRÚRGICA ---
            const currentView = cont.querySelector(".supplier-detail-view");
            if (currentView && typeof currentView.updateState === "function") {
              // A. Obtenemos movimientos frescos
              const freshMovements = await FirebaseDB.getByFilter(
                "supplier_transactions",
                "supplierId",
                supplier.id,
                "date",
                "desc",
              );

              // B. Actualizamos la vista sin recargar
              currentView.updateState(finalBalance, freshMovements);
            } else {
              // Fallback: Recarga completa
              reloadCurrentView(cont);
            }
          } catch (err) {
            hideLoader();
            console.error(err);
            alert("Error al guardar: " + err.message);
          }
        },
        onDelete: initialData?.id
          ? async (transactionId) => {
              await handleDelete(
                { id: transactionId, ...initialData },
                supplier,
                cont,
              );
              modal.remove();
            }
          : null,
      });
      document.body.appendChild(modal);
    }

    async function handleDelete(m, supplier, cont) {
      const confirm = ConfirmationModal({
        title: "¿Eliminar registro?",
        message: "Esta acción actualizará el saldo automáticamente.",
        onConfirm: async () => {
          try {
            showLoader("Eliminando...");

            // 1. Obtener datos antes de borrar
            const txToDelete =
              m.amount !== undefined
                ? m
                : await FirebaseDB.getById("supplier_transactions", m.id);
            const signedAmount = getSignedAmount(
              txToDelete.type,
              txToDelete.amount,
            );

            // 2. Borrar
            await FirebaseDB.delete("supplier_transactions", m.id);

            // 3. Ajustar Saldo
            const freshSupplier = await FirebaseDB.getById(
              "suppliers",
              supplier.id,
            );
            const currentBalance = parseFloat(freshSupplier.balance || 0);
            const finalBalance = currentBalance - signedAmount;

            await FirebaseDB.update("suppliers", supplier.id, {
              balance: finalBalance,
            });

            hideLoader();
            confirm.remove();

            // --- REACTIVIDAD QUIRÚRGICA ---
            const currentView = cont.querySelector(".supplier-detail-view");
            if (currentView && typeof currentView.updateState === "function") {
              const freshMovements = await FirebaseDB.getByFilter(
                "supplier_transactions",
                "supplierId",
                supplier.id,
                "date",
                "desc",
              );
              currentView.updateState(finalBalance, freshMovements);
            } else {
              reloadCurrentView(cont);
            }
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

            const newId = ref.id ? ref.id : ref;
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

            // --- Lógica de IDs y Renombres ---
            const { renames, ...cleanData } = updatedData;

            await FirebaseDB.update("suppliers", supplier.id, cleanData);

            // Procesar renombres (items viejos)
            if (renames && renames.length > 0) {
              const transactions = await FirebaseDB.getByFilter(
                "supplier_transactions",
                "supplierId",
                supplier.id,
              );

              for (const tx of transactions) {
                let changed = false;
                let newItems = tx.items;
                let newItemName = tx.itemName;

                // Caso Legacy (itemName string)
                const simpleRename = renames.find(
                  (r) => r.from === tx.itemName,
                );
                if (simpleRename) {
                  newItemName = simpleRename.to;
                  changed = true;
                }

                // Caso Nuevo (items array)
                if (tx.items && Array.isArray(tx.items)) {
                  newItems = tx.items.map((i) => {
                    const match = renames.find((r) => r.from === i.name);
                    if (match) {
                      changed = true;
                      return { ...i, name: match.to };
                    }
                    return i;
                  });
                }

                if (changed) {
                  await FirebaseDB.update("supplier_transactions", tx.id, {
                    itemName: newItemName,
                    items: newItems,
                  });
                }
              }
            }

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

            // Borrado en serie (lento pero seguro en cliente)
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

    // --- FUNCIÓN CORREGIDA PARA ACEPTAR ARGUMENTOS ---
    async function handleSettleDebt(
      supplier,
      movements,
      cont,
      amountOverride = null, // <--- Nuevo Param
      noteOverride = null, // <--- Nuevo Param
    ) {
      const totalDebt = parseFloat(supplier.balance) || 0;

      // Si no hay deuda y tampoco nos pasaron un monto forzado, avisamos
      if (totalDebt <= 0 && amountOverride === null) {
        alert("Este proveedor no tiene deuda pendiente.");
        return;
      }

      // Si nos pasaron un monto (desde el Snackbar), lo usamos. Si no, usamos toda la deuda.
      const finalAmount = amountOverride !== null ? amountOverride : totalDebt;
      const finalNote = noteOverride || "Cancelación total de deuda";

      const modal = TransactionModal({
        supplier,
        initialData: {
          type: "payment",
          amount: finalAmount, // <--- Usamos el monto correcto
          date: new Date().toISOString().split("T")[0],
          observation: finalNote, // <--- Usamos la nota correcta
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

            // Actualización Incremental
            const freshSupplier = await FirebaseDB.getById(
              "suppliers",
              transactionData.supplierId,
            );
            const currentBalance = parseFloat(freshSupplier.balance || 0);
            const payAmount = parseFloat(transactionData.amount);
            const finalBalance = currentBalance - payAmount;

            await FirebaseDB.update("suppliers", transactionData.supplierId, {
              balance: finalBalance,
              lastTransactionDate: new Date(),
            });

            hideLoader();
            modal.remove();

            // --- REACTIVIDAD QUIRÚRGICA ---
            const currentView = cont.querySelector(".supplier-detail-view");
            if (currentView && typeof currentView.updateState === "function") {
              const freshMovements = await FirebaseDB.getByFilter(
                "supplier_transactions",
                "supplierId",
                supplier.id,
                "date",
                "desc",
              );
              currentView.updateState(finalBalance, freshMovements);
            } else {
              reloadCurrentView(cont);
            }
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

            // Actualización Incremental
            const signedAmount = getSignedAmount(data.type, data.amount);
            const freshSupplier = await FirebaseDB.getById(
              "suppliers",
              data.supplierId,
            );
            const currentBalance = parseFloat(freshSupplier.balance || 0);

            await FirebaseDB.update("suppliers", data.supplierId, {
              balance: currentBalance + signedAmount,
              lastTransactionDate: new Date(),
            });

            hideLoader();
            modal.remove();
            reloadCurrentView(cont); // Aquí mantenemos recarga completa por ser global
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
