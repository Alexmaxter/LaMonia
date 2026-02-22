import { el } from "../../../../core/dom.js";
import { BusinessService } from "../../BusinessService.js";
import { businessStore } from "../../BusinessStore.js";
import { toast } from "../../../../shared/ui/Toast/index.js";
import "./style.css";

const BUSINESS_TYPES = [
  "Restaurante",
  "Bar",
  "Panadería / Pastelería",
  "Cafetería",
  "Pizzería",
  "Rotisería",
  "Comida rápida",
  "Catering",
  "Otro",
];

const CURRENCIES = [
  { code: "ARS", label: "Peso Argentino (ARS)" },
  { code: "USD", label: "Dólar Estadounidense (USD)" },
  { code: "CLP", label: "Peso Chileno (CLP)" },
  { code: "UYU", label: "Peso Uruguayo (UYU)" },
  { code: "BRL", label: "Real Brasileño (BRL)" },
];

export function BusinessPanel() {
  let isEditMode = false;
  let currentData = null;

  // --- CONTENEDOR PRINCIPAL ---
  const root = el("div", { className: "business-panel" });

  // --- HELPERS ---
  const formatDate = (ts) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  // =========================================================
  // MODO VISTA (Read-only)
  // =========================================================
  const renderViewMode = (data) => {
    const isEmpty = !data;

    const fields = [
      { label: "Nombre del negocio", value: data?.name },
      { label: "Tipo de negocio", value: data?.type },
      { label: "CUIT / Identificación fiscal", value: data?.cuit },
      { label: "Teléfono / WhatsApp", value: data?.phone },
      { label: "Email de contacto", value: data?.email },
      { label: "Dirección", value: data?.address },
      { label: "Moneda", value: data?.currency },
    ];

    return el("div", { className: "bp-view-mode" }, [
      // HEADER DEL PANEL
      el("div", { className: "bp-panel-header" }, [
        el("div", { className: "bp-header-left" }, [
          el("div", { className: "bp-title-group" }, [
            el("span", { className: "bp-eyebrow" }, "Perfil del negocio"),
            el(
              "h2",
              { className: "bp-title" },
              isEmpty ? "Sin configurar" : data.name,
            ),
          ]),
          !isEmpty && data.type
            ? el("span", { className: "bp-type-badge" }, data.type)
            : null,
        ]),
        el(
          "button",
          {
            className: "bp-btn-edit",
            onclick: () => {
              isEditMode = true;
              render();
            },
          },
          [
            el("span", { className: "bp-btn-icon" }, editIcon()),
            "Editar información",
          ],
        ),
      ]),

      isEmpty
        ? // ESTADO VACÍO
          el("div", { className: "bp-empty-state" }, [
            el("div", { className: "bp-empty-icon" }, emptyIcon()),
            el(
              "p",
              { className: "bp-empty-title" },
              "Todavía no configuraste tu negocio",
            ),
            el(
              "p",
              { className: "bp-empty-sub" },
              "Completá la información para personalizar el sistema y prepararte para cuando otras personas lo usen.",
            ),
            el(
              "button",
              {
                className: "bp-btn-primary",
                onclick: () => {
                  isEditMode = true;
                  render();
                },
              },
              "Completar ahora",
            ),
          ])
        : // GRILLA DE DATOS
          el("div", { className: "bp-data-grid" }, [
            ...fields
              .filter((f) => f.value)
              .map((f) =>
                el("div", { className: "bp-field-item" }, [
                  el("span", { className: "bp-field-label" }, f.label),
                  el("span", { className: "bp-field-value" }, f.value),
                ]),
              ),
            data?.updatedAt
              ? el("div", { className: "bp-field-item bp-field-full" }, [
                  el(
                    "span",
                    { className: "bp-field-label" },
                    "Última actualización",
                  ),
                  el(
                    "span",
                    { className: "bp-field-value bp-field-muted" },
                    formatDate(data.updatedAt),
                  ),
                ])
              : null,
          ]),
    ]);
  };

  // =========================================================
  // MODO EDICIÓN
  // =========================================================
  const renderEditMode = (data) => {
    // Inputs
    const nameInput = el("input", {
      type: "text",
      className: "bp-input",
      placeholder: "Ej: La Monia Resto",
      value: data?.name || "",
    });

    const typeSelect = el("select", { className: "bp-select" }, [
      el("option", { value: "" }, "Seleccioná un tipo"),
      ...BUSINESS_TYPES.map((t) =>
        el("option", { value: t, selected: data?.type === t }, t),
      ),
    ]);

    const cuitInput = el("input", {
      type: "text",
      className: "bp-input",
      placeholder: "Ej: 20-12345678-9",
      value: data?.cuit || "",
    });

    const phoneInput = el("input", {
      type: "tel",
      className: "bp-input",
      placeholder: "Ej: +54 9 11 1234-5678",
      value: data?.phone || "",
    });

    const emailInput = el("input", {
      type: "email",
      className: "bp-input",
      placeholder: "Ej: contacto@mirestaurante.com",
      value: data?.email || "",
    });

    const addressInput = el("input", {
      type: "text",
      className: "bp-input",
      placeholder: "Ej: Av. Corrientes 1234, CABA",
      value: data?.address || "",
    });

    const currencySelect = el(
      "select",
      { className: "bp-select" },
      CURRENCIES.map((c) =>
        el(
          "option",
          { value: c.code, selected: (data?.currency || "ARS") === c.code },
          c.label,
        ),
      ),
    );

    const handleSave = async () => {
      const name = nameInput.value.trim();
      if (!name) {
        toast.warning("El nombre del negocio es obligatorio");
        nameInput.focus();
        return;
      }

      const payload = {
        name,
        type: typeSelect.value,
        cuit: cuitInput.value.trim(),
        phone: phoneInput.value.trim(),
        email: emailInput.value.trim(),
        address: addressInput.value.trim(),
        currency: currencySelect.value,
      };

      try {
        saveBtn.disabled = true;
        saveBtn.textContent = "Guardando...";
        await BusinessService.save(payload);
        businessStore.setBusiness(payload);
        currentData = payload;
        isEditMode = false;
        toast.success("Información del negocio guardada");
        render();
      } catch (err) {
        toast.error("No se pudo guardar. Intentá de nuevo.");
        saveBtn.disabled = false;
        saveBtn.textContent = "Guardar cambios";
      }
    };

    const saveBtn = el(
      "button",
      { className: "bp-btn-primary", onclick: handleSave },
      "Guardar cambios",
    );

    const cancelBtn = el(
      "button",
      {
        className: "bp-btn-ghost",
        onclick: () => {
          isEditMode = false;
          render();
        },
      },
      "Cancelar",
    );

    const createField = (label, input, hint = null) =>
      el("div", { className: "bp-form-field" }, [
        el("label", { className: "bp-form-label" }, label),
        input,
        hint ? el("span", { className: "bp-form-hint" }, hint) : null,
      ]);

    return el("div", { className: "bp-edit-mode" }, [
      // HEADER
      el("div", { className: "bp-panel-header" }, [
        el("div", { className: "bp-header-left" }, [
          el("div", { className: "bp-title-group" }, [
            el("span", { className: "bp-eyebrow" }, "Editar perfil"),
            el("h2", { className: "bp-title" }, "Información del negocio"),
          ]),
        ]),
      ]),

      // FORMULARIO
      el("div", { className: "bp-form" }, [
        // Sección: Identidad
        el("div", { className: "bp-form-section" }, [
          el("h3", { className: "bp-section-title" }, "Identidad"),
          el("div", { className: "bp-form-grid" }, [
            createField("Nombre del negocio *", nameInput),
            createField("Tipo de negocio", typeSelect),
            createField(
              "CUIT / Identificación fiscal",
              cuitInput,
              "Sin guiones ni espacios, o con el formato que prefieras",
            ),
          ]),
        ]),

        // Separador
        el("div", { className: "bp-section-divider" }),

        // Sección: Contacto
        el("div", { className: "bp-form-section" }, [
          el("h3", { className: "bp-section-title" }, "Contacto"),
          el("div", { className: "bp-form-grid" }, [
            createField("Teléfono / WhatsApp", phoneInput),
            createField("Email de contacto", emailInput),
            createField(
              "Dirección",
              addressInput,
              "Dirección física del local principal",
            ),
          ]),
        ]),

        // Separador
        el("div", { className: "bp-section-divider" }),

        // Sección: Sistema
        el("div", { className: "bp-form-section" }, [
          el(
            "h3",
            { className: "bp-section-title" },
            "Preferencias del sistema",
          ),
          el("div", { className: "bp-form-grid" }, [
            createField(
              "Moneda",
              currencySelect,
              "Se usará en reportes y visualización de montos",
            ),
          ]),
        ]),

        // FOOTER DEL FORM
        el("div", { className: "bp-form-footer" }, [cancelBtn, saveBtn]),
      ]),
    ]);
  };

  // =========================================================
  // RENDER PRINCIPAL
  // =========================================================
  const render = () => {
    root.innerHTML = "";

    const state = businessStore.getState();

    if (state.loading) {
      root.appendChild(
        el("div", { className: "bp-loading" }, [
          el("div", { className: "bp-loading-bar" }),
          el(
            "span",
            { className: "bp-loading-text" },
            "Cargando configuración...",
          ),
        ]),
      );
      return;
    }

    currentData = state.business;
    const content = isEditMode
      ? renderEditMode(currentData)
      : renderViewMode(currentData);

    root.appendChild(content);
  };

  // =========================================================
  // INICIALIZACIÓN
  // =========================================================
  const init = async () => {
    businessStore.setLoading(true);
    render();
    try {
      const data = await BusinessService.get();
      businessStore.setBusiness(data);
    } catch (err) {
      businessStore.setError("No se pudo cargar la configuración");
      toast.error("Error al cargar la configuración del negocio");
    }
    render();
  };

  const unsubscribe = businessStore.subscribe(() => {
    if (!isEditMode) render();
  });

  root.destroy = () => unsubscribe();

  init();

  return root;
}

// --- ICONOS SVG ---
function editIcon() {
  const el2 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  el2.setAttribute("width", "14");
  el2.setAttribute("height", "14");
  el2.setAttribute("viewBox", "0 0 24 24");
  el2.setAttribute("fill", "none");
  el2.setAttribute("stroke", "currentColor");
  el2.setAttribute("stroke-width", "2");
  el2.innerHTML = `<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>`;
  return el2;
}

function emptyIcon() {
  const el2 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  el2.setAttribute("width", "40");
  el2.setAttribute("height", "40");
  el2.setAttribute("viewBox", "0 0 24 24");
  el2.setAttribute("fill", "none");
  el2.setAttribute("stroke", "currentColor");
  el2.setAttribute("stroke-width", "1");
  el2.innerHTML = `<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line>`;
  return el2;
}
