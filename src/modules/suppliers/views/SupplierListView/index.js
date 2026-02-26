import { el } from "../../../../core/dom.js";
import { SupplierModel } from "../../model.js";
import { SearchBox } from "../../../../shared/ui/SearchBox/index.js";
import { FirebaseDB } from "../../../../core/firebase/db.js";
import { SupplierCard } from "../../Components/SupplierCard/index.js";
import { SkeletonSupplierCard } from "../../Components/SupplierCard/SkeletonSupplierCard.js";
import { MovementList } from "../../Components/MovementList/index.js";
import { supplierStore } from "../../SupplierStore.js";
import "./style.css";

export function SupplierListView({
  onSelect,
  onAddQuickTransaction,
  onNewSupplier,
  onGlobalTransaction,
  onEditTransaction,
  onDeleteTransaction,
}) {
  // --- ESTADO LOCAL ---
  let currentSort = "name_asc";
  let activeTab = "directory";
  let recentTransactions = [];
  let currentActivityFilter = "all";
  let isLoadingActivity = false;

  /**
   * FIX #8: searchTermText ahora es un objeto con una clave por tab,
   * de modo que cada tab recuerda su propio término de búsqueda.
   * Así el usuario puede buscar "harina" en Directorio, cambiar a
   * Actividad, buscar "pago", y al volver a Directorio su término
   * anterior sigue en el input.
   */
  const searchTerms = {
    directory: "",
    activity: "",
  };

  // --- ELEMENTOS DOM ---
  let debtValueDisplay = null;
  let toggleVisibilityBtn = null;
  let badgeCountDisplay = null;
  const contentWrapper = el("div", { className: "content-wrapper" });
  const controlsGroupRight = el("div", { className: "controls-group" });
  let btnTabDirectory = null;
  let btnTabActivity = null;

  /**
   * FIX #8: El SearchBox necesita poder actualizar su placeholder
   * y su valor según el tab activo. Guardamos referencia al input
   * interno para poder manipularlo directamente.
   */
  let searchInputEl = null;

  // --- ICONOS ---
  const iconPlus = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
  const iconGrid = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`;
  const iconList = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`;
  const iconSortAZ = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 10l5 5 5-5"/><path d="M4 6h7m-7 6h7m-7 6h7"/></svg>`;
  const iconSortDown = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>`;
  const iconSortUp = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20v-6"/><path d="M6 20V10"/><path d="M18 20v-4"/></svg>`;
  const iconEye = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  const iconEyeOff = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

  // --- DATA FETCHING ---
  const fetchActivity = async () => {
    if (recentTransactions.length > 0 && !isLoadingActivity) return;
    isLoadingActivity = true;
    try {
      const data = await FirebaseDB.getByFilter(
        "supplier_transactions",
        null,
        null,
        "date",
        "desc",
      );
      recentTransactions =
        data && Array.isArray(data) ? data.slice(0, 500) : [];
      triggerRender();
    } catch (e) {
      console.error("Error cargando actividad:", e);
    } finally {
      isLoadingActivity = false;
      triggerRender();
    }
  };

  // ============================================================
  // FIX #8: syncSearchInput
  // Al cambiar de tab, actualizamos el placeholder y el valor del
  // input para reflejar el estado de búsqueda del tab destino.
  // El usuario ve exactamente qué está buscando en cada contexto.
  // ============================================================
  const SEARCH_PLACEHOLDERS = {
    directory: "Buscar proveedor...",
    activity: "Buscar en actividad...",
  };

  const syncSearchInput = (tab) => {
    if (!searchInputEl) return;
    searchInputEl.placeholder = SEARCH_PLACEHOLDERS[tab];
    searchInputEl.value = searchTerms[tab];
  };

  const switchTab = (tab) => {
    if (activeTab === tab) return;
    activeTab = tab;
    btnTabDirectory.classList.toggle("active", tab === "directory");
    btnTabActivity.classList.toggle("active", tab === "activity");

    // FIX #8: Sincronizar el input con el estado del nuevo tab
    syncSearchInput(tab);

    if (tab === "activity" && recentTransactions.length === 0) {
      fetchActivity();
    } else {
      triggerRender();
    }
  };

  // --- HELPERS LÓGICA ---
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

  // ============================================================
  // FIX #8: getFilteredActivity ahora también aplica la búsqueda
  // del tab "activity". Busca por nombre de proveedor, descripción
  // del movimiento y tipo.
  // ============================================================
  const getFilteredActivity = (state) => {
    const term = searchTerms.activity.toLowerCase().trim();

    let list = recentTransactions;

    // Filtro por tipo (invoice / payment / all)
    if (currentActivityFilter !== "all") {
      list = list.filter((tx) => tx.type === currentActivityFilter);
    }

    // FIX #8: Filtro por término de búsqueda
    if (term) {
      list = list.filter((tx) => {
        // Buscar por nombre del proveedor
        const sup = state.suppliers.find((s) => s.id === tx.supplierId);
        const supplierName = sup ? sup.name.toLowerCase() : "";

        // Buscar por descripción/concepto del movimiento
        const desc = (tx.description || tx.concept || "").toLowerCase();

        // Buscar por tipo de movimiento
        const type = (tx.type || "").toLowerCase();

        return (
          supplierName.includes(term) ||
          desc.includes(term) ||
          type.includes(term)
        );
      });
    }

    return list;
  };

  const setActivityFilter = (type) => {
    currentActivityFilter = type;
    triggerRender();
  };

  const handleToggle = () => supplierStore.toggleAmountsVisibility();

  // ============================================================
  // FIX #8: handleSearch ahora guarda el término en la clave
  // correcta según el tab activo, y siempre dispara el render
  // sin importar en qué tab esté el usuario.
  // ============================================================
  const handleSearch = (term) => {
    searchTerms[activeTab] = term.toLowerCase().trim();
    triggerRender();
  };

  // --- RENDERS ---
  const createSortBtn = (type, label, icon) => {
    return el(
      "button",
      {
        className: `btn-sort ${currentSort === type ? "active" : ""}`,
        title: label,
        onclick: () => {
          currentSort = type;
          triggerRender();
        },
      },
      [el("span", { innerHTML: icon }), el("span", {}, label)],
    );
  };

  const renderToolbarControls = () => {
    controlsGroupRight.innerHTML = "";
    if (activeTab === "directory") {
      controlsGroupRight.appendChild(
        createSortBtn("name_asc", "Nombre", iconSortAZ),
      );
      controlsGroupRight.appendChild(
        createSortBtn("debt_desc", "Mayor deuda", iconSortDown),
      );
      controlsGroupRight.appendChild(
        createSortBtn("debt_asc", "Menor deuda", iconSortUp),
      );
    } else {
      if (recentTransactions.length > 0) {
        ["all", "invoice", "payment"].forEach((filter) => {
          const label =
            filter === "all"
              ? "Todos"
              : filter === "invoice"
                ? "Deuda"
                : "Pagos";
          controlsGroupRight.appendChild(
            el(
              "button",
              {
                className: `filter-chip ${currentActivityFilter === filter ? "active" : ""}`,
                onclick: () => setActivityFilter(filter),
              },
              label,
            ),
          );
        });
      }
    }
  };

  // =========================================================
  // LÓGICA REACTIVA
  // =========================================================

  const updateHeader = (state) => {
    const totalDebt = state.suppliers.reduce(
      (acc, s) => acc + (parseFloat(s.balance) || 0),
      0,
    );
    toggleVisibilityBtn.innerHTML = state.amountsVisible ? iconEye : iconEyeOff;
    debtValueDisplay.textContent = SupplierModel.formatAmount(
      totalDebt,
      state.amountsVisible,
    );
    badgeCountDisplay.textContent = `${state.suppliers.length}`;
  };

  const renderContent = (state) => {
    contentWrapper.innerHTML = "";
    renderToolbarControls();

    if (activeTab === "directory") {
      const gridContainer = el("div", { className: "suppliers-grid" });

      // FIX #8: usa searchTerms.directory en lugar de searchTermText global
      const term = searchTerms.directory;
      const currentFilteredList = state.suppliers.filter(
        (s) =>
          (s.name || "").toLowerCase().includes(term) ||
          (s.alias || "").toLowerCase().includes(term),
      );

      const sortedList = getSortedData(currentFilteredList);

      if (sortedList.length === 0) {
        // FIX #8: mensaje diferente si hay búsqueda activa o no
        const emptyMsg = term
          ? `Sin resultados para "${term}"`
          : "No se encontraron proveedores";

        gridContainer.appendChild(
          el("div", { className: "empty-state" }, emptyMsg),
        );
      } else {
        const fragment = document.createDocumentFragment();
        sortedList.forEach((s) => {
          const lastTx = recentTransactions.find((t) => t.supplierId === s.id);
          const card = SupplierCard({
            supplier: s,
            isVisible: state.amountsVisible,
            lastTransaction: lastTx,
            onClick: () => onSelect(s.id),
            onAddTransaction: () => onAddQuickTransaction(s),
          });
          fragment.appendChild(card);
        });
        gridContainer.appendChild(fragment);
      }
      contentWrapper.appendChild(gridContainer);
    } else {
      // --- TAB ACTIVIDAD ---
      if (isLoadingActivity) {
        contentWrapper.innerHTML = `<div class="empty-state">Buscando movimientos...</div>`;
        return;
      }

      // FIX #8: pasamos state para que getFilteredActivity pueda
      // resolver los nombres de proveedor al filtrar por búsqueda
      const visibleTransactions = getFilteredActivity(state);

      if (visibleTransactions.length === 0) {
        // FIX #8: mensaje contextual según si hay búsqueda activa o no
        const term = searchTerms.activity;
        const emptyMsg = term
          ? `Sin resultados para "${term}"`
          : "No se encontraron movimientos recientes.";

        contentWrapper.appendChild(
          el("div", { className: "empty-state" }, emptyMsg),
        );
        return;
      }

      const enrichedTransactions = visibleTransactions.map((tx) => {
        const sup = state.suppliers.find((s) => s.id === tx.supplierId);
        let enrichedItems = [];
        if (tx.items && Array.isArray(tx.items)) {
          enrichedItems = tx.items.map((item) => {
            let color = item.color;
            if (!color && sup && sup.defaultItems) {
              const match = sup.defaultItems.find((d) => {
                const dName = typeof d === "string" ? d : d.name;
                return dName && dName.toUpperCase() === item.name.toUpperCase();
              });
              if (match && typeof match === "object" && match.color)
                color = match.color;
            }
            return { ...item, color: color || "#ddd" };
          });
        }
        return {
          ...tx,
          supplierName: sup ? sup.name : "Proveedor Eliminado",
          items: enrichedItems,
        };
      });

      const listContainer = el("div", { className: "activity-list-container" });
      listContainer.appendChild(
        MovementList({
          movements: enrichedTransactions,
          isVisible: state.amountsVisible,
          onEdit: onEditTransaction,
          onDelete: onDeleteTransaction,
          showSupplierName: true,
          isStockView: false,
          groupByDay: true,
        }),
      );
      contentWrapper.appendChild(listContainer);
    }
  };

  const triggerRender = () => {
    const state = supplierStore.getState();
    updateHeader(state);
    renderContent(state);
  };

  // =========================================================
  // CONSTRUCCIÓN DEL HEADER
  // =========================================================

  // FIX #8: Creamos el SearchBox y capturamos la referencia al
  // input interno para poder cambiar su placeholder y valor
  // al cambiar de tab, sin re-montar el componente completo.
  const searchWrapper = el("div", { className: "search-box-wrapper" });

  // Icono SVG del buscador
  const searchIconDiv = el("div", { className: "search-box-icon" }, [
    el("div", {
      innerHTML: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
    }),
  ]);

  searchInputEl = el("input", {
    type: "text",
    className: "search-box-input",
    placeholder: SEARCH_PLACEHOLDERS.directory, // placeholder inicial
    value: "",
  });

  let debounceTimer;
  searchInputEl.addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => handleSearch(e.target.value), 300);
  });

  searchWrapper.appendChild(searchIconDiv);
  searchWrapper.appendChild(searchInputEl);

  btnTabDirectory = el(
    "button",
    { className: "tab-btn active", onclick: () => switchTab("directory") },
    [el("span", { innerHTML: iconGrid }), "Directorio"],
  );

  btnTabActivity = el(
    "button",
    { className: "tab-btn", onclick: () => switchTab("activity") },
    [el("span", { innerHTML: iconList }), "Actividad"],
  );

  badgeCountDisplay = el("span", { className: "badge-count" }, "0");
  debtValueDisplay = el("div", { className: "header-debt-value" }, "$0");

  toggleVisibilityBtn = el("button", {
    className: "btn-icon-toggle",
    onclick: handleToggle,
  });

  const iconSettings = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;

  const headerTop = el("div", { className: "tech-header-top" }, [
    el("div", { className: "tech-title-group" }, [
      el("h1", { className: "page-title" }, "PROVEEDORES"),
      badgeCountDisplay,
    ]),

    // FIX #8: usamos el searchWrapper que construimos manualmente
    // (en vez del componente SearchBox) para poder manipular el input
    el("div", { className: "tech-search-container" }, [searchWrapper]),

    el("div", { className: "tech-right-group" }, [
      el("div", { className: "tech-debt-group" }, [
        el("div", { className: "debt-label-row" }, [
          el("span", { className: "debt-label" }, "DEUDA TOTAL"),
          toggleVisibilityBtn,
        ]),
        debtValueDisplay,
      ]),

      el("div", { className: "tech-actions-container" }, [
        el("button", { className: "btn-secondary", onclick: onNewSupplier }, [
          el("span", { innerHTML: iconPlus }),
          "Nuevo",
        ]),
        el(
          "button",
          { className: "btn-primary", onclick: onGlobalTransaction },
          [el("span", { innerHTML: iconPlus }), "Boleta"],
        ),
        el(
          "button",
          {
            className: "btn-settings",
            title: "Configuración",
            onclick: () => {
              window.location.hash = "#settings";
            },
          },
          [
            el("span", {
              className: "btn-settings-icon",
              innerHTML: iconSettings,
            }),
            "Config.",
          ],
        ),
      ]),
    ]),
  ]);

  const toolbarContainer = el("div", { className: "toolbar-container" }, [
    el("div", { className: "tabs-group" }, [btnTabDirectory, btnTabActivity]),
    controlsGroupRight,
  ]);

  const headerPanel = el("div", { className: "tech-panel-header" }, [
    headerTop,
    toolbarContainer,
  ]);

  const viewContainer = el("div", { className: "supplier-list-view" }, [
    headerPanel,
    contentWrapper,
  ]);

  // =========================================================
  // SUSCRIPCIÓN Y CICLO DE VIDA
  // =========================================================
  const unsubscribe = supplierStore.subscribe(triggerRender);

  triggerRender();
  if (supplierStore.getState().suppliers.length > 0) fetchActivity();

  viewContainer.destroy = () => {
    unsubscribe();
    clearTimeout(debounceTimer);
  };

  return viewContainer;
}
