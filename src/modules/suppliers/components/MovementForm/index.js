import { el } from "../../../../core/dom.js";
import { Icon } from "../../../../shared/ui/Icon.js";
import "./style.css";

export function MovementForm({
  suppliers = [],
  preSelectedSupplier = null,
  initialValues = null,
  onSubmit,
  onCancel,
  onDelete,
}) {
  // --- ESTADO INTERNO ---
  let selectedSupplier = preSelectedSupplier;

  // Contenedor principal del formulario
  const container = el("div", { className: "mf-container-wrapper" });

  // Función para volver a renderizar el formulario cuando cambia el proveedor
  const render = () => {
    container.innerHTML = "";

    // 1. CASO: NO HAY PROVEEDOR SELECCIONADO (Paso previo)
    if (!selectedSupplier) {
      const title = el(
        "h3",
        { className: "mf-step-title" },
        "Selecciona un Proveedor"
      );

      const select = el(
        "select",
        { className: "mf-supplier-select" },
        el("option", { value: "" }, "-- Elegir de la lista --"),
        ...suppliers.map((s) => el("option", { value: s.id }, s.name))
      );

      select.onchange = (e) => {
        const found = suppliers.find((s) => s.id === e.target.value);
        if (found) {
          selectedSupplier = found;
          render(); // Recargar formulario con la config del proveedor
        }
      };

      container.append(
        el(
          "div",
          { className: "mf-step-selector" },
          title,
          select,
          el(
            "p",
            { className: "mf-help-text" },
            "El formulario se adaptará a la configuración del proveedor (Stock o Dinero)."
          )
        )
      );
      return;
    }

    // 2. CASO: PROVEEDOR SELECCIONADO (Formulario Real)
    // Determinar modo (Stock vs Dinero) basado en el proveedor
    const currentMode =
      selectedSupplier.providerType === "stock" ? "stock" : "money";

    // Estado del Formulario
    let currentType = initialValues?.type || "invoice";
    let rawAmount = initialValues?.amount
      ? Math.round(initialValues.amount * 100)
      : 0;

    // Items de Stock (Carga defaults si es nuevo)
    let stockItems = [];
    if (initialValues?.items) {
      stockItems = [...initialValues.items];
    } else if (currentMode === "stock") {
      const defaults =
        selectedSupplier.stockItems || selectedSupplier.defaultItems || [];
      stockItems = defaults.map((item) => {
        const name = typeof item === "object" ? item.name : item;
        return { name: name, quantity: 0, isDefault: true };
      });
    }

    // Fecha
    let currentDate = new Date().toISOString().split("T")[0];
    if (initialValues?.date) {
      const d = initialValues.date.seconds
        ? new Date(initialValues.date.seconds * 1000)
        : new Date(initialValues.date);
      currentDate = d.toISOString().split("T")[0];
    }

    // --- UI COMPONENTS DEL FORMULARIO ---

    // Header con Nombre del Proveedor (útil si vinimos del selector)
    const headerInfo = el(
      "div",
      { className: "mf-supplier-header" },
      el("span", { className: "mf-supplier-label" }, "Registrando para:"),
      el("strong", {}, selectedSupplier.name)
    );

    // TABS (Tipo)
    const typeContainer = el("div", { className: "mf-type-selector" });
    const renderTypeButtons = () => {
      typeContainer.innerHTML = "";
      const types = [
        { id: "invoice", label: currentMode === "stock" ? "Entrada" : "Deuda" },
        { id: "payment", label: currentMode === "stock" ? "Salida" : "Pago" },
        { id: "note", label: "Nota" },
      ];

      types.forEach((t) => {
        const btn = el(
          "button",
          {
            type: "button",
            className: `mf-pill-btn ${currentType === t.id ? "active" : ""}`,
          },
          t.label
        );

        btn.onclick = () => {
          currentType = t.id;
          renderTypeButtons();
          if (amountInput)
            amountInput.className = `mf-money-input amount-${currentType}`;
          if (invoiceGroup)
            invoiceGroup.style.display =
              t.id === "invoice" && currentMode === "money" ? "block" : "none";
        };
        typeContainer.appendChild(btn);
      });
    };

    // SECCIÓN DINERO
    let moneySection = null;
    let amountInput = null;

    if (currentMode === "money") {
      const formatMoneyValue = (cents) => {
        if (cents === 0) return "";
        const val = cents / 100;
        return (
          "$ " +
          val.toLocaleString("es-AR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        );
      };

      amountInput = el("input", {
        type: "tel",
        className: `mf-money-input amount-${currentType}`,
        value: formatMoneyValue(rawAmount),
        placeholder: "$ 0,00",
        autocomplete: "off",
      });

      amountInput.addEventListener("input", (e) => {
        const digits = e.target.value.replace(/\D/g, "");
        rawAmount = digits ? parseInt(digits, 10) : 0;
        e.target.value = formatMoneyValue(rawAmount);
      });
      moneySection = el("div", { className: "mf-section-money" }, amountInput);
    }

    // SECCIÓN STOCK
    let stockSection = null;
    if (currentMode === "stock") {
      const stockListContainer = el("div", { className: "mf-stock-list" });
      const renderStockList = () => {
        stockListContainer.innerHTML = "";
        if (stockItems.length === 0) {
          stockListContainer.appendChild(
            el("div", { className: "mf-empty-msg" }, "Sin ítems configurados.")
          );
        }
        stockItems.forEach((item, idx) => {
          const updateQty = (delta) => {
            stockItems[idx].quantity = Math.max(
              0,
              stockItems[idx].quantity + delta
            );
            renderStockList(); // Re-render simple para actualizar contadores
          };

          const row = el(
            "div",
            { className: "mf-stock-row" },
            el("div", { className: "mf-stock-name" }, item.name),
            el(
              "div",
              { className: "mf-row-actions" },
              el(
                "button",
                {
                  type: "button",
                  className: "mf-counter-btn minus",
                  onclick: () => updateQty(-1),
                },
                "-"
              ),
              el(
                "span",
                { className: "mf-counter-val" },
                item.quantity.toString()
              ),
              el(
                "button",
                {
                  type: "button",
                  className: "mf-counter-btn plus",
                  onclick: () => updateQty(1),
                },
                "+"
              ),
              el(
                "button",
                {
                  type: "button",
                  className: "mf-btn-icon delete",
                  onclick: () => {
                    stockItems.splice(idx, 1);
                    renderStockList();
                  },
                },
                Icon("trash")
              )
            )
          );
          stockListContainer.appendChild(row);
        });
      };

      // Agregar Manual
      const nameIn = el("input", {
        type: "text",
        className: "mf-input-subtle",
        placeholder: "+ Otro ítem",
      });
      const btnAdd = el(
        "button",
        { type: "button", className: "mf-btn-icon-add" },
        Icon("plus")
      );
      const handleAdd = () => {
        if (!nameIn.value.trim()) return;
        stockItems.push({ name: nameIn.value, quantity: 1 });
        nameIn.value = "";
        renderStockList();
      };
      btnAdd.onclick = handleAdd;

      renderStockList();
      stockSection = el(
        "div",
        { className: "mf-section-stock" },
        stockListContainer,
        el("div", { className: "mf-divider-dashed" }),
        el("div", { className: "mf-manual-add" }, nameIn, btnAdd)
      );
    }

    // INPUTS COMUNES
    const dateInput = el("input", {
      type: "date",
      className: "mf-input",
      value: currentDate,
    });
    const descInput = el("input", {
      type: "text",
      className: "mf-input",
      placeholder: "Descripción / Nota",
      value: initialValues?.description || "",
    });
    const invoiceNumberInput = el("input", {
      type: "text",
      className: "mf-input",
      placeholder: "N° Comprobante",
      value: initialValues?.invoiceNumber || "",
    });
    const invoiceGroup = el(
      "div",
      { className: "mf-form-group" },
      invoiceNumberInput
    );
    if (currentMode !== "money" || currentType !== "invoice")
      invoiceGroup.style.display = "none";

    // BOTONES ACCIÓN
    const btnSubmit = el(
      "button",
      { type: "submit", className: "mf-btn-submit" },
      initialValues ? "Guardar" : "Registrar"
    );
    const actionsContainer = el("div", { className: "mf-actions" }, btnSubmit);
    if (initialValues && onDelete) {
      const btnDel = el(
        "button",
        { type: "button", className: "mf-btn-delete" },
        Icon("trash")
      );
      btnDel.onclick = onDelete;
      actionsContainer.prepend(btnDel);
    }

    // Renderizado Tabs inicial
    renderTypeButtons();

    // Armado del Formulario final
    const form = el(
      "form",
      {
        className: "movement-form-v3",
        onsubmit: (e) => {
          e.preventDefault();
          if (currentMode === "money" && rawAmount <= 0)
            return alert("Ingresa un monto válido");
          const validItems =
            currentMode === "stock"
              ? stockItems.filter((i) => i.quantity > 0)
              : [];
          if (currentMode === "stock" && validItems.length === 0)
            return alert("Ingresa cantidades");

          onSubmit({
            supplierId: selectedSupplier.id,
            type: currentType,
            transactionMode: currentMode,
            date: dateInput.value,
            description: descInput.value,
            invoiceNumber:
              currentMode === "money" && currentType === "invoice"
                ? invoiceNumberInput.value
                : null,
            amount: currentMode === "money" ? rawAmount / 100 : 0,
            items: validItems,
          });
        },
      },
      headerInfo,
      el(
        "div",
        { className: "mf-header" },
        el("label", { className: "mf-label" }, "Transacción"),
        typeContainer
      ),
      el(
        "div",
        { className: "mf-body" },
        currentMode === "money" ? moneySection : stockSection
      ),
      el(
        "div",
        { className: "mf-footer" },
        el("div", { className: "mf-grid-row" }, dateInput, invoiceGroup),
        descInput,
        actionsContainer
      )
    );

    container.append(form);
  };

  // Inicio
  render();
  return container;
}
