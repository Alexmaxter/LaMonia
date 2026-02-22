import "./style.css";
import { mount } from "./core/dom.js";
import { MainLayout } from "./app/layout/MainLayout/index.js";
import { Router } from "./core/router.js";
import { SupplierController } from "./modules/suppliers/controller.js";
import { SettingsView } from "./modules/business/views/SettingsView/index.js";
import { businessStore } from "./modules/business/BusinessStore.js";
import { BusinessService } from "./modules/business/BusinessService.js";
import "./modules/suppliers/utils/AuditGenerator.js";
import "./modules/suppliers/utils/LedgerFix.js";

console.log("🚀 [Main] Inicializando aplicación...");

// ============================================================
// 1. LAYOUT
// ============================================================
const layout = MainLayout();
const root = document.getElementById("app");

if (root) {
  mount(root, layout.element);
  console.log("✅ Layout montado en #app");
}

// ============================================================
// 2. CARGA INICIAL DEL NEGOCIO
// Silenciosa, solo para poblar el nombre en el topbar del layout.
// ============================================================
BusinessService.get()
  .then((data) => businessStore.setBusiness(data))
  .catch(() => businessStore.setBusiness(null));

// ============================================================
// 3. MÓDULOS
// ============================================================
const supplierModule = SupplierController();

// ============================================================
// 4. RUTAS
// ============================================================
const routes = {
  "#suppliers": (container) => {
    console.log("📍 Ruta: Proveedores");
    supplierModule(container);
  },
  "#settings": (container) => {
    console.log("📍 Ruta: Configuración");
    const view = SettingsView({
      onBack: () => {
        window.history.back();
        // Fallback si no hay historial
        setTimeout(() => {
          if (window.location.hash === "#settings") {
            window.location.hash = "#suppliers";
          }
        }, 100);
      },
    });
    container.appendChild(view);
  },
};

// ============================================================
// 5. ROUTER
// ============================================================
console.log("🛠️ Iniciando Router...");
new Router(routes, layout.contentContainer);

// Redirección inicial
if (!window.location.hash || window.location.hash === "#cashflow") {
  window.location.hash = "#suppliers";
}

// ============================================================
// 6. HERRAMIENTAS DE MIGRACIÓN (Consola)
// ============================================================
import { runMigration } from "./modules/suppliers/utils/RunMigration.js";
window.runMigrationSystem = runMigration;
console.log(
  "🔧 SISTEMA: Para correr la migración, escribe 'runMigrationSystem()' en la consola.",
);
