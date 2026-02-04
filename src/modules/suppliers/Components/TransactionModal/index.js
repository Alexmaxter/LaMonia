import { el } from "../../../../core/dom.js";
import { FirebaseDB } from "../../../../core/firebase/db.js";
import "./style.css";

// --- HELPERS (Tu lógica original intacta) ---
const getSafeName = (item) => {
  if (!item) return "";
  if (typeof item === "string") return item;
  return item.name || item.description || item.desc || "";
};

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
  Object.keys(totals).forEach((key) => {
    if (totals[key] <= 0.01) delete totals[key];
  });
  return totals;
};

// --- COMPONENTE PRINCIPAL ---
export function TransactionModal({
  supplier = null,
  suppliers = [],
  initialData = null,
  movements = [],
  onSave,
  onClose,
}) {
  const isEdit = !!initialData?.id;

  // ICONOS
  const iconClose = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  const iconTrash = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
  const iconPlus = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"></path></svg>`;
  const iconChevronLeft = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>`;
  const iconChevronRight = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>`;

  // ESTADO
  let currentSupplier = supplier;
  let selectedType = initialData?.type || "invoice";
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

  // --- HELPER FORMATO ATM ---
  const formatATMDisplay = (bufferStr) => {
    const val = parseInt(bufferStr || "0", 10);
    const amount = val / 100;
    const numStr = amount.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `$ ${numStr}`;
  };

  // --- ITEMS LOGIC ---
  const initItemsState = () => {
    itemsState = [];
    const isStockSupplier = currentSupplier?.type === "stock";
    if (!isStockSupplier) return;

    if (isEdit && initialData.items) {
      itemsState = initialData.items.map((i) => ({
        name: getSafeName(i),
        qty: parseFloat(i.quantity || i.qty || 0),
        isLocked: true,
      }));
      return;
    }

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
    } else {
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
      if (itemsState.length === 0)
        itemsState.push({ name: "", qty: 0, isLocked: false });
    }
  };

  initItemsState();

  // --- CALENDAR RENDER ---
  const renderCalendar = () => {
    const container = document.getElementById("inline-calendar-container");
    const labelTitle = document.getElementById("calendar-month-title");
    if (!container || !labelTitle) return;

    container.innerHTML = "";
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const monthNames = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];
    labelTitle.textContent = `${monthNames[month]} ${year}`.toUpperCase();

    const daysHeader = el(
      "div",
      { className: "cal-grid-header" },
      ["D", "L", "M", "M", "J", "V", "S"].map((d) => el("span", {}, d)),
    );
    container.appendChild(daysHeader);

    const daysGrid = el("div", { className: "cal-days-grid" });
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDayOfMonth; i++)
      daysGrid.appendChild(el("div", { className: "cal-day empty" }));

    for (let day = 1; day <= daysInMonth; day++) {
      const dateToCheck = new Date(year, month, day);
      const isSelected =
        dateToCheck.toDateString() === selectedDate.toDateString();
      const isToday = dateToCheck.toDateString() === new Date().toDateString();

      const dayBtn = el(
        "button",
        {
          type: "button",
          className: `cal-day-btn ${isSelected ? "selected" : ""} ${isToday ? "today" : ""}`,
          onclick: () => {
            selectedDate = new Date(year, month, day);
            renderCalendar();
          },
        },
        day.toString(),
      );
      daysGrid.appendChild(dayBtn);
    }
    container.appendChild(daysGrid);
  };

  const changeMonth = (offset) => {
    calendarViewDate.setMonth(calendarViewDate.getMonth() + offset);
    renderCalendar();
  };

  // --- ITEMS LIST RENDER ---
  const renderItemsList = () => {
    const container = document.getElementById("items-list-wrapper");
    if (!container) return;
    container.innerHTML = "";

    const isStockSupplier = currentSupplier?.type === "stock";
    if (!isStockSupplier) {
      container.style.display = "none";
      return;
    }
    container.style.display = "flex";

    const isDebtMode = selectedType === "payment" || selectedType === "credit";

    if (isDebtMode && itemsState.length === 0) {
      container.innerHTML = `<div class="empty-stock-msg">SIN ÍTEMS PENDIENTES</div>`;
      return;
    }

    itemsState.forEach((item, index) => {
      let nameComp;
      if (item.isLocked) {
        nameComp = el("div", { className: "item-text-locked" }, [
          el("span", { className: "text-main" }, item.name),
          isDebtMode && item.max
            ? el("span", { className: "text-sub" }, `/ ${item.max}`)
            : null,
        ]);
      } else {
        nameComp = el("input", {
          type: "text",
          className: "fusion-input item-name-input", // CAMBIO DE CLASE
          placeholder: "NOMBRE PRODUCTO",
          value: item.name,
          oninput: (e) => (itemsState[index].name = e.target.value),
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

      const row = el("div", { className: "item-row-strip" }, [
        !isDebtMode
          ? el("button", {
              type: "button",
              className: "btn-icon-del",
              innerHTML: iconTrash,
              onclick: () => {
                itemsState.splice(index, 1);
                renderItemsList();
              },
            })
          : null,
        el("div", { className: "item-col-grow" }, [nameComp]),
        el("div", { className: "stepper-block" }, [
          el(
            "button",
            {
              type: "button",
              className: "btn-step",
              onclick: () => {
                if (itemsState[index].qty > 0) {
                  itemsState[index].qty--;
                  qtyInput.value = itemsState[index].qty;
                }
              },
            },
            "-",
          ),
          qtyInput,
          el(
            "button",
            {
              type: "button",
              className: "btn-step",
              onclick: () => {
                if (isDebtMode && item.max && itemsState[index].qty >= item.max)
                  return;
                itemsState[index].qty++;
                qtyInput.value = itemsState[index].qty;
              },
            },
            "+",
          ),
        ]),
      ]);
      container.appendChild(row);
    });

    if (!isDebtMode) {
      container.appendChild(
        el(
          "button",
          {
            type: "button",
            className: "btn-rect-dotted",
            onclick: () => {
              itemsState.push({ name: "", qty: 0, isLocked: false });
              renderItemsList();
            },
          },
          [el("span", { innerHTML: iconPlus }), "AGREGAR ÍTEM"],
        ),
      );
    }
  };

  const updateTheme = (type) => {
    const hero = document.getElementById("hero-atm-input");
    if (hero) {
      hero.classList.remove("col-danger", "col-success");
      hero.classList.add(type === "invoice" ? "col-danger" : "col-success");
    }
  };

  // --- HEADER SELECTOR (Misma lógica, estructura Fusion) ---
  const headerSelector =
    suppliers.length > 0 && !supplier
      ? el(
          "div",
          { className: "header-select-box" },
          el(
            "select",
            {
              className: "fusion-select", // CAMBIO CLASE
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
          ),
        )
      : el(
          "h2",
          { className: "header-title-text" },
          currentSupplier?.name || "PROVEEDOR",
        );

  const modalContent = el(
    "div",
    {
      className: "fusion-card", // CAMBIO CLASE PRINCIPAL
      onclick: (e) => e.stopPropagation(),
    },
    [
      // 1. HEADER (Estilo Fusión)
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

      // 2. BODY
      el(
        "form",
        {
          className: "fusion-body",
          onsubmit: (e) => {
            e.preventDefault();
            if (!currentSupplier) return alert("Selecciona un proveedor");
            const formData = new FormData(e.target);
            const finalAmount = parseFloat(centsBuffer) / 100;

            onSave({
              ...initialData,
              supplierId: currentSupplier?.id,
              amount: finalAmount,
              concept: formData.get("concept"),
              type: selectedType,
              date: selectedDate,
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
          // TABS (Estilo Fusión)
          el(
            "div",
            { className: "fusion-tabs-row" },
            ["invoice", "payment", "credit"].map((type) =>
              el(
                "label",
                {
                  className: `fusion-tab ${selectedType === type ? "active" : ""}`,
                },
                [
                  el("input", {
                    type: "radio",
                    name: "type",
                    value: type,
                    checked: selectedType === type,
                    onchange: (e) => {
                      selectedType = e.target.value;
                      document
                        .querySelectorAll(".fusion-tab")
                        .forEach((t) => t.classList.remove("active"));
                      e.target.parentElement.classList.add("active");
                      updateTheme(selectedType);
                      initItemsState();
                      renderItemsList();
                    },
                    style: "display:none", // Ocultamos el radio real
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
              ),
            ),
          ),

          // MONTO ATM INPUT
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
                  if (centsBuffer.length > 0) {
                    centsBuffer = centsBuffer.slice(0, -1);
                    if (centsBuffer === "") centsBuffer = "0";
                    e.target.value = formatATMDisplay(centsBuffer);
                  }
                }
              },
              oninput: (e) => {
                const inputVal = e.target.value;
                const rawNums = inputVal.replace(/\D/g, "");
                if (rawNums) {
                  centsBuffer = parseInt(rawNums, 10).toString();
                } else {
                  centsBuffer = "0";
                }
                e.target.value = formatATMDisplay(centsBuffer);
              },
            }),
          ]),

          // ITEMS AREA
          el("div", {
            id: "items-list-wrapper",
            className: "rect-items-section", // Mantengo clase layout interno
          }),

          // LOWER GRID: CALENDARIO Y CONCEPTO
          el("div", { className: "rect-lower-grid" }, [
            // Mantengo estructura grid
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
              el("div", {
                id: "inline-calendar-container",
                className: "cal-container",
              }),
            ]),

            el("div", { className: "concept-panel" }, [
              el("label", { className: "fusion-label" }, "CONCEPTO / NOTA"),
              el("textarea", {
                name: "concept",
                className: "fusion-textarea", // Clase nueva para estilo fusion
                placeholder: "Detalle opcional...",
                value: initialData?.concept || "",
              }),
            ]),
          ]),

          // FOOTER
          el("div", { className: "fusion-footer" }, [
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
              { type: "submit", className: "btn-fusion-save" },
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
      className: "fusion-overlay mesh-bg", // Fondo de Puntos
      onclick: (e) => {
        if (e.target === overlay) onClose();
      },
    },
    [modalContent],
  );

  setTimeout(() => {
    renderItemsList();
    renderCalendar();
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
