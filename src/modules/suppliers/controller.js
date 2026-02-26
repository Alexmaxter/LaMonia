import { el } from "../../core/dom.js";
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
import { toast } from "../../shared/ui/Toast/index.js";
import { Skeleton } from "../../shared/ui/Skeleton/index.js";

// Estado
import { supplierStore } from "./SupplierStore.js";

import {
  TRANSACTION_TYPES,
  TRANSACTION_GROUPS,
  TRANSACTION_STATUS,
  UI_FILTERS,
} from "../../shared/constants/index.js";
import { TransactionCalculator } from "./utils/TransactionCalculator.js";

export const SupplierController = () => {
  let lastContainer = null;

  // ============================================================
  // FIX #2: TOKEN DE NAVEGACIÓN
  //
  // Cada llamada a renderView incrementa este contador.
  // Todas las operaciones async del modo detalle capturan el token
  // al inicio y lo verifican antes de escribir al store.
  // Si el token cambió (el usuario navegó a otra ruta), la operación
  // descarta su resultado sin tocar el store ni el DOM.
  // ============================================================
  let navToken = 0;

  const reloadCurrentView = (container) => {
    const target = container || lastContainer;
    if (target) renderView(target);
  };

  // ============================================================
  // HELPERS DEL CONTROLADOR
  // ============================================================

  async function loadDetailData(supplierId, expectedToken) {
    const [freshSupplier, freshMovements] = await Promise.all([
      SupplierService.getById(supplierId),
      SupplierService.getTransactions(supplierId, 200),
    ]);

    // FIX #2: si el usuario navegó a otra ruta mientras esperábamos,
    // descartar el resultado sin pisar los datos correctos en el store
    if (navToken !== expectedToken) {
      console.log("🚫 loadDetailData cancelado — navegación superada");
      return;
    }

    const sorted =
      TransactionCalculator.sortTransactionsDescending(freshMovements);
    const allProcessed = TransactionCalculator.processLedger(
      freshSupplier.balance,
      sorted,
    );

    supplierStore.setDetailData(freshSupplier, allProcessed);
  }

  // ============================================================
  // FIX: reloadListData
  //
  // PROBLEMA ORIGINAL:
  //   handleDelete siempre llamaba loadDetailData() después de
  //   eliminar, sin importar si el usuario estaba en la vista de
  //   detalle o en la lista general.
  //
  //   Cuando la eliminación ocurría desde la lista (onDeleteTransaction
  //   en SupplierListView), loadDetailData() actualizaba el store con
  //   setDetailData(), pero la lista escucha setSuppliers(). El store
  //   nunca se actualizaba con los proveedores frescos, así que la
  //   tarjeta de la transacción eliminada seguía visible hasta que el
  //   usuario recargaba la página manualmente.
  //
  // SOLUCIÓN:
  //   Separar la lógica de refresco en dos funciones:
  //     - loadDetailData  → para la vista de detalle de un proveedor
  //     - reloadListData  → para la vista de lista general
  //
  //   handleDelete recibe un flag `isListView` que indica cuál usar.
  //   Cuando se llama desde onDeleteTransaction en SupplierListView,
  //   se usa reloadListData(), que vuelve a traer todos los proveedores
  //   y llama supplierStore.setSuppliers(), disparando el re-render
  //   correcto en la lista.
  // ============================================================
  async function reloadListData() {
    const rawSuppliers = await SupplierService.getAll();
    const suppliersData = rawSuppliers.map((s) => ({
      ...s,
      balance: parseFloat(s.balance) || 0,
    }));
    supplierStore.setSuppliers(suppliersData);
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

          toast.success("Transacción guardada correctamente");

          if (supplier) await loadDetailData(supplier.id, navToken);
          else reloadCurrentView(cont);
        } catch (err) {
          hideLoader();
          toast.error(err.message || "Error al guardar la transacción");
        }
      },
      onDelete: initialData?.id
        ? async (transactionId) => {
            await handleDelete(
              { id: transactionId, ...initialData },
              supplier,
              cont,
              false, // viene del modal de detalle, no de la lista
            );
            modal.remove();
          }
        : null,
    });
    document.body.appendChild(modal);
  }

  // ============================================================
  // FIX: handleDelete recibe isListView (boolean)
  //
  // isListView = false (default) → viene del detalle de proveedor
  //              → refresca con loadDetailData (actualiza el store
  //                con setDetailData, la vista de detalle se repinta)
  //
  // isListView = true → viene de la lista general
  //              → refresca con reloadListData (actualiza el store
  //                con setSuppliers, la lista se repinta y la
  //                transacción eliminada desaparece sin recargar)
  // ============================================================
  async function handleDelete(m, supplier, cont, isListView = false) {
    const confirm = ConfirmationModal({
      title: "¿Eliminar?",
      message: "El saldo se ajustará automáticamente.",
      onConfirm: async () => {
        try {
          showLoader("Eliminando...");

          // FIX: separamos el borrado del recálculo para que un fallo
          // en el recálculo (ej: índice de Firestore faltante) no
          // impida refrescar la vista. La transacción ya fue borrada
          // atómicamente en Firebase — la vista SIEMPRE debe actualizarse.
          try {
            await SupplierService.deleteTransaction(
              m.id,
              supplier.id,
              m.amount,
              m.type,
            );
          } catch (deleteError) {
            // Si el error es SOLO del recálculo (el doc ya fue borrado),
            // lo registramos pero continuamos con el refresco.
            // Si fue un error real del borrado, lo relanzamos.
            const isRecalcError =
              deleteError.message?.includes("index") ||
              deleteError.message?.includes("índice") ||
              deleteError.code === "failed-precondition";

            if (!isRecalcError) {
              throw deleteError; // error real → ir al catch exterior
            }
            // error solo del índice → avisar pero continuar
            console.warn(
              "Recálculo de saldos omitido (índice faltante):",
              deleteError.message,
            );
          }

          hideLoader();
          confirm.remove();
          toast.success("Transacción eliminada con éxito");

          // Refrescar la vista siempre, aunque el recálculo haya fallado
          if (isListView) {
            await reloadListData();
          } else {
            await loadDetailData(supplier.id, navToken);
          }
        } catch (e) {
          hideLoader();
          toast.error(e.message || "Error al eliminar la transacción");
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

          toast.success("Proveedor creado exitosamente");

          window.location.hash = `#suppliers/${newId}`;
        } catch (e) {
          hideLoader();
          toast.error(e.message || "Error al crear el proveedor");
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

          toast.success("Configuración del proveedor actualizada");

          await loadDetailData(supplier.id, navToken);
        } catch (e) {
          hideLoader();
          toast.error(e.message || "Error al actualizar el proveedor");
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

          toast.success("Proveedor y su historial eliminados");

          window.location.hash = "#suppliers";
        } catch (e) {
          hideLoader();
          toast.error(e.message || "Error al eliminar el proveedor");
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
      return toast.warning("Sin deuda pendiente.");

    const finalAmount = amountOverride !== null ? amountOverride : totalDebt;

    let finalTargetIds = Array.isArray(targetInvoiceIds)
      ? [...targetInvoiceIds]
      : [];

    if (finalTargetIds.length === 0 && amountOverride === null) {
      finalTargetIds = movements
        .filter(
          (m) =>
            TRANSACTION_GROUPS.DEBTS.includes((m.type || "").toLowerCase()) &&
            m.status !== TRANSACTION_STATUS.PAID,
        )
        .sort((a, b) => {
          const tA = a.date?.seconds
            ? a.date.seconds * 1000
            : new Date(a.date).getTime();
          const tB = b.date?.seconds
            ? b.date.seconds * 1000
            : new Date(b.date).getTime();
          return tA - tB;
        })
        .map((m) => m.id);
    }

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

          if (finalTargetIds && finalTargetIds.length > 0) {
            await SupplierService.settleSupplierDebt(
              supplier.id,
              transactionData,
              finalTargetIds,
            );
          } else {
            await SupplierService.createTransaction(transactionData);
          }

          hideLoader();
          modal.remove();

          toast.success("Pago registrado correctamente");
          await loadDetailData(supplier.id, navToken);
        } catch (err) {
          hideLoader();
          toast.error(err.message || "Error al registrar el pago");
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

          toast.success("Transacción global guardada");

          reloadCurrentView(cont);
        } catch (e) {
          hideLoader();
          toast.error(e.message || "Error al guardar transacción global");
        }
      },
    });
    document.body.appendChild(modal);
  }

  // ============================================================
  // SKELETON DE DETALLE
  // Muestra la estructura de la vista de detalle con datos básicos
  // (nombre y balance del proveedor) mientras Firebase carga los
  // movimientos. Evita mostrar datos del proveedor anterior.
  // ============================================================
  const SkeletonDetailView = (supplier) => {
    const iconBack = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`;

    // Header real: nombre y balance son datos que ya tenemos — no skeleton
    const header = el("div", { className: "tech-panel-header-detail" }, [
      el("div", { className: "tech-header-top" }, [
        el("div", { className: "left-group" }, [
          el(
            "button",
            {
              className: "btn-back-arrow",
              onclick: () => {
                window.location.hash = "#suppliers";
              },
            },
            el("span", { innerHTML: iconBack }),
          ),
          el("div", { className: "title-block" }, [
            el("h1", { className: "page-title" }, supplier.name),
            el(
              "span",
              { className: "supplier-type-badge" },
              supplier.type === "stock" ? "STOCK" : "MONETARIO",
            ),
          ]),
        ]),
        el("div", { className: "tech-debt-group" }, [
          el("div", { className: "debt-label-row" }, [
            el("span", { className: "debt-label" }, "SALDO ACTUAL"),
          ]),
          el(
            "div",
            { className: "header-debt-value" },
            SupplierModel.formatAmount(supplier.balance, true),
          ),
        ]),
      ]),
      el("div", { className: "tech-controls-row" }, [
        el(
          "div",
          { className: "info-mini-container" },
          // Alias como skeleton (no lo tenemos en el store básico)
          Skeleton({ width: "160px", height: "32px", className: "skel-btn" }),
        ),
        el(
          "div",
          { className: "tech-actions-container skeleton-actions-row" },
          [
            // Botón settings skeleton
            Skeleton({ width: "36px", height: "36px", className: "skel-btn" }),
            // Botón reporte skeleton
            Skeleton({ width: "96px", height: "36px", className: "skel-btn" }),
            // Botón nuevo movimiento skeleton
            Skeleton({ width: "168px", height: "36px", className: "skel-btn" }),
          ],
        ),
      ]),
    ]);

    // Filtros skeleton — imitan las filter-pills brutalistas
    const filters = el("div", { className: "skeleton-filters" }, [
      Skeleton({
        width: "64px",
        height: "38px",
        className: "skeleton-filter-pill",
      }),
      Skeleton({
        width: "76px",
        height: "38px",
        className: "skeleton-filter-pill",
      }),
      Skeleton({
        width: "64px",
        height: "38px",
        className: "skeleton-filter-pill",
      }),
      Skeleton({
        width: "64px",
        height: "38px",
        className: "skeleton-filter-pill",
      }),
    ]);

    // Tarjeta skeleton — imita .tech-movement-card con borde y sombra
    const skeletonCard = (widths = ["35%", "55%"]) =>
      el("div", { className: "skeleton-movement-card" }, [
        // Columna fecha
        el("div", { className: "skeleton-card-date" }, [
          Skeleton({ width: "28px", height: "22px" }),
          Skeleton({ width: "32px", height: "12px" }),
        ]),
        // Columna info
        el("div", { className: "skeleton-card-body" }, [
          el("div", { style: "display:flex;gap:8px;align-items:center" }, [
            Skeleton({ width: "52px", height: "18px" }), // tipo badge
            Skeleton({ width: widths[0], height: "14px" }),
          ]),
          Skeleton({ width: widths[1], height: "12px" }),
        ]),
        // Columna monto
        el("div", { className: "skeleton-card-amount" }, [
          Skeleton({ width: "84px", height: "18px" }),
          Skeleton({ width: "60px", height: "11px" }),
        ]),
      ]);

    // Dos grupos de día para dar profundidad visual
    const dayGroup = (cardCount, dateW1 = "22px", dateW2 = "36px") =>
      el("div", { className: "skeleton-day-group" }, [
        el("div", { className: "skeleton-day-header" }, [
          Skeleton({ width: dateW1, height: "28px" }),
          Skeleton({ width: dateW2, height: "14px" }),
          el(
            "div",
            { style: "margin-left:auto" },
            Skeleton({ width: "72px", height: "14px" }),
          ),
        ]),
        ...Array.from({ length: cardCount }, (_, i) =>
          skeletonCard([
            ["42%", "28%", "55%", "35%", "48%"][i % 5],
            ["58%", "70%", "44%", "62%", "50%"][i % 5],
          ]),
        ),
      ]);

    const content = el("div", { className: "detail-content-wrapper" }, [
      dayGroup(3, "28px", "48px"),
      dayGroup(2, "22px", "44px"),
    ]);

    return el("div", { className: "supplier-detail-view" }, [
      header,
      filters,
      content,
    ]);
  };

  // ============================================================
  // FUNCIÓN PRINCIPAL DE RENDERIZADO
  // ============================================================
  const renderView = async (container) => {
    lastContainer = container;

    // FIX #2: incrementar token en cada navegación
    const currentToken = ++navToken;

    container.innerHTML = "";
    const hash = window.location.hash;
    const cleanHash = hash.split("?")[0];
    const parts = cleanHash.split("/");
    const id = parts[1] ? parts[1].trim() : null;

    // Helper para construir y montar SupplierDetailView
    // extraído para no duplicar código entre el path con cache y sin cache
    const mountDetailView = (supplier, movements) => {
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
                movements,
                onClose: () => modal.remove(),
              });
              document.body.appendChild(modal);
            } else {
              PdfReport.generateSupplierReport(supplier, movements);
            }
          },
          onAddMovement: () =>
            showTransactionModal(supplier, null, movements, container),
          onEditMovement: (m) =>
            showTransactionModal(supplier, m, movements, container),
          onDeleteMovement: (m) => handleDelete(m, supplier, container, false),
          onOpenSettings: () => handleOpenSettings(supplier, container),
          onSettleDebt: (amount, note, targetIds) =>
            handleSettleDebt(
              supplier,
              movements,
              container,
              amount,
              note,
              targetIds,
            ),
          onRepeatMovement: (m) => {
            showTransactionModal(
              supplier,
              {
                type: m.type,
                amount: m.amount,
                concept: m.concept || m.description || "",
                items: m.items,
              },
              movements,
              container,
            );
          },
          onEditDescription: async (txId, newDesc) => {
            try {
              // FIX #7: no recargar la lista después de guardar.
              // MovementList ya actualizó el span optimistamente —
              // llamar loadDetailData causaría un parpadeo innecesario.
              await SupplierService.updateTransaction(txId, {
                concept: newDesc,
                description: newDesc,
              });
              toast.success("Descripción actualizada");
            } catch (e) {
              toast.error(e.message || "Error al actualizar la descripción");
              // En error: recargar para mostrar el valor original
              await loadDetailData(supplier.id, navToken);
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
              await loadDetailData(supplier.id, navToken);
              hideLoader();
              toast.success("Estado de transacción actualizado");
            } catch (e) {
              hideLoader();
              toast.error(e.message || "Error al cambiar el estado");
            }
          },
        }),
      );
    };

    try {
      if (id) {
        // ============================================================
        // MODO DETALLE
        // ============================================================
        // FIX PARPADEO: si el proveedor ya está en el store (viene de
        // la lista), montamos la vista inmediatamente sin esperar Firebase.
        // Los datos frescos se cargan en background y la vista se actualiza
        // sola vía suscripción al store.
        //
        // Si no hay cache (acceso directo por URL), usamos el flujo
        // original con loader.
        // ============================================================
        const storeState = supplierStore.getState();
        const isSameSupplier = storeState.currentSupplier?.id === id;
        const basicSupplier = storeState.suppliers.find((s) => s.id === id);

        if (isSameSupplier) {
          // CASO 1: Mismo proveedor ya cargado — usar cache completo
          container.innerHTML = "";
          mountDetailView(storeState.currentSupplier, storeState.transactions);
          // Refrescar en background
          loadDetailData(id, currentToken).catch((e) => {
            console.error("Error refrescando detalle:", e);
          });
        } else if (basicSupplier) {
          // CASO 2: Proveedor diferente — tenemos nombre/balance de la lista
          // pero NO los movimientos. Mostrar skeleton para evitar ver datos
          // del proveedor anterior mientras carga Firebase.
          container.innerHTML = "";
          container.appendChild(SkeletonDetailView(basicSupplier));

          try {
            const [freshSupplier, rawMovements] = await Promise.all([
              SupplierService.getById(id),
              SupplierService.getTransactions(id, 200),
            ]);

            // FIX #2: el usuario pudo haber navegado a otra ruta
            // mientras esperábamos Firebase — verificar antes de montar
            if (navToken !== currentToken) {
              console.log(
                "🚫 Carga de detalle cancelada — navegación superada",
              );
              return;
            }

            const sorted =
              TransactionCalculator.sortTransactionsDescending(rawMovements);
            const processed = TransactionCalculator.processLedger(
              freshSupplier.balance,
              sorted,
            );
            supplierStore.setDetailData(freshSupplier, processed);
            container.innerHTML = "";
            mountDetailView(freshSupplier, processed);
          } catch (e) {
            console.error("Error cargando detalle:", e);
            toast.error("Error al cargar el proveedor");
          }
        } else {
          // Sin cache (acceso directo por URL): loader + esperar Firebase
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

          const sortedMovements =
            TransactionCalculator.sortTransactionsDescending(rawMovements);
          const allProcessedMovements = TransactionCalculator.processLedger(
            supplier.balance,
            sortedMovements,
          );

          // FIX #2: verificar antes de montar
          if (navToken !== currentToken) {
            hideLoader();
            console.log("🚫 Carga directa cancelada — navegación superada");
            return;
          }

          supplierStore.setDetailData(supplier, allProcessedMovements);
          hideLoader();
          container.innerHTML = "";
          mountDetailView(supplier, allProcessedMovements);
        }
      } else {
        // ============================================================
        // MODO LISTA GENERAL
        // ============================================================

        // FIX PARPADEO: si ya tenemos proveedores en el store, montar
        // la lista inmediatamente y refrescar en background
        const storeState = supplierStore.getState();

        if (storeState.suppliers.length > 0) {
          container.innerHTML = "";
          const cachedSuppliers = storeState.suppliers;

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
                handleGlobalTransaction(cachedSuppliers, container),
              onEditTransaction: (tx) => {
                const s = cachedSuppliers.find(
                  (sup) => sup.id === tx.supplierId,
                );
                if (s) showTransactionModal(s, tx, [], container);
              },
              onDeleteTransaction: (tx) => {
                const s = cachedSuppliers.find(
                  (sup) => sup.id === tx.supplierId,
                );
                if (s) handleDelete(tx, s, container, true);
              },
            }),
          );

          // Refrescar en background
          SupplierService.getAll()
            .then((rawSuppliers) => {
              const suppliersData = rawSuppliers.map((s) => ({
                ...s,
                balance: parseFloat(s.balance) || 0,
              }));
              supplierStore.setSuppliers(suppliersData);
            })
            .catch((e) => console.error("Error refrescando lista:", e));
        } else {
          // Primera carga: esperar Firebase con loader
          showLoader("Cargando proveedores...");
          const rawSuppliers = await SupplierService.getAll();
          const suppliersData = rawSuppliers.map((s) => ({
            ...s,
            balance: parseFloat(s.balance) || 0,
          }));

          supplierStore.setSuppliers(suppliersData);
          hideLoader();
          container.innerHTML = "";

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
                if (s) handleDelete(tx, s, container, true);
              },
            }),
          );
        }
      }
    } catch (err) {
      console.error("Error:", err);
      hideLoader();
      toast.error(err.message || "Error general del sistema");
      container.innerHTML = `<div class="error-state"><h3>Error</h3><p>${err.message}</p><button onclick="window.location.reload()">Recargar</button></div>`;
    }
  };

  return renderView;
};
