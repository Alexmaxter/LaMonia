import { el } from "../../../../core/dom.js";
import { dateUtils } from "../../../../core/utils/dateUtils.js";
import { formatCurrency } from "../../../../core/utils/currency.js";
import { Button } from "../../../../shared/ui/Button/index.js";
import { Icon } from "../../../../shared/ui/Icon.js";
import { HideAmountsButton } from "../../../../shared/ui/HideAmountsButton/index.js";
import "./style.css";

export function SupplierDetail({
  supplier,
  transactions = [],
  onTransactionClick,
  onNewMovement,
}) {
  if (!supplier)
    return el("div", { className: "loading-state" }, "Cargando...");

  let isHidden = localStorage.getItem("amountsHidden") === "true";
  const heroAmountContainer = el("div", { className: "hero-amount-wrapper" });
  const listWrapper = el("div", { className: "tx-list-dynamic-wrapper" });

  // Render Saldo Grande
  const renderHeroAmount = () => {
    const balance = supplier.balance || 0;
    const isDebt = balance > 0;
    heroAmountContainer.innerHTML = "";

    const amountClass = isDebt ? "text-debt" : "text-favor";

    const h3 = el(
      "h3",
      { className: `hero-amount ${amountClass}` },
      isHidden ? "•••••" : formatCurrency(balance)
    );

    // Envolvemos el botón del ojo para estilizarlo bien
    const eyeWrapper = el(
      "div",
      { className: "eye-btn-wrapper" },
      HideAmountsButton()
    );

    heroAmountContainer.append(h3, eyeWrapper);
  };

  // Render Lista
  const renderTransactionList = () => {
    listWrapper.innerHTML = "";

    if (!transactions || transactions.length === 0) {
      listWrapper.appendChild(
        el(
          "div",
          { className: "empty-state" },
          "No hay movimientos registrados."
        )
      );
      return;
    }

    const listContainer = el("div", { className: "tx-list-container" });

    transactions.forEach((tx) => {
      const isInvoice = tx.type === "invoice";

      // Icono seguro
      const iconName = isInvoice ? "fileText" : "check";

      // Clases de color
      const amountClass = isInvoice ? "amount-red" : "amount-green";
      const borderClass = isInvoice ? "border-red" : "border-green";
      const symbol = isInvoice ? "+" : "-";
      const bgIconClass = isInvoice ? "bg-red-soft" : "bg-green-soft";

      // --- Lógica de Fecha (Evitar NaN) ---
      let dateObj;
      try {
        // Intentamos parsear. Si viene string 'YYYY-MM-DD' funciona directo con new Date
        dateObj = new Date(tx.date);
        // Si da inválido, intentamos dateUtils (si tu sistema usa formato DD/MM/YYYY)
        if (isNaN(dateObj.getTime())) {
          dateObj = dateUtils.parse(tx.date);
        }
      } catch (e) {
        dateObj = new Date();
      }

      const dayNumber = !isNaN(dateObj) ? dateObj.getDate() : "--";
      // Mes corto en mayúsculas (Ej: DIC, ENE)
      const monthShort = !isNaN(dateObj)
        ? dateObj
            .toLocaleString("es-ES", { month: "short" })
            .substring(0, 3)
            .toUpperCase()
            .replace(".", "")
        : "-";

      const row = el(
        "div",
        {
          className: `tx-card-row ${borderClass}`,
          onclick: () => onTransactionClick && onTransactionClick(tx),
        },
        // IZQUIERDA: Icono + Fecha
        el(
          "div",
          { className: "tx-left" },
          // Icono circular
          el(
            "div",
            { className: `tx-icon-box ${bgIconClass}` },
            Icon(iconName)
          ),

          // Fecha Rectangular
          el(
            "div",
            { className: "date-badge" },
            el("span", { className: "day-number" }, dayNumber),
            el("span", { className: "month-label" }, monthShort)
          )
        ),
        // CENTRO: Info
        el(
          "div",
          { className: "tx-center" },
          el(
            "strong",
            { className: "tx-type-label" },
            isInvoice ? "Boleta de Compra" : "Pago Realizado"
          ),
          tx.description
            ? el("span", { className: "tx-desc" }, tx.description)
            : null
        ),
        // DERECHA: Montos
        el(
          "div",
          { className: "tx-right" },
          el(
            "span",
            { className: `tx-amount ${amountClass}` },
            isHidden ? "•••••" : `${symbol} ${formatCurrency(tx.amount)}`
          ),
          tx.historicalBalance !== undefined
            ? el(
                "span",
                { className: "tx-running-balance" },
                `Saldo: ${formatCurrency(tx.historicalBalance)}`
              )
            : null
        )
      );
      listContainer.appendChild(row);
    });

    listWrapper.appendChild(listContainer);
  };

  window.addEventListener("toggle-amounts", (e) => {
    isHidden = e.detail;
    renderHeroAmount();
    renderTransactionList();
  });

  renderHeroAmount();
  renderTransactionList();

  return el(
    "div",
    { className: "supplier-detail-view fade-in" },

    // Tarjeta superior de saldo
    el(
      "div",
      { className: "detail-top-card" },
      el(
        "div",
        { className: "balance-section" },
        el("span", { className: "label-muted" }, "Deuda Total Pendiente"),
        heroAmountContainer
      ),
      el("div", { className: "actions-section" }) // Espacio reservado
    ),

    el("h4", { className: "section-title" }, "Historial de Cuenta"),
    listWrapper
  );
}
