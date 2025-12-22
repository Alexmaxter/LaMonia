// src/modules/suppliers/components/SupplierConfigModal/index.js
import { el } from "../../../../core/dom.js";
import { Button } from "../../../../shared/ui/Button/index.js";
import { Toast } from "../../../../shared/ui/Toast/index.js";
import { Icon } from "../../../../shared/ui/Icon.js";
import { supplierService } from "../../services/SupplierService.js";
import "./style.css";

export function SupplierConfigModal({ supplier, onClose, onUpdate }) {
  // 1. Estados Locales
  let currentItems = [...(supplier.defaultItems || [])];
  let currentType = supplier.providerType || "money";

  // --- ELEMENTOS DEL FORMULARIO ---
  const nameInput = el("input", {
    className: "input-dark",
    value: supplier.name,
    placeholder: "Nombre del negocio",
  });

  const aliasInput = el("input", {
    className: "input-dark",
    value: supplier.alias || "",
    placeholder: "Ej: mi.alias.pago o CBU",
  });

  const typeSelect = el(
    "select",
    { className: "input-dark" },
    el("option", { value: "money" }, "💰 Monetario (Solo Plata)"),
    el("option", { value: "stock" }, "📦 Mercadería (Control de Stock)")
  );
  typeSelect.value = currentType;

  // --- GESTIÓN DE ÍTEMS (CATÁLOGO) ---
  const itemsListContainer = el("div", { className: "items-grid-dark" });

  const renderItems = () => {
    itemsListContainer.innerHTML = "";
    currentItems.forEach((item, index) => {
      const row = el(
        "div",
        { className: "item-tag-dark" },
        el("span", {}, item),
        el(
          "button",
          {
            className: "btn-remove-item",
            type: "button",
            onclick: () => {
              currentItems.splice(index, 1);
              renderItems();
            },
          },
          Icon("x") // Usando un icono de cierre simple
        )
      );
      itemsListContainer.appendChild(row);
    });
  };

  const newItemInput = el("input", {
    className: "input-dark",
    placeholder: "Ej: Hielo 10kg",
  });

  const addItemBtn = Button({
    text: "Añadir",
    variant: "secondary",
    className: "btn-dark-secondary",
    onClick: () => {
      const val = newItemInput.value.trim();
      if (val) {
        if (currentItems.includes(val))
          return Toast.show("El ítem ya existe", "warning");
        currentItems.push(val);
        newItemInput.value = "";
        renderItems();
      }
    },
  });

  // Sección de catálogo (se muestra solo si es tipo stock)
  const catalogSection = el(
    "div",
    {
      className: "catalog-section-dark",
      style: `display: ${currentType === "stock" ? "block" : "none"}`,
    },
    el("label", { className: "label-dark" }, "Productos Habituales"),
    el("div", { className: "catalog-input-group" }, newItemInput, addItemBtn),
    itemsListContainer
  );

  // Escuchar cambios de tipo
  typeSelect.onchange = (e) => {
    currentType = e.target.value;
    catalogSection.style.display = currentType === "stock" ? "block" : "none";
  };

  renderItems();

  // --- LÓGICA DE GUARDADO ---
  const handleSave = async (e) => {
    e.preventDefault();
    const newName = nameInput.value.trim();
    if (!newName) return Toast.show("El nombre es obligatorio", "error");

    try {
      await supplierService.updateSupplier(supplier.id, {
        name: newName,
        alias: aliasInput.value.trim(),
        providerType: currentType,
        defaultItems: currentType === "stock" ? currentItems : [], // Limpiar si cambia a monetario
      });

      Toast.show("Proveedor actualizado con éxito");
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      Toast.show("Error al guardar: " + error.message, "error");
    }
  };

  // --- ESTRUCTURA FINAL ---
  return el(
    "form",
    { className: "form-dark", onsubmit: handleSave },
    el(
      "div",
      { className: "form-group" },
      el("label", { className: "label-dark" }, "Nombre del Negocio"),
      nameInput
    ),
    el(
      "div",
      { className: "form-group" },
      el("label", { className: "label-dark" }, "Alias / Datos de Pago"),
      aliasInput
    ),
    el(
      "div",
      { className: "form-group" },
      el("label", { className: "label-dark" }, "Tipo de Proveedor"),
      typeSelect
    ),
    catalogSection,
    el(
      "div",
      { className: "form-actions" },
      Button({
        text: "Cancelar",
        variant: "secondary",
        className: "btn-dark-secondary",
        onClick: onClose,
      }),
      Button({
        text: "Guardar Cambios",
        type: "submit",
        className: "btn-dark-primary",
      })
    )
  );
}
