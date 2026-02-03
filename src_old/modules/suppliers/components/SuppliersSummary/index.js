import { el } from "../../../../core/dom.js";
import { HideAmountsButton } from "../../../../shared/ui/HideAmountsButton/index.js";
import { formatCurrency } from "../../../../core/utils/currency.js";
import "./style.css";

export function SuppliersSummary({ suppliers = [] }) {
  // 1. Calculamos la deuda total a partir de la lista recibida
  const totalDebt = suppliers.reduce((acc, s) => acc + (s.balance || 0), 0);

  // Estado inicial de privacidad
  let isHidden = localStorage.getItem("amountsHidden") === "true";

  // 2. Creamos el elemento del monto
  const amountDisplay = el("span", { className: "summary-hero-value" });

  // 3. Función de actualización de texto
  const updateAmountText = () => {
    // Usamos puntos en lugar de asteriscos como pediste
    amountDisplay.textContent = isHidden ? "•••••" : formatCurrency(totalDebt);
  };

  // 4. Sincronización con el evento global
  window.addEventListener("toggle-amounts", (e) => {
    isHidden = e.detail;
    updateAmountText();
  });

  // Ejecución inicial para que no aparezca vacío o en 0
  updateAmountText();

  // 5. Estructura Hero Sutil
  return el(
    "div",
    { className: "summary-hero-container" },
    el(
      "div",
      { className: "summary-hero-content" },
      el("span", { className: "summary-hero-label" }, "Deuda Total"),
      el(
        "div",
        { className: "summary-hero-amount-group" },
        amountDisplay,
        HideAmountsButton() // El ojo sincronizado al lado del monto
      )
    )
  );
}
