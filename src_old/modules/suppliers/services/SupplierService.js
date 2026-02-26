import { db } from "../../../config/firebase.js";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  query,
  orderBy,
  increment,
  getDocs,
  getDoc,
  writeBatch,
  runTransaction,
  where,
} from "firebase/firestore";

const COLLECTION_NAME = "suppliers";
const TRANSACTION_COLLECTION = "supplier_transactions";

class SupplierService {
  constructor() {
    this.collectionName = COLLECTION_NAME;
  }

  // --- LECTURA ---
  async getSuppliers() {
    const q = query(
      collection(db, this.collectionName),
      orderBy("name", "asc"),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async getSupplierById(id) {
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  }

  // --- ESCRITURA ---
  async createSupplier(data) {
    const docRef = await addDoc(collection(db, this.collectionName), {
      ...data,
      balance: 0,
      stockDebt: {},
      createdAt: new Date(),
    });
    return docRef.id;
  }

  async updateSupplier(id, data) {
    await updateDoc(doc(db, this.collectionName, id), {
      ...data,
      updatedAt: new Date(),
    });
  }

  async deleteSupplier(id) {
    await deleteDoc(doc(db, this.collectionName, id));
  }

  // --- MOVIMIENTOS (Aquí está la corrección del BUG) ---
  async addTransaction(data) {
    const batch = writeBatch(db);

    // 1. Crear documento de transacción
    const txRef = doc(collection(db, TRANSACTION_COLLECTION));

    // Convertir fecha string a objeto Date si hace falta
    let dateObj = new Date();
    if (typeof data.date === "string")
      dateObj = new Date(data.date + "T12:00:00");

    const txPayload = {
      supplierId: data.supplierId,
      type: data.type, // invoice, payment
      transactionMode: data.transactionMode, // stock, money
      description: data.description || "",
      amount: parseFloat(data.amount || 0), // SIEMPRE guardamos el monto
      items: data.items || [], // SIEMPRE guardamos items si existen
      date: dateObj,
      createdAt: new Date(),
    };

    batch.set(txRef, txPayload);

    // 2. Actualizar Proveedor
    const supplierRef = doc(db, this.collectionName, data.supplierId);
    let updates = { updatedAt: new Date() };
    const multiplier = data.type === "invoice" ? 1 : -1;

    // Actualizar Saldo (Balance) - ESTO FALTABA PARA STOCK
    if (txPayload.amount !== 0) {
      updates.balance = increment(txPayload.amount * multiplier);
    }

    // Actualizar Stock deuda
    if (txPayload.items.length > 0) {
      txPayload.items.forEach((item) => {
        const qty = parseFloat(item.quantity) * multiplier;
        if (qty !== 0) updates[`stockDebt.${item.name}`] = increment(qty);
      });
    }

    batch.update(supplierRef, updates);
    await batch.commit();
    return txRef.id;
  }

  // Borrar (Revertir saldo)
  async deleteTransaction(transactionId, supplierId, amount, type) {
    // PASO 1: Eliminar documento del pago, revertir boletas y corregir supplier.balance de forma atómica
    await runTransaction(db, async (transaction) => {
      const supplierRef = doc(db, COLLECTION_NAME, supplierId);
      const txRef = doc(db, TRANSACTIONS_COLLECTION, transactionId);

      const supplierDoc = await transaction.get(supplierRef);
      if (!supplierDoc.exists()) throw new Error("Proveedor no encontrado");

      const txDoc = await transaction.get(txRef);
      if (!txDoc.exists()) throw new Error("Transacción no encontrada");

      const txData = txDoc.data();

      // --- CORRECCIÓN: Revertir las boletas si este pago saldó alguna ---
      if (txData.settledInvoices && Array.isArray(txData.settledInvoices)) {
        for (const settled of txData.settledInvoices) {
          const invRef = doc(db, TRANSACTIONS_COLLECTION, settled.id);
          const invDoc = await transaction.get(invRef);

          if (invDoc.exists()) {
            const invData = invDoc.data();
            const currentPaid = parseFloat(invData.paidAmount || 0);
            const invAmount = parseFloat(invData.amount || 0);
            const appliedAmount = parseFloat(settled.amountApplied || 0);

            // Restamos exactamente lo que este pago le había sumado a esta boleta
            const newPaid = Math.max(0, currentPaid - appliedAmount);

            // Recalculamos el estado en base al nuevo monto pagado
            let newStatus = TRANSACTION_STATUS.PENDING;
            if (newPaid >= invAmount - 0.1) {
              newStatus = TRANSACTION_STATUS.PAID;
            } else if (newPaid > 0) {
              newStatus = TRANSACTION_STATUS.PARTIAL;
            }

            // Actualizamos la boleta para que vuelva a figurar como adeudada
            transaction.update(invRef, {
              paidAmount: newPaid,
              status: newStatus,
            });
          }
        }
      }
      // -------------------------------------------------------------------

      // Corregir el balance global del proveedor
      const currentBalance = parseFloat(supplierDoc.data().balance || 0);
      const numAmount = parseFloat(amount || 0);
      const t = (type || "").toLowerCase();

      let correction = 0;
      if (TRANSACTION_GROUPS.DEBTS.includes(t)) {
        // Si borramos una deuda (ej. una factura), el balance global baja
        correction = -numAmount;
      } else if (TRANSACTION_GROUPS.PAYMENTS.includes(t)) {
        // Si borramos un pago, el balance global (la deuda) vuelve a subir
        correction = numAmount;
      }

      const newBalance = Math.round((currentBalance + correction) * 100) / 100;

      // Eliminamos el registro del pago y actualizamos el balance del proveedor
      transaction.delete(txRef);
      transaction.update(supplierRef, { balance: newBalance });
    });

    // PASO 2: Recalcular los saldos históricos (savedBalance)
    // Nota: Asegúrate de que el nombre de esta función coincida con la que importas
    // en tu archivo (probablemente desde utils/recalcBalance.js)
    if (typeof recalculateSupplierBalances === "function") {
      await recalculateSupplierBalances(supplierId);
    }
  }

  async getTransactions(supplierId) {
    const q = query(
      collection(db, TRANSACTION_COLLECTION),
      where("supplierId", "==", supplierId),
      orderBy("date", "desc"),
    );
    const s = await getDocs(q);
    return s.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}

// Exportamos la instancia como siempre debió ser
export const supplierService = new SupplierService();
