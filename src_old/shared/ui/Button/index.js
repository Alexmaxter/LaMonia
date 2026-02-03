import { el } from "../../../core/dom.js";
import { Icon } from "../Icon.js";
import "./style.css";

/**
 * @param {Object} props
 * @param {string} props.text - Texto del botón
 * @param {string} [props.icon] - Nombre del icono
 * @param {string} [props.variant] - 'primary' | 'secondary' | 'danger' | 'ghost'
 * @param {string} [props.className] - Clases extra
 * @param {Function} [props.onClick] - Evento click
 * @param {boolean} [props.isLoading] - Muestra spinner si true
 */
export const Button = ({
  text,
  icon,
  variant = "primary",
  className = "",
  onClick,
  isLoading = false,
  ...rest
}) => {
  const content = [];

  // Spinner de carga o Icono
  if (isLoading) {
    content.push(el("span", { className: "btn-spinner" }));
  } else if (icon) {
    content.push(Icon(icon, 18));
  }

  if (text) {
    content.push(el("span", {}, text));
  }

  return el(
    "button",
    {
      className: `ui-btn btn-${variant} ${className}`,
      onclick: onClick,
      disabled: isLoading,
      ...rest,
    },
    ...content
  );
};
