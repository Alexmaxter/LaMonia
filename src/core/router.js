export class Router {
  constructor(routes, appContainer) {
    this.routes = routes; // Objeto con las rutas definidoras en main.js
    this.appContainer = appContainer; // El <div> donde se dibujarán las vistas
    this.currentParams = {}; // Almacén temporal para pasar datos (ej: el proveedor seleccionado)
  }

  init() {
    // 1. Escuchar cuando cambia la URL (Flechas atrás/adelante o clicks)
    window.addEventListener("hashchange", () => this.handleLocation());

    // 2. Cargar la ruta inicial al abrir la app
    this.handleLocation();
  }

  // Método para navegar manualmente desde el código (ej: al hacer click en una tarjeta)
  navigateTo(routeId, params = null) {
    // Si hay parámetros (ej: un objeto proveedor), los guardamos en memoria asociados a la ruta destino
    if (params) {
      this.currentParams[routeId] = params;
    }
    // Cambiamos el hash, lo que disparará el evento 'hashchange'
    window.location.hash = routeId;
  }

  async handleLocation() {
    // 1. Obtener la ruta actual (quitando el #)
    // Si está vacío, vamos al dashboard por defecto
    const hash = window.location.hash.slice(1) || "dashboard";

    // Limpiamos extra queries si las hubiera
    const routeName = hash.split("?")[0];

    // 2. Buscar la función que carga esa ruta
    const routeHandler = this.routes[routeName];

    // 3. Limpiar el contenedor (Borrar la vista anterior)
    this.appContainer.innerHTML = "";

    // Si la ruta no existe, mostramos error 404
    if (!routeHandler) {
      this.appContainer.innerHTML =
        "<h2 style='text-align:center; margin-top:50px;'>404 - Página no encontrada</h2>";
      return;
    }

    try {
      // 4. Ejecutar el handler.
      // Como en main.js usamos dynamic imports (import(...).then(...)), esto devuelve una Promesa.
      // Esperamos a que el archivo JS de la vista se descargue.
      const viewFunction = await routeHandler();

      // 5. Instanciar el componente
      // Le inyectamos dos herramientas clave a la vista:
      // - navigateTo: Para que la vista pueda cambiar de página
      // - params: Los datos que le mandaron (ej: el proveedor a editar)
      const component = await viewFunction({
        navigateTo: (route, params) => this.navigateTo(route, params),
        params: this.currentParams[routeName] || null,
      });

      // 6. Pegar el componente en el DOM
      // Aceptamos tanto nodos DOM (document.createElement) como strings HTML
      if (component instanceof Node) {
        this.appContainer.appendChild(component);
      } else if (typeof component === "string") {
        this.appContainer.innerHTML = component;
      }

      // Limpiar params usados para no dejar basura en memoria (opcional, pero buena práctica)
      // this.currentParams[routeName] = null;
    } catch (error) {
      console.error("Error en el Router:", error);
      this.appContainer.innerHTML = `<div style="color:var(--danger); padding:20px;">Error al cargar la vista: ${error.message}</div>`;
    }
  }
}
