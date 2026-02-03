import { el } from "../../../core/dom.js";
import "./style.css";

export function SearchBox({
  placeholder = "Buscar...",
  onSearch,
  delay = 300,
  initialValue = "",
}) {
  let debounceTimer;

  // Icono SVG
  const searchIcon = el("div", { className: "search-box-icon" }, [
    el("div", {
      innerHTML: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
    }),
  ]);

  // Input
  const input = el("input", {
    type: "text",
    className: "search-box-input",
    placeholder: placeholder,
    value: initialValue,
  });

  // Lógica del Delay (Debounce)
  input.addEventListener("input", (e) => {
    const value = e.target.value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (onSearch) onSearch(value);
    }, delay);
  });

  return el("div", { className: "search-box-wrapper" }, [searchIcon, input]);
}
