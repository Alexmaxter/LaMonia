import { el } from "../../../../core/dom.js";
import { PageHeader } from "../../../../shared/ui/PageHeader/index.js";
import { supplierService } from "../../services/SupplierService.js";
import { TransactionCalculator } from "../../utils/TransactionCalculator.js";
import { SupplierDetail } from "../../components/SupplierDetail/index.js";
import { MovementForm } from "../../components/MovementForm/index.js";
import { SupplierConfigModal } from "../../components/SupplierConfigModal/index.js"; // Importación clave
import { Modal } from "../../../../shared/ui/Modal/index.js";
import { PDFService } from "../../services/PDFService.js";
import { Button } from "../../../../shared/ui/Button/index.js";
import { Toast } from "../../../../shared/ui/Toast/index.js";
import "./style.css";
// Importamos estilos del componente hijo para asegurar carga
import "../../components/SupplierDetail/style.css";

export function SupplierDetailView({ params, router }) {
  const container = el("div", { className: "detail-content page-container" });
  let id = params?.id;
  let supplier = null;
  let transactions = [];
  let dateFrom = "";
  let dateTo = "";

  const loadData = async () => {
    if (!id) return;
    try {
      supplier = await supplierService.getSupplierById(id);
      if (!supplier) {
        router.navigate("suppliers");
        return;
      }
      transactions = await supplierService.getTransactions(id);
      render();
    } catch (error) {
      console.error(error);
      container.innerHTML = `<div class="error-msg">Error al cargar datos</div>`;
    }
  };

  const handleBack = () => router.navigate("suppliers");

  // --- MODAL DE EDICIÓN DE PROVEEDOR ---
  const openSupplierEditModal = () => {
    if (!supplier) return;
    const modal = Modal({
      title: "Ajustar Proveedor",
      content: SupplierConfigModal({
        initialValues: supplier, // Se pasan los datos actuales
        onSubmit: async (data) => {
          try {
            await supplierService.updateSupplier(supplier.id, data);
            modal.close();
            Toast.show("Proveedor actualizado", "success");
            loadData();
          } catch (error) {
            console.error(error);
            Toast.show("Error al actualizar", "error");
          }
        },
        onCancel: () => modal.close(),
      }),
    });
    modal.open();
  };

  const openMovementModal = () => {
    const modal = Modal({
      title: "Nuevo Movimiento",
      content: MovementForm({
        suppliers: [supplier],
        supplierId: supplier.id,
        preSelectedSupplier: supplier,
        onSubmit: async (data) => {
          await supplierService.addTransaction(data);
          modal.close();
          loadData();
        },
        onCancel: () => modal.close(),
      }),
    });
    modal.open();
  };

  const openEditModal = (transaction) => {
    const modal = Modal({
      title: "Editar Movimiento",
      content: MovementForm({
        suppliers: [supplier],
        supplierId: supplier.id,
        preSelectedSupplier: supplier,
        initialValues: transaction,
        onSubmit: async (data) => {
          await supplierService.updateTransaction(transaction.id, data);
          modal.close();
          loadData();
        },
        onDelete: async () => {
          if (confirm("¿Eliminar este movimiento?")) {
            await supplierService.deleteTransaction(transaction.id);
            modal.close();
            loadData();
          }
        },
        onCancel: () => modal.close(),
      }),
    });
    modal.open();
  };

  const render = () => {
    container.innerHTML = "";
    if (!supplier) return;

    const filteredData = TransactionCalculator.processHistory(
      supplier,
      transactions,
      dateFrom,
      dateTo
    );

    // CABECERA
    container.append(
      PageHeader({
        title: supplier.name,
        breadcrumbs: [
          { label: "Proveedores", path: "suppliers" },
          { label: supplier.name },
        ],
        onBack: handleBack,
        actions: el(
          "div",
          { style: "display:flex; gap:10px;" },

          // BOTÓN AJUSTAR (CORREGIDO)
          Button({
            label: "Ajustar",
            variant: "secondary",
            icon: "settings", // String, no componente
            onClick: openSupplierEditModal,
          }),

          Button({
            label: "Reporte PDF",
            variant: "outline",
            icon: "download",
            onClick: () =>
              PDFService.generateStatement(supplier, filteredData.records, {
                startDate: dateFrom,
                endDate: dateTo,
                initialBalance: filteredData.initialBalance,
              }),
          }),

          Button({
            label: "Nuevo Movimiento",
            variant: "primary",
            icon: "plus",
            onClick: openMovementModal,
          })
        ),
      })
    );

    // FILTROS
    const filters = el(
      "div",
      { className: "sd-filters-bar" }, // Usaremos clase CSS en style.css
      el(
        "div",
        { className: "filter-group" },
        el("label", {}, "Desde"),
        el("input", {
          type: "date",
          className: "modern-input",
          value: dateFrom,
          onchange: (e) => {
            dateFrom = e.target.value;
            render();
          },
        })
      ),
      el(
        "div",
        { className: "filter-group" },
        el("label", {}, "Hasta"),
        el("input", {
          type: "date",
          className: "modern-input",
          value: dateTo,
          onchange: (e) => {
            dateTo = e.target.value;
            render();
          },
        })
      ),
      dateFrom || dateTo
        ? Button({
            label: "Limpiar",
            variant: "text",
            onClick: () => {
              dateFrom = "";
              dateTo = "";
              render();
            },
          })
        : null
    );
    container.append(filters);

    // DETALLE (Lista y Hero)
    container.append(
      SupplierDetail({
        supplier: { ...supplier, balance: filteredData.finalBalance },
        transactions: filteredData.records,
        showHistory: true,
        onTransactionClick: openEditModal,
        onNewMovement: openMovementModal,
      })
    );
  };

  loadData();
  return container;
}
