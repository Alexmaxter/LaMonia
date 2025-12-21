// src/main.js
import { Router } from "./core/router.js";
import { MainLayout } from "./app/layout/MainLayout.js";
import { el } from "./core/dom.js";
import "./style.css";

const routes = {
  dashboard: () => {
    return () =>
      el(
        "div",
        { style: { padding: "20px" } },
        el("h2", {}, "Resumen General"),
        el(
          "p",
          { style: { marginTop: "10px", color: "#666" } },
          "Selecciona una opción del menú para comenzar."
        )
      );
  },
  suppliers: () =>
    import("./modules/suppliers/views/SuppliersListView.js").then(
      (m) => m.SuppliersListView
    ),
  "supplier-detail": () =>
    import("./modules/suppliers/views/SupplierDetailView.js").then(
      (m) => m.SupplierDetailView
    ),
};

const app = document.getElementById("app");

const initApp = async () => {
  app.innerHTML = "";

  // 1. Obtener la ruta actual para el estado inicial
  const hash = window.location.hash.slice(1) || "dashboard";
  const routeBase = hash.split("?")[0];
  let activeMenu = routeBase === "supplier-detail" ? "suppliers" : routeBase;

  // 2. Renderizar el Layout base
  const layout = MainLayout(activeMenu);
  app.appendChild(layout.element);

  // 3. Inicializar el Router en el área de contenido del layout
  const router = new Router(routes, layout.contentArea);
  router.init();
};

initApp();
