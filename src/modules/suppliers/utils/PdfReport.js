import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { el } from "../../../core/dom.js";

// --- CONFIGURACIÓN DE TEMA (High Contrast Light) ---
const THEME = {
  primary: [37, 99, 235], // #2563eb (Azul fuerte)
  secondary: [249, 250, 251], // #f9fafb (Gris muy claro)
  textMain: [17, 24, 39], // #111827 (Negro/Gris oscuro)
  textMuted: [107, 114, 128], // #6b7280 (Gris medio)
  danger: [220, 38, 38], // #dc2626 (Rojo)
  success: [5, 150, 105], // #059669 (Verde)
  white: [255, 255, 255],
  border: [229, 231, 235], // #e5e7eb
};

export const PdfReport = {
  generateSupplierReport: (supplier, movements) => {
    // 1. Generar el Blob del PDF
    const { blobUrl, fileName } = generatePdf(supplier, movements);

    // 2. Mostrar el Visor (Modal)
    showPdfModal(blobUrl, fileName);
  },
};

/**
 * Lógica de Generación del Documento PDF
 */
function generatePdf(supplier, movements) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const dateStr = new Date().toLocaleDateString("es-AR");
  const isStockType = supplier.type === "stock";
  const fileName = `Reporte_${supplier.name.replace(
    /\s+/g,
    "_"
  )}_${dateStr.replace(/\//g, "-")}.pdf`;

  // --- 1. PROCESAMIENTO DE DATOS ---
  // Calculamos el historial de stock si es necesario y preparamos los datos
  const runningStock = {};
  // Asumimos que movements viene ordenado por fecha descendente (más nuevo primero)
  // Invertimos para calcular acumulados cronológicamente
  const chronological = [...movements].reverse();

  const movementsWithCalculations = chronological.map((m) => {
    const isEntry = m.type === "invoice";
    const stockChanges = [];

    if (isStockType && m.items && Array.isArray(m.items)) {
      m.items.forEach((item) => {
        const name = item.name || item.description || "Item";
        const qty = parseFloat(item.quantity || item.qty || 0);
        if (!runningStock[name]) runningStock[name] = 0;
        runningStock[name] += isEntry ? qty : -qty;
        stockChanges.push({
          name,
          change: isEntry ? qty : -qty,
          balanceAfter: runningStock[name],
        });
      });
    }
    return { ...m, stockChanges };
  });

  // Revertimos para mostrar primero lo más nuevo en el reporte
  const reportData = movementsWithCalculations.reverse();

  // Obtener Saldo Actual (Del movimiento más reciente)
  let currentBalance = 0;
  if (!isStockType && reportData.length > 0) {
    // Asumiendo que runningBalance ya viene calculado en el objeto movement
    currentBalance = reportData[0].runningBalance || 0;
  }

  // --- 2. ENCABEZADO Y DISEÑO ---

  // Barra superior de color
  doc.setFillColor(...THEME.primary);
  doc.rect(0, 0, pageWidth, 6, "F");

  // Título Principal
  doc.setFontSize(22);
  doc.setTextColor(...THEME.textMain);
  doc.setFont(undefined, "bold");
  doc.text("Estado de Cuenta", 14, 25);

  // Fecha de generación
  doc.setFontSize(10);
  doc.setTextColor(...THEME.textMuted);
  doc.setFont(undefined, "normal");
  doc.text(`Generado el: ${dateStr}`, 14, 32);

  // Línea separadora sutil
  doc.setDrawColor(...THEME.border);
  doc.setLineWidth(0.5);
  doc.line(14, 38, pageWidth - 14, 38);

  // Datos del Proveedor
  doc.setFontSize(10);
  doc.setTextColor(...THEME.textMuted);
  doc.text("PROVEEDOR:", 14, 48);

  doc.setFontSize(14);
  doc.setTextColor(...THEME.textMain);
  doc.setFont(undefined, "bold");
  doc.text(supplier.name.toUpperCase(), 14, 55);

  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.setTextColor(...THEME.textMain);
  const aliasText = supplier.alias || "No especificado";
  doc.text(`CBU/Alias: ${aliasText}`, 14, 62);

  // --- 3. CAJA DE SALDO ACTUAL (Solo Financiero) ---
  if (!isStockType) {
    const boxWidth = 70;
    const boxHeight = 24;
    const boxX = pageWidth - 14 - boxWidth;
    const boxY = 44;

    // Fondo caja
    doc.setFillColor(...THEME.secondary);
    doc.setDrawColor(...THEME.primary);
    doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3, "FD");

    // Título caja
    doc.setFontSize(9);
    doc.setTextColor(...THEME.primary);
    doc.setFont(undefined, "bold");
    doc.text("SALDO ACTUAL", boxX + 5, boxY + 8);

    // Valor saldo
    doc.setFontSize(16);
    if (currentBalance < 0) doc.setTextColor(...THEME.danger);
    else doc.setTextColor(...THEME.textMain);

    const balanceStr = currentBalance.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
    });
    // Alinear a la derecha dentro de la caja
    doc.text(balanceStr, boxX + boxWidth - 5, boxY + 18, { align: "right" });
  }

  // --- 4. TABLA DE MOVIMIENTOS ---
  const tableColumn = isStockType
    ? ["Fecha", "Detalle / Concepto", "Tipo", "Saldo Stock"]
    : ["Fecha", "Detalle / Concepto", "Tipo", "Monto", "Saldo"];

  const tableRows = reportData.map((m) => {
    const dateObj = m.date?.toDate ? m.date.toDate() : new Date(m.date);
    const displayDate = isNaN(dateObj)
      ? "S/D"
      : dateObj.toLocaleDateString("es-AR");

    let detailLines = [];
    let stockBalances = [];

    if (m.concept) detailLines.push(m.concept);

    if (isStockType && m.stockChanges.length > 0) {
      m.stockChanges.forEach((sc) => {
        detailLines.push(`${sc.name}: ${sc.change > 0 ? "+" : ""}${sc.change}`);
        stockBalances.push(`${sc.name}: ${sc.balanceAfter}`);
      });
    }

    const typeLabel = m.type === "invoice" ? "BOLETA" : "PAGO";

    if (isStockType) {
      return [
        displayDate,
        detailLines.join("\n"),
        typeLabel,
        stockBalances.join("\n"),
      ];
    } else {
      return [
        displayDate,
        detailLines.join("\n"),
        typeLabel,
        m.amount.toLocaleString("es-AR", {
          style: "currency",
          currency: "ARS",
        }),
        m.runningBalance.toLocaleString("es-AR", {
          style: "currency",
          currency: "ARS",
        }),
      ];
    }
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 80,
    theme: "grid",
    headStyles: {
      fillColor: THEME.primary, // Azul cabecera
      textColor: THEME.white,
      fontSize: 9,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 8,
      cellPadding: 4,
      overflow: "linebreak",
      textColor: THEME.textMain,
      lineColor: THEME.border,
      lineWidth: 0.1,
    },
    alternateRowStyles: {
      fillColor: THEME.secondary, // Filas alternas gris muy claro
    },
    didParseCell: (data) => {
      // Colorear montos y tipos para mejor lectura
      if (!isStockType && data.section === "body") {
        if (data.column.index === 2) {
          // Columna Tipo
          const type = data.row.raw[2];
          data.cell.styles.textColor =
            type === "BOLETA" ? THEME.danger : THEME.success;
          data.cell.styles.fontStyle = "bold";
        }
        if (data.column.index === 3) {
          // Columna Monto
          // Parsear string currency a número para saber color
          const amountStr = data.cell.raw;
          // Esto es un string formateado, confiamos en la lógica de origen o visual
          // Para simplificar, usaremos el mismo color que el tipo
          const type = data.row.raw[2];
          data.cell.styles.textColor =
            type === "BOLETA" ? THEME.danger : THEME.success;
        }
      }
    },
    margin: { top: 80, right: 14, left: 14 },
  });

  // Numeración de páginas
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...THEME.textMuted);
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: "center" }
    );
  }

  const blob = doc.output("blob");
  return {
    blobUrl: URL.createObjectURL(blob),
    fileName,
  };
}

