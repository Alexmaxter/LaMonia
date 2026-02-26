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
 * FIXES aplicados:
 *   - Sistema de cola (queue): los toasts se encolan y se despachan
 *     de a uno cuando hay espacio, evitando la corrupción de índices
 *     por mutación del array durante iteración en cascada.
 *   - dismissToast usa filter() en lugar de splice() para evitar
 *     el bug de índices cuando varios toasts se eliminan en cadena.
 *   - Flag "dismissing" implementada con un WeakSet en lugar de
 *     dataset para no depender del DOM.
 *   - El contenedor se limpia automáticamente al cambiar de ruta
 *     (escucha hashchange), evitando toasts huérfanos entre vistas.
 *   - El timer de auto-dismiss se guarda en un Map keyed por el
 *     elemento, no como propiedad del nodo, para mayor consistencia.
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

/**
 * toastsVisible: Set de elementos actualmente montados en el DOM.
 * Usamos Set en lugar de Array para que las operaciones de
 * agregar/eliminar sean O(1) y no haya problemas de índice.
 */
const toastsVisible = new Set();

/**
 * toastQueue: cola de toasts pendientes de mostrar porque
 * se alcanzó el límite de maxVisible.
 * Cada entrada es { type, message, options }.
 */
const toastQueue = [];

/**
 * dismissingSet: reemplaza el uso de dataset.dismissing en el DOM.
 * WeakSet para no retener referencias a elementos eliminados.
 */
const dismissingSet = new WeakSet();

/**
 * timersMap: guarda el ID del setTimeout de cada toast.
 * Evita guardar propiedades privadas (_timer) sobre nodos del DOM.
 */
const timersMap = new WeakMap();

// ============================================================
// LIMPIEZA AL CAMBIAR DE RUTA
// ============================================================

/**
 * Cuando el usuario navega a otra ruta, descartamos todos los
 * toasts visibles y vaciamos la cola, evitando toasts huérfanos
 * que pertenecen a la vista anterior.
 */
window.addEventListener("hashchange", () => {
  // Vaciar la cola pendiente primero
  toastQueue.length = 0;

  // Descartar todos los visibles sin animación para no bloquear
  // la nueva vista con toasts de la anterior
  [...toastsVisible].forEach((toastEl) => dismissToast(toastEl, true));
});

// ============================================================
// FUNCIONES INTERNAS
// ============================================================

/** Asegura que el contenedor del stack existe en el DOM */
function ensureContainer() {
  if (container && document.body.contains(container)) return;

  container = el("div", { className: "toast-stack-container" });
  document.body.appendChild(container);
}

/**
 * Procesa la cola: si hay espacio disponible y hay toasts esperando,
 * despacha el siguiente.
 * Se llama cada vez que un toast se elimina del DOM.
 */
function processQueue() {
  if (toastQueue.length === 0) return;
  if (toastsVisible.size >= DEFAULTS.maxVisible) return;

  const next = toastQueue.shift();
  mountToast(next.type, next.message, next.options);
}

/**
 * Elimina un toast del DOM y del Set.
 * @param {HTMLElement} toastEl - El elemento a eliminar.
 * @param {boolean} immediate - Si true, elimina sin animación (cambio de ruta).
 */
function dismissToast(toastEl, immediate = false) {
  if (!toastEl) return;
  // Evitar doble ejecución con WeakSet en lugar de dataset
  if (dismissingSet.has(toastEl)) return;
  dismissingSet.add(toastEl);

  // Cancelar el timer de auto-dismiss
  const timerId = timersMap.get(toastEl);
  if (timerId) {
    clearTimeout(timerId);
    timersMap.delete(toastEl);
  }

  if (immediate) {
    // Eliminación sin animación (ej: cambio de ruta)
    // Usamos filter sobre el Set copiado para no mutar durante iteración
    toastsVisible.delete(toastEl);
    if (toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
    processQueue();
    return;
  }

  // Animación de salida
  toastEl.classList.add("toast-exit");

  toastEl.addEventListener(
    "animationend",
    () => {
      // Eliminar del Set de forma segura (no hay índices que corromper)
      toastsVisible.delete(toastEl);

      // Remover del DOM
      if (toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);

      // Intentar despachar el siguiente de la cola
      processQueue();
    },
    { once: true },
  );
}

/**
 * Monta físicamente el toast en el DOM.
 * Solo se llama cuando hay espacio (toastsVisible.size < maxVisible).
 */
function mountToast(type, message, options = {}) {
  ensureContainer();

  const config = TOAST_TYPES[type] || TOAST_TYPES.info;
  const duration = options.duration || DEFAULTS.duration;

  const toastEl = el("div", { className: `toast-item toast-${type}` }, [
    el("div", { className: "toast-status-bar" }),

    el("div", { className: "toast-content" }, [
      el("div", { className: "toast-icon", innerHTML: config.icon }),
      el("div", { className: "toast-body" }, [
        el("span", { className: "toast-type-label" }, config.label),
        el("span", { className: "toast-message" }, message),
      ]),
    ]),

    el("button", {
      className: "toast-dismiss-btn",
      onclick: () => dismissToast(toastEl),
      innerHTML: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    }),

    el("div", { className: "toast-progress" }, [
      el("div", {
        className: "toast-progress-bar",
        style: `animation-duration: ${duration}ms`,
      }),
    ]),
  ]);

  // Registrar en el Set antes de montar en el DOM
  toastsVisible.add(toastEl);
  container.appendChild(toastEl);

  // Forzar reflow para que la animación de entrada arranque correctamente
  // eslint-disable-next-line no-unused-expressions
  toastEl.offsetHeight;

  // Guardar el timer en el WeakMap (no como propiedad del nodo)
  const timerId = setTimeout(() => dismissToast(toastEl), duration);
  timersMap.set(toastEl, timerId);

  // Pausar timer al hover
  toastEl.addEventListener("mouseenter", () => {
    const id = timersMap.get(toastEl);
    if (id) {
      clearTimeout(id);
      timersMap.delete(toastEl);
    }
    const bar = toastEl.querySelector(".toast-progress-bar");
    if (bar) bar.style.animationPlayState = "paused";
  });

  toastEl.addEventListener("mouseleave", () => {
    const bar = toastEl.querySelector(".toast-progress-bar");
    if (bar) bar.style.animationPlayState = "running";

    // Retomar con un tiempo reducido al volver a poner el mouse afuera
    const newId = setTimeout(() => dismissToast(toastEl), 1500);
    timersMap.set(toastEl, newId);
  });

  return toastEl;
}

/**
 * Punto de entrada principal.
 * Decide si montar el toast inmediatamente o encolarlo.
 */
function showToast(type, message, options = {}) {
  if (toastsVisible.size < DEFAULTS.maxVisible) {
    // Hay espacio: montar directamente
    return mountToast(type, message, options);
  }

  // No hay espacio: encolar para cuando se libere un slot
  toastQueue.push({ type, message, options });
  return null;
}

// ============================================================
// API PÚBLICA
// ============================================================

export const toast = {
  success: (message, options) => showToast("success", message, options),
  error: (message, options) => showToast("error", message, options),
  warning: (message, options) => showToast("warning", message, options),
  info: (message, options) => showToast("info", message, options),

  /** Cierra todos los toasts activos y vacía la cola */
  dismissAll: () => {
    toastQueue.length = 0;
    [...toastsVisible].forEach((toastEl) => dismissToast(toastEl));
  },
};
