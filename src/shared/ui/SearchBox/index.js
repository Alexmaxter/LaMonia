// src/shared/ui/SearchBox/index.js
import { el } from "../../../core/dom.js";
import { Icon } from "../Icon.js";
import "./style.css";

export function SearchBox({ placeholder = "Buscar...", onSearch }) {
  const input = el("input", {
    className: "search-field",
    type: "text",
    placeholder: placeholder,
    oninput: (e) => {
      const term = e.target.value.toLowerCase().trim();
      if (onSearch) onSearch(term);
    },
  });

  const container = el(
    "div",
    { className: "search-box" },
    Icon("search"), // Asegúrate de que Icon.js tenga el caso "search"
    input
  );

  // Metodo para limpiar el input externamente si fuera necesario
  container.clear = () => {
    input.value = "";
    if (onSearch) onSearch("");
  };

  return container;
}
