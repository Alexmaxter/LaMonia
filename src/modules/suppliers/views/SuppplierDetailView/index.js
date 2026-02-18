import { el } from "../../../../core/dom.js";
import { SupplierModel } from "../../model.js";
import { MovementList } from "../../Components/MovementList/index.js";
import { StockStatsPanel } from "../../Components/StockStatskPanel/index.js";
import "./style.css";

export function SupplierDetailView({
  supplier,
  movements,
  isVisible: initialIsVisible,
  onGenerateReport,
  onBack,
  onToggleVisibility,
  onAddMovement,
  onEditMovement,
  onDeleteMovement,
  onOpenSettings,
  onSettleDebt,
  onToggleStatus,

  // Nuevos Props para Filtros
  onFilterChange,
  currentFilter = "all",
}) {
  let isVisible = initialIsVisible;

  // Elementos DOM
  let debtValueDisplay = null;
  let contentContainer = el("div", { className: "detail-content-wrapper" });
  let filtersBar = null; // Referencia para actualizar clases activa

  // --- ESTADO DE SELECCIÓN ---
  const selectedInvoices = new Set();
  let selectedTotal = 0;

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

  const updateSnackbar = () => {
    if (selectedInvoices.size > 0) {
      snackbar.classList.add("active");
      snackbarCount.textContent = `${selectedInvoices.size} SELECCIONADO${selectedInvoices.size > 1 ? "S" : ""}`;
      snackbarTotal.textContent = SupplierModel.formatAmount(
        selectedTotal,
        true,
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
    updateSnackbar();
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

  // --- LÓGICA DE RENDERIZADO ---
  const recalculateAndRender = (currentMovements, currentBalance) => {
    let runningBalance = parseFloat(currentBalance) || 0;
    let runningStock = {};

    // 1. Cálculo de Stock (Independiente del Ledger Monetario)
    if (supplier.type === "stock") {
      currentMovements.forEach((m) => {
        if (m.items && Array.isArray(m.items)) {
          const isEntry = m.type === "invoice";
          const isExit = m.type === "payment" || m.type === "credit";
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

    // 2. Mapeo de Movimientos
    const movementsWithBalance = currentMovements.map((m) => {
      // FIX CLAVE: Si ya viene con el saldo Ledger (partialBalance) del Controller, USARLO.
      // Si no, usar la lógica antigua (runningBalance).
      // Esto permite que al filtrar, el saldo visual no se rompa.
      let snapshotBalance = 0;

      if (m.partialBalance !== undefined && m.partialBalance !== null) {
        snapshotBalance = m.partialBalance;
        // Si estamos en modo fallback, actualizamos runningBalance solo como referencia
        // pero NO afectamos el renderizado final
      } else {
        // Lógica Fallback (Solo si no hay Ledger)
        snapshotBalance = runningBalance;
        const amount = parseFloat(m.amount) || 0;
        if (m.type === "invoice") runningBalance -= amount;
        else runningBalance += amount;
      }

      let snapshotStock = null;
      let enrichedItems = [];

      if (supplier.type === "stock") {
        snapshotStock = { ...runningStock };
        if (m.items && Array.isArray(m.items)) {
          const isEntry = m.type === "invoice";
          const isExit = m.type === "payment" || m.type === "credit";

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
      } else {
        enrichedItems = m.items || [];
      }

      return {
        ...m,
        items: enrichedItems,
        partialBalance: snapshotBalance, // Usamos el valor seguro
        stockBalance: snapshotStock,
      };
    });

    contentContainer.innerHTML = "";

    const listComponent = MovementList({
      movements: movementsWithBalance,
      isVisible,
      onEdit: onEditMovement,
      onDelete: onDeleteMovement,
      isStockView: supplier.type === "stock",
      onSelectionChange: handleSelection,
      onToggleStatus: onToggleStatus,
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

    return movementsWithBalance;
  };

  const handleToggle = (e) => {
    const newState = onToggleVisibility();
    isVisible = newState;
    if (e && e.currentTarget)
      e.currentTarget.innerHTML = newState ? iconEye : iconEyeOff;
    if (debtValueDisplay) {
      debtValueDisplay.textContent = SupplierModel.formatAmount(
        supplier.balance,
        isVisible,
      );
    }
    recalculateAndRender(movements, supplier.balance);
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

  // --- UI HEADER ---
  debtValueDisplay = el(
    "div",
    { className: "header-debt-value" },
    SupplierModel.formatAmount(supplier.balance, isVisible),
  );

  const isDebt = supplier.balance > 0;
  const settleTotalBtn = el(
    "button",
    {
      className: "btn-settle-mini",
      style: `margin-left: 10px; padding: 4px 8px; font-size: 0.75rem; background: #000; color: #fff; border: 1px solid #000; cursor: pointer; display: flex; align-items: center; gap: 4px; text-transform: uppercase; font-weight: 700; display: ${isDebt ? "flex" : "none"}`,
      onclick: (e) => {
        e.stopPropagation();
        if (onSettleDebt) onSettleDebt(null, "Cancelación total");
      },
    },
    [el("span", { innerHTML: iconCheck }), "SALDAR TOTAL"],
  );

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
          el("button", {
            className: "btn-icon-toggle",
            onclick: handleToggle,
            innerHTML: isVisible ? iconEye : iconEyeOff,
          }),
        ]),
        el("div", { style: "display: flex; align-items: center;" }, [
          debtValueDisplay,
          settleTotalBtn,
        ]),
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
            onclick: onOpenSettings,
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

  // --- NUEVO: BARRA DE FILTROS ---
  const renderFilterPill = (label, value) => {
    const isActive = currentFilter === value;
    return el(
      "button",
      {
        className: `filter-pill ${isActive ? "active" : ""}`,
        onclick: () => onFilterChange && onFilterChange(value),
      },
      label,
    );
  };

  filtersBar = el("div", { className: "filters-bar" }, [
    renderFilterPill("Todos", "all"),
    renderFilterPill("Boletas", "invoice"),
    renderFilterPill("Pagos", "payment"),
    renderFilterPill("Notas", "note"),
  ]);

  // Ejecución Inicial
  recalculateAndRender(movements, supplier.balance);

  const view = el("div", { className: "supplier-detail-view" }, [
    headerPanel,
    filtersBar, // <-- Insertamos la barra aquí
    contentContainer,
    snackbar,
  ]);

  // Actualización desde el Controller
  view.updateState = (newBalance, newMovements, newFilter) => {
    supplier.balance = newBalance;
    movements = newMovements;

    // Actualizar Saldo Header
    debtValueDisplay.textContent = SupplierModel.formatAmount(
      newBalance,
      isVisible,
    );
    settleTotalBtn.style.display = newBalance > 0 ? "flex" : "none";

    // Actualizar Filtros Activos
    if (newFilter) {
      currentFilter = newFilter;
      // Re-renderizamos los botones para mover la clase 'active'
      filtersBar.innerHTML = "";
      filtersBar.appendChild(renderFilterPill("Todos", "all"));
      filtersBar.appendChild(renderFilterPill("Boletas", "invoice"));
      filtersBar.appendChild(renderFilterPill("Pagos", "payment"));
      filtersBar.appendChild(renderFilterPill("Notas", "note"));
    }

    // Reset selección
    selectedInvoices.clear();
    selectedTotal = 0;
    updateSnackbar();

    // Re-renderizar lista
    recalculateAndRender(newMovements, newBalance);
  };

  return view;
}
