import { el } from "../../../../core/dom.js";
import { SupplierModel } from "../../model.js";
import "./style.css";

export function MovementList({
  movements,
  isVisible,
  onDelete, // Corregido: Coincide con lo que envía SupplierDetailView
  onEdit, // Corregido: Coincide con lo que envía SupplierDetailView
}) {
  // --- ICONOS ---
  const icons = {
    invoice: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
    payment: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="0"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>`,
    credit: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="15" x2="15" y2="15"></line></svg>`,
    trash: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
  };

  const typeLabels = {
    invoice: "BOLETA",
    payment: "PAGO",
    credit: "NOTA CRÉDITO",
  };

  return el("div", { className: "movements-block-container" }, [
    // Header
    el("div", { className: "block-header" }, [
      el("span", { className: "block-title" }, "HISTORIAL DE MOVIMIENTOS"),
      el("span", { className: "block-count" }, `${movements.length}`),
    ]),

    // Lista
    el(
      "div",
      { className: "movements-list-stack" },
      movements.length > 0
        ? movements.map((m) => {
            const date = m.date?.seconds
              ? new Date(m.date.seconds * 1000)
              : new Date(m.date);

            // Clase base según tipo
            const cardClass =
              m.type === "invoice"
                ? "card-invoice"
                : m.type === "payment"
                  ? "card-payment"
                  : "card-credit";

            // Formato de Fecha: Día y Mes (3 letras)
            const day = date.getDate();
            const month = date
              .toLocaleString("es-AR", { month: "short" })
              .toUpperCase()
              .replace(".", "");

            return el(
              "div",
              {
                className: `flat-data-card ${cardClass}`,
                onclick: () => onEdit && onEdit(m), // Fix del click
              },
              [
                // 1. GRUPO IZQUIERDO: Icono + Calendario
                el("div", { className: "card-left-group" }, [
                  el(
                    "div",
                    { className: "icon-circle" },
                    el("span", { innerHTML: icons[m.type] || icons.invoice }),
                  ),
                  // Calendario Rectangular (Día Grande | Mes Derecha)
                  el("div", { className: "calendar-badge" }, [
                    el("span", { className: "cal-day" }, day),
                    el("span", { className: "cal-month" }, month),
                  ]),
                ]),

                // 2. CENTRO: Tipo y Concepto
                el("div", { className: "card-info-col" }, [
                  el("div", { className: "info-top-row" }, [
                    el(
                      "span",
                      { className: "info-type-tag" },
                      typeLabels[m.type] || "MOVIMIENTO",
                    ),
                  ]),

                  el(
                    "span",
                    { className: "info-concept-text" },
                    m.concept || "Sin descripción",
                  ),

                  // Items (si existen)
                  m.items && m.items.length > 0
                    ? el(
                        "div",
                        { className: "info-items-row" },
                        m.items.map((i) =>
                          el(
                            "span",
                            { className: "item-pill" },
                            `${i.quantity}x ${i.name}`,
                          ),
                        ),
                      )
                    : null,
                ]),

                // 3. DERECHA: Valor y Acción (En fila)
                el("div", { className: "card-value-col" }, [
                  el(
                    "span",
                    { className: "value-text" },
                    SupplierModel.formatAmount(m.amount, isVisible),
                  ),
                  el(
                    "button",
                    {
                      className: "btn-card-del",
                      title: "Eliminar",
                      onclick: (e) => {
                        e.stopPropagation(); // Evita abrir edición
                        onDelete && onDelete(m);
                      },
                    },
                    el("span", { innerHTML: icons.trash }),
                  ),
                ]),
              ],
            );
          })
        : el(
            "div",
            { className: "empty-state-flat" },
            "NO HAY MOVIMIENTOS REGISTRADOS",
          ),
    ),
  ]);
}
