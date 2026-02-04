import { el } from "../../../../core/dom.js";
import "./style.css";

export function SupplierModal({ onSave, onClose }) {
  // --- STATE ---
  let selectedType = "monetary";

  // --- ICONOS ---
  const iconClose = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

  // --- INPUTS (Estilo limpio de línea) ---
  const nameInput = el("input", {
    type: "text",
    className: "fusion-input",
    placeholder: "EJ: DISTRIBUIDORA SUR",
    required: true,
  });

  const aliasInput = el("input", {
    type: "text",
    className: "fusion-input",
    placeholder: "EJ: ALIAS.BANCARIO / CBU",
  });

  // --- TABS PARA TIPO ---
  const btnTypeMonetary = el("div", {
    className: "fusion-tab active",
    textContent: "MONETARIO",
    onclick: () => setType("monetary"),
  });

  const btnTypeStock = el("div", {
    className: "fusion-tab",
    textContent: "STOCK / ITEMS",
    onclick: () => setType("stock"),
  });

  const setType = (type) => {
    selectedType = type;
    if (type === "monetary") {
      btnTypeMonetary.classList.add("active");
      btnTypeStock.classList.remove("active");
    } else {
      btnTypeMonetary.classList.remove("active");
      btnTypeStock.classList.add("active");
    }
  };

  // --- LOGICA ---
  const handleSubmit = (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.focus();
      return;
    }

    onSave({
      name,
      alias: aliasInput.value.trim(),
      type: selectedType,
      defaultItems: [],
    });
  };

  const createLabelGroup = (label, element) => {
    return el("div", { className: "fusion-group" }, [
      el("span", { className: "fusion-label" }, label),
      element,
    ]);
  };

  // --- RENDER ---
  const modalContent = el("div", { className: "fusion-card" }, [
    // HEADER FUSIÓN (Gris con borde grueso)
    el("div", { className: "fusion-header" }, [
      el("h2", {}, "NUEVO PROVEEDOR"),
      el("button", {
        className: "btn-close-fusion",
        onclick: onClose,
        innerHTML: iconClose,
      }),
    ]),

    // BODY
    el("form", { className: "fusion-body", onsubmit: handleSubmit }, [
      // Selector Tipo
      el("div", { className: "fusion-group" }, [
        el("span", { className: "fusion-label" }, "TIPO DE GESTIÓN"),
        el("div", { className: "fusion-tabs-row" }, [
          btnTypeMonetary,
          btnTypeStock,
        ]),
      ]),

      createLabelGroup("NOMBRE COMERCIAL *", nameInput),
      createLabelGroup("DATOS DE PAGO (OPCIONAL)", aliasInput),

      // Footer
      el("div", { className: "fusion-footer" }, [
        el(
          "button",
          {
            type: "button",
            className: "btn-fusion-cancel",
            onclick: onClose,
          },
          "CANCELAR",
        ),
        el(
          "button",
          {
            type: "submit",
            className: "btn-fusion-save",
          },
          "REGISTRAR",
        ),
      ]),
    ]),
  ]);

  setTimeout(() => nameInput.focus(), 50);

  return el(
    "div",
    {
      className: "fusion-overlay mesh-bg", // Fondo de puntos
      onclick: (e) =>
        e.target.classList.contains("fusion-overlay") && onClose(),
    },
    [modalContent],
  );
}
