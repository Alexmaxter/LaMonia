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

  // ============================================================
  // ORQUESTACIÓN AVANZADA (NUEVAS FUNCIONES MIGRadas DEL CONTROLADOR)
  // ============================================================

  /**
   * PAGO EN CASCADA: Registra un pago y lo distribuye entre varias facturas atómicamente.
   * Si falla el internet a la mitad, no se guarda nada (Cero corrupción de datos).
   */
  async settleSupplierDebt(supplierId, paymentData, targetInvoiceIds = []) {
    return runTransaction(db, async (transaction) => {
      const supplierRef = doc(db, COLLECTION_NAME, supplierId);
      const newTxRef = doc(collection(db, TRANSACTIONS_COLLECTION));

      // 1. Leer Proveedor
      const supplierDoc = await transaction.get(supplierRef);
      if (!supplierDoc.exists()) throw new Error("Proveedor no encontrado.");

      const currentBalance = parseFloat(supplierDoc.data().balance || 0);
      const amount = parseFloat(paymentData.amount || 0);

      // 2. Leer las facturas objetivo ANTES de escribir (Regla estricta de Firestore)
      const invoiceDocs = [];
      for (const invId of targetInvoiceIds) {
        const invRef = doc(db, TRANSACTIONS_COLLECTION, invId);
        const invDoc = await transaction.get(invRef);
        if (invDoc.exists()) {
          invoiceDocs.push({ ref: invRef, data: invDoc.data() });
        }
      }

      // 3. Preparar el nuevo comprobante de pago
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

      // 4. Escribir el nuevo pago
      transaction.set(newTxRef, newPaymentPayload);

      // 5. Distribuir el dinero en cascada
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

        // Actualizamos la factura vieja
        transaction.update(inv.ref, {
          paidAmount: newPaid,
          status: newStatus,
        });

        moneyToDistribute -= paymentForThis;
      }

      // 6. Actualizar el proveedor
      transaction.update(supplierRef, {
        balance: newBalance,
        lastTransactionDate: serverTimestamp(),
      });

      return newTxRef.id;
    });
  },

  /**
   * ACTUALIZACIÓN MASIVA: Edita al proveedor y renombra el historial usando Batches.
   */
  async updateSupplierAndRenameItems(supplierId, cleanData, renames = []) {
    // 1. Actualizamos los datos básicos del proveedor
    await this.updateSupplier(supplierId, cleanData);

    // 2. Si no hay renombramientos solicitados, terminamos aquí
    if (!renames || renames.length === 0) return;

    // 3. Buscar todas las transacciones (Hasta 9999)
    const transactions = await this.getTransactions(supplierId, 9999);

    // 4. Usar Firestore writeBatch para empaquetar múltiples escrituras a la vez
    let batch = writeBatch(db);
    let operationCount = 0;

    for (const tx of transactions) {
      let changed = false;
      let newItems = tx.items;
      let newItemName = tx.itemName;

      // Evaluar cambio de nombre principal
      const simpleRename = renames.find((r) => r.from === tx.itemName);
      if (simpleRename) {
        newItemName = simpleRename.to;
        changed = true;
      }

      // Evaluar cambios en array de items
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

        // Firestore tiene un límite de 500 operaciones por lote.
        // Si llegamos a 400, commiteamos y abrimos un lote nuevo.
        if (operationCount >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          operationCount = 0;
        }
      }
    }

    // Commitear el resto de operaciones pendientes
    if (operationCount > 0) {
      await batch.commit();
    }
  },

  // ============================================================
  // EDICIÓN Y BORRADO ATÓMICO (MANTENIMIENTO DEL LEDGER)
  // ============================================================

  async updateTransactionWithBalanceEffect(
    transactionId,
    updates,
    balanceDifference,
    supplierId,
  ) {
    return runTransaction(db, async (transaction) => {
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
  },

  async updateTransaction(id, data) {
    await updateDoc(doc(db, TRANSACTIONS_COLLECTION, id), data);
  },

  async deleteTransaction(transactionId, supplierId, amount, type) {
    return runTransaction(db, async (transaction) => {
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
};
