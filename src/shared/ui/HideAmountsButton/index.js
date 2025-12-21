// src/shared/ui/HideAmountsButton/index.js
import { el } from "../../../core/dom.js";
import { Icon } from "../Icon.js";

export function HideAmountsButton() {
  // Obtenemos el estado inicial de localStorage
  let isHidden = localStorage.getItem("amountsHidden") === "true";

  const btn = el("button", {
    className: "btn-icon-toggle",
    title: isHidden ? "Mostrar montos" : "Ocultar montos",
    onclick: () => {
      isHidden = !isHidden;
      localStorage.setItem("amountsHidden", isHidden);

      // Emitimos un evento personalizado para que toda la app se entere
      window.dispatchEvent(
        new CustomEvent("toggle-amounts", { detail: isHidden })
      );

      // Actualizamos el icono del botón
      renderIcon();
    },
  });

  const renderIcon = () => {
    btn.innerHTML = "";
    // Asegúrate de tener 'eye' y 'eyeOff' en tu Icon.js
    btn.appendChild(Icon(isHidden ? "eyeOff" : "eye"));
  };

  renderIcon();
  return btn;
}
