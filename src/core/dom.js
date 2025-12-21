/**
 * Crea un elemento HTML con atributos y contenido de forma declarativa.
 * * @param {string} tag - La etiqueta HTML (ej: 'div', 'button').
 * @param {Object} props - Objeto con atributos (className, id, eventos, etc.).
 * @param {...(HTMLElement|string)} children - Hijos del elemento (nodos o texto).
 * @returns {HTMLElement} El elemento creado.
 */
export function el(tag, props = {}, ...children) {
  const element = document.createElement(tag);

  // 1. Asignar propiedades y atributos
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (key.startsWith("on") && typeof value === "function") {
        // Manejo de eventos (ej: onClick -> click)
        const eventName = key.toLowerCase().substring(2);
        element.addEventListener(eventName, value);
      } else if (key === "className" || key === "class") {
        // Manejo de clases
        element.className = value;
      } else if (key === "style" && typeof value === "object") {
        // Manejo de estilos como objeto (opcional, preferimos CSS)
        Object.assign(element.style, value);
      } else if (value !== false && value !== null && value !== undefined) {
        // Atributos normales (id, type, placeholder...)
        element.setAttribute(key, value);
      }
    }
  }

  // 2. Agregar hijos
  children.forEach((child) => {
    if (typeof child === "string" || typeof child === "number") {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      element.appendChild(child);
    } else if (Array.isArray(child)) {
      // Si el hijo es un array, agregamos sus elementos
      child.forEach((nestedChild) => {
        if (nestedChild) element.appendChild(nestedChild);
      });
    }
  });

  return element;
}
