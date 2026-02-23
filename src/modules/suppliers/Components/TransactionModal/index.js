import { el } from "../../../../core/dom.js";
import { FirebaseDB } from "../../../../core/firebase/db.js";
import { ConfirmationModal } from "../ConfirmationModal/index.js";
import { toast } from "../../../../shared/ui/Toast/index.js";
import "./style.css";

// --- HELPERS ---
const getSafeName = (item) => {
  if (!item) return "";
  if (typeof item === "string") return item;
  return item.name || item.description || item.desc || "";
};

// --- HELPER CRÍTICO: Obtener fecha local (Fix Zona Horaria) ---
const getLocalDateObject = (inputDate) => {
  if (!inputDate) return new Date();

  if (inputDate.toDate) return inputDate.toDate();

  if (typeof inputDate === "string" && inputDate.includes("-")) {
    const dateString = inputDate.includes("T")
      ? inputDate
      : `${inputDate}T12:00:00`;
    return new Date(dateString);
  }

  return new Date(inputDate);
};
const getSafeColor = (item) => {
  if (!item || typeof item === "string") return "#ddd";
  return item.color || "#ddd";
};

// --- LOGICA DE CÁLCULO DE PENDIENTES ---
const calculatePendingFromHistory = (movements, defaultItems = []) => {
  const totals = {};
  const catalogById = {};
  const catalogByName = {};

  if (defaultItems && Array.isArray(defaultItems)) {
    defaultItems.forEach((d) => {
      const id = d.id || `temp_${d.name}`;
      const name = getSafeName(d).trim().toUpperCase();

      const itemData = {
        qty: 0,
        color: getSafeColor(d),
        isDefault: true,
        id: id,
        name: d.name,
      };

      totals[id] = itemData;
      catalogById[id] = id;
      if (name) catalogByName[name] = id;
    });
  }

  if (movements && Array.isArray(movements)) {
    movements.forEach((m) => {
      const type = m.type ? m.type.toLowerCase().trim() : "";
      const isEntry = type === "invoice" || type === "boleta";

      if (m.items && Array.isArray(m.items)) {
        m.items.forEach((item) => {
          const rawName = getSafeName(item).trim().toUpperCase();
          const qty = parseFloat(item.quantity || item.qty || 0);

          let targetId = item.id;
          if (!targetId && rawName && catalogByName[rawName]) {
            targetId = catalogByName[rawName];
          }
          if (!targetId) {
            targetId = rawName;
          }

          if (!totals[targetId]) {
            totals[targetId] = {
              qty: 0,
              color: getSafeColor(item),
              id: item.id || null,
              name: getSafeName(item),
            };
          }

          let color = getSafeColor(item);
          if (color !== "#ddd") totals[targetId].color = color;

          totals[targetId].qty += isEntry ? qty : -qty;
        });
      }
    });
  }

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

// --- INYECCIÓN DE ESTILOS PARA EL BADGE DEL MODAL ---
const injectModalBadgeStyles = () => {
  const styleId = "modal-badge-styles";
  if (document.getElementById(styleId)) return;
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
        .modal-status-badge {
            font-family: monospace;
            font-weight: 800;
            font-size: 0.65rem;
            padding: 2px 6px;
            border: 1px solid #000;
            text-transform: uppercase;
            display: inline-block;
            margin-left: 8px;
            vertical-align: middle;
        }
        .modal-status-badge.pending { background: #ff1744; color: #fff; border-color: #d50000; }
        .modal-status-badge.partial { background: #ffc400; color: #000; border-color: #000; }
        .modal-status-badge.paid {
            background: #00e676;
            color: #004d40;
            border-color: #004d40;
            text-decoration: line-through;
        }
        .atm-input-field.calc-mode {
            letter-spacing: 0.05em;
            opacity: 0.85;
        }
        .calc-preview-text {
            font-family: monospace;
            font-size: 0.75rem;
            font-weight: 700;
            color: #555;
            margin-top: 4px;
            display: none;
            letter-spacing: 0.03em;
        }
    `;
  document.head.appendChild(style);
};

// --- CALCULADORA: Evalúa expresiones simples con + y - ---
const parseExpression = (expr) => {
  if (!expr || !expr.trim()) return null;
  const clean = expr.trim();
  if (!/^[\d.,+\-\s]+$/.test(clean)) return null;
  const tokens = clean.match(/([\d]+(?:[.,]\d+)?|[+\-])/g);
  if (!tokens || tokens.length === 0) return null;
  let result = 0;
  let op = "+";
  for (const token of tokens) {
    if (token === "+" || token === "-") {
      op = token;
    } else {
      const num = parseFloat(token.replace(",", ".")) || 0;
      result = op === "+" ? result + num : result - num;
    }
  }
  return Math.round(result * 100) / 100;
};

// --- CALCULADORA: Formateo de expresión con separador de miles ---
const formatCalcDisplay = (rawExpr) => {
  return rawExpr.replace(/\d+(?:\.\d*)?/g, (match) => {
    if (match.includes(".")) {
      const [intStr, decStr] = match.split(".");
      const intFormatted = parseInt(intStr || "0", 10).toLocaleString("es-AR");
      return `${intFormatted},${decStr}`;
    }
    return parseInt(match, 10).toLocaleString("es-AR");
  });
};

const stripCalcFormatting = (displayStr) => {
  let result = displayStr;
  let prev;
  do {
    prev = result;
    result = result.replace(/(\d)\.(\d{3})(?!\d)/g, "$1$2");
  } while (result !== prev);
  result = result.replace(/(\d),(\d)/g, "$1.$2");
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
  onDelete = null,
}) {
  injectModalBadgeStyles();

  const isEdit = !!initialData?.id;

  // ICONOS
  const iconClose = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  const iconTrash = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
  const iconPlus = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
  const iconChevronLeft = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>`;
  const iconChevronRight = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>`;

  // ESTADO
  let currentSupplier = supplier;
  let selectedType = initialData?.type
    ? initialData.type.toLowerCase()
    : "invoice";
  let localMovements = [...movements];

  let centsBuffer =
    initialData && typeof initialData.amount === "number"
      ? Math.round(initialData.amount * 100).toString()
      : "0";

  // --- ESTADO CALCULADORA ---
  let calcMode = false;
  let calcExpression = "";

  let itemsState = [];
  let selectedDate = getLocalDateObject(initialData?.date);
  let calendarViewDate = new Date(selectedDate);

  // --- LÓGICA DE ESTADO (BADGE) ---
  const status = initialData?.status || "pending";
  const isPaid = status === "paid";
  const isPartial = status === "partial";
  const statusClass = isPaid ? "paid" : isPartial ? "partial" : "pending";
  const statusLabel = isPaid ? "PAGADO" : isPartial ? "PARCIAL" : "PENDIENTE";

  // =============================================================
  // FIX #2: Cleanup centralizado para evitar leak del Escape handler
  // =============================================================
  let isDestroyed = false;

  const handleEsc = (e) => {
    if (e.key === "Escape") closeModal();
  };

  const closeModal = () => {
    if (isDestroyed) return;
    isDestroyed = true;
    document.removeEventListener("keydown", handleEsc);
    onClose();
  };

  document.addEventListener("keydown", handleEsc);

  // --- LOGICA DE GUARDADO ---
  const handleSaveAction = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!currentSupplier) {
      toast.warning("Por favor seleccioná un proveedor");
      return;
    }

    const conceptInput = document.getElementById("tx-concept-area");
    const conceptVal = conceptInput ? conceptInput.value.trim() : "";
    const finalAmount = parseFloat(centsBuffer) / 100;

    const isStock = currentSupplier?.type === "stock";

    if (!isStock && finalAmount <= 0) {
      toast.warning("El monto debe ser mayor a cero");
      return;
    }

    const payload = {
      supplierId: currentSupplier?.id,
      amount: finalAmount,
      concept: conceptVal,
      type: selectedType.toLowerCase(),
      date: selectedDate,
      status: initialData?.status || "pending",
      paidAmount: initialData?.paidAmount || 0,
      items: itemsState
        .filter((i) => i.qty > 0)
        .map((i) => ({
          id: i.id || null,
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

  const handleDeleteAction = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!isEdit || !initialData?.id) return;

    const modal = ConfirmationModal({
      title: "Eliminar transacción",
      message:
        "Esta acción no se puede deshacer. El saldo se ajustará automáticamente.",
      onConfirm: () => {
        modal.remove();
        if (typeof onDelete === "function") {
          onDelete(initialData.id);
        }
      },
      onCancel: () => modal.remove(),
    });
    document.body.appendChild(modal);
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

  const updateCalcPreview = () => {
    const preview = document.getElementById("calc-preview");
    if (!preview) return;
    if (calcMode && calcExpression) {
      const result = parseExpression(calcExpression);
      if (result !== null && result > 0) {
        preview.textContent = `= $ ${result.toLocaleString("es-AR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
        preview.style.display = "block";
      } else {
        preview.style.display = "none";
      }
    } else {
      preview.style.display = "none";
    }
  };

  const resolveCalcExpression = (input) => {
    const result = parseExpression(calcExpression);
    calcMode = false;
    calcExpression = "";
    input.classList.remove("calc-mode");
    if (result !== null && result >= 0) {
      centsBuffer = Math.round(result * 100).toString();
    }
    updateATMInput();
    updateCalcPreview();
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
        id: i.id || null,
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

    itemsState = Object.values(debtMap)
      .map((data) => ({
        id: data.id,
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
      toast.warning("Ya existe un ítem con ese nombre");
      return;
    }

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
      id: linkedId,
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
            "div",
            { style: "display: flex; align-items: center; gap: 8px;" },
            [
              el(
                "span",
                { className: "fusion-subtitle" },
                isEdit ? "EDITAR REGISTRO" : "NUEVO MOVIMIENTO",
              ),
              isEdit
                ? el(
                    "span",
                    { className: `modal-status-badge ${statusClass}` },
                    statusLabel,
                  )
                : null,
            ],
          ),
          headerSelector,
        ]),
        el("button", {
          className: "btn-close-fusion",
          onclick: closeModal,
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
              type: "text",
              inputmode: "decimal",
              className: `atm-input-field ${selectedType === "invoice" ? "col-danger" : "col-success"}`,
              value: formatATMDisplay(centsBuffer),
              onclick: (e) => {
                if (!calcMode) {
                  const len = e.target.value.length;
                  e.target.setSelectionRange(len, len);
                }
              },
              onkeydown: (e) => {
                // Modo calculadora activo
                if (calcMode) {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    resolveCalcExpression(e.target);
                    return;
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    calcMode = false;
                    calcExpression = "";
                    e.target.classList.remove("calc-mode");
                    updateATMInput();
                    updateCalcPreview();
                    return;
                  }
                  // Dejar que el browser maneje backspace/digits normalmente
                  return;
                }
                // Modo normal: Backspace borra de a centavos
                if (e.key === "Backspace") {
                  e.preventDefault();
                  if (centsBuffer.length > 0)
                    centsBuffer = centsBuffer.slice(0, -1);
                  if (centsBuffer === "") centsBuffer = "0";
                  updateATMInput();
                  return;
                }
                // Activar modo calculadora con + o -
                if (e.key === "+" || e.key === "-") {
                  e.preventDefault();
                  const currentAmount = parseInt(centsBuffer || "0", 10) / 100;
                  calcExpression = currentAmount.toString() + e.key;
                  calcMode = true;
                  e.target.classList.add("calc-mode");
                  const formatted = formatCalcDisplay(calcExpression);
                  e.target.value = formatted;
                  const pos = formatted.length;
                  e.target.setSelectionRange(pos, pos);
                  updateCalcPreview();
                }
              },
              oninput: (e) => {
                if (calcMode) {
                  const raw = stripCalcFormatting(e.target.value);
                  calcExpression = raw;
                  const formatted = formatCalcDisplay(raw);
                  e.target.value = formatted;
                  const len = formatted.length;
                  e.target.setSelectionRange(len, len);
                  updateCalcPreview();
                  return;
                }
                const rawNums = e.target.value.replace(/\D/g, "");
                centsBuffer = rawNums ? parseInt(rawNums, 10).toString() : "0";
                updateATMInput();
              },
              onblur: (e) => {
                if (calcMode) resolveCalcExpression(e.target);
              },
            }),
            el("span", {
              id: "calc-preview",
              className: "calc-preview-text",
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
              el("div", { className: "quick-date-row" }, [
                el(
                  "button",
                  {
                    type: "button",
                    className: "btn-mini-fusion",
                    onclick: (e) => {
                      e.preventDefault();
                      setQuickDate(0);
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
                      setQuickDate(-1);
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
                onclick: closeModal,
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
        if (e.target === overlay) closeModal();
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

  return overlay;
}
