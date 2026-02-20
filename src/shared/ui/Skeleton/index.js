import { el } from "../../../core/dom.js";
import "./style.css";

/**
 * Componente Skeleton Genérico
 * @param {Object} props
 * @param {string} props.type - "rect" (default), "circle", "text"
 * @param {string} props.width - Ancho (ej: "100%", "40px")
 * @param {string} props.height - Alto (ej: "20px", "40px")
 * @param {string} props.className - Clases CSS extra
 */
export function Skeleton({
  type = "rect",
  width = "100%",
  height = "20px",
  className = "",
  style = "",
}) {
  let borderRadius = "8px"; // Default rect

  if (type === "circle") borderRadius = "50%";
  if (type === "text") borderRadius = "4px";

  return el("div", {
    className: `skeleton-base ${className}`,
    style: `width: ${width}; height: ${height}; border-radius: ${borderRadius}; ${style}`,
  });
}
