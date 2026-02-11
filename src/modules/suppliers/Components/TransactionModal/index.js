import { el } from "../../../../core/dom.js";
import { FirebaseDB } from "../../../../core/firebase/db.js";
import "./style.css";

// --- HELPERS ---
const getSafeName = (item) => {
  if (!item) return "";
  if (typeof item === "string") return item;
  return item.name || item.description || item.desc || "";
};

const getSafeColor = (item) => {
  if (!item || typeof item === "string") return "#ddd";
  return item.color || "#ddd";
};

// --- LOGICA DE CÁLCULO DE PENDIENTES (CORREGIDA PARA IDs) ---
const calculatePendingFromHistory = (movements, defaultItems = []) => {
  const totals = {}; // Key: ID (preferible) o NOMBRE (fallback)

  // 1. Mapa de items por defecto para búsqueda rápida
  const catalogById = {};
  const catalogByName = {};

  if (defaultItems && Array.isArray(defaultItems)) {
    defaultItems.forEach((d) => {
      // Usamos el ID si existe, o un placeholder si no (aunque deberían tenerlo)
      const id = d.id || `temp_${d.name}`;
      const name = getSafeName(d).trim().toUpperCase();

      const itemData = {
        qty: 0,
        color: getSafeColor(d),
        isDefault: true,
        id: id,
        name: d.name, // Nombre original display
      };

      totals[id] = itemData;
      catalogById[id] = id;
      if (name) catalogByName[name] = id; // Puntero para recuperar items viejos por nombre
    });
  }

  // 2. Procesar historial
  if (movements && Array.isArray(movements)) {
    movements.forEach((m) => {
      const type = m.type ? m.type.toLowerCase().trim() : "";
      const isEntry = type === "invoice" || type === "boleta";

      if (m.items && Array.isArray(m.items)) {
        m.items.forEach((item) => {
          const rawName = getSafeName(item).trim().toUpperCase();
          const qty = parseFloat(item.quantity || item.qty || 0);

          // --- ESTRATEGIA DE VINCULACIÓN ---
          let targetId = item.id; // 1. Intento directo por ID

          // 2. Si no tiene ID (legacy), buscamos por nombre en el catálogo actual
          if (!targetId && rawName && catalogByName[rawName]) {
            targetId = catalogByName[rawName];
          }

          // 3. Si sigue sin ID, es un item huérfano o legacy sin coincidencia. Usamos el nombre como ID.
          if (!targetId) {
            targetId = rawName;
          }

          // Si no existe en acumuladores, lo creamos
          if (!totals[targetId]) {
            totals[targetId] = {
              qty: 0,
              color: getSafeColor(item),
              id: item.id || null,
              name: getSafeName(item),
            };
          }

          // Actualizar color si encontramos uno mejor
          let color = getSafeColor(item);
          if (color !== "#ddd") totals[targetId].color = color;

          // Sumar/Restar Stock
          totals[targetId].qty += isEntry ? qty : -qty;
        });
      }
    });
  }

  // Filtrar resultados
  const result = {};
  Object.keys(totals).forEach((key) => {
    if (
      totals[key].qty > 0.01 ||
      totals[key].qty < -0.01 ||
      totals[key].isDefault
    ) {
      result[key] = totals[key];
    }
  });
  return result;
};

