import { el } from "../../../../core/dom.js";
import { Icon } from "../../../../shared/ui/Icon.js";

/**
 * Componente interno para manejar la visualización de dinero
 * con soporte para ocultar montos.
 */
function MoneyDisplay(amount, baseClass = "") {
  // Estado inicial desde localStorage
  let isHidden = localStorage.getItem("amountsHidden") === "true";

  const span = el("span", { className: baseClass });

  const updateText = () => {
    if (isHidden) {
      span.textContent = "*****";
    } else {
      span.textContent = new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
      }).format(amount);
    }
  };

  // Escuchar el evento global de toggle
  const handleToggle = (e) => {
    isHidden = e.detail;
    updateText();
  };

  window.addEventListener("toggle-amounts", handleToggle);

  // Limpieza: aunque en este modelo de DOM simple no hay un ciclo de vida formal,
  // es buena práctica considerar la desuscripción si el componente se destruye.

  updateText();
  return span;
}

export function SupplierTable({
  suppliers = [],
  onViewDetails,
  onAddMovement,
}) {
  if (suppliers.length === 0) {
    return el(
      "div",
      { className: "suppliers-grid" },
      el(
        "div",
        {
          className: "empty-state",
          style: { textAlign: "center", padding: "40px", color: "#999" },
        },
        "No hay proveedores aún."
      )
    );
  }

  const cards = suppliers.map((s) => {
    let balanceElement;
    let balanceClass = "";

    // --- Lógica Saldo ---
    if (s.providerType === "stock") {
      const debt = s.stockDebt || {};
      const items = Object.entries(debt).filter(([_, qty]) => qty > 0);
      if (items.length === 0) {
        balanceElement = el("span", { className: "text-success" }, "Al día");
      } else {
        const text = items.map(([name, qty]) => `${qty} ${name}`).join(" | ");
        balanceElement = el("span", { className: "text-stock" }, text);
      }
    } else {
      const balance = s.balance || 0;
      balanceClass = balance > 0 ? "text-danger" : "text-success";
      // Usamos nuestro componente reactivo para el dinero
      balanceElement = MoneyDisplay(balance, balanceClass);
    }

    const initial = s.name.charAt(0).toUpperCase();

    // --- Render Card ---
    return el(
      "div",
      {
        className: "supplier-card",
        onclick: () => onViewDetails(s),
      },
      // HEADER
      el(
        "div",
        { className: "card-header" },
        el("div", { className: "supplier-avatar" }, initial),
        el(
          "div",
          { className: "card-info" },
          el("div", { className: "card-name" }, s.name),
          s.alias
            ? el(
                "div",
                {
                  className: "card-alias",
                  onclick: (e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(s.alias);
                  },
                },
                Icon("copy"),
                s.alias
              )
            : null
        ),
        el(
          "button",
          {
            className: "btn-card-action",
            title: "Agregar",
            onclick: (e) => {
              e.stopPropagation();
              onAddMovement(s);
            },
          },
          Icon("plus")
        )
      ),
      // BODY
      el(
        "div",
        { className: "card-body" },
        el("span", { className: "balance-label" }, "Saldo"),
        el("div", { className: "balance-container" }, balanceElement)
      )
    );
  });

  return el("div", { className: "suppliers-grid" }, ...cards);
}
