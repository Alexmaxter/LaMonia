import { el } from "../../../core/dom.js";
import { Icon } from "../Icon/index.js";
import "./style.css";

export const Button = ({
  text,
  icon,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
}) => {
  const content = [];
  if (icon) content.push(Icon(icon));
  if (text) content.push(el("span", {}, text));

  return el(
    "button",
    {
      type,
      className: `ui-btn btn-${variant} ${className}`,
      onClick,
    },
    ...content,
  );
};
