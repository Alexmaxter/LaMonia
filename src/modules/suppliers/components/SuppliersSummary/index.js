import { el } from "../../../../core/dom.js"; // Importación faltante que causa el error
import { Icon } from "../../../../shared/ui/Icon.js";
import { HideAmountsButton } from "../../../../shared/ui/HideAmountsButton/index.js";
import "./style.css";

export function SuppliersSummary({ suppliers }) {
  // Calculamos métricas
  const totalDebt = suppliers.reduce((acc, s) => acc + (s.balance || 0), 0);
  const suppliersWithDebt = suppliers.filter(
    (s) => (s.balance || 0) > 0
  ).length;

  // Estado inicial de privacidad (desde localStorage)
  let isHidden = localStorage.getItem("amountsHidden") === "true";

  // Creamos el elemento donde se mostrará el monto
  const amountDisplay = el("h2", { className: "amount" });

  // Función para actualizar el texto del monto según la privacidad
  const updateAmountText = () => {
    if (isHidden) {
      amountDisplay.textContent = "*****";
    } else {
      amountDisplay.textContent = new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
      }).format(totalDebt);
    }
  };

  // Escuchamos el evento global de toggle de montos
  window.addEventListener("toggle-amounts", (e) => {
    isHidden = e.detail;
    updateAmountText();
  });

  // Ejecución inicial de texto
  updateAmountText();

  // Determinamos el nivel de alerta visual
  let statusClass = "status-ok";
  let statusText = "Al día";

  if (totalDebt > 0) {
    statusClass = "status-warning";
    statusText = `Deuda con ${suppliersWithDebt} proveedores`;
  }
  if (totalDebt > 500000) {
    statusClass = "status-danger";
    statusText = "Atención: Deuda elevada";
  }

  // Retorno del componente usando la función el()
  return el(
    "div",
    { className: `summary-card ${statusClass}` },
    el(
      "div",
      { className: "summary-main" },
      el(
        "div",
        { className: "summary-info" },
        el(
          "div",
          { style: { display: "flex", alignItems: "center", gap: "10px" } },
          el("span", { className: "label" }, "SALDO TOTAL"),
          HideAmountsButton() // Botón del "ojo" para ocultar/mostrar
        ),
        amountDisplay,
        el("div", { className: "badge" }, statusText)
      ),
      el("div", { className: "summary-visual" }, Icon("dollar"))
    ),
    el(
      "div",
      { className: "summary-footer" },
      el(
        "div",
        { className: "stat" },
        el("span", {}, "Promedio por proveedor con deuda: "),
        el(
          "strong",
          {},
          new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: "ARS",
          }).format(suppliersWithDebt > 0 ? totalDebt / suppliersWithDebt : 0)
        )
      )
    )
  );
}
