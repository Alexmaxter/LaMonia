// IMPORTANTE: Ajuste de rutas para salir desde:
// src/modules/suppliers/components/SupplierConfigModal/index.js

import { el } from "../../../../core/dom.js";
import { Modal } from "../../../../shared/ui/Modal/index.js";
import { Button } from "../../../../shared/ui/Button/index.js";
import { Icon } from "../../../../shared/ui/Icon.js";
import { supplierService } from "../../services/SupplierService.js";

export function SupplierConfigModal({ supplier, onUpdate }) {
  // 1. Estados Locales
  let currentItems = [...(supplier.defaultItems || [])];
  let currentType = supplier.providerType || "money";

  // Inputs
  const nameInput = el("input", {
    value: supplier.name,
    placeholder: "Nombre del negocio",
  });
  const aliasInput = el("input", {
    value: supplier.alias || "",
    placeholder: "Alias / CBU / Nota",
  });

  // Selector de Tipo
  const typeSelect = el(
    "select",
    {},
    el("option", { value: "money" }, "💰 Monetario (Solo Plata)"),
    el("option", { value: "stock" }, "📦 Mercadería (Control de Stock)")
  );
  typeSelect.value = currentType;

  // --- SECCIÓN GESTIÓN DE ÍTEMS ---
  const itemsListContainer = el("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      marginTop: "10px",
    },
  });

  const renderItems = () => {
    itemsListContainer.innerHTML = "";
    currentItems.forEach((item, index) => {
      const row = el(
        "div",
        { style: { display: "flex", gap: "8px", alignItems: "center" } },
        el("input", {
          value: item,
          readOnly: true,
          style: {
            background: "#f1f5f9",
            border: "1px solid #e2e8f0",
            flex: "1",
          },
        }),
        el(
          "button",
          {
            className: "btn-icon btn-delete",
            type: "button",
            title: "Quitar ítem",
            onClick: () => {
              currentItems.splice(index, 1);
              renderItems();
            },
          },
          Icon("trash")
        )
      );
      itemsListContainer.appendChild(row);
    });
  };

  const newItemInput = el("input", {
    placeholder: "Nuevo producto (Ej: Hielo 10kg)",
  });
  const addItemBtn = Button({
    text: "Agregar",
    variant: "secondary",
    onClick: () => {
      const val = newItemInput.value.trim();
      if (val) {
        currentItems.push(val);
        newItemInput.value = "";
        renderItems();
        newItemInput.focus();
      }
    },
  });

  const catalogSection = el(
    "div",
    {
      id: "catalog-section",
      style: {
        display: currentType === "stock" ? "block" : "none",
        borderTop: "1px solid #e2e8f0",
        marginTop: "15px",
        paddingTop: "15px",
      },
    },
    el(
      "label",
      { style: { fontWeight: "600", marginBottom: "8px", display: "block" } },
      "Catálogo de Productos Habituales"
    ),
    el(
      "div",
      { style: { display: "flex", gap: "8px", marginBottom: "10px" } },
      newItemInput,
      addItemBtn
    ),
    itemsListContainer
  );

  typeSelect.onchange = (e) => {
    currentType = e.target.value;
    catalogSection.style.display = currentType === "stock" ? "block" : "none";
  };

  renderItems();

  // --- MODAL ---
  let modalRef = null;

  const handleSave = async () => {
    const newName = nameInput.value.trim();
    if (!newName) return alert("El nombre es obligatorio");

    try {
      await supplierService.updateSupplier(supplier.id, {
        name: newName,
        alias: aliasInput.value.trim(),
        providerType: currentType,
        defaultItems: currentItems,
      });

      if (onUpdate) onUpdate();
      modalRef.close();
      alert("Configuración guardada");
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  const content = el(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: "15px" } },
    el(
      "div",
      {},
      el("label", { style: { fontWeight: "600" } }, "Nombre"),
      nameInput
    ),
    el(
      "div",
      {},
      el("label", { style: { fontWeight: "600" } }, "Alias / Datos"),
      aliasInput
    ),
    el(
      "div",
      {},
      el("label", { style: { fontWeight: "600" } }, "Tipo de Proveedor"),
      typeSelect
    ),
    catalogSection
  );

  modalRef = Modal({
    title: "⚙️ Configuración de Proveedor",
    content: content,
    footer: el(
      "div",
      { style: { display: "flex", justifyContent: "flex-end", gap: "10px" } },
      Button({
        text: "Cancelar",
        variant: "secondary",
        onClick: () => modalRef.close(),
      }),
      Button({ text: "Guardar Cambios", onClick: handleSave })
    ),
  });

  return modalRef;
}
