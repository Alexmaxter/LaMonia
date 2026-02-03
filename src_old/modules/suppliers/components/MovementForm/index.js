import { el } from "../../../../core/dom.js";
import { Icon } from "../../../../shared/ui/Icon.js";
import "./style.css";

export function MovementForm({
  suppliers = [],
  supplierId = null,
  preSelectedSupplier = null,
  initialValues = null,
  onSubmit,
  onCancel,
  onDelete,
}) {
  // --- ESTADO ---
  let selectedSupplier = preSelectedSupplier;
  if (!selectedSupplier && supplierId && suppliers.length > 0) {
    selectedSupplier = suppliers.find((s) => s.id === supplierId);
  }

  const container = el("div", { className: "mf-container-wrapper" });

  const render = () => {
    container.innerHTML = "";

    // 1. SELECCIÓN DE PROVEEDOR
    if (!selectedSupplier && !initialValues) {
      const title = el(
        "h3",
        { className: "mf-step-title" },
        "Selecciona Proveedor"
      );

      const select = el(
        "select",
        { className: "mf-supplier-select" },
        el("option", { value: "" }, "-- Elegir --"),
        ...suppliers.map((s) => el("option", { value: s.id }, s.name))
      );

      select.onchange = (e) => {
        selectedSupplier = suppliers.find((s) => s.id === e.target.value);
        if (selectedSupplier) render();
      };

      container.append(
        el("div", { className: "mf-step-selector" }, title, select)
      );
      return;
    }

    const supplierName = selectedSupplier
      ? selectedSupplier.name
      : initialValues
      ? "Proveedor"
      : "Desconocido";

    // Determinar modo (stock vs money).
    // NOTA: Ahora usamos esto solo para decidir si mostramos la lista de items,
    // pero el dinero siempre estará habilitado.
    const isStockProvider = selectedSupplier?.providerType === "stock";

    // 2. INICIALIZAR VALORES
    let currentType = initialValues?.type || "invoice";
    let rawAmount = initialValues?.amount
      ? Math.round(initialValues.amount * 100)
      : 0;

    // --- LÓGICA DE STOCK ITEMS ---
    let stockItems = [];
    if (initialValues?.items) {
      stockItems = JSON.parse(JSON.stringify(initialValues.items));
    } else if (isStockProvider && selectedSupplier) {
      const defaults =
        selectedSupplier.stockItems || selectedSupplier.defaultItems || [];
      stockItems = defaults.map((item) => {
        const name = typeof item === "object" ? item.name : item;
        return { name, quantity: 0 };
      });
    }

    // Fecha
    let currentDate = new Date().toISOString().split("T")[0];
    if (initialValues?.date) {
      const d = initialValues.date.seconds
        ? new Date(initialValues.date.seconds * 1000)
        : new Date(initialValues.date);
      const offset = d.getTimezoneOffset() * 60000;
      currentDate = new Date(d - offset).toISOString().slice(0, 10);
    }

    // --- UI HEADER ---
    const headerInfo = el(
      "div",
      { className: "mf-supplier-header" },
      el(
        "span",
        { className: "mf-supplier-label" },
        initialValues ? "Editando movimiento de:" : "Registrando para:"
      ),
      el("strong", {}, supplierName)
    );

    // --- TABS TIPO ---
    const typeContainer = el("div", { className: "mf-type-selector" });
    const renderTypeButtons = () => {
      typeContainer.innerHTML = "";
      const types = [
        {
          id: "invoice",
          label: isStockProvider ? "Entrada / Factura" : "Deuda / Factura",
        },
        { id: "payment", label: isStockProvider ? "Salida / Pago" : "Pago" },
        { id: "credit_note", label: "Nota Crédito" },
      ];

      types.forEach((t) => {
        const isActive = currentType === t.id;
        const btn = el(
          "button",
          {
            type: "button",
            className: `mf-pill-btn ${isActive ? "active" : ""}`,
          },
          t.label
        );
        btn.onclick = () => {
          currentType = t.id;
          renderTypeButtons();
          if (amountInput) updateAmountColor();
        };
        typeContainer.appendChild(btn);
      });
    };

    // --- SECCIÓN DINERO (Universal) ---
    // Antes esto estaba dentro de un if (mode === money), ahora es global.
    let amountInput;
    const updateAmountColor = () => {
      if (amountInput)
        amountInput.className = `mf-money-input amount-${currentType}`;
    };

    const formatMoney = (cents) => {
      if (!cents) return "";
      return (
        "$ " +
        (cents / 100).toLocaleString("es-AR", { minimumFractionDigits: 2 })
      );
    };

    amountInput = el("input", {
      type: "tel",
      className: "mf-money-input",
      value: formatMoney(rawAmount),
      placeholder: "$ 0,00",
    });

    amountInput.oninput = (e) => {
      // Permitir borrar todo
      if (e.target.value === "") {
        rawAmount = 0;
        return;
      }

      const val = e.target.value.replace(/\D/g, "");
      rawAmount = val ? parseInt(val) : 0;

      e.target.value = formatMoney(rawAmount);
    };

    // CORRECCIÓN AQUÍ: Agregamos (e) antes de la flecha
    amountInput.onblur = (e) => {
      if (rawAmount === 0) e.target.value = "";
      else e.target.value = formatMoney(rawAmount);
    };
    // --- SECCIÓN STOCK (RENDERIZADO MEJORADO) ---
    let stockSection = null;

    if (isStockProvider) {
      const listContainer = el("div", { className: "mf-stock-list" });

      const renderStockItems = () => {
        listContainer.innerHTML = "";

        if (stockItems.length === 0) {
          listContainer.append(
            el(
              "div",
              { className: "mf-empty-msg" },
              el("p", {}, "Este proveedor no tiene productos configurados."),
              el("small", {}, "Agrega items manualmente abajo.")
            )
          );
        }

        stockItems.forEach((item, idx) => {
          // --- MEJORA UX: Input numérico directo ---
          const inputQty = el("input", {
            type: "number",
            className: "mf-qty-input",
            value: item.quantity > 0 ? item.quantity : "",
            placeholder: "0",
            min: "0",
          });

          // Actualizar modelo al escribir
          inputQty.onchange = (e) => {
            const val = parseInt(e.target.value);
            item.quantity = isNaN(val) ? 0 : val;
          };

          const btnMinus = el(
            "button",
            { type: "button", className: "mf-counter-btn minus" },
            "-"
          );
          btnMinus.onclick = () => {
            let current = parseInt(inputQty.value) || 0;
            if (current > 0) {
              current--;
              item.quantity = current;
              inputQty.value = current > 0 ? current : "";
            }
          };

          const btnPlus = el(
            "button",
            { type: "button", className: "mf-counter-btn plus" },
            "+"
          );
          btnPlus.onclick = () => {
            let current = parseInt(inputQty.value) || 0;
            current++;
            item.quantity = current;
            inputQty.value = current;
          };

          const counterWrapper = el(
            "div",
            { className: "mf-counter-wrapper" },
            btnMinus,
            inputQty, // Input en lugar de span
            btnPlus
          );

          // Botón eliminar item de la lista (para items manuales)
          const btnDeleteRow = el(
            "button",
            {
              type: "button",
              className: "mf-btn-delete-row",
              title: "Quitar item",
            },
            Icon("trash")
          );

          btnDeleteRow.onclick = () => {
            // Eliminar item del array
            stockItems.splice(idx, 1);
            renderStockItems();
          };

          const row = el(
            "div",
            { className: "mf-stock-row" },
            el("div", { className: "mf-stock-name" }, item.name),
            el(
              "div",
              { className: "mf-row-actions" },
              counterWrapper,
              btnDeleteRow
            )
          );

          listContainer.append(row);
        });
      };

      // Input para agregar items manuales al vuelo
      const inputManual = el("input", {
        type: "text",
        className: "mf-input-subtle",
        placeholder: "+ Agregar item (ej: Pack Cerveza)",
      });
      const btnAddManual = el(
        "button",
        { type: "button", className: "mf-btn-icon-add" },
        Icon("plus")
      );

      const addManualAction = () => {
        const val = inputManual.value.trim();
        if (val) {
          stockItems.push({ name: val, quantity: 1 }); // Agrega con 1 por defecto
          inputManual.value = "";
          renderStockItems();
        }
      };

      btnAddManual.onclick = addManualAction;
      inputManual.onkeydown = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          addManualAction();
        }
      };

      const manualAddContainer = el(
        "div",
        { className: "mf-manual-add" },
        inputManual,
        btnAddManual
      );

      renderStockItems();

      stockSection = el(
        "div",
        { className: "mf-section-stock" },
        el("label", { className: "mf-section-label" }, "Detalle de Mercadería"),
        listContainer,
        el("div", { className: "mf-divider-dashed" }),
        manualAddContainer
      );
    }

    // --- INPUTS COMUNES ---
    const dateInput = el("input", {
      type: "date",
      className: "mf-input",
      value: currentDate,
    });
    const descInput = el("input", {
      type: "text",
      className: "mf-input",
      placeholder: "Descripción (Opcional)",
      value: initialValues?.description || "",
    });

    // Botón Submit
    const btnSubmit = el(
      "button",
      {
        type: "submit",
        className: "mf-btn-submit",
      },
      initialValues ? "Guardar Cambios" : "Registrar Movimiento"
    );

    const form = el(
      "form",
      {
        className: "movement-form-v3",
        onsubmit: (e) => {
          e.preventDefault();

          // Validación Híbrida:
          // Debe haber al menos Dinero > 0  O  Items > 0.

          const hasMoney = rawAmount > 0;
          let hasItems = false;
          if (isStockProvider && stockItems.length > 0) {
            hasItems = stockItems.some((i) => i.quantity > 0);
          }

          if (!hasMoney && !hasItems) {
            return alert(
              "Por favor ingresa un Monto ($) o una Cantidad de items."
            );
          }

          const payload = {
            supplierId: selectedSupplier
              ? selectedSupplier.id
              : initialValues.supplierId,
            type: currentType,
            // Enviamos el modo original del proveedor,
            // pero el backend/calculadora ya no discriminará el dinero.
            transactionMode: isStockProvider ? "stock" : "money",
            date: dateInput.value,
            description: descInput.value,
            amount: rawAmount / 100, // Siempre enviamos el dinero
            items: stockItems, // Siempre enviamos el array (aunque vaya vacío)
          };

          onSubmit(payload);
        },
      },
      headerInfo,
      el("div", { className: "mf-header" }, typeContainer),

      el(
        "div",
        { className: "mf-body" },
        // Siempre mostramos el dinero
        el("div", { className: "mf-section-money" }, amountInput),
        // Stock opcional debajo
        stockSection
      ),

      el(
        "div",
        { className: "mf-footer" },
        dateInput,
        descInput,
        el(
          "div",
          { className: "mf-actions" },
          initialValues && onDelete
            ? el(
                "button",
                {
                  type: "button",
                  className: "mf-btn-delete",
                  onclick: onDelete,
                },
                Icon("trash")
              )
            : null,
          btnSubmit
        )
      )
    );

    renderTypeButtons();
    container.append(form);
  };

  render();
  return container;
}
