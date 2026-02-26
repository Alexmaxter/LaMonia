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
  onToggleStatus,
  selectedIds = new Set(),
  onRepeat,
  onEditDescription,
}) {
  const iconTrash = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
  const iconCheck = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  const iconRepeat = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>`;

  const typeLabels = {
    invoice: "BOLETA",
    boleta: "BOLETA",
    purchase: "COMPRA",
    compra: "COMPRA",
    payment: "PAGO",
    credit: "NOTA",
  };

  // =========================================================
  // FIX #7: DOBLE EDICIÓN INLINE
  //
  // PROBLEMAS ORIGINALES:
  //   A) Race condition: doble click en descripción A abre input,
  //      doble click en B abre otro. El onblur de A dispara
  //      onEditDescription(A) pisando la edición de B.
  //
  //   B) Tab/click fuera guarda pero el DOM se reconstruye vía
  //      loadDetailData antes de que el usuario vea el nuevo valor,
  //      causando un "parpadeo" de la descripción.
  //
  // SOLUCIÓN:
  //   - `activeEdit` es un objeto compartido en el closure de
  //     MovementList que trackea qué input está abierto y cómo
  //     cancelarlo. Si el usuario abre otro, el primero se cancela
  //     (sin guardar) antes de abrir el nuevo.
  //   - onblur verifica si el foco va a otro input de descripción
  //     (via relatedTarget.dataset.editId) — si es así, cancela
  //     en lugar de guardar.
  //   - Actualización optimista: el span muestra el nuevo valor
  //     inmediatamente, sin esperar a que Firebase responda y
  //     reconstruya la lista.
  // =========================================================
  const activeEdit = { id: null, cancel: null };

  const createEditableDesc = (m, rawDesc) => {
    // currentDesc trackea el valor más reciente guardado,
    // así el modal siempre recibe el valor correcto aunque
    // no se haya recargado la lista desde Firebase.
    let currentDesc = rawDesc;

    const makeSpan = (text) => {
      const span = el(
        "span",
        {
          className: `desc-text${onEditDescription ? " editable-desc" : ""}`,
          title: onEditDescription ? "Doble click para editar" : "",
        },
        text,
      );

      if (!onEditDescription) return span;

      // Detener propagación en click simple para que el doble click
      // no dispare dos veces el onclick de la card (que abre el modal)
      span.onclick = (e) => e.stopPropagation();

      span.ondblclick = (e) => {
        e.stopPropagation();

        // Si hay otro input activo, cancelarlo primero
        if (activeEdit.id !== null && activeEdit.id !== m.id) {
          activeEdit.cancel?.();
        }
        if (activeEdit.id === m.id) return;

        activeEdit.id = m.id;

        // --- WRAPPER: input + botones brutalistas ---
        const wrapper = document.createElement("div");
        wrapper.className = "desc-edit-wrapper";
        wrapper.dataset.editId = m.id;
        wrapper.style.cssText =
          "display:inline-flex;align-items:center;gap:4px;";

        const input = document.createElement("input");
        input.type = "text";
        input.value = currentDesc;
        input.className = "desc-inline-input";
        input.dataset.editId = m.id;

        const btnSave = document.createElement("button");
        btnSave.className = "desc-btn-save";
        btnSave.textContent = "✓";
        btnSave.title = "Guardar (Enter)";
        btnSave.type = "button";

        const btnCancel = document.createElement("button");
        btnCancel.className = "desc-btn-cancel";
        btnCancel.textContent = "✕";
        btnCancel.title = "Cancelar (Esc)";
        btnCancel.type = "button";

        wrapper.appendChild(input);
        wrapper.appendChild(btnSave);
        wrapper.appendChild(btnCancel);
        span.replaceWith(wrapper);
        input.focus();
        input.select();

        let done = false;

        const cancel = () => {
          if (done) return;
          done = true;
          activeEdit.id = null;
          activeEdit.cancel = null;
          wrapper.replaceWith(makeSpan(currentDesc));
        };

        const save = () => {
          if (done) return;
          done = true;
          activeEdit.id = null;
          activeEdit.cancel = null;

          const newVal = input.value.trim();
          const finalVal = newVal || currentDesc;

          // Actualización optimista con el valor nuevo
          wrapper.replaceWith(makeSpan(finalVal));

          if (newVal && newVal !== currentDesc) {
            currentDesc = newVal; // actualizar para futuras ediciones
            onEditDescription(m.id, newVal);
          }
        };

        activeEdit.cancel = cancel;

        btnSave.onclick = (ev) => {
          ev.stopPropagation();
          save();
        };
        btnCancel.onclick = (ev) => {
          ev.stopPropagation();
          cancel();
        };

        input.onblur = (ev) => {
          // Si el foco va a los botones del mismo wrapper, no hacer nada
          const rt = ev.relatedTarget;
          if (rt && wrapper.contains(rt)) return;
          // Si el foco va a otro input de descripción, cancelar
          if (rt?.dataset?.editId) {
            cancel();
            return;
          }
          save();
        };

        input.onkeydown = (ev) => {
          if (ev.key === "Enter") {
            ev.preventDefault();
            save();
          }
          if (ev.key === "Escape") {
            ev.preventDefault();
            cancel();
          }
        };
      };

      return span;
    };

    return makeSpan(currentDesc);
  };

  const renderCard = (m) => {
    // Normalización de fechas
    let date;
    if (m.date && m.date.seconds) {
      date = new Date(m.date.seconds * 1000);
    } else if (m.date) {
      date = new Date(m.date);
    } else {
      date = new Date();
    }
    const type = (m.type || "").toLowerCase();
    const typeClass = `type-${type === "invoice" ? "invoice" : "payment"}`;
    const isDebt = ["invoice", "boleta", "purchase", "compra"].includes(type);
    const status = m.status || "pending";
    const isPaid = status === "paid";
    const isPartial = status === "partial";
    const totalAmount = parseFloat(m.amount || 0);
    const paidAmount = parseFloat(m.paidAmount || 0);
    const remaining = totalAmount - paidAmount;
    const isRowSelected = selectedIds.has(m.id);

    // --- COLUMNA SELECCIÓN ---
    const selectionElement =
      isDebt && !isPaid
        ? el(
            "div",
            {
              className: "selection-col",
              onclick: (e) => {
                e.stopPropagation();
                const card = e.currentTarget.closest(".tech-movement-card");
                const isNowSelected = card.classList.toggle("row-selected");
                const amountToPay = isPartial ? remaining : totalAmount;
                if (onSelectionChange) {
                  onSelectionChange(m.id, amountToPay, isNowSelected);
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

    // --- BADGE INTERACTIVO ---
    const statusBadgeElement = isDebt
      ? el(
          "button",
          {
            className: `status-btn-badge ${isPaid ? "is-paid" : isPartial ? "is-partial" : "is-pending"}`,
            title: isPaid
              ? "Click para marcar como PENDIENTE"
              : "Click para marcar como PAGADA",
            onclick: (e) => {
              e.stopPropagation();
              if (onToggleStatus) onToggleStatus(m);
            },
          },
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
    // FIX: card-paid solo si es una DEUDA pagada. Los pagos (payment) tienen
    // status="paid" por diseño pero NO deben verse como boletas pagadas.
    return el(
      "div",
      {
        className: `tech-movement-card ${typeClass} ${isDebt && isPaid ? "card-paid" : ""} ${isRowSelected ? "row-selected" : ""}`,
        onclick: () => onEdit && onEdit(m),
      },
      [
        el("div", { className: "mov-status-bar" }),
        selectionElement,
        el("div", { className: "mov-body" }, [
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
                  typeLabels[type] || "MOV",
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
                    ? createEditableDesc(m, rawDesc)
                    : null,
              ]),
              (itemsPills && hasDesc) ||
              (showSupplierName && hasDesc && !itemsPills)
                ? el("div", { className: "desc-subtext" }, rawDesc)
                : null,
            ]),
            el("div", { className: "mov-money-col" }, [
              shouldShowMoney
                ? el(
                    "span",
                    {
                      className: `amount-main ${isDebt ? "val-invoice" : "val-payment"}`,
                      // FIX: line-through y opacidad solo si es una DEUDA pagada,
                      // nunca en pagos aunque tengan status="paid"
                      style:
                        isDebt && isPaid
                          ? "text-decoration: line-through; opacity: 0.5;"
                          : "",
                    },
                    SupplierModel.formatAmount(m.amount, isVisible),
                  )
                : el("span", { className: "amount-placeholder" }, "-"),
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
          ]),
          el("div", { className: "actions-col" }, [
            statusBadgeElement,
            onRepeat
              ? el("button", {
                  className: "btn-row-repeat",
                  title: "Repetir movimiento",
                  onclick: (e) => {
                    e.stopPropagation();
                    onRepeat(m);
                  },
                  innerHTML: iconRepeat,
                })
              : null,
            el("button", {
              className: "btn-row-del",
              onclick: (e) => {
                e.stopPropagation();
                onDelete && onDelete(m);
              },
              innerHTML: iconTrash,
            }),
          ]),
        ]),
      ],
    );
  };

  if (!movements || movements.length === 0)
    return el("div", { className: "empty-state-flat" }, "SIN MOVIMIENTOS");

  if (groupByDay) {
    const groupedByDay = {};
    movements.forEach((m) => {
      let d;
      if (m.date && m.date.seconds) d = new Date(m.date.seconds * 1000);
      else if (m.date) d = new Date(m.date);
      else d = new Date();
      const k = d.toISOString().split("T")[0];
      if (!groupedByDay[k])
        groupedByDay[k] = { date: d, items: [], debt: 0, pay: 0 };
      const amt = parseFloat(m.amount) || 0;
      const t = (m.type || "").toLowerCase();
      if (["invoice", "boleta", "purchase", "compra"].includes(t))
        groupedByDay[k].debt += amt;
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
