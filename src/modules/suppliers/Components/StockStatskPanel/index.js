import { el } from "../../../../core/dom.js";
import "./style.css";

export function StockStatsPanel({ movements }) {
  // 1. CÁLCULO DE SALDO DE STOCK (NETO) CON COLORES
  // Estructura: { "HIELO": { qty: 5, color: "#ff0000" } }
  const stockBalance = {};

  movements.forEach((m) => {
    // Verificamos si tiene items y si es un array válido
    if (m.items && Array.isArray(m.items) && m.items.length > 0) {
      // Lógica de Signos:
      // Invoice (Boleta) = Aumenta la deuda de stock (+)
      // Payment (Pago) o Credit (Nota) = Disminuye la deuda de stock (-)
      // Nota: Usamos type.toLowerCase() por seguridad
      const type = m.type ? m.type.toLowerCase() : "";
      const isEntry = type === "invoice";
      const isExit = type === "payment" || type === "credit";

      m.items.forEach((item) => {
        const name = item.name ? item.name.trim().toUpperCase() : "";
        if (!name) return; // Saltamos items sin nombre

        const qty = parseFloat(item.quantity || item.qty || 0);
        const color = item.color || "#ddd"; // Color del ítem (fallback gris)

        if (qty > 0) {
          if (!stockBalance[name]) {
            stockBalance[name] = { qty: 0, color: color };
          }

          // Actualizamos cantidad según tipo de movimiento
          if (isEntry) {
            stockBalance[name].qty += qty;
          } else if (isExit) {
            stockBalance[name].qty -= qty;
          }

          // Aseguramos que el color sea el último conocido (por si cambia en la configuración)
          // Solo actualizamos si el nuevo color es válido (diferente al default)
          if (color !== "#ddd") stockBalance[name].color = color;
        }
      });
    }
  });

  // 2. FILTRADO Y ORDENAMIENTO
  // Solo mostramos ítems con deuda pendiente (mayor a 0.01 para evitar residuos flotantes)
  const reportData = Object.entries(stockBalance)
    .map(([name, data]) => ({
      name,
      totalQty: data.qty,
      color: data.color,
    }))
    .filter((item) => item.totalQty > 0.01)
    .sort((a, b) => b.totalQty - a.totalQty); // Orden descendente por cantidad

  // Si no hay deuda de stock (todo pagado o vacío), no mostramos el panel
  if (reportData.length === 0) return null;

  // 3. RENDERIZADO
  return el("div", { className: "stock-manifest-panel" }, [
    el("div", { className: "manifest-header" }, [
      el("div", { className: "title-group" }, [
        el("span", { className: "manifest-title" }, "STOCK PENDIENTE"),
        el(
          "span",
          { className: "manifest-count" },
          `${reportData.length} ÍTEMS`,
        ),
      ]),
      el("div", { className: "tech-status-badge" }, "CONTINGENTE"),
    ]),

    el(
      "div",
      { className: "manifest-grid" },
      reportData.map((item) =>
        el("div", { className: "manifest-row" }, [
          // Indicador de color circular
          el("span", {
            className: "item-color-indicator",
            style: `background-color: ${item.color};`,
          }),
          el("span", { className: "item-name" }, item.name),
          el("div", { className: "dots-fill" }),
          el(
            "span",
            { className: "item-qty-debt" },
            item.totalQty.toLocaleString("es-AR"),
          ),
        ]),
      ),
    ),

    el("div", { className: "manifest-footer" }, [
      el("span", {}, "RESUMEN TÉCNICO DE EXISTENCIAS"),
      el(
        "span",
        { className: "footer-date" },
        new Date().toLocaleDateString("es-AR"),
      ),
    ]),
  ]);
}
