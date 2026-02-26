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
// FIX #4: MUTEX DE RECÁLCULO POR PROVEEDOR
//
// PROBLEMA ORIGINAL:
//   updateTransactionWithBalanceEffect y deleteTransaction ambos
//   llaman recalcularSavedBalances(supplierId). Si el usuario hace
//   doble click en "Guardar" o "Eliminar", dos Promises corren en
//   paralelo sobre el mismo proveedor:
//     - Ambas traen el historial completo de Firebase
//     - Ambas calculan saldos sobre el mismo snapshot
//     - Ambas commitean un batch → el resultado final depende de
//       cuál llega último, y puede ser incorrecto.
//
// SOLUCIÓN — recalcQueue (Map de supplierId → estado):
//   Cada entrada tiene:
//     - running: Promise del recálculo actualmente en ejecución
//     - pending: boolean que indica si hay UNA solicitud esperando
//
//   Comportamiento:
//     1. Si no hay nada corriendo → ejecutar inmediatamente.
//     2. Si ya hay algo corriendo → marcar pending = true y esperar.
//     3. Cuando el recálculo activo termina, si pending es true,
//        lanzar exactamente UN recálculo más (con el estado fresco
//        de Firebase) y limpiar el flag.
//     4. Si pending es false al terminar → limpiar la entrada del Map.
//
//   Esto garantiza:
//     - Nunca corren dos recálculos simultáneos para el mismo proveedor.
//     - Nunca se pierde una solicitud: siempre se corre al menos
//       una vez más después del último cambio.
//     - No se acumulan N ejecuciones por N clicks: sólo 1 "pendiente"
//       a la vez, sin importar cuántas operaciones lleguen en paralelo.
// ============================================================
const recalcQueue = new Map();
// Estructura de cada entrada:
// recalcQueue.get(supplierId) = { running: Promise | null, pending: boolean }

async function recalcularSavedBalancesCore(supplierId) {
  const debtTypes = TRANSACTION_GROUPS.DEBTS;
  const paymentTypes = TRANSACTION_GROUPS.PAYMENTS;

  const q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    where("supplierId", "==", supplierId),
    orderBy("date", "asc"),
  );
  const snap = await getDocs(q);

  if (snap.empty) return;

  const batch = writeBatch(db);
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

  await batch.commit();
}

async function recalcularSavedBalances(supplierId) {
  const existing = recalcQueue.get(supplierId);

  if (existing && existing.running) {
    // Ya hay un recálculo en curso: marcar pending y esperar
    existing.pending = true;
    await existing.running;
    // Cuando termine el que estaba corriendo, el loop interno
    // se encargó de lanzar el siguiente. Solo retornar.
    return;
  }

  // No hay nada corriendo: iniciar el ciclo
  const entry = { running: null, pending: false };
  recalcQueue.set(supplierId, entry);

  while (true) {
    // Lanzar el recálculo y guardar la Promise en el Map
    // para que los llamadores concurrentes puedan "adjuntarse"
    entry.running = recalcularSavedBalancesCore(supplierId);

    try {
      await entry.running;
    } finally {
      entry.running = null;
    }

    if (entry.pending) {
      // Hubo al menos una solicitud mientras corríamos.
      // Lanzar exactamente UN recálculo más con datos frescos.
      entry.pending = false;
      // Continuar el while (siguiente iteración = nuevo recálculo)
    } else {
      // No hay nada pendiente → limpiar y salir
      recalcQueue.delete(supplierId);
      break;
    }
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

    // PASO 2: Recalcular savedBalance con protección de concurrencia
    await recalcularSavedBalances(supplierId);
  },

  async updateTransaction(id, data) {
    await updateDoc(doc(db, TRANSACTIONS_COLLECTION, id), data);
  },

  async deleteTransaction(transactionId, supplierId, amount, type) {
    await runTransaction(db, async (transaction) => {
      // ==========================================
      // FASE 1: TODAS LAS LECTURAS (READS)
      // ==========================================
      const supplierRef = doc(db, COLLECTION_NAME, supplierId);
      const txRef = doc(db, TRANSACTIONS_COLLECTION, transactionId);

      const supplierDoc = await transaction.get(supplierRef);
      if (!supplierDoc.exists()) throw new Error("Proveedor no encontrado");

      const txDoc = await transaction.get(txRef);
      if (!txDoc.exists()) throw new Error("Transacción no encontrada");

      const txData = txDoc.data();

      // Recolectamos la información de las boletas sin modificar nada aún
      const invoicesToUpdate = [];
      if (txData.settledInvoices && Array.isArray(txData.settledInvoices)) {
        for (const settled of txData.settledInvoices) {
          const invRef = doc(db, TRANSACTIONS_COLLECTION, settled.id);
          const invDoc = await transaction.get(invRef);

          if (invDoc.exists()) {
            invoicesToUpdate.push({
              ref: invRef,
              data: invDoc.data(),
              appliedAmount: parseFloat(settled.amountApplied || 0),
            });
          }
        }
      }

      // ==========================================
      // FASE 2: TODAS LAS ESCRITURAS (WRITES)
      // ==========================================

      // 1. Actualizamos los estados de las boletas que leímos
      for (const inv of invoicesToUpdate) {
        const currentPaid = parseFloat(inv.data.paidAmount || 0);
        const invAmount = parseFloat(inv.data.amount || 0);

        const newPaid = Math.max(0, currentPaid - inv.appliedAmount);
        let newStatus = TRANSACTION_STATUS.PENDING;

        if (newPaid >= invAmount - 0.1) {
          newStatus = TRANSACTION_STATUS.PAID;
        } else if (newPaid > 0) {
          newStatus = TRANSACTION_STATUS.PARTIAL;
        }

        transaction.update(inv.ref, { paidAmount: newPaid, status: newStatus });
      }

      // 2. Calculamos el nuevo balance del proveedor
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

      // 3. Borramos el pago y actualizamos el proveedor
      transaction.delete(txRef);
      transaction.update(supplierRef, { balance: newBalance });
    });

    // Recalcular los saldos históricos con protección de concurrencia
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
      let moneyToDistribute = amount;
      const settledInvoicesList = [];

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

        settledInvoicesList.push({
          id: inv.ref.id,
          amountApplied: paymentForThis,
        });

        moneyToDistribute -= paymentForThis;
      }

      const newPaymentPayload = {
        ...paymentData,
        amount: amount,
        supplierId: supplierId,
        paidAmount: 0,
        status: TRANSACTION_STATUS.PAID,
        createdAt: serverTimestamp(),
        savedBalance: newBalance,
        settledInvoices: settledInvoicesList,
      };

      transaction.set(newTxRef, newPaymentPayload);
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
