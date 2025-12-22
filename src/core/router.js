// src/core/router.js
export class Router {
  constructor(routes, appContainer) {
    this.routes = routes;
    this.appContainer = appContainer;
  }

  init() {
    // Escuchamos cambios en la URL
    window.addEventListener("hashchange", () => this.handleLocation());
    this.handleLocation();
  }

  /**
   * Navega a una ruta actualizando el Hash y los Query Params.
   * @param {string} routeId - El identificador de la ruta (ej: 'supplier-detail')
   * @param {object} params - Datos simples (ej: { id: '123' }). No pasar objetos complejos aquí.
   */
  navigateTo(routeId, params = null) {
    let url = `#${routeId}`;

    if (params) {
      // Convertimos el objeto a string de consulta (ej: ?id=123&mode=edit)
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    window.location.hash = url;
  }

  async handleLocation() {
    // 1. Obtener hash limpio (sin el #)
    const rawHash = window.location.hash.slice(1) || "dashboard";

    // 2. Separar la ruta de los parámetros (ej: "supplier-detail?id=123")
    const [routeName, queryString] = rawHash.split("?");

    const routeHandler = this.routes[routeName];

    // OPTIMIZACIÓN UX: Mostrar Spinner inmediato
    // Esto evita que la pantalla parezca "congelada" mientras se descarga el módulo JS
    this._showLoading();

    // Manejo de 404
    if (!routeHandler) {
      this.appContainer.innerHTML =
        "<h2 style='text-align:center; margin-top:50px;'>404 - Página no encontrada</h2>";
      return;
    }

    // 3. Parsear los parámetros de la URL
    const params = {};
    if (queryString) {
      const searchParams = new URLSearchParams(queryString);
      for (const [key, value] of searchParams.entries()) {
        params[key] = value;
      }
    }

    try {
      // 4. Cargar el módulo (Lazy Loading) y ejecutar la vista
      // Aquí es donde ocurre la espera de red
      const viewFunction = await routeHandler();

      const component = await viewFunction({
        navigateTo: (r, p) => this.navigateTo(r, p),
        params: params,
      });

      // 5. Limpiar Spinner y Renderizar
      this.appContainer.innerHTML = ""; // Quitamos el spinner

      if (component instanceof Node) {
        this.appContainer.appendChild(component);
      } else if (typeof component === "string") {
        this.appContainer.innerHTML = component;
      }
    } catch (error) {
      console.error("Error en el Router:", error);
      this.appContainer.innerHTML = `<div style="color:var(--danger); padding:20px; text-align:center;">
        <h3>Error al cargar la vista</h3>
        <p>${error.message}</p>
      </div>`;
    }
  }

  // Helper interno para mostrar el estado de carga
  _showLoading() {
    // Inyectamos estilos inline para asegurar que funcione sin depender de un CSS externo
    const spinnerHtml = `
      <div style="
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: 100%;
        min-height: 300px;
        color: var(--text-secondary, #666);
      ">
        <div class="spinner-ring" style="
          width: 40px;
          height: 40px;
          border: 4px solid rgba(0,0,0,0.1);
          border-left-color: var(--primary, #007bff);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 15px;
        "></div>
        <p style="font-size: 0.9rem;">Cargando...</p>
        <style>
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </div>
    `;
    this.appContainer.innerHTML = spinnerHtml;
  }
}
