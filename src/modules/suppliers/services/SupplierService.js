import { db } from "../../../core/firebase/db.js";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";

import {
  TRANSACTION_GROUPS,
  TRANSACTION_STATUS,
} from "../../../shared/constants/index.js";

const COLLECTION_NAME = "suppliers";
const TRANSACTIONS_COLLECTION = "supplier_transactions";

// ============================================================
// HELPER INTERNO: Recalcula savedBalance en TODO el historial
// de un proveedor usando un writeBatch.
//
// CUÁNDO SE LLAMA:
//   - Después de editar una transacción (updateTransactionWithBalanceEffect)
//   - Después de eliminar una transacción (deleteTransaction)
//
// LÓGICA:
//   1. Trae TODAS las transacciones del proveedor ordenadas por fecha ASC.
//   2. Calcula el saldo acumulado cronológicamente.
//   3. Guarda el saldo correcto en el campo `savedBalance` de cada doc.
//
// Por qué NO se usa en createTransaction:
//   runTransaction ya guarda el savedBalance correcto en el momento
//   de creación. Solo se desincroniza cuando se edita o elimina algo
//   posterior en el tiempo.
// ============================================================
async function recalcularSavedBalances(supplierId, batchRef = null) {
  const debtTypes = TRANSACTION_GROUPS.DEBTS;
  const paymentTypes = TRANSACTION_GROUPS.PAYMENTS;

  // 1. Traer TODAS las transacciones ordenadas cronológicamente (ASC)
  const q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    where("supplierId", "==", supplierId),
    orderBy("date", "asc"),
  );
  const snap = await getDocs(q);

  if (snap.empty) return;

  // 2. Calcular saldo acumulado y escribir
  const batch = batchRef || writeBatch(db);
  let runningBalance = 0;

  snap.docs.forEach((txDoc) => {
    const data = txDoc.data();
    const amount = parseFloat(data.amount || 0);
    const type = (data.type || "").toLowerCase();

    if (debtTypes.includes(type)) {
      runningBalance += amount;
    } else if (paymentTypes.includes(type)) {
      runningBalance -= amount;
    }

    runningBalance = Math.round(runningBalance * 100) / 100;

    batch.update(txDoc.ref, { savedBalance: runningBalance });
  });

  // Solo commitear si no nos pasaron un batch externo
  if (!batchRef) {
    await batch.commit();
  }
}

