import { el } from "../../../core/dom.js";
import { Button } from "../../../shared/ui/Button/index.js"; // Nuevo botón
import { Icon } from "../../../shared/ui/Icon.js"; // Nuevos iconos
import { EXPENSE_SOURCE } from "../../../shared/constants/PaymentMethods.js";

export function ExpenseForm({ initialExpenses = [], onChange }) {
  let expensesList = [...initialExpenses];

  const listContainer = el("ul", { className: "expense-list" });

  // --- INPUTS ---
  const descInput = el("input", {
    type: "text",
    placeholder: "Descripción (ej. Hielo, Taxi)",
    className: "input-text",
    style: { flex: 2 },
  });

  const amountInput = el("input", {
    type: "number",
    placeholder: "$ Monto",
    className: "input-number",
    style: { flex: 1 },
  });

  const sourceSelect = el(
    "select",
    {
      className: "input-select",
      style: { flex: 1 },
    },
    el("option", { value: EXPENSE_SOURCE.REGISTER }, "De Caja"),
    el("option", { value: EXPENSE_SOURCE.OWNER }, "Retiro Socio")
  );

  // --- ACCIONES ---
  const handleAdd = () => {
    const desc = descInput.value.trim();
    const amount = parseFloat(amountInput.value);

    if (!desc || !amount || amount <= 0) return;

    expensesList.push({
      id: Date.now(),
      description: desc,
      amount: amount,
      source: sourceSelect.value,
    });

    descInput.value = "";
    amountInput.value = "";
    descInput.focus();

    renderList();
    if (onChange) onChange(expensesList);
  };

  const handleDelete = (index) => {
    expensesList.splice(index, 1);
    renderList();
    if (onChange) onChange(expensesList);
  };

  // --- RENDER ---
  const renderList = () => {
    listContainer.innerHTML = "";

    if (expensesList.length === 0) {
      listContainer.innerHTML = `<li class="empty-state">Sin movimientos registrados</li>`;
      return;
    }

    expensesList.forEach((item, index) => {
      const isRegister = item.source === EXPENSE_SOURCE.REGISTER;

      const row = el("li", { className: "expense-item" });

      // Badge tipo
      const badge = el(
        "span",
        {
          className: `badge ${
            isRegister ? "badge-expense" : "badge-withdrawal"
          }`,
        },
        isRegister ? "GASTO" : "RETIRO"
      );

      const info = el(
        "div",
        { className: "expense-info" },
        badge,
        el("span", {}, item.description)
      );

      // Botón Borrar (Usando Icono directo para ser más sutil o Button ghost)
      const btnDelete = el(
        "button",
        {
          className: "btn-icon-delete",
          onclick: () => handleDelete(index),
          title: "Eliminar",
        },
        Icon("trash", 16)
      );

      const actions = el(
        "div",
        { className: "expense-actions" },
        el("strong", {}, `$ ${item.amount}`),
        btnDelete
      );

      row.append(info, actions);
      listContainer.appendChild(row);
    });
  };

  // Fila de inputs con el botón "Plus" estándar
  const inputRow = el(
    "div",
    { className: "expense-input-row" },
    descInput,
    amountInput,
    sourceSelect,
    Button({
      icon: "plus",
      variant: "secondary", // Gris sutil
      onClick: handleAdd,
      className: "btn-add-expense",
    })
  );

  renderList();

  // Pequeño estilo inline inyectado o mover a CSS general
  const style = el(
    "style",
    {},
    `
    .expense-list { list-style: none; padding: 0; margin: 1rem 0 0 0; }
    .expense-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid var(--border-color); }
    .expense-input-row { display: flex; gap: 10px; margin-bottom: 10px; }
    .badge { font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; margin-right: 8px; font-weight: bold; }
    .badge-expense { background: rgba(239, 68, 68, 0.1); color: var(--danger); }
    .badge-withdrawal { background: rgba(59, 130, 246, 0.1); color: var(--primary); }
    .btn-icon-delete { background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 4px; transition: color 0.2s; }
    .btn-icon-delete:hover { color: var(--danger); }
    .empty-state { text-align: center; color: var(--text-muted); font-style: italic; padding: 10px; }
    .expense-actions { display: flex; align-items: center; gap: 1rem; }
  `
  );

  return el(
    "div",
    { className: "expense-form-wrapper" },
    style,
    inputRow,
    listContainer
  );
}
