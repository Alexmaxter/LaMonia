// src/modules/suppliers/services/PDFService.js
import jsPDF from "https://esm.sh/jspdf";
import autoTable from "https://esm.sh/jspdf-autotable";
import { TransactionCalculator } from "../utils/TransactionCalculator.js";
import { formatCurrency } from "../../../core/utils/currency.js";

export const PDFService = {
  /**
   * Genera el documento PDF y devuelve el objeto junto con un nombre de archivo dinámico.
   * @param {Object} supplier - Datos del proveedor.
   * @param {Array} transactions - Listado de movimientos.
   * @param {string|null} dateFrom - Fecha de inicio del filtro.
   * @param {string|null} dateTo - Fecha de fin del filtro.
   * @returns {Object} { doc, fileName }
   */
  generateDoc(supplier, transactions, dateFrom = null, dateTo = null) {
    const doc = new jsPDF();
    const now = new Date();

    // Formateo de fechas para el documento y el nombre del archivo
    const dateStr = now.toLocaleDateString("es-AR").replace(/\//g, "-");
    const todayFull = now.toLocaleString("es-AR");

    // 1. Procesar datos usando el calculador de transacciones
    const data = TransactionCalculator.processHistory(
      supplier,
      transactions,
      dateFrom,
      dateTo
    );

    // --- ENCABEZADO DEL DOCUMENTO ---
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(supplier.name.toUpperCase(), 14, 15);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Fecha de emisión: ${todayFull}`, 14, 22); // Fecha y hora actual

    if (!data.isStock) {
      doc.setFontSize(12);
      doc.setTextColor(0);
      const saldoFinal = formatCurrency(supplier.balance || 0);
      doc.text(`SALDO TOTAL: ${saldoFinal}`, 196, 15, { align: "right" });
    }

    // --- PREPARACIÓN DE LA TABLA ---
    const tableBody = [];

    // Fila de saldo anterior si existe filtro de fechas
    if (data.showInitialRow) {
      tableBody.push([
        dateFrom ? dateFrom.split("-").reverse().join("/") : "-",
        "SALDO ANTERIOR / INICIAL",
        "",
        formatCurrency(data.balanceBeforeRange),
      ]);
    }

    // Mapeo de movimientos registrados
    data.records.forEach((row) => {
      const t = row.original;
      const fecha = row.dateObj.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      });

      let desc = t.description || "";
      if (!desc) {
        if (t.type === "invoice") desc = "Factura / Compra";
        else if (t.type === "payment") desc = "Pago Realizado";
        else desc = "Nota de Crédito";
      }
      if (t.invoiceNumber) desc += ` (#${t.invoiceNumber})`;

      let montoStr = "";
      let saldoStr = "";

      if (data.isStock) {
        const itemsStr = (t.items || [])
          .map((i) => `${i.quantity} ${i.name}`)
          .join(", ");
        montoStr = t.type === "invoice" ? `+ ${itemsStr}` : `- ${itemsStr}`;
        saldoStr = "-";
      } else {
        const absAmount = Math.abs(row.impact);
        montoStr = formatCurrency(absAmount);
        if (row.impact < 0) montoStr = `- ${montoStr}`; // Signo para pagos/notas
        saldoStr = formatCurrency(row.runningBalance);
      }

      tableBody.push([fecha, desc, montoStr, saldoStr]);
    });

    // --- RENDERIZADO DE TABLA ---
    autoTable(doc, {
      startY: 28,
      head: [["FECHA", "DETALLE", "MONTO", "SALDO"]],
      body: tableBody,
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 2,
        valign: "middle",
      },
      headStyles: {
        fillColor: [40, 40, 40],
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: "auto" },
        2: { halign: "right", fontStyle: "bold", cellWidth: 35 },
        3: { halign: "right", cellWidth: 35 },
      },
      // Colores semánticos para las celdas
      didParseCell: function (dataCell) {
        if (dataCell.section === "body") {
          let rowIndex = dataCell.row.index;
          if (data.showInitialRow) {
            if (rowIndex === 0) return; // Saltar fila de saldo inicial
            rowIndex--;
          }

          const record = data.records[rowIndex];
          if (!record) return;

          if (dataCell.column.index === 2) {
            if (record.original.type === "invoice") {
              dataCell.cell.styles.textColor = [200, 0, 0]; // Rojo para deuda
            } else {
              dataCell.cell.styles.textColor = [0, 150, 0]; // Verde para pagos
            }
          }
        }
      },
    });

    // Nombre del archivo con la fecha actual
    const fileName = `Resumen_${supplier.name.replace(
      /\s+/g,
      "_"
    )}_${dateStr}.pdf`;

    return { doc, fileName };
  },
};
