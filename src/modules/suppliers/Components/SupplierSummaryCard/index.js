import { el } from "../../../../core/dom.js";
import { SupplierModel } from "../../model.js";
import { Button } from "../../../../shared/ui/Button/index.js"; // Usamos el botón compartido
import "./style.css";

export const SupplierSummaryCard = ({
  totalDebt,
  isVisible,
  onToggleVisibility,
  onNewSupplier,
  onGlobalTransaction,
}) => {
  // Iconos
  const iconEye = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  const iconEyeOff = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
  const iconPlus = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
  const iconInvoice = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`;

  // Botón Visibilidad
  const btnVisibility = el("button", {
    className: "btn-icon-toggle",
    onclick: onToggleVisibility,
    innerHTML: isVisible ? iconEye : iconEyeOff,
    title: isVisible ? "Ocultar montos" : "Mostrar montos",
  });

  return el("div", { className: "summary-card-container" }, [
    // Sección Izquierda: Título y Deuda
    el("div", { className: "summary-info-group" }, [
      el("div", { className: "summary-label-row" }, [
        el("span", { className: "summary-label" }, "DEUDA TOTAL GENERAL"),
        btnVisibility,
      ]),
      el("div", { className: "summary-amount-row" }, [
        el(
          "span",
          {
            className: `total-debt-display ${totalDebt > 0 ? "text-danger" : "text-success"}`,
            dataset: { amount: totalDebt },
          },
          SupplierModel.formatAmount(totalDebt, isVisible),
        ),
      ]),
    ]),

    // Sección Derecha: Acciones
    el("div", { className: "summary-actions-group" }, [
      Button({
        text: "Nuevo",
        icon: iconPlus,
        variant: "secondary",
        onClick: onNewSupplier,
      }),
      Button({
        text: "Boleta",
        icon: iconInvoice,
        variant: "primary", // Botón negro sólido para la acción principal
        onClick: onGlobalTransaction,
      }),
    ]),
  ]);
};
