import { el } from "../../../../core/dom.js";
import { SupplierModel } from "../../model.js";
import "./style.css";

export function SupplierDetailHeader({ supplier, isVisible }) {
  const balance = parseFloat(supplier.balance) || 0;
  const status = SupplierModel.calculateStatus(balance);
  const truckSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>`;
  const iconCopy = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;

  return el(
    "div",
    { className: `detail-header-v1 status-border-${status}` },
    el(
      "div",
      { className: "header-left" },
      el("div", {
        className: `circle-icon circle-${status}`,
        innerHTML: truckSVG,
      }),
      el("div", { className: "header-info" }, [
        el("h2", { className: "name-v1" }, supplier.name),
        supplier.alias
          ? el(
              "div",
              {
                className: "alias-pill",
                onclick: () => navigator.clipboard.writeText(supplier.alias),
                title: "Copiar alias",
              },
              [
                el("span", { innerHTML: iconCopy }),
                el("span", {}, supplier.alias),
              ]
            )
          : el("span", { className: "alias-v1" }, "Sin alias"),
      ])
    ),
    el(
      "div",
      { className: "header-right" },
      el("span", { className: "label-v1" }, "SALDO ACTUAL"),
      el(
        "h1",
        { id: "main-balance-display", className: `amount-v1 text-${status}` },
        SupplierModel.formatAmount(balance, isVisible)
      )
    )
  );
}
