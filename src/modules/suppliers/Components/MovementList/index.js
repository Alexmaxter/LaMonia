import { el } from "../../../../core/dom.js";
import { SupplierModel } from "../../model.js";
import "./style.css";

export function MovementList({
  movements,
  isVisible,
  onDeleteMovement,
  onEditMovement,
}) {
  // Diccionario de iconos SVG originales
  const icons = {
    invoice: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
    payment: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>`,
    credit: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="15" x2="15" y2="15"></line></svg>`,
    trash: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
  };

  const typeLabels = {
    invoice: "BOLETA",
    payment: "PAGO",
    credit: "N. CRÉDITO",
  };

  return el("div", { className: "movements-container" }, [
    el("h3", { className: "section-title" }, "HISTORIAL DE MOVIMIENTOS"),

    el(
      "div",
      { className: "movements-grid" },
      movements.length > 0
        ? movements.map((m) => {
            // Formateo de fecha
            const date = m.date?.seconds
              ? new Date(m.date.seconds * 1000)
              : new Date(m.date);
            const isDebt = m.type === "invoice";

            const day = date.getDate();
            const month = date
              .toLocaleString("es-AR", { month: "short" })
              .toUpperCase()
              .replace(".", "");
            const yearShort = date.getFullYear().toString().slice(-2);

            return el(
              "div",
              {
                className: "movement-card movement-card-clickable",
                onclick: () => onEditMovement(m),
              },
              [
                // --- GRUPO IZQUIERDO: ICONO + CALENDARIO ---
                el("div", { className: "mov-left-group" }, [
                  el("div", {
                    className: `mov-circle-icon ${
                      isDebt ? "bg-danger" : "bg-success"
                    }`,
                    innerHTML: icons[m.type] || icons.invoice,
                  }),
                  el("div", { className: "mov-calendar-square" }, [
                    el("span", { className: "cal-day" }, day),
                    el(
                      "span",
                      { className: "cal-month-year" },
                      `${month} ${yearShort}`
                    ),
                  ]),
                ]),

                // --- CENTRO: INFORMACIÓN DEL MOVIMIENTO + ITEMS DE STOCK ---
                el("div", { className: "mov-info-col" }, [
                  el(
                    "span",
                    { className: "mov-main-type" },
                    typeLabels[m.type]
                  ),
                  el(
                    "span",
                    { className: "mov-secondary-concept" },
                    m.concept || "Sin descripción"
                  ),

                  // LÓGICA DE ITEMS: Buscamos 'quantity' y 'name' que es como está en tu Firebase
                  m.items && m.items.length > 0
                    ? el(
                        "div",
                        { className: "mov-items-list" },
                        m.items.map((item) => {
                          const displayQty =
                            item.quantity !== undefined
                              ? item.quantity
                              : item.qty || 0;
                          const displayName = item.name || item.desc || "Item";

                          return el(
                            "span",
                            { className: "item-badge" },
                            `${displayQty} ${displayName}`
                          );
                        })
                      )
                    : null,
                ]),

                // --- DERECHA: MONTOS (Principal y Saldo Parcial) ---
                el("div", { className: "mov-right-amounts" }, [
                  el(
                    "span",
                    {
                      className: `mov-amount-main ${
                        isDebt ? "text-danger" : "text-success"
                      }`,
                      dataset: { amount: m.amount },
                    },
                    SupplierModel.formatAmount(m.amount, isVisible)
                  ),

                  el(
                    "span",
                    {
                      className: "mov-running-subtle",
                      dataset: { amount: m.runningBalance },
                    },
                    SupplierModel.formatAmount(m.runningBalance, isVisible)
                  ),
                ]),

                // --- EXTREMO DERECHO: BOTÓN BORRAR ---
                el("button", {
                  className: "btn-delete-mov-centered",
                  title: "Eliminar este registro",
                  onclick: (e) => {
                    e.stopPropagation();
                    onDeleteMovement(m);
                  },
                  innerHTML: icons.trash,
                }),
              ]
            );
          })
        : el(
            "div",
            { className: "empty-msg" },
            "No hay movimientos para mostrar"
          )
    ),
  ]);
}
