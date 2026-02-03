import { el } from "../../../../core/dom.js";
import { Button } from "../../../../shared/ui/Button/index.js";
import { Toast } from "../../../../shared/ui/Toast/index.js";
import { Icon } from "../../../../shared/ui/Icon.js";
import "./style.css";

// 1. Aceptamos 'onSubmit' para delegar la acción (Crear o Editar) al padre
// 2. Inicializamos supplier = {} para evitar el crash al crear uno nuevo
export function SupplierConfigModal({ supplier = {}, onClose, onSubmit }) {
  // --- ESTADO LOCAL ---
  // Ahora es seguro acceder a defaultItems con el fallback
  let currentItems = [...(supplier.defaultItems || [])];
  let currentType = supplier.providerType || "money";

  // --- ELEMENTOS UI ---

  // 1. Inputs Principales
  const nameInput = el("input", {
    className: "modern-input",
    value: supplier.name || "", // Manejo de string vacío
    placeholder: "Ej: Distribuidora Central",
    autofocus: true,
  });

  const aliasInput = el("input", {
    className: "modern-input",
    value: supplier.alias || "",
    placeholder: "Ej: CBU, Alias, Teléfono o Email",
  });

  const typeSelect = el(
    "select",
    { className: "modern-select" },
    el("option", { value: "money" }, "💰 Monetario (Solo caja)"),
    el("option", { value: "stock" }, "📦 Mercadería (Control de stock)")
  );
  typeSelect.value = currentType;

  // --- SECCIÓN CATÁLOGO (Lógica) ---
  const itemsListContainer = el("div", { className: "items-grid" });

  const renderItems = () => {
    itemsListContainer.innerHTML = "";

    if (currentItems.length === 0) {
      itemsListContainer.appendChild(
        el("p", { className: "empty-msg" }, "No hay productos configurados.")
      );
      return;
    }

    currentItems.forEach((item, index) => {
      const tag = el(
        "div",
        { className: "item-tag" },
        el("span", {}, item),
        el(
          "button",
          {
            className: "btn-remove-tag",
            type: "button",
            onclick: () => {
              currentItems.splice(index, 1);
              renderItems();
            },
            title: "Quitar ítem",
          },
          Icon("x")
        )
      );
      itemsListContainer.appendChild(tag);
    });
  };

  const newItemInput = el("input", {
    className: "modern-input",
    placeholder: "Nuevo producto (Ej: Hielo 10kg)",
    onkeydown: (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addItemBtn.click();
      }
    },
  });

  const addItemBtn = Button({
    text: "Añadir",
    variant: "secondary",
    onClick: () => {
      const val = newItemInput.value.trim();
      if (!val) return;

      if (currentItems.includes(val)) {
        return Toast.show("Ese producto ya está en la lista", "warning");
      }

      currentItems.push(val);
      newItemInput.value = "";
      renderItems();
      newItemInput.focus();
    },
  });

  const catalogSection = el(
    "div",
    {
      className: "catalog-section",
      style: `display: ${currentType === "stock" ? "block" : "none"}`,
    },
    el(
      "div",
      { className: "form-group" },
      el("label", { className: "form-label" }, "Productos Habituales"),
      el("div", { className: "catalog-input-row" }, newItemInput, addItemBtn)
    ),
    itemsListContainer
  );

  typeSelect.onchange = (e) => {
    currentType = e.target.value;
    catalogSection.style.display = currentType === "stock" ? "block" : "none";

    if (currentType === "stock") {
      catalogSection.animate(
        [
          { opacity: 0, transform: "translateY(-5px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 200, fill: "forwards" }
      );
    }
  };

  renderItems();

  // --- GUARDAR ---
  const handleSave = async (e) => {
    e.preventDefault();
    const newName = nameInput.value.trim();
    if (!newName) return Toast.show("El nombre es obligatorio", "error");

    // Construimos el objeto de datos
    const supplierData = {
      name: newName,
      alias: aliasInput.value.trim(),
      providerType: currentType,
      defaultItems: currentType === "stock" ? currentItems : [],
    };

    try {
      // CORRECCIÓN PRINCIPAL: Usamos onSubmit pasándole los datos.
      // El padre (SupplierListView) decidirá si llama a addSupplier o updateSupplier.
      if (onSubmit) {
        await onSubmit(supplierData);
      }
      // Nota: No cerramos aquí, el padre suele cerrar el modal tras el éxito,
      // o puedes llamar onClose() si tu onSubmit no maneja el cierre.
    } catch (error) {
      console.error(error);
      Toast.show("Error al guardar cambios", "error");
    }
  };

  // --- RENDER FINAL ---
  return el(
    "form",
    { className: "config-form-layout", onsubmit: handleSave },

    el(
      "div",
      { className: "form-group" },
      el("label", { className: "form-label" }, "Nombre del Negocio"),
      nameInput
    ),

    el(
      "div",
      { className: "form-group" },
      el("label", { className: "form-label" }, "Alias / Datos de Pago"),
      aliasInput
    ),

    el(
      "div",
      { className: "form-group" },
      el("label", { className: "form-label" }, "Modalidad de Gestión"),
      typeSelect
    ),

    catalogSection,

    el(
      "div",
      { className: "modal-footer" },
      Button({
        text: "Cancelar",
        variant: "secondary",
        onClick: onClose,
      }),
      Button({
        text: "Guardar Cambios",
        type: "submit",
        variant: "primary",
      })
    )
  );
}
