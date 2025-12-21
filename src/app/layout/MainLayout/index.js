// src/app/layout/MainLayout.js
import { el } from "../../core/dom.js";
import { Sidebar } from "./Sidebar/index.js";
import "./layout.css";

export function MainLayout(currentRoute) {
  // Contenedor principal de la aplicación
  const mainContent = el("main", {
    className: "main-content",
    id: "main-container",
  });

  const container = el(
    "div",
    {
      className: "app-container",
    },
    Sidebar(currentRoute), // Le pasamos la ruta para que sepa qué link activar
    mainContent
  );

  return {
    element: container,
    contentArea: mainContent,
  };
}
