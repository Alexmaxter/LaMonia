import { EXPENSE_SOURCE } from "../../../shared/constants/PaymentMethods.js";
import { Button } from "../../../shared/ui/Button.js";

export function ExpenseForm() {
  const container = document.createElement("div");

  // 1. Contenedor de Inputs (Usamos Flexbox para alinear)
  const inputRow = document.createElement("div");
  inputRow.style =
    "display: flex; gap: 10px; margin-bottom: 15px; align-items: center;";

  // Insertamos los inputs como HTML string
  inputRow.innerHTML = `
    <input type="text" id="exp-desc" placeholder="Descripción (ej. Hielo)" 
      style="flex: 2; padding: 10px; background: #333; color: white; border: 1px solid #555; border-radius: 6px;">
      
    <input type="number" id="exp-amount" placeholder="$ Monto" 
      style="flex: 1; padding: 10px; background: #333; color: white; border: 1px solid #555; border-radius: 6px;">
      
    <select id="exp-source" 
      style="flex: 1; padding: 10px; background: #333; color: white; border: 1px solid #555; border-radius: 6px; cursor: pointer;">
      <option value="${EXPENSE_SOURCE.REGISTER}">De Caja (Resta)</option>
      <option value="${EXPENSE_SOURCE.OWNER}">Del Dueño (Obs)</option>
    </select>
  `;

  // 2. Creamos el Botón de Agregar usando tu componente UI
  const btnAdd = Button({
    text: "Agregar",
    variant: "primary",
    onClick: handleAddExpense,
  });

  inputRow.appendChild(btnAdd);

  // 3. Contenedor de la Lista
  const listContainer = document.createElement("ul");
  listContainer.style =
    "list-style: none; padding: 0; margin: 0; border-top: 1px solid #333;";

  container.appendChild(inputRow);
  container.appendChild(listContainer);

  // --- LÓGICA INTERNA (Estado) ---
  let expensesList = [];

  function handleAddExpense() {
    const descInput = inputRow.querySelector("#exp-desc");
    const amountInput = inputRow.querySelector("#exp-amount");
    const sourceInput = inputRow.querySelector("#exp-source");

    const description = descInput.value;
    const amount = Number(amountInput.value);
    const source = sourceInput.value;

    if (!description || amount <= 0) {
      alert("Por favor ingresa una descripción y un monto válido.");
      return;
    }

    expensesList.push({ description, amount, source });

    descInput.value = "";
    amountInput.value = "";
    descInput.focus();

    renderList();
  }

  function renderList() {
    listContainer.innerHTML = "";

    expensesList.forEach((exp, index) => {
      const li = document.createElement("li");
      li.style =
        "display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #333; font-size: 0.95rem;";

      const isRegister = exp.source === EXPENSE_SOURCE.REGISTER;
      const color = isRegister ? "#ff6b6b" : "#74c0fc";
      const label = isRegister ? "CAJA" : "DUEÑO";

      const infoSpan = document.createElement("span");
      infoSpan.innerHTML = `${exp.description} <small style="color:${color}; margin-left:5px;">(${label})</small>`;

      const rightDiv = document.createElement("div");
      rightDiv.style = "display: flex; align-items: center; gap: 10px;";

      const amountSpan = document.createElement("span");
      amountSpan.style.fontWeight = "bold";
      amountSpan.textContent = `$ ${exp.amount}`;

      const btnDelete = Button({
        text: "×",
        variant: "icon",
        onClick: () => {
          expensesList.splice(index, 1);
          renderList();
        },
      });
      btnDelete.style.color = "#ff6b6b";
      btnDelete.style.fontSize = "1.5rem";
      btnDelete.title = "Eliminar gasto";

      rightDiv.appendChild(amountSpan);
      rightDiv.appendChild(btnDelete);

      li.appendChild(infoSpan);
      li.appendChild(rightDiv);
      listContainer.appendChild(li);
    });
  }

  container.getExpenses = () => expensesList;

  return container;
}
