import { el } from "../../../core/dom.js";
import { Icon } from "../Icon.js";
import "./style.css";

export function Modal({ title, content, footer, onClose }) {
  // Crear overlay
  const overlay = el("div", { className: "modal-overlay" });

  // Crear contenedor del modal
  const modalContainer = el("div", { className: "modal-container" });

  // --- HEADER ---
  const header = el("div", { className: "modal-header" });

  const titleEl = el("h2", { className: "modal-title" }, title || "");

  const closeBtn = el(
    "button",
    { className: "modal-close-btn", type: "button", title: "Cerrar" },
    Icon("x")
  );

  header.append(titleEl, closeBtn);

  // --- BODY ---
  const body = el("div", { className: "modal-body" });
  if (typeof content === "string") {
    // Usamos un wrapper seguro o insertamos directo si confías en el string
    body.innerHTML = content;
  } else if (content instanceof HTMLElement) {
    body.appendChild(content);
  }

  // --- FOOTER (Opcional) ---
  const footerEl = el("div", { className: "modal-footer" });
  if (footer) {
    if (footer instanceof HTMLElement) {
      footerEl.appendChild(footer);
    }
  }

  // Ensamblar estructura
  modalContainer.append(header, body);
  if (footer) modalContainer.appendChild(footerEl);
  overlay.appendChild(modalContainer);

  // --- MÉTODOS DE CONTROL ---

  const close = () => {
    // Eliminación directa del DOM (Sin esperas ni transiciones)
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    if (onClose) onClose();
  };

  const open = () => {
    // Inserción directa (Aparece al instante)
    document.body.appendChild(overlay);
    // Enfocamos el botón de cerrar por accesibilidad (opcional pero recomendado)
    setTimeout(() => closeBtn.focus(), 0);
  };

  // Eventos
  closeBtn.onclick = close;

  // Cerrar al hacer click fuera del modal (en el overlay oscuro)
  overlay.onclick = (e) => {
    if (e.target === overlay) close();
  };

  // Cerrar con tecla ESC
  const handleEsc = (e) => {
    if (e.key === "Escape" && document.body.contains(overlay)) {
      close();
      document.removeEventListener("keydown", handleEsc);
    }
  };
  document.addEventListener("keydown", handleEsc);

  return {
    open,
    close,
    element: overlay,
  };
}
