import { el } from "../../../../core/dom.js";
import { formatCurrency } from "../../../../core/utils/currency.js";
import { Icon } from "../../../../shared/ui/Icon.js";
import "./style.css";

export function SupplierTable({
  suppliers = [],
  onViewDetail,
  onAddTransaction,
}) {
  const container = el("div", { className: "suppliers-grid" });

  const isHidden = () => localStorage.getItem("amountsHidden") === "true";

  const render = () => {
    container.innerHTML = "";

    if (suppliers.length === 0) {
      container.innerHTML =
        '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">No hay proveedores registrados.</div>';
      return;
    }

    suppliers.forEach((supplier) => {
      const balance = supplier.balance || 0;
      const hasDebt = balance > 0;

      // --- Tarjeta Principal ---
      const card = el("div", {
        className: "supplier-card",
        onclick: () => onViewDetail(supplier.id),
      });

      // --- 1. Header ---
      const header = el("div", { className: "card-header" });

      // Avatar
      const initial = supplier.name
        ? supplier.name.charAt(0).toUpperCase()
        : "?";
      const avatar = el("div", { className: "card-avatar" }, initial);

      // Info
      const info = el("div", { className: "card-info" });
      const nameTitle = el("h3", {}, supplier.name);
      info.appendChild(nameTitle);

      // Alias
      if (supplier.alias) {
        const iconContainer = el(
          "span",
          { title: "Copiar alias" },
          Icon("copy")
        );
        const aliasContainer = el(
          "div",
          { className: "card-alias" },
          iconContainer,
          el("span", {}, supplier.alias)
        );

        iconContainer.onclick = (e) => {
          e.stopPropagation();
          navigator.clipboard.writeText(supplier.alias).then(() => {
            iconContainer.style.color = "var(--success)";
            setTimeout(() => (iconContainer.style.color = ""), 1000);
          });
        };
        info.appendChild(aliasContainer);
      }

      // --- BOTÓN DE ACCIÓN RÁPIDA (MODIFICADO) ---
      // Ahora es un "+" para agregar boleta/transacción
      const addTransBtn = el(
        "button",
        {
          className: "btn-icon-action",
          title: "Agregar boleta", // Tooltip actualizado
          onclick: (e) => {
            e.stopPropagation(); // Evita ir al detalle
            onAddTransaction(supplier);
          },
        },
        Icon("plus") // Icono "+" solicitado
      );

      header.append(avatar, info, addTransBtn);

      // --- 2. Footer ---
      const footer = el("div", { className: "card-footer" });

      const statusPill = el(
        "span",
        {
          className: `status-pill ${hasDebt ? "warning" : "success"}`,
        },
        hasDebt ? "Deuda" : "A favor"
      );

      const amountEl = el(
        "span",
        {
          className: hasDebt ? "amount-negative" : "amount-positive",
        },
        isHidden() ? "•••••" : formatCurrency(balance)
      );

      footer.append(statusPill, amountEl);
      card.append(header, footer);
      container.appendChild(card);
    });
  };

  window.addEventListener("toggle-amounts", render);
  render();

  return container;
}
