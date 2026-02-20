// src_v2/core/router.js
export class Router {
  constructor(routes, container) {
    this.routes = routes;
    this.container = container;
    this.init();
  }

  init() {
    // Escuchamos el cambio de hash
    window.addEventListener("hashchange", () => {
      console.log("🔗 Cambio de Hash detectado:", window.location.hash);
      this.loadRoute();
    });

    // Cargamos la ruta inicial
    window.addEventListener("load", () => {
      console.log("🚀 Aplicación Cargada. Hash inicial:", window.location.hash);
      this.loadRoute();
    });

    // Ejecución inmediata por si el script carga después del evento load
    this.loadRoute();
  }

  loadRoute() {
    const hash = window.location.hash || "#suppliers";
    // Limpiamos el hash para buscarlo en el objeto routes (ej: #suppliers/123 -> #suppliers)
    const baseRoute = hash.split("/")[0];

    console.info(`Buscando función para la ruta: [${baseRoute}]`);
    const renderFn = this.routes[baseRoute];

    if (typeof renderFn === "function") {
      console.log(`✅ Ejecutando controlador para: ${baseRoute}`);

      // =========================================================
      // 🛡️ PARCHE DE FUGA DE MEMORIA (MEMORY LEAK FIX)
      // =========================================================
      // Verificamos si la vista actual tiene un método destroy() y lo ejecutamos
      if (
        this.container.firstChild &&
        typeof this.container.firstChild.destroy === "function"
      ) {
        console.log(
          "🧹 Destruyendo vista anterior y limpiando suscripciones...",
        );
        this.container.firstChild.destroy();
      }

      // Vaciamos el DOM por completo de forma segura
      this.container.innerHTML = "";
      // =========================================================

      // Pasamos el contenedor para que el módulo dibuje allí
      renderFn(this.container);
    } else {
      console.warn(`❌ No existe una función asociada a la ruta: ${baseRoute}`);
      console.log("Rutas disponibles:", Object.keys(this.routes));
    }
  }
}
