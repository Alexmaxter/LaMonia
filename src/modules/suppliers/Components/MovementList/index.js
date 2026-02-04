import { el } from "../../../../core/dom.js";
import { SupplierModel } from "../../model.js";
import "./style.css";

export function MovementList({
  movements,
  isVisible,
  onDelete,
  onEdit,
  showSupplierName = false,
}) {
  const iconTrash = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

  const container = el("div", { className: "movements-block-container" });
  const listStack = el("div", { className: "movements-list-stack" });

  if (!movements || movements.length === 0) {
    container.appendChild(
      el("div", { className: "empty-state-flat" }, "SIN MOVIMIENTOS"),
    );
    return container;
  }

  movements.forEach((m) => {
    // 1. Preparar Datos
    const isDebt = m.type === "invoice";
    const typeClass = isDebt ? "type-invoice" : "type-payment";

    // Fecha
    const dateObj = m.date?.seconds
      ? new Date(m.date.seconds * 1000)
      : new Date(m.date);

    // Día (ej: "04")
    const dayStr = dateObj.getDate().toString().padStart(2, "0");
    // Mes (ej: "FEB")
    const monthStr = dateObj
      .toLocaleString("es-AR", { month: "short" })
      .toUpperCase()
      .replace(".", "");

    const rawDesc = m.description || m.concept || "";
    const hasDesc = rawDesc.trim().length > 0;

    // 2. Estructura HTML idéntica a tu CSS
    const card = el(
      "div",
      {
        className: `tech-movement-card ${typeClass}`,
        onclick: () => onEdit && onEdit(m),
      },
      [
        // Barra lateral de color
        el("div", { className: "mov-status-bar" }),

        // Contenido Principal
        el("div", { className: "mov-content" }, [
          // COLUMNA FECHA
          el("div", { className: "mov-date-col" }, [
            el("span", { className: "date-day" }, dayStr),
            el("span", { className: "date-month" }, monthStr),
          ]),

          // COLUMNA INFO
          el("div", { className: "mov-info-col" }, [
            el("div", { className: "info-row-primary" }, [
              el("span", { className: "type-badge" }, isDebt ? "BOL" : "PAG"),
              showSupplierName && m.supplierName
                ? el("span", { className: "supplier-name-tag" }, m.supplierName)
                : null,
            ]),
            hasDesc ? el("span", { className: "desc-text" }, rawDesc) : null,
          ]),

          // COLUMNA DINERO
          el("div", { className: "mov-money-col" }, [
            el(
              "span",
              {
                className: `amount-main ${isDebt ? "val-invoice" : "val-payment"}`,
              },
              SupplierModel.formatAmount(m.amount, isVisible),
            ),
            // Si hay saldo parcial (opcional)
            m.partialBalance !== undefined
              ? el(
                  "div",
                  { className: "balance-partial" },
                  `Parcial: ${SupplierModel.formatAmount(m.partialBalance, isVisible)}`,
                )
              : null,
          ]),

          // BOTON BORRAR
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

    listStack.appendChild(card);
  });

  container.appendChild(listStack);
  return container;
}
