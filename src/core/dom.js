/**
 * Crea elementos DOM de forma eficiente y limpia.
 * Versión optimizada para listas grandes y estilos dinámicos.
 */
export const el = (tag, props = {}, ...children) => {
  const element = document.createElement(tag);

  // 1. Asignar propiedades
  if (props) {
    Object.entries(props).forEach(([key, value]) => {
      if (key.startsWith("on") && typeof value === "function") {
        // Eventos: onclick -> click (soporta camelCase y lowercase)
        element.addEventListener(key.substring(2).toLowerCase(), value);
      } else if (key === "dataset" && typeof value === "object") {
        // Data attributes: dataset: { id: 1 } -> data-id="1"
        Object.assign(element.dataset, value);
      } else if (key === "style" && typeof value === "object") {
        // MEJORA: Soporte para style como objeto
        // el('div', { style: { color: 'red', display: 'none' } })
        Object.assign(element.style, value);
      } else if (value !== false && value !== null && value !== undefined) {
        // Asignación directa segura (ej: className, id, type, value)
        element[key] = value;
      }
    });
  }

  // 2. Asignar hijos (Optimizado con Fragment único y Recursividad)
  if (children.length > 0) {
    const fragment = document.createDocumentFragment();

    const append = (child) => {
      // Ignorar nulos/falsos (útil para renderizado condicional: condition && el(...))
      if (child === null || child === undefined || child === false) return;

      if (Array.isArray(child)) {
        // Recursividad: permite arrays anidados sin crear múltiples fragments innecesarios
        child.forEach(append);
      } else if (child instanceof Node) {
        fragment.appendChild(child);
      } else {
        // Convertir strings/números a nodos de texto
        fragment.appendChild(document.createTextNode(String(child)));
      }
    };

    // Procesamos todos los hijos (argumentos y arrays)
    children.forEach(append);

    // Un solo "toque" al DOM del elemento padre
    element.appendChild(fragment);
  }

  return element;
};

// Función helper para limpiar y montar una vista en la pantalla
export const mount = (container, component) => {
  // Limpieza rápida
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  // Inserción segura
  if (component) {
    container.appendChild(component);
  }
};
