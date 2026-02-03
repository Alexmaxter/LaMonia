import { el } from "../../../core/dom.js";
import "./style.css";

/**
 * Loader minimalista: Solo un spinner y texto.
 */
export const Loader = ({ text = "Cargando..." } = {}) => {
  return el(
    "div",
    { className: "minimal-overlay" },
    el(
      "div",
      { className: "loader-wrapper" },
      el("div", { className: "spinner-clean" }),
      el("span", { className: "loader-text-simple" }, text)
    )
  );
};

export const showLoader = (text) => {
  if (document.querySelector(".minimal-overlay")) return;
  document.body.appendChild(Loader({ text }));
};

export const hideLoader = () => {
  const loader = document.querySelector(".minimal-overlay");
  if (loader) loader.remove();
};
