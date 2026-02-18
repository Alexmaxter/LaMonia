import { db } from "../../../core/firebase/db.js";
import { collection, getDocs, query, where } from "firebase/firestore";

export const generateAuditReport = async () => {
  // Verificamos que jsPDF esté cargado (usualmente en index.html)
  const { jsPDF } = window.jspdf;
  if (!jsPDF) {
    alert("Error: Librería jsPDF no encontrada.");
    return;
  }

  const doc = new jsPDF();
  let y = 15; // Cursor vertical

  // Configuración de página
  const lineHeight = 7;
  const pageHeight = doc.internal.pageSize.height;

  const checkPageBreak = () => {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 15;
    }
  };

  const addHeader = (text) => {
    checkPageBreak();
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(220, 220, 220); // Gris claro
    doc.rect(10, y - 5, 190, 8, "F");
    doc.text(text, 12, y);
    y += lineHeight + 2;
  };

  const addRow = (date, type, amount, balance) => {
    checkPageBreak();
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");

    // Formato Fecha
    const dateStr = date instanceof Date ? date.toLocaleDateString() : "-";

    // Formato Montos
    const amountStr = `$${amount.toLocaleString()}`;
    const balanceStr = `$${balance.toLocaleString()}`;

    doc.text(dateStr, 12, y);
    doc.text(type.toUpperCase().substring(0, 10), 40, y);
    doc.text(amountStr, 100, y, { align: "right" });
    doc.text(balanceStr, 150, y, { align: "right" }); // Columna de Saldo Acumulado

    y += lineHeight;
  };

  try {
    console.log("🚀 Generando Auditoría Completa...");
    alert("Generando PDF de Auditoría... esto puede tardar unos segundos.");

    // 1. Traer Proveedores
    const suppliersSnap = await getDocs(collection(db, "suppliers"));
    const suppliers = suppliersSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    doc.setFontSize(16);
    doc.text("Reporte de Auditoría - Historial Completo", 10, y);
    y += 10;
    doc.setFontSize(10);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 10, y);
    y += 15;

    // 2. Procesar cada proveedor
    for (const supplier of suppliers) {
      // Cabecera del Proveedor
      addHeader(
        `PROVEEDOR: ${supplier.name || "Sin Nombre"} (Saldo Actual DB: $${supplier.balance || 0})`,
      );

      // Columnas
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("FECHA", 12, y);
      doc.text("TIPO", 40, y);
      doc.text("MONTO", 100, y, { align: "right" });
      doc.text("SALDO ACUM.", 150, y, { align: "right" });
      y += 5;
      doc.line(10, y - 2, 200, y - 2); // Línea separadora

      // 3. Traer movimientos
      const q = query(
        collection(db, "supplier_transactions"),
        where("supplierId", "==", supplier.id),
      );
      const txSnap = await getDocs(q);

      const movements = txSnap.docs.map((d) => {
        const data = d.data();
        let dateObj = new Date();
        if (data.date && data.date.seconds)
          dateObj = new Date(data.date.seconds * 1000);
        else if (data.date) dateObj = new Date(data.date);

        return {
          ...data,
          dateObj: dateObj,
        };
      });

      // 4. ORDENAR CRONOLÓGICAMENTE (Del más viejo al más nuevo) -> CLAVE
      movements.sort((a, b) => a.dateObj - b.dateObj);

      // 5. CALCULAR SALDO DESDE CERO
      let runningBalance = 0;

      if (movements.length === 0) {
        checkPageBreak();
        doc.text("Sin movimientos registrados.", 12, y);
        y += lineHeight;
      }

      movements.forEach((m) => {
        const amount = parseFloat(m.amount) || 0;
        const type = (m.type || "").toLowerCase();

        // Lógica Matemática
        let impact = 0;
        if (
          ["invoice", "boleta", "purchase", "compra", "debit"].includes(type)
        ) {
          impact = amount; // Suma Deuda
        } else {
          impact = -amount; // Resta Deuda (Pago)
        }

        runningBalance += impact;
        runningBalance = Math.round(runningBalance * 100) / 100; // Evitar decimales locos

        // Agregar fila al PDF
        addRow(m.dateObj, type, amount, runningBalance);
      });

      // Pie de sección del proveedor
      y += 2;
      doc.line(10, y, 200, y);
      y += 5;

      // Comparación Final
      checkPageBreak();
      doc.setFont("helvetica", "bold");
      const diff = (supplier.balance || 0) - runningBalance;

      let statusText = "✅ CORRECTO";
      if (Math.abs(diff) > 1)
        statusText = `❌ DESCUADRE DE $${diff.toLocaleString()}`;

      doc.text(
        `Saldo Calculado: $${runningBalance.toLocaleString()} | Saldo en Tarjeta: $${(supplier.balance || 0).toLocaleString()} | ${statusText}`,
        12,
        y,
      );
      y += 15;
    }

    // 6. Descargar
    doc.save("LaMonia_Auditoria_Completa.pdf");
    console.log("✅ PDF Generado.");
  } catch (e) {
    console.error(e);
    alert("Error generando reporte: " + e.message);
  }
};

// Exponer globalmente
window.generateAuditReport = generateAuditReport;
