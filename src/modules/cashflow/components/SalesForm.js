import { PAYMENT_METHODS } from "../../../shared/constants/paymentMethode.js";

export function SalesForm() {
  const div = document.createElement("div");
  div.style.display = "grid";
  div.style.gap = "10px";

  // Generamos inputs dinámicamente basados en las constantes
  Object.values(PAYMENT_METHODS).forEach((method) => {
    const label = document.createElement("label");
    label.textContent = `Venta ${method.toUpperCase()}: `;
    label.style.display = "block";

    const input = document.createElement("input");
    input.type = "number";
    input.id = `input-sales-${method}`; // ID único
    input.placeholder = "0.00";
    input.style =
      "width: 100%; padding: 8px; background: #333; border: 1px solid #555; color: white; border-radius: 4px;";

    label.appendChild(input);
    div.appendChild(label);
  });

  // Método para sacar los datos limpios
  div.getValues = () => {
    const values = {};
    Object.values(PAYMENT_METHODS).forEach((method) => {
      values[method] =
        Number(div.querySelector(`#input-sales-${method}`).value) || 0;
    });
    return values;
  };

  return div;
}
