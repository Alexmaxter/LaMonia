import { el } from "../../../../core/dom.js";
import "./style.css";

export function SupplierSettingsModal({
  supplier = {},
  onClose,
  onSave,
  onDelete = null,
}) {
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

  const generateId = () =>
    Date.now().toString(36) + Math.random().toString(36).substr(2);

  const renames = {};

  let currentItems = (supplier.defaultItems || []).map((item) => {
    if (typeof item === "string") {
      return {
        id: generateId(),
        name: item,
        originalName: item,
        color: getRandomColor(),
        price: 0,
        unit: "Unidad",
      };
    }
    return {
      id: item.id || generateId(),
      name: item.name,
      originalName: item.name,
      color: item.color || getRandomColor(),
      price: parseFloat(item.price) || 0,
      unit: item.unit || "Unidad",
    };
  });

  let currentType = supplier.type || "monetary";

  const currentBalance = parseFloat(supplier.balance) || 0;
  const canDelete = currentBalance === 0;

  const iconClose = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  const iconPlus = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
  const iconTrash = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
  const iconWarning = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;

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

  // --- CONTENEDOR DE LA LISTA TIPO HOJA DE CÁLCULO ---
  // No tiene altura fija ni overflow, crece naturalmente.
  const itemsContainer = el("div", {
    style:
      "display: flex; flex-direction: column; gap: 8px; margin-top: 12px; padding-bottom: 20px;",
  });

  // Función para manejar el "Inline Editing" continuo
  const handleItemChange = (index, field, value) => {
    const item = currentItems[index];

    if (field === "name") {
      const upperNew = value.trim().toUpperCase();
      if (item.originalName && item.originalName.toUpperCase() !== upperNew) {
        renames[item.originalName.toUpperCase()] = upperNew;
      }
    }

    if (field === "price") {
      item.price = parseFloat(value) || 0;
    } else {
      item[field] = value;
    }
  };

  const renderItems = () => {
    itemsContainer.innerHTML = "";

    // Encabezados de tabla (Ocultos en móvil, visibles en pantallas grandes)
    if (currentItems.length > 0) {
      itemsContainer.appendChild(
        el(
          "div",
          {
            className: "spreadsheet-header",
            style:
              "display: grid; grid-template-columns: 36px 3fr 1.5fr 1.5fr 36px; gap: 8px; padding: 0 4px; margin-bottom: 4px;",
          },
          [
            el(
              "span",
              {
                style:
                  "font-size: 0.7rem; color: #888; text-align: center; font-weight: bold;",
              },
              "ID",
            ),
            el(
              "span",
              { style: "font-size: 0.7rem; color: #888; font-weight: bold;" },
              "NOMBRE DEL INSUMO",
            ),
            el(
              "span",
              { style: "font-size: 0.7rem; color: #888; font-weight: bold;" },
              "PRECIO ($)",
            ),
            el(
              "span",
              { style: "font-size: 0.7rem; color: #888; font-weight: bold;" },
              "MEDIDA",
            ),
            el("span", {}),
          ],
        ),
      );
    } else {
      itemsContainer.appendChild(
        el("div", { className: "empty-params" }, "NO HAY PRODUCTOS DEFINIDOS"),
      );
      return;
    }

    currentItems.forEach((item, index) => {
      // Cada fila es una grilla constante lista para editar
      const row = el(
        "div",
        {
          style:
            "display: grid; grid-template-columns: 36px 3fr 1.5fr 1.5fr 36px; gap: 8px; align-items: center; background: #fff; border: 1px solid #ddd; border-radius: 6px; padding: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);",
        },
        [
          // 1. Color Picker Mínimo
          el("input", {
            type: "color",
            value: item.color,
            style:
              "width: 100%; height: 36px; padding: 0; border: none; border-radius: 4px; cursor: pointer; background: transparent;",
            onchange: (e) => handleItemChange(index, "color", e.target.value),
          }),

          // 2. Nombre
          el("input", {
            type: "text",
            className: "tech-input",
            placeholder: "Ej: Harina",
            value: item.name,
            style: "margin: 0; padding: 8px;",
            oninput: (e) => handleItemChange(index, "name", e.target.value),
          }),

          // 3. Precio
          el("input", {
            type: "number",
            className: "tech-input",
            placeholder: "0.00",
            min: "0",
            step: "0.01",
            value: item.price || "",
            style: "margin: 0; padding: 8px;",
            oninput: (e) => handleItemChange(index, "price", e.target.value),
          }),

          // 4. Unidad
          el(
            "select",
            {
              className: "tech-select",
              style:
                "margin: 0; padding: 8px; height: 100%; border-radius: 4px;",
              onchange: (e) => handleItemChange(index, "unit", e.target.value),
            },
            [
              ...["Unidad", "Kg", "Litro", "Gr", "Caja", "Pack"].map((u) =>
                el("option", { value: u, selected: item.unit === u }, u),
              ),
            ],
          ),

          // 5. Botón Basurero
          el("button", {
            type: "button",
            className: "btn-icon-action delete",
            style:
              "width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: none; border: none;",
            innerHTML: iconTrash,
            onclick: () => {
              if (confirm(`¿Eliminar la fila?`)) {
                currentItems.splice(index, 1);
                renderItems();
              }
            },
          }),
        ],
      );
      itemsContainer.appendChild(row);
    });
  };

  const addBtn = el("button", {
    type: "button",
    className: "btn-primary",
    style:
      "display: flex; justify-content: center; align-items: center; gap: 8px; padding: 10px; font-size: 0.85rem;",
    innerHTML: iconPlus + "<span>AÑADIR FILA</span>",
    onclick: () => {
      // Agregamos al final de la lista como en una hoja de cálculo
      currentItems.push({
        id: generateId(),
        name: "",
        originalName: null,
        color: getRandomColor(),
        price: "",
        unit: "Unidad",
      });
      renderItems();

      // Auto-scroll hacia la nueva fila al fondo
      setTimeout(() => {
        itemsContainer.lastElementChild?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 50);
    },
  });

  const catalogSection = el(
    "div",
    {
      className: "tech-section-block",
      style: `display: ${currentType === "stock" ? "flex" : "none"}; flex-direction: column;`,
    },
    [
      el(
        "div",
        {
          style:
            "display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 2px solid #eee; padding-bottom: 8px;",
        },
        [
          el(
            "div",
            { className: "section-header", style: "margin: 0;" },
            "CATÁLOGO (EDICIÓN RÁPIDA)",
          ),
          addBtn,
        ],
      ),
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

    // Limpieza: Filtramos filas que el usuario dejó vacías sin querer
    const cleanItems =
      currentType === "stock"
        ? currentItems
            .filter((i) => i.name.trim() !== "")
            .map(({ id, name, color, price, unit }) => ({
              id,
              name: name.trim(),
              color,
              price,
              unit,
            }))
        : [];

    onSave({
      name: nameInput.value.trim(),
      alias: aliasInput.value.trim(),
      type: currentType,
      defaultItems: cleanItems,
      renames: Object.keys(renames).length > 0 ? renames : null,
    });
  };

  const handleDeleteSupplier = (e) => {
    e.preventDefault();
    if (!canDelete) {
      alert(
        `No se puede eliminar el proveedor porque tiene un saldo pendiente de $${Math.abs(currentBalance).toLocaleString("es-AR")}`,
      );
      return;
    }
    const confirmDelete = confirm(
      `¿Estás seguro de eliminar permanentemente a "${supplier.name}"?`,
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

  const dangerZone =
    supplier.id && typeof onDelete === "function"
      ? el(
          "div",
          { className: "danger-zone-section", style: "margin-top: 24px;" },
          [
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
          ],
        )
      : null;

  return el(
    "div",
    {
      className: "tech-modal-overlay",
      style: "padding: 5vh 0;", // Espacio superior e inferior para no chocar
      onclick: (e) =>
        e.target.className.includes("tech-modal-overlay") && onClose(),
    },
    [
      // Aumentamos el width al 85% de la pantalla y forzamos el overflow automático
      el(
        "div",
        {
          className: "tech-modal-card",
          style:
            "width: 85%; max-width: 1000px; max-height: 90vh; display: flex; flex-direction: column;",
        },
        [
          // El Header del modal queda fijo (No hace scroll)
          el(
            "div",
            { className: "tech-modal-header", style: "flex-shrink: 0;" },
            [
              el("h2", {}, "CONFIGURACIÓN"),
              el("button", {
                className: "btn-close-tech",
                innerHTML: iconClose,
                onclick: onClose,
              }),
            ],
          ),

          // El Body del Formulario SÍ hace scroll (overflow-y: auto)
          el(
            "form",
            {
              onsubmit: handleSubmit,
              className: "tech-form-body",
              style: "flex-grow: 1; overflow-y: auto; padding: 20px;",
            },
            [
              // Fila de datos principales del Proveedor
              el(
                "div",
                {
                  style:
                    "display: grid; grid-template-columns: 2fr 2fr 1.5fr; gap: 16px; margin-bottom: 24px; border-bottom: 2px solid #eee; padding-bottom: 16px;",
                },
                [
                  el("div", { className: "form-group", style: "margin: 0;" }, [
                    el("label", {}, "NOMBRE PROVEEDOR"),
                    nameInput,
                  ]),
                  el("div", { className: "form-group", style: "margin: 0;" }, [
                    el("label", {}, "DATOS DE PAGO / ALIAS"),
                    aliasInput,
                  ]),
                  el("div", { className: "form-group", style: "margin: 0;" }, [
                    el("label", {}, "TIPO DE GESTIÓN"),
                    typeSelect,
                  ]),
                ],
              ),

              catalogSection,

              dangerZone,
            ],
          ),

          // El Footer del modal queda fijo (No hace scroll)
          el(
            "div",
            {
              className: "tech-modal-footer",
              style: "flex-shrink: 0; padding: 16px 20px;",
            },
            [
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
                "GUARDAR PROVEEDOR",
              ),
            ],
          ),
        ],
      ),
    ],
  );
}
