// src_v2/modules/suppliers/components/ConfirmationModal/index.js
import { el } from "../../../../core/dom.js";
import "./style.css";

export function ConfirmationModal({ title, message, onConfirm, onCancel }) {
  return el(
    "div",
    { className: "modal-overlay" },
    el(
      "div",
      { className: "modal-content-optimized scale-in text-center" },
      el("div", { className: "confirm-icon" }, "!"),
      el("h2", { className: "confirm-title" }, title),
      el("p", { className: "confirm-text" }, message),
      el(
        "div",
        { className: "modal-footer mt-6" },
        el(
          "button",
          { className: "btn-ghost", onclick: onCancel },
          "No, cancelar"
        ),
        el(
          "button",
          { className: "btn-danger-confirm", onclick: onConfirm },
          "Sí, eliminar"
        )
      )
    )
  );
}
