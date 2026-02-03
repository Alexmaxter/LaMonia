import { el } from "../../../../core/dom.js";
import { SupplierModel } from "../../model.js";
import "./style.css";

export function SupplierCard({
  supplier,
  isVisible,
  onClick,
  onAddTransaction,
}) {
  const balance = parseFloat(supplier.balance) || 0;
  const iconPlus = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;

  return el("div", { className: "supplier-card", onclick: onClick }, [
    el("div", { className: "card-info" }, [
      el("h3", { className: "card-name" }, supplier.name),
      el("span", { className: "card-alias" }, supplier.alias || "Sin alias"),
    ]),

    el("div", { className: "card-balance" }, [
      el("span", { className: "balance-label" }, "DEUDA TOTAL"),
      el(
        "span",
        {
          className: `balance-value ${
            balance > 0 ? "text-danger" : "text-success"
          }`,
          // ESTA ES LA MEMORIA: Guardamos el número real aquí
          "data-amount": balance,
        },
        SupplierModel.formatAmount(balance, isVisible)
      ),
    ]),

    el("button", {
      className: "btn-quick-add-v1",
      onclick: onAddTransaction,
      innerHTML: iconPlus,
    }),
  ]);
}