export const SupplierService = {
  // ============================================================
  // LECTURA DE DATOS
  // ============================================================

  async getAll() {
    const s = await getDocs(collection(db, COLLECTION_NAME));
    return s.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      balance: Number(d.data().balance) || 0,
    }));
  },

  async getById(id) {
    const d = await getDoc(doc(db, COLLECTION_NAME, id));
    return d.exists() ? { id: d.id, ...d.data() } : null;
  },

  async getTransactions(supplierId, limitCount = 100) {
    const q = query(
      collection(db, TRANSACTIONS_COLLECTION),
      where("supplierId", "==", supplierId),
      orderBy("date", "desc"),
      limit(limitCount),
    );
    const s = await getDocs(q);
    return s.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async getTransactionById(id) {
    const d = await getDoc(doc(db, TRANSACTIONS_COLLECTION, id));
    return d.exists() ? { id: d.id, ...d.data() } : null;
  },

  // ============================================================
  // ESCRITURA BÁSICA (LEDGER)
  // ============================================================

  // createTransaction: sin cambios. El savedBalance se guarda
  // correctamente en el momento de creación dentro del runTransaction.
  async createTransaction(transactionData) {
    return runTransaction(db, async (transaction) => {
      const supplierRef = doc(db, COLLECTION_NAME, transactionData.supplierId);
      const newTxRef = doc(collection(db, TRANSACTIONS_COLLECTION));

      const supplierDoc = await transaction.get(supplierRef);
      if (!supplierDoc.exists()) {
        throw new Error("El proveedor no existe.");
      }

      const currentBalance = parseFloat(supplierDoc.data().balance || 0);
      const amount = parseFloat(transactionData.amount || 0);
      const type = (transactionData.type || "").toLowerCase();

      let impact = 0;
      if (TRANSACTION_GROUPS.DEBTS.includes(type)) {
        impact = amount;
      } else if (TRANSACTION_GROUPS.PAYMENTS.includes(type)) {
        impact = -amount;
      }

      const newBalance = Math.round((currentBalance + impact) * 100) / 100;

      const newTransactionPayload = {
        ...transactionData,
        amount: amount,
        paidAmount: parseFloat(transactionData.paidAmount || 0),
        status:
          transactionData.status ||
          (impact > 0 ? TRANSACTION_STATUS.PENDING : TRANSACTION_STATUS.PAID),
        createdAt: serverTimestamp(),
        savedBalance: newBalance,
      };

      transaction.set(newTxRef, newTransactionPayload);
      transaction.update(supplierRef, {
        balance: newBalance,
        lastTransactionDate: serverTimestamp(),
      });

      return newTxRef.id;
    });
  },

  // ============================================================
  // FIX PRINCIPAL: updateTransactionWithBalanceEffect
  //
  // ANTES: Solo actualizaba el supplier.balance y el doc editado.
  //        Todos los savedBalance posteriores quedaban desincronizados.
  //
  // AHORA: Después del runTransaction atómico, dispara
  //        recalcularSavedBalances() para corregir todo el historial.
  // ============================================================
  async updateTransactionWithBalanceEffect(
    transactionId,
    updates,
    balanceDifference,
    supplierId,
  ) {
    // PASO 1: Actualización atómica del supplier.balance y el doc editado
    await runTransaction(db, async (transaction) => {
      const supplierRef = doc(db, COLLECTION_NAME, supplierId);
      const txRef = doc(db, TRANSACTIONS_COLLECTION, transactionId);

      const supplierDoc = await transaction.get(supplierRef);
      if (!supplierDoc.exists()) throw new Error("Proveedor no encontrado");

      const currentBalance = parseFloat(supplierDoc.data().balance || 0);
      const newGlobalBalance =
        Math.round((currentBalance + balanceDifference) * 100) / 100;

      transaction.update(txRef, updates);

      if (balanceDifference !== 0) {
        transaction.update(supplierRef, {
          balance: newGlobalBalance,
          lastUpdated: serverTimestamp(),
        });
      }
    });

    // PASO 2: Recalcular savedBalance en TODO el historial del proveedor
    // Esto corrige la desincronización en cascada que producía el bug.
    await recalcularSavedBalances(supplierId);
  },

  async updateTransaction(id, data) {
    await updateDoc(doc(db, TRANSACTIONS_COLLECTION, id), data);
  },

  // ============================================================
  // FIX PRINCIPAL: deleteTransaction
  //
  // ANTES: Eliminaba el doc y corregía supplier.balance,
  //        pero dejaba todos los savedBalance posteriores incorrectos.
  //
  // AHORA: Después del runTransaction atómico, dispara
  //        recalcularSavedBalances() para corregir todo el historial.
  // ============================================================
  async deleteTransaction(transactionId, supplierId, amount, type) {
    // PASO 1: Eliminar doc y corregir supplier.balance atómicamente
    await runTransaction(db, async (transaction) => {
      const supplierRef = doc(db, COLLECTION_NAME, supplierId);
      const txRef = doc(db, TRANSACTIONS_COLLECTION, transactionId);

      const supplierDoc = await transaction.get(supplierRef);
      if (!supplierDoc.exists()) throw new Error("Proveedor no encontrado");

      const currentBalance = parseFloat(supplierDoc.data().balance || 0);
      const numAmount = parseFloat(amount || 0);
      const t = (type || "").toLowerCase();

      let correction = 0;
      if (TRANSACTION_GROUPS.DEBTS.includes(t)) {
        correction = -numAmount;
      } else if (TRANSACTION_GROUPS.PAYMENTS.includes(t)) {
        correction = numAmount;
      }

      const newBalance = Math.round((currentBalance + correction) * 100) / 100;

      transaction.delete(txRef);
      transaction.update(supplierRef, { balance: newBalance });
    });

    // PASO 2: Recalcular savedBalance en TODO el historial del proveedor
    await recalcularSavedBalances(supplierId);
  },

  // ============================================================
  // ORQUESTACIÓN AVANZADA
  // ============================================================

  async settleSupplierDebt(supplierId, paymentData, targetInvoiceIds = []) {
    return runTransaction(db, async (transaction) => {
      const supplierRef = doc(db, COLLECTION_NAME, supplierId);
      const newTxRef = doc(collection(db, TRANSACTIONS_COLLECTION));

      const supplierDoc = await transaction.get(supplierRef);
      if (!supplierDoc.exists()) throw new Error("Proveedor no encontrado.");

      const currentBalance = parseFloat(supplierDoc.data().balance || 0);
      const amount = parseFloat(paymentData.amount || 0);

      const invoiceDocs = [];
      for (const invId of targetInvoiceIds) {
        const invRef = doc(db, TRANSACTIONS_COLLECTION, invId);
        const invDoc = await transaction.get(invRef);
        if (invDoc.exists()) {
          invoiceDocs.push({ ref: invRef, data: invDoc.data() });
        }
      }

      const newBalance = Math.round((currentBalance - amount) * 100) / 100;
      const newPaymentPayload = {
        ...paymentData,
        amount: amount,
        supplierId: supplierId,
        paidAmount: 0,
        status: TRANSACTION_STATUS.PAID,
        createdAt: serverTimestamp(),
        savedBalance: newBalance,
      };

      transaction.set(newTxRef, newPaymentPayload);

      let moneyToDistribute = amount;
      for (const inv of invoiceDocs) {
        if (moneyToDistribute <= 0) break;

        const invAmount = parseFloat(inv.data.amount || 0);
        const invPaid = parseFloat(inv.data.paidAmount || 0);
        const invDebt = invAmount - invPaid;

        if (invDebt <= 0) continue;

        const paymentForThis = Math.min(moneyToDistribute, invDebt);
        const newPaid = invPaid + paymentForThis;
        const newStatus =
          newPaid >= invAmount - 0.1
            ? TRANSACTION_STATUS.PAID
            : TRANSACTION_STATUS.PARTIAL;

        transaction.update(inv.ref, {
          paidAmount: newPaid,
          status: newStatus,
        });

        moneyToDistribute -= paymentForThis;
      }

      transaction.update(supplierRef, {
        balance: newBalance,
        lastTransactionDate: serverTimestamp(),
      });

      return newTxRef.id;
    });
  },

  async updateSupplierAndRenameItems(supplierId, cleanData, renames = []) {
    await this.updateSupplier(supplierId, cleanData);

    if (!renames || renames.length === 0) return;

    const transactions = await this.getTransactions(supplierId, 9999);

    let batch = writeBatch(db);
    let operationCount = 0;

    for (const tx of transactions) {
      let changed = false;
      let newItems = tx.items;
      let newItemName = tx.itemName;

      const simpleRename = renames.find((r) => r.from === tx.itemName);
      if (simpleRename) {
        newItemName = simpleRename.to;
        changed = true;
      }

      if (tx.items && Array.isArray(tx.items)) {
        newItems = tx.items.map((i) => {
          const match = renames.find((r) => r.from === i.name);
          if (match) {
            changed = true;
            return { ...i, name: match.to };
          }
          return i;
        });
      }

      if (changed) {
        const txRef = doc(db, TRANSACTIONS_COLLECTION, tx.id);
        batch.update(txRef, {
          itemName: newItemName,
          items: newItems,
        });
        operationCount++;

        if (operationCount >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          operationCount = 0;
        }
      }
    }

    if (operationCount > 0) {
      await batch.commit();
    }
  },

  // ============================================================
  // GESTIÓN DE PROVEEDORES (CRUD BÁSICO)
  // ============================================================

  async createSupplier(data) {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      balance: 0,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async updateSupplier(id, data) {
    await updateDoc(doc(db, COLLECTION_NAME, id), data);
  },

  async deleteSupplier(id) {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  },

  // ============================================================
  // UTILIDAD DE REPARACIÓN MASIVA (Consola)
  //
  // Exponer globalmente para correr una vez y sanear los datos
  // históricos corruptos que ya existen en Firebase.
  //
  // Uso: await window.repararSavedBalances()
  // ============================================================
  async repararSavedBalances() {
    console.clear();
    console.log(
      "%c🔧 REPARANDO savedBalance en todos los proveedores...",
      "color: orange; font-weight: bold;",
    );

    const suppliersSnap = await getDocs(collection(db, COLLECTION_NAME));
    let totalProveedores = 0;

    for (const supplierDoc of suppliersSnap.docs) {
      const name = supplierDoc.data().name || "Sin nombre";
      console.log(`  ⏳ ${name}...`);
      await recalcularSavedBalances(supplierDoc.id);
      totalProveedores++;
      console.log(`  ✅ ${name} reparado`);
    }

    console.log(
      `%c✅ LISTO. ${totalProveedores} proveedores reparados.`,
      "color: green; font-weight: bold;",
    );
    alert(
      `✅ Reparación completa.\n${totalProveedores} proveedores procesados.`,
    );
  },
};

// Exponer reparación masiva en consola
window.repararSavedBalances = () => SupplierService.repararSavedBalances();
console.info("🔧 Para reparar savedBalances corruptos: repararSavedBalances()");
