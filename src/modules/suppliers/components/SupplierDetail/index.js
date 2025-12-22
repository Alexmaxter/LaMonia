import { el } from "../../../../core/dom.js";
import { Icon } from "../../../../shared/ui/Icon.js";
import { Button } from "../../../../shared/ui/Button/index.js";
import { formatCurrency } from "../../../../core/utils/currency.js";
import { dateUtils } from "../../../../core/utils/dateUtils.js";
import "./style.css";

export function SupplierDetail({
  supplier,
  transactions = [],
  onTransactionClick,
  onOpenPdf,
  onOpenConfig,
  onNewMovement,
}) {
  const isStock = supplier.providerType === "stock";

  // Configuración de visualización: Rojo para boletas, Verde para pagos/notas
  const getTypeConfig = (type) => {
    switch (type) {
      case "invoice":
        return { label: "Boleta", icon: "clipboard", className: "tx-danger" };
      case "payment":
        return { label: "Pago", icon: "dollarSign", className: "tx-success" };
      case "note":
      case "credit_note":
        return {
          label: "Nota de Crédito",
          icon: "fileMinus",
          className: "tx-success-light",
        };
      default:
        return { label: "Movimiento", icon: "box", className: "tx-neutral" };
    }
  };

  const rawTxs = transactions.map((t) => ({
    ...t,
    dateObj: dateUtils.parse(t.date) || new Date(),
  }));

  const chronTxs = [...rawTxs].sort((a, b) => a.dateObj - b.dateObj);
  let runningBalance = 0;

  // --- LÓGICA AGREGADA: CÁLCULO DE TOTALES DE ITEMS PARA EL SALDO SUPERIOR ---
  const totalsMap = {};

  const processedTxs = chronTxs.map((t) => {
    const amount = parseFloat(t.amount || 0);
    if (t.type === "invoice") runningBalance += amount;
    else runningBalance -= amount;

    // Sumar items para el total de la tarjeta
    if (t.items) {
      t.items.forEach((item) => {
        totalsMap[item.name] =
          (totalsMap[item.name] || 0) + (item.quantity || 0);
      });
    }

    return { ...t, snapshotBalance: runningBalance };
  });

  const viewTxs = [...processedTxs].reverse();

  // Texto de items totales (ej: "15 hielo | 10 bidón")
  const totalItemsString = Object.entries(totalsMap)
    .map(([name, qty]) => `${qty} ${name}`)
    .join(" | ");

  return el(
    "div",
    { className: "supplier-detail-container" },
    el(
      "div",
      { className: "supplier-header-card" },
      el(
        "div",
        { className: "header-top-row" },
        el(
          "div",
          { className: "header-identity" },
          el(
            "div",
            { className: "header-avatar" },
            Icon(isStock ? "box" : "users")
          ),
          el(
            "div",
            { className: "header-info" },
            el("h2", { className: "header-name" }, supplier.name),
            supplier.cuit
              ? el(
                  "div",
                  { className: "header-meta" },
                  `CUIT: ${supplier.cuit}`
                )
              : null
          )
        ),
        el(
          "div",
          { className: "header-balance" },
          el(
            "span",
            { className: "balance-label" },
            isStock ? "Ítems Totales" : "Saldo Total"
          ),
          el(
            "div",
            {
              className: `balance-amount ${
                supplier.balance > 0 ? "text-debt" : "text-favor"
              }`,
            },
            // CAMBIO PUNTUAL: Mostrar items totales si es stock, sino dinero
            isStock && totalItemsString
              ? totalItemsString
              : formatCurrency(supplier.balance)
          )
        )
      ),
      el("div", { className: "header-divider" }),
      el(
        "div",
        { className: "header-actions" },
        Button({
          text: "Reporte",
          icon: "fileText",
          variant: "secondary",
          onClick: onOpenPdf,
        }),
        Button({
          text: "Configurar",
          icon: "settings",
          variant: "secondary",
          onClick: onOpenConfig,
        }),
        Button({
          text: "Nuevo Movimiento",
          icon: "plus",
          variant: "primary",
          onClick: onNewMovement,
        })
      )
    ),

    el("h3", { className: "section-title" }, "Historial de Movimientos"),

    el(
      "div",
      { className: "tx-list-wrapper" },
      viewTxs.length === 0
        ? el(
            "div",
            { className: "empty-state-container" },
            "No hay movimientos"
          )
        : viewTxs.map((t) => {
            const config = getTypeConfig(t.type);
            const isInvoice = t.type === "invoice";

            const itemsText =
              t.items && t.items.length > 0
                ? t.items.map((i) => `${i.quantity} ${i.name}`).join(" | ")
                : "";

            return el(
              "div",
              {
                className: "tx-card",
                onclick: () => onTransactionClick && onTransactionClick(t),
              },
              el(
                "div",
                { className: `tx-icon-wrapper ${config.className}` },
                Icon(config.icon)
              ),
              el(
                "div",
                { className: "tx-info" },
                el(
                  "div",
                  { className: "tx-main-text" },
                  t.invoiceNumber ? `Boleta #${t.invoiceNumber}` : config.label
                ),
                el(
                  "div",
                  { className: "tx-sub-text" },
                  dateUtils.format(t.dateObj)
                )
              ),
              el(
                "div",
                { className: "tx-amount-col" },
                isStock && isInvoice && itemsText
                  ? el(
                      "div",
                      { className: `tx-items-display ${config.className}` },
                      itemsText
                    )
                  : el(
                      "div",
                      { className: `tx-amount ${config.className}` },
                      `${isInvoice ? "+ " : "- "}${formatCurrency(t.amount)}`
                    ),
                el(
                  "small",
                  { className: "tx-balance-snap" },
                  `Saldo: ${formatCurrency(t.snapshotBalance)}`
                )
              )
            );
          })
    )
  );
}
