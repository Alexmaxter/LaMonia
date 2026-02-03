export class Router {
  constructor(routes, contentContainer, onNavigation) {
    this.routes = routes;
    this.contentContainer = contentContainer;
    this.onNavigation = onNavigation; // Callback opcional
    this.currentPath = null;
  }

  init() {
    window.addEventListener("hashchange", () => this.handleLocation());
    this.handleLocation();
  }

  async handleLocation() {
    const hash = window.location.hash.slice(1) || "dashboard";

    // Evitar recargar si es la misma ruta base (opcional, pero útil)
    // if (hash === this.currentPath) return;
    this.currentPath = hash;

    // Separar ruta de parámetros (ej: suppliers?id=1)
    const [routeBase, query] = hash.split("?");

    // Obtener handler o fallback
    const routeHandler = this.routes[routeBase] || this.routes["dashboard"];

    this.contentContainer.innerHTML = "";

    try {
      // Parsear props
      const params = new URLSearchParams(query);
      const props = Object.fromEntries(params.entries());

      // Ejecutar la vista
      const content = await routeHandler(props);

      // Renderizar
      if (content) {
        // Manejar tanto Nodos DOM como Strings
        if (typeof content === "string") {
          this.contentContainer.innerHTML = content;
        } else {
          this.contentContainer.appendChild(content);
        }
      }

      // Notificar cambio de ruta (para actualizar Sidebar)
      if (this.onNavigation) {
        this.onNavigation(routeBase);
      }
    } catch (error) {
      console.error("Router Error:", error);
      this.contentContainer.innerHTML = `<div class="error">Error cargando ruta: ${error.message}</div>`;
    }
  }
}
