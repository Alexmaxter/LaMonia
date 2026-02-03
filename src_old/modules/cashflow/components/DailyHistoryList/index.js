import { el } from "../../../../core/dom.js";
import { formatCurrency } from "../../../../core/utils/currency.js";
import { dateUtils } from "../../../../core/utils/dateUtils.js";
import { Icon } from "../../../../shared/ui/Icon.js";
import { CashflowLogic } from "../../services/CashflowLogic.js";
import "./style.css";

export function DailyHistoryList({ reports, onSelectDay }) {
  // Encabezado (6 Columnas)
  const listHeader = el(
    "div",
    { className: "list-header-row" },
    el("div", { className: "col-date" }, "Fecha"),
    el("div", { className: "col-breakdown-header" }, "Detalle Ventas"),
    el("div", { className: "col-expense" }, "Gastos"),
    el("div", { className: "col-obs" }, "Retiros/Obs"),
    el("div", { className: "col-net" }, "Neto Real"),
    el("div", { className: "col-balance" }, "Saldo Acum.")
  );

  const listContainer = el("div", { className: "history-list" });

  if (!reports || reports.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <p>No hay cierres registrados aún.</p>
      </div>`;
  } else {
    let lastMonthLabel = "";

    reports.forEach((report) => {
      const dateObj = dateUtils.parse(report.date);

      // Separador de Mes (prevenir duplicados)
      const monthLabel = dateObj.toLocaleDateString("es-AR", {
        month: "long",
        year: "numeric",
      });

      if (monthLabel !== lastMonthLabel) {
        listContainer.appendChild(
          el(
            "div",
            { className: "month-separator" },
            el("span", {}, monthLabel)
          )
        );
        lastMonthLabel = monthLabel;
      }

      // --- DATOS ---
      const cash = report.payments?.cash || 0;
      const card = report.payments?.card || 0;
      const qr = report.payments?.qr || 0;
      const transf = report.payments?.transfer || 0;
      const salesTotal = report.sales_total || 0;

      const expenses = report.expenses_cash || 0;
      const observations = report.observations_amount || 0;

      // Helper para items de pago
      const createPaymentItem = (label, amount, type) => {
        if (amount <= 0) return null;
        return el(
          "div",
          { className: `pay-item ${type}` },
          el("span", { className: "pay-label" }, label),
          el("span", { className: "pay-amount" }, formatCurrency(amount))
        );
      };

      const cardRow = el(
        "div",
        {
          className: "history-row-card",
          onclick: () => onSelectDay(report.date),
        },

        // 1. FECHA
        el(
          "div",
          { className: "col-date" },
          el(
            "span",
            { className: "date-day" },
            String(dateObj.getDate()).padStart(2, "0")
          ),
          el(
            "span",
            { className: "date-weekday" },
            dateObj.toLocaleDateString("es-AR", { weekday: "short" })
          )
        ),

        // 2. DESGLOSE CON TOTAL INTEGRADO
        el(
          "div",
          { className: "col-breakdown" },
          createPaymentItem("Efectivo", cash, "is-cash"),
          createPaymentItem("Tarjeta", card, "is-digital"),
          createPaymentItem("QR / MP", qr, "is-digital"),
          createPaymentItem("Transf.", transf, "is-digital"),

          el(
            "div",
            { className: "breakdown-total" },
            el("span", {}, "TOTAL:"),
            el("span", {}, formatCurrency(salesTotal))
          )
        ),

        // 3. GASTOS
        el(
          "div",
          { className: "col-expense" },
          expenses > 0 ? formatCurrency(expenses) : "-"
        ),

        // 4. OBSERVACIONES
        el(
          "div",
          { className: "col-obs" },
          observations > 0 ? formatCurrency(observations) : "-"
        ),

        // 5. NETO
        el(
          "div",
          { className: "col-net" },
          formatCurrency(report.net_income || 0)
        ),

        // 6. SALDO ACUMULADO
        el(
          "div",
          { className: "col-balance" },
          formatCurrency(report.accumulated_cashflow || 0)
        )
      );

      listContainer.appendChild(cardRow);
    });
  }

  return el(
    "div",
    { className: "history-container" },
    listHeader,
    listContainer
  );
}
