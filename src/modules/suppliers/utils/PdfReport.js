import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { el } from "../../../core/dom.js";

export const PdfReport = {
  generateSupplierReport: (supplier, movements) => {
    const { blobUrl, fileName } = generatePdf(supplier, movements);
    showPdfModal(blobUrl, fileName);
  },
};

/**
 * GENERADOR DE PDF - ESTILO PROFESIONAL BRUTALISTA
 * Detecta automáticamente si es Stock o Financiero.
 */
function generatePdf(supplier, movements) {
  const doc = new jsPDF();
  const isStock = supplier.type === "stock";

  // --- 1. CONFIGURACIÓN ---
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 14;

  // Helpers de Formato
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat("es-AR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateInput) => {
    if (!dateInput) return "-";
    const date = dateInput.seconds
      ? new Date(dateInput.seconds * 1000)
      : new Date(dateInput);

    // Forzar zona horaria local simple
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
  };

  // --- 2. ORDENAMIENTO CRONOLÓGICO (CLAVE PARA EL SALDO) ---
  // Ordenamos del más antiguo al más nuevo para calcular la progresión
  const sortedMovements = [...movements].sort((a, b) => {
    const dateA = a.date?.seconds
      ? new Date(a.date.seconds * 1000)
      : new Date(a.date);
    const dateB = b.date?.seconds
      ? new Date(b.date.seconds * 1000)
      : new Date(b.date);
    return dateA - dateB;
  });

  // --- 3. PROCESAMIENTO DE DATOS ---
  let runningBalance = 0;

  const tableBody = sortedMovements.map((m) => {
    const type = (m.type || "").toLowerCase();
    const amount = parseFloat(m.amount) || 0;

    // Clasificación
    const isDebtType = [
      "invoice",
      "boleta",
      "purchase",
      "compra",
      "debit",
    ].includes(type);

    // Variables para las columnas
    let colIn = ""; // Debe / Entrada
    let colOut = ""; // Haber / Salida
    let desc = m.description || m.concept || "-";

    // --- LÓGICA DUAL: STOCK vs DINERO ---
    if (isStock) {
      // MODO STOCK: Calculamos unidades
      let qty = 0;
      if (m.items && Array.isArray(m.items)) {
        // Sumar cantidad de items
        qty = m.items.reduce(
          (acc, i) => acc + (parseFloat(i.quantity) || 0),
          0,
        );
        // Mejorar descripción con detalle de items
        const itemsText = m.items
          .map((i) => `${i.quantity} ${i.name}`)
          .join(", ");
        desc =
          itemsText.length > 60
            ? itemsText.substring(0, 60) + "..."
            : itemsText;
      } else {
        // Fallback si no hay items pero es stock (usar amount como cantidad)
        qty = amount;
      }

      if (isDebtType) {
        // Entrada de Stock (Compra)
        runningBalance += qty;
        colIn = formatNumber(qty);
      } else {
        // Salida de Stock (Venta/Pago)
        runningBalance -= qty;
        colOut = formatNumber(qty);
      }
    } else {
      // MODO MONETARIO: Calculamos dinero
      if (isDebtType) {
        // Deuda (Compra)
        runningBalance += amount;
        colIn = formatCurrency(amount);
      } else {
        // Pago
        runningBalance -= amount;
        colOut = formatCurrency(amount);
      }
    }

    // Fila resultante
    return {
      date: formatDate(m.date),
      type: translateType(type),
      desc: desc,
      colIn: colIn,
      colOut: colOut,
      balance: isStock
        ? formatNumber(runningBalance)
        : formatCurrency(runningBalance),
    };
  });

  // Definición de Columnas Dinámica
  const columns = [
    { header: "FECHA", dataKey: "date" },
    { header: "TIPO", dataKey: "type" },
    { header: isStock ? "DETALLE ITEMS" : "DESCRIPCIÓN", dataKey: "desc" },
    { header: isStock ? "ENTRADA" : "DEBE", dataKey: "colIn", halign: "right" },
    {
      header: isStock ? "SALIDA" : "HABER",
      dataKey: "colOut",
      halign: "right",
    },
    {
      header: isStock ? "STOCK" : "SALDO",
      dataKey: "balance",
      halign: "right",
    },
  ];

  // --- 4. DISEÑO DEL HEADER (Brutalista Limpio) ---

  // Título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(isStock ? "REPORTE DE STOCK" : "ESTADO DE CUENTA", margin, 22);

  // Línea separadora gruesa
  doc.setLineWidth(0.7);
  doc.line(margin, 28, pageWidth - margin, 28);

  // Datos Proveedor
  doc.setFontSize(10);
  doc.text("PROVEEDOR:", margin, 38);
  doc.setFont("helvetica", "normal");
  doc.text(supplier.name.toUpperCase(), margin + 30, 38);

  // Datos Fecha
  const today = new Date().toLocaleDateString("es-AR");
  doc.setFont("helvetica", "bold");
  doc.text("FECHA:", pageWidth - margin - 40, 38);
  doc.setFont("helvetica", "normal");
  doc.text(today, pageWidth - margin - 22, 38);

  // Resumen Saldo Final
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  const labelSaldo = isStock ? "STOCK ACTUAL:" : "SALDO PENDIENTE:";
  const valueSaldo = isStock
    ? formatNumber(runningBalance)
    : formatCurrency(runningBalance);

  // Caja de saldo (Estilo "Sello")
  doc.setLineWidth(0.1);
  doc.rect(margin, 45, pageWidth - margin * 2, 12); // Caja contenedora

  doc.text(labelSaldo, margin + 5, 52);
  doc.setFont("helvetica", "normal");
  doc.text(valueSaldo, margin + 45, 52);

  // --- 5. TABLA AUTO-GENERADA (Sin relleno, estilo profesional) ---
  autoTable(doc, {
    startY: 65,
    columns: columns,
    body: tableBody,
    theme: "plain", // CLAVE: 'plain' quita los colores de fondo por defecto
    styles: {
      fontSize: 8,
      font: "helvetica",
      textColor: [0, 0, 0], // Negro puro
      lineColor: [0, 0, 0], // Líneas negras
      lineWidth: 0.1, // Líneas finas
      cellPadding: 3,
    },
    headStyles: {
      fillColor: false, // Sin fondo de color
      textColor: [0, 0, 0], // Texto negro
      fontStyle: "bold",
      lineWidth: { top: 0.5, bottom: 0.5 }, // Líneas superior e inferior más gruesas para el header
    },
    columnStyles: {
      colIn: { fontStyle: "normal" },
      colOut: { fontStyle: "normal" },
      balance: { fontStyle: "bold" }, // Saldo en negrita para destacar progresión
    },
    // Pie de página numérico
    didDrawPage: function (data) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const pageStr = "Pág " + doc.internal.getNumberOfPages();
      doc.text(pageStr, pageWidth - margin - 10, pageHeight - 10);
    },
  });

  // --- 6. GENERAR Y RETORNAR ---
  const blob = doc.output("blob");
  const blobUrl = URL.createObjectURL(blob);
  const cleanName = (supplier.name || "prov")
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase();

  return {
    blobUrl,
    fileName: `reporte_${isStock ? "stock" : "cuenta"}_${cleanName}_${today.replace(/\//g, "-")}.pdf`,
  };
}

