import { el } from "../../../../core/dom.js";
import { SupplierModel } from "../../model.js";
import { SearchBox } from "../../../../shared/ui/SearchBox/index.js";
import { FirebaseDB } from "../../../../core/firebase/db.js";
import { SupplierCard } from "../../Components/SupplierCard/index.js";
import { MovementList } from "../../Components/MovementList/index.js";
import "./style.css";

// --- HELPERS DE FECHA ---
const getDateKey = (dateObj) => {
  if (!dateObj || isNaN(dateObj)) return "unknown";
  return `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}`;
};

const getFriendlyDate = (dateObj) => {
  if (!dateObj || isNaN(dateObj)) return "Fecha Desconocida";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const compare = new Date(
    dateObj.getFullYear(),
    dateObj.getMonth(),
    dateObj.getDate(),
  );
  const diffTime = today - compare;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "HOY";
  if (diffDays === 1) return "AYER";

  const options = { weekday: "long", day: "numeric", month: "long" };
  return dateObj.toLocaleDateString("es-AR", options).toUpperCase();
};

export function SupplierListView({
  suppliers,
  totalDebt,
  isVisible: initialIsVisible,
  onSelect,
  onAddQuickTransaction,
  onNewSupplier,
  onGlobalTransaction,
  onToggleVisibility,
  onEditTransaction,
  onDeleteTransaction,
}) {
  // --- ESTADO LOCAL ---
  let isVisible = initialIsVisible;
  let currentSort = "name_asc";
  let currentFilteredList = [...suppliers];
  let activeTab = "directory";
  let recentTransactions = [];
  let currentActivityFilter = "all";
  let isLoadingActivity = false;

  let debtValueDisplay = null;

  // --- ICONOS ---
  const iconPlus = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
  const iconGrid = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`;
  const iconList = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`;
  const iconSortAZ = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 10l5 5 5-5"/><path d="M4 6h7m-7 6h7m-7 6h7m-7 6h7m-7 6h7m-7 6h7m-7 6h7"/></svg>`;
  const iconSortDown = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>`;
  const iconSortUp = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20v-6"/><path d="M6 20V10"/><path d="M18 20v-4"/></svg>`;
  const iconEye = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  const iconEyeOff = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

  const contentWrapper = el("div", { className: "content-wrapper" });
  const controlsGroupRight = el("div", { className: "controls-group" });
  let btnTabDirectory = null;
  let btnTabActivity = null;

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
      if (activeTab === "directory") renderContent();
    } catch (e) {
      console.error("Error cargando actividad:", e);
    } finally {
      isLoadingActivity = false;
      if (activeTab === "activity") renderContent();
    }
  };

  const switchTab = (tab) => {
    activeTab = tab;
    if (tab === "directory") {
      btnTabDirectory.classList.add("active");
      btnTabActivity.classList.remove("active");
      renderContent();
    } else {
      btnTabDirectory.classList.remove("active");
      btnTabActivity.classList.add("active");
      renderContent();
      if (recentTransactions.length === 0) fetchActivity();
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

  const getFilteredActivity = () => {
    if (currentActivityFilter === "all") return recentTransactions;
    return recentTransactions.filter((tx) => tx.type === currentActivityFilter);
  };

  const setActivityFilter = (type) => {
    currentActivityFilter = type;
    renderContent();
  };

  const handleToggle = (e) => {
    const newState = onToggleVisibility();
    isVisible = newState;

    if (e && e.currentTarget) {
      e.currentTarget.innerHTML = newState ? iconEye : iconEyeOff;
    }

    if (debtValueDisplay) {
      debtValueDisplay.textContent = SupplierModel.formatAmount(
        totalDebt,
        isVisible,
      );
    }
    renderContent();
  };

  const handleSearch = (term) => {
    const searchTerm = term.toLowerCase();
    currentFilteredList = suppliers.filter((s) =>
      s.name.toLowerCase().includes(searchTerm),
    );
    if (activeTab === "directory") renderContent();
  };

  const createSortBtn = (type, label, icon) => {
    return el(
      "button",
      {
        className: `btn-sort ${currentSort === type ? "active" : ""}`,
        title: label,
        onclick: () => {
          currentSort = type;
          renderContent();
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
        createSortBtn("debt_desc", "Mayor Deuda", iconSortDown),
      );
      controlsGroupRight.appendChild(
        createSortBtn("debt_asc", "Menor Deuda", iconSortUp),
      );
    } else {
      if (recentTransactions.length > 0) {
        controlsGroupRight.appendChild(
          el(
            "button",
            {
              className: `filter-chip ${currentActivityFilter === "all" ? "active" : ""}`,
              onclick: () => setActivityFilter("all"),
            },
            "Todos",
          ),
        );
        controlsGroupRight.appendChild(
          el(
            "button",
            {
              className: `filter-chip ${currentActivityFilter === "invoice" ? "active" : ""}`,
              "data-type": "invoice",
              onclick: () => setActivityFilter("invoice"),
            },
            "Deuda",
          ),
        );
        controlsGroupRight.appendChild(
          el(
            "button",
            {
              className: `filter-chip ${currentActivityFilter === "payment" ? "active" : ""}`,
              "data-type": "payment",
              onclick: () => setActivityFilter("payment"),
            },
            "Pagos",
          ),
        );
      }
    }
  };

  const renderContent = () => {
    contentWrapper.innerHTML = "";
    renderToolbarControls();

    if (activeTab === "directory") {
      // --- VISTA DIRECTORIO ---
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
          const lastTx = recentTransactions.find((t) => t.supplierId === s.id);

          const card = SupplierCard({
            supplier: s,
            isVisible: isVisible,
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
      // --- VISTA ACTIVIDAD CON AGRUPACIÓN ---
      if (isLoadingActivity) {
        contentWrapper.innerHTML = `<div class="empty-state">Buscando movimientos...</div>`;
        return;
      }

      const visibleTransactions = getFilteredActivity();

      if (visibleTransactions.length === 0) {
        contentWrapper.appendChild(
          el(
            "div",
            { className: "empty-state" },
            "No se encontraron movimientos recientes.",
          ),
        );
        return;
      }

      // --- CAMBIO CLAVE: ENRIQUECER CON NOMBRE DE PROVEEDOR ---
      const enrichedTransactions = visibleTransactions.map((tx) => {
        const sup = suppliers.find((s) => s.id === tx.supplierId);
        return {
          ...tx,
          supplierName: sup ? sup.name : "Proveedor Desconocido",
        };
      });

      const listContainer = el("div", { className: "activity-list-container" });

      // 1. Agrupar movimientos por fecha
      const groups = {};
      const datesOrder = [];

      enrichedTransactions.forEach((m) => {
        const dateObj = m.date?.seconds
          ? new Date(m.date.seconds * 1000)
          : new Date(m.date);

        const key = getDateKey(dateObj);

        if (!groups[key]) {
          groups[key] = {
            dateObj: dateObj,
            items: [],
          };
          datesOrder.push(key);
        }
        groups[key].items.push(m);
      });

      // 2. Renderizar grupos
      datesOrder.forEach((key) => {
        const group = groups[key];

        const dayDebt = group.items
          .filter((t) => t.type === "invoice")
          .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

        const dayPayment = group.items
          .filter((t) => t.type === "payment")
          .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

        const totalTags = [];
        if (dayDebt > 0) {
          totalTags.push(
            el("div", { className: "total-tag debt" }, [
              el("span", { className: "tag-label" }, "D:"),
              el(
                "span",
                { className: "separator-amount" },
                SupplierModel.formatAmount(dayDebt, isVisible),
              ),
            ]),
          );
        }
        if (dayPayment > 0) {
          totalTags.push(
            el("div", { className: "total-tag payment" }, [
              el("span", { className: "tag-label" }, "P:"),
              el(
                "span",
                { className: "separator-amount" },
                SupplierModel.formatAmount(dayPayment, isVisible),
              ),
            ]),
          );
        }

        const separator = el("div", { className: "group-separator-modern" }, [
          el(
            "span",
            { className: "separator-date" },
            getFriendlyDate(group.dateObj),
          ),
          el("div", { className: "separator-totals" }, totalTags),
        ]);

        listContainer.appendChild(separator);

        // Renderizar lista con nombres
        listContainer.appendChild(
          MovementList({
            movements: group.items,
            isVisible: isVisible,
            onEdit: onEditTransaction,
            onDelete: onDeleteTransaction,
            showSupplierName: true, // <--- ACTIVAR NOMBRE
          }),
        );
      });

      contentWrapper.appendChild(listContainer);
    }
  };

  const searchComponent = SearchBox({
    placeholder: "BUSCAR PROVEEDOR...",
    onSearch: handleSearch,
    delay: 300,
  });

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

  fetchActivity();

  debtValueDisplay = el(
    "div",
    { className: "header-debt-value" },
    SupplierModel.formatAmount(totalDebt, isVisible),
  );

  const headerPanel = el("div", { className: "tech-panel-header" }, [
    el("div", { className: "tech-header-top" }, [
      el("div", { className: "tech-title-group" }, [
        el("h1", { className: "page-title" }, "PROVEEDORES"),
        el("span", { className: "badge-count" }, `${suppliers.length}`),
      ]),
      el("div", { className: "tech-debt-group" }, [
        el("div", { className: "debt-label-row" }, [
          el("span", { className: "debt-label" }, "DEUDA TOTAL"),
          el("button", {
            className: "btn-icon-toggle",
            onclick: handleToggle,
            innerHTML: isVisible ? iconEye : iconEyeOff,
          }),
        ]),
        debtValueDisplay,
      ]),
    ]),
    el("div", { className: "tech-controls-row" }, [
      el("div", { className: "tech-search-container" }, [searchComponent]),
      el("div", { className: "tech-actions-container" }, [
        el("button", { className: "btn-primary", onclick: onNewSupplier }, [
          el("span", { innerHTML: iconPlus }),
          "NUEVO PROVEEDOR",
        ]),
        el(
          "button",
          { className: "btn-secondary", onclick: onGlobalTransaction },
          "MOVIMIENTO RÁPIDO",
        ),
      ]),
    ]),
    el("div", { className: "toolbar-container" }, [
      el("div", { className: "tabs-group" }, [btnTabDirectory, btnTabActivity]),
      controlsGroupRight,
    ]),
  ]);

  return el("div", { className: "supplier-list-view" }, [
    headerPanel,
    contentWrapper,
  ]);
}
