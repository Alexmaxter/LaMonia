import { el } from "../../../core/dom.js";
import { Sidebar } from "../Sidebar/index.js";
import "./style.css";

/**
 * Componente de Layout Principal
 * Organiza el Sidebar y el área de contenido dinámico.
 */
export function MainLayout(currentPath) {
  // 1. Inicializamos el Sidebar y obtenemos su instancia (elemento + API)
  const sidebarObj = Sidebar(currentPath);

  // 2. Creamos el contenedor donde el Router inyectará las vistas
  const contentArea = el("main", { className: "main-content" });

  // 3. Construimos el contenedor raíz con la clase 'main-layout'
  // para activar el Flexbox definido en el CSS
  const layoutElement = el(
    "div",
    { className: "main-layout" },
    sidebarObj.element,
    contentArea
  );

  return {
    element: layoutElement,
    contentArea: contentArea,
    /**
     * Expone la función de activación para que main.js/router.js
     * puedan actualizar el menú sin recargar el layout.
     */
    setActive: (routeId) => sidebarObj.setActive(routeId),
  };
}
