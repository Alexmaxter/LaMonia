import "./style.css";
import { mount } from "./core/dom.js";
import { MainLayout } from "./app/layout/MainLayout/index.js";
import { Router } from "./core/router.js";
import { SupplierController } from "./modules/suppliers/controller.js";

console.log("🚀 [Main] Inicializando aplicación...");

// 1. Iniciar el layout limpio
const layout = MainLayout();
const root = document.getElementById("app");

if (root) {
  mount(root, layout.element);
  console.log("✅ Layout montado en #app");
}

// 2. Instanciar el módulo de proveedores
const supplierModule = SupplierController();

// 3. Definir rutas (Solo Proveedores)
const routes = {
  "#suppliers": (container) => {
    console.log("📍 Ruta: Proveedores");
    supplierModule(container);
    // ELIMINADO: layout.sidebarAPI.setActive(...) -> Esto causaba el error
  },
};

// 4. Iniciar el Router
console.log("🛠️ Iniciando Router...");
new Router(routes, layout.contentContainer);

// 5. Redirección inicial forzada a proveedores
if (!window.location.hash || window.location.hash === "#cashflow") {
  window.location.hash = "#suppliers";
}
