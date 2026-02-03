import { el } from "../../../core/dom.js";
import "./style.css";

export const Card = ({ children, className = "", ...props }) => {
  // Aseguramos que children sea siempre un array para 'el'
  const kids = Array.isArray(children) ? children : [children];

  return el(
    "div",
    {
      className: `ui-card ${className}`,
      ...props,
    },
    ...kids
  );
};
