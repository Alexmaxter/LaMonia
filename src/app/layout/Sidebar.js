import { el } from "../../core/dom.js";
import { Icon } from "../../shared/ui/Icon.js"; // Asegúrate de tener iconos importados

export function Sidebar(currentRoute) {
  // Definición de rutas
  const routes = [
    { id: "dashboard", label: "Inicio", icon: "dollar" }, // Usamos 'dollar' temporalmente como Home
    { id: "suppliers", label: "Proveedores", icon: "copy" }, // Usamos 'copy' o similar
    // Puedes agregar más rutas aquí (ej: Ajustes)
  ];

  // Contenedor principal
  const nav = el("nav", { className: "app-nav" });

  // Título solo visible en escritorio (gracias al CSS)
  // En móvil esto se ocultará si ajustamos el CSS, o podemos dejarlo fuera.
  // Para simplificar, lo inyectamos y CSS decide.
  const header = el(
    "div",
    { className: "nav-header", style: { display: "none" } },
    "Mi Negocio"
  );

  // Detectar si estamos en escritorio para mostrar el header
  if (window.innerWidth >= 768) header.style.display = "block";
  // Listener simple para resize (opcional)
  window.addEventListener("resize", () => {
    header.style.display = window.innerWidth >= 768 ? "block" : "none";
  });

  nav.appendChild(header);

  // Links
  routes.forEach((route) => {
    // Determinar si es activo
    const isActive =
      currentRoute === route.id ||
      (currentRoute === "" && route.id === "dashboard");

    // Icono correspondiente
    // Nota: Si quieres iconos específicos (Home, Users), agrégalos a Icon.js
    // Por ahora reusamos los que tenemos.
    let iconName = "dollar";
    if (route.id === "suppliers") iconName = "copy"; // Icono temporal visual

    const link = el(
      "a",
      {
        href: `#${route.id}`,
        className: `nav-link ${isActive ? "active" : ""}`,
        onclick: (e) => {
          // La navegación la maneja el router por hash, pero visualmente actualizamos
          document
            .querySelectorAll(".nav-link")
            .forEach((l) => l.classList.remove("active"));
          e.currentTarget.classList.add("active");
        },
      },
      Icon(iconName),
      el("span", {}, route.label)
    );

    nav.appendChild(link);
  });

  return nav;
}
