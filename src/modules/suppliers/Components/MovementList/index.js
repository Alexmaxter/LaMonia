import { el } from "../../../../core/dom.js";
import { SupplierModel } from "../../model.js";
import "./style.css";

// Helper para formato fecha "17 ENE 26"
const formatDateStyled = (dateObj) => {
  const day = dateObj.getDate().toString();
  const month = dateObj
    .toLocaleDateString("es-AR", { month: "short" })
    .toUpperCase()
    .replace(".", "");
  const year = dateObj.getFullYear().toString().slice(-2);
  return { day, monthYear: `${month} ${year}` };
};

export function MovementList({
  movements,
  isVisible,
  onDelete,
  onEdit,
  showSupplierName = false,
  isStockView = false,
  groupByDay = false, // <--- NUEVO FLAG: Activa el modo "Actividad"
}) {
  const iconTrash = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
  const typeLabels = { invoice: "BOLETA", payment: "PAGO", credit: "NOTA" };

  // --- FUNCIÓN INTERNA PARA CREAR TARJETAS (Reutilizable) ---
  const renderCard = (m) => {
    const date = m.date?.seconds
      ? new Date(m.date.seconds * 1000)
      : new Date(m.date);
    const typeClass = `type-${m.type || "invoice"}`;
    const isDebt = m.type === "invoice";

    // Formato fecha para la tarjeta (solo visible en modo lista simple)
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear().toString().slice(-2);

    const rawDesc = m.description || m.concept || "";
    const hasDesc = rawDesc.trim().length > 0;
    const amountVal = parseFloat(m.amount) || 0;
    const shouldShowMoney = !isStockView || amountVal > 0.01;

    // --- PILLS (ITEMS CON COLOR) ---
    let itemsPills = null;
    if (m.items && Array.isArray(m.items) && m.items.length > 0) {
      itemsPills = el(
        "div",
        { className: "items-pills-row" },
        m.items.map((item) => {
          const itemName = item.name.toUpperCase();
          const itemColor = item.color || "#ffffff";

          let balanceBadge = null;
          if (
            isStockView &&
            m.stockBalance &&
            m.stockBalance[itemName] !== undefined
          ) {
            const bal = m.stockBalance[itemName];
            if (bal > 0.1)
              balanceBadge = el(
                "span",
                { className: "pill-balance" },
                `(S: ${bal})`,
              );
          }

          return el(
            "span",
            {
              className: "tech-item-pill",
              style: `background-color: ${itemColor};`,
            },
            [
              el("span", { className: "pill-name" }, itemName),
              el("span", { className: "pill-qty" }, item.quantity),
              balanceBadge,
            ],
          );
        }),
      );
    }

    // --- RENDER CARD ---
    return el(
      "div",
      {
        className: `tech-movement-card ${typeClass}`,
        onclick: () => onEdit && onEdit(m),
      },
      [
        el("div", { className: "mov-status-bar" }),
        el("div", { className: "mov-content" }, [
          // FECHA: Solo se muestra si NO estamos agrupando por día (Modo Detalle)
          !groupByDay
            ? el("div", { className: "mov-date-col" }, [
                el("span", { className: "date-day" }, day),
                el("span", { className: "date-month" }, `${month}.${year}`),
              ])
            : null,

          // INFO PRINCIPAL
          el("div", { className: "mov-info-col" }, [
            el("div", { className: "info-row-primary" }, [
              el(
                "span",
                { className: "type-badge" },
                typeLabels[m.type] || "MOV",
              ),

              showSupplierName && m.supplierName
                ? el(
                    "span",
                    { className: "supplier-name-bold" },
                    m.supplierName.toUpperCase(),
                  )
                : null,

              itemsPills
                ? itemsPills
                : hasDesc
                  ? el("span", { className: "desc-text" }, rawDesc)
                  : null,
            ]),

            (itemsPills && hasDesc) ||
            (showSupplierName && hasDesc && !itemsPills)
              ? el("div", { className: "desc-subtext" }, rawDesc)
              : null,
          ]),

          // DINERO
          el("div", { className: "mov-money-col" }, [
            shouldShowMoney
              ? el(
                  "span",
                  {
                    className: `amount-main ${isDebt ? "val-invoice" : "val-payment"}`,
                  },
                  SupplierModel.formatAmount(m.amount, isVisible),
                )
              : el("span", { className: "amount-placeholder" }, "-"),

            shouldShowMoney && m.partialBalance !== undefined
              ? el("div", { className: "balance-partial" }, [
                  el("span", { className: "balance-label" }, "$$:"),
                  el(
                    "span",
                    {},
                    SupplierModel.formatAmount(m.partialBalance, isVisible),
                  ),
                ])
              : null,
          ]),

          el("button", {
            className: "btn-row-del",
            onclick: (e) => {
              e.stopPropagation();
              onDelete && onDelete(m);
            },
            innerHTML: iconTrash,
          }),
        ]),
      ],
    );
  };

  // --- LOGICA PRINCIPAL ---

  if (!movements || movements.length === 0) {
    return el("div", { className: "empty-state-flat" }, "SIN MOVIMIENTOS");
  }

  // MODO A: AGRUPADO POR DÍA (Para SupplierListView)
  if (groupByDay) {
    const groupedByDay = {};
    movements.forEach((m) => {
      const date = m.date?.seconds
        ? new Date(m.date.seconds * 1000)
        : new Date(m.date);
      const key = date.toISOString().split("T")[0];
      if (!groupedByDay[key]) {
        groupedByDay[key] = { dateObj: date, items: [], dayDebt: 0, dayPay: 0 };
      }
      const amt = parseFloat(m.amount) || 0;
      if (m.type === "invoice") groupedByDay[key].dayDebt += amt;
      else groupedByDay[key].dayPay += amt;
      groupedByDay[key].items.push(m);
    });

    const sortedDays = Object.values(groupedByDay).sort(
      (a, b) => b.dateObj - a.dateObj,
    );

    const dayBlocks = sortedDays.map((dayGroup) => {
      const { day, monthYear } = formatDateStyled(dayGroup.dateObj);
      const stickyHeader = el("div", { className: "day-sticky-header" }, [
        el("div", { className: "day-header-left" }, [
          el("span", { className: "header-day-num" }, day),
          el("span", { className: "header-month-year" }, monthYear),
        ]),
        el("div", { className: "day-header-right" }, [
          dayGroup.dayDebt > 0
            ? el(
                "span",
                { className: "mini-stat debt" },
                `-${SupplierModel.formatAmount(dayGroup.dayDebt, isVisible)}`,
              )
            : null,
          dayGroup.dayPay > 0
            ? el(
                "span",
                { className: "mini-stat pay" },
                `+${SupplierModel.formatAmount(dayGroup.dayPay, isVisible)}`,
              )
            : null,
        ]),
      ]);
      const cards = dayGroup.items.map((m) => renderCard(m));
      return el("div", { className: "day-block-group" }, [
        stickyHeader,
        el("div", { className: "day-cards-stack" }, cards),
      ]);
    });

    return el("div", { className: "movements-timeline-container" }, dayBlocks);
  }

  // MODO B: LISTA PLANA (Para SupplierDetailView - Comportamiento Original)
  // Simplemente mapeamos las tarjetas en una pila vertical
  return el("div", { className: "movements-block-container" }, [
    el(
      "div",
      { className: "movements-list-stack" },
      movements.map((m) => renderCard(m)),
    ),
  ]);
}
