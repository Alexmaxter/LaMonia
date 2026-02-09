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
  onSettleDebt, // <--- NUEVA PROP RECIBIDA
}) {
  let isVisible = initialIsVisible;
  let debtValueDisplay = null;

  // --- ICONOS ---
  const iconBack = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`;
  const iconEye = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  const iconEyeOff = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
  const iconSettings = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;
  const iconPlus = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
  const iconFile = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
  const iconCopy = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="0" ry="0"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
  const iconCheck = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`; // Icono nuevo

  // --- HANDLERS ---
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
    renderList();
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

  // --- HELPER DE COLOR (RETROCOMPATIBILIDAD) ---
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

  // --- 1. CALCULADORA DE SALDOS ---
  let runningBalance = parseFloat(supplier.balance) || 0;
  let runningStock = {};

  // Calcular stock actual total
  if (supplier.type === "stock") {
    movements.forEach((m) => {
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

  // --- MAPEO DE MOVIMIENTOS CON COLOR INYECTADO ---
  const movementsWithBalance = movements.map((m) => {
    // 1. Dinero
    const snapshotBalance = runningBalance;
    const amount = parseFloat(m.amount) || 0;
    if (m.type === "invoice") runningBalance -= amount;
    else runningBalance += amount;

    // 2. Stock y Colores
    let snapshotStock = null;
    let enrichedItems = []; // Items con color asegurado

    if (supplier.type === "stock") {
      snapshotStock = { ...runningStock };

      if (m.items && Array.isArray(m.items)) {
        const isEntry = m.type === "invoice";
        const isExit = m.type === "payment" || m.type === "credit";

        enrichedItems = m.items.map((item) => {
          // Si el item ya tiene color (nuevo), lo usa. Si no (viejo), lo busca en settings.
          const finalColor = item.color || findColorInSettings(item.name);
          return { ...item, color: finalColor };
        });

        // Revertir historial
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
      // Si no es stock, igual preservamos items si hubiera
      enrichedItems = m.items || [];
    }

    return {
      ...m,
      items: enrichedItems, // Pasamos items enriquecidos con color
      partialBalance: snapshotBalance,
      stockBalance: snapshotStock,
    };
  });

  // --- UI COMPONENTS ---
  debtValueDisplay = el(
    "div",
    { className: "header-debt-value" },
    SupplierModel.formatAmount(supplier.balance, isVisible),
  );

  // BOTÓN SALDAR DEUDA (NUEVO)
  const isDebt = supplier.balance > 0;
  const settleBtn = isDebt
    ? el(
        "button",
        {
          className: "btn-settle-mini", // Definir esta clase en CSS
          style:
            "margin-left: 10px; padding: 4px 8px; font-size: 0.75rem; background: #000; color: #fff; border: 1px solid #000; cursor: pointer; display: flex; align-items: center; gap: 4px; text-transform: uppercase; font-weight: 700;",
          onclick: (e) => {
            e.stopPropagation();
            if (onSettleDebt) onSettleDebt();
          },
        },
        [el("span", { innerHTML: iconCheck }), "SALDAR"],
      )
    : null;

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
        // Contenedor flexible para saldo y botón
        el("div", { style: "display: flex; align-items: center;" }, [
          debtValueDisplay,
          settleBtn, // Insertamos el botón aquí
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

  const contentContainer = el("div", { className: "detail-content-wrapper" });

  const renderList = () => {
    contentContainer.innerHTML = "";
    if (supplier.type === "stock" && movementsWithBalance.length > 0) {
      const stockPanel = StockStatsPanel({ movements: movementsWithBalance });
      if (stockPanel) contentContainer.appendChild(stockPanel);
    }

    contentContainer.appendChild(
      MovementList({
        movements: movementsWithBalance,
        isVisible,
        onEdit: onEditMovement,
        onDelete: onDeleteMovement,
        isStockView: supplier.type === "stock",
      }),
    );
  };

  renderList();

  return el("div", { className: "supplier-detail-view" }, [
    headerPanel,
    contentContainer,
  ]);
}
