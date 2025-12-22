// src/modules/suppliers/views/SupplierDetailView/index.js
import { el } from "../../../../core/dom.js";
import { supplierService } from "../../services/SupplierService.js";
import { PDFService } from "../../services/PDFService.js"; // <--- IMPORTANTE: Servicio de PDF agregado
import { SupplierDetail } from "../../components/SupplierDetail/index.js";
import { MovementForm } from "../../components/MovementForm/index.js";
import { SupplierConfigModal } from "../../components/SupplierConfigModal/index.js";
import { Modal } from "../../../../shared/ui/Modal/index.js";
import { Icon } from "../../../../shared/ui/Icon.js";
import { Toast } from "../../../../shared/ui/Toast/index.js"; // Agregado para feedback
import "./style.css";

export async function SupplierDetailView({ navigateTo, params }) {
  const supplierId = params.id;
  const container = el("div", { className: "detail-view-container" });

  let supplier = null;
  let transactions = [];

  const loadData = async () => {
    try {
      console.log("Cargando datos para proveedor ID:", supplierId);

      // Ejecutamos las promesas en paralelo
      const [suppData, txData] = await Promise.all([
        supplierService.getSupplierById(supplierId),
        supplierService.getTransactions(supplierId),
      ]);

      supplier = suppData;
      transactions = txData;

      if (!supplier) {
        throw new Error("Proveedor no encontrado en la base de datos.");
      }

      render();
    } catch (e) {
      console.error("Error en SupplierDetailView:", e);
      container.innerHTML = "";
      container.append(
        el(
          "div",
          { style: "padding:20px; text-align:center; color:#ff6b6b;" },
          `Error cargando datos: ${e.message}`
        )
      );
    }
  };

  // --- HANDLERS ---

  const handleTransactionClick = (tx) => {
    const modal = Modal({
      title: "Editar Movimiento",
      content: MovementForm({
        supplierId: supplier.id,
        preSelectedSupplier: supplier,
        initialValues: tx,
        onSubmit: async (formData) => {
          try {
            await supplierService.updateTransaction(tx.id, formData);
            modal.close();
            await loadData(); // Recargamos para actualizar saldos
            Toast.show("Movimiento actualizado correctamente");
          } catch (error) {
            console.error(error);
            Toast.show("Error al actualizar: " + error.message, "error");
          }
        },
        onDelete: async () => {
          if (confirm("¿Eliminar movimiento? Esta acción afectará el saldo.")) {
            try {
              await supplierService.deleteTransaction(tx.id);
              modal.close();
              await loadData();
              Toast.show("Movimiento eliminado");
            } catch (error) {
              Toast.show("Error al eliminar", "error");
            }
          }
        },
      }),
    });
    modal.open();
  };

  const handleNewMovement = () => {
    const modal = Modal({
      title: "Nuevo Movimiento",
      content: MovementForm({
        supplierId: supplier.id,
        preSelectedSupplier: supplier,
        onSubmit: async (formData) => {
          try {
            await supplierService.registerMovement(formData);
            modal.close();
            await loadData();
            Toast.show("Movimiento registrado con éxito");
          } catch (error) {
            console.error(error);
            Toast.show("Error al registrar: " + error.message, "error");
          }
        },
      }),
    });
    modal.open();
  };

  const handleConfig = () => {
    if (!supplier) return;

    const modal = Modal({
      title: "Configuración de Proveedor",
      content: SupplierConfigModal({
        supplier,
        onClose: () => modal.close(),
        onUpdate: async () => {
          modal.close();
          await loadData(); // Recargamos para ver cambios (ej. nombre)
          Toast.show("Proveedor actualizado");
        },
      }),
    });
    modal.open();
  };

  // Buscamos la función handleOpenPdf dentro de SupplierDetailView/index.js

  const handleOpenPdf = () => {
    if (!supplier || !transactions || transactions.length === 0) {
      Toast.show("No hay datos para el reporte", "warning");
      return;
    }

    try {
      // 1. Generamos el doc y el nombre con fecha
      const { doc, fileName } = PDFService.generateDoc(supplier, transactions);

      // 2. Creamos el Blob y una URL de objeto
      const pdfBlob = doc.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);

      // 3. Abrimos el modal con el visor configurado para no achatarse
      const modal = Modal({
        title: `Vista Previa: ${fileName}`,
        content: el(
          "div",
          { className: "pdf-modal-container" },
          el("iframe", {
            // #toolbar=1 forzará la barra de herramientas en la mayoría de navegadores
            // #view=FitH hace que el PDF se ajuste al ancho automáticamente
            src: `${pdfUrl}#toolbar=1&view=FitH`,
            className: "pdf-iframe-preview",
          })
        ),
      });

      modal.open();
    } catch (error) {
      console.error("Error PDF:", error);
      Toast.show("Error al generar vista previa", "error");
    }
  };
  const render = () => {
    container.innerHTML = "";

    const header = el(
      "div",
      { className: "detail-header" },
      el(
        "button",
        { className: "back-btn", onclick: () => navigateTo("suppliers") },
        Icon("arrowLeft")
      ),
      el("h1", { className: "detail-title" }, "Detalle de Proveedor")
    );

    const detail = SupplierDetail({
      supplier,
      transactions,
      onTransactionClick: handleTransactionClick,
      onNewMovement: handleNewMovement,
      onOpenConfig: handleConfig, // Ahora funciona
      onOpenPdf: handleOpenPdf, // Ahora funciona
    });

    container.append(header, detail);
  };

  // Render inicial (loading)
  container.innerHTML =
    '<div style="padding:20px; color:#ccc;">Cargando información...</div>';

  await loadData();
  return container;
}
