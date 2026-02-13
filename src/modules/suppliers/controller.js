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
const getSignedAmount = (type, amount) => {
  const t = (type || "").toLowerCase();
  const a = parseFloat(amount || 0);
  return t === "invoice" || t === "boleta" ? a : -a;
};

export const SupplierController = () => {
  // Estado local del controlador
  let isVisible = SupplierModel.getVisibility();

  const reloadCurrentView = (container) => {
    const ctrl = SupplierController();
    ctrl(container);
  };

  const toggleAmountsVisibility = (visible) => {
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
    container.innerHTML = "";
    const hash = window.location.hash;
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

        if (!supplier) {
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

        let runningBalance = parseFloat(supplier.balance) || 0;
        const movementsWithBalance = rawMovements.map((m) => {
          const snapshot = runningBalance;
          const amount = parseFloat(m.amount) || 0;
          const isDebt = (m.type || "").toLowerCase() === "invoice";
          if (isDebt) runningBalance -= amount;
          else runningBalance += amount;
          return { ...m, partialBalance: snapshot };
        });

        hideLoader();
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

            // --- PAGO FINANCIERO (Checkbox + Snackbar) ---
            // Afecta Saldo y Estado
            onSettleDebt: (amount, note, targetIds) =>
              handleSettleDebt(
                supplier,
                movementsWithBalance,
                container,
                amount,
                note,
                targetIds,
              ),

            // --- CONCILIACIÓN ADMINISTRATIVA (Switch) ---
            // Solo afecta Estado (NO Saldo)
            onToggleStatus: async (transaction) => {
              try {
                // 1. Calcular nuevo estado
                const currentStatus = transaction.status || "pending";
                const newStatus = currentStatus === "paid" ? "pending" : "paid";

                // Si marcamos como pagada, ponemos el paidAmount igual al total (visual).
                // Si marcamos como pendiente, reseteamos a 0.
                const newPaidAmount =
                  newStatus === "paid" ? parseFloat(transaction.amount) : 0;

                showLoader("Actualizando estado...");

                // 2. Actualizar transacción en Firebase (SIN TOCAR SALDO DE PROVEEDOR)
                await FirebaseDB.update(
                  "supplier_transactions",
                  transaction.id,
                  {
                    status: newStatus,
                    paidAmount: newPaidAmount,
                  },
                );

                // 3. Recargar datos frescos
                const freshMovements = await FirebaseDB.getByFilter(
                  "supplier_transactions",
                  "supplierId",
                  supplier.id,
                  "date",
                  "desc",
                );

                // 4. Actualizar Vista (Reactivamente)
                const currentView = container.querySelector(
                  ".supplier-detail-view",
                );
                if (
                  currentView &&
                  typeof currentView.updateState === "function"
                ) {
                  // Pasamos el supplier.balance original porque NO cambió
                  currentView.updateState(supplier.balance, freshMovements);
                } else {
                  reloadCurrentView(container);
                }

                hideLoader();
              } catch (e) {
                hideLoader();
                console.error(e);
                alert("Error al cambiar estado: " + e.message);
              }
            },
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
            let balanceDelta = 0;
            const newSigned = getSignedAmount(
              transactionData.type,
              transactionData.amount,
            );

            if (transactionData.id) {
              // EDICIÓN
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
              // CREACIÓN
              balanceDelta = newSigned;
              const payload = { ...transactionData, createdAt: new Date() };
              await FirebaseDB.add("supplier_transactions", payload);
            }

            // Actualizar Saldo Proveedor
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

            // Reactividad
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
            const txToDelete =
              m.amount !== undefined
                ? m
                : await FirebaseDB.getById("supplier_transactions", m.id);
            const signedAmount = getSignedAmount(
              txToDelete.type,
              txToDelete.amount,
            );

            await FirebaseDB.delete("supplier_transactions", m.id);

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
            const { renames, ...cleanData } = updatedData;
            await FirebaseDB.update("suppliers", supplier.id, cleanData);

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

                const simpleRename = renames.find(
                  (r) => r.from === tx.itemName,
                );
                if (simpleRename) {
                  newItemName = simpleRename.to;
                  changed = true;
                }

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

    // --- ALGORITMO DE DISTRIBUCIÓN DE PAGOS (Conciliación Financiera) ---
    async function handleSettleDebt(
      supplier,
      movements,
      cont,
      amountOverride = null,
      noteOverride = null,
      targetInvoiceIds = [], // <--- RECIBIMOS LOS IDS
    ) {
      const totalDebt = parseFloat(supplier.balance) || 0;

      if (totalDebt <= 0 && amountOverride === null) {
        alert("Este proveedor no tiene deuda pendiente.");
        return;
      }

      const finalAmount = amountOverride !== null ? amountOverride : totalDebt;
      const finalNote = noteOverride || "Cancelación total de deuda";

      const modal = TransactionModal({
        supplier,
        initialData: {
          type: "payment",
          amount: finalAmount,
          date: new Date().toISOString().split("T")[0],
          observation: finalNote,
        },
        movements: movements,
        onClose: () => modal.remove(),
        onSave: async (transactionData) => {
          try {
            showLoader("Procesando pago...");

            // 1. GUARDAR EL PAGO (Financiero)
            const payload = { ...transactionData, createdAt: new Date() };
            await FirebaseDB.add("supplier_transactions", payload);

            // 2. ACTUALIZAR SALDO PROVEEDOR (Financiero)
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

            // 3. ACTUALIZAR ESTADO DE BOLETAS (Administrativo)
            if (targetInvoiceIds && targetInvoiceIds.length > 0) {
              let moneyToDistribute = payAmount; // Dinero disponible para repartir

              for (const invId of targetInvoiceIds) {
                if (moneyToDistribute <= 0) break; // Se acabó la plata

                // Obtenemos la boleta fresca
                const invoice = await FirebaseDB.getById(
                  "supplier_transactions",
                  invId,
                );
                if (!invoice) continue;

                const invTotal = parseFloat(invoice.amount || 0);
                const invPaid = parseFloat(invoice.paidAmount || 0);
                const invDebt = invTotal - invPaid; // Lo que falta pagar de esta boleta

                if (invDebt <= 0) continue; // Ya estaba pagada

                // Pagamos lo que se pueda: o toda la deuda de esta boleta, o lo que queda en el balde
                const paymentForThis = Math.min(moneyToDistribute, invDebt);

                const newPaid = invPaid + paymentForThis;
                // Definimos estado (Tolerancia de $0.1 por decimales)
                const newStatus =
                  newPaid >= invTotal - 0.1 ? "paid" : "partial";

                // Actualizamos la boleta en Firebase
                await FirebaseDB.update("supplier_transactions", invId, {
                  paidAmount: newPaid,
                  status: newStatus,
                });

                moneyToDistribute -= paymentForThis;
              }
            }

            hideLoader();
            modal.remove();

            // Reactividad
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
