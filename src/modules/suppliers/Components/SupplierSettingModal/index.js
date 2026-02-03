import { el } from "../../../../core/dom.js";
import "./style.css";

export function SupplierSettingsModal({ supplier = {}, onClose, onSave }) {
  // ✅ Cambiado: de onSubmit a onSave
  // --- ESTADO LOCAL ---
  let currentItems = [...(supplier.defaultItems || [])];
  let currentType = supplier.type || "money";
  let editingIndex = null; // Para controlar qué ítem estamos editando

  // --- ICONOS (SVG) ---
  const iconEdit = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
  const iconTrash = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
  const iconCheck = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

  // --- ELEMENTOS DE LA UI ---
  const nameInput = el("input", {
    className: "setting-input",
    value: supplier.name || "",
    placeholder: "Nombre del proveedor",
  });

  const aliasInput = el("input", {
    className: "setting-input",
    value: supplier.alias || "",
    placeholder: "Alias / CBU / Datos de pago",
  });

  const typeSelect = el("select", { className: "setting-select" }, [
    el("option", { value: "money" }, "Monetario (Solo $ / Efectivo)"),
    el("option", { value: "stock" }, "Mercadería (Control de Items)"),
  ]);
  typeSelect.value = currentType;

  const itemsContainer = el("div", { className: "setting-items-list" });

  // --- RENDERIZADO DE LA LISTA DE PRODUCTOS ---
  const renderItems = () => {
    itemsContainer.innerHTML = "";
    if (currentItems.length === 0) {
      itemsContainer.innerHTML =
        '<p class="empty-text">No hay productos definidos.</p>';
      return;
    }

    currentItems.forEach((item, index) => {
      let content;

      if (editingIndex === index) {
        // MODO EDICIÓN
        const editInput = el("input", {
          className: "setting-input-small edit-mode",
          value: item,
          autofocus: true,
          onkeydown: (e) => {
            if (e.key === "Enter") saveEdit(index, editInput.value);
            if (e.key === "Escape") {
              editingIndex = null;
              renderItems();
            }
          },
        });

        content = el("div", { className: "setting-item-tag editing" }, [
          editInput,
          el("div", { className: "item-actions" }, [
            el("button", {
              type: "button",
              className: "btn-edit-item confirm",
              innerHTML: iconCheck,
              onclick: () => saveEdit(index, editInput.value),
            }),
          ]),
        ]);
      } else {
        // MODO VISTA
        content = el("div", { className: "setting-item-tag" }, [
          el("span", {}, item),
          el("div", { className: "item-actions" }, [
            el("button", {
              type: "button",
              className: "btn-edit-item",
              innerHTML: iconEdit,
              onclick: () => {
                editingIndex = index;
                renderItems();
              },
            }),
            el("button", {
              type: "button",
              className: "btn-remove-item",
              innerHTML: iconTrash,
              onclick: () => {
                currentItems.splice(index, 1);
                renderItems();
              },
            }),
          ]),
        ]);
      }
      itemsContainer.appendChild(content);
    });
  };

  const saveEdit = (index, newValue) => {
    const val = newValue.trim();
    if (val) currentItems[index] = val;
    editingIndex = null;
    renderItems();
  };

  const newItemInput = el("input", {
    className: "setting-input-small",
    placeholder: "Agregar producto...",
    onkeydown: (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addBtn.click();
      }
    },
  });

  const addBtn = el("button", {
    type: "button",
    className: "btn-add-setting",
    innerHTML: "Añadir",
    onclick: () => {
      const val = newItemInput.value.trim();
      if (val && !currentItems.includes(val)) {
        currentItems.push(val);
        newItemInput.value = "";
        renderItems();
      }
    },
  });

  const catalogSection = el(
    "div",
    {
      className: "catalog-config-section",
      style: `display: ${currentType === "stock" ? "block" : "none"}`,
    },
    [
      el("label", { className: "setting-label" }, "Catálogo de Productos"),
      el("div", { className: "setting-add-row" }, [newItemInput, addBtn]),
      itemsContainer,
    ]
  );

  typeSelect.onchange = (e) => {
    currentType = e.target.value;
    catalogSection.style.display = currentType === "stock" ? "block" : "none";
  };

  renderItems();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nameInput.value.trim()) return;

    // ✅ Cambiado: Llama a onSave en lugar de onSubmit
    onSave({
      name: nameInput.value.trim(),
      alias: aliasInput.value.trim(),
      type: currentType,
      defaultItems: currentType === "stock" ? currentItems : [],
    });
  };

  return el(
    "div",
    {
      className: "modal-overlay",
      onclick: (e) => e.target.className === "modal-overlay" && onClose(),
    },
    [
      el("div", { className: "setting-modal scale-in" }, [
        el("div", { className: "modal-header" }, [
          el("h2", {}, "Ajustes de Proveedor"),
          el("button", {
            className: "btn-close-modal",
            innerHTML: "&times;",
            onclick: onClose,
          }),
        ]),
        el("form", { onsubmit: handleSubmit }, [
          el("div", { className: "setting-group" }, [
            el("label", { className: "setting-label" }, "Nombre Comercial"),
            nameInput,
          ]),
          el("div", { className: "setting-group" }, [
            el(
              "label",
              { className: "setting-label" },
              "Datos de Pago / Alias"
            ),
            aliasInput,
          ]),
          el("div", { className: "setting-group" }, [
            el("label", { className: "setting-label" }, "Tipo de Gestión"),
            typeSelect,
          ]),

          catalogSection,

          el("div", { className: "modal-footer" }, [
            el(
              "button",
              { type: "submit", className: "btn-save" },
              "Guardar Cambios"
            ),
            el(
              "button",
              { type: "button", className: "btn-cancel", onclick: onClose },
              "Cancelar"
            ),
          ]),
        ]),
      ]),
    ]
  );
}
