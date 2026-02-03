import { el } from "../../../../core/dom.js";
import "./style.css";

export function SupplierModal({ onSave, onClose }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    onSave({
      name: formData.get("name").trim(), // Se eliminó .toUpperCase() para permitir minúsculas
      alias: formData.get("alias")?.trim() || "",
      type: formData.get("type") || "money", // Ahora permite elegir entre 'money' o 'stock'
      balance: 0,
      stockDebt: {},
      createdAt: new Date(),
    });
  };

  return el(
    "div",
    {
      className: "modal-overlay",
      onclick: (e) => e.target.className === "modal-overlay" && onClose(),
    },
    el("div", { className: "modal-content-optimized scale-in" }, [
      el("div", { className: "modal-header-info" }, [
        el("span", { className: "modal-subtitle" }, "NUEVO REGISTRO"),
        el("h2", { className: "modal-title-name" }, "Alta de Proveedor"),
      ]),
      el("form", { onsubmit: handleSubmit }, [
        el("div", { className: "form-body" }, [
          el("div", { className: "input-group" }, [
            el("label", {}, "Nombre / Razón Social"),
            el("input", {
              type: "text",
              name: "name",
              required: true,
              autofocus: true,
              placeholder: "Ej: Distribuidora Sur",
            }),
          ]),
          el("div", { className: "input-group" }, [
            el("label", {}, "Tipo de Gestión"),
            el("select", { name: "type", className: "modal-select" }, [
              el("option", { value: "money" }, "Monetario (Solo $ / Efectivo)"),
              el("option", { value: "stock" }, "Mercadería (Control de Items)"),
            ]),
          ]),
          el("div", { className: "input-group" }, [
            el("label", {}, "Alias / CBU (Opcional)"),
            el("input", {
              type: "text",
              name: "alias",
              placeholder: "Datos de transferencia...",
            }),
          ]),
        ]),
        el("div", { className: "modal-footer" }, [
          el(
            "button",
            { type: "button", className: "btn-ghost", onclick: onClose },
            "Cancelar"
          ),
          el(
            "button",
            { type: "submit", className: "btn-confirm" },
            "Crear Proveedor"
          ),
        ]),
      ]),
    ])
  );
}
