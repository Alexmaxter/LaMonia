import { el } from "../../../../core/dom.js";
import { SupplierModel } from "../../model.js";
import "./style.css";

export function SupplierDetailHeader({ supplier, isVisible, onSettleDebt }) {
  // --- HELPERS ---
  const getUpdateString = (date) => {
    if (!date) return "SIN ACTIVIDAD";
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isDebt = supplier.balance > 0;

  // Iconos
  const iconCopy = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
  const iconCheck = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

  // --- BLOQUE 1: IDENTIDAD ---
  const topBlock = el("div", { className: "header-top-block" }, [
    el("div", { className: "identity-col" }, [
      el("h1", { className: "supplier-hero-name" }, supplier.name),
      el("div", { className: "supplier-meta-row" }, [
        el("span", { className: "pill-id" }, `ID: ${supplier.id.slice(0, 4)}`),
        el(
          "span",
          { className: "pill-type" },
          supplier.type === "stock" ? "STOCK MIXTO" : "MONETARIO",
        ),
      ]),
    ]),
    el("div", { className: "contact-col" }, [
      supplier.cuit
        ? el(
            "button",
            {
              className: "btn-copy-mini",
              title: "Copiar CUIT",
              onclick: () => navigator.clipboard.writeText(supplier.cuit),
            },
            [el("span", { innerHTML: iconCopy }), supplier.cuit],
          )
        : null,

      supplier.phone
        ? el(
            "a",
            {
              className: "link-contact-mini",
              href: `https://wa.me/${supplier.phone.replace(/[^0-9]/g, "")}`,
              target: "_blank",
            },
            "WHATSAPP",
          )
        : null,
    ]),
  ]);

  // --- BLOQUE 2: SALDO Y ACCIONES ---
  const balanceValue = SupplierModel.formatAmount(supplier.balance, isVisible);
  const balanceClass =
    supplier.balance > 0
      ? "negative"
      : supplier.balance < 0
        ? "positive"
        : "neutral";

  // Botón Saldar Deuda (Solo si hay deuda positiva)
  let settleButton = null;
  if (isDebt) {
    settleButton = el(
      "button",
      {
        className: "btn-settle-debt",
        onclick: (e) => {
          e.stopPropagation();
          if (onSettleDebt) onSettleDebt();
        },
      },
      [el("span", { innerHTML: iconCheck }), "SALDAR DEUDA"],
    );
  }

  const balanceBlock = el("div", { className: "header-balance-block" }, [
    el("div", {}, [
      el("span", { className: "header-micro-label" }, "ESTADO DE CUENTA"),
      el("div", { className: "balance-row" }, [
        el(
          "span",
          {
            className: `balance-hero-text ${balanceClass}`,
            "data-amount": supplier.balance,
          },
          balanceValue,
        ),
        settleButton, // Insertamos el botón aquí
      ]),
    ]),
    el("div", { className: "last-update-box" }, [
      el("span", { className: "header-micro-label" }, "ÚLTIMO MOVIMIENTO"),
      el(
        "span",
        { className: "last-update-date" },
        getUpdateString(supplier.lastTransactionDate),
      ),
    ]),
  ]);

  // CONTENEDOR PRINCIPAL
  return el("div", { className: "tech-header-card" }, [topBlock, balanceBlock]);
}
