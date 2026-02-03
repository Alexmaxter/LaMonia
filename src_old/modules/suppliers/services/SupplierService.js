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
      orderBy("name", "asc")
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
  async deleteTransaction(txId) {
    await runTransaction(db, async (t) => {
      const ref = doc(db, TRANSACTION_COLLECTION, txId);
      const snap = await t.get(ref);
      if (!snap.exists()) throw "No existe";
      const tx = snap.data();
      const supRef = doc(db, this.collectionName, tx.supplierId);

      const revMult = tx.type === "invoice" ? -1 : 1;

      // Revertir dinero
      if (tx.amount) {
        t.update(supRef, { balance: increment(tx.amount * revMult) });
      }
      // Revertir items
      if (tx.items) {
        tx.items.forEach((i) => {
          const q = parseFloat(i.quantity) * revMult;
          t.update(supRef, { [`stockDebt.${i.name}`]: increment(q) });
        });
      }
      t.delete(ref);
    });
  }

  async getTransactions(supplierId) {
    const q = query(
      collection(db, TRANSACTION_COLLECTION),
      where("supplierId", "==", supplierId),
      orderBy("date", "desc")
    );
    const s = await getDocs(q);
    return s.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}

// Exportamos la instancia como siempre debió ser
export const supplierService = new SupplierService();
