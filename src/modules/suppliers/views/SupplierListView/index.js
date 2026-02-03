import { el } from "../../../../core/dom.js";
import { SupplierModel } from "../../model.js";
import { SearchBox } from "../../../../shared/ui/SearchBox/index.js";
import { FirebaseDB } from "../../../../core/firebase/db.js";
import "./style.css";

export function SupplierListView({
  suppliers,
  totalDebt,
  isVisible: initialIsVisible, // Renombramos para usar estado interno
  onSelect,
  onAddQuickTransaction,
  onNewSupplier,
  onGlobalTransaction,
  onToggleVisibility,
}) {
  // --- ESTADO LOCAL ---
  let isVisible = initialIsVisible; // Estado local de visibilidad
  let currentSort = "name_asc";
  let currentFilteredList = [...suppliers];
  let activeTab = "directory"; // 'directory' | 'activity'
  let recentTransactions = [];
  let isLoadingActivity = false;

  // --- ICONOS ---
  const iconPlus = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
  const iconSupplier = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline></svg>`;
  const iconInvoice = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`;
  const iconCopy = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
  const iconEye = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  const iconEyeOff = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
  const iconSortAZ = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6v12h-5"/><path d="M21 9v10a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2v-10"/><path d="M3 5v10a2 2 0 0 0 2 2h10"/></svg>`;
  const iconSortDown = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>`;
  const iconSortUp = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>`;
  const iconGrid = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`;
  const iconList = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`;

  // --- REFERENCIAS A ELEMENTOS UI (Para control manual) ---
  const contentWrapper = el("div", { className: "content-wrapper fade-in" });
  let btnTabDirectory = null;
  let btnTabActivity = null;

  // --- CARGA DE ACTIVIDAD ---
  const fetchActivity = async () => {
    // Si ya tenemos datos, no recargamos para evitar parpadeos
    if (recentTransactions.length > 0 && !isLoadingActivity) {
      renderContent();
      return;
    }

    isLoadingActivity = true;
    renderContent(); // Muestra loader

    try {
      // Usamos el filtro de fecha descendente que arreglamos en db.js
      const data = await FirebaseDB.getByFilter(
        "supplier_transactions",
        null,
        null,
        "date",
        "desc",
      );
      if (data && Array.isArray(data)) {
        recentTransactions = data.slice(0, 50);
      } else {
        recentTransactions = [];
      }
    } catch (e) {
      console.error("Error al cargar actividad:", e);
      recentTransactions = [];
    } finally {
      isLoadingActivity = false;
      // Solo renderizamos si seguimos en la pestaña de actividad
      if (activeTab === "activity") {
        renderContent();
      }
    }
  };

  // --- HANDLERS Y UTILIDADES ---

  const switchTab = (tab) => {
    activeTab = tab;

    // Actualización visual de botones usando referencias directas
    if (tab === "directory") {
      btnTabDirectory.classList.add("active");
      btnTabActivity.classList.remove("active");
      renderContent();
    } else {
      btnTabDirectory.classList.remove("active");
      btnTabActivity.classList.add("active");
      fetchActivity();
    }
  };

  const getSortedData = (list) => {
    return [...list].sort((a, b) => {
      const balA = parseFloat(a.balance) || 0;
      const balB = parseFloat(b.balance) || 0;
      const nameA = (a.name || "").toLowerCase();
      const nameB = (b.name || "").toLowerCase();

      switch (currentSort) {
        case "name_asc":
          return nameA.localeCompare(nameB);
        case "debt_desc":
          return balB - balA;
        case "debt_asc":
          return balA - balB;
        default:
          return 0;
      }
    });
  };

  const handleToggle = (e) => {
    const newState = onToggleVisibility();
    isVisible = newState; // ✅ Actualizamos estado local para futuros renders
    e.currentTarget.innerHTML = newState ? iconEye : iconEyeOff;

    // Actualizamos el DOM actual (Directorio y Actividad)
    // El Controller se encarga de [data-amount], pero aseguramos la actualización visual inmediata
    const allBalances = document.querySelectorAll(
      ".balance-value, .total-debt-value, .act-amount",
    );
    allBalances.forEach((elAmount) => {
      const amount = parseFloat(elAmount.getAttribute("data-amount"));
      if (!isNaN(amount)) {
        elAmount.textContent = SupplierModel.formatAmount(amount, newState);
      }
    });
  };

  const handleSearch = (term) => {
    const searchTerm = term.toLowerCase();
    currentFilteredList = suppliers.filter((s) =>
      s.name.toLowerCase().includes(searchTerm),
    );
    if (activeTab === "directory") renderContent();
  };

  // --- RENDERIZADORES AUXILIARES ---

  // Botón de Ordenamiento (Helper)
  const createSortBtn = (type, label, icon) => {
    return el(
      "button",
      {
        className: `btn-sort ${currentSort === type ? "active" : ""}`,
        title: label,
        onclick: () => {
          currentSort = type;
          renderContent(); // Re-renderizará la vista de directorio con el nuevo orden
        },
      },
      [
        el("span", { innerHTML: icon }),
        el("span", { className: "btn-sort-label" }, label),
      ],
    );
  };

  // --- RENDER PRINCIPAL (Content Switcher) ---
  const renderContent = () => {
    contentWrapper.innerHTML = "";

    // ==========================================
    // VISTA 1: DIRECTORIO
    // ==========================================
    if (activeTab === "directory") {
      const filtersContainer = el("div", { className: "filters-container" }, [
        el("span", { className: "filters-label" }, "Ordenar por:"),
        el("div", { className: "sort-buttons-group" }, [
          createSortBtn("name_asc", "A-Z", iconSortAZ),
          createSortBtn("debt_desc", "Mayor Deuda", iconSortDown),
          createSortBtn("debt_asc", "Menor Deuda", iconSortUp),
        ]),
      ]);
      contentWrapper.appendChild(filtersContainer);

      const gridContainer = el("div", { className: "suppliers-grid" });
      const sortedList = getSortedData(currentFilteredList);

      if (sortedList.length === 0) {
        gridContainer.appendChild(
          el(
            "div",
            { className: "empty-state" },
            "No se encontraron proveedores",
          ),
        );
      } else {
        const fragment = document.createDocumentFragment();
        sortedList.forEach((s) => {
          const balance = parseFloat(s.balance) || 0;
          const card = el(
            "div",
            { className: "supplier-card", dataset: { id: s.id } },
            [
              el("div", { className: "card-info" }, [
                el("h3", { className: "card-name" }, s.name),
                s.alias
                  ? el("div", { className: "alias-pill" }, [
                      el("span", { innerHTML: iconCopy }),
                      el("span", {}, s.alias),
                    ])
                  : el("span", { className: "card-alias-empty" }, "Sin alias"),
              ]),
              el("div", { className: "card-balance" }, [
                el("span", { className: "balance-label" }, "DEUDA TOTAL"),
                el(
                  "span",
                  {
                    className: `balance-value ${balance > 0 ? "text-danger" : "text-success"}`,
                    "data-amount": balance,
                    dataset: { amount: balance }, // ✅ Importante para el toggle
                  },
                  SupplierModel.formatAmount(balance, isVisible),
                ),
              ]),
              el("button", {
                className: "btn-quick-add-v1",
                innerHTML: iconPlus,
              }),
            ],
          );
          fragment.appendChild(card);
        });
        gridContainer.appendChild(fragment);

        // Event Delegation para clicks
        gridContainer.onclick = (e) => {
          const card = e.target.closest(".supplier-card");
          if (!card) return;
          if (e.target.closest(".alias-pill")) {
            const s = suppliers.find((su) => su.id === card.dataset.id);
            if (s?.alias) navigator.clipboard.writeText(s.alias);
            return;
          }
          if (e.target.closest(".btn-quick-add-v1")) {
            const s = suppliers.find((su) => su.id === card.dataset.id);
            onAddQuickTransaction(s);
            return;
          }
          onSelect(card.dataset.id);
        };
      }
      contentWrapper.appendChild(gridContainer);
    }

    // ==========================================
    // VISTA 2: ACTIVIDAD
    // ==========================================
    else {
      if (isLoadingActivity) {
        contentWrapper.innerHTML = `
            <div class="loader-container" style="padding:40px; text-align:center;">
                <div class="spinner"></div>
                <p style="margin-top:10px; color:var(--text-muted)">Buscando movimientos...</p>
            </div>`;
        return;
      }

      if (recentTransactions.length === 0) {
        contentWrapper.innerHTML = `
            <div class="activity-empty">
                <div style="font-size:2rem; margin-bottom:10px;">📭</div>
                <p>No se encontraron movimientos recientes.</p>
                <small>Asegúrate de haber registrado operaciones.</small>
            </div>`;
        return;
      }

      const table = el("div", { className: "activity-list" });

      table.appendChild(
        el("div", { className: "activity-header" }, [
          el("span", {}, "Fecha"),
          el("span", {}, "Proveedor"),
          el("span", { style: "flex:1" }, "Detalle"),
          el("span", { className: "text-right" }, "Monto"),
        ]),
      );

      recentTransactions.forEach((tx) => {
        // --- ARREGLO 2: FECHA CLARA ---
        const dateObj =
          tx.date && tx.date.toDate ? tx.date.toDate() : new Date(tx.date);
        const dateStr = isNaN(dateObj)
          ? "-"
          : dateObj.toLocaleDateString("es-AR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric", // 02/05/2026
            });

        // --- ARREGLO 3: NOMBRE REAL DEL PROVEEDOR ---
        const supplierFound = suppliers.find((s) => s.id === tx.supplierId);
        const supplierName = supplierFound
          ? supplierFound.name
          : tx.supplierName || "Proveedor";

        const row = el("div", { className: "activity-row" }, [
          el("div", { className: "act-date" }, dateStr),
          el("div", { className: "act-supplier" }, [
            el(
              "span",
              {
                className: "supplier-pill-sm",
                onclick: () => onSelect(tx.supplierId),
              },
              supplierName,
            ),
          ]),
          el("div", { className: "act-desc" }, [
            el(
              "span",
              { className: "act-type" },
              tx.type === "invoice" ? "Boleta" : "Pago",
            ),
            el(
              "span",
              { className: "act-concept" },
              tx.description || tx.concept || "-",
            ),
          ]),
          // --- ARREGLO 1: DATASET PARA VISIBILIDAD ---
          el("div", {
            className: `act-amount ${tx.type === "invoice" ? "text-danger" : "text-success"}`,
            "data-amount": tx.amount, // Propiedad data-amount (backup)
            dataset: { amount: tx.amount }, // ✅ Atributo data-amount real (CRÍTICO para toggle)
            innerHTML: SupplierModel.formatAmount(tx.amount, isVisible),
          }),
        ]);
        table.appendChild(row);
      });
      contentWrapper.appendChild(table);
    }
  };

  // --- CREACIÓN DE ELEMENTOS FIJOS ---

  const searchComponent = SearchBox({
    placeholder: "Buscar proveedor, alias...",
    onSearch: handleSearch,
    delay: 300,
  });

  // Botones de Pestañas
  btnTabDirectory = el(
    "button",
    {
      className: "tab-btn active",
      onclick: () => switchTab("directory"),
    },
    [el("span", { innerHTML: iconGrid }), "Directorio"],
  );

  btnTabActivity = el(
    "button",
    {
      className: "tab-btn",
      onclick: () => switchTab("activity"),
    },
    [el("span", { innerHTML: iconList }), "Actividad Reciente"],
  );

  // --- INICIALIZACIÓN ---
  renderContent();

  // --- RETURN FINAL ---
  return el("div", { className: "supplier-list-view fade-in" }, [
    // CABECERA
    el("div", { className: "list-actions-bar" }, [
      el("div", { className: "header-top-row" }, [
        el("div", { className: "title-main" }, [
          el("h1", { className: "page-title" }, "Proveedores"),
          el("span", { className: "badge-count" }, `${suppliers.length}`),
        ]),
        el("div", { className: "total-debt-container" }, [
          el("span", { className: "total-debt-label" }, "DEUDA TOTAL GENERAL"),
          el(
            "span",
            {
              className: `total-debt-value ${totalDebt > 0 ? "text-danger" : "text-success"}`,
              "data-amount": totalDebt,
              dataset: { amount: totalDebt },
            },
            SupplierModel.formatAmount(totalDebt, isVisible),
          ),
        ]),
      ]),
      el("div", { className: "header-controls-row" }, [
        el("div", { className: "search-wrapper" }, [searchComponent]),
        el("div", { className: "button-group" }, [
          el("button", {
            className: "btn-visibility-list",
            onclick: handleToggle,
            innerHTML: isVisible ? iconEye : iconEyeOff,
          }),
          el(
            "button",
            { className: "btn-secondary-v1", onclick: onNewSupplier },
            [el("span", { innerHTML: iconSupplier }), "Nuevo"],
          ),
          el(
            "button",
            { className: "btn-primary-v1", onclick: onGlobalTransaction },
            [el("span", { innerHTML: iconInvoice }), "Boleta"],
          ),
        ]),
      ]),
    ]),

    // PESTAÑAS
    el("div", { className: "tabs-bar" }, [btnTabDirectory, btnTabActivity]),

    // CONTENIDO
    contentWrapper,
  ]);
}
