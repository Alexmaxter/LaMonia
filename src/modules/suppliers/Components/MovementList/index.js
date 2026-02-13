import { el } from "../../../../core/dom.js";
import { SupplierModel } from "../../model.js";
import "./style.css";

// Helper para formato fecha
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
  groupByDay = false,
  onSelectionChange,
  onToggleStatus, // <--- Función para cambiar estado (badge)
}) {
  const iconTrash = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
  const iconCheck = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  const typeLabels = { invoice: "BOLETA", payment: "PAGO", credit: "NOTA" };

  const renderCard = (m) => {
    const date = m.date?.seconds
      ? new Date(m.date.seconds * 1000)
      : new Date(m.date);
    const typeClass = `type-${m.type || "invoice"}`;
    const isDebt = m.type === "invoice" || m.type === "boleta";

    // --- LÓGICA DE ESTADO ---
    const status = m.status || "pending";
    const isPaid = status === "paid";
    const isPartial = status === "partial";

    // Cálculos para parciales
    const totalAmount = parseFloat(m.amount || 0);
    const paidAmount = parseFloat(m.paidAmount || 0);
    const remaining = totalAmount - paidAmount;

    // --- 1. COLUMNA SELECCIÓN (Checkbox para Lotes) ---
    const selectionElement = isDebt
      ? el(
          "div",
          {
            className: "selection-col",
            onclick: (e) => {
              e.stopPropagation();
              const card = e.currentTarget.closest(".tech-movement-card");
              const isSelected = card.classList.toggle("row-selected");

              // Si seleccionamos para pagar, calculamos cuánto falta
              // Si ya está visualmente pagada, el monto a pagar financiero es 0 (o lo que decida el controller)
              // Pero aquí enviamos la data cruda.
              const amountToPay = isPaid
                ? 0
                : isPartial
                  ? remaining
                  : totalAmount;

              if (onSelectionChange) {
                onSelectionChange(m.id, amountToPay, isSelected);
              }
            },
          },
          [
            el(
              "div",
              { className: "select-square" },
              el("span", { innerHTML: iconCheck }),
            ),
          ],
        )
      : null;

    // --- 2. BADGE INTERACTIVO (Conciliación Visual) ---
    const statusBadgeElement = isDebt
      ? el(
          "button",
          {
            // Clases dinámicas para colores (Rojo, Amarillo, Verde)
            className: `status-btn-badge ${isPaid ? "is-paid" : isPartial ? "is-partial" : "is-pending"}`,
            title: isPaid
              ? "Click para marcar como PENDIENTE"
              : "Click para marcar como PAGADA (Visual)",
            onclick: (e) => {
              e.stopPropagation(); // Evita abrir el modal de edición
              if (onToggleStatus) onToggleStatus(m);
            },
          },
          // Texto del botón
          isPaid ? "PAGADO" : isPartial ? "PARCIAL" : "PEND",
        )
      : null;

    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear().toString().slice(-2);
    const rawDesc = m.description || m.concept || "";
    const hasDesc = rawDesc.trim().length > 0;
    const amountVal = parseFloat(m.amount) || 0;
    const shouldShowMoney = !isStockView || amountVal > 0.01;

    let itemsPills = null;
    if (m.items && Array.isArray(m.items) && m.items.length > 0) {
      itemsPills = el(
        "div",
        { className: "items-pills-row" },
        m.items.map((item) => {
          let balanceBadge = null;
          if (
            isStockView &&
            m.stockBalance &&
            m.stockBalance[item.name.toUpperCase()] !== undefined
          ) {
            const bal = m.stockBalance[item.name.toUpperCase()];
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
              style: `background-color: ${item.color || "#fff"};`,
            },
            [
              el("span", { className: "pill-name" }, item.name.toUpperCase()),
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
        className: `tech-movement-card ${typeClass} ${isPaid ? "card-paid" : ""}`,
        onclick: () => onEdit && onEdit(m),
      },
      [
        // Barra lateral de color (Tipo)
        el("div", { className: "mov-status-bar" }),

        // Checkbox selección
        selectionElement,

        // Contenido Principal
        el("div", { className: "mov-content" }, [
          !groupByDay
            ? el("div", { className: "mov-date-col" }, [
                el("span", { className: "date-day" }, day),
                el("span", { className: "date-month" }, `${month}.${year}`),
              ])
            : null,

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
                    m.supplierName,
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

          // Columna Dinero
          el("div", { className: "mov-money-col" }, [
            shouldShowMoney
              ? el(
                  "span",
                  {
                    className: `amount-main ${isDebt ? "val-invoice" : "val-payment"}`,
                    // Tachado visual si está pagada
                    style: isPaid
                      ? "text-decoration: line-through; opacity: 0.5;"
                      : "",
                  },
                  SupplierModel.formatAmount(m.amount, isVisible),
                )
              : el("span", { className: "amount-placeholder" }, "-"),

            // Badge informativo de "Resta pagar" (solo visual)
            isDebt && isPartial && remaining > 0
              ? el(
                  "span",
                  { className: "badge-partial-status" },
                  `RESTA: $${remaining.toLocaleString()}`,
                )
              : null,

            shouldShowMoney && m.partialBalance !== undefined
              ? el("div", { className: "balance-partial" }, [
                  el("span", { className: "balance-label" }, "Saldo: "),
                  el(
                    "span",
                    {},
                    SupplierModel.formatAmount(m.partialBalance, isVisible),
                  ),
                ])
              : null,
          ]),

          // Columna Acciones (Badge Estado + Borrar)
          el(
            "div",
            {
              className: "actions-col",
              style:
                "display:flex; flex-direction:column; align-items:center; gap:8px; margin-left:8px;",
            },
            [
              statusBadgeElement, // <--- EL BOTÓN DE ESTADO (PEND/PARCIAL/PAGADO)
              el("button", {
                className: "btn-row-del",
                onclick: (e) => {
                  e.stopPropagation();
                  onDelete && onDelete(m);
                },
                innerHTML: iconTrash,
              }),
            ],
          ),
        ]),
      ],
    );
  };

  if (!movements || movements.length === 0)
    return el("div", { className: "empty-state-flat" }, "SIN MOVIMIENTOS");

  if (groupByDay) {
    const groupedByDay = {};
    movements.forEach((m) => {
      const d = m.date?.seconds
        ? new Date(m.date.seconds * 1000)
        : new Date(m.date);
      const k = d.toISOString().split("T")[0];
      if (!groupedByDay[k])
        groupedByDay[k] = { date: d, items: [], debt: 0, pay: 0 };
      const amt = parseFloat(m.amount) || 0;
      if (m.type === "invoice") groupedByDay[k].debt += amt;
      else groupedByDay[k].pay += amt;
      groupedByDay[k].items.push(m);
    });

    return el(
      "div",
      { className: "movements-timeline-container" },
      Object.values(groupedByDay)
        .sort((a, b) => b.date - a.date)
        .map((g) => {
          const { day, monthYear } = formatDateStyled(g.date);
          return el("div", { className: "day-block-group" }, [
            el("div", { className: "day-sticky-header" }, [
              el("div", { className: "day-header-left" }, [
                el("span", { className: "header-day-num" }, day),
                el("span", { className: "header-month-year" }, monthYear),
              ]),
              el("div", { className: "day-header-right" }, [
                g.debt > 0
                  ? el(
                      "span",
                      { className: "mini-stat debt" },
                      `-${SupplierModel.formatAmount(g.debt, isVisible)}`,
                    )
                  : null,
              ]),
            ]),
            el(
              "div",
              { className: "day-cards-stack" },
              g.items.map((m) => renderCard(m)),
            ),
          ]);
        }),
    );
  }

  return el("div", { className: "movements-block-container" }, [
    el(
      "div",
      { className: "movements-list-stack" },
      movements.map((m) => renderCard(m)),
    ),
  ]);
}
