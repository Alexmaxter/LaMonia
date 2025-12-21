import "./layout.css";
import { Sidebar } from "./Sidebar.js";

export function MainLayout(navigateTo) {
  const container = document.createElement("div");
  container.className = "app-container";

  const content = document.createElement("main");
  content.className = "main-content";
  content.id = "router-outlet";

  // CORRECCIÓN AQUÍ: Agregamos las llaves { }
  // Antes: container.append(Sidebar(navigateTo), content);
  container.append(Sidebar({ navigateTo }), content);

  return { element: container, contentArea: content };
}