// --- HELPERS AUXILIARES ---

function translateType(type) {
  const map = {
    invoice: "FACTURA",
    boleta: "BOLETA",
    purchase: "COMPRA",
    payment: "PAGO",
    credit: "NOTA CRÉD.",
    note: "NOTA",
    debit: "NOTA DÉB.",
  };
  return map[type] || type.toUpperCase().substring(0, 10);
}

// --- MODAL DE VISTA PREVIA (Mismo estilo oscuro Tech que tenías) ---
function showPdfModal(pdfUrl, fileName) {
  const existing = document.querySelector(".pdf-tech-overlay");
  if (existing) existing.remove();

  if (!document.getElementById("pdf-tech-styles")) {
    const style = document.createElement("style");
    style.id = "pdf-tech-styles";
    style.innerHTML = `
      .pdf-tech-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.85); z-index: 9999;
        display: flex; align-items: center; justify-content: center;
        backdrop-filter: blur(5px);
      }
      .pdf-tech-modal {
        width: 90%; height: 90%; background: #222;
        border: 1px solid #444; display: flex; flex-direction: column;
        box-shadow: 0 20px 50px rgba(0,0,0,0.5);
      }
      .pdf-tech-header {
        padding: 15px 20px; background: #000; display: flex;
        justify-content: space-between; align-items: center;
        border-bottom: 1px solid #333;
      }
      .pdf-tech-title {
        color: #fff; font-family: monospace; font-size: 1.2rem; font-weight: bold; letter-spacing: 1px;
      }
      .pdf-tech-actions { display: flex; gap: 10px; }
      .btn-tech-dl {
        background: #fff; color: #000; padding: 8px 16px;
        text-decoration: none; font-weight: bold; font-family: monospace; font-size: 0.9rem;
        display: flex; align-items: center; border: 1px solid #fff;
      }
      .btn-tech-dl:hover { background: #000; color: #fff; }
      .btn-tech-close {
        background: transparent; color: #fff; border: 1px solid #fff;
        width: 32px; height: 32px; cursor: pointer;
        display: flex; align-items: center; justify-content: center; font-size: 1.2rem;
      }
      .btn-tech-close:hover { background: #fff; color: #000; }
      .pdf-tech-iframe { flex: 1; border: none; background: #525659; }
    `;
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
          el("span", { className: "pdf-tech-title" }, fileName),
          el("div", { className: "pdf-tech-actions" }, [
            el(
              "a",
              { className: "btn-tech-dl", href: pdfUrl, download: fileName },
              "DESCARGAR",
            ),
            el(
              "button",
              { className: "btn-tech-close", onclick: closeModal },
              "✕",
            ),
          ]),
        ]),
        el("iframe", { className: "pdf-tech-iframe", src: pdfUrl }),
      ]),
    ],
  );

  document.body.appendChild(modal);
}
