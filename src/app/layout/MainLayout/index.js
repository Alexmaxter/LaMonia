import { el } from "../../../core/dom.js";
import "./style.css";

export function MainLayout() {
  // 1. Creamos el área de contenido directamente
  const contentArea = el("main", { className: "main-content" });

  // 2. Contenedor principal (ahora solo envuelve, no divide)
  const layoutElement = el("div", { className: "main-layout" }, contentArea);

  return {
    element: layoutElement,
    contentContainer: contentArea,
    // Ya no devolvemos sidebarAPI
  };
}
