import { el } from "../../../core/dom.js";
import { Icon } from "../../../shared/ui/Icon.js";
import { MENU_ITEMS } from "../../../config/menu.js";
import "./style.css";

export function Sidebar(currentRoute) {
  // 1. Contenedor Principal (ASIDE)
  const container = el("aside", { className: "app-sidebar" });

  // 2. Header
  const header = el(
    "div",
    { className: "app-sidebar__header" },
    el("h2", { className: "app-sidebar__title" }, "Mi Negocio")
  );

  // 3. Navegación
  const nav = el("nav", { className: "app-sidebar__nav" });
  const ul = el("ul", { className: "app-sidebar__list" });

  MENU_ITEMS.forEach((item) => {
    // --- LÓGICA DE ACTIVACIÓN ---
    // 1. Dashboard: Activo si la ruta es vacía o "dashboard"
    const isDashboard =
      item.id === "dashboard" &&
      (currentRoute === "" || currentRoute === "dashboard");

    // 2. Proveedores: Activo si es "suppliers" O si estamos en el detalle "supplier-detail"
    // (Esto mantiene el botón iluminado cuando entras a ver un proveedor específico)
    const isSuppliers =
      item.id === "suppliers" &&
      (currentRoute === "suppliers" || currentRoute === "supplier-detail");

    // 3. Otros menús futuros (Coincidencia exacta)
    const isExactMatch = currentRoute === item.id;

    const isActive = isDashboard || isSuppliers || isExactMatch;

    // --- CREACIÓN DEL DOM ---

    // Icono (El color se controla vía CSS con 'currentColor')
    const iconElement = Icon(item.icon);

    // Link (A)
    const link = el(
      "a",
      {
        href: `#${item.id}`,
        className: `app-sidebar__link ${isActive ? "active" : ""}`,
      },
      iconElement,
      el("span", {}, item.label)
    );

    // UX MÓVIL: Cerrar menú al hacer click en una opción
    link.addEventListener("click", () => {
      const sidebar = document.querySelector(".app-sidebar");
      const overlay = document.querySelector(".sidebar-overlay");

      // Si el menú está abierto (modo móvil), lo cerramos
      if (sidebar && sidebar.classList.contains("open")) {
        sidebar.classList.remove("open");
      }
      if (overlay) {
        overlay.classList.remove("visible");
      }
    });

    // Li wrapper (Semántica correcta)
    const li = el("li", {}, link);
    ul.appendChild(li);
  });

  nav.appendChild(ul);

  // 4. Footer (Opcional - Versión)
  const footer = el("div", { className: "app-sidebar__footer" }, "v1.0.0");

  // Armado final
  container.append(header, nav, footer);

  return container;
}
