import { el } from "../../../../core/dom.js";
import "./style.css";

export function StockReportModal({ supplier, movements, onClose }) {
  // Lógica de consolidación
  const calculateStockBalances = () => {
    const totals = {};

    movements.forEach((m) => {
      const isEntry = m.type === "invoice"; // Entrada de stock

      if (m.items && Array.isArray(m.items)) {
        m.items.forEach((item) => {
          const name = item.name || item.description || "Item sin nombre";
          const qty = parseFloat(item.quantity || item.qty || 0);

          if (!totals[name]) totals[name] = 0;

          // Si es Boleta suma a la deuda física, si es Pago/Devolución resta
          totals[name] += isEntry ? qty : -qty;
        });
      }
    });

    return Object.entries(totals)
      .map(([name, balance]) => ({ name, balance }))
      .filter((item) => item.balance !== 0); // Solo mostrar lo que realmente se debe
  };

  const balances = calculateStockBalances();

  return el(
    "div",
    {
      className: "modal-overlay",
      onclick: (e) => e.target.className === "modal-overlay" && onClose(),
    },
    [
      el("div", { className: "modal-content-optimized scale-in" }, [
        el("div", { className: "modal-header-info" }, [
          el(
            "span",
            { className: "modal-subtitle" },
            "ESTADO DE CUENTA FÍSICO"
          ),
          el("h2", {}, supplier.name),
        ]),

        el("div", { className: "stock-report-body" }, [
          balances.length > 0
            ? el("div", { className: "stock-balance-grid" }, [
                el("div", { className: "grid-header" }, [
                  el("span", {}, "Artículo"),
                  el("span", { className: "text-right" }, "Pendiente"),
                ]),
                ...balances.map((item) =>
                  el("div", { className: "grid-row" }, [
                    el("span", { className: "item-name-report" }, item.name),
                    el(
                      "span",
                      {
                        className: `item-qty-report ${
                          item.balance > 0 ? "text-danger" : "text-success"
                        }`,
                      },
                      `${item.balance > 0 ? "+" : ""}${item.balance}`
                    ),
                  ])
                ),
              ])
            : el(
                "div",
                { className: "empty-state-stock" },
                "No hay pendientes de stock con este proveedor."
              ),
        ]),

        el("div", { className: "modal-footer" }, [
          el(
            "button",
            { className: "btn-confirm", onclick: onClose },
            "Cerrar Reporte"
          ),
        ]),
      ]),
    ]
  );
}
