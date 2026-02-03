import { el } from "../../../../core/dom.js";
import { formatCurrency } from "../../../../core/utils/currency.js";
import { Button } from "../../../../shared/ui/Button/index.js";
import "./style.css";

export function ClosingForm({ initialData, onSave, onCancel, onDelete }) {
  const state = {
    ...initialData,
    date: initialData.date || new Date().toISOString().split("T")[0],
    expenses_cash: initialData.expenses_cash || 0,
    observations_amount: initialData.observations_amount || 0,
    justification: initialData.justification || "",
  };

  // Valores internos en centavos para precisión
  let salesRawAmount = Math.round((state.sales_total || 0) * 100);
  let expensesRawAmount = Math.round((state.expenses_cash || 0) * 100);
  let observationsRawAmount = Math.round(
    (state.observations_amount || 0) * 100
  );

  // --- HELPER: FORMATEO DINÁMICO ---
  const formatMoney = (cents) => {
    if (!cents) return "";
    return (
      "$ " + (cents / 100).toLocaleString("es-AR", { minimumFractionDigits: 2 })
    );
  };

  // --- REFERENCIAS UI ---
  const alertBox = el("div", { className: "alert-box hidden" });
  const netIncomeDisplay = el("div", { className: "metric-value" }, "$0");
  const accumulatedDisplay = el(
    "div",
    { className: "metric-value primary" },
    "$0"
  );

  const justificationInput = el("textarea", {
    className: "input-text-full hidden",
    placeholder: "Nota sobre la diferencia (opcional)...",
    value: state.justification,
    oninput: (e) => (state.justification = e.target.value),
  });

  const btnSave = Button({
    text: "Guardar Cierre",
    icon: "save",
    variant: "success",
    onClick: () => {
      state.sales_total = salesRawAmount / 100;
      state.expenses_cash = expensesRawAmount / 100;
      state.observations_amount = observationsRawAmount / 100;
      onSave(state);
    },
    className: "btn-save-wide",
  });

  const btnCancel = Button({
    text: "Cancelar",
    variant: "ghost",
    onClick: onCancel,
  });

  const btnDelete =
    initialData?.id || initialData?.date
      ? Button({
          text: "Eliminar",
          icon: "trash",
          variant: "danger",
          onClick: () => {
            if (
              confirm(
                "¿Estás seguro de eliminar este cierre? Esta acción no se puede deshacer."
              )
            ) {
              onDelete(initialData.date);
            }
          },
          className: "btn-delete-closing",
        })
      : null;

  // --- LÓGICA DE CÁLCULO ---
  const updateCalculations = () => {
    state.sales_total = salesRawAmount / 100;
    state.expenses_cash = expensesRawAmount / 100;
    state.observations_amount = observationsRawAmount / 100;

    // Sumar medios de pago
    const payments = state.payments || {};
    const paymentTotal =
      (Number(payments.cash) || 0) +
      (Number(payments.qr) || 0) +
      (Number(payments.card) || 0) +
      (Number(payments.transfer) || 0);

    // CÁLCULOS
    const salesTotal = state.sales_total;
    const expensesCash = state.expenses_cash;
    const observations = state.observations_amount;

    const netIncome = salesTotal - expensesCash; // Ingreso neto del día
    const finalBalance = netIncome - observations; // Lo que realmente suma al saldo

    // Actualizar displays
    netIncomeDisplay.textContent = formatCurrency(netIncome);
    accumulatedDisplay.textContent = `${
      finalBalance >= 0 ? "+" : ""
    }${formatCurrency(finalBalance)}`;

    // Validación: Ventas vs Pagos
    const difference = Math.abs(salesTotal - paymentTotal);

    if (difference > 1) {
      alertBox.className = "alert-box warning visible";
      alertBox.innerHTML = `
        ⚠️ Diferencia detectada: <strong>${formatCurrency(
          difference
        )}</strong><br>
        Ventas: ${formatCurrency(salesTotal)} | Pagos: ${formatCurrency(
        paymentTotal
      )}
      `;
      justificationInput.classList.remove("hidden");
    } else {
      alertBox.className = "alert-box success visible";
      alertBox.innerHTML = `✅ Ventas y medios de pago coinciden`;
      justificationInput.classList.add("hidden");
    }
  };

  // --- INPUT CON FORMATEO DINÁMICO ---
  const createInputFormatted = (label, rawValue, onChangeCallback) => {
    const input = el("input", {
      type: "tel",
      className: "input-currency",
      value: formatMoney(rawValue),
      placeholder: "$ 0,00",
    });

    input.oninput = (e) => {
      const val = e.target.value.replace(/\D/g, "");
      const newRawValue = val ? parseInt(val) : 0;
      onChangeCallback(newRawValue);
      e.target.value = formatMoney(newRawValue);
      updateCalculations();
    };

    input.onfocus = (e) => {
      setTimeout(() => e.target.select(), 0);
    };

    return el(
      "div",
      { className: "input-group" },
      el("label", {}, label),
      input
    );
  };

  // --- INPUT HERO VENTAS ---
  const salesInput = el("input", {
    type: "tel",
    className: "main-sales-input",
    value: formatMoney(salesRawAmount),
    placeholder: "$ 0,00",
  });

  salesInput.oninput = (e) => {
    const val = e.target.value.replace(/\D/g, "");
    salesRawAmount = val ? parseInt(val) : 0;
    e.target.value = formatMoney(salesRawAmount);
    updateCalculations();
  };

  salesInput.onfocus = (e) => {
    setTimeout(() => e.target.select(), 0);
  };

  // --- INPUT HERO GASTOS ---
  const expensesInput = el("input", {
    type: "tel",
    className: "hero-input expense-color",
    value: formatMoney(expensesRawAmount),
    placeholder: "$ 0,00",
  });

  expensesInput.oninput = (e) => {
    const val = e.target.value.replace(/\D/g, "");
    expensesRawAmount = val ? parseInt(val) : 0;
    e.target.value = formatMoney(expensesRawAmount);
    updateCalculations();
  };

  expensesInput.onfocus = (e) => {
    setTimeout(() => e.target.select(), 0);
  };

  // --- INPUT HERO OBSERVACIONES ---
  const observationsInput = el("input", {
    type: "tel",
    className: "hero-input observation-color",
    value: formatMoney(observationsRawAmount),
    placeholder: "$ 0,00",
  });

  observationsInput.oninput = (e) => {
    const val = e.target.value.replace(/\D/g, "");
    observationsRawAmount = val ? parseInt(val) : 0;
    e.target.value = formatMoney(observationsRawAmount);
    updateCalculations();
  };

  observationsInput.onfocus = (e) => {
    setTimeout(() => e.target.select(), 0);
  };

  // --- FORM STRUCTURE ---
  const form = el(
    "div",
    { className: "modern-closing-form" },

    // 0. SELECTOR DE FECHA
    el(
      "div",
      { className: "panel-container date-selector-panel" },
      el("h4", { className: "panel-title" }, "Fecha del Cierre"),
      el(
        "div",
        { className: "date-input-wrapper" },
        el("input", {
          type: "date",
          className: "input-date-large",
          value: state.date,
          oninput: (e) => {
            state.date = e.target.value;
          },
        }),
        el(
          "div",
          { className: "date-helper-text" },
          "Puedes modificar la fecha si necesitas registrar un cierre de otro día"
        )
      )
    ),

    // 1. VENTAS
    el(
      "div",
      { className: "section-sales" },
      el("h3", {}, "1. Ventas Totales del Día"),
      salesInput
    ),

    alertBox,

    // 2. MEDIOS DE PAGO
    el(
      "div",
      { className: "panel-container" },
      el(
        "h4",
        { className: "panel-title" },
        "2. Medios de Pago (Deben sumar igual)"
      ),
      el(
        "div",
        { className: "payment-grid" },
        createInputFormatted(
          "Efectivo",
          Math.round((state.payments?.cash || 0) * 100),
          (newVal) => {
            if (!state.payments) state.payments = {};
            state.payments.cash = newVal / 100;
          }
        ),
        createInputFormatted(
          "QR / MercadoPago",
          Math.round((state.payments?.qr || 0) * 100),
          (newVal) => {
            if (!state.payments) state.payments = {};
            state.payments.qr = newVal / 100;
          }
        ),
        createInputFormatted(
          "Tarjetas",
          Math.round((state.payments?.card || 0) * 100),
          (newVal) => {
            if (!state.payments) state.payments = {};
            state.payments.card = newVal / 100;
          }
        ),
        createInputFormatted(
          "Transferencias",
          Math.round((state.payments?.transfer || 0) * 100),
          (newVal) => {
            if (!state.payments) state.payments = {};
            state.payments.transfer = newVal / 100;
          }
        )
      )
    ),

    // 3. GASTOS Y OBSERVACIONES (LADO A LADO)
    el(
      "div",
      { className: "expenses-grid" },

      // GASTOS EN EFECTIVO
      el(
        "div",
        { className: "section-expense" },
        el("h3", {}, "3. Gastos en Efectivo"),
        el("div", { className: "expense-subtitle" }, "De la caja del día"),
        expensesInput
      ),

      // OBSERVACIONES
      el(
        "div",
        { className: "section-observation" },
        el("h3", {}, "4. Observaciones"),
        el("div", { className: "expense-subtitle" }, "Gastos NO de la caja"),
        observationsInput
      )
    ),

    // 5. RESUMEN
    el(
      "div",
      { className: "panel-container highlight-border summary-panel" },
      el("h4", { className: "panel-title" }, "📊 Resumen del Día"),
      el(
        "div",
        { className: "summary-grid" },
        el(
          "div",
          { className: "metric-row" },
          el("span", { className: "metric-label" }, "Ingreso Neto del Día"),
          el("div", { className: "metric-help" }, "(Ventas - Gastos Efectivo)"),
          netIncomeDisplay
        ),
        el("div", { className: "metric-divider" }),
        el(
          "div",
          { className: "metric-row" },
          el("span", { className: "metric-label" }, "Impacto en Saldo"),
          el("div", { className: "metric-help" }, "(Neto - Observaciones)"),
          accumulatedDisplay
        )
      )
    ),

    el("div", { style: { marginTop: "10px" } }, justificationInput),

    // 6. BARRA DE ACCIONES
    el(
      "div",
      { className: "final-result-bar" },
      el("div", { className: "actions" }, btnCancel, btnDelete, btnSave)
    )
  );

  updateCalculations();
  return form;
}
