import { el } from "../../../../core/dom.js";
import { SupplierModel } from "../../model.js";
import { MovementList } from "../../Components/MovementList/index.js";
import { StockStatsPanel } from "../../Components/StockStatskPanel/index.js";
import { supplierStore } from "../../SupplierStore.js";
import {
  UI_FILTERS,
  TRANSACTION_GROUPS,
} from "../../../../shared/constants/index.js";
import "./style.css";

export function SupplierDetailView({
  supplier,
  onGenerateReport,
  onBack,
  onAddMovement,
  onEditMovement,
  onDeleteMovement,
  onOpenSettings,
  onSettleDebt,
  onToggleStatus,
  onRepeatMovement,
  onEditDescription,
}) {
  // =========================================================
  // ESTADO LOCAL DE SELECCIÓN (Checkbox)
  // =========================================================
  const selectedInvoices = new Set();
  let selectedTotal = 0;

  // =========================================================
  // ELEMENTOS DOM BASE
  // =========================================================
  let contentContainer = el("div", { className: "detail-content-wrapper" });
  let filtersBar = el("div", { className: "filters-bar" });
  let debtValueDisplay = el("div", { className: "header-debt-value" });

  // --- SNACKBAR FLOTANTE ---
  const snackbarCount = el(
    "span",
    { className: "snackbar-count" },
    "0 SELECCIONADOS",
  );
  const snackbarTotal = el("span", { className: "snackbar-total" }, "$0");

  const snackbar = el("div", { className: "selection-snackbar" }, [
    el("div", { className: "snackbar-info" }, [snackbarCount, snackbarTotal]),
    el(
      "button",
      {
        className: "btn-snackbar-pay",
        onclick: () => {
          if (selectedInvoices.size > 0 && onSettleDebt) {
            const targetIds = Array.from(selectedInvoices);
            onSettleDebt(
              selectedTotal,
              `Pago selección (${selectedInvoices.size})`,
              targetIds,
            );
          }
        },
      },
      "PAGAR",
    ),
  ]);

  const updateSnackbar = (isVisible) => {
    if (selectedInvoices.size > 0) {
      snackbar.classList.add("active");
      snackbarCount.textContent = `${selectedInvoices.size} SELECCIONADO${selectedInvoices.size > 1 ? "S" : ""}`;
      snackbarTotal.textContent = SupplierModel.formatAmount(
        selectedTotal,
        isVisible,
      );
    } else {
      snackbar.classList.remove("active");
    }
  };

  const handleSelection = (id, amount, isChecked) => {
    if (isChecked) {
      selectedInvoices.add(id);
      selectedTotal += amount;
    } else {
      selectedInvoices.delete(id);
      selectedTotal -= amount;
    }
    const state = supplierStore.getState();
    updateSnackbar(state.amountsVisible);
  };

  // --- ICONOS ---
  const iconBack = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`;
  const iconEye = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  const iconEyeOff = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
  const iconSettings = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;
  const iconPlus = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
  const iconFile = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
  const iconCopy = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="0" ry="0"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
  const iconCheck = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

  const findColorInSettings = (itemName) => {
    if (!supplier.defaultItems || !Array.isArray(supplier.defaultItems))
      return "#ffffff";
    const match = supplier.defaultItems.find((i) => {
      const name = typeof i === "string" ? i : i.name;
      return name && name.toUpperCase() === itemName.toUpperCase();
    });
    if (match && typeof match === "object" && match.color) return match.color;
    return "#ffffff";
  };

  const copyAlias = (e) => {
    if (!supplier.alias) return;
    navigator.clipboard.writeText(supplier.alias);
    const iconSpan = e.target.querySelector("span");
    if (iconSpan) iconSpan.style.color = "#2e7d32";
    setTimeout(() => {
      if (iconSpan) iconSpan.style.color = "";
    }, 1000);
  };

  // =========================================================
  // UI HEADER (Botones estáticos)
  // =========================================================

  const settleTotalBtn = el(
    "button",
    {
      className: "btn-settle-mini",
      style: "display: none",
      onclick: (e) => {
        e.stopPropagation();
        if (onSettleDebt) onSettleDebt(null, "Cancelación total");
      },
    },
    [el("span", { innerHTML: iconCheck }), "SALDAR TOTAL"],
  );

  const toggleVisibilityBtn = el("button", {
    className: "btn-icon-toggle",
    onclick: () => supplierStore.toggleAmountsVisibility(),
  });

  const headerPanel = el("div", { className: "tech-panel-header-detail" }, [
    el("div", { className: "tech-header-top" }, [
      el("div", { className: "left-group" }, [
        el(
          "button",
          { className: "btn-back-arrow", onclick: onBack },
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
          toggleVisibilityBtn,
        ]),
        debtValueDisplay,
        settleTotalBtn,
      ]),
    ]),
    el("div", { className: "tech-controls-row" }, [
      el("div", { className: "info-mini-container" }, [
        supplier.alias
          ? el(
              "button",
              {
                className: "alias-chip",
                onclick: copyAlias,
                title: "Copiar Alias",
              },
              [
                el("span", { innerHTML: iconCopy }),
                el("span", { className: "alias-text" }, supplier.alias),
              ],
            )
          : el("span", { className: "no-alias" }, "Sin datos bancarios"),
      ]),
      el("div", { className: "tech-actions-container" }, [
        el(
          "button",
          {
            className: "btn-secondary-icon",
            onclick: () => onOpenSettings(supplier),
            title: "Configurar",
          },
          el("span", { innerHTML: iconSettings }),
        ),
        el(
          "button",
          { className: "btn-secondary", onclick: onGenerateReport },
          [el("span", { innerHTML: iconFile }), "REPORTE"],
        ),
        el("button", { className: "btn-primary", onclick: onAddMovement }, [
          el("span", { innerHTML: iconPlus }),
          "NUEVO MOVIMIENTO",
        ]),
      ]),
    ]),
  ]);

  // =========================================================
  // LOGICA REACTIVA (Escucha al Store)
  // =========================================================

  // =========================================================
  // FIX #5: LIMPIAR SELECCIÓN AL CAMBIAR FILTRO
  //
  // PROBLEMA ORIGINAL:
  //   Al cambiar el filtro activo, contentContainer.innerHTML = ""
  //   limpia el DOM. Las tarjetas reaparecen sin .row-selected porque
  //   el DOM se reconstruyó. Pero selectedInvoices y selectedTotal
  //   no se limpiaban, así que el snackbar seguía mostrando facturas
  //   "seleccionadas" que el usuario no puede ver ni deseleccionar.
  //   Si presionaba PAGAR intentaba pagar ids fantasmas.
  //
  // SOLUCIÓN:
  //   Trackear el filtro anterior. Cuando cambia, limpiar la selección
  //   y ocultar el snackbar antes de re-renderizar la lista.
  // =========================================================
  let lastActiveFilter = null;

  const clearSelection = () => {
    selectedInvoices.clear();
    selectedTotal = 0;
    snackbar.classList.remove("active");
  };

  const updateUI = (state) => {
    // FIX #5: limpiar selección si el filtro cambió
    if (lastActiveFilter !== null && lastActiveFilter !== state.activeFilter) {
      clearSelection();
    }
    lastActiveFilter = state.activeFilter;

    // 1. Ocultar/Mostrar Saldos Globales
    toggleVisibilityBtn.innerHTML = state.amountsVisible ? iconEye : iconEyeOff;
    const currentBalance = parseFloat(
      state.currentSupplier?.balance ?? supplier.balance ?? 0,
    );

    debtValueDisplay.textContent = SupplierModel.formatAmount(
      currentBalance,
      state.amountsVisible,
    );
    settleTotalBtn.style.display = currentBalance > 0 ? "flex" : "none";

    updateSnackbar(state.amountsVisible);

    // 2. Renderizar Píldoras de Filtro
    const renderFilterPill = (label, filterValue) => {
      const isActive = state.activeFilter === filterValue;
      return el(
        "button",
        {
          className: `filter-pill ${isActive ? "active" : ""}`,
          onclick: () => supplierStore.setFilter(filterValue),
        },
        label,
      );
    };

    filtersBar.innerHTML = "";
    filtersBar.appendChild(renderFilterPill("Todos", UI_FILTERS.ALL));
    filtersBar.appendChild(renderFilterPill("Boletas", UI_FILTERS.INVOICES));
    filtersBar.appendChild(renderFilterPill("Pagos", UI_FILTERS.PAYMENTS));
    filtersBar.appendChild(renderFilterPill("Notas", UI_FILTERS.NOTES));

    // 3. Filtrar Movimientos usando las constantes
    const filteredMovements = state.transactions.filter((m) => {
      if (state.activeFilter === UI_FILTERS.ALL) return true;
      const t = (m.type || "").toLowerCase();

      if (state.activeFilter === UI_FILTERS.INVOICES)
        return TRANSACTION_GROUPS.DEBTS.includes(t);
      if (state.activeFilter === UI_FILTERS.PAYMENTS)
        return TRANSACTION_GROUPS.PAYMENTS.includes(t);
      if (state.activeFilter === UI_FILTERS.NOTES)
        return TRANSACTION_GROUPS.NOTES.includes(t);
      return true;
    });

    // 4. Calcular Stock e Items (La lógica matemática que tenías)
    let runningStock = {};
    if (supplier.type === "stock") {
      filteredMovements.forEach((m) => {
        if (m.items && Array.isArray(m.items)) {
          const isEntry = TRANSACTION_GROUPS.DEBTS.includes(
            (m.type || "").toLowerCase(),
          );
          const isExit = TRANSACTION_GROUPS.PAYMENTS.includes(
            (m.type || "").toLowerCase(),
          );
          m.items.forEach((i) => {
            const name = i.name.trim().toUpperCase();
            const qty = parseFloat(i.quantity || 0);
            if (!runningStock[name]) runningStock[name] = 0;
            if (isEntry) runningStock[name] += qty;
            else if (isExit) runningStock[name] -= qty;
          });
        }
      });
    }

    const movementsWithBalance = filteredMovements.map((m) => {
      let snapshotStock = null;
      let enrichedItems = m.items || [];

      if (supplier.type === "stock") {
        snapshotStock = { ...runningStock };
        if (m.items && Array.isArray(m.items)) {
          const isEntry = TRANSACTION_GROUPS.DEBTS.includes(
            (m.type || "").toLowerCase(),
          );
          const isExit = TRANSACTION_GROUPS.PAYMENTS.includes(
            (m.type || "").toLowerCase(),
          );

          enrichedItems = m.items.map((item) => {
            const finalColor = item.color || findColorInSettings(item.name);
            return { ...item, color: finalColor };
          });

          m.items.forEach((i) => {
            const name = i.name.trim().toUpperCase();
            const qty = parseFloat(i.quantity || 0);
            if (runningStock[name] !== undefined) {
              if (isEntry) runningStock[name] -= qty;
              else if (isExit) runningStock[name] += qty;
            }
          });
        }
      }

      return {
        ...m,
        items: enrichedItems,
        partialBalance: m.partialBalance, // El balance lo calcula ahora el TransactionCalculator
        stockBalance: snapshotStock,
      };
    });

    // 5. Renderizar Lista y Panel de Stock
    contentContainer.innerHTML = "";
    const listComponent = MovementList({
      movements: movementsWithBalance,
      isVisible: state.amountsVisible,
      onEdit: onEditMovement,
      onDelete: onDeleteMovement,
      isStockView: supplier.type === "stock",
      onSelectionChange: handleSelection,
      onToggleStatus: onToggleStatus,
      onRepeat: onRepeatMovement,
      onEditDescription: onEditDescription,
    });

    if (supplier.type === "stock" && movementsWithBalance.length > 0) {
      const gridLayout = el("div", { className: "detail-grid-layout" });
      const stockPanel = StockStatsPanel({ movements: movementsWithBalance });
      if (stockPanel) gridLayout.appendChild(stockPanel);
      const listWrapper = el(
        "div",
        { className: "grid-list-column" },
        listComponent,
      );
      gridLayout.appendChild(listWrapper);
      contentContainer.appendChild(gridLayout);
    } else {
      contentContainer.appendChild(listComponent);
    }
  };

  // =========================================================
  // SUSCRIPCIÓN Y MONTAJE
  // =========================================================

  const view = el("div", { className: "supplier-detail-view" }, [
    headerPanel,
    filtersBar,
    contentContainer,
    snackbar,
  ]);

  const unsubscribe = supplierStore.subscribe(updateUI);
  updateUI(supplierStore.getState());

  view.destroy = () => {
    unsubscribe();
  };

  // Dummy updateState for backward compatibility with router
  view.updateState = () => {};

  return view;
}
