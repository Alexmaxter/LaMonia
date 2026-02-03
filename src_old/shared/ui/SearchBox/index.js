// src/shared/ui/SearchBox/index.js
import { el } from "../../../core/dom.js";
import { Icon } from "../Icon.js";
import "./style.css";

/**
 * Componente SearchBox con Debounce integrado.
 * * @param {Object} props
 * @param {string} props.placeholder - Texto placeholder.
 * @param {Function} props.onSearch - Callback que recibe el término de búsqueda.
 * @param {number} props.debounceTime - Tiempo de espera en ms antes de disparar onSearch (default: 300ms).
 */
export function SearchBox({
  placeholder = "Buscar...",
  onSearch,
  debounceTime = 300,
}) {
  let debounceTimer = null;

  const input = el("input", {
    className: "search-field",
    type: "text",
    placeholder: placeholder,
    oninput: (e) => {
      const term = e.target.value.toLowerCase().trim();

      // 1. Limpiar el temporizador anterior si el usuario sigue escribiendo
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // 2. Configurar nuevo temporizador
      debounceTimer = setTimeout(() => {
        if (onSearch) {
          onSearch(term); // Solo se ejecuta si pasaron 300ms sin nuevos eventos
        }
      }, debounceTime);
    },
  });

  const container = el(
    "div",
    { className: "search-box" },
    Icon("search"),
    input
  );

  // Método para limpiar el input externamente
  container.clear = () => {
    input.value = "";
    if (debounceTimer) clearTimeout(debounceTimer); // Limpiamos timers pendientes
    if (onSearch) onSearch("");
  };

  return container;
}
