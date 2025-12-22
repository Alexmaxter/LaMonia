// src/modules/suppliers/services/SupplierService.js
import { db } from "../../../config/firebase.js";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  increment,
  getDocs,
  getDoc,
  writeBatch,
  runTransaction,
} from "firebase/firestore";

export class SupplierService {
  constructor() {
    this.collectionName = "suppliers";
    this.transactionCollection = "supplier_transactions";
  }

  // --- ESCUCHA EN TIEMPO REAL ---
  subscribeToSuppliers(callback) {
    const q = query(
      collection(db, this.collectionName),
      orderBy("name", "asc")
    );

    return onSnapshot(q, (snapshot) => {
      const suppliers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(suppliers);
    });
  }

  // --- CRUD PROVEEDORES ---
  async createSupplier(supplierData) {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...supplierData,
        balance: 0,
        stockDebt: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Error creating supplier:", error);
      throw error;
    }
  }

  async getSupplierById(id) {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error("Error getting supplier:", error);
      throw error;
    }
  }
  async updateSupplier(id, data) {
    const docRef = doc(db, "suppliers", id);
    return await updateDoc(docRef, data);
  }

  async updateSupplier(id, data) {
    try {
      const supplierRef = doc(db, this.collectionName, id);
      await updateDoc(supplierRef, {
        ...data,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error("Error updating supplier:", error);
      throw error;
    }
  }

  // --- GESTIÓN DE MOVIMIENTOS ---

  async registerMovement(data) {
    try {
      const finalDate = this._processDate(data.date);
      const batch = writeBatch(db);

      const transactionPayload = {
        supplierId: data.supplierId,
        type: data.type,
        transactionMode: data.transactionMode || "money",
        description: data.description || "",
        date: finalDate,
        createdAt: new Date(),
        invoiceNumber: data.invoiceNumber || null,
      };

      if (data.transactionMode === "stock") {
        transactionPayload.items = data.items || [];
        transactionPayload.amount = 0;
      } else {
        transactionPayload.amount = parseFloat(data.amount || 0);
      }

      const transactionRef = doc(collection(db, this.transactionCollection));
      batch.set(transactionRef, transactionPayload);

      const supplierRef = doc(db, this.collectionName, data.supplierId);

      let updates = { updatedAt: new Date() };

      if (data.transactionMode === "stock") {
        data.items.forEach((item) => {
          const multiplier = data.type === "invoice" ? 1 : -1;
          const qty = parseFloat(item.quantity) * multiplier;
          updates[`stockDebt.${item.name}`] = increment(qty);
        });
      } else {
        const amount = parseFloat(data.amount);
        const multiplier = data.type === "invoice" ? 1 : -1;
        const balanceChange = amount * multiplier;
        updates.balance = increment(balanceChange);
      }

      batch.update(supplierRef, updates);
      await batch.commit();

      return transactionRef.id;
    } catch (error) {
      console.error("Error registering movement:", error);
      throw error;
    }
  }

  /**
   * ACTUALIZAR TRANSACCIÓN (Complejo y Crítico)
   * Usa runTransaction para revertir el saldo antiguo y aplicar el nuevo.
   */
  async updateTransaction(transactionId, newData) {
    try {
      const finalDate = this._processDate(newData.date);

      await runTransaction(db, async (transaction) => {
        // 1. Leer transacción original y proveedor
        const txRef = doc(db, this.transactionCollection, transactionId);
        const txSnap = await transaction.get(txRef);
        if (!txSnap.exists()) throw new Error("Transacción no encontrada");

        const oldData = txSnap.data();
        const supplierRef = doc(db, this.collectionName, oldData.supplierId);
        const supplierSnap = await transaction.get(supplierRef);
        if (!supplierSnap.exists()) throw new Error("Proveedor no encontrado");

        // 2. Calcular Reversión del Saldo ANTERIOR (Deshacer lo que se hizo)
        let updates = { updatedAt: new Date() };

        if (oldData.transactionMode === "stock") {
          // Revertir items viejos
          if (oldData.items) {
            oldData.items.forEach((item) => {
              const oldMult = oldData.type === "invoice" ? 1 : -1;
              const reverseQty = parseFloat(item.quantity) * oldMult * -1;
              updates[`stockDebt.${item.name}`] = increment(reverseQty);
            });
          }
        } else {
          // Revertir dinero viejo
          const oldAmount = parseFloat(oldData.amount || 0);
          const oldMult = oldData.type === "invoice" ? 1 : -1;
          const reverseAmount = oldAmount * oldMult * -1;
          updates.balance = increment(reverseAmount);
        }

        // 3. Calcular impacto del NUEVO Saldo (Aplicar nueva data)
        // Nota: Firestore permite múltiples 'increment' en el mismo campo en una transacción?
        // No en el mismo update call. Pero sí sumando en memoria si fuera necesario.
        // Como estamos usando increment(), necesitamos asegurar que no se solapen incorrectamente.
        // Mejor estrategia: Calcular el delta neto si es el mismo modo, o separar updates.
        // Para seguridad y simplicidad: Firestore fusiona updates.

        // Haremos la lógica de "Revertir" y "Aplicar" como operaciones matemáticas separadas en el objeto updates.
        // Pero increment() sobre el mismo campo dos veces en el mismo objeto update sobrescribe.
        // SOLUCIÓN: Calcular el NETO en memoria si es Dinero.

        if (
          oldData.transactionMode === "money" &&
          newData.transactionMode === "money"
        ) {
          // Calcular Neto Dinero
          const oldEffect =
            parseFloat(oldData.amount) * (oldData.type === "invoice" ? 1 : -1);
          const newEffect =
            parseFloat(newData.amount) * (newData.type === "invoice" ? 1 : -1);
          const netChange = newEffect - oldEffect;

          updates.balance = increment(netChange);
        } else {
          // Si cambiamos de modo (Stock <-> Dinero) o es Stock, es más seguro y raro.
          // Asumiremos que NO se cambia de modo en la edición para simplificar (rara vez pasa).
          // Si es Stock:
          if (newData.transactionMode === "stock") {
            // Ya añadimos los reverseQty al objeto updates.
            // Ahora añadimos los nuevos.
            // Problema: Si el item se llama igual, `updates['stockDebt.X']` se sobrescribe.
            // Solución: Leer el stock actual, calcular en JS y setear valor final.

            const currentStock = supplierSnap.data().stockDebt || {};

            // A. Revertir Old en memoria
            if (oldData.items) {
              oldData.items.forEach((item) => {
                const mod = oldData.type === "invoice" ? -1 : 1; // Inverso
                const k = item.name;
                currentStock[k] = (currentStock[k] || 0) + item.quantity * mod;
              });
            }

            // B. Aplicar New en memoria
            if (newData.items) {
              newData.items.forEach((item) => {
                const mod = newData.type === "invoice" ? 1 : -1;
                const k = item.name;
                currentStock[k] = (currentStock[k] || 0) + item.quantity * mod;
              });
            }

            updates.stockDebt = currentStock; // Reemplazamos el mapa entero de stockDebt
          }
        }

        // 4. Update Transacción
        const txPayload = {
          ...oldData, // Mantener campos viejos por seguridad
          type: newData.type,
          description: newData.description,
          date: finalDate,
          amount:
            newData.transactionMode === "money"
              ? parseFloat(newData.amount)
              : 0,
          invoiceNumber: newData.invoiceNumber || null,
          items: newData.transactionMode === "stock" ? newData.items : [],
          updatedAt: new Date(),
        };

        transaction.update(txRef, txPayload);
        transaction.update(supplierRef, updates);
      });
    } catch (error) {
      console.error("Error updating transaction:", error);
      throw error;
    }
  }

  async deleteTransaction(transactionId) {
    try {
      await runTransaction(db, async (transaction) => {
        const txRef = doc(db, this.transactionCollection, transactionId);
        const txSnap = await transaction.get(txRef);
        if (!txSnap.exists()) throw new Error("Transaction not found");

        const txData = txSnap.data();
        const supplierRef = doc(db, this.collectionName, txData.supplierId);

        let updates = {};

        if (txData.transactionMode === "stock") {
          if (txData.items) {
            txData.items.forEach((item) => {
              const originalMultiplier = txData.type === "invoice" ? 1 : -1;
              const reverseMultiplier = originalMultiplier * -1;
              const qty = parseFloat(item.quantity) * reverseMultiplier;
              updates[`stockDebt.${item.name}`] = increment(qty);
            });
          }
        } else {
          const amount = parseFloat(txData.amount);
          const originalMultiplier = txData.type === "invoice" ? 1 : -1;
          const reverseChange = amount * originalMultiplier * -1;
          updates.balance = increment(reverseChange);
        }

        updates.updatedAt = new Date();

        transaction.update(supplierRef, updates);
        transaction.delete(txRef);
      });
    } catch (error) {
      console.error("Error deleting transaction:", error);
      throw error;
    }
  }

  async getTransactions(supplierId) {
    const q = query(
      collection(db, this.transactionCollection),
      where("supplierId", "==", supplierId),
      orderBy("date", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate
        ? doc.data().date.toDate()
        : new Date(doc.data().date),
    }));
  }

  // --- UTILS ---
  _processDate(dateInput) {
    if (!dateInput) return new Date();
    if (dateInput instanceof Date) return dateInput;
    if (typeof dateInput === "string" && dateInput.includes("-")) {
      const [year, month, day] = dateInput.split("-").map(Number);
      return new Date(year, month - 1, day, 12, 0, 0);
    }
    return new Date(dateInput);
  }
}

export const supplierService = new SupplierService();
