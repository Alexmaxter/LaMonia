import { el } from "../../../core/dom.js";
import { MENU_ITEMS } from "../../../config/menu.js";
import { Icon } from "../../../shared/ui/Icon.js";
import "./style.css";

export function Sidebar(activeId) {
  // Referencia para guardar los links y poder actualizarlos luego
  const linksMap = new Map();

  const menuList = el("ul", { className: "sidebar-menu" });

  MENU_ITEMS.forEach((item) => {
    const isActive = item.id === activeId;

    // Crear el Link
    const link = el(
      "a",
      {
        href: `#${item.id}`,
        className: isActive ? "menu-item active" : "menu-item",
        onclick: (e) => {
          // Opcional: Si quieres feedback inmediato al click
          // setActive(item.id);
        },
      },
      Icon(item.icon),
      el("span", {}, item.label)
    );

    // Guardamos referencia al link usando el ID como clave
    linksMap.set(item.id, link);

    const li = el("li", {}, link);
    menuList.appendChild(li);
  });

  const sidebar = el(
    "aside",
    { className: "sidebar" },
    el(
      "div",
      { className: "sidebar-header" },
      el("h1", {}, "Mi Negocio") // O tu logo
    ),
    el("nav", { className: "sidebar-nav" }, menuList),
    el("div", { className: "sidebar-footer" }, el("p", {}, "v1.0.0"))
  );

  /**
   * Función pública para actualizar el estado activo
   */
  const setActive = (newId) => {
    // 1. Quitar active de todos
    linksMap.forEach((link) => link.classList.remove("active"));

    // 2. Poner active al nuevo (si existe en el menú)
    const activeLink = linksMap.get(newId);
    if (activeLink) {
      activeLink.classList.add("active");
    }
  };

  // Retornamos tanto el elemento DOM como la utilidad de control
  return {
    element: sidebar,
    setActive,
  };
}
