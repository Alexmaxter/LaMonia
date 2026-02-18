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
  increment,
  serverTimestamp,
  runTransaction, // <--- IMPORTANTE: Necesario para el Ledger
} from "firebase/firestore";

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
      orderBy("date", "desc"), // Ordenamos por fecha (lo más nuevo primero)
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
  // ESCRITURA (LEDGER - LIBRO MAYOR)
  // ============================================================

  /**
   * Crea una transacción y calcula el 'savedBalance' (Saldo Histórico)
   * Esta es la función CLAVE para que tu historial no falle.
   */
  async createTransaction(transactionData) {
    return runTransaction(db, async (transaction) => {
      // 1. Referencias
      const supplierRef = doc(db, COLLECTION_NAME, transactionData.supplierId);
      const newTxRef = doc(collection(db, TRANSACTIONS_COLLECTION));

      // 2. Leer Proveedor para obtener saldo ACTUAL
      const supplierDoc = await transaction.get(supplierRef);
      if (!supplierDoc.exists()) {
        throw new Error("El proveedor no existe.");
      }

      const currentBalance = parseFloat(supplierDoc.data().balance || 0);
      const amount = parseFloat(transactionData.amount || 0);
      const type = (transactionData.type || "").toLowerCase();

      // 3. Calcular impacto en el saldo
      let impact = 0;
      // Tipos que AUMENTAN la deuda
      if (["invoice", "boleta", "purchase", "compra", "debit"].includes(type)) {
        impact = amount;
      }
      // Tipos que DISMINUYEN la deuda
      else if (["payment", "pago", "credit"].includes(type)) {
        impact = -amount;
      }

      // Nuevo saldo calculado
      // Redondeo a 2 decimales para evitar 0.000000004
      const newBalance = Math.round((currentBalance + impact) * 100) / 100;

      // 4. Preparar datos del movimiento con el campo 'savedBalance'
      const newTransactionPayload = {
        ...transactionData,
        amount: amount,
        paidAmount: parseFloat(transactionData.paidAmount || 0),
        status: transactionData.status || (impact > 0 ? "pending" : "paid"), // Auto-status si no viene
        createdAt: serverTimestamp(),

        // --- LA JOYA DE LA CORONA ---
        savedBalance: newBalance,
      };

      // 5. Escritura Atómica (Todo o nada)
      transaction.set(newTxRef, newTransactionPayload);
      transaction.update(supplierRef, {
        balance: newBalance,
        lastTransactionDate: serverTimestamp(),
      });

      return newTxRef.id;
    });
  },

  // ============================================================
  // EDICIÓN Y BORRADO ATÓMICO
  // ============================================================

  /**
   * Actualiza una transacción y corrige el saldo global del proveedor.
   * Usado cuando editas el monto o el tipo de una boleta vieja.
   */
  async updateTransactionWithBalanceEffect(
    transactionId,
    updates,
    balanceDifference,
    supplierId,
  ) {
    return runTransaction(db, async (transaction) => {
      const supplierRef = doc(db, COLLECTION_NAME, supplierId);
      const txRef = doc(db, TRANSACTIONS_COLLECTION, transactionId);

      // Leer proveedor para asegurar consistencia
      const supplierDoc = await transaction.get(supplierRef);
      if (!supplierDoc.exists()) throw new Error("Proveedor no encontrado");

      const currentBalance = parseFloat(supplierDoc.data().balance || 0);
      const newGlobalBalance =
        Math.round((currentBalance + balanceDifference) * 100) / 100;

      // Actualizar Transacción
      transaction.update(txRef, updates);

      // Actualizar Saldo Global del Proveedor
      if (balanceDifference !== 0) {
        transaction.update(supplierRef, {
          balance: newGlobalBalance,
          lastUpdated: serverTimestamp(),
        });
      }
    });
  },

  /**
   * Actualización simple (sin tocar saldos)
   * Usado para cambiar estados (pending -> paid) o editar notas.
   */
  async updateTransaction(id, data) {
    await updateDoc(doc(db, TRANSACTIONS_COLLECTION, id), data);
  },

  /**
   * Borra una transacción y devuelve el dinero al saldo del proveedor.
   */
  async deleteTransaction(transactionId, supplierId, amount, type) {
    return runTransaction(db, async (transaction) => {
      const supplierRef = doc(db, COLLECTION_NAME, supplierId);
      const txRef = doc(db, TRANSACTIONS_COLLECTION, transactionId);

      const supplierDoc = await transaction.get(supplierRef);
      if (!supplierDoc.exists()) throw new Error("Proveedor no encontrado");

      const currentBalance = parseFloat(supplierDoc.data().balance || 0);
      const numAmount = parseFloat(amount || 0);
      const t = (type || "").toLowerCase();

      // Calcular corrección (Inversa a la creación)
      let correction = 0;
      if (["invoice", "boleta", "purchase", "compra"].includes(t)) {
        correction = -numAmount; // Si borro deuda, el saldo BAJA
      } else if (["payment", "pago"].includes(t)) {
        correction = numAmount; // Si borro pago, la deuda SUBE
      }

      const newBalance = Math.round((currentBalance + correction) * 100) / 100;

      // Ejecutar borrado y actualización
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