/**
 * Lógica del Modal (Visor)
 */
function showPdfModal(pdfUrl, fileName) {
  // Limpiar PDF para quitar barras de herramientas nativas del navegador
  const cleanPdfUrl = `${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`;

  // Estilos High Contrast Light para el Modal
  const cssId = "pdf-viewer-styles";
  if (!document.getElementById(cssId)) {
    const style = el("style", {
      id: cssId,
      innerHTML: `
        .pdf-viewer-overlay {
          position: fixed;
          top: 0; 
          left: 0; 
          width: 100%; 
          height: 100%; 
          background: rgba(0, 0, 0, 0.5); /* Overlay oscuro estándar */
          backdrop-filter: blur(4px);
          display: flex; 
          align-items: center; 
          justify-content: center; 
          z-index: 99999; 
          animation: pdfFadeIn 0.3s ease;
        }
        
        .pdf-viewer-modal {
          background: #ffffff; /* Fondo blanco */
          width: 95%; 
          height: 92vh; 
          max-width: 1100px; 
          border-radius: 16px; 
          display: flex; 
          flex-direction: column; 
          overflow: hidden; 
          border: 1px solid #e5e7eb; 
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        .pdf-viewer-header {
          padding: 16px 24px;
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          background: #ffffff;
          border-bottom: 1px solid #e5e7eb;
        }

        .pdf-viewer-title-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .pdf-viewer-label {
          color: #2563eb; /* Azul primario */
          font-size: 11px;
          font-weight: 800;
          margin: 0;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .pdf-viewer-filename {
          color: #111827; /* Texto oscuro */
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .pdf-viewer-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .pdf-viewer-btn-dl {
          background: #2563eb;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          font-size: 14px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pdf-viewer-btn-dl:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
          box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
        }

        .pdf-viewer-btn-close {
          background: transparent;
          border: none;
          color: #6b7280; /* Gris medio */
          font-size: 28px;
          cursor: pointer;
          line-height: 1;
          transition: color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
        }

        .pdf-viewer-btn-close:hover {
          color: #111827;
          background: #f3f4f6;
        }

        .pdf-viewer-iframe {
          flex: 1; 
          border: none; 
          background: #f9fafb; /* Fondo gris claro detrás del PDF */
        }

        @keyframes pdfFadeIn { 
          from { opacity: 0; transform: scale(0.98); } 
          to { opacity: 1; transform: scale(1); } 
        }
      `,
    });
    document.head.appendChild(style);
  }

  const closeModal = () => {
    // Revocar URL para liberar memoria
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
    modalContainer.remove();
    // Opcional: No removemos el style tag para reutilizarlo
  };

  const modalContainer = el(
    "div",
    {
      className: "pdf-viewer-overlay",
      onclick: (e) =>
        e.target.className === "pdf-viewer-overlay" && closeModal(),
    },
    [
      el("div", { className: "pdf-viewer-modal" }, [
        // Header
        el("div", { className: "pdf-viewer-header" }, [
          el("div", { className: "pdf-viewer-title-group" }, [
            el("p", { className: "pdf-viewer-label" }, "Vista previa"),
            el("h3", { className: "pdf-viewer-filename" }, fileName),
          ]),
          el("div", { className: "pdf-viewer-actions" }, [
            el(
              "a",
              {
                className: "pdf-viewer-btn-dl",
                href: pdfUrl,
                download: fileName,
              },
              "Descargar PDF"
            ),
            el("button", {
              className: "pdf-viewer-btn-close",
              onclick: closeModal,
              innerHTML: "&times;",
              title: "Cerrar",
            }),
          ]),
        ]),
        // Body (Iframe)
        el("iframe", {
          className: "pdf-viewer-iframe",
          src: cleanPdfUrl,
        }),
      ]),
    ]
  );

  document.body.appendChild(modalContainer);
}
