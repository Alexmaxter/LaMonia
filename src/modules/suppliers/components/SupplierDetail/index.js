// src/modules/suppliers/components/SupplierDetail/index.js
import { el } from "../../../../core/dom.js";
import { Icon } from "../../../../shared/ui/Icon.js";
import "./style.css";

export function SupplierDetail({
  supplier,
  transactions = [],
  onDeleteTransaction,
  onEditTransaction,
  onOpenPdf,
  onOpenConfig,
  onNewMovement,
}) {
  const isStock = supplier.providerType === "stock";

  // =======================================================
  // 1. CÁLCULO CONTABLE
  // =======================================================
  const compareTransactions = (a, b) => {
    const dateA = a.dateObj.getTime();
    const dateB = b.dateObj.getTime();
    if (dateA !== dateB) return dateA - dateB;
    const createdA = a.createdAt?.seconds ? a.createdAt.seconds : 0;
    const createdB = b.createdAt?.seconds ? b.createdAt.seconds : 0;
    if (createdA !== createdB) return createdA - createdB;
    return (a.id || "").localeCompare(b.id || "");
  };

  const rawTxs = transactions.map((t) => ({
    ...t,
    dateObj: t.date?.seconds
      ? new Date(t.date.seconds * 1000)
      : new Date(t.date),
  }));
  const chronTxs = [...rawTxs].sort(compareTransactions);
  let processedTxs = [];

  if (isStock) {
    processedTxs = chronTxs;
  } else {
    const currentBalance = parseFloat(supplier.balance || 0);
    const historySum = chronTxs.reduce((sum, t) => {
      const amount = parseFloat(t.amount || 0);
      return t.type === "invoice" ? sum + amount : sum - amount;
    }, 0);
    const initialDrift = currentBalance - historySum;
    let runningBalance = initialDrift;

    processedTxs = chronTxs.map((t) => {
      const amount = parseFloat(t.amount || 0);
      if (t.type === "invoice") runningBalance += amount;
      else runningBalance -= amount;
      return { ...t, snapshotBalance: runningBalance };
    });
  }
  const viewTxs = [...processedTxs].sort((a, b) => compareTransactions(b, a));

  // =======================================================
  // 2. HEADER VISUAL
  // =======================================================

  let balanceFormatted = "";
  let balanceRawClass = "";
  let statusText = "";

  if (isStock) {
    const debts = supplier.stockDebt || {};
    const items = Object.entries(debts).filter(([_, qty]) => qty > 0);
    if (items.length === 0) {
      balanceFormatted = "Sin deuda";
      balanceRawClass = "color-pay";
      statusText = "Estado";
    } else {
      balanceFormatted = items.map(([k, q]) => `${q} ${k}`).join(" | ");
      balanceRawClass = "color-stock";
      statusText = "Stock Pendiente";
    }
  } else {
    const bal = parseFloat(supplier.balance || 0);
    balanceFormatted = new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(bal);

    if (bal > 10) {
      balanceRawClass = "color-debt";
      statusText = "Deuda Total";
    } else if (bal < -10) {
      balanceRawClass = "color-pay";
      statusText = "Saldo a Favor";
    } else {
      balanceRawClass = "color-pay";
      statusText = "Cuenta al día";
    }
  }

  // --- LÓGICA DE PRIVACIDAD ---
  let isBalanceVisible = true;

  const amountEl = el(
    "span",
    { className: `sh-amount ${balanceRawClass}` },
    balanceFormatted
  );

  const toggleBtn = el(
    "button",
    {
      className: "toggle-balance-btn",
      title: "Mostrar/Ocultar saldo",
    },
    Icon("eye")
  );

  // Botones de Acción
  const btnConfig = el(
    "button",
    { className: "card-action-btn btn-secondary", onclick: onOpenConfig },
    Icon("settings"),
    el("span", {}, "Config")
  );
  const btnPdf = el(
    "button",
    { className: "card-action-btn btn-secondary", onclick: onOpenPdf },
    Icon("fileText"),
    el("span", {}, "Ver PDF")
  );
  const btnNew = el(
    "button",
    { className: "card-action-btn btn-primary", onclick: onNewMovement },
    Icon("plus"),
    el("span", {}, "Nuevo")
  );

  const actionsRow = el(
    "div",
    { className: "card-actions-row" },
    btnPdf,
    btnConfig,
    btnNew
  );

  const headerCard = el(
    "div",
    { className: "supplier-header-card" },
    el(
      "div",
      { className: "card-top-row" },
      el(
        "div",
        { className: "header-left" },
        el("div", { className: "sh-name" }, supplier.name),
        supplier.alias
          ? el(
              "div",
              {
                className: "sh-alias-badge",
                onclick: () => {
                  navigator.clipboard.writeText(supplier.alias);
                  alert("Alias copiado");
                },
              },
              Icon("copy"),
              " " + supplier.alias
            )
          : null
      ),
      el(
        "div",
        { className: "header-right" },
        el("span", { className: "sh-label" }, statusText),
        el("div", { className: "balance-wrapper" }, amountEl, toggleBtn)
      )
    ),
    el("div", { className: "card-divider" }),
    actionsRow
  );

  // =======================================================
  // 3. LISTA DE MOVIMIENTOS
  // =======================================================

  let transactionListContent;
  if (viewTxs.length === 0) {
    transactionListContent = el(
      "div",
      { className: "empty-history" },
      "No hay movimientos registrados."
    );
  } else {
    const cards = viewTxs.map((t) => {
      const day = t.dateObj.getDate();
      const month = t.dateObj
        .toLocaleDateString("es-AR", { month: "short" })
        .toUpperCase()
        .replace(".", "");

      let amountStr = "";
      let colorClass = "";
      let borderClass = "";
      let typeLabel = "";
      let snapshotBalanceStr = null;

      if (isStock) {
        const itemsStr = (t.items || [])
          .map((i) => `${i.quantity} ${i.name}`)
          .join(", ");
        amountStr = (t.type === "invoice" ? "+ " : "- ") + itemsStr;
        colorClass = "color-stock";
        borderClass = "border-l-stock";
        typeLabel = t.type === "invoice" ? "Entrada" : "Salida";
      } else {
        const val = parseFloat(t.amount);
        const moneyFmt = new Intl.NumberFormat("es-AR", {
          style: "currency",
          currency: "ARS",
        });
        amountStr = moneyFmt.format(val);

        if (t.type === "invoice") {
          typeLabel = t.invoiceNumber ? `Boleta #${t.invoiceNumber}` : "Boleta";
          amountStr = "+ " + amountStr;
          colorClass = "color-debt";
          borderClass = "border-l-debt";
        } else {
          typeLabel = t.type === "payment" ? "Pago" : "Nota Crédito";
          amountStr = "- " + amountStr;
          colorClass = "color-pay";
          borderClass = "border-l-pay";
        }

        if (t.snapshotBalance !== undefined) {
          const snapVal = moneyFmt.format(t.snapshotBalance);
          const snapColor = t.snapshotBalance > 5 ? "#dc2626" : "#16a34a";
          // IMPORTANTE: Clase 'sensitive-data' añadida
          snapshotBalanceStr = el(
            "div",
            {
              className: "sensitive-data",
              style: `font-size: 0.75rem; color: ${snapColor}; margin-top: 4px; font-weight: 600; text-align: right;`,
            },
            `Saldo: ${snapVal}`
          );
        }
      }

      return el(
        "div",
        {
          className: `trans-card ${borderClass}`,
          onclick: () => onEditTransaction(t),
        },
        el(
          "div",
          { className: "trans-date-box" },
          el("span", { className: "td-day" }, day),
          el("span", { className: "td-month" }, month)
        ),
        el(
          "div",
          { className: "trans-info" },
          el("span", { className: "ti-desc" }, typeLabel),
          el(
            "span",
            { className: "ti-meta" },
            t.description ||
              t.dateObj.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
          )
        ),
        el(
          "div",
          { className: "trans-amounts-col" },
          // IMPORTANTE: Clase 'sensitive-data' añadida
          el(
            "div",
            { className: `trans-amount ${colorClass} sensitive-data` },
            amountStr
          ),
          snapshotBalanceStr
        )
      );
    });
    transactionListContent = el(
      "div",
      { className: "transaction-list" },
      ...cards
    );
  }

  const container = el(
    "div",
    { className: "detail-container" },
    headerCard,
    el(
      "h3",
      { style: { fontSize: "1rem", color: "#666", margin: "10px 0 5px 5px" } },
      "Historial de Cuenta"
    ),
    transactionListContent
  );

  // --- LÓGICA DEL TOGGLE (Texto x Puntos) ---
  toggleBtn.onclick = () => {
    isBalanceVisible = !isBalanceVisible;

    // 1. Header Balance
    amountEl.textContent = isBalanceVisible ? balanceFormatted : "••••••••";
    if (isBalanceVisible) {
      amountEl.className = `sh-amount ${balanceRawClass}`;
    } else {
      amountEl.className = `sh-amount amount-hidden`;
    }

    // 2. Icono
    toggleBtn.innerHTML = "";
    toggleBtn.appendChild(Icon(isBalanceVisible ? "eye" : "eyeOff"));

    // 3. Lista de Movimientos (Reemplazo de texto)
    const sensitiveEls = container.querySelectorAll(".sensitive-data");
    sensitiveEls.forEach((el) => {
      if (!isBalanceVisible) {
        // Ocultar: Guardamos valor original en dataset y mostramos puntos
        if (!el.dataset.realValue) {
          el.dataset.realValue = el.textContent;
        }
        el.textContent = "••••••••";
        el.classList.add("amount-hidden-text"); // Clase para estilo grisáceo
      } else {
        // Mostrar: Restauramos desde dataset
        if (el.dataset.realValue) {
          el.textContent = el.dataset.realValue;
        }
        el.classList.remove("amount-hidden-text");
      }
    });
  };

  return container;
}
