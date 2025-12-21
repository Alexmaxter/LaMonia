// src/shared/ui/Button/index.js
import "./style.css"; // <--- IMPORTACIÓN DEL NUEVO CSS

export function Button({
  text,
  onClick,
  variant = "primary", // primary, secondary, danger
  type = "button",
  fullWidth = false,
  className = "",
  title = "",
}) {
  const btn = document.createElement("button");
  btn.type = type;

  if (text && typeof text === "string" && text.includes("<")) {
    btn.innerHTML = text;
  } else {
    btn.textContent = text;
  }

  const classes = ["btn", `btn-${variant}`];
  if (fullWidth) classes.push("w-full");
  if (className) classes.push(className);

  btn.className = classes.join(" ");

  if (title) btn.title = title;

  if (onClick) {
    btn.addEventListener("click", onClick);
  }

  return btn;
}
