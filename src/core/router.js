// src_v2/core/router.js

export class Router {
  constructor(routes, container) {
    this.routes = routes;
    this.container = container;
    this._currentView = null;
    this._currentNavId = null;
    this._cover = null;
    this._initCover();
    this.init();
  }

  _initCover() {
    const cover = document.createElement("div");
    cover.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: #fff;
      opacity: 0;
      pointer-events: none;
    `;
    document.body.appendChild(cover);
    this._cover = cover;
  }

  // Aparece INSTANTÁNEO — sin transición.
  // No podemos hacer fade-in porque el browser pinta el primer
  // frame vacío en ~15ms, antes de que cualquier transición termine.
  _showCover() {
    this._cover.style.transition = "none";
    this._cover.style.opacity = "1";
    this._cover.style.pointerEvents = "all";
    // Forzar reflow para que el browser aplique el cambio
    // antes de que sigamos ejecutando JS
    void this._cover.offsetHeight;
  }

  // Desaparece con un fade suave de 120ms
  _hideCover() {
    this._cover.style.transition = "opacity 0.12s ease";
    this._cover.style.opacity = "0";
    this._cover.style.pointerEvents = "none";
  }

  init() {
    window.addEventListener("hashchange", () => {
      console.log("🔗 Cambio de Hash detectado:", window.location.hash);
      this.loadRoute();
    });

    window.addEventListener("load", () => {
      console.log("🚀 Aplicación Cargada. Hash inicial:", window.location.hash);
      this.loadRoute();
    });

    this.loadRoute();
  }

  async loadRoute() {
    const navId = Symbol();
    this._currentNavId = navId;

    const hash = window.location.hash || "#suppliers";
    const baseRoute = hash.split("/")[0];

    console.info(`Buscando función para la ruta: [${baseRoute}]`);
    const renderFn = this.routes[baseRoute];

    if (typeof renderFn !== "function") {
      console.warn(`❌ No existe una función asociada a la ruta: ${baseRoute}`);
      console.log("Rutas disponibles:", Object.keys(this.routes));
      return;
    }

    console.log(`✅ Ejecutando controlador para: ${baseRoute}`);

    // 1. Destruir suscripciones de la vista anterior (sin tocar DOM)
    if (this._currentView && typeof this._currentView.destroy === "function") {
      console.log("🧹 Destruyendo vista anterior...");
      this._currentView.destroy();
      this._currentView = null;
    }

    // 2. Tapar la pantalla INSTANTÁNEAMENTE antes del primer repaint
    this._showCover();

    // 3. Limpiar DOM y ejecutar el controller
    this.container.innerHTML = "";
    renderFn(this.container);

    // 4. Guardar referencia a la nueva vista activa
    this._currentView = this.container.firstChild || null;

    // 5. Quitar el cover suavemente después de dos frames pintados
    // Dos rAF garantizan que el layout fue calculado y pintado
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (this._currentNavId === navId) {
          this._hideCover();
        }
      });
    });
  }
}
