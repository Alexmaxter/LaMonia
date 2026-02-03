import { el } from "../../../core/dom.js";
import { Icon } from "../../../shared/ui/Icon/index.js"; // Ruta corregida
import { MENU_ITEMS } from "../../../config/menu.js";
import "./style.css";

export function Sidebar(activeId) {
  // Mapa para guardar referencia a los enlaces HTML y poder cambiar su clase 'active'
  const linksMap = new Map();

  // Construimos la lista de items
  const menuList = el("ul", { className: "sidebar-menu" });

  MENU_ITEMS.forEach((item) => {
    const isActive = item.id === activeId;

    const link = el(
      "a",
      {
        href: `#${item.id}`,
        className: isActive ? "menu-item active" : "menu-item",
        // Dataset para identificarlo fácilmente si usamos delegación
        dataset: { id: item.id },
      },
      Icon(item.icon),
      el("span", {}, item.label)
    );

    linksMap.set(item.id, link);
    menuList.appendChild(el("li", {}, link));
  });

  // Estructura completa del Sidebar
  const sidebarElement = el(
    "aside",
    { className: "sidebar" },
    el("div", { className: "sidebar-header" }, el("h1", {}, "Mi Negocio")),
    el("nav", { className: "sidebar-nav" }, menuList),
    el("div", { className: "sidebar-footer" }, el("p", {}, "v2.0 Beta"))
  );

  /**
   * API Pública del componente:
   * Permite cambiar el botón activo sin redibujar todo el sidebar.
   */
  const setActive = (newId) => {
    linksMap.forEach((link) => link.classList.remove("active"));
    const activeLink = linksMap.get(newId);
    if (activeLink) activeLink.classList.add("active");
  };

  return {
    element: sidebarElement,
    setActive,
  };
}
