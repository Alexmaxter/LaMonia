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
import { toast } from "../../shared/ui/Toast/index.js"; // <-- IMPORTACIÓN DEL TOAST

// Estado
import { supplierStore } from "./SupplierStore.js";

// --- IMPORTAMOS LAS CONSTANTES Y LA CALCULADORA ---
import {
  TRANSACTION_TYPES,
  TRANSACTION_GROUPS,
  TRANSACTION_STATUS,
  UI_FILTERS,
} from "../../shared/constants/index.js";
import { TransactionCalculator } from "./utils/TransactionCalculator.js";

export const SupplierController = () => {
  // FIX #5: Referencia al último container para poder re-renderizar
  let lastContainer = null;

  // FIX #7: isVisible y activeFilter ELIMINADOS del closure.
  // Ahora viven exclusivamente en supplierStore.
  // Las vistas se suscriben al store y reaccionan automáticamente.

  // FIX #5: Reutiliza renderView del mismo closure
  const reloadCurrentView = (container) => {
    const target = container || lastContainer;
    if (target) renderView(target);
  };

  // ============================================================
  // HELPERS DEL CONTROLADOR
  // (Movidos fuera de renderView para que compartan el closure
  //  y no se re-definan en cada renderizado)
  // ============================================================

  async function loadDetailData(supplierId, cont) {
    const [freshSupplier, freshMovements] = await Promise.all([
      SupplierService.getById(supplierId),
      SupplierService.getTransactions(supplierId, 200),
    ]);

    const sorted =
      TransactionCalculator.sortTransactionsDescending(freshMovements);
    const allProcessed = TransactionCalculator.processLedger(
      freshSupplier.balance,
      sorted,
    );

    // FIX #7: Solo actualizamos el store.
    // La vista (SupplierDetailView) está suscrita y se repinta sola.
    supplierStore.setDetailData(freshSupplier, allProcessed);
  }

  async function showTransactionModal(supplier, initialData, movements, cont) {
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
              ? TransactionCalculator.getSignedAmount(oldTx.type, oldTx.amount)
              : 0;
            const newSigned = TransactionCalculator.getSignedAmount(
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

          // MOSTRAR TOAST DE ÉXITO
          toast.success("Transacción guardada correctamente");

          if (supplier) await loadDetailData(supplier.id, cont);
          else reloadCurrentView(cont);
        } catch (err) {
          hideLoader();
          toast.error(err.message || "Error al guardar la transacción"); // MOSTRAR TOAST DE ERROR
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

          toast.success("Transacción eliminada con éxito"); // TOAST DE ÉXITO

          await loadDetailData(supplier.id, cont);
        } catch (e) {
          hideLoader();
          toast.error(e.message || "Error al eliminar la transacción"); // TOAST DE ERROR
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

          toast.success("Proveedor creado exitosamente"); // TOAST DE ÉXITO

          window.location.hash = `#suppliers/${newId}`;
        } catch (e) {
          hideLoader();
          toast.error(e.message || "Error al crear el proveedor"); // TOAST DE ERROR
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

          await SupplierService.updateSupplierAndRenameItems(
            supplier.id,
            cleanData,
            renames,
          );

          hideLoader();
          modal.remove();

          toast.success("Configuración del proveedor actualizada"); // TOAST DE ÉXITO

          await loadDetailData(supplier.id, cont);
        } catch (e) {
          hideLoader();
          toast.error(e.message || "Error al actualizar el proveedor"); // TOAST DE ERROR
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

          toast.success("Proveedor y su historial eliminados"); // TOAST DE ÉXITO

          window.location.hash = "#suppliers";
        } catch (e) {
          hideLoader();
          toast.error(e.message || "Error al eliminar el proveedor"); // TOAST DE ERROR
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
      return toast.warning("Sin deuda pendiente."); // TOAST DE ADVERTENCIA

    const finalAmount = amountOverride !== null ? amountOverride : totalDebt;

    const modal = TransactionModal({
      supplier,
      initialData: {
        type: TRANSACTION_TYPES.PAYMENT,
        amount: finalAmount,
        date: new Date().toISOString().split("T")[0],
        observation: noteOverride || "Cancelación deuda",
      },
      movements: movements,
      onClose: () => modal.remove(),
      onSave: async (transactionData) => {
        try {
          showLoader("Procesando...");

          if (targetInvoiceIds && targetInvoiceIds.length > 0) {
            await SupplierService.settleSupplierDebt(
              supplier.id,
              transactionData,
              targetInvoiceIds,
            );
          } else {
            await SupplierService.createTransaction(transactionData);
          }

          hideLoader();
          modal.remove();

          toast.success("Pago registrado correctamente"); // TOAST DE ÉXITO

          await loadDetailData(supplier.id, cont);
        } catch (err) {
          hideLoader();
          toast.error(err.message || "Error al registrar el pago"); // TOAST DE ERROR
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

          toast.success("Transacción global guardada"); // TOAST DE ÉXITO

          reloadCurrentView(cont);
        } catch (e) {
          hideLoader();
          toast.error(e.message || "Error al guardar transacción global"); // TOAST DE ERROR
        }
      },
    });
    document.body.appendChild(modal);
  }

  // ============================================================
  // FUNCIÓN PRINCIPAL DE RENDERIZADO
  // ============================================================
  const renderView = async (container) => {
    lastContainer = container;
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

        // --- 1. SMART SORTING & LEDGER (Delegado al Calculator) ---
        const sortedMovements =
          TransactionCalculator.sortTransactionsDescending(rawMovements);
        const allProcessedMovements = TransactionCalculator.processLedger(
          supplier.balance,
          sortedMovements,
        );

        // --- 2. Actualizar el Store (única fuente de verdad) ---
        // FIX #7: El store notifica a la vista, que se repinta sola.
        // Ya no necesitamos getFilteredList(), onFilterChange, ni
        // buscar el DOM con querySelector para llamar updateState().
        supplierStore.setDetailData(supplier, allProcessedMovements);

        hideLoader();
        container.innerHTML = "";

        // --- 3. RENDERIZADO ---
        // FIX #7: Solo pasamos callbacks de acción.
        // Los datos (supplier, movements, isVisible, activeFilter)
        // los lee la vista directamente del store via suscripción.
        container.appendChild(
          SupplierDetailView({
            supplier,

            onBack: () => {
              window.location.hash = "#suppliers";
            },

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

            onRepeatMovement: (m) => {
              const repeatData = {
                type: m.type,
                amount: m.amount,
                concept: m.concept || m.description || "",
                items: m.items,
              };
              showTransactionModal(
                supplier,
                repeatData,
                allProcessedMovements,
                container,
              );
            },

            onEditDescription: async (txId, newDesc) => {
              try {
                await SupplierService.updateTransaction(txId, {
                  concept: newDesc,
                  description: newDesc,
                });
                await loadDetailData(supplier.id, container);
                toast.success("Descripción actualizada");
              } catch (e) {
                toast.error(e.message || "Error al actualizar la descripción");
              }
            },

            onToggleStatus: async (transaction) => {
              try {
                const currentStatus =
                  transaction.status || TRANSACTION_STATUS.PENDING;
                const newStatus =
                  currentStatus === TRANSACTION_STATUS.PAID
                    ? TRANSACTION_STATUS.PENDING
                    : TRANSACTION_STATUS.PAID;
                const newPaidAmount =
                  newStatus === TRANSACTION_STATUS.PAID
                    ? parseFloat(transaction.amount)
                    : 0;

                showLoader("Actualizando...");
                await SupplierService.updateTransaction(transaction.id, {
                  status: newStatus,
                  paidAmount: newPaidAmount,
                });
                await loadDetailData(supplier.id, container);
                hideLoader();

                toast.success("Estado de transacción actualizado"); // TOAST DE ÉXITO
              } catch (e) {
                hideLoader();
                toast.error(e.message || "Error al cambiar el estado"); // TOAST DE ERROR
              }
            },
          }),
        );
      } else {
        // ============================================================
        // MODO LISTA GENERAL
        // ============================================================
        showLoader("Cargando proveedores...");
        const rawSuppliers = await SupplierService.getAll();
        const suppliersData = rawSuppliers.map((s) => ({
          ...s,
          balance: parseFloat(s.balance) || 0,
        }));

        // FIX #7: Actualizamos el store. SupplierListView está suscrita
        // y lee suppliers, totalDebt e isVisible desde el store.
        supplierStore.setSuppliers(suppliersData);

        hideLoader();
        container.innerHTML = "";

        // FIX #7: Solo pasamos callbacks de acción.
        // Los datos (suppliers, totalDebt, isVisible) los lee la vista
        // directamente del store via suscripción.
        container.appendChild(
          SupplierListView({
            onSelect: (sId) => {
              window.location.hash = `#suppliers/${sId}`;
            },
            onAddQuickTransaction: (s) =>
              showTransactionModal(
                s,
                { type: TRANSACTION_TYPES.INVOICE },
                [],
                container,
              ),
            onNewSupplier: () => handleCreateSupplier(container),
            onGlobalTransaction: () =>
              handleGlobalTransaction(suppliersData, container),
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
      toast.error(err.message || "Error general del sistema");
      container.innerHTML = `<div class="error-state"><h3>Error</h3><p>${err.message}</p><button onclick="window.location.reload()">Recargar</button></div>`;
    }
  };

  // Retornamos renderView directamente
  return renderView;
};
