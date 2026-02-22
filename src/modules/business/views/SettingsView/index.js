import { el } from "../../../../core/dom.js";
import { BusinessPanel } from "../BusinessPanel/index.js";
import "./style.css";

/**
 * SettingsView
 * Contenedor principal de configuración.
 * Tiene navegación lateral y renderiza paneles según la sección activa.
 * Preparado para agregar más secciones en el futuro (cuenta, notificaciones, etc.)
 */

const SECTIONS = [
  {
    id: "business",
    label: "Mi negocio",
    description: "Información y perfil",
    icon: businessIcon,
  },
  // Futuras secciones:
  // { id: "account", label: "Mi cuenta", description: "Usuario y contraseña", icon: accountIcon },
  // { id: "notifications", label: "Notificaciones", description: "Alertas y avisos", icon: notifIcon },
];

export function SettingsView({ onBack }) {
  let activeSection = "business";
  let activePanelInstance = null;

  // --- ELEMENTOS BASE ---
  const navList = el("nav", { className: "sv-nav" });
  const panelArea = el("div", { className: "sv-panel-area" });

  // =========================================================
  // NAVEGACIÓN LATERAL
  // =========================================================
  const renderNav = () => {
    navList.innerHTML = "";

    SECTIONS.forEach((section) => {
      const isActive = section.id === activeSection;
      const item = el(
        "button",
        {
          className: `sv-nav-item ${isActive ? "active" : ""}`,
          onclick: () => switchSection(section.id),
        },
        [
          el("div", { className: "sv-nav-icon" }, section.icon()),
          el("div", { className: "sv-nav-text" }, [
            el("span", { className: "sv-nav-label" }, section.label),
            el("span", { className: "sv-nav-desc" }, section.description),
          ]),
        ],
      );
      navList.appendChild(item);
    });
  };

  // =========================================================
  // CAMBIO DE SECCIÓN
  // =========================================================
  const switchSection = (sectionId) => {
    if (sectionId === activeSection) return;

    // Destruir instancia anterior si tiene destroy
    if (
      activePanelInstance &&
      typeof activePanelInstance.destroy === "function"
    ) {
      activePanelInstance.destroy();
    }

    activeSection = sectionId;
    renderNav();
    renderPanel();
  };

  // =========================================================
  // PANEL ACTIVO
  // =========================================================
  const renderPanel = () => {
    panelArea.innerHTML = "";

    // Título de la sección
    const section = SECTIONS.find((s) => s.id === activeSection);
    const sectionHeader = el("div", { className: "sv-section-header" }, [
      el("span", { className: "sv-section-eyebrow" }, "Configuración"),
      el("h1", { className: "sv-section-title" }, section?.label || ""),
    ]);

    panelArea.appendChild(sectionHeader);

    // Panel correspondiente
    switch (activeSection) {
      case "business":
        activePanelInstance = BusinessPanel();
        panelArea.appendChild(activePanelInstance);
        break;
      default:
        activePanelInstance = null;
        panelArea.appendChild(
          el(
            "div",
            { className: "sv-coming-soon" },
            "Esta sección estará disponible próximamente.",
          ),
        );
    }
  };

  // =========================================================
  // ESTRUCTURA PRINCIPAL
  // =========================================================
  const view = el("div", { className: "settings-view" }, [
    // HEADER GLOBAL DE SETTINGS
    el("div", { className: "sv-topbar" }, [
      el("button", { className: "sv-back-btn", onclick: onBack }, [
        backIcon(),
        el("span", {}, "Volver"),
      ]),
      el("div", { className: "sv-topbar-title" }, [
        el("span", { className: "sv-topbar-eyebrow" }, "Sistema de gestión"),
        el("span", { className: "sv-topbar-name" }, "Configuración general"),
      ]),
    ]),

    // CUERPO: NAV + PANEL
    el("div", { className: "sv-body" }, [
      // SIDEBAR DE NAVEGACIÓN
      el("aside", { className: "sv-sidebar" }, [
        el("div", { className: "sv-sidebar-label" }, "Secciones"),
        navList,
      ]),

      // ÁREA DE CONTENIDO
      panelArea,
    ]),
  ]);

  // Inicializar
  renderNav();
  renderPanel();

  // Cleanup
  view.destroy = () => {
    if (
      activePanelInstance &&
      typeof activePanelInstance.destroy === "function"
    ) {
      activePanelInstance.destroy();
    }
  };

  return view;
}

// =========================================================
// ICONOS
// =========================================================
function businessIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.5");
  svg.innerHTML = `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>`;
  return svg;
}

function backIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.innerHTML = `<line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline>`;
  return svg;
}
