import { el } from "../../../../core/dom.js";
import { SupplierModel } from "../../model.js";
import "./style.css";

export function SupplierCard({
  supplier,
  isVisible,
  onClick,
  onAddTransaction,
  lastTransaction,
}) {
  const currentBalance = parseFloat(supplier.balance) || 0;

  // --- LÓGICA DE ESTADO VISUAL ---
  const getStatusClass = (bal) => {
    if (bal > 0.01) return "status-debt";
    if (bal < -0.01) return "status-credit";
    return "status-neutral";
  };

  // --- ICONOS ---
  const iconPlus = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
  const iconCopy = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="0" ry="0"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;

  const hasAlias = !!supplier.alias;
  const aliasText = hasAlias ? supplier.alias : "PLACEHOLDER";

  // --- BLOQUE ÚLTIMO MOVIMIENTO ---
  let lastMoveBlock = null;

  if (lastTransaction) {
    const dateObj = lastTransaction.date.seconds
      ? new Date(lastTransaction.date.seconds * 1000)
      : new Date(lastTransaction.date);

    const day = dateObj.getDate().toString().padStart(2, "0");
    const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
    const year = dateObj.getFullYear().toString().slice(-2);
    const dateStr = `${day}.${month}.${year}`;

    const amountStr = SupplierModel.formatAmount(
      lastTransaction.amount,
      isVisible,
    );

    const type = (lastTransaction.type || "").toLowerCase().trim();
    const isTxDebt =
      type === "invoice" || type === "boleta" || type === "deuda";
    const valClass = isTxDebt ? "val-debt" : "val-payment";

    lastMoveBlock = el("div", { className: "last-move-block" }, [
      el("span", { className: "tech-label-small" }, "ÚLTIMO MOVIMIENTO"),
      el("div", { className: "last-move-row" }, [
        el("span", { className: "move-date" }, dateStr),
        el("span", { className: `move-amount ${valClass}` }, amountStr),
      ]),
    ]);
  } else {
    lastMoveBlock = el("div", { className: "last-move-block empty" }, [
      el("span", { className: "tech-label-small" }, "ÚLTIMO MOVIMIENTO"),
      el("div", { className: "last-move-row" }, [
        el("span", { className: "move-empty" }, "SIN REGISTROS"),
      ]),
    ]);
  }

  // --- RENDER CARD ---
  const card = el(
    "div",
    {
      className: `tech-supplier-card ${getStatusClass(currentBalance)}`,
      onclick: onClick,
      "data-id": supplier.id,
    },
    [
      el("div", { className: "card-status-bar" }),
      el("div", { className: "card-content-stack" }, [
        // TOP: Nombre y Alias
        el("div", { className: "card-row-top" }, [
          el("h3", { className: "supplier-name" }, supplier.name),
          el(
            "div",
            {
              className: `alias-tag ${hasAlias ? "" : "is-placeholder"}`,
              onclick: (e) => {
                if (!hasAlias) return;
                e.stopPropagation();
                navigator.clipboard.writeText(supplier.alias);
              },
            },
            [el("span", { innerHTML: iconCopy }), el("span", {}, aliasText)],
          ),
        ]),

        // MIDDLE: Bloque Técnico de Último Movimiento
        lastMoveBlock,

        // BOTTOM: Saldo y Botón
        el("div", { className: "card-row-bottom" }, [
          el("div", { className: "balance-wrapper" }, [
            el("span", { className: "tech-label" }, "SALDO ACTUAL"),
            el(
              "span",
              {
                className: `balance-display ${
                  currentBalance > 0.01
                    ? "color-debt"
                    : currentBalance < -0.01
                      ? "color-credit"
                      : "color-neutral"
                }`,
                "data-amount": currentBalance,
              },
              SupplierModel.formatAmount(currentBalance, isVisible),
            ),
          ]),
          el("button", {
            className: "btn-square-add",
            onclick: (e) => {
              e.stopPropagation();
              onAddTransaction(supplier);
            },
            innerHTML: iconPlus,
          }),
        ]),
      ]),
    ],
  );

  return card;
}
