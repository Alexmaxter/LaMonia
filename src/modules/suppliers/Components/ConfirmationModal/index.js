import { el } from "../../../../core/dom.js";
import "./style.css";

export function ConfirmationModal({ title, message, onConfirm, onCancel }) {
  // Icono de Alerta Geométrico
  const iconAlert = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;

  return el(
    "div",
    {
      className: "fusion-overlay mesh-bg",
      // Cierra si se hace clic fuera
      onclick: (e) =>
        e.target.classList.contains("fusion-overlay") && onCancel(),
    },
    el("div", { className: "fusion-card confirmation-size" }, [
      // HEADER: Estilo "Barra de Título" de error
      el("div", { className: "fusion-header header-warning" }, [
        el("div", { className: "header-icon-box", innerHTML: iconAlert }),
        el("h2", { className: "header-title-text" }, "CONFIRMACIÓN REQUERIDA"),
      ]),

      // BODY
      el("div", { className: "fusion-body" }, [
        el("div", { className: "warning-content" }, [
          el("h3", { className: "warning-title" }, title),
          el("p", { className: "warning-text" }, message),
        ]),

        // FOOTER
        el("div", { className: "fusion-footer" }, [
          el(
            "button",
            { className: "btn-fusion-cancel", onclick: onCancel },
            "CANCELAR",
          ),
          el(
            "button",
            { className: "btn-fusion-danger", onclick: onConfirm },
            "ELIMINAR",
          ),
        ]),
      ]),
    ]),
  );
}
