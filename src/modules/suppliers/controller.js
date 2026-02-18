import { SupplierService } from "./services/SupplierService.js";
import { SupplierModel } from "./model.js";
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

// Estado
import { supplierStore } from "./SupplierStore.js";

// --- HELPER: Calcular Valor Signado ---
const getSignedAmount = (type, amount) => {
  const t = (type || "").toLowerCase();
  const a = parseFloat(amount || 0);
  if (["invoice", "boleta", "purchase", "compra", "debit"].includes(t))
    return a;
  return -a;
};

const getTypePriority = (type) => {
  const t = (type || "").toLowerCase();
  // Los Pagos tienen prioridad ALTA (2) -> Aparecen ARRIBA en lista descendente
  if (["payment", "pago", "credit"].includes(t)) return 2;
  // Las Boletas tienen prioridad BAJA (1) -> Aparecen ABAJO
  return 1;
};

export const SupplierController = () => {
  let isVisible = SupplierModel.getVisibility();
  let activeFilter = "all";
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

  return async (container) => {
    container.innerHTML = "";
    const hash = window.location.hash;
    const cleanHash = hash.split("?")[0];
    const parts = cleanHash.split("/");
    const id = parts[1] ? parts[1].trim() : null;

    try {
      if (id) {
        // ============================================================
        // MODO DETALLE
        // ============================================================
        showLoader("Cargando historial...");

        const [supplier, rawMovements] = await Promise.all([
          SupplierService.getById(id),
          SupplierService.getTransactions(id, 200),
        ]);

        if (!supplier) {
          hideLoader();
          container.innerHTML = `<div class="error-state"><h3>No encontrado</h3><button onclick="window.location.hash='#suppliers'">Volver</button></div>`;
          return;
        }

        // --- 1. SMART SORTING & LEDGER (Procesamiento Único) ---
        rawMovements.sort((a, b) => {
          const dateA = a.date?.seconds
            ? new Date(a.date.seconds * 1000)
            : new Date(a.date);
          const dateB = b.date?.seconds
            ? new Date(b.date.seconds * 1000)
            : new Date(b.date);

          // Si es el mismo día, aplicamos prioridad visual (Pagos arriba)
          const isSameDay = dateA.toDateString() === dateB.toDateString();
          if (isSameDay) {
            const priorityA = getTypePriority(a.type);
            const priorityB = getTypePriority(b.type);
            if (priorityA !== priorityB) return priorityB - priorityA;
            return dateB - dateA; // Desempate por hora
          }
          return dateB - dateA; // Orden normal cronológico
        });

        let fallbackBalance = parseFloat(supplier.balance) || 0;

        // Generamos la lista maestra con saldos calculados
        const allProcessedMovements = rawMovements.map((m) => {
          let balanceDisplay = 0;
          if (m.savedBalance !== undefined && m.savedBalance !== null) {
            balanceDisplay = m.savedBalance;
            fallbackBalance =
              m.savedBalance - getSignedAmount(m.type, m.amount);
          } else {
            const snapshot = fallbackBalance;
            fallbackBalance -= getSignedAmount(m.type, m.amount);
            balanceDisplay = snapshot;
          }
          return { ...m, partialBalance: balanceDisplay };
        });

        // --- 2. FUNCIÓN DE FILTRADO ---
        const getFilteredList = () => {
          if (activeFilter === "all") return allProcessedMovements;

          return allProcessedMovements.filter((m) => {
            const t = (m.type || "").toLowerCase();
            if (activeFilter === "invoice")
              return ["invoice", "boleta", "purchase", "compra"].includes(t);
            if (activeFilter === "payment")
              return ["payment", "pago"].includes(t);
            if (activeFilter === "note")
              return ["note", "credit", "debit", "nota"].includes(t);
            return true;
          });
        };

        supplierStore.setCurrentSupplier(supplier);
        supplierStore.setTransactions(allProcessedMovements);

        hideLoader();
        container.innerHTML = "";

        // --- 3. RENDERIZADO CON FILTROS CONECTADOS ---
        container.appendChild(
          SupplierDetailView({
            supplier,
            movements: getFilteredList(), // <-- Pasamos la lista ya filtrada
            isVisible,
            currentFilter: activeFilter, // <-- Pasamos el estado actual

            // Manejador del cambio de filtro
            onFilterChange: (newFilter) => {
              activeFilter = newFilter;

              // Actualizamos la vista existente sin recargar de la red
              const currentView = container.querySelector(
                ".supplier-detail-view",
              );
              if (currentView && currentView.updateState) {
                // updateState espera: (balance, listaMovimientos, filtroActivo)
                currentView.updateState(
                  supplier.balance,
                  getFilteredList(),
                  activeFilter,
                );
              }
            },

            onBack: () => {
              window.location.hash = "#suppliers";
            },

            // IMPORTANTE: El reporte siempre usa TODO el historial (allProcessedMovements)
            onGenerateReport: () => {
              if (supplier.type === "stock") {
                const modal = StockReportModal({
                  supplier,
                  movements: allProcessedMovements,
                  onClose: () => modal.remove(),
                });
                document.body.appendChild(modal);
              } else {
                PdfReport.generateSupplierReport(
                  supplier,
                  allProcessedMovements,
                );
              }
            },

            // ... (Resto de props: onToggleVisibility, onAddMovement, etc. siguen igual que antes)
            onToggleVisibility: () => {
              isVisible = SupplierModel.toggleVisibility();
              toggleAmountsVisibility(isVisible);
              return isVisible;
            },
            onAddMovement: () =>
              showTransactionModal(
                supplier,
                null,
                allProcessedMovements,
                container,
              ),
            onEditMovement: (m) =>
              showTransactionModal(
                supplier,
                m,
                allProcessedMovements,
                container,
              ),
            onDeleteMovement: (m) => handleDelete(m, supplier, container),
            onOpenSettings: () => handleOpenSettings(supplier, container),
            onSettleDebt: (amount, note, targetIds) =>
              handleSettleDebt(
                supplier,
                allProcessedMovements,
                container,
                amount,
                note,
                targetIds,
              ),
            onToggleStatus: async (transaction) => {
              try {
                const currentStatus = transaction.status || "pending";
                const newStatus = currentStatus === "paid" ? "pending" : "paid";
                const newPaidAmount =
                  newStatus === "paid" ? parseFloat(transaction.amount) : 0;
                showLoader("Actualizando...");
                await SupplierService.updateTransaction(transaction.id, {
                  status: newStatus,
                  paidAmount: newPaidAmount,
                });
                await loadDetailData(supplier.id, container);
                hideLoader();
              } catch (e) {
                hideLoader();
                alert(e.message);
              }
            },
          }),
        );
      } else {
        // MODO LISTA GENERAL (Sin cambios)
        showLoader("Cargando proveedores...");
        const rawSuppliers = await SupplierService.getAll();
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
      console.error("Error:", err);
      hideLoader();
      container.innerHTML = `<div class="error-state"><h3>Error</h3><p>${err.message}</p><button onclick="window.location.reload()">Recargar</button></div>`;
    }

    // HELPERS (Sin cambios mayores, solo replicar el sort en loadDetailData)
    async function loadDetailData(supplierId, cont) {
      // 1. Recarga de datos frescos
      const [freshSupplier, freshMovements] = await Promise.all([
        SupplierService.getById(supplierId),
        SupplierService.getTransactions(supplierId, 200),
      ]);

      // 2. Smart Sort (Misma lógica que arriba)
      freshMovements.sort((a, b) => {
        const dateA = a.date?.seconds
          ? new Date(a.date.seconds * 1000)
          : new Date(a.date);
        const dateB = b.date?.seconds
          ? new Date(b.date.seconds * 1000)
          : new Date(b.date);

        const isSameDay = dateA.toDateString() === dateB.toDateString();
        if (isSameDay) {
          const priorityA = getTypePriority(a.type);
          const priorityB = getTypePriority(b.type);
          if (priorityA !== priorityB) return priorityB - priorityA;
          return dateB - dateA;
        }
        return dateB - dateA;
      });

      // 3. Ledger Processing
      let fallback = parseFloat(freshSupplier.balance) || 0;
      const allProcessed = freshMovements.map((m) => {
        let bal = 0;
        if (m.savedBalance !== undefined && m.savedBalance !== null) {
          bal = m.savedBalance;
          fallback = m.savedBalance - getSignedAmount(m.type, m.amount);
        } else {
          const snap = fallback;
          fallback -= getSignedAmount(m.type, m.amount);
          bal = snap;
        }
        return { ...m, partialBalance: bal };
      });

      // 4. Aplicar el Filtro Activo (activeFilter es variable global del closure)
      const filteredList =
        activeFilter === "all"
          ? allProcessed
          : allProcessed.filter((m) => {
              const t = (m.type || "").toLowerCase();
              if (activeFilter === "invoice")
                return ["invoice", "boleta", "purchase", "compra"].includes(t);
              if (activeFilter === "payment")
                return ["payment", "pago"].includes(t);
              if (activeFilter === "note")
                return ["note", "credit", "debit", "nota"].includes(t);
              return true;
            });

      // 5. Actualizar la Vista
      const currentView = cont.querySelector(".supplier-detail-view");
      if (currentView && typeof currentView.updateState === "function") {
        // Pasamos: Nuevo Saldo, Lista Filtrada, Filtro Activo
        currentView.updateState(
          freshSupplier.balance,
          filteredList,
          activeFilter,
        );
      } else {
        reloadCurrentView(cont);
      }
    }
    // ... (Resto de funciones auxiliares showTransactionModal, etc. se mantienen igual)
    async function showTransactionModal(
      supplier,
      initialData,
      movements,
      cont,
    ) {
      let activeMovements = movements || [];
      if (supplier && activeMovements.length === 0) {
        try {
          activeMovements = await SupplierService.getTransactions(
            supplier.id,
            50,
          );
        } catch (e) {}
      }
      const modal = TransactionModal({
        supplier,
        initialData,
        movements: activeMovements,
        onClose: () => modal.remove(),
        onSave: async (transactionData) => {
          try {
            showLoader("Guardando...");
            if (transactionData.id) {
              const oldTx = await SupplierService.getTransactionById(
                transactionData.id,
              );
              const oldSigned = oldTx
                ? getSignedAmount(oldTx.type, oldTx.amount)
                : 0;
              const newSigned = getSignedAmount(
                transactionData.type,
                transactionData.amount,
              );
              const diff = newSigned - oldSigned;
              await SupplierService.updateTransactionWithBalanceEffect(
                transactionData.id,
                transactionData,
                diff,
                transactionData.supplierId,
              );
            } else {
              await SupplierService.createTransaction(transactionData);
            }
            hideLoader();
            modal.remove();
            if (supplier) await loadDetailData(supplier.id, cont);
            else reloadCurrentView(cont);
          } catch (err) {
            hideLoader();
            alert(err.message);
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
        title: "¿Eliminar?",
        message: "El saldo se ajustará automáticamente.",
        onConfirm: async () => {
          try {
            showLoader("Eliminando...");
            await SupplierService.deleteTransaction(
              m.id,
              supplier.id,
              m.amount,
              m.type,
            );
            hideLoader();
            confirm.remove();
            await loadDetailData(supplier.id, cont);
          } catch (e) {
            hideLoader();
            alert(e.message);
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
            showLoader("Creando...");
            const newId = await SupplierService.createSupplier(data);
            hideLoader();
            modal.remove();
            window.location.hash = `#suppliers/${newId}`;
          } catch (e) {
            hideLoader();
            alert(e.message);
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
            await SupplierService.updateSupplier(supplier.id, cleanData);
            if (renames && renames.length > 0) {
              const transactions = await SupplierService.getTransactions(
                supplier.id,
                9999,
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
                if (changed)
                  await SupplierService.updateTransaction(tx.id, {
                    itemName: newItemName,
                    items: newItems,
                  });
              }
            }
            hideLoader();
            modal.remove();
            await loadDetailData(supplier.id, cont);
          } catch (e) {
            hideLoader();
            alert(e.message);
          }
        },
        onDelete: async (supplierId) => {
          try {
            showLoader("Eliminando...");
            const transactions = await SupplierService.getTransactions(
              supplierId,
              9999,
            );
            for (const tx of transactions) {
              await SupplierService.deleteTransaction(
                tx.id,
                supplierId,
                0,
                tx.type,
              );
            }
            await SupplierService.deleteSupplier(supplierId);
            hideLoader();
            modal.remove();
            window.location.hash = "#suppliers";
          } catch (e) {
            hideLoader();
            alert(e.message);
          }
        },
      });
      document.body.appendChild(modal);
    }

    async function handleSettleDebt(
      supplier,
      movements,
      cont,
      amountOverride = null,
      noteOverride = null,
      targetInvoiceIds = [],
    ) {
      const totalDebt = parseFloat(supplier.balance) || 0;
      if (totalDebt <= 0 && amountOverride === null)
        return alert("Sin deuda pendiente.");
      const finalAmount = amountOverride !== null ? amountOverride : totalDebt;
      const modal = TransactionModal({
        supplier,
        initialData: {
          type: "payment",
          amount: finalAmount,
          date: new Date().toISOString().split("T")[0],
          observation: noteOverride || "Cancelación deuda",
        },
        movements: movements,
        onClose: () => modal.remove(),
        onSave: async (transactionData) => {
          try {
            showLoader("Procesando...");
            await SupplierService.createTransaction(transactionData);
            if (targetInvoiceIds && targetInvoiceIds.length > 0) {
              let moneyToDistribute = parseFloat(transactionData.amount);
              for (const invId of targetInvoiceIds) {
                if (moneyToDistribute <= 0) break;
                const invoice = await SupplierService.getTransactionById(invId);
                if (!invoice) continue;
                const invDebt =
                  parseFloat(invoice.amount) -
                  parseFloat(invoice.paidAmount || 0);
                if (invDebt <= 0) continue;
                const paymentForThis = Math.min(moneyToDistribute, invDebt);
                const newPaid =
                  parseFloat(invoice.paidAmount || 0) + paymentForThis;
                await SupplierService.updateTransaction(invId, {
                  paidAmount: newPaid,
                  status: newPaid >= invoice.amount - 0.1 ? "paid" : "partial",
                });
                moneyToDistribute -= paymentForThis;
              }
            }
            hideLoader();
            modal.remove();
            await loadDetailData(supplier.id, cont);
          } catch (err) {
            hideLoader();
            alert(err.message);
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
            await SupplierService.createTransaction(data);
            hideLoader();
            modal.remove();
            reloadCurrentView(cont);
          } catch (e) {
            hideLoader();
            alert(e.message);
          }
        },
      });
      document.body.appendChild(modal);
    }
  };
};
