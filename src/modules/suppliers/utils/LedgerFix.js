import { db } from "../../../core/firebase/db.js";
import {
  collection,
  getDocs,
  writeBatch,
  query,
  where,
  orderBy,
} from "firebase/firestore";

export const sealLedgerHistory = async () => {
  console.clear();
  const confirmation = confirm(
    "⚠️ ESTO RE-ESCRIBIRÁ EL HISTORIAL DE SALDOS EN FIREBASE.\n\n" +
      "Se calculará cronológicamente cuánto se debía en cada momento y se guardará ese número en cada movimiento.\n\n" +
      "¿Continuar?",
  );

  if (!confirmation) return;

  console.log("🚀 [LEDGER] Iniciando sellado de historial...");

  try {
    const suppliersSnapshot = await getDocs(collection(db, "suppliers"));

    // Tipos de transacciones
    const debtTypes = ["invoice", "boleta", "purchase", "compra", "debit"];
    const creditTypes = ["payment", "pago", "credit"];

    let totalUpdates = 0;

    for (const supplierDoc of suppliersSnapshot.docs) {
      const supplierId = supplierDoc.id;
      const supplierName = supplierDoc.data().name || "Sin Nombre";

      console.log(`📂 Procesando: ${supplierName}...`);

      // 1. Traer TODO el historial del proveedor
      const q = query(
        collection(db, "supplier_transactions"),
        where("supplierId", "==", supplierId),
      );

      const txSnap = await getDocs(q);
      const transactions = txSnap.docs.map((doc) => ({
        id: doc.id,
        ref: doc.ref,
        ...doc.data(),
        // Normalizar fecha para ordenar
        dateObj: doc.data().date?.seconds
          ? new Date(doc.data().date.seconds * 1000)
          : new Date(doc.data().date || 0),
      }));

      // 2. ORDENAR CRONOLÓGICAMENTE (Del pasado al futuro)
      transactions.sort((a, b) => a.dateObj - b.dateObj);

      // 3. CALCULAR Y SELLAR
      let runningBalance = 0;
      const batch = writeBatch(db);
      let batchCount = 0;

      for (const tx of transactions) {
        const amount = Number(tx.amount) || 0;
        const type = (tx.type || "").toLowerCase();

        // Aplicar matemática
        if (debtTypes.includes(type)) {
          runningBalance += amount;
        } else if (creditTypes.includes(type)) {
          runningBalance -= amount;
        }

        // Redondeo
        runningBalance = Math.round(runningBalance * 100) / 100;

        // Escribir el saldo histórico en el documento
        // Guardamos 'savedBalance' que es el saldo EXACTO que había tras esa operación
        batch.update(tx.ref, {
          savedBalance: runningBalance,
        });

        batchCount++;
        totalUpdates++;

        // Firebase permite lotes de hasta 500
        if (batchCount >= 450) {
          await batch.commit();
          batchCount = 0;
        }
      }

      // Commit final del lote restante
      if (batchCount > 0) await batch.commit();

      // 4. Actualizar el saldo final del proveedor para que coincida con el último movimiento
      await writeBatch(db)
        .update(supplierDoc.ref, {
          balance: runningBalance,
          lastLedgerUpdate: new Date(),
        })
        .commit();

      console.log(
        `   ✅ ${supplierName}: Saldo final sellado en $${runningBalance}`,
      );
    }

    alert(
      `PROCESO TERMINADO.\nSe actualizaron ${totalUpdates} movimientos con su saldo histórico real.`,
    );
  } catch (error) {
    console.error("Error:", error);
    alert("Hubo un error: " + error.message);
  }
};

window.sealLedgerHistory = sealLedgerHistory;
