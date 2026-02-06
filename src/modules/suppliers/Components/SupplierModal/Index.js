import { el } from "../../../../core/dom.js";
import "./style.css";

export function SupplierModal({ onSave, onClose, supplier = null }) {
  // --- STATE ---
  // Si editamos, tomamos los valores del proveedor existente
  let selectedType = supplier?.type || "monetary";
  let defaultItems = supplier?.defaultItems ? [...supplier.defaultItems] : [];

  // --- ICONOS ---
  const iconClose = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  const iconPlus = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
  const iconTrash = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

  // --- INPUTS ---
  const nameInput = el("input", {
    type: "text",
    className: "fusion-input",
    placeholder: "EJ: DISTRIBUIDORA SUR",
    required: true,
    value: supplier?.name || "",
  });

  const aliasInput = el("input", {
    type: "text",
    className: "fusion-input",
    placeholder: "EJ: ALIAS.BANCARIO / CBU",
    value: supplier?.alias || "",
  });

  // --- GESTIÓN DE ITEMS (Solo Stock) ---
  const itemInput = el("input", {
    type: "text",
    className: "fusion-input-sm",
    placeholder: "Nuevo producto (Ej: Cajón Pollo)",
  });

  const itemsListContainer = el("div", { className: "items-preview-list" });

  const renderItems = () => {
    itemsListContainer.innerHTML = "";
    if (defaultItems.length === 0) {
      itemsListContainer.appendChild(
        el("div", { className: "empty-msg-sm" }, "Sin items definidos"),
      );
      return;
    }

    defaultItems.forEach((item, index) => {
      // Normalizamos: el item puede ser string o objeto {name: '...'}
      const itemName = typeof item === "string" ? item : item.name;

      const row = el("div", { className: "item-preview-row" }, [
        el("span", {}, itemName),
        el(
          "button",
          {
            type: "button",
            className: "btn-icon-danger",
            onclick: () => {
              defaultItems.splice(index, 1);
              renderItems();
            },
          },
          [el("span", { innerHTML: iconTrash })],
        ),
      ]);
      itemsListContainer.appendChild(row);
    });
  };

  const btnAddItem = el(
    "button",
    {
      type: "button",
      className: "btn-secondary-sm",
      onclick: () => {
        const val = itemInput.value.trim();
        if (!val) return;
        // Agregamos como objeto para consistencia futura
        defaultItems.push({ name: val });
        itemInput.value = "";
        itemInput.focus();
        renderItems();
      },
    },
    [el("span", { innerHTML: iconPlus }), el("span", {}, "Agregar")],
  );

  const stockPanel = el("div", { className: "stock-config-panel" }, [
    el("div", { className: "add-item-group" }, [itemInput, btnAddItem]),
    itemsListContainer,
  ]);

  // --- TABS PARA TIPO ---
  const updateVisibility = () => {
    // Mostrar/Ocultar panel de stock según selección
    if (selectedType === "stock") {
      stockPanel.style.display = "block";
      btnTypeStock.classList.add("active");
      btnTypeMonetary.classList.remove("active");
      renderItems(); // Refrescar lista visual
    } else {
      stockPanel.style.display = "none";
      btnTypeMonetary.classList.add("active");
      btnTypeStock.classList.remove("active");
    }
  };

  const btnTypeMonetary = el("div", {
    className: "fusion-tab",
    textContent: "MONETARIO",
    onclick: () => {
      selectedType = "monetary";
      updateVisibility();
    },
  });

  const btnTypeStock = el("div", {
    className: "fusion-tab",
    textContent: "STOCK / ITEMS",
    onclick: () => {
      selectedType = "stock";
      updateVisibility();
    },
  });

  // Inicializar estado visual
  updateVisibility();

  // --- LOGICA SUBMIT ---
  const handleSubmit = (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.focus();
      return;
    }

    onSave({
      ...(supplier ? { id: supplier.id } : {}), // Mantener ID si es edición
      name,
      alias: aliasInput.value.trim(),
      type: selectedType,
      // Solo guardamos items si es stock
      defaultItems: selectedType === "stock" ? defaultItems : [],
    });
  };

  const createLabelGroup = (label, element) => {
    return el("div", { className: "fusion-group" }, [
      el("span", { className: "fusion-label" }, label),
      element,
    ]);
  };

  // --- RENDER FINAL ---
  const modalContent = el("div", { className: "fusion-card" }, [
    el("div", { className: "fusion-header" }, [
      el("h2", {}, supplier ? "EDITAR PROVEEDOR" : "NUEVO PROVEEDOR"),
      el("button", {
        className: "btn-close-fusion",
        onclick: onClose,
        innerHTML: iconClose,
      }),
    ]),

    el("form", { className: "fusion-body", onsubmit: handleSubmit }, [
      // Tipo
      el("div", { className: "fusion-group" }, [
        el("span", { className: "fusion-label" }, "TIPO DE GESTIÓN"),
        el("div", { className: "fusion-tabs-row" }, [
          btnTypeMonetary,
          btnTypeStock,
        ]),
      ]),

      // Panel condicional de items (aparece debajo de los tabs si es stock)
      el("div", { className: "fusion-group" }, [stockPanel]),

      createLabelGroup("NOMBRE COMERCIAL *", nameInput),
      createLabelGroup("DATOS DE PAGO (OPCIONAL)", aliasInput),

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
          supplier ? "GUARDAR CAMBIOS" : "REGISTRAR",
        ),
      ]),
    ]),
  ]);

  setTimeout(() => nameInput.focus(), 50);

  return el(
    "div",
    {
      className: "fusion-overlay mesh-bg",
      onclick: (e) =>
        e.target.classList.contains("fusion-overlay") && onClose(),
    },
    [modalContent],
  );
}
