import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { el } from "../../../core/dom.js";

export const PdfReport = {
  generateSupplierReport: (supplier, movements, dateRange) => {
    const { blobUrl, fileName } = generatePdf(supplier, movements, dateRange);
    showPdfModal(blobUrl, fileName);
  },
};

/**
 * GENERADOR DE PDF - FORMATO TECH / ESTADO DE CUENTA
 */
function generatePdf(supplier, movements, dateRange) {
  const doc = new jsPDF();

  // --- HELPERS ---
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDateShort = (dateInput) => {
    if (!dateInput) return "-";
    const date = dateInput.seconds
      ? new Date(dateInput.seconds * 1000)
      : new Date(dateInput);

    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear().toString().slice(-2);

    return `${day}/${month}/${year}`;
  };

  // Helper para obtener el tiempo exacto en ms (incluyendo nanosegundos si existen)
  const getExactTime = (d) => {
    if (!d) return 0;
    // Si es Timestamp de Firebase (segundos + nanosegundos)
    if (d.seconds !== undefined) {
      return d.seconds * 1000 + (d.nanoseconds || 0) / 1000000;
    }
    // Si es objeto Date nativo
    if (d.getTime) return d.getTime();
    // Si es string o número
    return new Date(d).getTime();
  };

  // --- 1. PREPARACIÓN DE DATOS ---

  // Filtrado por fecha
  let filteredMovements = [...movements];
  if (dateRange && dateRange.startDate && dateRange.endDate) {
    const startMs = dateRange.startDate.setHours(0, 0, 0, 0);
    const endMs = dateRange.endDate.setHours(23, 59, 59, 999);

    filteredMovements = movements.filter((m) => {
      const time = getExactTime(m.date);
      return time >= startMs && time <= endMs;
    });
  }

  // ORDENAR: ANTIGUO -> NUEVO (Ascendente)
  // Usamos getExactTime para respetar la hora exacta y nanosegundos.
  filteredMovements.sort((a, b) => {
    return getExactTime(a.date) - getExactTime(b.date);
  });

  // Calculamos el Saldo Progresivo (Running Balance)
  let runningBalance = 0;

  const processedRows = filteredMovements.map((m) => {
    const isInvoice = m.type === "invoice";
    const amount = parseFloat(m.amount) || 0;

    if (isInvoice) {
      runningBalance += amount;
    } else {
      runningBalance -= amount;
    }

    return {
      dateStr: formatDateShort(m.date),
      type: isInvoice ? "BOLETA" : "PAGO",
      concept: (m.description || m.concept || "")
        .toUpperCase()
        .substring(0, 40),
      amountRaw: amount,
      isInvoice: isInvoice,
      balanceRaw: runningBalance,
    };
  });

  // INVERTIR PARA VISUALIZACIÓN: NUEVO -> ANTIGUO
  // El último movimiento calculado (saldo final) quedará arriba.
  const displayRows = processedRows.reverse().map((row) => {
    return [
      row.dateStr,
      row.type,
      row.concept,
      {
        content: formatCurrency(row.amountRaw),
        styles: {
          textColor: row.isInvoice ? [200, 0, 0] : [0, 150, 0], // Rojo / Verde
          fontStyle: "bold",
        },
      },
      formatCurrency(row.balanceRaw),
    ];
  });

  // Saldo Global
  const globalBalance = parseFloat(supplier.balance) || 0;

  // --- 2. DISEÑO PDF ---

  // -> BARRA SUPERIOR
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, 210, 20, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("courier", "bold");
  doc.setFontSize(18);
  doc.text("ESTADO DE CUENTA", 14, 13);

  doc.setFontSize(10);
  doc.setFont("courier", "normal");
  const dateStr = new Date().toLocaleDateString("es-AR");
  doc.text(dateStr, 195, 13, { align: "right" });

  // -> SECCIÓN: INFO
  const startY = 30;

  // Izquierda
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text("PROVEEDOR:", 14, startY);

  doc.setFontSize(14);
  doc.setFont("courier", "bold");
  doc.text(supplier.name.toUpperCase(), 14, startY + 6);

  if (supplier.alias) {
    doc.setFontSize(9);
    doc.setFont("courier", "normal");
    doc.text(`ALIAS: ${supplier.alias}`, 14, startY + 12);
  }

  // Derecha: Saldo Destacado
  const balanceBoxX = 120;
  const balanceBoxY = startY - 5;
  const balanceBoxW = 75;
  const balanceBoxH = 20;

  doc.setFillColor(240, 240, 240);
  doc.rect(balanceBoxX, balanceBoxY, balanceBoxW, balanceBoxH, "F");
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(balanceBoxX, balanceBoxY, balanceBoxW, balanceBoxH);

  doc.setFontSize(9);
  doc.setFont("courier", "bold");
  doc.setTextColor(100);
  doc.text("SALDO ACTUAL:", balanceBoxX + 4, balanceBoxY + 6);

  doc.setFontSize(16);
  if (globalBalance > 0)
    doc.setTextColor(200, 0, 0); // Rojo si hay deuda
  else doc.setTextColor(0);

  doc.text(
    formatCurrency(globalBalance),
    balanceBoxX + balanceBoxW - 4,
    balanceBoxY + 14,
    { align: "right" },
  );
  doc.setTextColor(0);

  // -> TABLA
  const tableHeader = ["FECHA", "TIPO", "CONCEPTO", "MONTO", "SALDO"];

  autoTable(doc, {
    startY: startY + 25,
    head: [tableHeader],
    body: displayRows,
    theme: "plain",
    styles: {
      font: "courier",
      fontSize: 9,
      cellPadding: 3,
      lineColor: [0, 0, 0],
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
      0: { cellWidth: 25 }, // Fecha
      1: { cellWidth: 25, fontStyle: "bold" },
      2: { cellWidth: "auto" },
      3: { cellWidth: 35, halign: "right" },
      4: {
        cellWidth: 35,
        halign: "right",
        fontStyle: "bold",
        fillColor: [245, 245, 245],
      },
    },
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("courier", "normal");
    doc.setTextColor(150);
    doc.text(`Página ${i} de ${pageCount}`, 196, 285, { align: "right" });
  }

  const cleanName = supplier.name.replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = `EC_${cleanName}_${dateStr.replace(/\//g, "")}.pdf`;
  const blob = doc.output("blob");

  return {
    blobUrl: URL.createObjectURL(blob),
    fileName,
  };
}

/**
 * MODAL VISOR
 */
function showPdfModal(pdfUrl, fileName) {
  const cssId = "pdf-viewer-styles-tech";
  if (!document.getElementById(cssId)) {
    const style = el("style", {
      id: cssId,
      innerHTML: `
        .pdf-tech-overlay {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(255, 255, 255, 0.95);
          background-image: radial-gradient(#aaa 1px, transparent 1px);
          background-size: 20px 20px;
          display: flex; align-items: center; justify-content: center;
          z-index: 99999;
        }
        .pdf-tech-modal {
          background: #fff; width: 95%; height: 95vh; max-width: 1200px;
          border: 2px solid #000;
          display: flex; flex-direction: column;
          box-shadow: 10px 10px 0px rgba(0,0,0,0.2);
        }
        .pdf-tech-header {
          padding: 15px 20px; border-bottom: 2px solid #000;
          display: flex; justify-content: space-between; align-items: center;
          background: #f8f8f8;
        }
        .pdf-tech-title {
          font-family: monospace; font-weight: 800; font-size: 1.2rem; text-transform: uppercase; letter-spacing: -0.5px;
        }
        .pdf-tech-actions { display: flex; gap: 15px; }
        .btn-tech-dl {
          background: #000; color: #fff; text-decoration: none;
          padding: 10px 20px; font-family: monospace; font-weight: bold; font-size: 0.9rem;
          display: flex; align-items: center; gap: 8px; border: none;
        }
        .btn-tech-dl:hover { background: #333; }
        .btn-tech-close {
          background: transparent; border: 1px solid #000;
          font-size: 1.5rem; cursor: pointer; line-height: 1;
          width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
        }
        .btn-tech-close:hover { background: #000; color: #fff; }
        .pdf-tech-iframe { flex: 1; border: none; background: #525659; }
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
          el("span", { className: "pdf-tech-title" }, "VISTA PREVIA"),
          el("div", { className: "pdf-tech-actions" }, [
            el(
              "a",
              { className: "btn-tech-dl", href: pdfUrl, download: fileName },
              "DESCARGAR",
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
          src: `${pdfUrl}#toolbar=0&navpanes=0&view=FitH`,
        }),
      ]),
    ],
  );

  document.body.appendChild(modal);
}
