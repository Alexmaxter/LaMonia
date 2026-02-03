import { Router } from "./core/router.js";
import { MainLayout } from "./app/layout/MainLayout/index.js";
import { el } from "./core/dom.js";
import "./style.css";

const app = document.getElementById("app");

// 1. Limpiar e Inicializar Layout
app.innerHTML = "";
const initialRoute = window.location.hash.slice(1) || "dashboard";

// Instanciamos el Layout
const layout = MainLayout(initialRoute);

// Agregamos el Layout completo al DOM (Sidebar + Area de Contenido)
app.appendChild(layout.element);

// 2. Definición de Rutas
const routes = {
  dashboard: async () => {
    const module = await import(
      "./modules/cashflow/views/DailyClosingView/index.js"
    );
    const View = module.DailyClosingView || module.default;
    return View({ router });
  },
  suppliers: async () => {
    const module = await import(
      "./modules/suppliers/views/SupplierListView/index.js"
    );
    // CORRECCIÓN: El archivo index.js de SupplierListView exporta "SupplierDetailView"
    const View =
      module.SupplierListView || module.SupplierDetailView || module.default;
    return View({ router });
  },
  "supplier-detail": async (props) => {
    const module = await import(
      "./modules/suppliers/views/SupplierDetailView/index.js"
    );
    const View = module.SupplierDetailView || module.default;
    // Es vital pasar props.id aquí
    return View({ params: { id: props.id }, router });
  },
  settings: async () => {
    return el(
      "div",
      { style: "padding: 2rem;" },
      el("h2", {}, "Configuración")
    );
  },
};

// 3. Inicializar Router
const router = new Router(routes, layout.contentArea, (currentRoute) => {
  if (layout.setActive) layout.setActive(currentRoute);
});

// Parche para navegación manual
router.navigate = (path) => {
  if (path.startsWith("/suppliers/")) {
    const id = path.split("/")[2];
    window.location.hash = `supplier-detail?id=${id}`;
  } else {
    window.location.hash = path.replace("/", "");
  }
};

router.init();
