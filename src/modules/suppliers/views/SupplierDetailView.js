// src/modules/suppliers/views/SupplierDetailView.js
import { el } from "../../../core/dom.js";
import { Button } from "../../../shared/ui/Button/index.js";
import { Modal } from "../../../shared/ui/Modal/index.js";
import { supplierService } from "../services/SupplierService.js";
import { SupplierDetail } from "../components/SupplierDetail/index.js";
import { MovementForm } from "../components/MovementForm/index.js";
import { SupplierConfigModal } from "../components/SupplierConfigModal/index.js";
import { PDFService } from "../services/PDFService.js";

export function SupplierDetailView({ navigateTo, params }) {
  const container = el("div", {
    className: "supplier-detail-view",
    style: { padding: "20px", maxWidth: "800px", margin: "0 auto" },
  });

  if (!params || !params.supplier)
    return el("div", {}, "Error: No se especificó el proveedor.");

  let currentSupplier = params.supplier;
  const contentWrapper = el("div", {}, "Cargando historial...");

  // ... (handleConfig, handleAddMovement, handlePDF igual que antes) ...
  const handleConfig = () => {
    const modal = SupplierConfigModal({
      supplier: currentSupplier,
      onUpdate: async () => {
        await loadData();
      },
    });
    modal.open();
  };

  const handleAddMovement = () => {
    let modalRef = null;
    const formComponent = MovementForm({
      suppliers: [],
      preSelectedSupplier: currentSupplier,
      onSubmit: async (data) => {
        try {
          await supplierService.registerMovement(data);
          if (modalRef) modalRef.close();
          await loadData();
        } catch (e) {
          console.error(e);
          alert("Error: " + e.message);
        }
      },
      onCancel: () => {
        if (modalRef) modalRef.close();
      },
    });
    modalRef = Modal({ title: "Nuevo Movimiento", content: formComponent });
    modalRef.open();
  };

  const handlePDF = () => {
    // ... (Lógica PDF igual que antes) ...
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const today = now.toISOString().split("T")[0];
    const fromInput = el("input", {
      type: "date",
      value: firstDay,
      className: "modern-input",
      style: {
        width: "100%",
        padding: "8px",
        borderRadius: "8px",
        border: "1px solid #ddd",
      },
    });
    const toInput = el("input", {
      type: "date",
      value: today,
      className: "modern-input",
      style: {
        width: "100%",
        padding: "8px",
        borderRadius: "8px",
        border: "1px solid #ddd",
      },
    });
    let modalRef = null;
    modalRef = Modal({
      title: "📄 Reporte PDF",
      content: el(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: "15px" } },
        el(
          "div",
          {},
          el(
            "label",
            {
              style: {
                fontWeight: "600",
                display: "block",
                marginBottom: "5px",
              },
            },
            "Desde:"
          ),
          fromInput
        ),
        el(
          "div",
          {},
          el(
            "label",
            {
              style: {
                fontWeight: "600",
                display: "block",
                marginBottom: "5px",
              },
            },
            "Hasta:"
          ),
          toInput
        ),
        el(
          "p",
          { style: { fontSize: "0.85rem", color: "#666", marginTop: "5px" } },
          "Incluye saldo anterior calculado."
        )
      ),
      footer: el(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            width: "100%",
          },
        },
        Button({
          text: "Historial Completo",
          variant: "secondary",
          onClick: async () => {
            const txs = await supplierService.getTransactions(
              currentSupplier.id
            );
            PDFService.generateAccountStatement(
              currentSupplier,
              txs,
              null,
              null
            );
            modalRef.close();
          },
        }),
        Button({
          text: "Descargar Reporte",
          variant: "primary",
          onClick: async () => {
            const txs = await supplierService.getTransactions(
              currentSupplier.id
            );
            PDFService.generateAccountStatement(
              currentSupplier,
              txs,
              fromInput.value,
              toInput.value
            );
            modalRef.close();
          },
        })
      ),
    });
    modalRef.open();
  };

  const topBar = el(
    "div",
    { style: { marginBottom: "15px", display: "flex", alignItems: "center" } },
    Button({
      text: "⬅ Volver",
      variant: "secondary",
      onClick: () => navigateTo("suppliers"),
    })
  );

  const loadData = async () => {
    try {
      if (typeof supplierService.getSupplierById === "function") {
        const freshSupplier = await supplierService.getSupplierById(
          currentSupplier.id
        );
        if (freshSupplier) currentSupplier = freshSupplier;
      }

      const transactions = await supplierService.getTransactions(
        currentSupplier.id
      );

      const detailComponent = SupplierDetail({
        supplier: currentSupplier,
        transactions: transactions,

        // --- 1. EDITAR + BORRAR ---
        onEditTransaction: (t) => {
          let modalRef = null;
          const form = MovementForm({
            suppliers: [],
            preSelectedSupplier: currentSupplier,
            initialValues: t,
            // A) Acción de Guardar Edición
            onSubmit: async (d) => {
              if (supplierService.updateTransaction) {
                await supplierService.updateTransaction(t, d);
                modalRef.close();
                await loadData();
              } else {
                alert("Edición no implementada en servicio.");
              }
            },
            // B) Acción de Eliminar (Pasa al form)
            onDelete: async () => {
              if (
                confirm(
                  "¿Estás seguro de eliminar este movimiento permanentemente?"
                )
              ) {
                await supplierService.deleteTransaction(t.id);
                modalRef.close();
                await loadData();
              }
            },
            onCancel: () => modalRef.close(),
          });
          modalRef = Modal({ title: "Editar Movimiento", content: form });
          modalRef.open();
        },

        // --- 2. ELIMINAR DESDE LISTA (Si se usara el botón viejo, pero lo integramos arriba) ---
        onDeleteTransaction: async (t) => {
          /* Ya cubierto en onDelete del form, pero lo dejamos por compatibilidad */
        },

        onOpenPdf: handlePDF,
        onOpenConfig: handleConfig,
        onNewMovement: handleAddMovement,
      });

      contentWrapper.innerHTML = "";
      contentWrapper.appendChild(detailComponent);
    } catch (error) {
      console.error(error);
      contentWrapper.innerHTML = `<div style="color:red; padding: 20px;">Error cargando datos: ${error.message}</div>`;
    }
  };

  container.appendChild(topBar);
  container.appendChild(contentWrapper);

  loadData();

  return container;
}
