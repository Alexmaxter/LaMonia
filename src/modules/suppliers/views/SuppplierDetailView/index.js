import { el } from "../../../../core/dom.js";
import { SupplierModel } from "../../model.js";
import { SupplierDetailHeader } from "../../Components/SupplierDetailHeader/index.js";
import { MovementList } from "../../Components/MovementList/index.js";
import { StockReportModal } from "../../Components/StockReportModal/index.js";
import "./style.css";

export function SupplierDetailView({
  supplier,
  movements,
  isVisible,
  onBack,
  onToggleVisibility,
  onAddMovement,
  onDeleteMovement,
  onEditMovement,
  onOpenSettings,
  onGenerateReport, // Nueva prop para la descarga del PDF
}) {
  // --- ICONOS ---
  const arrowLeftIcon = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>`;
  const eyeIcon = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const eyeOffIcon = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
  const boxIcon = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`;
  const settingsIcon = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
  const fileTextIcon = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;

  const handleToggle = (e) => {
    const newState = onToggleVisibility();
    const wrapper = e.currentTarget.querySelector(".icon-wrapper");
    if (wrapper) wrapper.innerHTML = newState ? eyeIcon : eyeOffIcon;

    const mainAmount = document.getElementById("main-balance-display");
    if (mainAmount)
      mainAmount.textContent = SupplierModel.formatAmount(
        supplier.balance,
        newState
      );

    document
      .querySelectorAll(".mov-amount-main, .mov-running-subtle")
      .forEach((el) => {
        const val = parseFloat(el.dataset.amount);
        if (!isNaN(val))
          el.textContent = SupplierModel.formatAmount(val, newState);
      });
  };

  return el("div", { className: "supplier-detail-view fade-in" }, [
    el("div", { className: "detail-toolbar" }, [
      // Lado Izquierdo: Volver
      el("button", { className: "btn-toolbar-back", onclick: onBack }, [
        el("span", { innerHTML: arrowLeftIcon }),
        el("span", { textContent: "Volver" }),
      ]),

      // Lado Derecho: Acciones
      el("div", { className: "toolbar-actions" }, [
        // BOTÓN: Generar Reporte
        el("button", {
          className: "btn-generate-report",
          onclick: onGenerateReport,
          textContent: "Generar Reporte",
        }),

        // BOTÓN: Nuevo movimiento
        el("button", {
          className: "btn-add-movement",
          onclick: onAddMovement,
          textContent: "+ Nuevo movimiento",
        }),

        el("div", { className: "toolbar-sep" }),

        // Iconos utilitarios
        el("div", { className: "utility-icons" }, [
          supplier.type === "stock"
            ? el("button", {
                className: "btn-utility",
                title: "Ver Stock",
                onclick: () => {
                  const modal = StockReportModal({
                    supplier,
                    movements,
                    onClose: () => modal.remove(),
                  });
                  document.body.appendChild(modal);
                },
                innerHTML: boxIcon,
              })
            : null,

          el("button", {
            className: "btn-utility",
            onclick: handleToggle,
            title: "Alternar visibilidad",
            innerHTML: `<span class="icon-wrapper">${
              isVisible ? eyeIcon : eyeOffIcon
            }</span>`,
          }),

          el("button", {
            className: "btn-utility",
            title: "Configuración",
            onclick: onOpenSettings,
            innerHTML: settingsIcon,
          }),
        ]),
      ]),
    ]),

    SupplierDetailHeader({ supplier, isVisible }),
    MovementList({ movements, isVisible, onDeleteMovement, onEditMovement }),
  ]);
}
