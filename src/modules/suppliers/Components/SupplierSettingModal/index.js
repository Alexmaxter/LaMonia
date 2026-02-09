import { el } from "../../../../core/dom.js";
import "./style.css";

// Cambiado el nombre a SupplierSettingsModal para coincidir con el import del controller
export function SupplierSettingsModal({
  supplier = {},
  onClose,
  onSave,
  onDelete = null,
}) {
  // --- PALETA DE COLORES TECH PASTEL ---
  const TECH_PALETTE = [
    "#FFB3BA",
    "#FFDFBA",
    "#FFFFBA",
    "#BAFFC9",
    "#BAE1FF",
    "#E2F0CB",
    "#FFDAC1",
    "#B5EAD7",
    "#C7CEEA",
    "#F0E68C",
    "#E6E6FA",
    "#FFC0CB",
  ];
  const getRandomColor = () =>
    TECH_PALETTE[Math.floor(Math.random() * TECH_PALETTE.length)];

  // --- ESTADO LOCAL ---
  // Normalizamos los items para que sean siempre objetos {name, color}
  let currentItems = (supplier.defaultItems || []).map((item) => {
    if (typeof item === "string")
      return { name: item, color: getRandomColor() };
    return { name: item.name, color: item.color || getRandomColor() };
  });

  let currentType = supplier.type || "monetary";
  let editingIndex = null;

  // Verificar si el proveedor tiene deuda
  const currentBalance = parseFloat(supplier.balance) || 0;
  const canDelete = currentBalance === 0;

  // --- ICONOS TECH ---
  const iconClose = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  const iconPlus = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
  const iconEdit = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
  const iconTrash = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
  const iconCheck = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  const iconWarning = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;

  // --- INPUTS ---
  const nameInput = el("input", {
    className: "tech-input",
    value: supplier.name || "",
    placeholder: "NOMBRE COMERCIAL",
  });

  const aliasInput = el("input", {
    className: "tech-input",
    value: supplier.alias || "",
    placeholder: "ALIAS / CBU / DATOS",
  });

  const typeSelect = el("select", { className: "tech-select" }, [
    el("option", { value: "monetary" }, "MONETARIO (SOLO DINERO)"),
    el("option", { value: "stock" }, "STOCK (MERCADERÍA / ITEMS)"),
  ]);
  typeSelect.value = currentType;

  const itemsContainer = el("div", { className: "tech-items-list" });

  // --- RENDERIZADO ITEMS ---
  const renderItems = () => {
    itemsContainer.innerHTML = "";
    if (currentItems.length === 0) {
      itemsContainer.innerHTML =
        '<div class="empty-params">NO HAY PRODUCTOS DEFINIDOS</div>';
      return;
    }

    currentItems.forEach((item, index) => {
      let content;
      const colorDot = el("span", {
        className: "settings-color-dot",
        style: `background-color: ${item.color};`,
      });

      if (editingIndex === index) {
        const editInput = el("input", {
          className: "tech-input-small",
          value: item.name,
          autofocus: true,
          onkeydown: (e) => {
            if (e.key === "Enter") saveEdit(index, editInput.value);
            if (e.key === "Escape") {
              editingIndex = null;
              renderItems();
            }
          },
        });

        content = el("div", { className: "tech-item-row editing" }, [
          colorDot,
          editInput,
          el("button", {
            type: "button",
            className: "btn-icon-action confirm",
            innerHTML: iconCheck,
            onclick: () => saveEdit(index, editInput.value),
          }),
        ]);
      } else {
        content = el("div", { className: "tech-item-row" }, [
          colorDot,
          el("span", { className: "item-name" }, item.name),
          el("div", { className: "row-actions" }, [
            el("button", {
              type: "button",
              className: "btn-icon-action",
              innerHTML: iconEdit,
              onclick: () => {
                editingIndex = index;
                renderItems();
              },
            }),
            el("button", {
              type: "button",
              className: "btn-icon-action delete",
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

  const saveEdit = (index, newName) => {
    const val = newName.trim();
    if (val) {
      currentItems[index].name = val;
      if (!currentItems[index].color)
        currentItems[index].color = getRandomColor();
    }
    editingIndex = null;
    renderItems();
  };

  const newItemInput = el("input", {
    className: "tech-input-add",
    placeholder: "NUEVO PRODUCTO...",
    onkeydown: (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addBtn.click();
      }
    },
  });

  const addBtn = el("button", {
    type: "button",
    className: "btn-square-add",
    innerHTML: iconPlus,
    onclick: () => {
      const val = newItemInput.value.trim();
      if (
        val &&
        !currentItems.some((i) => i.name.toUpperCase() === val.toUpperCase())
      ) {
        currentItems.push({ name: val, color: getRandomColor() });
        newItemInput.value = "";
        renderItems();
      }
    },
  });

  const catalogSection = el(
    "div",
    {
      className: "tech-section-block",
      style: `display: ${currentType === "stock" ? "flex" : "none"}`,
    },
    [
      el("div", { className: "section-header" }, "CATÁLOGO DE PRODUCTOS"),
      el("div", { className: "add-row-group" }, [newItemInput, addBtn]),
      itemsContainer,
    ],
  );

  typeSelect.onchange = (e) => {
    currentType = e.target.value;
    catalogSection.style.display = currentType === "stock" ? "flex" : "none";
  };

  renderItems();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nameInput.value.trim()) return;

    onSave({
      name: nameInput.value.trim(),
      alias: aliasInput.value.trim(),
      type: currentType,
      defaultItems: currentType === "stock" ? currentItems : [],
    });
  };

  // --- NUEVA FUNCION: Manejar eliminación de proveedor ---
  const handleDeleteSupplier = (e) => {
    e.preventDefault();

    if (!canDelete) {
      alert(
        `No se puede eliminar el proveedor porque tiene un saldo pendiente de $${Math.abs(currentBalance).toLocaleString("es-AR")}`,
      );
      return;
    }

    const confirmDelete = confirm(
      `¿Estás seguro de eliminar permanentemente a "${supplier.name}"?\n\nEsta acción eliminará:\n• El proveedor\n• Todo su historial de transacciones\n• Configuración de items\n\nESTA ACCIÓN NO SE PUEDE DESHACER.`,
    );

    if (confirmDelete) {
      const doubleConfirm = confirm(
        "ÚLTIMA CONFIRMACIÓN:\n¿Realmente deseas eliminar este proveedor y todo su historial?",
      );

      if (doubleConfirm && typeof onDelete === "function") {
        onDelete(supplier.id);
      }
    }
  };

  // --- ZONA DE PELIGRO (solo si existe el proveedor y la función onDelete) ---
  const dangerZone =
    supplier.id && typeof onDelete === "function"
      ? el("div", { className: "danger-zone-section" }, [
          el("div", { className: "danger-zone-header" }, [
            el("span", { innerHTML: iconWarning }),
            el("span", {}, "ZONA DE PELIGRO"),
          ]),
          el("div", { className: "danger-zone-content" }, [
            el(
              "p",
              { className: "danger-zone-text" },
              canDelete
                ? "Este proveedor no tiene deuda pendiente. Puedes eliminarlo permanentemente."
                : `No se puede eliminar. Saldo pendiente: $${Math.abs(currentBalance).toLocaleString("es-AR")}`,
            ),
            el("button", {
              type: "button",
              className: `btn-danger-delete ${canDelete ? "" : "disabled"}`,
              disabled: !canDelete,
              onclick: handleDeleteSupplier,
              innerHTML: iconTrash + " ELIMINAR PROVEEDOR",
            }),
          ]),
        ])
      : null;

  return el(
    "div",
    {
      className: "tech-modal-overlay",
      onclick: (e) => e.target.className === "tech-modal-overlay" && onClose(),
    },
    [
      el("div", { className: "tech-modal-card" }, [
        el("div", { className: "tech-modal-header" }, [
          el("h2", {}, "CONFIGURACIÓN"),
          el("button", {
            className: "btn-close-tech",
            innerHTML: iconClose,
            onclick: onClose,
          }),
        ]),

        el("form", { onsubmit: handleSubmit, className: "tech-form-body" }, [
          el("div", { className: "form-group" }, [
            el("label", {}, "NOMBRE PROVEEDOR"),
            nameInput,
          ]),
          el("div", { className: "form-group" }, [
            el("label", {}, "DATOS DE PAGO / ALIAS"),
            aliasInput,
          ]),
          el("div", { className: "form-group" }, [
            el("label", {}, "TIPO DE GESTIÓN"),
            typeSelect,
          ]),

          catalogSection,

          // NUEVA: Zona de Peligro
          dangerZone,

          el("div", { className: "tech-modal-footer" }, [
            el(
              "button",
              {
                type: "button",
                className: "btn-tech-cancel",
                onclick: onClose,
              },
              "CANCELAR",
            ),
            el(
              "button",
              { type: "submit", className: "btn-tech-save" },
              "GUARDAR CAMBIOS",
            ),
          ]),
        ]),
      ]),
    ],
  );
}
