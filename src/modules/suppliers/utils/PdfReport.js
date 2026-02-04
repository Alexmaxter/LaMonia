import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { el } from "../../../core/dom.js";

export const PdfReport = {
  // Ahora aceptamos dateRange opcional
  generateSupplierReport: (supplier, movements, dateRange) => {
    // 1. Generar el Blob del PDF con el nuevo diseño
    const { blobUrl, fileName } = generatePdf(supplier, movements, dateRange);

    // 2. Mostrar el Visor (Modal Tech)
    showPdfModal(blobUrl, fileName);
  },
};

/**
 * Lógica de Generación Tech/Brutalista
 */
function generatePdf(supplier, movements, dateRange) {
  const doc = new jsPDF();

  // --- CONFIGURACIÓN & HELPERS ---
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateInput) => {
    if (!dateInput) return "-";
    const date = dateInput.seconds
      ? new Date(dateInput.seconds * 1000)
      : new Date(dateInput);
    return date.toLocaleDateString("es-AR");
  };

  // --- FILTRADO DE DATOS ---
  let filteredMovements = [...movements];

  // Si hay rango de fechas, filtramos
  if (dateRange && dateRange.startDate && dateRange.endDate) {
    filteredMovements = movements.filter((m) => {
      const mDate = m.date.seconds
        ? new Date(m.date.seconds * 1000)
        : new Date(m.date);
      // Normalizamos a inicio/fin del día
      const d = new Date(mDate.setHours(0, 0, 0, 0));
      const start = new Date(dateRange.startDate.setHours(0, 0, 0, 0));
      const end = new Date(dateRange.endDate.setHours(23, 59, 59, 999));
      return d >= start && d <= end;
    });
  }

  // Orden cronológico para el reporte (más antiguo arriba)
  filteredMovements.sort((a, b) => {
    const dA = a.date.seconds ? a.date.seconds : new Date(a.date).getTime();
    const dB = b.date.seconds ? b.date.seconds : new Date(b.date).getTime();
    return dA - dB;
  });

  // Cálculos del periodo
  const totalDebtPeriod = filteredMovements
    .filter((m) => m.type === "invoice")
    .reduce((acc, m) => acc + (parseFloat(m.amount) || 0), 0);

  const totalPaidPeriod = filteredMovements
    .filter((m) => m.type === "payment")
    .reduce((acc, m) => acc + (parseFloat(m.amount) || 0), 0);

  // --- DISEÑO BRUTALISTA ---

  // 1. Encabezado Sólido
  doc.setFillColor(0, 0, 0); // Negro
  doc.rect(0, 0, 210, 20, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("courier", "bold");
  doc.setFontSize(18);
  doc.text("REPORTE DE CUENTA", 14, 13);

  doc.setFontSize(10);
  doc.setFont("courier", "normal");
  const dateStr = new Date().toLocaleDateString("es-AR");
  doc.text(`EMITIDO: ${dateStr}`, 195, 13, { align: "right" });

  const startY = 30;

  // 2. Info Proveedor (Estilo Bloque)
  // Línea gruesa
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(14, startY + 8, 196, startY + 8);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text("PROVEEDOR:", 14, startY + 5);

  doc.setFontSize(14);
  doc.setFont("courier", "bold");
  doc.text(supplier.name.toUpperCase(), 40, startY + 5);

  if (supplier.alias) {
    doc.setFontSize(10);
    doc.setFont("courier", "normal");
    doc.text(`DATOS/ALIAS: ${supplier.alias}`, 14, startY + 15);
  }

  // Rango
  if (dateRange) {
    doc.text(
      `PERIODO: ${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}`,
      14,
      startY + 22,
    );
  }

  // 3. Caja Resumen (Derecha)
  const boxX = 120;
  const boxY = startY - 2;
  const boxW = 76;
  const boxH = 28;

  doc.setDrawColor(0, 0, 0);
  doc.rect(boxX, boxY, boxW, boxH);

  doc.setFontSize(9);
  doc.setFont("courier", "bold");
  doc.text("RESUMEN PERIODO", boxX + 4, boxY + 6);

  doc.setFont("courier", "normal");
  doc.text("TOTAL DEUDA:", boxX + 4, boxY + 14);
  doc.text("TOTAL PAGOS:", boxX + 4, boxY + 22);

  doc.setFont("courier", "bold");
  doc.text(formatCurrency(totalDebtPeriod), boxX + boxW - 4, boxY + 14, {
    align: "right",
  });
  doc.text(formatCurrency(totalPaidPeriod), boxX + boxW - 4, boxY + 22, {
    align: "right",
  });

  // 4. Tabla
  const tableColumn = ["FECHA", "TIPO", "DESCRIPCIÓN", "MONTO"];
  const tableRows = filteredMovements.map((m) => {
    const isInvoice = m.type === "invoice";
    return [
      formatDate(m.date),
      isInvoice ? "BOLETA" : "PAGO",
      (m.description || m.concept || "").toUpperCase(),
      formatCurrency(m.amount),
    ];
  });

  autoTable(doc, {
    startY: startY + 35,
    head: [tableColumn],
    body: tableRows,
    theme: "plain",
    styles: {
      font: "courier",
      fontSize: 9,
      cellPadding: 3,
      lineColor: [200, 200, 200],
      lineWidth: { bottom: 0.1 },
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "left",
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 30, fontStyle: "bold" },
      2: { cellWidth: "auto" },
      3: { cellWidth: 40, halign: "right", fontStyle: "bold" },
    },
    didParseCell: function (data) {
      if (data.section === "body" && data.column.index === 3) {
        const type = data.row.raw[1];
        if (type === "BOLETA") {
          data.cell.styles.textColor = [200, 0, 0]; // Rojo
        } else {
          data.cell.styles.textColor = [0, 100, 0]; // Verde
        }
      }
    },
  });

  // Footer Paginas
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Página ${i} de ${pageCount}`, 196, 285, { align: "right" });
  }

  const fileName = `Reporte_${supplier.name.replace(/\s+/g, "_")}_${dateStr.replace(/\//g, "-")}.pdf`;
  const blob = doc.output("blob");

  return {
    blobUrl: URL.createObjectURL(blob),
    fileName,
  };
}

/**
 * Modal Visor Tech
 */
function showPdfModal(pdfUrl, fileName) {
  const cssId = "pdf-viewer-styles-tech";
  if (!document.getElementById(cssId)) {
    const style = el("style", {
      id: cssId,
      innerHTML: `
        .pdf-tech-overlay {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(5px);
          display: flex; align-items: center; justify-content: center;
          z-index: 99999; animation: fadeIn 0.2s;
        }
        .pdf-tech-modal {
          background: #fff; width: 90%; height: 90vh; max-width: 1000px;
          border: 2px solid #000;
          display: flex; flex-direction: column;
          box-shadow: 10px 10px 0px rgba(0,0,0,0.1);
        }
        .pdf-tech-header {
          padding: 12px 20px; border-bottom: 2px solid #000;
          display: flex; justify-content: space-between; align-items: center;
          background: #f8f8f8;
        }
        .pdf-tech-title {
          font-family: monospace; font-weight: bold; font-size: 1.1rem; text-transform: uppercase;
        }
        .pdf-tech-actions { display: flex; gap: 12px; }
        .btn-tech-dl {
          background: #000; color: #fff; text-decoration: none;
          padding: 8px 16px; font-family: monospace; font-weight: bold; font-size: 0.9rem;
          display: flex; align-items: center; gap: 8px;
        }
        .btn-tech-dl:hover { background: #333; }
        .btn-tech-close {
          background: transparent; border: 1px solid transparent;
          font-size: 1.5rem; cursor: pointer; line-height: 1;
          width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
        }
        .btn-tech-close:hover { border-color: #000; background: #fff; }
        .pdf-tech-iframe { flex: 1; border: none; background: #eee; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `,
    });
    document.head.appendChild(style);
  }

  const closeModal = () => {
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
    modal.remove();
  };

  const modal = el(
    "div",
    {
      className: "pdf-tech-overlay",
      onclick: (e) => e.target.className === "pdf-tech-overlay" && closeModal(),
    },
    [
      el("div", { className: "pdf-tech-modal" }, [
        el("div", { className: "pdf-tech-header" }, [
          el(
            "span",
            { className: "pdf-tech-title" },
            "VISTA PREVIA DE REPORTE",
          ),
          el("div", { className: "pdf-tech-actions" }, [
            el(
              "a",
              { className: "btn-tech-dl", href: pdfUrl, download: fileName },
              "DESCARGAR PDF",
            ),
            el("button", {
              className: "btn-tech-close",
              onclick: closeModal,
              innerHTML: "&times;",
            }),
          ]),
        ]),
        el("iframe", {
          className: "pdf-tech-iframe",
          src: `${pdfUrl}#toolbar=0&navpanes=0`,
        }),
      ]),
    ],
  );

  document.body.appendChild(modal);
}
