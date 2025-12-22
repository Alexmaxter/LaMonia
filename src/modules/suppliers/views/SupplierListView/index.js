import { el } from "../../../../core/dom.js";
import { Icon } from "../../../../shared/ui/Icon.js";
import { Modal } from "../../../../shared/ui/Modal/index.js";
import { Button } from "../../../../shared/ui/Button/index.js";
import { SearchBox } from "../../../../shared/ui/SearchBox/index.js";
import { supplierService } from "../../services/SupplierService.js";
import { SupplierTable } from "../../components/SupplierTable/index.js";
import { MovementForm } from "../../components/MovementForm/index.js";
import { SuppliersSummary } from "../../components/SuppliersSummary/index.js";

// Importamos el CSS local que acabamos de crear
import "./style.css";

export function SuppliersListView({ navigateTo }) {
  const container = el("div", { className: "view-container fade-in" });

  let allSuppliers = [];
  let unsubscribe = null;
  let currentSearchTerm = "";

  const summaryWrapper = el("div", { className: "summary-wrapper" });
  const tableWrapper = el("div", { className: "table-wrapper" });

  const searchComponent = SearchBox({
    placeholder: "Buscar por nombre o alias...",
    onSearch: (term) => {
      currentSearchTerm = term;
      applyFilter();
    },
  });

  const applyFilter = () => {
    const filtered = currentSearchTerm
      ? allSuppliers.filter(
          (s) =>
            s.name.toLowerCase().includes(currentSearchTerm) ||
            (s.alias && s.alias.toLowerCase().includes(currentSearchTerm))
        )
      : allSuppliers;

    tableWrapper.innerHTML = "";
    tableWrapper.appendChild(
      SupplierTable({
        suppliers: filtered,
        onViewDetails: (s) => navigateTo("supplier-detail", { id: s.id }),
        onAddMovement: (s) => handleOpenMovementModal(s),
      })
    );
  };

  const renderSummary = (suppliers) => {
    summaryWrapper.innerHTML = "";
    summaryWrapper.appendChild(SuppliersSummary({ suppliers }));
  };

  // --- MODALES ---

  const handleCreateSupplier = () => {
    const nameInput = el("input", {
      className: "form-input",
      placeholder: "Nombre del negocio (ej: Distribuidora Central)",
      style: { width: "100%", padding: "10px", marginTop: "10px" },
    });

    let modalRef = null;

    const content = el(
      "div",
      {},
      el(
        "p",
        { style: { color: "#666" } },
        "Ingresa el nombre para dar de alta al proveedor."
      ),
      nameInput
    );

    const btnSave = Button({
      text: "Guardar Proveedor",
      fullWidth: true,
      onClick: async () => {
        const name = nameInput.value.trim();
        if (!name) return alert("El nombre es obligatorio");
        try {
          await supplierService.createSupplier({ name });
          if (modalRef) modalRef.close();
        } catch (e) {
          console.error(e);
          alert("Error al crear: " + e.message);
        }
      },
    });

    modalRef = Modal({
      title: "Nuevo Proveedor",
      content: content,
      footer: btnSave,
    });

    modalRef.open();
    setTimeout(() => nameInput.focus(), 100);
  };

  const handleOpenMovementModal = (preSelectedSupplier = null) => {
    let modalRef = null;

    const form = MovementForm({
      suppliers: allSuppliers,
      preSelectedSupplier: preSelectedSupplier,
      onSubmit: async (data) => {
        try {
          await supplierService.registerMovement(data);
          if (modalRef) modalRef.close();
        } catch (e) {
          alert("Error: " + e.message);
        }
      },
      onCancel: () => modalRef && modalRef.close(),
    });

    const title = preSelectedSupplier
      ? `Nuevo Movimiento - ${preSelectedSupplier.name}`
      : "Nuevo Movimiento";

    modalRef = Modal({ title: title, content: form });
    modalRef.open();
  };

  unsubscribe = supplierService.subscribeToSuppliers((data) => {
    allSuppliers = data;
    renderSummary(data);
    applyFilter();
  });

  container.onUnmount = () => {
    if (unsubscribe) unsubscribe();
  };

  // --- FAB BUTTONS ---
  const fabContainer = el("div", { className: "fab-container" });

  const btnNewSupplier = el(
    "button",
    {
      className: "fab-mini",
      title: "Nuevo Proveedor",
      type: "button",
    },
    Icon("truckPlus")
  );

  btnNewSupplier.onclick = (e) => {
    e.stopPropagation();
    handleCreateSupplier();
  };

  const btnNewMovement = el(
    "button",
    {
      className: "fab-btn",
      title: "Registrar Movimiento",
      type: "button",
    },
    Icon("filePlus")
  );

  btnNewMovement.onclick = (e) => {
    e.stopPropagation();
    handleOpenMovementModal(null);
  };

  fabContainer.append(btnNewSupplier, btnNewMovement);

  container.append(
    el("header", { className: "view-header" }, el("h1", {}, "Proveedores")),
    summaryWrapper,
    searchComponent,
    tableWrapper,
    fabContainer
  );

  return container;
}
