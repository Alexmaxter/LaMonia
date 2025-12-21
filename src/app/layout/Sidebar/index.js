// src/app/layout/Sidebar/index.js
import { el } from "../../../core/dom.js";
import { Icon } from "../../../shared/ui/Icon.js";
import "./style.css";

export function Sidebar(currentRoute) {
  // Definición de rutas con iconos corregidos
  // NOTA: Verifica en src/shared/ui/Icon.js que existan 'home' y 'truck' (o 'truckPlus')
  const routes = [
    { id: "dashboard", label: "Inicio", icon: "dollar" },
    { id: "suppliers", label: "Proveedores", icon: "truckPlus" },
  ];

  const header = el("div", { className: "nav-header" }, "Mi Negocio");
  const nav = el("nav", { className: "app-nav" }, header);

  routes.forEach((route) => {
    // Si la ruta actual coincide o si estamos en el detalle de un proveedor, marcamos "suppliers" como activo
    const isActive =
      currentRoute === route.id ||
      (route.id === "suppliers" && currentRoute === "supplier-detail") ||
      (currentRoute === "" && route.id === "dashboard");

    const link = el(
      "a",
      {
        href: `#${route.id}`,
        className: `nav-link ${isActive ? "active" : ""}`,
        onclick: (e) => {
          // Limpieza manual de clases para feedback instantáneo
          document
            .querySelectorAll(".nav-link")
            .forEach((l) => l.classList.remove("active"));
          e.currentTarget.classList.add("active");
        },
      },
      Icon(route.icon),
      el("span", {}, route.label)
    );

    nav.appendChild(link);
  });

  return nav;
}
