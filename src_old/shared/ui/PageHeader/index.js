import { el } from "../../../core/dom.js";
import { Button } from "../Button/index.js";
import "./style.css";

/**
 * @param {Object} props
 * @param {string} props.title - Título principal
 * @param {string} [props.subtitle] - Texto secundario
 * @param {Function} [props.onBack] - Acción al volver. Si existe, muestra flecha.
 * @param {HTMLElement} [props.action] - Botón principal a la derecha (opcional)
 */
export const PageHeader = ({ title, subtitle, onBack, action }) => {
  const leftContent = el("div", { className: "page-header-left" });

  if (onBack) {
    const backBtn = Button({
      icon: "arrowLeft",
      variant: "ghost",
      onClick: onBack,
      className: "btn-back",
    });
    leftContent.appendChild(backBtn);
  }

  const textGroup = el(
    "div",
    { className: "header-text" },
    el("h2", {}, title),
    subtitle ? el("p", { className: "header-subtitle" }, subtitle) : null
  );

  leftContent.appendChild(textGroup);

  return el(
    "header",
    { className: "page-header" },
    leftContent,
    action ? el("div", { className: "page-header-actions" }, action) : null
  );
};
