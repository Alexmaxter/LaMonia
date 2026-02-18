import { db } from "../../../core/firebase/db.js";
import {
  collection,
  getDocs,
  writeBatch,
  query,
  where,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

// ==========================================
// 1. SINCRONIZADOR MATEMÁTICO (Versión con Alertas)
// ==========================================
export const runMigration = async () => {
  // ALERTA INICIAL: Si no ves esto, el script no se está ejecutando.
  alert(
    "⏳ INICIANDO AUDITORÍA...\nEsto puede tardar unos segundos. Por favor espera el mensaje de finalización.",
  );
  console.clear();
  console.log("🚀 [AUDITORÍA] Iniciando...");

  try {
    const suppliersSnapshot = await getDocs(collection(db, "suppliers"));
    const batch = writeBatch(db);
    let updatesCount = 0;

    // Tipos de transacciones
    const debtTypes = ["invoice", "boleta", "purchase", "compra", "debit"];
    const creditTypes = ["payment", "pago", "credit"];

    console.log(`📋 Procesando ${suppliersSnapshot.size} proveedores...`);

    // Usamos un bucle for...of para asegurar secuencialidad
    for (const supplierDoc of suppliersSnapshot.docs) {
      const supplierId = supplierDoc.id;
      const supplierData = supplierDoc.data();
      const supplierName = supplierData.name || "Sin Nombre";

      // Consultar historial
      const q = query(
        collection(db, "supplier_transactions"),
        where("supplierId", "==", supplierId),
      );
      const transactionsSnap = await getDocs(q);

      let calculatedDebt = 0;
      let calculatedPayments = 0;

      transactionsSnap.docs.forEach((t) => {
        const data = t.data();
        const amount = Number(data.amount) || 0;
        const type = (data.type || "").toLowerCase().trim();

        if (debtTypes.includes(type)) {
          calculatedDebt += amount;
        } else if (creditTypes.includes(type)) {
          calculatedPayments += amount;
        }
      });

      // Cálculo final
      const realBalance =
        Math.round((calculatedDebt - calculatedPayments) * 100) / 100;
      const storedBalance = Number(supplierData.balance) || 0;

      // Detección de error
      if (storedBalance !== realBalance) {
        console.log(
          `🔴 CORRIGIENDO: ${supplierName} | Guardado: $${storedBalance} -> Real: $${realBalance}`,
        );
        batch.update(supplierDoc.ref, {
          balance: realBalance,
          lastUpdated: new Date(), // Usamos new Date() para evitar problemas de importación
        });
        updatesCount++;
      }
    }

    if (updatesCount > 0) {
      await batch.commit();
      console.log("✅ TERMINADO.");
      alert(
        `✅ FINALIZADO.\nSe corrigieron ${updatesCount} proveedores que tenían saldos erróneos.`,
      );
    } else {
      console.log("✅ TERMINADO.");
      alert(
        "✅ FINALIZADO.\nTodos los saldos ya estaban correctos. No se hicieron cambios.",
      );
    }
  } catch (error) {
    console.error("❌ ERROR:", error);
    alert("❌ Ocurrió un error:\n" + error.message);
  }
};

// ==========================================
// 2. REPARADOR MANUAL (fixBalance)
// ==========================================
export const fixBalance = async (supplierId, realBalance) => {
  try {
    const confirmacion = confirm(
      `¿Seguro que quieres forzar el saldo del proveedor a $${realBalance}?`,
    );
    if (!confirmacion) return;

    console.log(`🔧 Reparando proveedor ${supplierId}...`);

    const supplierRef = doc(db, "suppliers", supplierId);
    const supplierSnap = await getDoc(supplierRef);

    if (!supplierSnap.exists()) return alert("Proveedor no encontrado");

    const currentBalance = parseFloat(supplierSnap.data().balance || 0);
    const difference = realBalance - currentBalance;

    if (Math.abs(difference) < 1) return alert("El saldo ya es correcto.");

    const type = difference > 0 ? "invoice" : "payment";

    await addDoc(collection(db, "supplier_transactions"), {
      supplierId: supplierId,
      type: type,
      amount: Math.abs(difference),
      paidAmount: 0,
      description: "🔄 Ajuste Manual de Saldo",
      status: "paid",
      date: new Date(),
      createdAt: new Date(),
    });

    await updateDoc(supplierRef, {
      balance: realBalance,
      lastUpdated: new Date(),
    });

    alert(`✅ LISTO. Saldo actualizado a $${realBalance}. Recarga la página.`);
  } catch (error) {
    console.error(error);
    alert("Error: " + error.message);
  }
};

// Exponer globalmente
window.runMigrationSystem = runMigration;
window.fixBalance = fixBalance;
