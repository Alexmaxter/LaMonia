import { el } from "../../../core/dom.js";
import { Sidebar } from "../Sidebar/index.js";
import "./style.css";

export function MainLayout(currentRouteId) {
  // 1. Inicializamos el Sidebar
  const sidebar = Sidebar(currentRouteId);

  // 2. Creamos el área donde se mostrarán las pantallas (Dashboard, Proveedores, etc.)
  const contentArea = el("main", { className: "main-content" });

  // 3. Estructura flex: Sidebar | Contenido
  const layoutElement = el(
    "div",
    { className: "main-layout" },
    sidebar.element,
    contentArea
  );

  return {
    element: layoutElement, // El HTML completo para montar en body
    contentContainer: contentArea, // Referencia para inyectar vistas
    sidebarAPI: sidebar, // Para controlar el sidebar desde fuera
  };
}
