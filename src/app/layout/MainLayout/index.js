import { el } from "../../../core/dom.js";
import "./style.css";

export function MainLayout() {
  const contentArea = el("main", { className: "main-content" });

  const layoutElement = el("div", { className: "main-layout" }, [contentArea]);

  return {
    element: layoutElement,
    contentContainer: contentArea,
  };
}