// --- COMPONENTE PRINCIPAL ---
export function TransactionModal({
  supplier = null,
  suppliers = [],
  initialData = null,
  movements = [],
  onSave,
  onClose,
  onDelete = null, // NUEVA PROP para eliminar transacción
}) {
  const isEdit = !!initialData?.id;

  // ICONOS
  const iconClose = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  const iconTrash = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
  const iconPlus = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
  const iconChevronLeft = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>`;
  const iconChevronRight = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>`;

  // ESTADO - Aseguramos minúsculas desde el inicio
  let currentSupplier = supplier;
  let selectedType = initialData?.type
    ? initialData.type.toLowerCase()
    : "invoice";
  let localMovements = [...movements];

  // BUFFER DE CENTAVOS
  let centsBuffer =
    initialData && typeof initialData.amount === "number"
      ? Math.round(initialData.amount * 100).toString()
      : "0";

  let itemsState = [];
  let selectedDate = initialData?.date
    ? initialData.date.toDate
      ? initialData.date.toDate()
      : new Date(initialData.date)
    : new Date();
  let calendarViewDate = new Date(selectedDate);

  // --- LOGICA DE GUARDADO ---
  const handleSaveAction = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!currentSupplier) {
      alert("Por favor selecciona un proveedor");
      return;
    }

    const conceptInput = document.getElementById("tx-concept-area");
    const conceptVal = conceptInput ? conceptInput.value.trim() : "";
    const finalAmount = parseFloat(centsBuffer) / 100;

    // FIX: Permitir monto 0 si es proveedor de stock
    // Si NO es stock, mantenemos la validación estricta de monto > 0
    const isStock = currentSupplier?.type === "stock";

    if (!isStock && finalAmount <= 0) {
      alert("El monto debe ser mayor a cero");
      return;
    }

    const payload = {
      supplierId: currentSupplier?.id,
      amount: finalAmount,
      concept: conceptVal,
      // FIX: Forzamos minúsculas al guardar
      type: selectedType.toLowerCase(),
      date: selectedDate,
      items: itemsState
        .filter((i) => i.qty > 0)
        .map((i) => ({
          id: i.id || null, // <--- GUARDAMOS EL ID AQUI
          name: i.name.trim(),
          quantity: parseFloat(i.qty),
          color: i.color || "#ddd",
        })),
    };

    if (isEdit && initialData?.id) {
      payload.id = initialData.id;
    }

    if (typeof onSave === "function") {
      onSave(payload);
    }
  };

  // --- NUEVA FUNCION: Manejar eliminación ---
  const handleDeleteAction = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!isEdit || !initialData?.id) return;

    const confirmDelete = confirm(
      "¿Estás seguro de eliminar esta transacción? Esta acción no se puede deshacer.",
    );

    if (confirmDelete && typeof onDelete === "function") {
      onDelete(initialData.id);
    }
  };

  const formatATMDisplay = (bufferStr) => {
    const val = parseInt(bufferStr || "0", 10);
    const amount = val / 100;
    return `$ ${amount.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const updateATMInput = () => {
    const input = document.getElementById("hero-atm-input");
    if (input) {
      input.value = formatATMDisplay(centsBuffer);
    }
  };

  // --- SUGERENCIAS ---
  const renderSuggestions = () => {
    if (!currentSupplier) return null;
    const suggestions = [];
    const usedAmounts = new Set();
    const totalDebt = parseFloat(currentSupplier.balance) || 0;

    if (selectedType === "payment" && totalDebt > 1) {
      suggestions.push({ amount: totalDebt, isTotal: true });
      usedAmounts.add(totalDebt);
    }

    const sortedInvoices = [...localMovements]
      .filter((m) => (m.type || "").toLowerCase() === "invoice")
      .sort((a, b) => {
        const dA = a.date.seconds ? a.date.seconds : new Date(a.date).getTime();
        const dB = b.date.seconds ? b.date.seconds : new Date(b.date).getTime();
        return dB - dA;
      });

    const limit = selectedType === "payment" && totalDebt > 1 ? 2 : 3;
    let count = 0;

    for (const inv of sortedInvoices) {
      if (count >= limit) break;
      const amt = parseFloat(inv.amount);
      if (amt > 0 && !usedAmounts.has(amt)) {
        suggestions.push({ amount: amt, isTotal: false });
        usedAmounts.add(amt);
        count++;
      }
    }

    if (suggestions.length === 0) return null;

    return el("div", { className: "suggestions-wrapper" }, [
      el("span", { className: "suggestions-label" }, "SUGERENCIAS"),
      el(
        "div",
        { className: "suggestions-row" },
        suggestions.map((s) =>
          el(
            "button",
            {
              type: "button",
              className: `tech-chip ${s.isTotal ? "chip-total" : "chip-hist"}`,
              onclick: (e) => {
                e.preventDefault();
                centsBuffer = Math.round(s.amount * 100).toString();
                updateATMInput();
              },
            },
            [
              el(
                "span",
                { className: "chip-val" },
                `$${s.amount.toLocaleString("es-AR")}`,
              ),
            ],
          ),
        ),
      ),
    ]);
  };

  const refreshSuggestions = () => {
    const container = document.getElementById("dynamic-suggestions-container");
    if (container) {
      container.innerHTML = "";
      const newSugg = renderSuggestions();
      if (newSugg) container.appendChild(newSugg);
    }
  };

  // --- ITEMS LOGIC ---
  const initItemsState = () => {
    itemsState = [];
    const isStockSupplier = currentSupplier?.type === "stock";
    if (!isStockSupplier) return;

    if (isEdit && initialData?.items && initialData.items.length > 0) {
      itemsState = initialData.items.map((i) => ({
        id: i.id || null, // <--- RECUPERAMOS EL ID
        name: getSafeName(i),
        qty: parseFloat(i.quantity || i.qty || 0),
        color: getSafeColor(i),
        isLocked: true,
      }));
      return;
    }

    const debtMap = calculatePendingFromHistory(
      localMovements,
      currentSupplier?.defaultItems,
    );

    // Convertimos el map de objetos a array
    itemsState = Object.values(debtMap)
      .map((data) => ({
        id: data.id, // <--- MANTENEMOS EL ID
        name: data.name,
        qty: 0,
        max: selectedType === "payment" ? data.qty : undefined,
        color: data.color || "#ddd",
        isLocked: true,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const addCustomItem = () => {
    const customName = prompt("Nombre del ítem personalizado:");
    if (!customName || !customName.trim()) return;

    const normalized = customName.trim().toUpperCase();

    const exists = itemsState.find((i) => i.name.toUpperCase() === normalized);
    if (exists) {
      alert("Ya existe un ítem con ese nombre");
      return;
    }

    // INTENTO DE VINCULACIÓN AUTOMÁTICA
    // Si el usuario escribe "Harina" y existe en el catálogo, le asignamos su ID
    let linkedId = null;
    let linkedColor = "#ddd";

    if (currentSupplier?.defaultItems) {
      const match = currentSupplier.defaultItems.find(
        (d) => d.name.toUpperCase() === normalized,
      );
      if (match) {
        linkedId = match.id;
        linkedColor = match.color || "#ddd";
      }
    }

    itemsState.push({
      id: linkedId, // <--- ASIGNAMOS ID SI COINCIDE
      name: customName.trim(),
      qty: 0,
      color: linkedColor,
      isLocked: false,
    });
    renderItemsList();
  };

  const removeItem = (index) => {
    if (itemsState[index].isLocked) return;
    itemsState.splice(index, 1);
    renderItemsList();
  };

  const updateItemQty = (index, delta) => {
    const item = itemsState[index];
    let newQty = item.qty + delta;
    if (newQty < 0) newQty = 0;
    if (item.max !== undefined && newQty > item.max) newQty = item.max;
    item.qty = newQty;
    renderItemsList();
  };

  const renderItemsList = () => {
    const container = document.getElementById("items-list-wrapper");
    if (!container) return;

    const isStockSupplier = currentSupplier?.type === "stock";
    if (!isStockSupplier) {
      container.innerHTML = "";
      container.style.display = "none";
      return;
    }
    container.style.display = "flex";

    container.innerHTML = "";
    const itemsToShow = itemsState;

    if (itemsToShow.length === 0 && selectedType !== "invoice") {
      container.appendChild(
        el("div", { className: "empty-stock-msg" }, "No hay ítems registrados"),
      );
      return;
    }

    itemsToShow.forEach((item, idx) => {
      const realIndex = itemsState.indexOf(item);
      const itemRow = el("div", { className: "item-row-strip" }, [
        el("div", {
          className: "item-color-dot",
          style: `background-color: ${item.color}`,
        }),
        el("div", { className: "item-col-grow item-text-locked" }, [
          el("span", { className: "text-main" }, item.name),
        ]),
        el("div", { className: "stepper-block" }, [
          el("button", {
            type: "button",
            className: "btn-step",
            onclick: (e) => {
              e.preventDefault();
              updateItemQty(realIndex, -1);
            },
            textContent: "−",
          }),
          el("input", {
            type: "text",
            className: "stepper-input",
            readonly: true,
            value: item.qty.toLocaleString("es-AR"),
          }),
          el("button", {
            type: "button",
            className: "btn-step",
            onclick: (e) => {
              e.preventDefault();
              updateItemQty(realIndex, 1);
            },
            textContent: "+",
          }),
        ]),
        !item.isLocked
          ? el("button", {
              type: "button",
              className: "btn-icon-del",
              innerHTML: iconTrash,
              onclick: (e) => {
                e.preventDefault();
                removeItem(realIndex);
              },
            })
          : null,
      ]);
      container.appendChild(itemRow);
    });

    if (selectedType === "invoice") {
      container.appendChild(
        el("button", {
          type: "button",
          className: "btn-rect-dotted",
          innerHTML: iconPlus + " AGREGAR ÍTEM",
          onclick: (e) => {
            e.preventDefault();
            addCustomItem();
          },
        }),
      );
    }
  };

  const updateTheme = (type) => {
    const input = document.getElementById("hero-atm-input");
    if (input) {
      input.classList.remove("col-danger", "col-success");
      if (type === "invoice") {
        input.classList.add("col-danger");
      } else {
        input.classList.add("col-success");
      }
    }
  };

  // --- CALENDARIO ---
  const renderCalendar = () => {
    const container = document.getElementById("inline-calendar-container");
    const titleEl = document.getElementById("calendar-month-title");

    if (!container || !titleEl) return;
    container.innerHTML = "";

    const monthNames = [
      "ENERO",
      "FEBRERO",
      "MARZO",
      "ABRIL",
      "MAYO",
      "JUNIO",
      "JULIO",
      "AGOSTO",
      "SEPTIEMBRE",
      "OCTUBRE",
      "NOVIEMBRE",
      "DICIEMBRE",
    ];

    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    titleEl.textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const dayHeaders = ["D", "L", "M", "M", "J", "V", "S"];
    dayHeaders.forEach((d) => {
      container.appendChild(el("div", { className: "cal-day-header" }, d));
    });

    for (let i = 0; i < firstDay; i++) {
      container.appendChild(el("div", { className: "cal-day-cell empty" }));
    }

    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      const isSelected =
        selectedDate.getDate() === day &&
        selectedDate.getMonth() === month &&
        selectedDate.getFullYear() === year;
      const isToday =
        today.getDate() === day &&
        today.getMonth() === month &&
        today.getFullYear() === year;

      const cellClasses = ["cal-day-cell"];
      if (isSelected) cellClasses.push("selected");
      if (isToday) cellClasses.push("today");

      container.appendChild(
        el(
          "div",
          {
            className: cellClasses.join(" "),
            onclick: () => {
              selectedDate = dateObj;
              renderCalendar();
            },
          },
          day.toString(),
        ),
      );
    }
  };

  const changeMonth = (offset) => {
    calendarViewDate = new Date(
      calendarViewDate.getFullYear(),
      calendarViewDate.getMonth() + offset,
      1,
    );
    renderCalendar();
  };

  // --- NUEVA FUNCION: Establecer fecha rápida ---
  const setQuickDate = (daysOffset) => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + daysOffset);
    selectedDate = newDate;
    calendarViewDate = new Date(selectedDate);
    renderCalendar();
  };

  // --- CONSTRUCCION DEL MODAL ---
  const headerSelector = !supplier
    ? el(
        "select",
        {
          className: "fusion-select header-select-box",
          onchange: async (e) => {
            const sId = e.target.value;
            currentSupplier = suppliers.find((s) => s.id === sId);
            try {
              localMovements = await FirebaseDB.getByFilter(
                "supplier_transactions",
                "supplierId",
                sId,
                "date",
                "desc",
              );
            } catch (err) {
              localMovements = [];
            }
            refreshSuggestions();
            initItemsState();
            renderItemsList();
          },
        },
        [
          el(
            "option",
            { disabled: true, selected: true },
            "SELECCIONAR PROVEEDOR",
          ),
          ...suppliers.map((s) => el("option", { value: s.id }, s.name)),
        ],
      )
    : el(
        "h2",
        { className: "header-title-text" },
        currentSupplier?.name || "PROVEEDOR",
      );

  const modalContent = el(
    "div",
    { className: "fusion-card", onclick: (e) => e.stopPropagation() },
    [
      el("div", { className: "fusion-header" }, [
        el("div", { className: "header-text-group" }, [
          el(
            "span",
            { className: "fusion-subtitle" },
            isEdit ? "EDITAR REGISTRO" : "NUEVO MOVIMIENTO",
          ),
          headerSelector,
        ]),
        el("button", {
          className: "btn-close-fusion",
          onclick: onClose,
          innerHTML: iconClose,
        }),
      ]),

      el(
        "form",
        {
          className: "fusion-body",
          onsubmit: (e) => {
            e.preventDefault();
            handleSaveAction(e);
          },
        },
        [
          el(
            "div",
            { className: "fusion-tabs-row" },
            ["invoice", "payment", "credit"].map((type) => {
              const radioId = `radio-type-${type}`;
              const isSelected = selectedType === type;
              return el(
                "label",
                {
                  className: `fusion-tab ${isSelected ? "active" : ""}`,
                  htmlFor: radioId,
                },
                [
                  el("input", {
                    id: radioId,
                    type: "radio",
                    name: "type",
                    value: type,
                    checked: isSelected,
                    onchange: (e) => {
                      selectedType = e.target.value;
                      document
                        .querySelectorAll(".fusion-tab")
                        .forEach((t) => t.classList.remove("active"));
                      e.target.parentElement.classList.add("active");
                      updateTheme(selectedType);
                      refreshSuggestions();
                      initItemsState();
                      renderItemsList();
                    },
                    style: { display: "none" },
                  }),
                  el(
                    "span",
                    {},
                    type === "invoice"
                      ? "DEUDA"
                      : type === "payment"
                        ? "PAGO"
                        : "NOTA",
                  ),
                ],
              );
            }),
          ),

          el("div", { className: "atm-wrapper-clean" }, [
            el("input", {
              id: "hero-atm-input",
              type: "tel",
              className: `atm-input-field ${selectedType === "invoice" ? "col-danger" : "col-success"}`,
              value: formatATMDisplay(centsBuffer),
              onclick: (e) => {
                const len = e.target.value.length;
                e.target.setSelectionRange(len, len);
              },
              onkeydown: (e) => {
                if (e.key === "Backspace") {
                  e.preventDefault();
                  if (centsBuffer.length > 0)
                    centsBuffer = centsBuffer.slice(0, -1);
                  if (centsBuffer === "") centsBuffer = "0";
                  e.target.value = formatATMDisplay(centsBuffer);
                }
              },
              oninput: (e) => {
                const rawNums = e.target.value.replace(/\D/g, "");
                centsBuffer = rawNums ? parseInt(rawNums, 10).toString() : "0";
                e.target.value = formatATMDisplay(centsBuffer);
              },
            }),
            el("div", { id: "dynamic-suggestions-container" }, [
              renderSuggestions(),
            ]),
          ]),

          el("div", {
            id: "items-list-wrapper",
            className: "rect-items-section",
          }),

          el("div", { className: "rect-lower-grid" }, [
            el("div", { className: "calendar-panel" }, [
              el("div", { className: "cal-nav-row" }, [
                el("button", {
                  type: "button",
                  className: "btn-cal-nav",
                  onclick: () => changeMonth(-1),
                  innerHTML: iconChevronLeft,
                }),
                el(
                  "span",
                  { id: "calendar-month-title", className: "cal-title" },
                  "",
                ),
                el("button", {
                  type: "button",
                  className: "btn-cal-nav",
                  onclick: () => changeMonth(1),
                  innerHTML: iconChevronRight,
                }),
              ]),
              // NUEVO: Chips de fecha rápida (HOY y AYER)
              el("div", { className: "quick-date-row" }, [
                el(
                  "button",
                  {
                    type: "button",
                    className: "btn-mini-fusion",
                    onclick: (e) => {
                      e.preventDefault();
                      setQuickDate(0); // HOY
                    },
                  },
                  "HOY",
                ),
                el(
                  "button",
                  {
                    type: "button",
                    className: "btn-mini-fusion",
                    onclick: (e) => {
                      e.preventDefault();
                      setQuickDate(-1); // AYER
                    },
                  },
                  "AYER",
                ),
              ]),
              el("div", {
                id: "inline-calendar-container",
                className: "cal-container",
              }),
            ]),
            el("div", { className: "concept-panel" }, [
              el(
                "label",
                { className: "fusion-label", htmlFor: "tx-concept-area" },
                "CONCEPTO / NOTA",
              ),
              el("textarea", {
                id: "tx-concept-area",
                className: "fusion-textarea",
                placeholder: "Detalle opcional...",
                rows: 4,
              }),
            ]),
          ]),

          el("div", { className: "fusion-footer" }, [
            // NUEVO: Botón de Eliminar (solo en modo edición con onDelete)
            ...(isEdit && typeof onDelete === "function"
              ? [
                  el(
                    "button",
                    {
                      type: "button",
                      className: "btn-fusion-delete",
                      onclick: handleDeleteAction,
                      innerHTML: iconTrash,
                    },
                    "",
                  ),
                ]
              : []),
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
                type: "button",
                className: "btn-fusion-save",
                onclick: handleSaveAction,
              },
              isEdit ? "GUARDAR" : "CONFIRMAR",
            ),
          ]),
        ],
      ),
    ],
  );

  const overlay = el(
    "div",
    {
      className: "fusion-overlay mesh-bg",
      onclick: (e) => {
        if (e.target === overlay) onClose();
      },
    },
    [modalContent],
  );

  setTimeout(() => {
    const conceptInput = document.getElementById("tx-concept-area");
    if (conceptInput && initialData?.concept)
      conceptInput.value = initialData.concept;
    initItemsState();
    renderItemsList();
    renderCalendar();
    updateTheme(selectedType);
    if (!isEdit) {
      const input = document.getElementById("hero-atm-input");
      if (input) input.focus();
    }
  }, 0);

  const handleEsc = (e) => {
    if (e.key === "Escape") onClose();
  };
  document.addEventListener("keydown", handleEsc);
  const originalClose = onClose;
  onClose = () => {
    document.removeEventListener("keydown", handleEsc);
    originalClose();
  };

  return overlay;
}
