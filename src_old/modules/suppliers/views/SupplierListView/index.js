import { el } from "../../../../core/dom.js";
import { PageHeader } from "../../../../shared/ui/PageHeader/index.js";
import { SupplierTable } from "../../components/SupplierTable/index.js";
import { SuppliersSummary } from "../../components/SuppliersSummary/index.js";
import { supplierService } from "../../services/SupplierService.js";
import { Modal } from "../../../../shared/ui/Modal/index.js";
import { SupplierConfigModal } from "../../components/SupplierConfigModal/index.js";
// Importamos el formulario de movimientos
import { MovementForm } from "../../components/MovementForm/index.js";
import { Icon } from "../../../../shared/ui/Icon.js";
import { Button } from "../../../../shared/ui/Button/index.js";
import { SkeletonList } from "../../../../shared/ui/Skeleton/index.js";
import { Toast } from "../../../../shared/ui/Toast/index.js";

import "./style.css";

export function SupplierListView({ router }) {
  const container = el("div", {
    className: "supplier-list-view page-container",
  });
  const contentWrapper = el("div", { className: "content-wrapper" });

  const loadData = async () => {
    contentWrapper.innerHTML = "";

    // 1. Cabecera Fija
    // CORRECCIÓN: Usamos 'action' (singular) en lugar de 'actions',
    // y aseguramos que el botón se cree correctamente.
    contentWrapper.append(
      PageHeader({
        title: "Proveedores",
        subtitle: "Gestión de cuentas y saldos",
        action: Button({
          text: "Nuevo Proveedor", // 'text' o 'label' según tu componente Button
          variant: "primary",
          className: "btn-primary-pill", // Estilo redondeado
          icon: "plus",
          onClick: openCreateModal,
        }),
      })
    );

    const loadingState = el(
      "div",
      { className: "loading-state" },
      SkeletonList(3)
    );
    contentWrapper.appendChild(loadingState);

    try {
      const suppliers = await supplierService.getSuppliers();
      loadingState.remove();
      renderContent(suppliers);
    } catch (error) {
      console.error("Error cargando proveedores:", error);
      loadingState.remove();
      contentWrapper.append(
        el("div", { className: "error-msg" }, "No se pudo cargar la lista.")
      );
    }
  };

  const renderContent = (suppliers) => {
    if (suppliers.length > 0) {
      const summarySection = el("div", {
        className: "section-summary fade-in",
      });
      summarySection.append(SuppliersSummary({ suppliers }));
      contentWrapper.append(summarySection);
    }

    const listSection = el("div", { className: "section-list fade-in" });

    listSection.append(
      SupplierTable({
        suppliers,
        onViewDetail: (id) => {
          window.location.hash = `supplier-detail?id=${id}`;
        },
        // Acción del botón "+" de la tarjeta
        onAddTransaction: (supplier) => {
          openTransactionModal(supplier);
        },
      })
    );

    contentWrapper.append(listSection);
  };

  // --- Modales ---

  const openCreateModal = () => {
    const modal = Modal({
      title: "Agregar Proveedor",
      content: SupplierConfigModal({
        onSubmit: async (data) => {
          await supplierService.addSupplier(data);
          modal.close();
          Toast.show("Proveedor creado con éxito", "success");
          loadData();
        },
        onCancel: () => modal.close(),
      }),
    });
    modal.open();
  };

  // Nueva función para abrir el modal de Agregar Boleta
  const openTransactionModal = (supplier) => {
    const modal = Modal({
      title: `Nueva Transacción - ${supplier.name}`,
      content: MovementForm({
        // Pasamos el ID del proveedor para que el formulario lo preseleccione
        // o lo use internamente
        initialValues: {
          supplierId: supplier.id,
          date: new Date().toISOString().split("T")[0], // Fecha hoy por defecto
        },
        onSubmit: async (transactionData) => {
          try {
            // Aseguramos que el ID del proveedor vaya en los datos
            const payload = {
              ...transactionData,
              supplierId: supplier.id,
            };

            await supplierService.addTransaction(payload);
            modal.close();
            Toast.show("Movimiento registrado", "success");
            loadData(); // Recargar para actualizar saldos
          } catch (error) {
            console.error(error);
            Toast.show("Error al guardar movimiento", "error");
          }
        },
        onCancel: () => modal.close(),
      }),
    });
    modal.open();
  };

  // Inicialización
  container.append(contentWrapper);
  loadData();

  return container;
}
