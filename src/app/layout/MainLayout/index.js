import { el } from "../../../core/dom.js";
import { Sidebar } from "../Sidebar/index.js";
import { Icon } from "../../../shared/ui/Icon.js"; // Asegúrate de tener un icono 'menu'
import "./style.css";

export function MainLayout(currentRoute) {
  const sidebarComponent = Sidebar(currentRoute);

  // 1. Botón Hamburguesa (Solo visible en CSS móvil)
  const btnMenu = el("button", { className: "mobile-menu-btn" }, Icon("menu")); // Usa "bars" o "menu" según tu set

  // 2. Overlay (Fondo oscuro al abrir menú)
  const overlay = el("div", { className: "sidebar-overlay" });

  // Lógica de Toggle
  const toggleMenu = () => {
    sidebarComponent.classList.toggle("open");
    overlay.classList.toggle("visible");
  };

  btnMenu.onclick = toggleMenu;
  overlay.onclick = toggleMenu; // Click afuera cierra el menú

  // 3. Contenido Principal
  const mainContent = el("main", {
    className: "main-content",
    id: "main-container",
  });

  // 4. Estructura Final
  const container = el(
    "div",
    { className: "app-container" },
    btnMenu, // Botón flotante
    overlay, // Fondo oscuro (invisible por defecto)
    sidebarComponent, // Barra lateral
    mainContent // Contenido derecho
  );

  return { element: container, contentArea: mainContent };
}
