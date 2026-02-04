import { el } from "../../../../core/dom.js";
import { SupplierModel } from "../../model.js";
import "./style.css";

export function SupplierDetailHeader({ supplier, isVisible }) {
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

  // Icono Copiar (Minimalista)
  const iconCopy = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;

  return el("div", { className: "tech-header-card fade-in" }, [
    // 1. TOP ROW: Identidad (Nombre + Badge)
    el("div", { className: "header-top-block" }, [
      el("div", { className: "identity-col" }, [
        el(
          "span",
          { className: "header-micro-label" },
          "RAZÓN SOCIAL / NOMBRE",
        ),
        el("h1", { className: "supplier-hero-name" }, supplier.name),
      ]),
      el("div", { className: "badge-col" }, [
        el(
          "span",
          {
            className: `tech-badge ${supplier.type === "stock" ? "badge-dark" : "badge-light"}`,
          },
          supplier.type === "stock"
            ? "PROVEEDOR DE STOCK"
            : "PROVEEDOR MONETARIO",
        ),
      ]),
    ]),

    // 2. MIDDLE ROW: Estado Financiero (Saldo)
    el("div", { className: "header-balance-block" }, [
      el("div", { className: "balance-wrapper" }, [
        el(
          "span",
          { className: "header-micro-label" },
          "ESTADO DE CUENTA ACTUAL",
        ),
        el(
          "div",
          {
            id: "main-balance-display",
            className: `balance-hero-text ${isDebt ? "color-debt" : "color-ok"}`,
          },
          SupplierModel.formatAmount(supplier.balance, isVisible),
        ),
      ]),
    ]),

    // 3. BOTTOM ROW: Grid de Datos (Alias, Contacto, Fecha)
    el("div", { className: "header-data-grid" }, [
      // Dato 1: CBU/Alias
      el("div", { className: "data-cell" }, [
        el("span", { className: "cell-label" }, "ALIAS / CBU / CVU"),
        el("div", { className: "cell-content-row" }, [
          el("span", { className: "cell-value-mono" }, supplier.alias || "-"),
          supplier.alias
            ? el("button", {
                className: "btn-copy-mini",
                title: "Copiar al portapapeles",
                onclick: () => {
                  navigator.clipboard.writeText(supplier.alias);
                  // Feedback visual rápido podría ir aquí
                },
                innerHTML: iconCopy,
              })
            : null,
        ]),
      ]),

      // Dato 2: Contacto
      el("div", { className: "data-cell border-desktop-left" }, [
        el("span", { className: "cell-label" }, "CONTACTO DIRECTO"),
        el(
          "span",
          { className: "cell-value-sans" },
          supplier.contactInfo || "No registrado",
        ),
      ]),

      // Dato 3: Actualización
      el("div", { className: "data-cell border-desktop-left" }, [
        el("span", { className: "cell-label" }, "ÚLTIMA ACTUALIZACIÓN"),
        el(
          "span",
          { className: "cell-value-mono muted" },
          getUpdateString(supplier.lastUpdate),
        ),
      ]),
    ]),
  ]);
}
