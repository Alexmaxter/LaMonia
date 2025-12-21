import jsPDF from "https://esm.sh/jspdf";
import autoTable from "https://esm.sh/jspdf-autotable";

export const PDFService = {
  generateAccountStatement(supplier, transactions, dateFrom, dateTo) {
    const doc = new jsPDF();
    const isStock = supplier.providerType === "stock";
    const today = new Date().toLocaleDateString("es-AR");

    // Helper para fechas seguras
    const parseDate = (d) => {
      if (!d) return new Date();
      if (d.seconds) return new Date(d.seconds * 1000);
      return new Date(d);
    };

    // Convertir fechas de filtro
    const from = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
    const to = dateTo ? new Date(dateTo + "T23:59:59") : null;

    // 1. ORDENAR CRONOLÓGICAMENTE (Viejo -> Nuevo)
    const allSorted = [...transactions].sort((a, b) => {
      return parseDate(a.date).getTime() - parseDate(b.date).getTime();
    });

    // 2. CALCULAR EL "SALDO INICIAL REAL"
    // Para garantizar consistencia, el saldo inicial no es 0, es:
    // (Saldo Actual Real) - (Suma de todas las transacciones históricas)
    // Esto corrige automáticamente cualquier desfase, saldo migrado o error histórico.
    let startBalance = 0;

    if (!isStock) {
      const currentRealBalance = parseFloat(supplier.balance || 0);

      const totalHistorySum = allSorted.reduce((sum, t) => {
        const amount = parseFloat(t.amount || 0);
        return t.type === "invoice" ? sum + amount : sum - amount;
      }, 0);

      // Si la historia suma 90 pero el saldo es 100, empezamos en 10.
      startBalance = currentRealBalance - totalHistorySum;

      // Ajuste de precisión por decimales flotantes
      startBalance = Math.round(startBalance * 100) / 100;
    }

    // 3. SEPARAR MOVIMIENTOS Y EVOLUCIONAR EL SALDO
    let runningBalance = startBalance;
    let balanceAtStartOfRange = startBalance; // Saldo justo antes de la fecha 'from'
    const transactionsInRange = [];

    allSorted.forEach((t) => {
      const tDate = parseDate(t.date);

      // Calcular impacto
      let impact = 0;
      if (!isStock) {
        const amount = parseFloat(t.amount || 0);
        impact = t.type === "invoice" ? amount : -amount;
      }

      // Lógica de corte
      if (from && tDate < from) {
        // Fuera de rango (pasado): solo acumulamos al saldo previo
        balanceAtStartOfRange += impact;
      } else if (!to || tDate <= to) {
        // Dentro del rango: lo guardamos
        transactionsInRange.push(t);
      }

      // Siempre actualizamos el runningBalance global para validación (opcional)
      runningBalance += impact;
    });

    // --- ENCABEZADO ---
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(supplier.name.toUpperCase(), 14, 15);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);

    let rangeText = `Historial completo al ${today}`;
    if (from && to) {
      rangeText = `Período: ${from.toLocaleDateString(
        "es-AR"
      )} al ${to.toLocaleDateString("es-AR")}`;
    }
    doc.text(rangeText, 14, 20);

    // Saldo Actual (Debe coincidir con el final de la tabla)
    if (!isStock) {
      doc.setFontSize(12);
      doc.setTextColor(0);
      const saldoFinal = new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
      }).format(supplier.balance || 0);
      doc.text(`SALDO ACTUAL: ${saldoFinal}`, 196, 15, { align: "right" });
    }

    // --- CUERPO DE LA TABLA ---

    // Inicializamos el contador visual con el saldo acumulado antes del rango
    let visualRunningBalance = balanceAtStartOfRange;
    const tableBody = [];

    // Fila 1: Saldo Anterior (si hay filtro o si hay un arrastre inicial significativo)
    // Mostramos fila inicial si: Hay filtro de fecha, O si hay un "Saldo Inicial" (drift) sin transacciones previas.
    const showInitialRow = !isStock && (from || Math.abs(startBalance) > 1);

    if (showInitialRow) {
      tableBody.push([
        from ? from.toLocaleDateString("es-AR") : "-", // Fecha
        "SALDO ANTERIOR / INICIAL", // Detalle
        "", // Monto (vacío)
        new Intl.NumberFormat("es-AR", {
          // Saldo
          style: "currency",
          currency: "ARS",
        }).format(visualRunningBalance),
      ]);
    }

    transactionsInRange.forEach((t) => {
      const dateObj = parseDate(t.date);
      const fecha = dateObj.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      });

      let desc = t.description || "";
      let monto = "";
      let saldoStr = "";

      if (!desc) {
        if (t.type === "invoice") desc = "Boleta / Compra";
        else if (t.type === "payment") desc = "Pago";
        else desc = "Nota de Crédito";
      }

      if (isStock) {
        const itemsStr = (t.items || [])
          .map((i) => `${i.quantity} ${i.name}`)
          .join(", ");
        monto = t.type === "invoice" ? `+ ${itemsStr}` : `- ${itemsStr}`;
        saldoStr = "-";
      } else {
        const val = parseFloat(t.amount || 0);

        // Actualizamos el saldo visual
        if (t.type === "invoice") {
          visualRunningBalance += val;
          monto = new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: "ARS",
          }).format(val);
        } else {
          visualRunningBalance -= val;
          monto =
            "- " +
            new Intl.NumberFormat("es-AR", {
              style: "currency",
              currency: "ARS",
            }).format(val);
        }

        saldoStr = new Intl.NumberFormat("es-AR", {
          style: "currency",
          currency: "ARS",
        }).format(visualRunningBalance);
      }

      tableBody.push([fecha, desc, monto, saldoStr]);
    });

    // --- GENERACIÓN AUTO TABLE ---
    autoTable(doc, {
      startY: 25,
      head: [["FECHA", "DETALLE", "MONTO", "SALDO"]],
      body: tableBody,
      theme: "grid",
      styles: {
        fontSize: 9,
        cellPadding: 2,
        valign: "middle",
        lineWidth: 0.1,
        lineColor: [200, 200, 200],
      },
      headStyles: {
        fillColor: [50, 50, 50],
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: "auto" },
        2: { halign: "right", fontStyle: "bold", cellWidth: 35 },
        3: { halign: "right", cellWidth: 35 },
      },
      didParseCell: function (data) {
        if (data.section === "body") {
          let dataIndex = data.row.index;

          // Si agregamos la fila manual de saldo anterior, la fila 0 tiene estilo especial
          if (showInitialRow) {
            if (dataIndex === 0) {
              data.cell.styles.fontStyle = "bold";
              data.cell.styles.fillColor = [240, 240, 240];
              return;
            }
            // Ajustamos el índice para buscar en el array de transacciones
            dataIndex = dataIndex - 1;
          }

          const originalTrans = transactionsInRange[dataIndex];
          if (!originalTrans) return;

          // Colores de fila
          if (originalTrans.type === "invoice") {
            data.cell.styles.fillColor = [255, 245, 245]; // Rojo suave
          } else if (originalTrans.type === "payment") {
            data.cell.styles.fillColor = [240, 253, 244]; // Verde suave
          } else if (originalTrans.type === "credit_note") {
            data.cell.styles.fillColor = [240, 255, 230]; // Lima suave
          }

          // Colores de texto (Columna Monto)
          if (data.column.index === 2) {
            if (originalTrans.type === "invoice") {
              data.cell.styles.textColor = [220, 38, 38];
            } else {
              data.cell.styles.textColor = [22, 163, 74];
            }
          }
        }
      },
    });

    // --- PIE DE PÁGINA STOCK ---
    if (isStock) {
      const finalY = doc.lastAutoTable.finalY + 8;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("STOCK PENDIENTE:", 14, finalY);

      const debts = supplier.stockDebt || {};
      const itemsPending = Object.keys(debts)
        .filter((k) => debts[k] > 0)
        .map((k) => `${debts[k]}x ${k}`)
        .join("  |  ");
      doc.setFont("helvetica", "normal");
      doc.text(itemsPending || "Sin deuda", 14, finalY + 5);
    }

    const pdfBlob = doc.output("bloburl");
    window.open(pdfBlob, "_blank");
  },
};
