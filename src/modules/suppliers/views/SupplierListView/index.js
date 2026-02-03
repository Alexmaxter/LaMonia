import { el } from "../../../../core/dom.js";
import { SupplierModel } from "../../model.js";
import { SearchBox } from "../../../../shared/ui/SearchBox/index.js";
import { FirebaseDB } from "../../../../core/firebase/db.js";
import "./style.css";

export function SupplierListView({
  suppliers,
  totalDebt,
  isVisible: initialIsVisible,
  onSelect,
  onAddQuickTransaction,
  onNewSupplier,
  onGlobalTransaction,
  onToggleVisibility,
  onEditTransaction, // NUEVO CALLBACK
  onDeleteTransaction, // NUEVO CALLBACK
}) {
  // --- ESTADO LOCAL ---
  let isVisible = initialIsVisible;
  let currentSort = "name_asc";
  let currentFilteredList = [...suppliers];
  let activeTab = "directory";
  let recentTransactions = [];
  let currentActivityFilter = "all";
  let isLoadingActivity = false;

  // --- ICONOS ---
  const iconPlus = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
  const iconSupplier = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline></svg>`;
  const iconInvoice = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`;
  const iconCopy = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
  const iconEye = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  const iconEyeOff = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
  const iconGrid = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`;
  const iconList = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`;
  const iconTrash = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

  const iconSortAZ = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 10l5 5 5-5"/><path d="M4 6h7m-7 6h7m-7 6h7"/></svg>`;
  const iconSortDown = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>`;
  const iconSortUp = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20v-6"/><path d="M6 20V10"/><path d="M18 20v-4"/></svg>`;

  const iconsType = {
    invoice: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
    payment: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>`,
  };

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

  const getDateKey = (dateObj) => {
    if (!dateObj || isNaN(dateObj)) return "unknown";
    return dateObj.toDateString();
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

    if (diffDays === 0) return "Hoy";
    if (diffDays === 1) return "Ayer";

    const options = { weekday: "long", day: "numeric", month: "long" };
    const dateStr = dateObj.toLocaleDateString("es-AR", options);
    return dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  };

  const handleToggle = (e) => {
    const newState = onToggleVisibility();
    isVisible = newState;
    e.currentTarget.innerHTML = newState ? iconEye : iconEyeOff;

    const allBalances = document.querySelectorAll(
      ".balance-value, .total-debt-value, .mov-amount-main, .mini-pill-amount, .separator-amount",
    );
    allBalances.forEach((elAmount) => {
      const amount = parseFloat(elAmount.getAttribute("data-amount"));
      if (!isNaN(amount))
        elAmount.textContent = SupplierModel.formatAmount(amount, newState);
    });
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
          const myRecentMoves = recentTransactions
            .filter((tx) => tx.supplierId === s.id)
            .slice(0, 3);

          const card = el(
            "div",
            { className: "supplier-card", dataset: { id: s.id } },
            [
              el("div", { className: "card-header-top" }, [
                el("div", { className: "card-info" }, [
                  el("h3", { className: "card-name" }, s.name),
                  s.alias
                    ? el("div", { className: "alias-pill" }, [
                        el("span", { innerHTML: iconCopy }),
                        el("span", {}, s.alias),
                      ])
                    : el(
                        "span",
                        { className: "card-alias-empty" },
                        "Sin alias",
                      ),
                ]),
                el("div", { className: "card-actions-right" }, [
                  el("div", { className: "card-balance-block" }, [
                    el("span", { className: "balance-label" }, "DEUDA TOTAL"),
                    el(
                      "span",
                      {
                        className: `balance-value ${balance > 0 ? "text-danger" : "text-success"}`,
                        dataset: { amount: balance },
                      },
                      SupplierModel.formatAmount(balance, isVisible),
                    ),
                  ]),
                  el("button", {
                    className: "btn-big-add",
                    innerHTML: iconPlus,
                  }),
                ]),
              ]),
              myRecentMoves.length > 0
                ? el("div", { className: "card-mini-footer" }, [
                    el(
                      "span",
                      { className: "footer-label" },
                      "Últimos Movimientos",
                    ),
                    el(
                      "div",
                      { className: "pills-container" },
                      myRecentMoves.map((tx) => {
                        const dateObj =
                          tx.date && tx.date.toDate
                            ? tx.date.toDate()
                            : new Date(tx.date);
                        const dateStr = dateObj.toLocaleDateString("es-AR", {
                          day: "2-digit",
                          month: "2-digit",
                        });
                        const isDebt = tx.type === "invoice";
                        return el(
                          "div",
                          {
                            className: `mini-pill ${isDebt ? "invoice" : "payment"}`,
                          },
                          [
                            el("span", { className: "pill-date" }, dateStr),
                            el(
                              "span",
                              {
                                className: "mini-pill-amount",
                                dataset: { amount: tx.amount },
                              },
                              SupplierModel.formatAmount(tx.amount, isVisible),
                            ),
                          ],
                        );
                      }),
                    ),
                  ])
                : null,
            ],
          );
          fragment.appendChild(card);
        });
        gridContainer.appendChild(fragment);

        gridContainer.onclick = (e) => {
          const card = e.target.closest(".supplier-card");
          if (!card) return;
          if (e.target.closest(".alias-pill")) {
            const s = suppliers.find((su) => su.id === card.dataset.id);
            if (s?.alias) navigator.clipboard.writeText(s.alias);
            return;
          }
          if (e.target.closest(".btn-big-add")) {
            const s = suppliers.find((su) => su.id === card.dataset.id);
            onAddQuickTransaction(s);
            return;
          }
          onSelect(card.dataset.id);
        };
      }
      contentWrapper.appendChild(gridContainer);
    } else {
      // --- VISTA ACTIVIDAD (Modo Tarjeta Editable) ---
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
            "No se encontraron movimientos.",
          ),
        );
        return;
      }
      const listContainer = el("div", { className: "activity-list-container" });
      let lastDateKey = null;

      visibleTransactions.forEach((m) => {
        const date =
          m.date && m.date.toDate ? m.date.toDate() : new Date(m.date);
        const currentDateKey = getDateKey(date);

        if (currentDateKey !== lastDateKey) {
          const movesForDay = visibleTransactions.filter((t) => {
            const tDate =
              t.date && t.date.toDate ? t.date.toDate() : new Date(t.date);
            return getDateKey(tDate) === currentDateKey;
          });

          const dayDebt = movesForDay
            .filter((t) => t.type === "invoice")
            .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
          const dayPayment = movesForDay
            .filter((t) => t.type === "payment")
            .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

          listContainer.appendChild(
            el("div", { className: "group-separator-modern" }, [
              el(
                "span",
                { className: "separator-date" },
                getFriendlyDate(date),
              ),
              el("span", { className: "separator-line" }),
              el("div", { className: "separator-totals" }, [
                el("div", { className: "total-tag debt" }, [
                  el("span", { className: "tag-label" }, "Deuda:"),
                  el(
                    "span",
                    {
                      className: "separator-amount",
                      dataset: { amount: dayDebt },
                    },
                    SupplierModel.formatAmount(dayDebt, isVisible),
                  ),
                ]),
                el("span", { className: "separator-divider" }, "|"),
                el("div", { className: "total-tag payment" }, [
                  el("span", { className: "tag-label" }, "Pagos:"),
                  el(
                    "span",
                    {
                      className: "separator-amount",
                      dataset: { amount: dayPayment },
                    },
                    SupplierModel.formatAmount(dayPayment, isVisible),
                  ),
                ]),
              ]),
            ]),
          );
          lastDateKey = currentDateKey;
        }

        const isDebt = m.type === "invoice";
        const day = date.getDate();
        const month = date
          .toLocaleString("es-AR", { month: "short" })
          .toUpperCase()
          .replace(".", "");
        const yearShort = date.getFullYear().toString().slice(-2);

        // Buscamos nombre del proveedor
        const supplierFound = suppliers.find((s) => s.id === m.supplierId);
        const supplierName = supplierFound
          ? supplierFound.name
          : m.supplierName || "Proveedor Desconocido";

        // Tarjeta con click para editar
        const card = el(
          "div",
          {
            className: "movement-card",
            onclick: () => onEditTransaction && onEditTransaction(m),
          },
          [
            // Izq: Fecha e Icono
            el("div", { className: "mov-left-group" }, [
              el("div", {
                className: `mov-circle-icon ${isDebt ? "bg-danger-soft" : "bg-success-soft"}`,
                innerHTML: iconsType[m.type] || iconsType.invoice,
              }),
              el("div", { className: "mov-calendar-square" }, [
                el("span", { className: "cal-day" }, day),
                el(
                  "span",
                  { className: "cal-month-year" },
                  `${month} ${yearShort}`,
                ),
              ]),
            ]),

            // Centro: Info (Proveedor y Tipo en misma linea)
            el("div", { className: "mov-info-col" }, [
              el("div", { className: "mov-header-row" }, [
                el("span", { className: "supplier-name-large" }, supplierName),
                el(
                  "span",
                  { className: "mov-type-badge" },
                  isDebt ? "BOLETA" : "PAGO",
                ),
              ]),
              el(
                "span",
                { className: "mov-secondary-concept" },
                m.description || m.concept || "-",
              ),
            ]),

            // Derecha: Montos y Botón Eliminar
            el("div", { className: "mov-right-amounts" }, [
              el(
                "span",
                {
                  className: `mov-amount-main ${isDebt ? "text-danger" : "text-success"}`,
                  dataset: { amount: m.amount },
                },
                SupplierModel.formatAmount(m.amount, isVisible),
              ),

              // Botón Eliminar (stopPropagation para no disparar el edit)
              el("button", {
                className: "btn-delete-mov",
                title: "Eliminar registro",
                onclick: (e) => {
                  e.stopPropagation();
                  if (onDeleteTransaction) onDeleteTransaction(m);
                },
                innerHTML: iconTrash,
              }),
            ]),
          ],
        );
        listContainer.appendChild(card);
      });
      contentWrapper.appendChild(listContainer);
    }
  };

  const searchComponent = SearchBox({
    placeholder: "Buscar proveedor, alias...",
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

  return el("div", { className: "supplier-list-view" }, [
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
    el("div", { className: "toolbar-container" }, [
      el("div", { className: "tabs-group" }, [btnTabDirectory, btnTabActivity]),
      controlsGroupRight,
    ]),
    contentWrapper,
  ]);
}
