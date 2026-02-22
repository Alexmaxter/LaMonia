/**
 * Toast System — Estilo Brutalista
 *
 * API:
 *   toast.success("Transacción guardada")
 *   toast.error("No se pudo conectar con Firebase")
 *   toast.warning("El saldo quedará en negativo")
 *   toast.info("Se actualizaron 3 movimientos")
 *
 * Opciones (segundo argumento opcional):
 *   toast.success("Guardado", { duration: 5000 })
 *
 * FIX #12: Reemplaza alert() en toda la aplicación.
 */

import { el } from "../../../core/dom.js";
import "./style.css";

// ============================================================
// CONFIGURACIÓN
// ============================================================

const DEFAULTS = {
  duration: 3500, // ms antes de auto-dismiss
  maxVisible: 3, // máximo de toasts visibles simultáneamente
};

const TOAST_TYPES = {
  success: {
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    label: "OK",
  },
  error: {
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    label: "ERROR",
  },
  warning: {
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    label: "AVISO",
  },
  info: {
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
    label: "INFO",
  },
};

// ============================================================
// ESTADO INTERNO
// ============================================================

let container = null;
const activeToasts = [];

// ============================================================
// FUNCIONES INTERNAS
// ============================================================

/** Asegura que el contenedor del stack existe en el DOM */
function ensureContainer() {
  if (container && document.body.contains(container)) return;

  container = el("div", { className: "toast-stack-container" });
  document.body.appendChild(container);
}

/** Elimina un toast del DOM y del array */
function dismissToast(toastEl) {
  // Evitar doble ejecución
  if (!toastEl || toastEl.dataset.dismissing === "true") return;
  toastEl.dataset.dismissing = "true";

  // Animación de salida
  toastEl.classList.add("toast-exit");

  toastEl.addEventListener(
    "animationend",
    () => {
      // Limpiar del array
      const idx = activeToasts.indexOf(toastEl);
      if (idx !== -1) activeToasts.splice(idx, 1);

      // Remover del DOM
      if (toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);

      // Limpiar timer
      if (toastEl._timer) clearTimeout(toastEl._timer);
    },
    { once: true },
  );
}

/** Crea y muestra un toast */
function showToast(type, message, options = {}) {
  ensureContainer();

  const config = TOAST_TYPES[type] || TOAST_TYPES.info;
  const duration = options.duration || DEFAULTS.duration;

  // --- Construir elemento ---
  const toastEl = el("div", { className: `toast-item toast-${type}` }, [
    // Barra lateral de status (firma brutalista)
    el("div", { className: "toast-status-bar" }),

    // Contenido
    el("div", { className: "toast-content" }, [
      el("div", { className: "toast-icon", innerHTML: config.icon }),
      el("div", { className: "toast-body" }, [
        el("span", { className: "toast-type-label" }, config.label),
        el("span", { className: "toast-message" }, message),
      ]),
    ]),

    // Botón cerrar
    el("button", {
      className: "toast-dismiss-btn",
      onclick: () => dismissToast(toastEl),
      innerHTML: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    }),

    // Barra de progreso (auto-dismiss visual)
    el("div", { className: "toast-progress" }, [
      el("div", {
        className: "toast-progress-bar",
        style: `animation-duration: ${duration}ms`,
      }),
    ]),
  ]);

  // --- Respetar límite de visibles ---
  while (activeToasts.length >= DEFAULTS.maxVisible) {
    dismissToast(activeToasts[0]);
  }

  // --- Montar ---
  activeToasts.push(toastEl);
  container.appendChild(toastEl);

  // Forzar reflow para que la animación de entrada arranque
  toastEl.offsetHeight; // eslint-disable-line no-unused-expressions

  // --- Auto-dismiss ---
  toastEl._timer = setTimeout(() => dismissToast(toastEl), duration);

  // --- Pausar timer al hover ---
  toastEl.addEventListener("mouseenter", () => {
    if (toastEl._timer) clearTimeout(toastEl._timer);
    const bar = toastEl.querySelector(".toast-progress-bar");
    if (bar) bar.style.animationPlayState = "paused";
  });

  toastEl.addEventListener("mouseleave", () => {
    const bar = toastEl.querySelector(".toast-progress-bar");
    if (bar) bar.style.animationPlayState = "running";
    toastEl._timer = setTimeout(() => dismissToast(toastEl), 1500);
  });

  return toastEl;
}

// ============================================================
// API PÚBLICA
// ============================================================

export const toast = {
  success: (message, options) => showToast("success", message, options),
  error: (message, options) => showToast("error", message, options),
  warning: (message, options) => showToast("warning", message, options),
  info: (message, options) => showToast("info", message, options),

  /** Cierra todos los toasts activos */
  dismissAll: () => {
    [...activeToasts].forEach(dismissToast);
  },
};
