// src_v2/main.js
import "./style.css";
import { mount, el } from "./core/dom.js";
import { MainLayout } from "./app/Layout/MainLayout/index.js";
import { Router } from "./core/router.js";

// ESTA ES LA LÍNEA QUE FALTABA:
import { SupplierController } from "./modules/suppliers/controller.js";

console.log("🚀 [Main] Inicializando aplicación...");

// 1. Iniciar el marco de la app
const layout = MainLayout();
const root = document.getElementById("app");

if (!root) {
  console.error("❌ No se encontró el elemento #app en el HTML");
} else {
  mount(root, layout.element);
  console.log("✅ Layout montado en #app");
}

// 2. Instanciar el controlador (esto devuelve la función que usará el router)
const supplierModule = SupplierController();

// 3. Definir las rutas
const routes = {
  "#cashflow": (container) => {
    console.log("📍 Ruta: Cierre de Caja");
    container.innerHTML = "<h2>💸 Cierre de Caja</h2><p>Próximamente...</p>";
    layout.sidebarAPI.setActive("cashflow");
  },

  "#suppliers": (container) => {
    console.log("📍 Ruta: Proveedores");
    // Ejecutamos la función del controlador pasándole el hueco del layout
    supplierModule(container);
    layout.sidebarAPI.setActive("suppliers");
  },
};

// 4. Iniciar el Router
console.log("🛠️ Iniciando Router...");
new Router(routes, layout.contentContainer);

// 5. Redirección inicial
if (!window.location.hash) {
  window.location.hash = "#cashflow";
}
