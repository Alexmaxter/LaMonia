import { el } from "../../../../core/dom.js";
import { FirebaseDB } from "../../../../core/firebase/db.js";
import "./style.css";

// Helper para obtener el nombre del ítem de forma segura
const getSafeName = (item) => {
  if (!item) return "";
  if (typeof item === "string") return item;
  return item.name || item.description || item.desc || "";
};

/**
 * Genera un string YYYY-MM-DD en horario local
 * Evita el error de toISOString() que suma horas por UTC.
 */
const getLocalDateString = (dateInput) => {
  if (!dateInput) return new Date().toLocaleDateString("sv-SE"); // sv-SE usa formato YYYY-MM-DD

  // Si viene de Firestore como Timestamp, lo convertimos a Date
  const date = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

// Función para calcular deuda desde el historial (usada en pagos/créditos)
const calculatePendingFromHistory = (movements) => {
  const totals = {};
  if (!movements || !Array.isArray(movements)) return totals;

  movements.forEach((m) => {
    const type = m.type ? m.type.toLowerCase() : "";
    const isEntry = type === "invoice" || type === "boleta";

    if (m.items && Array.isArray(m.items)) {
      m.items.forEach((item) => {
        const name = getSafeName(item).trim();
        const qty = parseFloat(item.quantity || item.qty || 0);
        if (name) {
          if (!totals[name]) totals[name] = 0;
          totals[name] += isEntry ? qty : -qty;
        }
      });
    }
  });

  // Limpiar saldos insignificantes
  Object.keys(totals).forEach((key) => {
    if (totals[key] <= 0.01) delete totals[key];
  });
  return totals;
};

export function TransactionModal({
  supplier = null,
  suppliers = [],
  initialData = null,
  movements = [],
  onSave,
  onClose,
}) {
  const isEdit = !!initialData?.id;

  // --- ESTADO INTERNO ---
  let currentSupplier = supplier;
  let selectedType = initialData?.type || "invoice";
  let localMovements = [...movements]; // Copia para manejar cambios en selector global

  // ✅ FIX: Evitar NaN inicializando en "0" si amount no existe
  let rawAmount =
    initialData && typeof initialData.amount === "number"
      ? (initialData.amount * 100).toFixed(0)
      : "0";

  let itemsState = [];

  /**
   * INICIALIZADOR DE ITEMS (CORREGIDO)
   */
  const initItemsState = () => {
    itemsState = [];
    const isStockSupplier = currentSupplier?.type === "stock";
    if (!isStockSupplier) return;

    // 1. Edición
    if (isEdit && initialData.items) {
      itemsState = initialData.items.map((i) => ({
        name: getSafeName(i),
        qty: parseFloat(i.quantity || i.qty || 0),
        isLocked: true,
      }));
      return;
    }

    // 2. Pago / Nota de Crédito (Cargar deuda pendiente)
    if (selectedType === "payment" || selectedType === "credit") {
      const debtMap = calculatePendingFromHistory(localMovements);
      itemsState = Object.entries(debtMap)
        .map(([name, pendingQty]) => ({
          name: name,
          qty: 0,
          max: pendingQty,
          isLocked: true,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    // 3. Boleta (Cargar predefinidos)
    else {
      let rawDefaults = currentSupplier?.defaultItems || [];
      if (typeof rawDefaults === "string") {
        rawDefaults = rawDefaults
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s !== "");
      }

      itemsState = rawDefaults.map((it) => ({
        name: getSafeName(it),
        qty: 0,
        isLocked: true,
      }));

      // Si no hay predefinidos, permitir entrada manual
      if (itemsState.length === 0) {
        itemsState.push({ name: "", qty: 0, isLocked: false });
      }
    }
  };

  initItemsState();

  const renderItemsList = () => {
    const container = document.getElementById("items-list-container");
    const sectionTitle = document.getElementById("items-section-title");

    if (!container) return;
    container.innerHTML = "";

    const isStockSupplier = currentSupplier?.type === "stock";

    if (!isStockSupplier) {
      container.style.display = "none";
      if (sectionTitle) sectionTitle.style.display = "none";
      return;
    }

    container.style.display = "flex";
    if (sectionTitle) {
      sectionTitle.style.display = "block";
      sectionTitle.innerHTML =
        selectedType === "invoice"
          ? "INGRESO DE MERCADERÍA"
          : "SELECCIONAR ITEMS A PAGAR";
    }

    const isDebtMode = selectedType === "payment" || selectedType === "credit";

    if (isDebtMode && itemsState.length === 0) {
      container.innerHTML = `
        <div class="empty-state-msg">
          <strong>Al día</strong><br>
          <small>No hay deuda de stock pendiente.</small>
        </div>`;
      return;
    }

    itemsState.forEach((item, index) => {
      let nameComp;
      if (item.isLocked) {
        nameComp = el("div", { className: "item-name-wrapper" }, [
          el("span", { className: "item-name-text" }, item.name),
          isDebtMode && item.max !== undefined
            ? el("span", { className: "badge-debt" }, `Debe: ${item.max}`)
            : null,
        ]);
      } else {
        nameComp = el("input", {
          type: "text",
          className: "input-name-dynamic",
          placeholder: "Producto...",
          value: item.name,
          oninput: (e) => {
            itemsState[index].name = e.target.value;
          },
        });
      }

      const qtyInput = el("input", {
        type: "number",
        className: "stepper-input",
        value: item.qty,
        min: 0,
        onchange: (e) => {
          let v = parseFloat(e.target.value) || 0;
          if (isDebtMode && item.max && v > item.max) v = item.max;
          itemsState[index].qty = v;
          e.target.value = v;
        },
      });

      container.appendChild(
        el("div", { className: "item-row scale-in" }, [
          el("div", { className: "item-left-col" }, [
            isDebtMode
              ? el("div", { style: "width:24px" })
              : el("button", {
                  type: "button",
                  className: "btn-delete-row",
                  innerHTML: "&times;",
                  onclick: () => {
                    itemsState.splice(index, 1);
                    renderItemsList();
                  },
                }),
            nameComp,
          ]),
          el("div", { className: "stepper-wrapper" }, [
            el("button", {
              type: "button",
              className: "stepper-btn",
              innerHTML: "-",
              onclick: () => {
                if (itemsState[index].qty > 0) {
                  itemsState[index].qty--;
                  qtyInput.value = itemsState[index].qty;
                }
              },
            }),
            qtyInput,
            el("button", {
              type: "button",
              className: "stepper-btn",
              innerHTML: "+",
              onclick: () => {
                if (isDebtMode && item.max && itemsState[index].qty >= item.max)
                  return;
                itemsState[index].qty++;
                qtyInput.value = itemsState[index].qty;
              },
            }),
          ]),
        ])
      );
    });

    if (!isDebtMode) {
      container.appendChild(
        el(
          "button",
          {
            type: "button",
            className: "btn-add-item",
            onclick: () => {
              itemsState.push({ name: "", qty: 0, isLocked: false });
              renderItemsList();
            },
          },
          "+ Agregar otro"
        )
      );
    }
  };

  const formatCurrency = (val) =>
    (parseFloat(val) / 100).toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
    });

  const updateTheme = (type) => {
    const heroAmount = document.getElementById("hero-amount");
    if (heroAmount) {
      heroAmount.className = `hero-amount ${
        type === "invoice" ? "theme-danger" : "theme-success"
      }`;
    }
  };

  const headerTitle =
    suppliers.length > 0 && !supplier
      ? el(
          "select",
          {
            className: "supplier-selector-global",
            required: true,
            onchange: async (e) => {
              const sId = e.target.value;
              currentSupplier = suppliers.find((s) => s.id === sId);

              try {
                localMovements = await FirebaseDB.getByFilter(
                  "supplier_transactions",
                  "supplierId",
                  sId,
                  "date",
                  "desc"
                );
              } catch (err) {
                console.error("Error cargando movimientos globales:", err);
                localMovements = [];
              }

              initItemsState();
              renderItemsList();
            },
          },
          [
            el(
              "option",
              { value: "", disabled: true, selected: true },
              "Seleccionar Proveedor..."
            ),
            ...suppliers.map((s) => el("option", { value: s.id }, s.name)),
          ]
        )
      : el(
          "h2",
          { className: "modal-title" },
          currentSupplier?.name || "Proveedor"
        );

  const modal = el(
    "div",
    {
      className: "modal-overlay",
      onclick: (e) => {
        if (e.target.className === "modal-overlay") onClose();
      },
    },
    [
      el("div", { className: "modal-card scale-in" }, [
        el("div", { className: "modal-header" }, [
          el(
            "h3",
            { className: "modal-subtitle" },
            isEdit ? "EDITANDO" : "NUEVA OPERACIÓN"
          ),
          headerTitle,
        ]),
        el(
          "form",
          {
            onsubmit: (e) => {
              e.preventDefault();
              if (!currentSupplier) return alert("Selecciona un proveedor");
              const formData = new FormData(e.target);
              onSave({
                ...initialData,
                supplierId: currentSupplier?.id,
                amount: parseFloat(rawAmount) / 100,
                concept: formData.get("concept"),
                type: selectedType,
                date: new Date(formData.get("date") + "T00:00:00"),
                items: itemsState
                  .filter((i) => i.qty > 0)
                  .map((i) => ({
                    name: i.name.trim(),
                    quantity: parseFloat(i.qty),
                  })),
              });
            },
          },
          [
            el(
              "div",
              { className: "type-selector" },
              ["invoice", "payment", "credit"].map((type) =>
                el(
                  "label",
                  {
                    className: `type-option ${
                      selectedType === type ? "active" : ""
                    }`,
                  },
                  [
                    el("input", {
                      type: "radio",
                      name: "type",
                      value: type,
                      checked: selectedType === type,
                      onchange: (e) => {
                        selectedType = e.target.value;
                        const labels = e.target
                          .closest(".type-selector")
                          .querySelectorAll(".type-option");
                        labels.forEach((l) => l.classList.remove("active"));
                        e.target.parentElement.classList.add("active");

                        updateTheme(selectedType);
                        initItemsState();
                        renderItemsList();
                      },
                    }),
                    el(
                      "span",
                      {},
                      type === "invoice"
                        ? "Boleta"
                        : type === "payment"
                        ? "Pago"
                        : "Nota Crédito"
                    ),
                  ]
                )
              )
            ),
            el("div", { className: "amount-wrapper" }, [
              el("input", {
                id: "hero-amount",
                className: `hero-amount ${
                  selectedType === "invoice" ? "theme-danger" : "theme-success"
                }`,
                value: formatCurrency(rawAmount),
                oninput: (e) => {
                  rawAmount = e.target.value.replace(/\D/g, "");
                  e.target.value = formatCurrency(rawAmount);
                },
              }),
            ]),
            el("h4", {
              id: "items-section-title",
              className: "section-label",
              style: "display:none",
            }),
            el("div", {
              id: "items-list-container",
              className: "items-section",
            }),
            el("div", { className: "meta-inputs" }, [
              el("div", { className: "input-group" }, [
                el("label", {}, "Fecha"),
                el("input", {
                  type: "date",
                  name: "date",
                  required: true,
                  // ✅ FIX: Usa la fecha original en edición y evita desfase UTC
                  value: getLocalDateString(initialData?.date),
                }),
              ]),
              el("div", { className: "input-group" }, [
                el("label", {}, "Obs"),
                el("input", {
                  type: "text",
                  name: "concept",
                  placeholder: "...",
                  value: initialData?.concept || "",
                }),
              ]),
            ]),
            el("div", { className: "modal-footer" }, [
              el(
                "button",
                { type: "button", className: "btn-cancel", onclick: onClose },
                "Cancelar"
              ),
              el(
                "button",
                { type: "submit", className: "btn-confirm" },
                "Guardar"
              ),
            ]),
          ]
        ),
      ]),
    ]
  );

  setTimeout(() => renderItemsList(), 0);
  return modal;
}
