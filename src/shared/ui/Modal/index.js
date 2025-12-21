// src/shared/ui/Modal/index.js
import { el } from "../../../core/dom.js";
import { Icon } from "../Icon.js";
import "./style.css";

export function Modal({ title, content, footer, onClose }) {
  // Crear overlay
  const overlay = el("div", { className: "modal-overlay" });

  // Crear contenedor del modal
  const modalContainer = el("div", { className: "modal-container" });

  // --- HEADER MEJORADO ---
  const header = el("div", { className: "modal-header" });

  const titleEl = el("h2", { className: "modal-title" }, title || "");

  // Usamos el icono X y la clase nueva 'modal-close-btn'
  const closeBtn = el(
    "button",
    { className: "modal-close-btn", type: "button" },
    Icon("x")
  );

  header.append(titleEl, closeBtn);

  // Cuerpo
  const body = el("div", { className: "modal-body" });
  if (typeof content === "string") {
    body.innerHTML = content;
  } else if (content instanceof HTMLElement) {
    body.appendChild(content);
  }

  // Footer (opcional)
  const footerEl = el("div", { className: "modal-footer" });
  if (footer) {
    if (footer instanceof HTMLElement) {
      footerEl.appendChild(footer);
    }
  }

  // Ensamblar
  modalContainer.append(header, body);
  if (footer) modalContainer.appendChild(footerEl);
  overlay.appendChild(modalContainer);

  // Métodos de control
  const close = () => {
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    if (onClose) onClose();
  };

  const open = () => {
    document.body.appendChild(overlay);
    // Animación simple de entrada
    setTimeout(() => {
      overlay.classList.add("open");
      modalContainer.classList.add("open");
    }, 10);
  };

  // Eventos de cierre
  closeBtn.onclick = close;
  overlay.onclick = (e) => {
    if (e.target === overlay) close();
  };

  return {
    open,
    close,
    element: overlay,
  };
}
